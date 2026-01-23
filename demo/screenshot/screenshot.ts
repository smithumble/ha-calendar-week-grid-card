import { initializeProviderData } from '../demo/common';
import { setupBrowserEnv } from '../demo/utils/browser';
import { loadIcons } from '../demo/utils/icons';
import { providerRegistry } from '../demo/utils/registry';
import {
  selectConfig,
  updateCalendarsAndRender,
  setCurrentProvider,
} from '../demo/utils/state';
import {
  setStoragePrefix,
  getProviderValue,
  getProviderStorageKey,
  saveToStorage,
  updateURLParams,
  getFromURL,
} from '../demo/utils/storage';
import { loadTheme } from '../demo/utils/theme';

async function main() {
  // Set storage prefix for screenshot page
  setStoragePrefix('screenshot');

  // Load theme and icons
  const haTheme = await loadTheme();
  const haIcons = await loadIcons();

  // Setup browser environment
  setupBrowserEnv(haTheme, haIcons);

  // Get parameters from URL or use defaults
  const urlProvider = getFromURL('provider');
  const urlConfig = getFromURL('config');
  const urlDataSource = getFromURL('dataSource');

  // Initialize provider data
  const allProviders = providerRegistry.getAllProviderNames();
  const currentProvider = initializeProviderData(
    urlProvider ? [urlProvider] : allProviders,
  );
  setCurrentProvider(currentProvider);

  if (!currentProvider) {
    console.error('Failed to initialize provider');
    return;
  }

  // Setup data source without using selects
  const providerInstance = providerRegistry.getProvider(currentProvider);
  if (!providerInstance) {
    console.error(`Provider ${currentProvider} not found`);
    return;
  }

  // Select config from URL or use default
  const configName = urlConfig || 'google_calendar_separated';
  await selectConfig(configName, currentProvider);

  const dataSources = providerInstance.getDataSources();
  const selectedDataSource =
    urlDataSource ||
    getProviderValue(currentProvider, 'selected-data-source', 'dataSource') ||
    providerInstance.getDefaultDataSource() ||
    '';

  if (selectedDataSource && dataSources.includes(selectedDataSource)) {
    if (!urlDataSource) {
      saveToStorage(
        getProviderStorageKey(currentProvider, 'selected-data-source'),
        selectedDataSource,
      );
    }
    updateURLParams({ dataSource: selectedDataSource });
    await updateCalendarsAndRender(selectedDataSource, currentProvider);
  }
}

main().catch(console.error);
