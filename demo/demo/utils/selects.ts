// ============================================================================
// SELECT ELEMENTS MANAGEMENT
// ============================================================================

import { updateDateOverride } from './browser';
import { DEFAULT_PROVIDER, DEPRECATED_PROVIDERS } from './constants';
import {
  getAllProviderNames,
  getAvailableConfigNames,
  getFilteredProviders,
  getProviderDefaultConfig,
  getProviderDefaultDataSource,
  getProviderDataSources,
  getProviderMockDate,
} from './data';
import { updateConfigEditorWithVisual } from './editor/updates';
import { setupSelectKeyboardNavigation } from './keyboard';
import {
  setConfig,
  renderCurrentCards,
  getCurrentProvider,
  setCurrentProvider,
  updateCalendars,
} from './state';
import {
  getValue,
  getProviderValue,
  saveToStorage,
  getProviderStorageKey,
  updateURLParams,
  getFromURL,
} from './storage';

/**
 * Format a label for display in selectors (e.g., "google_calendar" -> "Google Calendar")
 */
export function formatSelectorLabel(label: string): string {
  return label
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

/**
 * Get a select element by ID
 */
function getSelectElement(selectId: string): HTMLSelectElement | null {
  return document.getElementById(selectId) as HTMLSelectElement | null;
}

/**
 * Setup change listener for a select element (prevents duplicate listeners)
 */
export function setupSelectListener(
  selectId: string,
  handler: (value: string) => void,
): void {
  const select = getSelectElement(selectId);
  if (!select || select.hasAttribute('data-listener-attached')) return;

  select.setAttribute('data-listener-attached', 'true');
  select.addEventListener('change', (e) => {
    const target = e.target as HTMLSelectElement;
    handler(target.value);
  });
}

/**
 * Populate a select element with options
 */
function populateSelect(
  select: HTMLSelectElement,
  options: string[],
  formatLabel: (value: string) => string = formatSelectorLabel,
): void {
  select.innerHTML = options
    .map((value) => `<option value="${value}">${formatLabel(value)}</option>`)
    .join('');
}

/**
 * Format provider label with deprecated indicator
 */
function formatProviderLabel(provider: string): string {
  const label = formatSelectorLabel(provider);
  const deprecated = DEPRECATED_PROVIDERS.includes(provider)
    ? ' (Deprecated)'
    : '';
  return `${label}${deprecated}`;
}

/**
 * Get allowed providers based on available providers
 */
function getAllowedProviders(availableProviders?: string[]): string[] {
  return getFilteredProviders(getAllProviderNames(), availableProviders);
}

/**
 * Get providers to show in the select
 */
function getProvidersToShow(
  selectedProvider: string | null | undefined,
  availableProviders: string[],
): string[] {
  const allowedProviders = getAllowedProviders(availableProviders);

  const providersToShow = new Set(allowedProviders);
  if (selectedProvider && allowedProviders.includes(selectedProvider)) {
    providersToShow.add(selectedProvider);
  }

  return Array.from(providersToShow).sort();
}

/**
 * Populate provider select with available providers
 */
function populateProviderSelect(
  selectedProvider: string,
  availableProviders: string[],
): void {
  const providerSelect = getSelectElement('provider-select');
  if (!providerSelect) return;

  const providersToShow = getProvidersToShow(
    selectedProvider,
    availableProviders,
  );
  populateSelect(providerSelect, providersToShow, formatProviderLabel);

  if (selectedProvider && providersToShow.includes(selectedProvider)) {
    providerSelect.value = selectedProvider;
  } else if (providersToShow.length > 0 && !providerSelect.value) {
    providerSelect.value = providersToShow[0];
  }
}

/**
 * Update config select with available configs and select appropriate one
 */
export async function updateConfigSelect(provider: string): Promise<void> {
  const configSelect = getSelectElement('config-select');
  if (!configSelect) return;

  const configKeys = getAvailableConfigNames(provider);
  populateSelect(configSelect, configKeys);

  const urlConfig = getFromURL('config');
  const savedConfig = getProviderValue(provider, 'selected-config', 'config');
  const defaultConfig = getProviderDefaultConfig(provider);

  const selectedConfig =
    urlConfig && configKeys.includes(urlConfig)
      ? urlConfig
      : savedConfig && configKeys.includes(savedConfig)
        ? savedConfig
        : defaultConfig && configKeys.includes(defaultConfig)
          ? defaultConfig
          : '';

  await selectorSelectConfig(selectedConfig);
}

/**
 * Update data source select with available data sources and select appropriate one
 */
export async function updateDataSourceSelect(provider: string): Promise<void> {
  const dataSourceSelect = getSelectElement('data-source-select');
  if (!dataSourceSelect) return;

  const dataSources = getProviderDataSources(provider);
  if (dataSources.length === 0) return;

  populateSelect(dataSourceSelect, dataSources);

  const urlDataSource = getFromURL('dataSource');
  const savedDataSource = getProviderValue(
    provider,
    'selected-data-source',
    'dataSource',
  );
  const defaultDataSource = getProviderDefaultDataSource(provider);

  const selectedDataSource =
    urlDataSource && dataSources.includes(urlDataSource)
      ? urlDataSource
      : savedDataSource && dataSources.includes(savedDataSource)
        ? savedDataSource
        : defaultDataSource && dataSources.includes(defaultDataSource)
          ? defaultDataSource
          : '';

  await selectorSelectDataSource(selectedDataSource);
}

/**
 * Update config and data source selects for a provider
 */
export async function updateSelectsForProvider(selectedProvider?: string) {
  const provider = selectedProvider || getCurrentProvider();
  await updateConfigSelect(provider);
  await updateDataSourceSelect(provider);
}

/**
 * Setup config selector with initialization and change handler
 */
export function setupConfigSelector(selectorIds: string[]) {
  setupSelectListener('config-select', selectorSelectConfig);
  setupSelectKeyboardNavigation(selectorIds, 'config-select');
}

/**
 * Select and apply a config
 */
export async function selectorSelectConfig(configName: string): Promise<void> {
  const configSelect = getSelectElement('config-select');
  if (!configSelect) return;

  const cleanedConfigName = cleanConfigValue(configName);
  if (!cleanedConfigName) return;

  configSelect.value = cleanedConfigName;
  await selectConfig(cleanedConfigName);
  renderCurrentCards();
  updateConfigEditorWithVisual();
}

function cleanConfigValue(configName: string): string | undefined {
  const provider = getCurrentProvider();
  const configKeys = getAvailableConfigNames(provider);

  // Reset to default if invalid selection
  if (!configName || !configKeys.includes(configName)) {
    const defaultConfig = getProviderDefaultConfig(provider);
    if (defaultConfig && configKeys.includes(defaultConfig)) {
      configName = defaultConfig;
    } else if (configKeys.length > 0) {
      configName = configKeys[0];
    } else {
      return;
    }
  }

  return configName;
}

/**
 * Select a config and update the config
 */
export async function selectConfig(configName: string): Promise<void> {
  const provider = getCurrentProvider();
  await setConfig(configName, provider);
  saveToStorage(getProviderStorageKey(provider, 'selected-config'), configName);
  updateURLParams({ config: configName });
}

/**
 * Setup data source selector with initialization and change handler
 */
export function setupDataSourceSelector(selectorIds: string[]) {
  setupSelectListener('data-source-select', selectorSelectDataSource);
  setupSelectKeyboardNavigation(selectorIds, 'data-source-select');
}

/**
 * Select and apply a data source
 */
export async function selectorSelectDataSource(
  dataSource: string,
): Promise<void> {
  const dataSourceSelect = getSelectElement('data-source-select');
  if (!dataSourceSelect) return;

  const cleanedDataSource = cleanDataSourceValue(dataSource);
  if (!cleanedDataSource) return;

  dataSourceSelect.value = cleanedDataSource;
  await selectDataSource(cleanedDataSource);
  renderCurrentCards();
}

function cleanDataSourceValue(dataSource: string): string | undefined {
  const provider = getCurrentProvider();
  const dataSources = getProviderDataSources(provider);

  // Reset to default if invalid selection
  if (!dataSource || !dataSources.includes(dataSource)) {
    const defaultDataSource = getProviderDefaultDataSource(provider);
    if (defaultDataSource && dataSources.includes(defaultDataSource)) {
      dataSource = defaultDataSource;
    } else if (dataSources.length > 0) {
      dataSource = dataSources[0];
    } else {
      return;
    }
  }

  return dataSource;
}

/**
 * Select a data source and update the calendars
 */
export async function selectDataSource(dataSource: string): Promise<void> {
  const provider = getCurrentProvider();
  await updateCalendars(dataSource, provider);
  saveToStorage(
    getProviderStorageKey(provider, 'selected-data-source'),
    dataSource,
  );
  updateURLParams({ dataSource });
}

/**
 * Get initial provider value from URL or storage
 */
export function getInitialProviderValue(
  availableProviders?: string[],
): string | null {
  const urlProvider = getFromURL('provider');
  const savedProvider = getValue('selected-provider', 'provider');

  const cleanedUrlProvider = cleanProviderValue(
    urlProvider,
    availableProviders,
  );
  if (cleanedUrlProvider) return cleanedUrlProvider;

  // Validate saved provider, reset to default if invalid
  const cleanedSavedProvider = cleanProviderValue(
    savedProvider,
    availableProviders,
  );
  if (cleanedSavedProvider) return cleanedSavedProvider;

  return null;
}

function cleanProviderValue(
  selectedProvider: string | null,
  availableProviders?: string[],
): string | undefined {
  const allowedProviders = getAllowedProviders(availableProviders);
  if (allowedProviders.length === 0) return;

  // Reset to default if invalid selection
  if (!selectedProvider || !allowedProviders.includes(selectedProvider)) {
    const defaultProvider = allowedProviders.includes(DEFAULT_PROVIDER)
      ? DEFAULT_PROVIDER
      : allowedProviders[0];
    return defaultProvider;
  }

  return selectedProvider;
}

/**
 * Handle provider change event
 */
export async function selectorSelectProvider(
  selectedProvider: string,
  availableProviders: string[],
): Promise<void> {
  const cleanedProvider = cleanProviderValue(
    selectedProvider,
    availableProviders,
  );
  if (!cleanedProvider) return;

  selectProvider(cleanedProvider);

  populateProviderSelect(cleanedProvider, availableProviders);
  await updateSelectsForProvider(cleanedProvider);
}

export function selectProvider(provider: string): void {
  setCurrentProvider(provider);
  updateDateOverride(getProviderMockDate(provider));

  saveToStorage('selected-provider', provider);
  updateURLParams({ provider });
}

/**
 * Setup provider selector with initialization and change handler
 */
export async function setupProviderSelector(
  availableProviders: string[],
  selectorIds: string[],
): Promise<void> {
  const currentProviderValue = getInitialProviderValue() || '';
  await selectorSelectProvider(currentProviderValue, availableProviders);

  setupSelectListener('provider-select', async (selectedProvider) => {
    updateURLParams({
      config: null,
      dataSource: null,
    });
    await selectorSelectProvider(selectedProvider, availableProviders);
  });

  setupSelectKeyboardNavigation(selectorIds, 'provider-select');
}
