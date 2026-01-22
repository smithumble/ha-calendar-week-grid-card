import { setupBrowserEnv } from '../utils/browser';
import { loadIcons } from '../utils/icons';
import { providerRegistry } from '../utils/registry';
import { loadTheme } from '../utils/theme';
import {
  setStoragePrefix,
  initializeProviderData,
  setupConfigEditor,
  setupGlobalKeyboardNavigation,
  setupProviderSelector,
  updateSelectsForProvider,
  setupConfigSelectListener,
  setupDataSourceSelectListener,
  updateVisualEditor,
  waitForCustomElement,
  initializeCards,
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
  const currentProvider = await initializeProviderData(AVAILABLE_PROVIDERS);

  // Setup config editor early
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupConfigEditor);
  } else {
    setupConfigEditor();
  }

  // Setup global keyboard navigation
  setupGlobalKeyboardNavigation();

  // Setup provider selector
  await setupProviderSelector();

  // Setup selects for current provider
  await updateSelectsForProvider(currentProvider, false);
  setupConfigSelectListener(updateVisualEditor);
  setupDataSourceSelectListener();

  // Wait for custom element to be registered
  if (await waitForCustomElement()) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    await initializeCards(currentProvider, 'yasno_1', true);

    // Focus config selector by default
    const configSelect = document.getElementById(
      'config-select',
    ) as HTMLSelectElement;
    if (configSelect) {
      configSelect.focus();
    }
  }
}

main().catch(console.error);
