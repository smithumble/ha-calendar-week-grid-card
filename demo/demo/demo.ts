import { setupBrowserEnv } from './utils/browser';
import { getAllProviderNames } from './utils/data';
import { setupEditorToggleButton } from './utils/editor/panel';
import { loadIcons } from './utils/icons';
import { setupGlobalKeyboardNavigation } from './utils/keyboard';
import {
  setupProviderSelector,
  setupConfigSelector,
  setupDataSourceSelector,
} from './utils/selects';
import { setStoragePrefix } from './utils/storage';
import { loadTheme } from './utils/theme';

const AVAILABLE_PROVIDERS_DEV = getAllProviderNames();
const AVAILABLE_PROVIDERS_PROD = ['yasno_v3'];

// Available providers based on build mode
// For dev build - all providers, for prod build - only yasno_v3
export const AVAILABLE_PROVIDERS =
  process.env.NODE_ENV === 'development'
    ? AVAILABLE_PROVIDERS_DEV
    : AVAILABLE_PROVIDERS_PROD;

const PROVIDER_SELECTOR_ID = 'provider-select';
const CONFIG_SELECTOR_ID = 'config-select';
const DATA_SOURCE_SELECTOR_ID = 'data-source-select';
const KEYBOARD_NAV_SELECTORS = [
  PROVIDER_SELECTOR_ID,
  CONFIG_SELECTOR_ID,
  DATA_SOURCE_SELECTOR_ID,
];

async function main() {
  // Set storage prefix
  setStoragePrefix('demo');

  // Load theme and icons
  const haTheme = await loadTheme();
  const haIcons = await loadIcons();

  // Setup browser environment
  setupBrowserEnv(haTheme, haIcons);

  // Setup editor toggle button
  setupEditorToggleButton();

  // Setup global keyboard navigation
  setupGlobalKeyboardNavigation(KEYBOARD_NAV_SELECTORS, CONFIG_SELECTOR_ID);

  // Setup provider selector
  await setupProviderSelector(AVAILABLE_PROVIDERS, KEYBOARD_NAV_SELECTORS);

  // Setup selects for current provider
  setupConfigSelector(KEYBOARD_NAV_SELECTORS);
  setupDataSourceSelector(KEYBOARD_NAV_SELECTORS);
}

main().catch(console.error);
