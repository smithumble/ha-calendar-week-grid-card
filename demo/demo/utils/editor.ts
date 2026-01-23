// ============================================================================
// CONFIG EDITOR MANAGEMENT
// ============================================================================

import yaml from 'js-yaml';
import type { CardConfig } from '../../../src/types';
import { renderCards } from './browser';
import type { MockCard } from './browser';
import { createMockHassForEditor, mockHaEditorComponents } from './editor-ha';
import {
  getCurrentConfig,
  getCurrentCalendars,
  setCurrentConfig,
  originalConfig,
} from './state';

// ============================================================================
// EDITOR STATE
// ============================================================================

let visualEditor: MockCard | null = null;
let editorMode: 'yaml' | 'visual' = 'visual';
let configEditorSetup = false;

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
  const config = getCurrentConfig();
  if (!textarea || !config) return;

  try {
    const configYaml = yaml.dump(config, {
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
  const config = getCurrentConfig();
  if (!visualEditor || !config) return;

  const mockHass = createMockHassForEditor(
    config,
    getCurrentCalendars(),
    false,
  );
  visualEditor.hass = mockHass;
  visualEditor.setConfig(config);
  console.log('Updated visual editor');
}

export function updateConfigEditorWithVisual() {
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
    setCurrentConfig(parsedConfig);
    renderCards(parsedConfig, getCurrentCalendars());
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
    const resetConfig = JSON.parse(JSON.stringify(originalConfig));
    setCurrentConfig(resetConfig);
    renderCards(resetConfig, getCurrentCalendars());
    updateConfigEditorWithVisual();
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
      setCurrentConfig(newConfig);
      renderCards(newConfig, getCurrentCalendars());
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
