import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer, { Browser, Page } from 'puppeteer';
import { createServer as createViteServer, ViteDevServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const OUTPUT_DIR = path.resolve(__dirname, '../media/images');
const VIEWPORT_WIDTH = 1350;
const VIEWPORT_HEIGHT = 800;
const DEVICE_SCALE_FACTOR = 2;
const DEFAULT_SERVER_PORT = 5001; // Match demo/vite.config.ts port

interface ScreenshotConfig {
  provider: string;
  configName: string;
  dataSource: string;
}

interface ParsedArgs {
  force: boolean;
  provider: string | null;
  name: string | null;
}

/**
 * Hardcoded mapping of all screenshot configurations
 */
const SCREENSHOT_CONFIGS: ScreenshotConfig[] = [
  // Yasno provider configs
  {
    provider: 'yasno',
    configName: 'example_1_basic',
    dataSource: 'yasno_1',
  },
  {
    provider: 'yasno',
    configName: 'example_2_simple',
    dataSource: 'yasno_1',
  },
  {
    provider: 'yasno',
    configName: 'example_3_simple_colored',
    dataSource: 'yasno_1',
  },
  {
    provider: 'yasno',
    configName: 'example_4_classic',
    dataSource: 'yasno_1',
  },
  {
    provider: 'yasno',
    configName: 'example_5_neon',
    dataSource: 'yasno_1',
  },
  {
    provider: 'yasno',
    configName: 'example_6_soft_ui',
    dataSource: 'yasno_1',
  },
  {
    provider: 'yasno',
    configName: 'example_7_yasno_legacy',
    dataSource: 'yasno_1',
  },
  {
    provider: 'yasno',
    configName: 'example_8_1_google_calendar',
    dataSource: 'yasno_1',
  },
  {
    provider: 'yasno',
    configName: 'example_8_2_google_calendar_separated',
    dataSource: 'yasno_1',
  },
  {
    provider: 'yasno',
    configName: 'example_8_3_google_calendar_original',
    dataSource: 'yasno_1',
  },
  {
    provider: 'yasno',
    configName: 'example_8_4_google_calendar_original_separated',
    dataSource: 'yasno_1',
  },
  {
    provider: 'yasno',
    configName: 'image',
    dataSource: 'yasno_1',
  },
];

/**
 * Parse command line arguments
 */
function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  const force = args.includes('--force') || args.includes('-f');
  const nonFlagArgs = args.filter((arg) => !arg.startsWith('-'));

  const allProviders = Array.from(
    new Set(SCREENSHOT_CONFIGS.map((c) => c.provider)),
  );

  const provider =
    nonFlagArgs[0] && allProviders.includes(nonFlagArgs[0])
      ? nonFlagArgs[0]
      : null;
  const name = provider ? nonFlagArgs[1] : nonFlagArgs[0];

  return { force, provider, name };
}

/**
 * Get all screenshot configurations
 */
function getAllScreenshotConfigs(): ScreenshotConfig[] {
  return SCREENSHOT_CONFIGS;
}

/**
 * Filter screenshot configs based on provided arguments
 */
function filterConfigs(
  configs: ScreenshotConfig[],
  provider: string | null,
  name: string | null,
): ScreenshotConfig[] {
  let filtered = configs;

  if (provider) {
    filtered = filtered.filter((c) => c.provider === provider);
  }

  if (name) {
    filtered = filtered.filter((c) => c.configName === name);
  }

  return filtered;
}

/**
 * Validate filtered configs and exit if invalid
 */
function validateConfigs(
  configs: ScreenshotConfig[],
  provider: string | null,
  name: string | null,
): void {
  if (name && configs.length === 0) {
    console.error(
      `Config '${name}' not found${provider ? ` for provider '${provider}'` : ''}.`,
    );
    process.exit(1);
  }

  if (provider && configs.length === 0) {
    console.error(`Provider '${provider}' not found or has no configs.`);
    process.exit(1);
  }
}

/**
 * Create Vite server using the existing demo/vite.config.ts
 */
async function createDemoServer(): Promise<{
  vite: ViteDevServer;
  port: number;
}> {
  const vite = await createViteServer({
    configFile: path.resolve(__dirname, '../demo/vite.config.ts'),
    server: {
      port: DEFAULT_SERVER_PORT,
      strictPort: false, // Allow finding an available port if default is in use
    },
  });

  await vite.listen();

  // Get the actual port from the HTTP server
  const httpServer = vite.httpServer;
  if (!httpServer) {
    throw new Error('Vite HTTP server not available');
  }

  const address = httpServer.address();
  const actualPort =
    typeof address === 'object' && address !== null && 'port' in address
      ? address.port
      : DEFAULT_SERVER_PORT;

  return {
    vite,
    port: actualPort,
  };
}

/**
 * Setup page with initial viewport
 */
async function setupPage(page: Page): Promise<void> {
  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  await page.setViewport({
    width: VIEWPORT_WIDTH,
    height: VIEWPORT_HEIGHT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
  });
}

/**
 * Navigate to demo page with URL parameters
 */
async function navigateToDemoPage(
  page: Page,
  provider: string,
  configName: string,
  dataSource: string,
  serverPort: number,
): Promise<void> {
  const url = `http://localhost:${serverPort}/demo/?provider=${encodeURIComponent(provider)}&config=${encodeURIComponent(configName)}&dataSource=${encodeURIComponent(dataSource)}`;
  await page.goto(url, { waitUntil: 'networkidle0' });
}

