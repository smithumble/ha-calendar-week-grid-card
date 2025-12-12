import { buildSync } from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';
import { getMockEvents, MOCK_DATE_STR } from '../events';
import { loadTheme } from '../theme';
import { loadIcons } from '../icons';
import { loadConfigs, type ConfigItem } from '../configs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BROWSER_COMMON_PATH = path.resolve(__dirname, '../browser/common.ts');
const BROWSER_DEV_PATH = path.resolve(__dirname, '../browser/dev.ts');

/**
 * Get all the data needed to render a page with a config
 */
export function getRenderPageData(config: any, dataSource?: string) {
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

  // Compile dev page code
  let devCode: string;
  try {
    const result = buildSync({
      entryPoints: [BROWSER_DEV_PATH],
      write: false,
      bundle: true,
      format: 'iife',
      target: 'es2015',
    });
    devCode = result.outputFiles[0].text;
  } catch (e) {
    console.error('Failed to bundle dev page:', e);
    throw e;
  }

  return {
    mockDateStr: MOCK_DATE_STR,
    config,
    events: getMockEvents(dataSource),
    theme: loadTheme(),
    iconMap: loadIcons(),
    commonCode,
    devCode,
  };
}

/**
 * Generate HTML content for dev page with navbar (theme labels and config selector)
 */
export function generateDevPageHTML(options: {
  config: any;
  cardScriptPath: string;
  dataSource?: string;
}): string {
  const { config, cardScriptPath, dataSource } = options;
  // Default to yasno_1 if no dataSource is provided
  const effectiveDataSource = dataSource || 'yasno_1';
  const data = getRenderPageData(config, effectiveDataSource);

  // Pre-load events for all data sources
  const allEvents: Record<string, any> = {
    yasno_1: getMockEvents('yasno_1'),
    yasno_2: getMockEvents('yasno_2'),
  };
  const allConfigs: ConfigItem[] = loadConfigs();
  const currentConfigName =
    allConfigs.find((c) => JSON.stringify(c.config) === JSON.stringify(config))
      ?.name ||
    allConfigs[0]?.name ||
    '';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          /* Root Variables */
          :root {
            --box-sizing: border-box;
          }

          /* Base Styles */
          html {
            margin: 0;
            padding: 0;
            overflow-x: hidden;
            height: 100%;
          }

          body {
            margin: 0;
            padding: 0;
            padding-top: 60px;
            overflow-x: hidden;
            font-family: 'Roboto', sans-serif; 
            display: flex;
            flex-direction: row;
            width: 100%;
            max-width: 100%;
            min-height: 100vh;
            box-sizing: border-box;
          }

          /* Navbar */
          .navbar {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 60px;
            background-color: var(--primary-background-color, rgb(40, 40, 40));
            backdrop-filter: blur(10px);
            display: flex;
            align-items: center;
            padding: 0 20px;
            z-index: 1000;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          }

          .config-selector {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .data-source-selector {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-left: 20px;
          }

          .config-selector select,
          .data-source-selector select {
            padding: 8px 12px;
            border-radius: 4px;
            border: 1px solid rgba(255, 255, 255, 0.3);
            background-color: rgba(255, 255, 255, 0.1);
            color: #fff;
            font-size: 14px;
            cursor: pointer;
            min-width: 200px;
            max-width: 100%;
          }

          .config-selector select:hover,
          .data-source-selector select:hover {
            background-color: rgba(255, 255, 255, 0.15);
          }

          .config-selector select:focus,
          .data-source-selector select:focus {
            outline: none;
            border-color: rgba(255, 255, 255, 0.5);
            background-color: rgba(255, 255, 255, 0.15);
          }

          .theme-container {
            flex: 1;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 80px 175px 40px;
            box-sizing: border-box;
            background-color: var(--primary-background-color, rgb(40, 40, 40));
            color: var(--primary-text-color);
            position: relative;
            min-height: calc(100vh - 60px);
            min-width: 0;
            overflow: hidden;
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
            max-width: 450px;
          }

          /* Responsive: Vertical layout for smaller screens */
          @media (max-width: 1000px) {
            body {
              flex-direction: column;
            }

            .navbar {
              padding: 0 10px;
            }

            .config-selector,
            .data-source-selector {
              width: 100%;
            }

            .config-selector select,
            .data-source-selector select {
              min-width: 150px;
              flex: 1;
            }

            .theme-container {
              flex: none;
              min-height: auto;
              padding: 20px;
            }

            .theme-container:not(:first-of-type) {
              padding-top: 10px;
              padding-bottom: 10px;
              margin-top: 0;
            }

            .theme-container:last-of-type {
              padding-bottom: 40px;
            }

            .theme-label {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="navbar theme-dark">
          <div class="config-selector">
            <select id="config-select">
              ${allConfigs
                .map(
                  (c) =>
                    `<option value="${c.name}" ${c.name === currentConfigName ? 'selected' : ''}>${c.name}</option>`,
                )
                .join('')}
            </select>
          </div>
          <div class="data-source-selector">
            <select id="data-source-select">
              <option value="yasno_1" ${!dataSource || dataSource === 'yasno_1' ? 'selected' : ''}>Yasno 1</option>
              <option value="yasno_2" ${dataSource === 'yasno_2' ? 'selected' : ''}>Yasno 2</option>
            </select>
          </div>
        </div>
        <div class="theme-container theme-dark">
          <div class="theme-label">Dark</div>
          <div id="card-container-dark"></div>
        </div>
        <div class="theme-container theme-light">
          <div class="theme-label">Light</div>
          <div id="card-container-light"></div>
        </div>
        <script>
          // Inject global variables
          window.MOCK_DATE_STR = ${JSON.stringify(data.mockDateStr)};
          window.CONFIG = ${JSON.stringify(data.config)};
          window.EVENTS = ${JSON.stringify(data.events)};
          window.ALL_EVENTS = ${JSON.stringify(allEvents)};
          window.THEME_CSS = ${JSON.stringify(data.theme)};
          window.ICON_MAP = ${JSON.stringify(data.iconMap)};
          window.ALL_CONFIGS = ${JSON.stringify(
            allConfigs.reduce(
              (acc, c) => {
                acc[c.name] = c.config;
                return acc;
              },
              {} as Record<string, any>,
            ),
          )};
          window.DATA_SOURCE = ${JSON.stringify(effectiveDataSource)};
        </script>
        <script>
          ${data.commonCode}
        </script>
        <script type="module" id="card-script" src="${cardScriptPath}"></script>
        <script>
          ${data.devCode}
        </script>
      </body>
    </html>
  `;

  return htmlContent;
}
