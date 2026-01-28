import {
  selectConfig,
  selectProvider,
  getInitialProviderValue,
  selectDataSource,
} from 'demo/utils/selects';
import { renderCurrentCards } from 'demo/utils/state';
import { setupBrowserEnv } from '../demo/utils/browser';
import {
  getProviderDefaultConfig,
  getProviderDefaultDataSource,
} from '../demo/utils/data';
import { loadIcons } from '../demo/utils/icons';
import { setStoragePrefix, getFromURL } from '../demo/utils/storage';
import { loadTheme } from '../demo/utils/theme';

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
  const defaultDataSource = getProviderDefaultDataSource(selectedProvider);

  const config = getFromURL('config') || defaultConfig || '';
  const dataSource = getFromURL('dataSource') || defaultDataSource || '';

  await selectConfig(config);
  await selectDataSource(dataSource);

  renderCurrentCards();
}

main().catch(console.error);
