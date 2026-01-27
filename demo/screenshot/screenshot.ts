import { selectConfig, selectDataSource } from 'demo/utils/selects';
import { initializeProviderData } from '../demo/common';
import { setupBrowserEnv } from '../demo/utils/browser';
import { loadIcons } from '../demo/utils/icons';
import { providerRegistry } from '../demo/utils/registry';
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

  const currentProvider = initializeProviderData();
  const currentProviderInstance = providerRegistry.getProvider(currentProvider);

  const defaultConfig = currentProviderInstance?.getDefaultConfig();
  const defaultDataSource = currentProviderInstance?.getDefaultDataSource();

  const config = getFromURL('config') || defaultConfig || '';
  const dataSource = getFromURL('dataSource') || defaultDataSource || '';

  await selectConfig(config);
  await selectDataSource(dataSource);
}

main().catch(console.error);
