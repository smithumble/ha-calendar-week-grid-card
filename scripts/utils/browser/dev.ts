export {};

declare global {
  interface Window {
    ALL_CONFIGS: Record<string, any>;
    ALL_EVENTS?: Record<string, any>;
    CONFIG?: any;
    EVENTS: any[];
    DATA_SOURCE?: string;
    setupBrowserEnv?: () => void;
    renderCards?: (config?: any) => void;
  }
}

const STORAGE_PREFIX = 'calendar-week-grid-card-';

// Unified localStorage utility functions
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

// Get value from URL query parameter
function getFromURL(paramName: string): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get(paramName);
}

// Get value with priority: URL param > localStorage > window property > default
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

// Config selector handler
function setupConfigSelector() {
  const configSelect = document.getElementById('config-select');
  if (!configSelect || !window.ALL_CONFIGS) return;

  // Get current config value
  const currentConfig = getValue(
    'selected-config',
    'config',
    undefined,
    Object.keys(window.ALL_CONFIGS)[0],
  );

  // Set the select value and apply config if valid
  if (currentConfig && window.ALL_CONFIGS[currentConfig]) {
    (configSelect as HTMLSelectElement).value = currentConfig;
    window.CONFIG = window.ALL_CONFIGS[currentConfig];
  }

  // Save URL param to localStorage if present
  const urlConfig = getFromURL('config');
  if (urlConfig) {
    saveToStorage('selected-config', urlConfig);
  }

  configSelect.addEventListener('change', (e) => {
    const target = e.target as HTMLSelectElement;
    const selectedName = target.value;
    const selectedConfig = window.ALL_CONFIGS[selectedName];
    if (selectedConfig) {
      window.CONFIG = selectedConfig;
      window.renderCards?.(selectedConfig);
      saveToStorage('selected-config', selectedName);
    }
  });
}

// Data source selector handler
function setupDataSourceSelector() {
  const dataSourceSelect = document.getElementById('data-source-select');
  if (!dataSourceSelect) return;

  // Get current data source value
  const currentDataSource = getValue(
    'selected-data-source',
    'dataSource',
    window.DATA_SOURCE,
    'yasno_1',
  );

  // Set the select value
  (dataSourceSelect as HTMLSelectElement).value = currentDataSource;

  // Save URL param to localStorage if present
  const urlDataSource = getFromURL('dataSource');
  if (urlDataSource) {
    saveToStorage('selected-data-source', urlDataSource);
  }

  // Update events if ALL_EVENTS is available
  if (window.ALL_EVENTS && window.ALL_EVENTS[currentDataSource]) {
    window.EVENTS = window.ALL_EVENTS[currentDataSource];
  }

  dataSourceSelect.addEventListener('change', (e) => {
    const target = e.target as HTMLSelectElement;
    const selectedDataSource = target.value;
    saveToStorage('selected-data-source', selectedDataSource);

    // Update events if ALL_EVENTS is available
    if (window.ALL_EVENTS && window.ALL_EVENTS[selectedDataSource]) {
      window.EVENTS = window.ALL_EVENTS[selectedDataSource];
      // Re-render cards with new events
      window.renderCards?.(window.CONFIG);
    }
  });
}

// Wait for ALL_CONFIGS to be available, then setup selectors
(function waitForConfigs() {
  if (window.ALL_CONFIGS) {
    setupConfigSelector();
    setupDataSourceSelector();
  } else {
    setTimeout(waitForConfigs, 50);
  }
})();

// Initialize cards
(async () => {
  window.setupBrowserEnv?.();

  const cardScript = document.getElementById(
    'card-script',
  ) as HTMLScriptElement | null;
  if (cardScript) {
    await new Promise((resolve) => {
      const script = cardScript as any;
      if (script.complete || script.readyState === 'complete') {
        resolve(undefined);
        return;
      }
      cardScript.onload = resolve;
      cardScript.onerror = resolve;
    });
  }

  // Wait for custom element
  for (
    let i = 0;
    i < 100 && !customElements.get('calendar-week-grid-card');
    i++
  ) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  if (customElements.get('calendar-week-grid-card')) {
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Load saved config if available, otherwise use default
    const savedConfigName = getValue(
      'selected-config',
      'config',
      undefined,
      Object.keys(window.ALL_CONFIGS || {})[0],
    );
    if (savedConfigName && window.ALL_CONFIGS?.[savedConfigName]) {
      const savedConfig = window.ALL_CONFIGS[savedConfigName];
      window.CONFIG = savedConfig;
      window.renderCards?.(savedConfig);
    } else {
      window.renderCards?.();
    }
  }
})();
