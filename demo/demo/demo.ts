import { setupBrowserEnv } from '../utils/browser';
import { loadIcons } from '../utils/icons';
import { providerRegistry } from '../utils/registry';
import { loadTheme } from '../utils/theme';
import {
  setStoragePrefix,
  initializeProviderData,
  setupGlobalKeyboardNavigation,
  setupProviderSelector,
  updateSelectsForProvider,
  setupConfigSelectListener,
  setupDataSourceSelectListener,
  setupEditorToggleButton,
} from './common';

const AVAILABLE_PROVIDERS_DEV = providerRegistry.getAllProviderNames();
const AVAILABLE_PROVIDERS_PROD = ['yasno_v3'];

// Available providers based on build mode
// For dev build - all providers, for prod build - only yasno_v3
export const AVAILABLE_PROVIDERS =
  process.env.NODE_ENV === 'development'
    ? AVAILABLE_PROVIDERS_DEV
    : AVAILABLE_PROVIDERS_PROD;

async function main() {
  // Set storage prefix for demo page
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

  // Setup global keyboard navigation
  setupGlobalKeyboardNavigation();

  // Setup provider selector
  setupProviderSelector();

  // Setup selects for current provider
  await updateSelectsForProvider(currentProvider);
  setupConfigSelectListener();
  setupDataSourceSelectListener();
}

main().catch(console.error);
