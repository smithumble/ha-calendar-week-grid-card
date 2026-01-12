import yaml from 'js-yaml';
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
    ORIGINAL_CONFIG?: any;
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

// Hardcoded default values
const DEFAULT_PROVIDER = 'yasno';
const DEFAULT_CONFIG = 'example_8_2_google_calendar_separated';
const DEFAULT_DATA_SOURCE = 'yasno_1';

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
    window.ORIGINAL_CONFIG = JSON.parse(JSON.stringify(config)); // Deep copy
    updateConfigEditor();
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
  const defaultConfig = configKeys.includes(DEFAULT_CONFIG)
    ? DEFAULT_CONFIG
    : configKeys[0] || '';
  const selectedConfig =
    savedConfig && configKeys.includes(savedConfig)
      ? savedConfig
      : defaultConfig;

  if (selectedConfig && selectConfig(selectedConfig, provider)) {
    configSelect.value = selectedConfig;
    if (!savedConfig) {
      saveToStorage('selected-config', selectedConfig);
    }
    updateConfigEditor();
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
  const defaultDataSource = providerData.dataSources.includes(
    DEFAULT_DATA_SOURCE,
  )
    ? DEFAULT_DATA_SOURCE
    : providerData.dataSources[0] || '';
  const selectedDataSource =
    savedDataSource && providerData.dataSources.includes(savedDataSource)
      ? savedDataSource
      : defaultDataSource;

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

function isAnySelectorFocused(): boolean {
  const selectors = ['provider-select', 'config-select', 'data-source-select'];
  return selectors.some((id) => {
    const select = document.getElementById(id) as HTMLSelectElement;
    return select && document.activeElement === select;
  });
}

let globalKeyboardNavSetup = false;

function setupGlobalKeyboardNavigation(): void {
  if (globalKeyboardNavSetup) return;
  globalKeyboardNavSetup = true;

  document.addEventListener('keydown', (e) => {
    // Only handle arrow keys
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      return;
    }

    // If no selector is focused, focus config selector first
    if (!isAnySelectorFocused()) {
      // Don't auto-focus if user is typing in textarea or other input
      const activeElement = document.activeElement;
      if (
        activeElement &&
        (activeElement.tagName === 'TEXTAREA' ||
          activeElement.tagName === 'INPUT' ||
          (activeElement instanceof HTMLElement &&
            activeElement.isContentEditable))
      ) {
        return;
      }

      const configSelect = document.getElementById(
        'config-select',
      ) as HTMLSelectElement;
      if (configSelect) {
        e.preventDefault();
        configSelect.focus();
        // If it's an up/down arrow, also trigger the navigation
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          const options = Array.from(configSelect.options);
          const currentIndex = configSelect.selectedIndex;
          let newIndex: number;
          if (e.key === 'ArrowDown') {
            newIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
          } else {
            newIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
          }
          configSelect.selectedIndex = newIndex;
          configSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }
  });
}

function setupSelectKeyboardNavigation(selectId: string): void {
  const select = document.getElementById(selectId) as HTMLSelectElement;
  if (!select || select.hasAttribute('data-keyboard-nav-attached')) return;

  select.setAttribute('data-keyboard-nav-attached', 'true');
  select.addEventListener('keydown', (e) => {
    const selectorOrder = [
      'provider-select',
      'config-select',
      'data-source-select',
    ];
    const currentSelectorIndex = selectorOrder.indexOf(selectId);

    // Handle left/right arrows to switch between selectors
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      let targetIndex: number;
      if (e.key === 'ArrowRight') {
        targetIndex =
          currentSelectorIndex < selectorOrder.length - 1
            ? currentSelectorIndex + 1
            : 0;
      } else {
        targetIndex =
          currentSelectorIndex > 0
            ? currentSelectorIndex - 1
            : selectorOrder.length - 1;
      }

      const targetSelect = document.getElementById(
        selectorOrder[targetIndex],
      ) as HTMLSelectElement;
      if (targetSelect) {
        targetSelect.focus();
      }
      return;
    }

    // Handle up/down arrows to navigate within selector
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;

    e.preventDefault();

    const options = Array.from(select.options);
    const currentIndex = select.selectedIndex;

    let newIndex: number;
    if (e.key === 'ArrowDown') {
      newIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
    } else {
      newIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
    }

    select.selectedIndex = newIndex;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

function updateConfigEditor() {
  const textarea = document.getElementById(
    'config-editor-textarea',
  ) as HTMLTextAreaElement;
  if (!textarea || !window.CONFIG) return;

  try {
    const configYaml = yaml.dump(window.CONFIG, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false,
    });
    textarea.value = configYaml;
    hideConfigEditorError();
  } catch (e) {
    console.error('Failed to serialize config:', e);
  }
}

function showConfigEditorError(message: string) {
  const errorDiv = document.getElementById('config-editor-error');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.classList.add('visible');
  }
}

function hideConfigEditorError() {
  const errorDiv = document.getElementById('config-editor-error');
  if (errorDiv) {
    errorDiv.classList.remove('visible');
  }
}

function applyEditedConfig() {
  const textarea = document.getElementById(
    'config-editor-textarea',
  ) as HTMLTextAreaElement;
  if (!textarea) return;

  const configText = textarea.value.trim();
  if (!configText) {
    showConfigEditorError('Config cannot be empty');
    return;
  }

  try {
    const parsedConfig = yaml.load(configText);
    window.CONFIG = parsedConfig;
    window.renderCards?.(window.CONFIG, window.CALENDARS);
    hideConfigEditorError();
    return true;
  } catch (e) {
    showConfigEditorError(
      `Invalid YAML: ${e instanceof Error ? e.message : String(e)}`,
    );
    return false;
  }
}

function resetConfig() {
  if (window.ORIGINAL_CONFIG) {
    window.CONFIG = JSON.parse(JSON.stringify(window.ORIGINAL_CONFIG)); // Deep copy
    updateConfigEditor();
    window.renderCards?.(window.CONFIG, window.CALENDARS);
    hideConfigEditorError();
  }
}

function toggleConfigEditor() {
  const panel = document.getElementById('config-editor-panel');
  const toggleBtn = document.getElementById('config-editor-toggle-btn');
  const body = document.body;

  if (!panel || !toggleBtn) return;

  const isVisible = panel.classList.contains('visible');
  if (isVisible) {
    panel.classList.remove('visible');
    toggleBtn.textContent = 'Edit Config';
    body.classList.remove('with-editor');
  } else {
    panel.classList.add('visible');
    toggleBtn.textContent = 'Close Editor';
    body.classList.add('with-editor');
    updateConfigEditor();
  }
}

let configEditorSetup = false;

function setupConfigEditor() {
  if (configEditorSetup) return;
  configEditorSetup = true;

  const toggleBtn = document.getElementById('config-editor-toggle-btn');
  const closeBtn = document.getElementById('config-editor-close');
  const applyBtn = document.getElementById('config-editor-apply');
  const resetBtn = document.getElementById('config-editor-reset');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleConfigEditor);
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', toggleConfigEditor);
  }

  if (applyBtn) {
    applyBtn.addEventListener('click', applyEditedConfig);
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', resetConfig);
  }

  // Allow Ctrl+Enter to apply manually
  const textarea = document.getElementById('config-editor-textarea');
  if (textarea) {
    textarea.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        applyEditedConfig();
      }
    });

    // Show scrollbar only when scrolling
    let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
    textarea.addEventListener('scroll', () => {
      textarea.classList.add('scrolling');
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      scrollTimeout = setTimeout(() => {
        textarea.classList.remove('scrolling');
      }, 1000);
    });

    // Auto-apply config after user stops typing
    let autoApplyTimeout: ReturnType<typeof setTimeout> | null = null;
    textarea.addEventListener('input', () => {
      if (autoApplyTimeout) {
        clearTimeout(autoApplyTimeout);
      }
      autoApplyTimeout = setTimeout(() => {
        applyEditedConfig();
      }, 1000); // Apply 1 second after user stops typing
    });
  }
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
  setupSelectKeyboardNavigation('config-select');
}

