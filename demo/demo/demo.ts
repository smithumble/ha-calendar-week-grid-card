import { initializeProviderData } from './common';
import { setupBrowserEnv } from './utils/browser';
import { setupEditorToggleButton } from './utils/editor/panel';
import { loadIcons } from './utils/icons';
import { setupGlobalKeyboardNavigation } from './utils/keyboard';
import { providerRegistry } from './utils/registry';
import {
  setupProviderSelector,
  updateSelectsForProvider,
  setupConfigSelector,
  setupDataSourceSelector,
} from './utils/selects';
import { setStoragePrefix } from './utils/storage';
import { loadTheme } from './utils/theme';

const AVAILABLE_PROVIDERS_DEV = providerRegistry.getAllProviderNames();
const AVAILABLE_PROVIDERS_PROD = ['yasno_v3'];

// Available providers based on build mode
// For dev build - all providers, for prod build - only yasno_v3
export const AVAILABLE_PROVIDERS =
  process.env.NODE_ENV === 'development'
    ? AVAILABLE_PROVIDERS_DEV
    : AVAILABLE_PROVIDERS_PROD;

async function main() {
  // Set storage prefix
  setStoragePrefix('demo');

  // Load theme and icons
  const haTheme = await loadTheme();
  const haIcons = await loadIcons();

  // Setup browser environment
  setupBrowserEnv(haTheme, haIcons);

  // Initialize provider data
  const currentProvider = initializeProviderData(AVAILABLE_PROVIDERS);

  // Setup editor toggle button
  setupEditorToggleButton();

  const selectorIds = [
    'provider-select',
    'config-select',
    'data-source-select',
  ];

  // Setup global keyboard navigation
  setupGlobalKeyboardNavigation(selectorIds, 'config-select');

  // Setup provider selector
  setupProviderSelector(selectorIds);

  // Setup selects for current provider
  await updateSelectsForProvider(currentProvider);
  setupConfigSelector(selectorIds);
  setupDataSourceSelector(selectorIds);
}

main().catch(console.error);
