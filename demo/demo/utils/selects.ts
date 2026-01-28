// ============================================================================
// SELECT ELEMENTS MANAGEMENT
// ============================================================================

import { updateDateOverride } from './browser';
import {
  DEFAULT_PROVIDER,
  DEPRECATED_PROVIDERS,
  HIDDEN_PROVIDERS,
} from './constants';
import {
  getAvailableConfigNames,
  getFilteredProviders,
  getVisibleProviders,
} from './data';
import { updateConfigEditorWithVisual } from './editor/updates';
import { setupSelectKeyboardNavigation } from './keyboard';
import { providerRegistry } from './registry';
import {
  setConfig,
  renderCurrentCards,
  updateCalendarsAndRender,
  getCurrentProvider,
  setCurrentProvider,
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
 * Apply selection: save to storage, update URL params, and set select value
 */
function applySelection(
  select: HTMLSelectElement,
  value: string,
  provider: string,
  storageKey: string,
  urlParam: string,
  urlValue: string | null,
): void {
  select.value = value;

  if (!urlValue) {
    saveToStorage(getProviderStorageKey(provider, storageKey), value);
  }

  updateURLParams({ [urlParam]: value });
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
 * Get providers to show in the select (visible + selected if hidden)
 */
function getProvidersToShow(
  selectedProvider: string | null | undefined,
  availableProviders: string[],
): string[] {
  const allProviders = providerRegistry.getAllProviderNames();
  const filteredProviders = getFilteredProviders(
    allProviders,
    availableProviders,
  );
  const visibleProviders = getVisibleProviders(
    filteredProviders,
    HIDDEN_PROVIDERS,
  );

  const providersToShow = new Set(visibleProviders);
  if (selectedProvider && allProviders.includes(selectedProvider)) {
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

  const providerInstance = providerRegistry.getProvider(provider);
  const urlConfig = getFromURL('config');
  const savedConfig = getProviderValue(provider, 'selected-config', 'config');
  const defaultConfig = providerInstance?.getDefaultConfig() || '';

  const selectedConfig =
    urlConfig && configKeys.includes(urlConfig)
      ? urlConfig
      : savedConfig && configKeys.includes(savedConfig)
        ? savedConfig
        : defaultConfig && configKeys.includes(defaultConfig)
          ? defaultConfig
          : '';

  if (selectedConfig && (await setConfig(selectedConfig, provider))) {
    applySelection(
      configSelect,
      selectedConfig,
      provider,
      'selected-config',
      'config',
      urlConfig,
    );
    updateConfigEditorWithVisual();
  }
}

/**
 * Update data source select with available data sources and select appropriate one
 */
export async function updateDataSourceSelect(provider: string): Promise<void> {
  const dataSourceSelect = getSelectElement('data-source-select');
  if (!dataSourceSelect) return;

  const providerInstance = providerRegistry.getProvider(provider);
  if (!providerInstance) return;

  const dataSources = providerInstance.getDataSources();
  populateSelect(dataSourceSelect, dataSources);

  const urlDataSource = getFromURL('dataSource');
  const savedDataSource = getProviderValue(
    provider,
    'selected-data-source',
    'dataSource',
  );
  const defaultDataSource = providerInstance.getDefaultDataSource() || '';

  const selectedDataSource =
    urlDataSource && dataSources.includes(urlDataSource)
      ? urlDataSource
      : savedDataSource && dataSources.includes(savedDataSource)
        ? savedDataSource
        : defaultDataSource && dataSources.includes(defaultDataSource)
          ? defaultDataSource
          : '';

  if (selectedDataSource) {
    applySelection(
      dataSourceSelect,
      selectedDataSource,
      provider,
      'selected-data-source',
      'dataSource',
      urlDataSource,
    );
    await updateCalendarsAndRender(selectedDataSource, provider);
  }
}

export async function updateSelectsForProvider(selectedProvider?: string) {
  const provider = selectedProvider || getCurrentProvider();
  await updateConfigSelect(provider);
  await updateDataSourceSelect(provider);
}

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
  configSelect.value = configName;
  await selectConfig(configName);
  renderCurrentCards();
  updateConfigEditorWithVisual();
}

export async function selectConfig(configName: string): Promise<void> {
  const provider = getCurrentProvider();
  const result = await setConfig(configName, provider);
  if (!result) return;
  saveToStorage(getProviderStorageKey(provider, 'selected-config'), configName);
  updateURLParams({ config: configName });
}

export function setupDataSourceSelector(selectorIds: string[]) {
  setupSelectListener('data-source-select', selectDataSource);
  setupSelectKeyboardNavigation(selectorIds, 'data-source-select');
}

/**
 * Select and apply a data source
 */
export async function selectDataSource(dataSource: string): Promise<void> {
  const provider = getCurrentProvider();
  const dataSourceSelect = getSelectElement('data-source-select');

  if (dataSourceSelect) {
    dataSourceSelect.value = dataSource;
  }

  await updateCalendarsAndRender(dataSource, provider);

  saveToStorage(
    getProviderStorageKey(provider, 'selected-data-source'),
    dataSource,
  );
  updateURLParams({ dataSource });
}

/**
 * Get initial provider value from URL or storage
 */
export function getInitialProviderValue(): string | null {
  const allProviders = providerRegistry.getAllProviderNames();
  if (allProviders.length === 0) return null;

  const visibleProviders = getVisibleProviders(allProviders, HIDDEN_PROVIDERS);
  const defaultProvider = allProviders.includes(DEFAULT_PROVIDER)
    ? DEFAULT_PROVIDER
    : visibleProviders[0] || allProviders[0];

  const urlProvider = getFromURL('provider');
  return (
    urlProvider || getValue('selected-provider', 'provider', defaultProvider)
  );
}

/**
 * Handle provider change event
 */
export async function selectorSelectProvider(
  selectedProvider: string,
  availableProviders: string[],
): Promise<void> {
  const providerSelect = getSelectElement('provider-select');
  if (!providerSelect) return;

  const allProviders = providerRegistry.getAllProviderNames();
  if (allProviders.length === 0) return;

  if (!allProviders.includes(selectedProvider)) return;

  selectProvider(selectedProvider);

  populateProviderSelect(selectedProvider, availableProviders); // Need this to hide unselected hidden providers
  await updateSelectsForProvider(selectedProvider);
}

export function selectProvider(selectedProvider: string): void {
  setCurrentProvider(selectedProvider);
  saveToStorage('selected-provider', selectedProvider);

  updateURLParams({
    provider: selectedProvider,
    config: null,
    dataSource: null,
  });

  const providerInstance = providerRegistry.getProvider(selectedProvider);
  updateDateOverride(providerInstance?.getMockDate());
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
    await selectorSelectProvider(selectedProvider, availableProviders);
  });

  setupSelectKeyboardNavigation(selectorIds, 'provider-select');
}
