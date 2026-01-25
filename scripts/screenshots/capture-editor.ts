import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer, { Page } from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');

// Constants
const OUTPUT_DIR = path.resolve(projectRoot, 'media/images');
const VIEWPORT_WIDTH = 1920;
const VIEWPORT_HEIGHT = 1080;
const DEVICE_SCALE_FACTOR = 2;
const ELEMENT_SELECTOR = 'calendar-week-grid-card-editor';
const POLL_INTERVAL = 1000; // Check every second
const MAX_WAIT_TIME = 300000; // 5 minutes max wait

/**
 * Ensure output directory exists
 */
function ensureOutputDir(): void {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

/**
 * Check if element exists and parent dialog has large attribute
 */
async function checkElementAndParentReady(page: Page): Promise<{
  editorFound: boolean;
  parentHasLarge: boolean;
  stages: {
    body: boolean;
    homeAssistant: boolean;
    dialogEditCard: boolean;
    haDialog: boolean;
    cardElementEditor: boolean;
  };
  error?: string;
}> {
  try {
    // First, test if page evaluation works at all
    const testResult = await page
      .evaluate(() => {
        return {
          hasDocument: typeof document !== 'undefined',
          hasBody: document.body !== null,
          bodyTagName: document.body ? document.body.tagName : 'none',
          url: window.location.href,
        };
      })
      .catch(() => null);

    if (!testResult) {
      return {
        editorFound: false,
        parentHasLarge: false,
        stages: {
          body: false,
          homeAssistant: false,
          dialogEditCard: false,
          haDialog: false,
          cardElementEditor: false,
        },
        error: 'Page evaluation failed - could not evaluate page',
      };
    }

    if (!testResult.hasDocument) {
      return {
        editorFound: false,
        parentHasLarge: false,
        stages: {
          body: false,
          homeAssistant: false,
          dialogEditCard: false,
          haDialog: false,
          cardElementEditor: false,
        },
        error: 'Page evaluation failed - document not accessible',
      };
    }

    // Direct evaluation without script injection - using flattened approach
    const result = await page.evaluate((selector) => {
      try {
        const normalizedSelector = selector.toLowerCase();
        const dialogSelector = 'hui-dialog-edit-card';
        const cardEditorSelector = 'hui-card-element-editor';
        const haDialogSelector = 'ha-dialog';
        const homeAssistantSelector = 'home-assistant';

        let editorFound = false;
        let dialogHasLarge = false;
        const stages = {
          body: false,
          homeAssistant: false,
          dialogEditCard: false,
          haDialog: false,
          cardElementEditor: false,
        };

        if (document && document.body) {
          stages.body = true;
        }

        // Flattened recursive search without nested functions
        const rootsToCheck = [{ root: document, depth: 0 }];
        const checkedRoots = new WeakSet();

        while (rootsToCheck.length > 0) {
          const current = rootsToCheck.shift();
          if (!current || current.depth > 20) continue;

          let elements;
          try {
            elements = current.root.querySelectorAll('*');
          } catch {
            continue;
          }

          for (let i = 0; i < elements.length; i++) {
            const el = elements[i];
            if (!el) continue;

            const tagName = el.tagName ? el.tagName.toLowerCase() : '';

            if (tagName === 'body') stages.body = true;
            if (tagName === homeAssistantSelector) stages.homeAssistant = true;
            if (tagName === dialogSelector) {
              stages.dialogEditCard = true;
              if (el.hasAttribute('large')) dialogHasLarge = true;
            }
            if (tagName === haDialogSelector) stages.haDialog = true;
            if (tagName === cardEditorSelector) stages.cardElementEditor = true;
            if (tagName === normalizedSelector) editorFound = true;

            if (el.shadowRoot && !checkedRoots.has(el.shadowRoot)) {
              checkedRoots.add(el.shadowRoot);
              rootsToCheck.push({
                root: el.shadowRoot,
                depth: current.depth + 1,
              });
            }
          }
        }

        return {
          editorFound: editorFound,
          parentHasLarge: dialogHasLarge,
          stages: stages,
        };
      } catch (e) {
        return {
          editorFound: false,
          parentHasLarge: false,
          stages: {
            body: false,
            homeAssistant: false,
            dialogEditCard: false,
            haDialog: false,
            cardElementEditor: false,
          },
          error: e.message || String(e),
        };
      }
    }, ELEMENT_SELECTOR);

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in checkElementAndParentReady:', errorMessage);
    return {
      editorFound: false,
      parentHasLarge: false,
      stages: {
        body: false,
        homeAssistant: false,
        dialogEditCard: false,
        haDialog: false,
        cardElementEditor: false,
      },
      error: errorMessage,
    };
  }
}

/**
 * Wait for the editor element to appear and parent dialog to have large attribute
 */
async function waitForEditorElement(
  page: Page,
  timeout: number = MAX_WAIT_TIME,
): Promise<void> {
  const startTime = Date.now();
  const loggedStages = {
    body: false,
    homeAssistant: false,
    dialogEditCard: false,
    haDialog: false,
    cardElementEditor: false,
    editorFound: false,
  };

  while (Date.now() - startTime < timeout) {
    try {
      const { editorFound, parentHasLarge, stages } =
        await checkElementAndParentReady(page);

      // Log parent elements when first detected
      if (stages.body && !loggedStages.body) {
        console.log('✓ body - detected');
        loggedStages.body = true;
      }
      if (stages.homeAssistant && !loggedStages.homeAssistant) {
        console.log(
          '✓ home-assistant - detected, navigate to the card edit page',
        );
        loggedStages.homeAssistant = true;
      }
      if (stages.dialogEditCard && !loggedStages.dialogEditCard) {
        console.log('✓ hui-dialog-edit-card - detected');
        loggedStages.dialogEditCard = true;
      }
      if (stages.haDialog && !loggedStages.haDialog) {
        console.log('✓ ha-dialog - detected');
        loggedStages.haDialog = true;
      }
      if (stages.cardElementEditor && !loggedStages.cardElementEditor) {
        console.log('✓ hui-card-element-editor - detected');
        loggedStages.cardElementEditor = true;
      }
      if (editorFound && !loggedStages.editorFound) {
        console.log(
          `✓ ${ELEMENT_SELECTOR} - detected, make editor large by clicking on the title`,
        );
        loggedStages.editorFound = true;
      }

      if (editorFound && parentHasLarge) {
        return;
      }
    } catch {
      // Element not found yet, continue polling
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
  }

  throw new Error(
    `Timeout: ${ELEMENT_SELECTOR} element or parent hui-dialog-edit-card with 'large' attribute not found within ${timeout}ms`,
  );
}

/**
 * Capture screenshot of calendar-week-grid-card-editor element
 */
async function captureEditorScreenshot(
  page: Page,
  outputPath: string,
): Promise<void> {
  // Find calendar-week-grid-card-editor
  const screenshotData = await page.evaluate((selector) => {
    try {
      // First find calendar-week-grid-card-editor
      let targetElement = null;
      const rootsToCheck = [{ root: document, depth: 0 }];
      const checkedRoots = new WeakSet();

      while (rootsToCheck.length > 0 && !targetElement) {
        const current = rootsToCheck.shift();
        if (!current || current.depth > 20) continue;

        let direct;
        try {
          direct = current.root.querySelector(selector);
        } catch {
          // Continue to next root
        }

        if (direct) {
          targetElement = direct;
          break;
        }

        let elements;
        try {
          elements = current.root.querySelectorAll('*');
        } catch {
          continue;
        }

        for (let i = 0; i < elements.length; i++) {
          const el = elements[i];
          if (!el) continue;

          const tagName = el.tagName ? el.tagName.toLowerCase() : '';
          if (tagName === selector.toLowerCase()) {
            targetElement = el;
            break;
          }

          if (el.shadowRoot && !checkedRoots.has(el.shadowRoot)) {
            checkedRoots.add(el.shadowRoot);
            rootsToCheck.push({
              root: el.shadowRoot,
              depth: current.depth + 1,
            });
          }
        }
      }

      if (
        !targetElement ||
        typeof (targetElement as any).getBoundingClientRect !== 'function'
      ) {
        // eslint-disable-line @typescript-eslint/no-explicit-any
        return { found: false };
      }

      // Get bounding box of calendar-week-grid-card-editor
      const rect = (targetElement as any).getBoundingClientRect(); // eslint-disable-line @typescript-eslint/no-explicit-any
      return {
        found: true,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      };

      return { found: false };
    } catch {
      return { found: false };
    }
  }, ELEMENT_SELECTOR);

  if (
    screenshotData.found &&
    typeof screenshotData.x === 'number' &&
    typeof screenshotData.y === 'number' &&
    typeof screenshotData.width === 'number' &&
    typeof screenshotData.height === 'number' &&
    screenshotData.width > 0 &&
    screenshotData.height > 0
  ) {
    // Capture using coordinates
    await page.screenshot({
      path: outputPath,
      clip: {
        x: screenshotData.x,
        y: screenshotData.y,
        width: screenshotData.width,
        height: screenshotData.height,
      },
    });
    return;
  }

  throw new Error(`Element ${ELEMENT_SELECTOR} not found`);
}

/**
 * Setup page with initial viewport
 */
async function setupPage(page: Page): Promise<void> {
  await page.setViewport({
    width: VIEWPORT_WIDTH,
    height: VIEWPORT_HEIGHT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
  });
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  console.log('Starting editor screenshot capture...');
  console.log(`Waiting for ${ELEMENT_SELECTOR} element to appear...`);
  console.log('Please navigate to your Home Assistant card edit page.');

  ensureOutputDir();

  const browserArgs = [
    '--no-sandbox',
    '--disable-gpu',
    '--font-render-hinting=none',
    '--disable-font-subpixel-positioning',
    '--disable-lcd-text',
    '--force-color-profile=srgb',
    '--disable-web-security',
    '--disable-features=FontSourceCodeProForPowerline,IsolateOrigins,site-per-process',
    '--disable-software-rasterizer',
  ];

  // Launch browser in non-headless mode so user can interact
  const browser = await puppeteer.launch({
    headless: false, // Show browser window
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: browserArgs,
    defaultViewport: null, // Use full window size
  });

  try {
    const page = await browser.newPage();
    await setupPage(page);

    // Open a blank page or you can navigate to a specific URL
    // For Home Assistant, you might want to start at the login page
    await page.goto('about:blank');

    console.log('\nBrowser window opened.');
    console.log('Please:');
    console.log('1. Navigate to your Home Assistant instance');
    console.log('2. Log in if needed');
    console.log('3. Go to the card edit page');
    console.log('4. Make editor large by clicking on the title\n');

    // Wait for the editor element to appear
    await waitForEditorElement(page);

    // Generate output filename with timestamp
    const outputFilename = `editor.png`;
    const outputPath = path.join(OUTPUT_DIR, outputFilename);

    // Capture screenshot
    await captureEditorScreenshot(page, outputPath);

    // Keep browser open briefly so user can see the result
    await new Promise((resolve) => setTimeout(resolve, 5000));
  } catch (error) {
    console.error('Error capturing screenshot:', error);
    process.exit(1);
  } finally {
    await browser.close();
    console.log('Done.');
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  process.exit(0);
});

// Run main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
