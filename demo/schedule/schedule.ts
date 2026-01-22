import {
  setStoragePrefix,
  initializeProviderData,
  selectConfig,
  updateDataSourceSelect,
  setupDataSourceSelectListener,
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
  const currentProvider = initializeProviderData(['yasno_api']);

  // Select a specific config for the schedule page
  await selectConfig('google_calendar_separated', currentProvider);

  // Setup data source selector
  await updateDataSourceSelect(currentProvider);
  setupDataSourceSelectListener();
}

main().catch(console.error);
