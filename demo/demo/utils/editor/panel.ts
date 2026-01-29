/**
 * Editor panel toggle and initialization
 */

import { applyEditedConfig, resetConfig } from './config';
import { getEditorMode, switchEditorMode } from './modes';
import { isConfigEditorSetup, setConfigEditorSetup } from './state';
import { getEditorElements, setupScrollIndicator } from './ui';
import { updateConfigEditorWithVisual } from './updates';
import { setupVisualEditor } from './visual';

/**
 * Toggle editor panel visibility
 */
export function toggleConfigEditor(): void {
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
    if (getEditorMode() === 'visual') {
      setupVisualEditor();
    } else {
      updateConfigEditorWithVisual();
    }
  }
}

/**
 * Setup config editor event listeners
 */
function setupConfigEditor(): void {
  if (isConfigEditorSetup()) return;
  setConfigEditorSetup(true);

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
    yamlBtn.addEventListener('click', () => {
      switchEditorMode('yaml', () => {
        updateConfigEditorWithVisual();
      });
    });
  }
  if (visualBtn) {
    visualBtn.addEventListener('click', () => {
      switchEditorMode('visual');
      setupVisualEditor();
    });
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

/**
 * Setup toggle button listener early so it works before editor is initialized
 */
export function setupEditorToggleButton(): void {
  const { toggleBtn } = getEditorElements();
  if (toggleBtn && !toggleBtn.hasAttribute('data-listener-attached')) {
    toggleBtn.setAttribute('data-listener-attached', 'true');
    toggleBtn.addEventListener('click', toggleConfigEditor);
  }
}
