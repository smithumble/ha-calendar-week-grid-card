import yaml from 'js-yaml';
import type { CardConfig } from '../../src/types';
import {
  updateDateOverride,
  renderCards,
  type MockCard,
} from '../utils/browser';
import {
  ProviderData,
  loadCalendarsForDataSource,
  loadConfigByName,
  getAvailableConfigNames,
  getProviderMetadata,
  getVisibleProviders,
} from '../utils/data';
import type { Calendar } from '../utils/data';
import {
  createMockHassForEditor,
  mockHaEditorComponents,
} from '../utils/editor';

// Default values
export const DEFAULT_PROVIDER = 'yasno_v3';
export const DEFAULT_CONFIG = 'google_calendar_separated';
export const DEFAULT_DATA_SOURCE = 'yasno_1';

export const DEPRECATED_PROVIDERS = ['yasno_v1', 'yasno_v2'];
export const HIDDEN_PROVIDERS = ['yasno_image', 'yasno_api'];

// Storage prefix
let STORAGE_PREFIX = 'calendar-week-grid-card-';

export function setStoragePrefix(prefix: string) {
  STORAGE_PREFIX = `calendar-week-grid-card-${prefix}-`;
}

// Global state
let currentProvider: string = DEFAULT_PROVIDER;
export let currentConfig: CardConfig | null = null;
export let originalConfig: CardConfig | null = null;
export let currentCalendars: Calendar[] = [];
let providerDataMap: Record<string, ProviderData> = {};

// State setters
export function setCurrentConfig(config: CardConfig | null) {
  currentConfig = config;
}

export function setOriginalConfig(config: CardConfig | null) {
  originalConfig = config;
}

export function setCurrentCalendars(calendars: Calendar[]) {
  currentCalendars = calendars;
}

export function getCurrentProvider(): string {
  return currentProvider;
}

export function setCurrentProvider(provider: string) {
  currentProvider = provider;
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
    // Save URL param value to localStorage
    saveToStorage(storageKey, urlValue);
    return urlValue;
  }
  const storageValue = loadFromStorage(storageKey);
  if (storageValue) {
    return storageValue;
  }
  return defaultValue || '';
}

