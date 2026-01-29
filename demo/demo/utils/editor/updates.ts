/**
 * Editor update functions
 */

import { updateVisualEditorInstance } from './visual';
import { updateYamlEditor } from './yaml';

/**
 * Update both YAML and visual editors
 */
export function updateConfigEditorWithVisual(): void {
  updateYamlEditor();
  updateVisualEditorInstance();
}
