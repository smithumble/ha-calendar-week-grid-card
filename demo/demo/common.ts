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

// ============================================================================
// PROVIDER INITIALIZATION
// ============================================================================

export function initializeProviderData(availableProviders?: string[]): string {
  // Get all providers from registry
  let allProviders = providerRegistry.getAllProviderNames();

  // Filter providers based on availableProviders if provided
  if (availableProviders) {
    allProviders = allProviders.filter((p) => availableProviders.includes(p));
  }

  const visibleProviders = getVisibleProviders(allProviders, HIDDEN_PROVIDERS);
  const defaultProvider = allProviders.includes(DEFAULT_PROVIDER)
    ? DEFAULT_PROVIDER
    : visibleProviders[0] || allProviders[0];

  // Check URL param first (highest priority)
  const urlProvider = getFromURL('provider');
  const selectedProvider =
    urlProvider || getValue('selected-provider', 'provider', defaultProvider);

  if (selectedProvider && allProviders.includes(selectedProvider)) {
    setCurrentProvider(selectedProvider);
    if (urlProvider) {
      saveToStorage('selected-provider', urlProvider);
    }
    updateURLParams({ provider: selectedProvider });
    // Update date override based on initial provider
    const providerInstance = providerRegistry.getProvider(selectedProvider);
    updateDateOverride(providerInstance?.getMockDate());
  }

  return getCurrentProvider();
}
