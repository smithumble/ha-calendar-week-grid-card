// ============================================================================
// SELECT ELEMENTS MANAGEMENT
// ============================================================================

import { updateDateOverride } from './browser';
import {
  DEFAULT_PROVIDER,
  DEPRECATED_PROVIDERS,
  HIDDEN_PROVIDERS,
} from './constants';
import { getAvailableConfigNames, getVisibleProviders } from './data';
import { updateConfigEditorWithVisual } from './editor';
import { setupSelectKeyboardNavigation } from './keyboard';
import { providerRegistry } from './registry';
import {
  selectConfig,
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

export function formatSelectorLabel(label: string): string {
  return label
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

export function setupSelectListener(
  selectId: string,
  handler: (value: string) => void,
): void {
  const select = document.getElementById(selectId) as HTMLSelectElement;
  if (!select || select.hasAttribute('data-listener-attached')) return;

  select.setAttribute('data-listener-attached', 'true');
  select.addEventListener('change', (e) => {
    const target = e.target as HTMLSelectElement;
    handler(target.value);
  });
}

function populateProviderSelect(selectedProvider?: string | null) {
  const providerSelect = document.getElementById(
    'provider-select',
  ) as HTMLSelectElement;
  if (!providerSelect) return;

  const allProviders = providerRegistry.getAllProviderNames();
  const visibleProviders = getVisibleProviders(allProviders, HIDDEN_PROVIDERS);

  // Include selected provider even if it's hidden
  const providersToShow = new Set(visibleProviders);
  if (selectedProvider && allProviders.includes(selectedProvider)) {
    providersToShow.add(selectedProvider);
  }

  const sortedProviders = Array.from(providersToShow).sort();

  providerSelect.innerHTML = sortedProviders
    .map((p) => {
      const label = formatSelectorLabel(p);
      const deprecated = DEPRECATED_PROVIDERS.includes(p)
        ? ' (Deprecated)'
        : '';
      return `<option value="${p}">${label}${deprecated}</option>`;
    })
    .join('');

  // Always set the value to selectedProvider if provided and valid
  if (selectedProvider && sortedProviders.includes(selectedProvider)) {
    providerSelect.value = selectedProvider;
  } else if (sortedProviders.length > 0 && !providerSelect.value) {
    // Fallback to first provider if no valid selection
    providerSelect.value = sortedProviders[0];
  }
}

export async function updateConfigSelect(provider: string) {
  const configSelect = document.getElementById(
    'config-select',
  ) as HTMLSelectElement;
  if (!configSelect) return;

  // Get available config names without loading the files
  const configKeys = getAvailableConfigNames(provider);

  configSelect.innerHTML = configKeys
    .map(
      (name) => `<option value="${name}">${formatSelectorLabel(name)}</option>`,
    )
    .join('');

  const providerInstance = providerRegistry.getProvider(provider);
  const savedConfig = getProviderValue(provider, 'selected-config', 'config');
  const selectedConfig =
    savedConfig && configKeys.includes(savedConfig)
      ? savedConfig
      : providerInstance?.getDefaultConfig() || '';

  if (selectedConfig && (await selectConfig(selectedConfig, provider))) {
    configSelect.value = selectedConfig;
    if (!savedConfig) {
      saveToStorage(
        getProviderStorageKey(provider, 'selected-config'),
        selectedConfig,
      );
    }
    updateURLParams({ config: selectedConfig });
    updateConfigEditorWithVisual();
  }
}

export async function updateDataSourceSelect(provider: string) {
  const dataSourceSelect = document.getElementById(
    'data-source-select',
  ) as HTMLSelectElement;
  if (!dataSourceSelect) return;

  const providerInstance = providerRegistry.getProvider(provider);
  if (!providerInstance) return;

  const dataSources = providerInstance.getDataSources();
  dataSourceSelect.innerHTML = dataSources
    .map((ds) => `<option value="${ds}">${formatSelectorLabel(ds)}</option>`)
    .join('');

  const savedDataSource = getProviderValue(
    provider,
    'selected-data-source',
    'dataSource',
  );
  const selectedDataSource =
    savedDataSource && dataSources.includes(savedDataSource)
      ? savedDataSource
      : providerInstance.getDefaultDataSource() || '';

  if (selectedDataSource) {
    dataSourceSelect.value = selectedDataSource;
    if (!savedDataSource) {
      saveToStorage(
        getProviderStorageKey(provider, 'selected-data-source'),
        selectedDataSource,
      );
    }
    updateURLParams({ dataSource: selectedDataSource });
    await updateCalendarsAndRender(selectedDataSource, provider);
  }
}

export async function updateSelectsForProvider(provider: string) {
  await updateConfigSelect(provider);
  await updateDataSourceSelect(provider);
}

export function setupConfigSelectListener() {
  setupSelectListener('config-select', async (selectedName) => {
    const provider = getCurrentProvider();
    if (await selectConfig(selectedName, provider)) {
      renderCurrentCards();
      updateConfigEditorWithVisual();
      saveToStorage(
        getProviderStorageKey(provider, 'selected-config'),
        selectedName,
      );
      updateURLParams({ config: selectedName });
    }
  });
  setupSelectKeyboardNavigation('config-select');
}

export function setupDataSourceSelectListener() {
  setupSelectListener('data-source-select', async (selectedDataSource) => {
    const provider = getCurrentProvider();
    saveToStorage(
      getProviderStorageKey(provider, 'selected-data-source'),
      selectedDataSource,
    );
    updateURLParams({ dataSource: selectedDataSource });
    await updateCalendarsAndRender(selectedDataSource, provider);
  });
  setupSelectKeyboardNavigation('data-source-select');
}

export function setupProviderSelector() {
  const providerSelect = document.getElementById(
    'provider-select',
  ) as HTMLSelectElement;
  if (!providerSelect) return;

  const allProviders = providerRegistry.getAllProviderNames();
  if (allProviders.length === 0) return;

  const visibleProviders = getVisibleProviders(allProviders, HIDDEN_PROVIDERS);
  const defaultProvider = allProviders.includes(DEFAULT_PROVIDER)
    ? DEFAULT_PROVIDER
    : visibleProviders[0] || allProviders[0];

  // Check URL param first (highest priority)
  const urlProvider = getFromURL('provider');
  const currentProviderValue =
    urlProvider || getValue('selected-provider', 'provider', defaultProvider);

  // Populate select with visible providers + selected provider (if hidden)
  populateProviderSelect(currentProviderValue);

  // Allow provider from URL/storage even if it's hidden from dropdown
  if (currentProviderValue && allProviders.includes(currentProviderValue)) {
    // populateProviderSelect already sets the value, but ensure it's set
    if (providerSelect.value !== currentProviderValue) {
      providerSelect.value = currentProviderValue;
    }
    setCurrentProvider(currentProviderValue);
    if (urlProvider) {
      saveToStorage('selected-provider', urlProvider);
    }
    updateURLParams({ provider: currentProviderValue });
    // Update date override based on initial provider
    const providerInstance = providerRegistry.getProvider(currentProviderValue);
    updateDateOverride(providerInstance?.getMockDate());
  }

  setupSelectListener('provider-select', async (selectedProvider) => {
    if (allProviders.includes(selectedProvider)) {
      const previousProvider = getCurrentProvider();
      setCurrentProvider(selectedProvider);
      saveToStorage('selected-provider', selectedProvider);

      // Clear config and dataSource URL params when provider changes
      // They will be set again by updateSelectsForProvider if needed
      updateURLParams({
        provider: selectedProvider,
        config: null,
        dataSource: null,
      });

      // Update date override based on provider
      const providerInstance = providerRegistry.getProvider(selectedProvider);
      updateDateOverride(providerInstance?.getMockDate());

      // Only repopulate if we're switching away from a hidden provider
      // (to remove it from the dropdown) or if we're switching to a hidden provider
      const wasHidden =
        previousProvider && !visibleProviders.includes(previousProvider);
      const isHidden = !visibleProviders.includes(selectedProvider);

      if (wasHidden || isHidden) {
        // Repopulate to add/remove hidden providers as needed
        populateProviderSelect(selectedProvider);
      }

      // Update config and data source selects for the new provider
      await updateSelectsForProvider(selectedProvider);
    }
  });
  setupSelectKeyboardNavigation('provider-select');
}
