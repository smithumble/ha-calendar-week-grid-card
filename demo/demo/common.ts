// ============================================================================
// PROVIDER INITIALIZATION
// ============================================================================

import { updateDateOverride } from './utils/browser';
import { DEFAULT_PROVIDER, HIDDEN_PROVIDERS } from './utils/constants';
import { getVisibleProviders } from './utils/data';
import { providerRegistry } from './utils/registry';
import { getCurrentProvider, setCurrentProvider } from './utils/state';
import {
  getValue,
  getFromURL,
  saveToStorage,
  updateURLParams,
} from './utils/storage';

/**
 * Get filtered list of providers based on available providers
 */
function getFilteredProviders(availableProviders?: string[]): string[] {
  const allProviders = providerRegistry.getAllProviderNames();
  return availableProviders
    ? allProviders.filter((p) => availableProviders.includes(p))
    : allProviders;
}

/**
 * Determine the default provider from available providers
 */
function determineDefaultProvider(
  allProviders: string[],
  visibleProviders: string[],
): string {
  return allProviders.includes(DEFAULT_PROVIDER)
    ? DEFAULT_PROVIDER
    : visibleProviders[0] || allProviders[0];
}

/**
 * Get the selected provider from URL or storage, falling back to default
 */
function getSelectedProvider(defaultProvider: string): string {
  const urlProvider = getFromURL('provider');
  return (
    urlProvider || getValue('selected-provider', 'provider', defaultProvider)
  );
}

/**
 * Apply provider selection: set state, update storage/URL, and update date override
 */
function applyProviderSelection(
  selectedProvider: string,
  urlProvider: string | null,
): void {
  setCurrentProvider(selectedProvider);

  if (urlProvider) {
    saveToStorage('selected-provider', urlProvider);
  }

  updateURLParams({ provider: selectedProvider });

  const providerInstance = providerRegistry.getProvider(selectedProvider);
  updateDateOverride(providerInstance?.getMockDate());
}

/**
 * Initialize provider data and return the selected provider name
 */
export function initializeProviderData(availableProviders?: string[]): string {
  const allProviders = getFilteredProviders(availableProviders);
  const visibleProviders = getVisibleProviders(allProviders, HIDDEN_PROVIDERS);
  const defaultProvider = determineDefaultProvider(
    allProviders,
    visibleProviders,
  );
  const urlProvider = getFromURL('provider');
  const selectedProvider = getSelectedProvider(defaultProvider);

  if (selectedProvider && allProviders.includes(selectedProvider)) {
    applyProviderSelection(selectedProvider, urlProvider);
  }

  return getCurrentProvider();
}
