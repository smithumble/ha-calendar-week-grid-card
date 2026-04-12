import {
  selectConfig,
  selectProvider,
  getInitialProviderValue,
  selectDataSource,
} from 'demo/utils/selects';
import {
  getCurrentCalendars,
  getCurrentConfig,
  renderCurrentCards,
} from 'demo/utils/state';
import type { CardConfig } from '../../src/types';
import { setupBrowserEnv, renderCardToContainer } from '../demo/utils/browser';
import {
  getProviderDefaultConfig,
  getProviderDefaultDataSource,
} from '../demo/utils/data';
import { loadIcons } from '../demo/utils/icons';
import { setStoragePrefix, getFromURL } from '../demo/utils/storage';
import { loadTheme } from '../demo/utils/theme';

function renderHorizontalOverrideCards(): void {
  const config = getCurrentConfig();
  const calendars = getCurrentCalendars();
  if (!config || !calendars) return;

  const horizontalConfig: CardConfig = {
    ...config,
    orientation: 'horizontal',
    start_hour: 10,
    end_hour: 24,
    days: 3,
    week_start: 'today',
  };

  renderCardToContainer(
    'card-container-dark-horizontal',
    horizontalConfig,
    calendars,
  );
  renderCardToContainer(
    'card-container-light-horizontal',
    horizontalConfig,
    calendars,
  );
}

/**
 * Main initialization function
 */
async function main() {
  // Set storage prefix
  setStoragePrefix('screenshot');

  // Load theme and icons
  const haTheme = await loadTheme();
  const haIcons = await loadIcons();

  // Setup browser environment
  setupBrowserEnv(haTheme, haIcons);

  const selectedProvider = getInitialProviderValue() || '';
  selectProvider(selectedProvider);

  const defaultConfig = getProviderDefaultConfig(selectedProvider);
  const defaultDataSource =
    await getProviderDefaultDataSource(selectedProvider);

  const config = getFromURL('config') || defaultConfig || '';
  const dataSource = getFromURL('dataSource') || defaultDataSource || '';

  await selectConfig(config);
  await selectDataSource(dataSource);

  renderCurrentCards();
  renderHorizontalOverrideCards();
}

main().catch(console.error);
