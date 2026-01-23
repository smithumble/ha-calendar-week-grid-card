import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';
import puppeteer, { Browser, Page } from 'puppeteer';
import { createServer as createViteServer, ViteDevServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');

// Constants
const OUTPUT_DIR = path.resolve(projectRoot, 'media/images');
const VIEWPORT_WIDTH = 1350;
const VIEWPORT_HEIGHT = 800;
const DEVICE_SCALE_FACTOR = 2;
const DEFAULT_SERVER_PORT = 5001; // Match demo/vite.config.ts port

interface ScreenshotConfig {
  provider: string;
  configName: string;
  dataSource: string;
  fileName: string;
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
    provider: 'yasno_v3',
    dataSource: 'yasno_1',
    configName: 'basic',
    fileName: 'example_1_basic',
  },
  {
    provider: 'yasno_v3',
    dataSource: 'yasno_1',
    configName: 'simple',
    fileName: 'example_2_simple',
  },
  {
    provider: 'yasno_v3',
    dataSource: 'yasno_1',
    configName: 'simple_colored',
    fileName: 'example_3_simple_colored',
  },
  {
    provider: 'yasno_v3',
    dataSource: 'yasno_1',
    configName: 'classic',
    fileName: 'example_4_classic',
  },
  {
    provider: 'yasno_v3',
    dataSource: 'yasno_1',
    configName: 'neon',
    fileName: 'example_5_neon',
  },
  {
    provider: 'yasno_v3',
    dataSource: 'yasno_1',
    configName: 'soft_ui',
    fileName: 'example_6_soft_ui',
  },
  {
    provider: 'yasno_v3',
    dataSource: 'yasno_1',
    configName: 'yasno_legacy',
    fileName: 'example_7_yasno_legacy',
  },
  {
    provider: 'yasno_v3',
    dataSource: 'yasno_1',
    configName: 'google_calendar',
    fileName: 'example_8_1_google_calendar',
  },
  {
    provider: 'yasno_v3',
    dataSource: 'yasno_1',
    configName: 'google_calendar_separated',
    fileName: 'example_8_2_google_calendar_separated',
  },
  {
    provider: 'yasno_v3',
    dataSource: 'yasno_1',
    configName: 'google_calendar_original',
    fileName: 'example_8_3_google_calendar_original',
  },
  {
    provider: 'yasno_v3',
    dataSource: 'yasno_1',
    configName: 'google_calendar_original_separated',
    fileName: 'example_8_4_google_calendar_original_separated',
  },
  {
    provider: 'yasno_image',
    dataSource: 'yasno_1',
    configName: 'image',
    fileName: 'image',
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
    configFile: path.resolve(projectRoot, 'demo/vite.config.ts'),
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
  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('[vite]')) return;
    console.log('PAGE LOG:', text);
  });

  await page.setViewport({
    width: VIEWPORT_WIDTH,
    height: VIEWPORT_HEIGHT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
  });
}

/**
 * Navigate to screenshot page with URL parameters
 */
async function navigateToScreenshotPage(
  page: Page,
  provider: string,
  configName: string,
  dataSource: string,
  serverPort: number,
): Promise<void> {
  const url = `http://localhost:${serverPort}/screenshot/?provider=${encodeURIComponent(provider)}&config=${encodeURIComponent(configName)}&dataSource=${encodeURIComponent(dataSource)}`;
  await page.goto(url, { waitUntil: 'networkidle0' });
}

/**
 * Wait for all stylesheets to be loaded
 */
async function waitForStylesheets(page: Page): Promise<void> {
  await page.evaluate(() => {
    return Promise.all(
      Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(
        (link) => {
          return new Promise<void>((resolve) => {
            const linkEl = link as HTMLLinkElement;
            if (linkEl.sheet) {
              // Stylesheet already loaded
              resolve();
            } else {
              // Wait for load or error
              linkEl.addEventListener('load', () => resolve(), { once: true });
              linkEl.addEventListener('error', () => resolve(), { once: true });
              // Timeout after 5 seconds
              setTimeout(() => resolve(), 5000);
            }
          });
        },
      ),
    );
  });
}

/**
 * Wait for fonts to be loaded
 */
async function waitForFonts(page: Page): Promise<void> {
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
  });
}

/**
 * Inject CSS to stabilize rendering (disable animations, force consistent fonts/shapes)
 */
async function stabilizeRendering(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
      }
      
      /* Force consistent font rendering */
      body {
        -webkit-font-smoothing: antialiased !important;
        -moz-osx-font-smoothing: grayscale !important;
        text-rendering: geometricPrecision !important;
      }

      /* Force consistent shape rendering */
      svg {
        shape-rendering: geometricPrecision !important;
      }
    `,
  });
}

/**
 * Wait for cards to be rendered
 */
async function waitForCards(page: Page): Promise<void> {
  // Wait for custom element to be registered
  await page.waitForFunction(() =>
    customElements.get('calendar-week-grid-card'),
  );

  // Wait for stylesheets to load
  await waitForStylesheets(page);

  // Wait for fonts to load
  await waitForFonts(page);

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

  // Wait for styles to be applied and any animations to complete
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

/**
 * Strip metadata from PNG file to ensure consistent output
 */
function stripPngMetadata(imagePath: string): void {
  try {
    const buffer = fs.readFileSync(imagePath);
    const png = PNG.sync.read(buffer);

    // Create a new PNG without metadata
    const cleanPng = new PNG({
      width: png.width,
      height: png.height,
      colorType: png.colorType,
      inputHasAlpha: png.alpha,
    });

    // Copy pixel data
    png.data.copy(cleanPng.data);

    // Write back without metadata
    const cleanBuffer = PNG.sync.write(cleanPng, {
      deflateLevel: 6,
      deflateStrategy: 0,
      filterType: -1, // Auto
    });

    fs.writeFileSync(imagePath, cleanBuffer);
  } catch (error) {
    console.warn(`Warning: Failed to strip metadata from ${imagePath}:`, error);
    // Continue even if metadata stripping fails
  }
}

/**
 * Capture full page screenshot
 */
async function captureScreenshot(
  page: Page,
  screenshotConfig: ScreenshotConfig,
): Promise<void> {
  // Set viewport for consistent screenshot dimensions
  await page.setViewport({
    width: VIEWPORT_WIDTH,
    height: VIEWPORT_HEIGHT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
  });

  const screenshotFilename = getScreenshotFilename(screenshotConfig);
  const imagePath = getScreenshotPath(screenshotConfig);

  // Take full page screenshot
  await page.screenshot({
    path: imagePath,
    fullPage: true,
  });

  // Strip metadata to ensure consistent files
  stripPngMetadata(imagePath);

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
    await navigateToScreenshotPage(
      page,
      provider,
      configName,
      dataSource,
      serverPort,
    );
    await stabilizeRendering(page);
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
  return `${screenshotConfig.fileName}.png`;
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

  // Start Vite server for screenshot page
  console.log('Starting Vite server...');
  const { vite, port } = await createDemoServer();
  console.log(`Vite server running on http://localhost:${port}`);

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

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: browserArgs,
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
