import { setupGlobalKeyboardNavigation } from 'demo/utils/keyboard';
import { ASSET_MANIFEST } from 'virtual:asset-manifest/schedule';
import { setupBrowserEnv } from '../demo/utils/browser';
import { loadIcons } from '../demo/utils/icons';
import { setAssetManifest } from '../demo/utils/manifest';
import {
  updateDataSourceSelect,
  setupDataSourceSelector,
  selectProvider,
  selectConfig,
} from '../demo/utils/selects';
import { setStoragePrefix } from '../demo/utils/storage';
import { loadTheme } from '../demo/utils/theme';

setAssetManifest(ASSET_MANIFEST);

const SCHEDULE_PROVIDER = 'yasno_api';
const SCHEDULE_CONFIG = 'google_calendar';

const DATA_SOURCE_SELECTOR_ID = 'data-source-select';
const KEYBOARD_NAV_SELECTORS = [DATA_SOURCE_SELECTOR_ID];

async function main() {
  // Set storage prefix for schedule page
  setStoragePrefix('schedule');

  // Load theme and icons
  const haTheme = await loadTheme();
  const haIcons = await loadIcons();

  // Setup browser environment
  setupBrowserEnv(haTheme, haIcons);

  // Select a specific provider for the schedule page
  selectProvider(SCHEDULE_PROVIDER);

  // Select a specific config for the schedule page
  await selectConfig(SCHEDULE_CONFIG);

  // Setup global keyboard navigation
  setupGlobalKeyboardNavigation(
    KEYBOARD_NAV_SELECTORS,
    DATA_SOURCE_SELECTOR_ID,
  );

  // Setup data source selector
  await updateDataSourceSelect(SCHEDULE_PROVIDER);
  setupDataSourceSelector(KEYBOARD_NAV_SELECTORS);
}

main().catch(console.error);