export function formatSelectorLabel(label: string): string {
  return label
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

export function getProviderData(provider: string): ProviderData | null {
  return providerDataMap[provider] || null;
}

export async function getConfigByName(
  provider: string,
  configName: string,
): Promise<CardConfig | null> {
  const providerData = getProviderData(provider);
  if (!providerData) return null;

  // Check if config is already loaded in providerData
  const existingConfig = providerData.configs.find(
    (c) => c.name === configName,
  );
  if (existingConfig) {
    return existingConfig.config;
  }

  // Load the specific config file
  const config = await loadConfigByName(provider, configName);
  if (config) {
    // Cache it in providerData
    providerData.configs.push({ name: configName, config });
  }
  return config;
}

export async function updateCalendars(dataSource: string, provider: string) {
  const providerData = getProviderData(provider);
  if (!providerData) return;

  // Load calendar if not already loaded
  if (!providerData.calendars[dataSource]) {
    try {
      const calendars = await loadCalendarsForDataSource(dataSource, provider);
      providerData.calendars[dataSource] = calendars;
    } catch (error) {
      console.error(`Failed to load calendars for ${dataSource}:`, error);
      providerData.calendars[dataSource] = [];
    }
  }

  currentCalendars = providerData.calendars[dataSource] || [];
}

export async function updateCalendarsAndRender(
  dataSource: string,
  provider: string,
  shouldRender = true,
  onRender?: () => void,
) {
  await updateCalendars(dataSource, provider);
  if (shouldRender && currentConfig && currentCalendars) {
    renderCards(currentConfig, currentCalendars);
    if (onRender) {
      onRender();
    }
  }
}

export async function selectConfig(
  configName: string,
  provider: string,
): Promise<boolean> {
  const config = await getConfigByName(provider, configName);
  if (config) {
    currentConfig = config;
    originalConfig = JSON.parse(JSON.stringify(config));
    return true;
  }
  return false;
}

export function renderCurrentCards() {
  if (currentConfig && currentCalendars) {
    renderCards(currentConfig, currentCalendars);
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

  const savedConfig = getValue('selected-config', 'config');
  const defaultConfig = configKeys.includes(DEFAULT_CONFIG)
    ? DEFAULT_CONFIG
    : configKeys[0] || '';
  const selectedConfig =
    savedConfig && configKeys.includes(savedConfig)
      ? savedConfig
      : defaultConfig;

  if (selectedConfig && (await selectConfig(selectedConfig, provider))) {
    configSelect.value = selectedConfig;
    if (!savedConfig) {
      saveToStorage('selected-config', selectedConfig);
    }
    updateURLParams({ config: selectedConfig });
  }
}

export async function updateDataSourceSelect(
  provider: string,
  shouldRender = false,
  onRender?: () => void,
) {
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
    updateURLParams({ dataSource: selectedDataSource });
    await updateCalendarsAndRender(
      selectedDataSource,
      provider,
      shouldRender,
      onRender,
    );
  }
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

function isAnySelectorFocused(): boolean {
  const selectors = ['provider-select', 'config-select', 'data-source-select'];
  return selectors.some((id) => {
    const select = document.getElementById(id) as HTMLSelectElement;
    return select && document.activeElement === select;
  });
}

let globalKeyboardNavSetup = false;

export function setupGlobalKeyboardNavigation(): void {
  if (globalKeyboardNavSetup) return;
  globalKeyboardNavSetup = true;

  document.addEventListener('keydown', (e) => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      return;
    }

    if (!isAnySelectorFocused()) {
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

export function setupSelectKeyboardNavigation(selectId: string): void {
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

export function updateConfigEditor() {
  const textarea = document.getElementById(
    'config-editor-textarea',
  ) as HTMLTextAreaElement;
  if (!textarea || !currentConfig) return;

  try {
    const configYaml = yaml.dump(currentConfig, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false,
    });
    textarea.value = configYaml;
  } catch (e) {
    console.error('Failed to serialize config:', e);
  }
}

export function setupConfigSelectListener(onRender?: () => void) {
  setupSelectListener('config-select', async (selectedName) => {
    if (await selectConfig(selectedName, currentProvider)) {
      if (currentConfig) {
        renderCards(currentConfig, currentCalendars);
      }
      if (onRender) {
        onRender();
      }
      saveToStorage('selected-config', selectedName);
      updateURLParams({ config: selectedName });
    }
  });
  setupSelectKeyboardNavigation('config-select');
}

export function setupDataSourceSelectListener(onRender?: () => void) {
  setupSelectListener('data-source-select', async (selectedDataSource) => {
    saveToStorage('selected-data-source', selectedDataSource);
    updateURLParams({ dataSource: selectedDataSource });
    await updateCalendarsAndRender(
      selectedDataSource,
      currentProvider,
      true,
      onRender,
    );
  });
  setupSelectKeyboardNavigation('data-source-select');
}

export async function updateSelectsForProvider(
  provider: string,
  shouldRender = false,
  onRender?: () => void,
) {
  await updateConfigSelect(provider);
  await updateDataSourceSelect(provider, shouldRender, onRender);
}

function populateProviderSelect(selectedProvider?: string | null) {
  const providerSelect = document.getElementById(
    'provider-select',
  ) as HTMLSelectElement;
  if (!providerSelect) return;

  const allProviders = Object.keys(providerDataMap);
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

export async function setupProviderSelector(
  onProviderChange?: (provider: string) => void,
) {
  const providerSelect = document.getElementById(
    'provider-select',
  ) as HTMLSelectElement;
  if (!providerSelect) return;

  const allProviders = Object.keys(providerDataMap);
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
    currentProvider = currentProviderValue;
    if (urlProvider) {
      saveToStorage('selected-provider', urlProvider);
    }
    updateURLParams({ provider: currentProvider });
    // Update date override based on initial provider
    const providerMeta = providerDataMap[currentProvider];
    updateDateOverride(providerMeta?.mockDate);
  }

  setupSelectListener('provider-select', async (selectedProvider) => {
    if (allProviders.includes(selectedProvider)) {
      const previousProvider = currentProvider;
      currentProvider = selectedProvider;
      saveToStorage('selected-provider', selectedProvider);
      updateURLParams({ provider: selectedProvider });

      // Update date override based on provider
      const providerMeta = providerDataMap[selectedProvider];
      updateDateOverride(providerMeta?.mockDate);

      // Only repopulate if we're switching away from a hidden provider
      // (to remove it from the dropdown) or if we're switching to a hidden provider
      const wasHidden =
        previousProvider && !visibleProviders.includes(previousProvider);
      const isHidden = !visibleProviders.includes(selectedProvider);

      if (wasHidden || isHidden) {
        // Repopulate to add/remove hidden providers as needed
        populateProviderSelect(selectedProvider);
      }

      if (onProviderChange) {
        onProviderChange(selectedProvider);
      }
    }
  });
  setupSelectKeyboardNavigation('provider-select');
}

// Visual editor state
let visualEditor: MockCard | null = null;
let editorMode: 'yaml' | 'visual' = 'visual';

export function updateVisualEditor() {
  if (visualEditor && currentConfig && editorMode === 'visual') {
    const mockHass = createMockHassForEditor(
      currentConfig,
      currentCalendars,
      false,
    );
    visualEditor.hass = mockHass;
    visualEditor.setConfig(currentConfig);
  }
}

function updateConfigEditorWithVisual() {
  updateConfigEditor();

  // Also update visual editor if it exists
  if (visualEditor && currentConfig) {
    const mockHass = createMockHassForEditor(
      currentConfig,
      currentCalendars,
      false,
    );
    visualEditor.hass = mockHass;
    visualEditor.setConfig(currentConfig);
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
    const parsedConfig = yaml.load(configText) as CardConfig;
    currentConfig = parsedConfig;
    renderCards(parsedConfig, currentCalendars);
    updateVisualEditor();
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
  if (originalConfig) {
    currentConfig = JSON.parse(JSON.stringify(originalConfig));
    updateConfigEditorWithVisual();
    if (currentConfig) {
      renderCards(currentConfig, currentCalendars);
    }
    updateVisualEditor();
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
    // Initialize the default editor mode (visual)
    if (editorMode === 'visual') {
      setupVisualEditor();
    } else {
      updateConfigEditorWithVisual();
    }
  }
}

function setupVisualEditor() {
  const container = document.getElementById('visual-editor-container');
  if (!container) return;

  // Ensure container has theme class for proper variable inheritance
  const editorPanel = document.getElementById('config-editor-panel');
  if (editorPanel) {
    // Inherit theme from editor panel or body
    if (
      editorPanel.classList.contains('theme-dark') ||
      document.body.classList.contains('theme-dark')
    ) {
      container.classList.add('theme-dark');
      container.classList.remove('theme-light');
    } else {
      container.classList.add('theme-light');
      container.classList.remove('theme-dark');
    }
  }

  // Wait for the editor custom element to be registered
  if (!customElements.get('calendar-week-grid-card-editor')) {
    setTimeout(setupVisualEditor, 100);
    return;
  }

  // Create editor instance if it doesn't exist
  if (!visualEditor) {
    visualEditor = document.createElement(
      'calendar-week-grid-card-editor',
    ) as MockCard;
    container.appendChild(visualEditor);

    // Add scrollbar
    let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
    container.addEventListener('scroll', () => {
      container.classList.add('scrolling');
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      scrollTimeout = setTimeout(() => {
        container.classList.remove('scrolling');
      }, 1000);
    });

    // Listen for config changes
    visualEditor.addEventListener('config-changed', ((e: CustomEvent) => {
      const newConfig = e.detail.config as CardConfig;
      currentConfig = newConfig;
      if (currentConfig) {
        renderCards(currentConfig, currentCalendars);
      }
      // Also update YAML editor if it's visible
      if (editorMode === 'yaml') {
        updateConfigEditorWithVisual();
      }
    }) as EventListener);
  }

  // Update editor with current config and hass
  if (visualEditor && currentConfig) {
    const mockHass = createMockHassForEditor(
      currentConfig,
      currentCalendars,
      false,
    );
    visualEditor.hass = mockHass;
    visualEditor.setConfig(currentConfig);
  }
}

function switchEditorMode(mode: 'yaml' | 'visual') {
  editorMode = mode;
  const yamlEditor = document.getElementById('config-editor-yaml');
  const visualEditorDiv = document.getElementById('config-editor-visual');
  const yamlBtn = document.getElementById('config-editor-mode-yaml');
  const visualBtn = document.getElementById('config-editor-mode-visual');

  if (mode === 'yaml') {
    yamlEditor?.style.setProperty('display', 'flex');
    visualEditorDiv?.style.setProperty('display', 'none');
    yamlBtn?.classList.add('active');
    visualBtn?.classList.remove('active');
    updateConfigEditorWithVisual();
    // Force reflow to ensure textarea resizes properly
    if (yamlEditor) {
      void yamlEditor.offsetHeight; // Trigger reflow
    }
  } else {
    yamlEditor?.style.setProperty('display', 'none');
    visualEditorDiv?.style.setProperty('display', 'flex');
    yamlBtn?.classList.remove('active');
    visualBtn?.classList.add('active');
    setupVisualEditor();
  }
}

let configEditorSetup = false;

export function setupConfigEditor() {
  if (configEditorSetup) return;
  configEditorSetup = true;

  // Mock HA components for visual editor
  mockHaEditorComponents();

  const toggleBtn = document.getElementById('config-editor-toggle-btn');
  const closeBtn = document.getElementById('config-editor-close');
  const applyBtn = document.getElementById('config-editor-apply');
  const resetBtn = document.getElementById('config-editor-reset');
  const yamlModeBtn = document.getElementById('config-editor-mode-yaml');
  const visualModeBtn = document.getElementById('config-editor-mode-visual');

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

  if (yamlModeBtn) {
    yamlModeBtn.addEventListener('click', () => switchEditorMode('yaml'));
  }

  if (visualModeBtn) {
    visualModeBtn.addEventListener('click', () => switchEditorMode('visual'));
  }

  const textarea = document.getElementById('config-editor-textarea');
  if (textarea) {
    textarea.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        applyEditedConfig();
      }
    });

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

    let autoApplyTimeout: ReturnType<typeof setTimeout> | null = null;
    textarea.addEventListener('input', () => {
      if (autoApplyTimeout) {
        clearTimeout(autoApplyTimeout);
      }
      autoApplyTimeout = setTimeout(() => {
        applyEditedConfig();
      }, 1000);
    });
  }
}

export async function waitForCustomElement(
  maxAttempts = 100,
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    if (customElements.get('calendar-week-grid-card')) return true;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return false;
}

export async function initializeCards(
  provider: string,
  defaultDataSource: string,
  includeEditor: boolean,
) {
  const providerData = getProviderData(provider);
  if (!providerData) return;

  const savedDataSource = getValue('selected-data-source', 'dataSource');
  const fallbackDataSource = providerData.dataSources.includes(
    defaultDataSource,
  )
    ? defaultDataSource
    : providerData.dataSources[0] || '';
  const initialDataSource =
    savedDataSource && providerData.dataSources.includes(savedDataSource)
      ? savedDataSource
      : fallbackDataSource;

  if (initialDataSource) {
    await updateCalendars(initialDataSource, provider);
  }

  if (currentConfig && !originalConfig) {
    originalConfig = JSON.parse(JSON.stringify(currentConfig));
  }

  if (includeEditor) {
    updateConfigEditorWithVisual();
    updateVisualEditor();
  }

  renderCurrentCards();
}

export async function initializeProviderData(): Promise<string> {
  // Initialize provider data structure with metadata only (no file loading)
  const metadata = getProviderMetadata();
  providerDataMap = {};
  for (const [provider, meta] of Object.entries(metadata)) {
    providerDataMap[provider] = {
      calendars: {},
      configs: [],
      dataSources: meta.dataSources,
      mockDate: meta.mockDate,
    };
  }

  const allProviders = Object.keys(providerDataMap);
  const visibleProviders = getVisibleProviders(allProviders, HIDDEN_PROVIDERS);
  const defaultProvider = allProviders.includes(DEFAULT_PROVIDER)
    ? DEFAULT_PROVIDER
    : visibleProviders[0] || allProviders[0];

  // Check URL param first (highest priority)
  const urlProvider = getFromURL('provider');
  const selectedProvider =
    urlProvider || getValue('selected-provider', 'provider', defaultProvider);

  if (selectedProvider && allProviders.includes(selectedProvider)) {
    currentProvider = selectedProvider;
    if (urlProvider) {
      saveToStorage('selected-provider', urlProvider);
    }
    updateURLParams({ provider: currentProvider });
    // Update date override based on initial provider
    const providerMeta = providerDataMap[currentProvider];
    updateDateOverride(providerMeta?.mockDate);
  }

  return currentProvider;
}
