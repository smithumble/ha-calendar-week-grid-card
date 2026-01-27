/**
 * Editor update functions
 */

import { updateVisualEditorInstance } from './visual';
import { updateYamlEditor } from './yaml';

/**
 * Update YAML editor with current config
 */
export function updateConfigEditor(): void {
  updateYamlEditor();
}

/**
 * Update both YAML and visual editors
 */
export function updateConfigEditorWithVisual(): void {
  updateYamlEditor();
  updateVisualEditorInstance();
}
