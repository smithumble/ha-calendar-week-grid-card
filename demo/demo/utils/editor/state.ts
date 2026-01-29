/**
 * Editor state management
 */

let configEditorSetup = false;

/**
 * Check if config editor is set up
 */
export function isConfigEditorSetup(): boolean {
  return configEditorSetup;
}

/**
 * Mark config editor as set up
 */
export function setConfigEditorSetup(value: boolean): void {
  configEditorSetup = value;
}
