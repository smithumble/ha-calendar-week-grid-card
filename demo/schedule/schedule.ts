import {
  setStoragePrefix,
  initializeProviderData,
  selectConfig,
  updateDataSourceSelect,
  setupDataSourceSelectListener,
  waitForCustomElement,
  initializeCards,
} from '../demo/common';
import { setupBrowserEnv } from '../utils/browser';
import { loadIcons } from '../utils/icons';
import { loadTheme } from '../utils/theme';

async function main() {
  // Set storage prefix for schedule page
  setStoragePrefix('schedule');

  // Load theme and icons
  const haTheme = await loadTheme();
  const haIcons = await loadIcons();

  // Setup browser environment
  setupBrowserEnv(haTheme, haIcons);

  // Initialize provider data
  const currentProvider = await initializeProviderData(['yasno_api']);

  // Select a specific config for the schedule page
  await selectConfig('google_calendar_separated', currentProvider);

  // Setup data source selector
  await updateDataSourceSelect(currentProvider, false);
  setupDataSourceSelectListener();

  // Wait for custom element to be registered
  if (await waitForCustomElement()) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    await initializeCards(currentProvider, '1.1', false);
  }
}

main().catch(console.error);