function setupDataSourceSelectListener() {
  setupSelectListener('data-source-select', (selectedDataSource) => {
    saveToStorage('selected-data-source', selectedDataSource);
    const currentProvider = window.PROVIDER;
    if (currentProvider) {
      updateCalendarsAndRender(selectedDataSource, currentProvider);
    }
  });
  setupSelectKeyboardNavigation('data-source-select');
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

  const defaultProvider = allProviders.includes(DEFAULT_PROVIDER)
    ? DEFAULT_PROVIDER
    : allProviders[0];
  const currentProvider = getValue(
    'selected-provider',
    'provider',
    window.PROVIDER,
    defaultProvider,
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
  setupSelectKeyboardNavigation('provider-select');
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

// Setup config editor early (before provider data is ready)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupConfigEditor);
} else {
  setupConfigEditor();
}

// Setup global keyboard navigation early
setupGlobalKeyboardNavigation();

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
  const defaultProvider = allProviders.includes(DEFAULT_PROVIDER)
    ? DEFAULT_PROVIDER
    : allProviders[0];
  const currentProvider = window.PROVIDER || defaultProvider;
  if (!currentProvider) return;

  const providerData = getProviderData(currentProvider);
  if (!providerData) return;

  // Set up data source and calendars
  const savedDataSource = getValue('selected-data-source', 'dataSource');
  const defaultDataSource = providerData.dataSources.includes(
    DEFAULT_DATA_SOURCE,
  )
    ? DEFAULT_DATA_SOURCE
    : providerData.dataSources[0] || '';
  const initialDataSource =
    savedDataSource && providerData.dataSources.includes(savedDataSource)
      ? savedDataSource
      : defaultDataSource;

  if (initialDataSource) {
    updateCalendars(initialDataSource, currentProvider);
  }

  if (window.CONFIG && !window.ORIGINAL_CONFIG) {
    window.ORIGINAL_CONFIG = JSON.parse(JSON.stringify(window.CONFIG)); // Deep copy
  }

  updateConfigEditor();
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

    // Focus config selector by default
    const configSelect = document.getElementById(
      'config-select',
    ) as HTMLSelectElement;
    if (configSelect) {
      configSelect.focus();
    }
  }
})();
