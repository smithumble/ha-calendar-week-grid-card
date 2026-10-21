import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import puppeteer, { Browser, ElementHandle, Page } from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');

// Constants
const OUTPUT_DIR = path.resolve(projectRoot, 'media/images');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'editor.png');
const SCREENSHOT_VIEWPORT_WIDTH = 2560;
const SCREENSHOT_VIEWPORT_HEIGHT = 1440;
const DEVICE_SCALE_FACTOR = 2;
const ELEMENT_SELECTOR = 'calendar-week-grid-card-editor';
const POLL_INTERVAL = 1000; // Check every second
const MAX_WAIT_TIME = 300000; // 5 minutes max wait

type Stage =
  | 'homeAssistant'
  | 'dialogEditCard'
  | 'cardElementEditor'
  | 'editor'
  | 'large';

interface PageState {
  stages: Record<Stage, boolean>;
  error?: string;
}

/**
 * Browser-side code is passed as a string on purpose: tsx/esbuild rewrites
 * functions handed to page.evaluate (adds `__name` helpers that don't exist
 * in the page), which silently broke the search inside HA's shadow DOM.
 *
 * `findAll(tag)` walks the document and every open shadow root.
 */
const FIND_ALL_SOURCE = `
  function findAll(tag) {
    const found = [];
    const roots = [document];
    const seen = new Set();
    while (roots.length) {
      const root = roots.shift();
      let elements = [];
      try { elements = root.querySelectorAll('*'); } catch (e) { continue; }
      for (const el of elements) {
        if (el.localName === tag) found.push(el);
        if (el.shadowRoot && !seen.has(el.shadowRoot)) {
          seen.add(el.shadowRoot);
          roots.push(el.shadowRoot);
        }
      }
    }
    return found;
  }
`;

const STATE_SCRIPT = `(() => {
  ${FIND_ALL_SOURCE}
  try {
    const dialogs = findAll('hui-dialog-edit-card');
    // hui-dialog-edit-card reflects its enlarged state as the 'large'
    // attribute; the inner ha-dialog then gets width="full" (its default
    // width is "large", so that value must not count as enlarged).
    const isLarge = dialogs.some((dialog) => {
      if (dialog.hasAttribute('large') || dialog.large === true) return true;
      const root = dialog.shadowRoot;
      if (!root) return false;
      return Array.from(
        root.querySelectorAll('ha-dialog, ha-md-dialog, ha-wa-dialog'),
      ).some(
        (inner) => inner.getAttribute('width') === 'full' || inner.width === 'full',
      );
    });
    return {
      stages: {
        homeAssistant: findAll('home-assistant').length > 0,
        dialogEditCard: dialogs.length > 0,
        cardElementEditor: findAll('hui-card-element-editor').length > 0,
        editor: findAll('${ELEMENT_SELECTOR}').length > 0,
        large: isLarge,
      },
    };
  } catch (e) {
    return { stages: {}, error: String(e && e.message ? e.message : e) };
  }
})()`;

/**
 * Pads the editor, scrolls it into view and returns its full rect plus the
 * part actually visible inside its scrolling containers (the edit dialog
 * clips its content, so the full rect can cover the dialog footer, the
 * preview and the dashboard behind it).
 */
const PREPARE_SCRIPT = `(() => {
  ${FIND_ALL_SOURCE}
  const editor = findAll('${ELEMENT_SELECTOR}')[0];
  if (!editor) return null;
  const cardConfig = editor.shadowRoot && editor.shadowRoot.querySelector('.card-config');
  if (cardConfig) cardConfig.style.padding = '50px';
  editor.scrollIntoView({ block: 'start' });

  const full = editor.getBoundingClientRect();
  let left = full.left;
  let top = full.top;
  let right = full.right;
  let bottom = full.bottom;

  // Walk up through shadow roots and intersect with clipping ancestors
  let node = editor;
  while (node) {
    const parent = node.parentElement || (node.getRootNode && node.getRootNode().host) || null;
    if (!parent || parent === document.documentElement) break;
    const style = getComputedStyle(parent);
    if (/(auto|scroll|hidden|clip)/.test(style.overflow + style.overflowX + style.overflowY)) {
      const r = parent.getBoundingClientRect();
      left = Math.max(left, r.left);
      top = Math.max(top, r.top);
      right = Math.min(right, r.right);
      bottom = Math.min(bottom, r.bottom);
    }
    node = parent;
  }
  left = Math.max(left, 0);
  top = Math.max(top, 0);
  right = Math.min(right, window.innerWidth);
  bottom = Math.min(bottom, window.innerHeight);

  return {
    full: { x: full.left, y: full.top, width: full.width, height: full.height },
    visible: {
      x: left,
      y: top,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top),
    },
  };
})()`;

/** The editor's `.card-config` (its whole visible content) */
const CONTENT_SCRIPT = `(() => {
  ${FIND_ALL_SOURCE}
  const editor = findAll('${ELEMENT_SELECTOR}')[0];
  if (!editor) return null;
  return (editor.shadowRoot && editor.shadowRoot.querySelector('.card-config')) || editor;
})()`;

const STAGE_MESSAGES: Record<Stage, string> = {
  homeAssistant: '✓ home-assistant - detected, open the card edit dialog',
  dialogEditCard: '✓ hui-dialog-edit-card - detected',
  cardElementEditor: '✓ hui-card-element-editor - detected',
  editor: `✓ ${ELEMENT_SELECTOR} - detected, make the editor large by clicking on the dialog title (or press Enter to capture now)`,
  large: '✓ large editor - detected',
};

