import puppeteer, { Browser } from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { buildSync } from 'esbuild';
import { getPageContent } from './utils/browser';
import { getMockEvents, MOCK_DATE_STR } from './utils/events';
import { loadTheme } from './utils/theme';
import { loadConfigs, ConfigItem } from './utils/configs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const forceRegenerate = args.includes('--force') || args.includes('-f');

// Check for specific config argument
const configArgIndex = args.findIndex((arg) => !arg.startsWith('-'));
const specificConfig = configArgIndex !== -1 ? args[configArgIndex] : null;

const DIST_PATH = path.resolve(__dirname, '../dist/calendar-week-grid-card.js');
const OUTPUT_DIR = path.resolve(__dirname, '../media/images');
const BROWSER_UTILS_PATH = path.resolve(__dirname, 'utils/browser.ts');

const THEME_CSS = loadTheme();
const CONFIGS = loadConfigs();
const MOCK_EVENTS = getMockEvents();

// Compile browser-side code once
function getBrowserCode(): string {
  try {
    const result = buildSync({
      entryPoints: [BROWSER_UTILS_PATH],
      write: false,
      bundle: true,
      format: 'iife',
      target: 'es2015',
      globalName: 'BrowserUtils', // Optional, but nice if we export things
    });
    return result.outputFiles[0].text;
  } catch (e) {
    console.error('Failed to bundle browser utils:', e);
    process.exit(1);
  }
}

const BROWSER_CODE = getBrowserCode();

async function renderScreenshot(browser: Browser, configItem: ConfigItem) {
  const page = await browser.newPage();

  // Log console messages from the page
  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));

  // Set viewport size (wider for split view)
  await page.setViewport({ width: 1600, height: 800, deviceScaleFactor: 2 });

  // Set content first
  await page.setContent(getPageContent());

  // Inject global variables
  await page.evaluate(
    (mockDateStr, config, events, theme) => {
      window.MOCK_DATE_STR = mockDateStr;
      window.CONFIG = config;
      window.EVENTS = events;
      window.THEME_CSS = theme;
    },
    MOCK_DATE_STR,
    configItem.config,
    MOCK_EVENTS,
    THEME_CSS,
  );

  // Inject helper script
  await page.evaluate(BROWSER_CODE);

  // Setup the environment
  await page.evaluate(() => {
    // @ts-expect-error - BrowserUtils is injected via bundled code
    BrowserUtils.setupBrowserEnv();
  });

  // Inject the card script
  const cardCode = fs.readFileSync(DIST_PATH, 'utf8');
  await page.evaluate((code) => {
    const script = document.createElement('script');
    script.textContent = code;
    script.type = 'module';
    document.body.appendChild(script);
  }, cardCode);

  // Wait for the custom element to be defined
  await page.waitForFunction(() =>
    customElements.get('calendar-week-grid-card'),
  );

  // Render cards
  await page.evaluate(() => {
    // @ts-expect-error - BrowserUtils is injected via bundled code
    BrowserUtils.renderCards();
  });

  // Wait for card to render and fetch events (check both)
  await page.waitForFunction(() => {
    const cards = document.querySelectorAll('calendar-week-grid-card');
    if (cards.length < 2) return false;

    return Array.from(cards).every(
      (card) =>
        card &&
        card.shadowRoot &&
        card.shadowRoot.querySelector('.grid-container'),
    );
  });

  // Give it a bit more time for async fetch and render cycles
  await new Promise((r) => setTimeout(r, 3000));

  // Resize viewport to fit content
  const bodyHandle = await page.$('body');
  if (!bodyHandle) return;

  const boundingBox = await bodyHandle.boundingBox();
  if (boundingBox) {
    await page.setViewport({
      width: 1600,
      height: Math.ceil(boundingBox.height),
      deviceScaleFactor: 2,
    });
  }

  // Take screenshot of the body
  const element = await page.$('body');
  if (element) {
    const imagePath = path.join(OUTPUT_DIR, `${configItem.name}.png`);
    await element.screenshot({ path: imagePath });
    console.log(`Generated ${configItem.name}.png`);
  }

  await page.close();
}

(async () => {
  console.log('Starting screenshot generation...');
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-gpu',
    ],
  });

  try {
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Filter configs if specific config is requested
    const configsToProcess = specificConfig
      ? CONFIGS.filter((config) => config.name === specificConfig)
      : CONFIGS;

    if (specificConfig && configsToProcess.length === 0) {
      console.error(`Config '${specificConfig}' not found.`);
      process.exit(1);
    }

    for (const config of configsToProcess) {
      const imagePath = path.join(OUTPUT_DIR, `${config.name}.png`);

      if (!forceRegenerate && fs.existsSync(imagePath)) {
        console.log(`Skipping ${config.name}.png (already exists)`);
        continue;
      }

      await renderScreenshot(browser, config);
    }
  } catch (error) {
    console.error('Error generating screenshots:', error);
  } finally {
    await browser.close();
    console.log('Done.');
  }
})();
