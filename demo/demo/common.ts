// ============================================================================
// IMPORTS
// ============================================================================

import yaml from 'js-yaml';
import type { CardConfig } from '../../src/types';
import {
  updateDateOverride,
  renderCards,
  type MockCard,
} from '../utils/browser';
import { getAvailableConfigNames, getVisibleProviders } from '../utils/data';
import type { Calendar } from '../utils/data';
import {
  createMockHassForEditor,
  mockHaEditorComponents,
} from '../utils/editor';
import { providerRegistry } from '../utils/registry';

// ============================================================================
// CONSTANTS
// ============================================================================

export const DEFAULT_PROVIDER = 'yasno_v3';
export const DEPRECATED_PROVIDERS = ['yasno_v1', 'yasno_v2'];
export const HIDDEN_PROVIDERS = ['yasno_image'];

// ============================================================================
// GLOBAL STATE
// ============================================================================

let STORAGE_PREFIX = 'calendar-week-grid-card-';
let currentProvider: string = DEFAULT_PROVIDER;
export let currentConfig: CardConfig | null = null;
export let originalConfig: CardConfig | null = null;
export let currentCalendars: Calendar[] = [];

// ============================================================================
// STORAGE PREFIX MANAGEMENT
// ============================================================================

export function setStoragePrefix(prefix: string) {
  STORAGE_PREFIX = `calendar-week-grid-card-${prefix}-`;
}

// ============================================================================
// STORAGE UTILITIES
// ============================================================================

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

function getProviderStorageKey(provider: string, key: string): string {
  return `${key}-${provider}`;
}

// ============================================================================
// URL UTILITIES
// ============================================================================

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

// ============================================================================
// STORAGE AND URL VALUE HELPERS
// ============================================================================

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