function ensureOutputDir(): void {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

async function getPageState(page: Page): Promise<PageState | null> {
  try {
    return (await page.evaluate(STATE_SCRIPT)) as PageState;
  } catch {
    // Page is navigating or closed
    return null;
  }
}

/**
 * Pressing Enter in the terminal captures right away, without waiting for
 * the large dialog (useful when HA changes how the large state is exposed).
 */
function listenForEnter(onEnter: () => void): () => void {
  if (!process.stdin.isTTY) return () => undefined;
  const rl = readline.createInterface({ input: process.stdin });
  rl.on('line', onEnter);
  return () => rl.close();
}

/**
 * Polls every open tab (the user may navigate in any of them) until a tab
 * shows the editor in a large dialog, or Enter is pressed.
 */
async function waitForEditorPage(
  browser: Browser,
  timeout: number = MAX_WAIT_TIME,
): Promise<Page> {
  const logged = new Set<Stage>();
  let captureNow = false;
  const stopListening = listenForEnter(() => {
    captureNow = true;
  });

  try {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const pages = await browser.pages();
      for (const page of pages) {
        const state = await getPageState(page);
        if (!state) continue;
        if (state.error) {
          console.warn(`Page check failed: ${state.error}`);
          continue;
        }

        (Object.keys(STAGE_MESSAGES) as Stage[]).forEach((stage) => {
          if (state.stages[stage] && !logged.has(stage)) {
            logged.add(stage);
            console.log(STAGE_MESSAGES[stage]);
          }
        });

        if (state.stages.editor && (state.stages.large || captureNow)) {
          return page;
        }
      }

      if (captureNow && !logged.has('editor')) {
        console.log(
          `${ELEMENT_SELECTOR} not found in any tab yet, open the card editor first.`,
        );
        captureNow = false;
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    }
  } finally {
    stopListening();
  }

  throw new Error(
    `Timeout: ${ELEMENT_SELECTOR} in a large edit dialog not found within ${timeout}ms`,
  );
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface EditorRects {
  full: Rect;
  visible: Rect;
}

const MAX_VIEWPORT_HEIGHT = 8000;

/**
 * Sets the viewport height and returns the editor's full and visible rects
 */
async function measureEditor(page: Page, height: number): Promise<EditorRects> {
  await page.setViewport({
    width: SCREENSHOT_VIEWPORT_WIDTH,
    height,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
  });
  await new Promise((resolve) => setTimeout(resolve, 700));
  const rects = (await page.evaluate(PREPARE_SCRIPT)) as EditorRects | null;
  if (!rects || rects.full.width <= 0 || rects.full.height <= 0) {
    throw new Error(`Element ${ELEMENT_SELECTOR} not found or not visible`);
  }
  return rects;
}

async function captureEditorScreenshot(
  page: Page,
  outputPath: string,
): Promise<void> {
  await page.bringToFront();
  // Let animations/transitions finish
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Grow the viewport until the dialog shows the whole editor without
  // scrolling, so the capture contains the editor and nothing else.
  let height = SCREENSHOT_VIEWPORT_HEIGHT;
  let rects = await measureEditor(page, height);
  for (let attempt = 0; attempt < 5; attempt++) {
    const missing = rects.full.height - rects.visible.height;
    if (missing <= 1 || height >= MAX_VIEWPORT_HEIGHT) break;
    height = Math.min(MAX_VIEWPORT_HEIGHT, Math.ceil(height + missing + 100));
    rects = await measureEditor(page, height);
  }

  if (rects.full.height - rects.visible.height > 1) {
    console.warn(
      'Editor is taller than the dialog allows; the capture may be cut off.',
    );
  }

  // Wait until the dialog stops moving (it animates after resizing)
  let previous = '';
  for (let i = 0; i < 10; i++) {
    const current = JSON.stringify(await page.evaluate(PREPARE_SCRIPT));
    if (current === previous) break;
    previous = current;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  // Screenshot the editor's own content box. Puppeteer works out the
  // element's position itself (scroll offsets, device scale), which manual
  // clip coordinates got wrong and picked up the dialog around the editor.
  const handle = await page.evaluateHandle(CONTENT_SCRIPT);
  const element = handle.asElement() as ElementHandle<Element> | null;
  if (!element) {
    throw new Error(`Element ${ELEMENT_SELECTOR} not found`);
  }
  await element.screenshot({
    path: outputPath as `${string}.png`,
    captureBeyondViewport: false,
  });
  console.log(`Saved ${path.relative(projectRoot, outputPath)}`);
}

async function main(): Promise<void> {
  console.log('Starting editor screenshot capture...');
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

  // Non-headless so the user can log in and open the editor
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: browserArgs,
    defaultViewport: null,
  });

  try {
    // Reuse the tab the browser opens with instead of adding a second one
    const [firstPage] = await browser.pages();
    const page = firstPage ?? (await browser.newPage());
    const startUrl = process.env.HA_URL || process.argv[2];
    if (startUrl) {
      await page.goto(startUrl).catch(() => undefined);
    }

    console.log('\nBrowser window opened.');
    console.log('Please:');
    console.log(
      `1. Navigate to your Home Assistant instance${startUrl ? '' : ' (or pass the URL: npm run screenshots:capture-editor -- http://homeassistant.local:8123)'}`,
    );
    console.log('2. Log in if needed');
    console.log('3. Open the card edit dialog');
    console.log(
      '4. Make the editor large by clicking on the dialog title (or press Enter here to capture)\n',
    );

    const editorPage = await waitForEditorPage(browser);
    await captureEditorScreenshot(editorPage, OUTPUT_FILE);

    // Keep the browser open briefly so the user can see the result
    await new Promise((resolve) => setTimeout(resolve, 3000));
  } catch (error) {
    console.error('Error capturing screenshot:', error);
    process.exitCode = 1;
  } finally {
    await browser.close();
    console.log('Done.');
    process.exit();
  }
}

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  process.exit(0);
});

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
