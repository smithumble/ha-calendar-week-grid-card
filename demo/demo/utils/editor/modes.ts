/**
 * Editor mode switching functionality
 */

import type { CardConfig } from '../../../../src/types';
import { MockCard, renderCards } from '../browser';
import { getSharedMockHass } from '../mocks/ha-hass';
import {
  getCurrentConfig,
  getCurrentCalendars,
  setCurrentConfig,
} from '../state';
import { getEditorElements } from './ui';

// ============================================================================
// EDITOR MODE MANAGEMENT
// ============================================================================

export type EditorMode = 'yaml' | 'visual';

let editorMode: EditorMode = 'visual';

/**
 * Get current editor mode
 */
export function getEditorMode(): EditorMode {
  return editorMode;
}

/**
 * Switch editor mode
 * @param onYamlSwitch - Optional callback to call when switching to YAML mode
 */
export function switchEditorMode(
  mode: EditorMode,
  onYamlSwitch?: () => void,
): void {
  editorMode = mode;
  const { yamlEditor, visualEditorDiv, yamlBtn, visualBtn } =
    getEditorElements();

  if (mode === 'yaml') {
    yamlEditor?.style.setProperty('display', 'flex');
    visualEditorDiv?.style.setProperty('display', 'none');
    yamlBtn?.classList.add('active');
    visualBtn?.classList.remove('active');
    if (onYamlSwitch) {
      onYamlSwitch();
    }
    // Force reflow to ensure textarea resizes properly
    if (yamlEditor) {
      void yamlEditor.offsetHeight; // Trigger reflow
    }
  } else {
    yamlEditor?.style.setProperty('display', 'none');
    visualEditorDiv?.style.setProperty('display', 'flex');
    yamlBtn?.classList.remove('active');
    visualBtn?.classList.add('active');
  }
}

/**
 * Update visual editor with current config
 */
export function updateVisualEditor(visualEditor: MockCard | null): void {
  const config = getCurrentConfig();
  if (!visualEditor || !config) return;

  const mockHass = getSharedMockHass(getCurrentCalendars());
  visualEditor.hass = mockHass;
  visualEditor.setConfig(config);
}

/**
 * Handle config change from visual editor
 */
export function handleVisualEditorConfigChange(newConfig: CardConfig): void {
  setCurrentConfig(newConfig);
  renderCards(newConfig, getCurrentCalendars());
}
