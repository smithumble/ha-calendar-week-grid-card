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
import { setupBrowserEnv } from '../utils/browser';
import { loadIcons } from '../utils/icons';
import { loadTheme } from '../utils/theme';

async function main() {
  // Set storage prefix for demo page
  setStoragePrefix('demo');

  // Load theme and icons
  const haTheme = await loadTheme();
  const haIcons = await loadIcons();

  // Setup browser environment
  setupBrowserEnv(haTheme, haIcons);

  // Initialize provider data
  const currentProvider = await initializeProviderData();

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
