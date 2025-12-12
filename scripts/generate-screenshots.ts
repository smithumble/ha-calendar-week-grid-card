import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer, { Browser, Page } from 'puppeteer';
import type { ConfigItem } from './utils/providers';
import { preloadAllProviderData } from './utils/providers';
import {
  generateScreenshotPageHTML,
  getRenderPageData,
} from './utils/renderers/screenshot-page';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const CARD_SCRIPT_PATH = path.resolve(
  __dirname,
  '../dist/calendar-week-grid-card.js',
);
const OUTPUT_DIR = path.resolve(__dirname, '../media/images');
const VIEWPORT_WIDTH = 1600;
const VIEWPORT_HEIGHT = 800;
const DEVICE_SCALE_FACTOR = 2;

interface ScreenshotConfig {
  provider: string;
  config: ConfigItem;
  dataSource?: string;
}

interface ParsedArgs {
  force: boolean;
  provider: string | null;
  name: string | null;
}

/**
 * Parse command line arguments
 */
function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  const force = args.includes('--force') || args.includes('-f');
  const nonFlagArgs = args.filter((arg) => !arg.startsWith('-'));

  const providerDataMap = preloadAllProviderData();
  const allProviders = Object.keys(providerDataMap);

  const provider =
    nonFlagArgs[0] && allProviders.includes(nonFlagArgs[0])
      ? nonFlagArgs[0]
      : null;
  const name = provider ? nonFlagArgs[1] : nonFlagArgs[0];

  return { force, provider, name };
}

/**
 * Get all screenshot configurations from all providers
 */
function getAllScreenshotConfigs(): ScreenshotConfig[] {
  const providerDataMap = preloadAllProviderData();
  const configs: ScreenshotConfig[] = [];

  for (const provider of Object.keys(providerDataMap)) {
    const providerData = providerDataMap[provider];
    if (!providerData) continue;

    for (const configItem of providerData.configs) {
      const dataSource = providerData.dataSources[0];
      configs.push({
        provider,
        config: configItem,
        dataSource,
      });
    }
  }

  return configs;
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
    filtered = filtered.filter((c) => c.config.name === name);
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
 * Initialize page content and inject required data
 */
async function initializePage(
  page: Page,
  renderData: ReturnType<typeof getRenderPageData>,
): Promise<void> {
  await page.setContent(generateScreenshotPageHTML());

  // Inject global variables
  await page.evaluate(
    (mockDateStr, config, calendars, theme, iconMap) => {
      window.MOCK_DATE_STR = mockDateStr;
      window.CONFIG = config;
      window.CALENDARS = calendars;
      window.THEME_CSS = theme;
      window.ICON_MAP = iconMap;
    },
    renderData.mockDateStr,
    renderData.config,
    renderData.calendars,
    renderData.theme,
    renderData.iconMap,
  );

  // Inject helper script
  await page.evaluate(renderData.commonCode);

  // Setup the environment
  await page.evaluate(() => {
    window.setupBrowserEnv?.();
  });
}

/**
 * Load and inject the card script
 */
async function injectCardScript(page: Page): Promise<void> {
  const cardCode = fs.readFileSync(CARD_SCRIPT_PATH, 'utf8');
  await page.evaluate((code) => {
    const script = document.createElement('script');
    script.textContent = code;
    script.type = 'module';
    document.body.appendChild(script);
  }, cardCode);

  await page.waitForFunction(() =>
    customElements.get('calendar-week-grid-card'),
  );
}

/**
 * Render cards and wait for them to be ready
 */
async function renderCards(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.renderCards?.(window.CONFIG, window.CALENDARS);
  });
}

/**
 * Resize viewport to fit content and take screenshot
 */
async function captureScreenshot(
  page: Page,
  screenshotConfig: ScreenshotConfig,
): Promise<void> {
  const body = await page.$('body');
  if (!body) {
    throw new Error('Body element not found');
  }

  const boundingBox = await body.boundingBox();
  if (!boundingBox) {
    throw new Error('Could not get body bounding box');
  }

  await page.setViewport({
    width: VIEWPORT_WIDTH,
    height: Math.ceil(boundingBox.height),
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
): Promise<void> {
  const { provider, config, dataSource } = screenshotConfig;
  const page = await browser.newPage();

  try {
    await setupPage(page);

    const renderData = getRenderPageData(config.config, provider, dataSource);
    await initializePage(page, renderData);
    await injectCardScript(page);
    await renderCards(page);
    await captureScreenshot(page, screenshotConfig);
  } finally {
    await page.close();
  }
}

/**
 * Generate a safe filename from screenshot config
 */
function getScreenshotFilename(screenshotConfig: ScreenshotConfig): string {
  const { provider, config } = screenshotConfig;

  // Replace slashes with underscores for valid filename
  const name = config.name.replace(/\//g, '_');

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
): Promise<void> {
  for (const screenshotConfig of configs) {
    if (shouldSkipScreenshot(screenshotConfig, force)) {
      const screenshotFilename = getScreenshotFilename(screenshotConfig);
      console.log(`Skipping ${screenshotFilename} (already exists)`);
      continue;
    }

    await renderScreenshot(browser, screenshotConfig);
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

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu'],
  });

  try {
    await processScreenshots(browser, configsToProcess, args.force);
  } catch (error) {
    console.error('Error generating screenshots:', error);
    process.exit(1);
  } finally {
    await browser.close();
    console.log('Done.');
  }
}

// Run main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
