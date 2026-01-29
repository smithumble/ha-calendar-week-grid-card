/**
 * Visual editor setup and management
 */

import type { CardConfig } from '../../../../src/types';
import type { MockCard } from '../browser';
import { mockHaEditorComponents } from '../mocks/ha-components';
import {
  updateVisualEditor,
  handleVisualEditorConfigChange,
  getEditorMode,
} from './modes';
import {
  getEditorElements,
  applyThemeToContainer,
  setupScrollIndicator,
} from './ui';
import { updateYamlEditor } from './yaml';

let visualEditor: MockCard | null = null;

/**
 * Get the visual editor instance
 */
export function getVisualEditor(): MockCard | null {
  return visualEditor;
}

/**
 * Update visual editor instance with current config
 */
export function updateVisualEditorInstance(): void {
  updateVisualEditor(visualEditor);
}

/**
 * Setup visual editor element
 */
export function setupVisualEditor(): void {
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
      handleVisualEditorConfigChange(newConfig);
      // Also update YAML editor if it's visible
      if (getEditorMode() === 'yaml') {
        updateYamlEditor();
        updateVisualEditorInstance();
      }
    }) as EventListener);
  }

  updateVisualEditorInstance();
}