export function getProviderValue(
  provider: string,
  storageKey: string,
  urlParam: string,
  defaultValue?: string,
): string {
  const urlValue = getFromURL(urlParam);
  if (urlValue) {
    // Save URL param value to provider-specific localStorage
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

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function formatSelectorLabel(label: string): string {
  return label
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

// ============================================================================
// PROVIDER DATA MANAGEMENT
// ============================================================================

export async function getConfigByName(
  provider: string,
  configName: string,
): Promise<CardConfig | null> {
  const providerInstance = providerRegistry.getProvider(provider);
  if (!providerInstance) return null;

  // Provider handles caching internally
  return await providerInstance.loadConfig(configName);
}

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
    currentProvider = selectedProvider;
    if (urlProvider) {
      saveToStorage('selected-provider', urlProvider);
    }
    updateURLParams({ provider: currentProvider });
    // Update date override based on initial provider
    const providerInstance = providerRegistry.getProvider(currentProvider);
    updateDateOverride(providerInstance?.getMockDate());
  }

  return currentProvider;
}

// ============================================================================
// CALENDAR OPERATIONS
// ============================================================================

export async function updateCalendars(dataSource: string, provider: string) {
  const providerInstance = providerRegistry.getProvider(provider);
  if (!providerInstance) return;

  // Provider handles caching internally
  currentCalendars = await providerInstance.loadCalendars(dataSource);
}

export async function updateCalendarsAndRender(
  dataSource: string,
  provider: string,
) {
  await updateCalendars(dataSource, provider);
  if (currentConfig && currentCalendars) {
    renderCards(currentConfig, currentCalendars);
  }
}

// ============================================================================
// CONFIG OPERATIONS
// ============================================================================

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

// ============================================================================
// SELECT ELEMENTS UPDATE
// ============================================================================

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

// ============================================================================
// SELECT LISTENERS SETUP
// ============================================================================

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

export function setupConfigSelectListener() {
  setupSelectListener('config-select', async (selectedName) => {
    if (await selectConfig(selectedName, currentProvider)) {
      if (currentConfig) {
        renderCards(currentConfig, currentCalendars);
      }
      updateConfigEditorWithVisual();
      saveToStorage(
        getProviderStorageKey(currentProvider, 'selected-config'),
        selectedName,
      );
      updateURLParams({ config: selectedName });
    }
  });
  setupSelectKeyboardNavigation('config-select');
}

export function setupDataSourceSelectListener() {
  setupSelectListener('data-source-select', async (selectedDataSource) => {
    saveToStorage(
      getProviderStorageKey(currentProvider, 'selected-data-source'),
      selectedDataSource,
    );
    updateURLParams({ dataSource: selectedDataSource });
    await updateCalendarsAndRender(selectedDataSource, currentProvider);
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
    currentProvider = currentProviderValue;
    if (urlProvider) {
      saveToStorage('selected-provider', urlProvider);
    }
    updateURLParams({ provider: currentProvider });
    // Update date override based on initial provider
    const providerInstance = providerRegistry.getProvider(currentProvider);
    updateDateOverride(providerInstance?.getMockDate());
  }

  setupSelectListener('provider-select', async (selectedProvider) => {
    if (allProviders.includes(selectedProvider)) {
      const previousProvider = currentProvider;
      currentProvider = selectedProvider;
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

// ============================================================================
// KEYBOARD NAVIGATION
// ============================================================================

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

// ============================================================================
// EDITOR STATE
// ============================================================================

let visualEditor: MockCard | null = null;
let editorMode: 'yaml' | 'visual' = 'visual';

// ============================================================================
// EDITOR DOM ELEMENTS HELPERS
// ============================================================================

function getEditorElements() {
  return {
    panel: document.getElementById('config-editor-panel'),
    toggleBtn: document.getElementById('config-editor-toggle-btn'),
    closeBtn: document.getElementById('config-editor-close'),
    applyBtn: document.getElementById('config-editor-apply'),
    resetBtn: document.getElementById('config-editor-reset'),
    textarea: document.getElementById(
      'config-editor-textarea',
    ) as HTMLTextAreaElement,
    errorDiv: document.getElementById('config-editor-error'),
    yamlEditor: document.getElementById('config-editor-yaml'),
    visualEditorDiv: document.getElementById('config-editor-visual'),
    visualContainer: document.getElementById('visual-editor-container'),
    yamlBtn: document.getElementById('config-editor-mode-yaml'),
    visualBtn: document.getElementById('config-editor-mode-visual'),
  };
}

// ============================================================================
// EDITOR UPDATE FUNCTIONS
// ============================================================================

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
    console.log('Updated config editor');
  } catch (e) {
    console.error('Failed to serialize config:', e);
  }
}

export function updateVisualEditor() {
  if (!visualEditor || !currentConfig) return;

  const mockHass = createMockHassForEditor(
    currentConfig,
    currentCalendars,
    false,
  );
  visualEditor.hass = mockHass;
  visualEditor.setConfig(currentConfig);
  console.log('Updated visual editor');
}

function updateConfigEditorWithVisual() {
  updateConfigEditor();
  updateVisualEditor();
}

// ============================================================================
// EDITOR ERROR HANDLING
// ============================================================================

function showConfigEditorError(message: string) {
  const { errorDiv } = getEditorElements();
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.classList.add('visible');
  }
}

function hideConfigEditorError() {
  const { errorDiv } = getEditorElements();
  if (errorDiv) {
    errorDiv.classList.remove('visible');
  }
}

// ============================================================================
// EDITOR CONFIG OPERATIONS
// ============================================================================

function applyEditedConfig() {
  const { textarea } = getEditorElements();
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
    hideConfigEditorError();
  }
}

// ============================================================================
// EDITOR UI HELPERS
// ============================================================================

function applyThemeToContainer(container: HTMLElement) {
  const { panel } = getEditorElements();
  const isDark =
    panel?.classList.contains('theme-dark') ||
    document.body.classList.contains('theme-dark');

  if (isDark) {
    container.classList.add('theme-dark');
    container.classList.remove('theme-light');
  } else {
    container.classList.add('theme-light');
    container.classList.remove('theme-dark');
  }
}

function setupScrollIndicator(
  element: HTMLElement,
  className = 'scrolling',
  timeout = 1000,
) {
  let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
  element.addEventListener('scroll', () => {
    element.classList.add(className);
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }
    scrollTimeout = setTimeout(() => {
      element.classList.remove(className);
    }, timeout);
  });
}

// ============================================================================
// VISUAL EDITOR SETUP
// ============================================================================

function setupVisualEditor() {
  const { visualContainer } = getEditorElements();
  if (!visualContainer) return;

  // Mock HA components needed by the visual editor
  mockHaEditorComponents();

  applyThemeToContainer(visualContainer);

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
    visualContainer.appendChild(visualEditor);

    setupScrollIndicator(visualContainer);

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

  updateVisualEditor();
}

// ============================================================================
// EDITOR MODE SWITCHING
// ============================================================================

function switchEditorMode(mode: 'yaml' | 'visual') {
  editorMode = mode;
  const { yamlEditor, visualEditorDiv, yamlBtn, visualBtn } =
    getEditorElements();

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

// ============================================================================
// EDITOR PANEL TOGGLE
// ============================================================================

function toggleConfigEditor() {
  const { panel, toggleBtn } = getEditorElements();
  if (!panel || !toggleBtn) return;

  const isVisible = panel.classList.contains('visible');
  if (isVisible) {
    panel.classList.remove('visible');
    toggleBtn.textContent = 'Edit Config';
    document.body.classList.remove('with-editor');
  } else {
    // Initialize editors lazily on first open
    setupConfigEditor();

    panel.classList.add('visible');
    toggleBtn.textContent = 'Close Editor';
    document.body.classList.add('with-editor');
    // Initialize the default editor mode (visual)
    if (editorMode === 'visual') {
      setupVisualEditor();
    } else {
      updateConfigEditorWithVisual();
    }
  }
}

// ============================================================================
// EDITOR INITIALIZATION
// ============================================================================

let configEditorSetup = false;

function setupConfigEditor() {
  if (configEditorSetup) return;
  configEditorSetup = true;

  const { closeBtn, applyBtn, resetBtn, yamlBtn, visualBtn, textarea } =
    getEditorElements();

  // Setup button event listeners (toggle button is set up separately)
  if (closeBtn) {
    closeBtn.addEventListener('click', toggleConfigEditor);
  }
  if (applyBtn) {
    applyBtn.addEventListener('click', applyEditedConfig);
  }
  if (resetBtn) {
    resetBtn.addEventListener('click', resetConfig);
  }
  if (yamlBtn) {
    yamlBtn.addEventListener('click', () => switchEditorMode('yaml'));
  }
  if (visualBtn) {
    visualBtn.addEventListener('click', () => switchEditorMode('visual'));
  }

  // Setup textarea event listeners
  if (textarea) {
    // Keyboard shortcut: Ctrl/Cmd + Enter to apply
    textarea.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        applyEditedConfig();
      }
    });

    // Scroll indicator
    setupScrollIndicator(textarea);

    // Auto-apply on input (debounced)
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

// Setup toggle button listener early so it works before editor is initialized
export function setupEditorToggleButton() {
  const { toggleBtn } = getEditorElements();
  if (toggleBtn && !toggleBtn.hasAttribute('data-listener-attached')) {
    toggleBtn.setAttribute('data-listener-attached', 'true');
    toggleBtn.addEventListener('click', toggleConfigEditor);
  }
}
