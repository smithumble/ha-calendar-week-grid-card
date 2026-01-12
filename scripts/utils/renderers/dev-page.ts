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
const BROWSER_DEV_PATH = path.resolve(__dirname, '../browser/dev.ts');

/**
 * Get all the data needed to render a page with a config
 * Note: calendars and selectors are handled by browser code, not needed here
 */
function getRenderPageData() {
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
  cardScriptPath: string;
}): string {
  const { cardScriptPath } = options;

  // Preload all provider data
  const providerDataMap = preloadAllProviderData();

  // Get render data (browser selectors will handle provider/data source selection)
  const data = getRenderPageData();

  // Browser code will build maps and populate all selectors dynamically

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
            transition: padding-right 0.3s, flex-direction 0.3s, padding-top 0.3s;
          }

          body.with-editor {
            padding-right: 700px;
            flex-direction: column;
          }

          /* Navbar */
          .navbar {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            min-height: 60px;
            background-color: var(--primary-background-color, rgb(40, 40, 40));
            backdrop-filter: blur(10px);
            display: flex;
            align-items: center;
            padding: 0 20px;
            z-index: 1000;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            transition: min-height 0.3s;
          }

          .provider-selector {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .config-selector {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-left: 20px;
          }

          .data-source-selector {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-left: 20px;
          }

          .config-editor-toggle {
            margin-left: 20px;
          }

          .config-editor-toggle button {
            padding: 8px 16px;
            border-radius: 4px;
            border: 1px solid rgba(255, 255, 255, 0.3);
            background-color: rgba(255, 255, 255, 0.1);
            color: #fff;
            font-size: 14px;
            cursor: pointer;
            transition: background-color 0.2s;
            white-space: nowrap;
            flex-shrink: 0;
          }

          .config-editor-toggle button:hover {
            background-color: rgba(255, 255, 255, 0.15);
          }

          .provider-selector select,
          .config-selector select,
          .data-source-selector select {
            padding: 8px 12px;
            padding-right: 32px;
            border-radius: 4px;
            border: 1px solid rgba(255, 255, 255, 0.3);
            background-color: rgba(255, 255, 255, 0.1);
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 10px center;
            background-size: 12px;
            color: #fff;
            font-size: 14px;
            cursor: pointer;
            min-width: 200px;
            max-width: 100%;
            appearance: none;
            -webkit-appearance: none;
            -moz-appearance: none;
            box-sizing: border-box;
          }

          .provider-selector select:hover,
          .config-selector select:hover,
          .data-source-selector select:hover {
            background-color: rgba(255, 255, 255, 0.15);
          }

          .provider-selector select:focus,
          .config-selector select:focus,
          .data-source-selector select:focus {
            outline: none;
            border-color: rgba(255, 255, 255, 0.5);
            background-color: rgba(255, 255, 255, 0.15);
          }

          .config-editor-panel {
            position: fixed;
            top: 60px;
            right: 0;
            width: 700px;
            height: calc(100vh - 60px);
            background-color: var(--primary-background-color, rgb(30, 30, 30));
            border-left: 1px solid rgba(255, 255, 255, 0.1);
            display: none;
            flex-direction: column;
            z-index: 999;
            box-shadow: -2px 0 8px rgba(0, 0, 0, 0.3);
          }

          .config-editor-panel.visible {
            display: flex;
          }

          .config-editor-header {
            padding: 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .config-editor-header h3 {
            margin: 0;
            font-size: 16px;
            color: var(--primary-text-color, #fff);
          }

          .config-editor-close {
            background: none;
            border: none;
            color: var(--primary-text-color, #fff);
            cursor: pointer;
            padding: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0.7;
            transition: all 0.2s;
            border-radius: 4px;
            position: relative;
          }

          .config-editor-close::before,
          .config-editor-close::after {
            content: '';
            position: absolute;
            width: 18px;
            height: 2px;
            background-color: currentColor;
            border-radius: 1px;
          }

          .config-editor-close::before {
            transform: rotate(45deg);
          }

          .config-editor-close::after {
            transform: rotate(-45deg);
          }

          .config-editor-close:hover {
            opacity: 1;
            background-color: rgba(255, 255, 255, 0.1);
          }

          .config-editor-close:active {
            background-color: rgba(255, 255, 255, 0.2);
          }

          .config-editor-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }

          .config-editor-textarea {
            flex: 1;
            padding: 16px;
            border: none;
            background-color: var(--primary-background-color, rgb(30, 30, 30));
            color: var(--primary-text-color, #fff);
            font-family: 'Courier New', monospace;
            font-size: 13px;
            resize: none;
            outline: none;
            overflow-y: auto;
            white-space: pre;
            tab-size: 2;
            scrollbar-width: thin;
            scrollbar-color: transparent transparent;
            transition: scrollbar-color 0.3s;
          }

          .config-editor-textarea::-webkit-scrollbar {
            width: 8px;
          }

          .config-editor-textarea::-webkit-scrollbar-track {
            background: transparent;
          }

          .config-editor-textarea::-webkit-scrollbar-thumb {
            background: transparent;
            border-radius: 4px;
            transition: background 0.3s;
          }

          .config-editor-textarea.scrolling::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.3);
          }

          .config-editor-textarea.scrolling {
            scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
          }

          .config-editor-textarea:hover::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.3);
          }

          .config-editor-textarea:hover {
            scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
          }

          .config-editor-actions {
            padding: 16px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            gap: 10px;
          }

          .config-editor-actions button {
            flex: 1;
            padding: 10px;
            border-radius: 4px;
            border: 1px solid rgba(255, 255, 255, 0.3);
            background-color: rgba(255, 255, 255, 0.1);
            color: #fff;
            font-size: 14px;
            cursor: pointer;
            transition: background-color 0.2s;
          }

          .config-editor-actions button:hover {
            background-color: rgba(255, 255, 255, 0.15);
          }

          .config-editor-actions button.primary {
            background-color: rgba(76, 175, 80, 0.3);
            border-color: rgba(76, 175, 80, 0.5);
          }

          .config-editor-actions button.primary:hover {
            background-color: rgba(76, 175, 80, 0.4);
          }

          .config-editor-error {
            padding: 12px 16px;
            background-color: rgba(244, 67, 54, 0.2);
            color: #ffcdd2;
            font-size: 13px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            display: none;
          }

          .config-editor-error.visible {
            display: block;
          }

          .theme-container {
            flex: 1;
            display: flex;
            justify-content: center;
            align-items: center;
            box-sizing: border-box;
            background-color: var(--primary-background-color, rgb(40, 40, 40));
            color: var(--primary-text-color);
            position: relative;
            min-height: calc(100vh - 60px);
            min-width: 0;
            overflow: hidden;
          }

          body.with-editor .theme-container {
            flex: none;
            min-height: auto;
            padding: 20px;
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

          body.with-editor .theme-label {
            display: none;
          }

          #card-container-light, #card-container-dark {
            width: 100%;
            max-width: 450px;
          }

          /* Responsive: Vertical layout for smaller screens */
          @media (max-width: 1000px) {
            body {
              flex-direction: column;
              padding-top: 190px;
            }

            .navbar {
              flex-direction: column;
              min-height: auto;
              height: auto;
              padding: 10px;
              gap: 10px;
              align-items: stretch;
            }

            .provider-selector,
            .config-selector,
            .data-source-selector,
            .config-editor-toggle {
              width: 100%;
              margin-left: 0;
            }

            .provider-selector select,
            .config-selector select,
            .data-source-selector select {
              width: 100%;
              min-width: 0;
            }

            .config-editor-toggle button {
              width: 100%;
            }
          }


          /* Responsive: Vertical layout for smaller screens */
          @media (max-width: 1300px) {
            body {
              flex-direction: column;
            }

            .config-editor-panel {
              width: 100%;
              height: 50vh;
              top: auto;
              bottom: 0;
              border-left: none;
              border-top: 1px solid rgba(255, 255, 255, 0.1);
            }

            body.with-editor {
              padding-right: 0;
            }

            .theme-container {
              flex: none;
              min-height: auto;
              padding: 20px;
            }

            .theme-label {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="navbar theme-dark">
          <div class="provider-selector">
            <select id="provider-select"></select>
          </div>
          <div class="config-selector">
            <select id="config-select"></select>
          </div>
          <div class="data-source-selector">
            <select id="data-source-select"></select>
          </div>
          <div class="config-editor-toggle">
            <button id="config-editor-toggle-btn">Edit Config</button>
          </div>
        </div>
        <div class="config-editor-panel" id="config-editor-panel">
          <div class="config-editor-header">
            <h3>Config Editor</h3>
            <button class="config-editor-close" id="config-editor-close" aria-label="Close editor"></button>
          </div>
          <div class="config-editor-content">
            <textarea class="config-editor-textarea" id="config-editor-textarea" spellcheck="false" data-lang="yaml"></textarea>
            <div class="config-editor-error" id="config-editor-error"></div>
          </div>
          <div class="config-editor-actions">
            <button id="config-editor-reset">Reset</button>
            <button id="config-editor-apply" class="primary">Apply</button>
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
          window.MOCK_DATE_STR = ${JSON.stringify(data.mockDateStr)};
          window.PROVIDER_DATA_MAP = ${JSON.stringify(providerDataMap)};
          window.THEME_CSS = ${JSON.stringify(data.theme)};
          window.ICON_MAP = ${JSON.stringify(data.iconMap)};
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
