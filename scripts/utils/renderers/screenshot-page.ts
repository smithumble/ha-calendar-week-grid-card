import path from 'path';
import { fileURLToPath } from 'url';
import { buildSync } from 'esbuild';
import { MOCK_DATE_STR } from '../datetime';
import { loadIcons } from '../icons';
import { preloadAllProviderData } from '../providers';
import { loadTheme } from '../theme';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BROWSER_COMMON_PATH = path.resolve(__dirname, '../browser/common.ts');

/**
 * Get all the data needed to render a page with a config
 */
export function getRenderPageData(
  config: any,
  provider: string,
  dataSource?: string,
) {
  // Compile browser common code
  let commonCode: string;
  try {
    const result = buildSync({
      entryPoints: [BROWSER_COMMON_PATH],
      write: false,
      bundle: true,
      format: 'iife',
      target: 'es2015',
    });
    commonCode = result.outputFiles[0].text;
  } catch (e) {
    console.error('Failed to bundle browser common:', e);
    throw e;
  }

  // Get provider data
  const providerDataMap = preloadAllProviderData();
  const providerData = providerDataMap[provider];
  if (!providerData) {
    throw new Error(`Provider "${provider}" not found`);
  }

  // Use provided data source or first available
  const selectedDataSource = dataSource || providerData.dataSources[0];
  if (!providerData.dataSources.includes(selectedDataSource)) {
    throw new Error(
      `Data source "${selectedDataSource}" not available for provider "${provider}"`,
    );
  }

  const calendars = providerData.calendars[selectedDataSource] || [];

  return {
    mockDateStr: MOCK_DATE_STR,
    config,
    calendars,
    theme: loadTheme(),
    iconMap: loadIcons(),
    commonCode,
  };
}

/**
 * Generate HTML content for screenshot page
 */
export function generateScreenshotPageHTML(): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          /* Root Variables */
          :root {
            --box-sizing: border-box;
          }

          /* Base Styles */
          body { 
            font-family: 'Roboto', sans-serif; 
            margin: 0;
            padding: 0;
            display: flex;
            width: 100vw;
            min-height: 100vh;
          }

          .theme-container {
            flex: 1;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 80px;
            box-sizing: border-box;
            background-color: var(--primary-background-color, rgb(40, 40, 40));
            color: var(--primary-text-color);
            position: relative;
            min-height: 100vh;
          }
          
          /* Label for the theme mode */
          .theme-label {
            position: absolute;
            top: 20px;
            left: 20px;
            font-size: 24px;
            opacity: 0.5;
            font-weight: bold;
          }

          #card-container-light, #card-container-dark {
            width: 100%;
            max-width: 440px;
          }
        </style>
      </head>
      <body>
        <div class="theme-container theme-dark">
          <div class="theme-label">Dark</div>
          <div id="card-container-dark"></div>
        </div>
        <div class="theme-container theme-light">
          <div class="theme-label">Light</div>
          <div id="card-container-light"></div>
        </div>
      </body>
    </html>
  `;
}
