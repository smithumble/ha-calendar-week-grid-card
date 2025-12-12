import { MockCalendar } from '../providers';

export {};

interface ProviderData {
  calendars: Record<string, any[]>;
  configs: Array<{ name: string; config: any }>;
  dataSources: string[];
}

declare global {
  interface Window {
    PROVIDER_DATA_MAP?: Record<string, ProviderData>;
    CONFIG?: any;
    CALENDARS: any[];
    PROVIDER?: string;
    setupBrowserEnv?: () => void;
    renderCards?: (config: any, calendars: MockCalendar[]) => void;
  }
}

function getAllProviders(): string[] {
  return Object.keys(window.PROVIDER_DATA_MAP || {});
}

const STORAGE_PREFIX = 'calendar-week-grid-card-';

function saveToStorage(key: string, value: string): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, value);
  } catch (e) {
    console.warn(`Failed to save ${key} to localStorage:`, e);
  }
}

function loadFromStorage(key: string): string | null {
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${key}`);
  } catch (e) {
    console.warn(`Failed to load ${key} from localStorage:`, e);
    return null;
  }
}

function getFromURL(paramName: string): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get(paramName);
}

function getValue(
  storageKey: string,
  urlParam: string,
  windowProperty?: string,
  defaultValue?: string,
): string {
  return (
    getFromURL(urlParam) ||
    loadFromStorage(storageKey) ||
    windowProperty ||
    defaultValue ||
    ''
  );
}

function getProviderData(provider: string): ProviderData | null {
  return window.PROVIDER_DATA_MAP?.[provider] || null;
}

function getConfigsMap(provider: string): Record<string, any> {
  const providerData = getProviderData(provider);
  if (!providerData) return {};

  return providerData.configs.reduce(
    (acc, c) => {
      acc[c.name] = c.config;
      return acc;
    },
    {} as Record<string, any>,
  );
}

function formatSelectorLabel(label: string): string {
  return label
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

function updateCalendars(dataSource: string, provider: string) {
  const providerData = getProviderData(provider);
  if (providerData?.calendars[dataSource]) {
    window.CALENDARS = providerData.calendars[dataSource];
  }
}

function updateCalendarsAndRender(
  dataSource: string,
  provider: string,
  shouldRender = true,
) {
  updateCalendars(dataSource, provider);
  if (shouldRender && window.CONFIG && window.CALENDARS) {
    window.renderCards?.(window.CONFIG, window.CALENDARS);
  }
}

function selectConfig(configName: string, provider: string): boolean {
  const configs = getConfigsMap(provider);
  const config = configs[configName];
  if (config) {
    window.CONFIG = config;
    return true;
  }
  return false;
}

function updateConfigSelect(provider: string) {
  const configSelect = document.getElementById(
    'config-select',
  ) as HTMLSelectElement;
  if (!configSelect) return;

  const configs = getConfigsMap(provider);
  const configKeys = Object.keys(configs);

  configSelect.innerHTML = configKeys
    .map(
      (name) => `<option value="${name}">${formatSelectorLabel(name)}</option>`,
    )
    .join('');

  const savedConfig = getValue('selected-config', 'config');
  const selectedConfig =
    savedConfig && configKeys.includes(savedConfig)
      ? savedConfig
      : configKeys[0] || '';

  if (selectedConfig && selectConfig(selectedConfig, provider)) {
    configSelect.value = selectedConfig;
    if (!savedConfig) {
      saveToStorage('selected-config', selectedConfig);
    }
  }
}

function updateDataSourceSelect(provider: string, shouldRender = false) {
  const dataSourceSelect = document.getElementById(
    'data-source-select',
  ) as HTMLSelectElement;
  if (!dataSourceSelect) return;

  const providerData = getProviderData(provider);
  if (!providerData) return;

  dataSourceSelect.innerHTML = providerData.dataSources
    .map((ds) => `<option value="${ds}">${formatSelectorLabel(ds)}</option>`)
    .join('');

  const savedDataSource = getValue('selected-data-source', 'dataSource');
  const selectedDataSource =
    savedDataSource && providerData.dataSources.includes(savedDataSource)
      ? savedDataSource
      : providerData.dataSources[0] || '';

  if (selectedDataSource) {
    dataSourceSelect.value = selectedDataSource;
    if (!savedDataSource) {
      saveToStorage('selected-data-source', selectedDataSource);
    }
    updateCalendarsAndRender(selectedDataSource, provider, shouldRender);
  }
}

function setupSelectListener(
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

function setupConfigSelectListener() {
  setupSelectListener('config-select', (selectedName) => {
    const currentProvider = window.PROVIDER;
    if (!currentProvider) return;

    if (selectConfig(selectedName, currentProvider)) {
      window.renderCards?.(window.CONFIG, window.CALENDARS);
      saveToStorage('selected-config', selectedName);
    }
  });
}

function setupDataSourceSelectListener() {
  setupSelectListener('data-source-select', (selectedDataSource) => {
    saveToStorage('selected-data-source', selectedDataSource);
    const currentProvider = window.PROVIDER;
    if (currentProvider) {
      updateCalendarsAndRender(selectedDataSource, currentProvider);
    }
  });
}

function updateSelectsForProvider(provider: string, shouldRender = false) {
  updateConfigSelect(provider);
  updateDataSourceSelect(provider, shouldRender);
  setupConfigSelectListener();
  setupDataSourceSelectListener();
}

function populateProviderSelect() {
  const providerSelect = document.getElementById(
    'provider-select',
  ) as HTMLSelectElement;
  if (!providerSelect) return;

  const allProviders = getAllProviders();
  providerSelect.innerHTML = allProviders
    .map((p) => `<option value="${p}">${formatSelectorLabel(p)}</option>`)
    .join('');
}

function setupProviderSelector() {
  const providerSelect = document.getElementById(
    'provider-select',
  ) as HTMLSelectElement;
  if (!providerSelect) return;

  const allProviders = getAllProviders();
  if (allProviders.length === 0) return;

  populateProviderSelect();

  const currentProvider = getValue(
    'selected-provider',
    'provider',
    window.PROVIDER,
    allProviders[0],
  );

  if (currentProvider && allProviders.includes(currentProvider)) {
    providerSelect.value = currentProvider;
    window.PROVIDER = currentProvider;
    updateSelectsForProvider(currentProvider, false);
  }

  const urlProvider = getFromURL('provider');
  if (urlProvider) {
    saveToStorage('selected-provider', urlProvider);
  }

  setupSelectListener('provider-select', (selectedProvider) => {
    if (allProviders.includes(selectedProvider)) {
      window.PROVIDER = selectedProvider;
      saveToStorage('selected-provider', selectedProvider);
      updateSelectsForProvider(selectedProvider, true);
    }
  });
}

function areProviderDataReady(): boolean {
  return (
    !!window.PROVIDER_DATA_MAP &&
    Object.keys(window.PROVIDER_DATA_MAP).length > 0
  );
}

function waitForProviderData() {
  if (areProviderDataReady()) {
    setupProviderSelector();
  } else {
    setTimeout(waitForProviderData, 50);
  }
}

waitForProviderData();

async function waitForScript(scriptElement: HTMLScriptElement): Promise<void> {
  return new Promise((resolve) => {
    const script = scriptElement as any;
    if (script.complete || script.readyState === 'complete') {
      resolve();
      return;
    }
    scriptElement.onload = () => resolve();
    scriptElement.onerror = () => resolve();
  });
}

async function waitForCustomElement(maxAttempts = 100): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    if (customElements.get('calendar-week-grid-card')) return true;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return false;
}

async function waitForProviderDataAsync(): Promise<void> {
  while (!areProviderDataReady()) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

function initializeCards() {
  const allProviders = getAllProviders();
  const currentProvider = window.PROVIDER || allProviders[0];
  if (!currentProvider) return;

  const providerData = getProviderData(currentProvider);
  if (!providerData) return;

  // Set up data source and calendars
  const savedDataSource = getValue('selected-data-source', 'dataSource');
  const initialDataSource =
    savedDataSource && providerData.dataSources.includes(savedDataSource)
      ? savedDataSource
      : providerData.dataSources[0] || '';

  if (initialDataSource) {
    updateCalendars(initialDataSource, currentProvider);
  }

  window.renderCards?.(window.CONFIG, window.CALENDARS);
}

(async () => {
  window.setupBrowserEnv?.();

  const cardScript = document.getElementById(
    'card-script',
  ) as HTMLScriptElement | null;
  if (cardScript) {
    await waitForScript(cardScript);
  }

  if (await waitForCustomElement()) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    await waitForProviderDataAsync();
    initializeCards();
  }
})();
