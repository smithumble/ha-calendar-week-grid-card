/**
 * Config editor operations (apply, reset)
 */

import { renderCards } from '../browser';
import {
  getCurrentCalendars,
  setCurrentConfig,
  originalConfig,
} from '../state';
import {
  getEditorElements,
  showConfigEditorError,
  hideConfigEditorError,
} from './ui';
import { updateVisualEditorInstance } from './visual';
import { parseYamlConfig, updateYamlEditor } from './yaml';

/**
 * Apply edited config from YAML editor
 */
export function applyEditedConfig(): boolean {
  const { textarea } = getEditorElements();
  if (!textarea) return false;

  const configText = textarea.value.trim();
  if (!configText) {
    showConfigEditorError('Config cannot be empty');
    return false;
  }

  try {
    const parsedConfig = parseYamlConfig(configText);
    setCurrentConfig(parsedConfig);
    renderCards(parsedConfig, getCurrentCalendars());
    updateVisualEditorInstance();
    hideConfigEditorError();
    return true;
  } catch (e) {
    showConfigEditorError(e instanceof Error ? e.message : String(e));
    return false;
  }
}

/**
 * Reset config to original
 */
export function resetConfig(): void {
  if (originalConfig) {
    const resetConfig = JSON.parse(JSON.stringify(originalConfig));
    setCurrentConfig(resetConfig);
    renderCards(resetConfig, getCurrentCalendars());
    updateYamlEditor();
    updateVisualEditorInstance();
    hideConfigEditorError();
  }
}
