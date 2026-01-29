// ============================================================================
// STORAGE AND URL UTILITIES
// ============================================================================

let STORAGE_PREFIX = 'calendar-week-grid-card-';

export function setStoragePrefix(prefix: string) {
  STORAGE_PREFIX = `calendar-week-grid-card-${prefix}-`;
}

export function saveToStorage(key: string, value: string): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, value);
  } catch (e) {
    console.warn(`Failed to save ${key} to localStorage:`, e);
  }
}

export function loadFromStorage(key: string): string | null {
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${key}`);
  } catch (e) {
    console.warn(`Failed to load ${key} from localStorage:`, e);
    return null;
  }
}

export function getProviderStorageKey(provider: string, key: string): string {
  return `${key}-${provider}`;
}

export function getFromURL(paramName: string): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get(paramName);
}

export function updateURLParams(params: Record<string, string | null>): void {
  const url = new URL(window.location.href);
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === '') {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, value);
    }
  });
  window.history.replaceState({}, '', url.toString());
}

export function getValue(
  storageKey: string,
  urlParam: string,
  defaultValue?: string,
): string {
  const urlValue = getFromURL(urlParam);
  if (urlValue) {
    saveToStorage(storageKey, urlValue);
    return urlValue;
  }
  const storageValue = loadFromStorage(storageKey);
  if (storageValue) {
    return storageValue;
  }
  return defaultValue || '';
}

export function getProviderValue(
  provider: string,
  storageKey: string,
  urlParam: string,
  defaultValue?: string,
): string {
  const urlValue = getFromURL(urlParam);
  if (urlValue) {
    saveToStorage(getProviderStorageKey(provider, storageKey), urlValue);
    return urlValue;
  }
  const providerStorageKey = getProviderStorageKey(provider, storageKey);
  const storageValue = loadFromStorage(providerStorageKey);
  if (storageValue) {
    return storageValue;
  }
  return defaultValue || '';
}