/**
 * Wait for cards to be rendered
 */
async function waitForCards(page: Page): Promise<void> {
  // Wait for custom element to be registered
  await page.waitForFunction(() =>
    customElements.get('calendar-week-grid-card'),
  );

  // Wait for cards to be rendered in both containers
  await page.waitForFunction(
    () => {
      const darkContainer = document.querySelector('#card-container-dark');
      const lightContainer = document.querySelector('#card-container-light');
      return (
        darkContainer?.querySelector('calendar-week-grid-card') &&
        lightContainer?.querySelector('calendar-week-grid-card')
      );
    },
    { timeout: 10000 },
  );

  // Wait a bit more for any animations or final rendering
  await new Promise((resolve) => setTimeout(resolve, 500));
}

/**
 * Resize viewport to fit content and take screenshot
 */
async function captureScreenshot(
  page: Page,
  screenshotConfig: ScreenshotConfig,
): Promise<void> {
  // Hide navbar and editor panel for cleaner screenshots
  await page.evaluate(() => {
    const navbar = document.querySelector('.navbar');
    const editorPanel = document.querySelector('.config-editor-panel');
    if (navbar) (navbar as HTMLElement).style.display = 'none';
    if (editorPanel) (editorPanel as HTMLElement).style.display = 'none';
  });

  // Get the body to measure its actual height
  const body = await page.$('body');
  if (!body) {
    throw new Error('Body element not found');
  }

  // Get the actual height of the body (which contains both side-by-side containers)
  // Since containers are side-by-side, body height is the max of the two
  const bodyBox = await body.boundingBox();
  if (!bodyBox) {
    throw new Error('Could not get body bounding box');
  }

  // Use the body height, which is the maximum of the two side-by-side containers
  await page.setViewport({
    width: VIEWPORT_WIDTH,
    height: Math.ceil(bodyBox.height),
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
  });

  const screenshotFilename = getScreenshotFilename(screenshotConfig);
  const imagePath = getScreenshotPath(screenshotConfig);

  await body.screenshot({ path: imagePath });
  console.log(`Generated ${screenshotFilename}`);
}

/**
 * Render a single screenshot
 */
async function renderScreenshot(
  browser: Browser,
  screenshotConfig: ScreenshotConfig,
  serverPort: number,
): Promise<void> {
  const { provider, configName, dataSource } = screenshotConfig;
  const page = await browser.newPage();

  try {
    await setupPage(page);
    await navigateToDemoPage(
      page,
      provider,
      configName,
      dataSource,
      serverPort,
    );
    await waitForCards(page);
    await captureScreenshot(page, screenshotConfig);
  } finally {
    await page.close();
  }
}

/**
 * Generate a safe filename from screenshot config
 */
function getScreenshotFilename(screenshotConfig: ScreenshotConfig): string {
  const { provider, configName } = screenshotConfig;

  // Replace slashes with underscores for valid filename
  const name = configName.replace(/\//g, '_');

  // If provider is yasno, return not prefixed config name for backward compatibility
  if (provider === 'yasno') {
    return `${name}.png`;
  }

  // Otherwise, return provider prefixed config name
  return `${provider}_${name}.png`;
}

/**
 * Get the output path for a screenshot
 */
function getScreenshotPath(screenshotConfig: ScreenshotConfig): string {
  const screenshotFilename = getScreenshotFilename(screenshotConfig);
  return path.join(OUTPUT_DIR, screenshotFilename);
}

/**
 * Check if screenshot should be skipped
 */
function shouldSkipScreenshot(
  screenshotConfig: ScreenshotConfig,
  force: boolean,
): boolean {
  if (force) {
    return false;
  }

  const imagePath = getScreenshotPath(screenshotConfig);
  return fs.existsSync(imagePath);
}

/**
 * Ensure output directory exists
 */
function ensureOutputDir(): void {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

/**
 * Process all screenshot configurations
 */
async function processScreenshots(
  browser: Browser,
  configs: ScreenshotConfig[],
  force: boolean,
  serverPort: number,
): Promise<void> {
  for (const screenshotConfig of configs) {
    if (shouldSkipScreenshot(screenshotConfig, force)) {
      const screenshotFilename = getScreenshotFilename(screenshotConfig);
      console.log(`Skipping ${screenshotFilename} (already exists)`);
      continue;
    }

    await renderScreenshot(browser, screenshotConfig, serverPort);
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  console.log('Starting screenshot generation...');

  const args = parseArgs();
  ensureOutputDir();

  const configs = getAllScreenshotConfigs();
  const configsToProcess = filterConfigs(configs, args.provider, args.name);
  validateConfigs(configsToProcess, args.provider, args.name);

  // Start Vite server for demo page
  console.log('Starting Vite server...');
  const { vite, port } = await createDemoServer();
  console.log(`Vite server running on http://localhost:${port}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu'],
  });

  try {
    await processScreenshots(browser, configsToProcess, args.force, port);
  } catch (error) {
    console.error('Error generating screenshots:', error);
    process.exit(1);
  } finally {
    await browser.close();
    await vite.close();
    console.log('Done.');
  }
}

// Run main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
