import { renderCards } from '../browser';
import { mockHaEditorComponents } from '../mocks/ha-components';
import {
  getCurrentCalendars,
  originalConfig,
  setCurrentConfig,
} from '../state';
import {
  applyDebugOverrideToConfig,
  clearStoredDebugSecondRowOverride,
  clearStoredDebugOverride,
  getStoredDebugSecondRowOverrideRaw,
  getStoredDebugOverrideRaw,
  isDebugSecondRowEnabled,
  isDebugSecondRowOverrideEnabled,
  isDebugOverrideEnabled,
  setDebugSecondRowEnabledFlag,
  setDebugSecondRowOverrideEnabledFlag,
  setDebugOverrideEnabledFlag,
  setStoredDebugSecondRowOverrideYaml,
  setStoredDebugOverrideYaml,
} from './override';
import { getEditorElements } from './ui';
import { updateVisualEditorInstance } from './visual';
import { parseYamlConfig, updateYamlEditor } from './yaml';

export {
  applyDebugOverrideToConfig,
  getDebugOverride,
  isDebugOverrideEnabled,
} from './override';

export function setDebugOverride(yamlStr: string): boolean {
  try {
    if (!yamlStr.trim()) {
      clearStoredDebugOverride();
    } else {
      // Validate it's valid YAML
      const parsed = parseYamlConfig(yamlStr);
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('Override must be a YAML object');
      }
      setStoredDebugOverrideYaml(yamlStr);
    }
    return true;
  } catch (e) {
    const { debugErrorDiv } = getEditorElements();
    if (debugErrorDiv) {
      debugErrorDiv.textContent = e instanceof Error ? e.message : String(e);
      debugErrorDiv.classList.add('visible');
    }
    return false;
  }
}

export function setDebugSecondRowOverride(yamlStr: string): boolean {
  try {
    if (!yamlStr.trim()) {
      clearStoredDebugSecondRowOverride();
    } else {
      const parsed = parseYamlConfig(yamlStr);
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('Second row override must be a YAML object');
      }
      setStoredDebugSecondRowOverrideYaml(yamlStr);
    }
    return true;
  } catch (e) {
    const { debugErrorDiv } = getEditorElements();
    if (debugErrorDiv) {
      debugErrorDiv.textContent = e instanceof Error ? e.message : String(e);
      debugErrorDiv.classList.add('visible');
    }
    return false;
  }
}

export function refreshConfigWithDebugOverride(): void {
  if (!originalConfig) return;
  const newConfig = applyDebugOverrideToConfig(
    JSON.parse(JSON.stringify(originalConfig)),
  );
  setCurrentConfig(newConfig);
  renderCards(newConfig, getCurrentCalendars());
  updateYamlEditor();
  updateVisualEditorInstance();
}

export function handleDebugOverrideChange(): void {
  const editor = getDebugOverrideCodeEditor();
  const { debugErrorDiv } = getEditorElements();
  if (!editor) return;

  if (debugErrorDiv) {
    debugErrorDiv.classList.remove('visible');
  }

  const success = setDebugOverride(editor.value);
  if (success) {
    refreshConfigWithDebugOverride();
  }
}

export function handleDebugSecondRowOverrideChange(): void {
  const editor = getDebugSecondRowOverrideCodeEditor();
  const { debugErrorDiv } = getEditorElements();
  if (!editor) return;

  if (debugErrorDiv) {
    debugErrorDiv.classList.remove('visible');
  }

  const success = setDebugSecondRowOverride(editor.value);
  if (success) {
    refreshConfigWithDebugOverride();
  }
}

/** Mock/real ha-switch both expose a boolean `checked` property */
type HaSwitchElement = HTMLElement & { checked: boolean };

/** Mock/real ha-code-editor expose string `value` (and `value-changed` events) */
type HaCodeEditorElement = HTMLElement & { value: string };

function getDebugOverrideEnabledSwitch(): HaSwitchElement | null {
  const { debugOverrideEnabledSwitch } = getEditorElements();
  if (
    !debugOverrideEnabledSwitch ||
    !('checked' in debugOverrideEnabledSwitch)
  ) {
    return null;
  }
  return debugOverrideEnabledSwitch as HaSwitchElement;
}

function getDebugOverrideCodeEditor(): HaCodeEditorElement | null {
  const { debugOverrideCodeEditor } = getEditorElements();
  if (!debugOverrideCodeEditor || !('value' in debugOverrideCodeEditor)) {
    return null;
  }
  return debugOverrideCodeEditor as HaCodeEditorElement;
}

function getDebugSecondRowEnabledSwitch(): HaSwitchElement | null {
  const { debugSecondRowEnabledSwitch } = getEditorElements();
  if (
    !debugSecondRowEnabledSwitch ||
    !('checked' in debugSecondRowEnabledSwitch)
  ) {
    return null;
  }
  return debugSecondRowEnabledSwitch as HaSwitchElement;
}

function getDebugSecondRowOverrideEnabledSwitch(): HaSwitchElement | null {
  const { debugSecondRowOverrideEnabledSwitch } = getEditorElements();
  if (
    !debugSecondRowOverrideEnabledSwitch ||
    !('checked' in debugSecondRowOverrideEnabledSwitch)
  ) {
    return null;
  }
  return debugSecondRowOverrideEnabledSwitch as HaSwitchElement;
}

function getDebugSecondRowOverrideCodeEditor(): HaCodeEditorElement | null {
  const { debugSecondRowOverrideCodeEditor } = getEditorElements();
  if (
    !debugSecondRowOverrideCodeEditor ||
    !('value' in debugSecondRowOverrideCodeEditor)
  ) {
    return null;
  }
  return debugSecondRowOverrideCodeEditor as HaCodeEditorElement;
}

function syncDebugOverrideEnabledSwitch(): void {
  const sw = getDebugOverrideEnabledSwitch();
  if (sw) {
    sw.checked = isDebugOverrideEnabled();
  }
}

function syncDebugSecondRowControls(): void {
  const secondRowSwitch = getDebugSecondRowEnabledSwitch();
  if (secondRowSwitch) {
    secondRowSwitch.checked = isDebugSecondRowEnabled();
  }

  const secondRowOverrideSwitch = getDebugSecondRowOverrideEnabledSwitch();
  if (secondRowOverrideSwitch) {
    secondRowOverrideSwitch.checked = isDebugSecondRowOverrideEnabled();
  }
}

export function setupDebugEditor(): void {
  mockHaEditorComponents();

  const editor = getDebugOverrideCodeEditor();
  if (!editor) return;

  syncDebugOverrideEnabledSwitch();
  syncDebugSecondRowControls();

  const stored = getStoredDebugOverrideRaw();
  if (stored) {
    editor.value = stored;
  }

  const overrideSwitch = getDebugOverrideEnabledSwitch();
  if (overrideSwitch) {
    overrideSwitch.addEventListener('change', () => {
      setDebugOverrideEnabledFlag(overrideSwitch.checked);
      refreshConfigWithDebugOverride();
    });
  }

  const secondRowSwitch = getDebugSecondRowEnabledSwitch();
  if (secondRowSwitch) {
    secondRowSwitch.addEventListener('change', () => {
      setDebugSecondRowEnabledFlag(secondRowSwitch.checked);
      refreshConfigWithDebugOverride();
    });
  }

  const secondRowOverrideSwitch = getDebugSecondRowOverrideEnabledSwitch();
  if (secondRowOverrideSwitch) {
    secondRowOverrideSwitch.addEventListener('change', () => {
      setDebugSecondRowOverrideEnabledFlag(secondRowOverrideSwitch.checked);
      refreshConfigWithDebugOverride();
    });
  }

  let autoApplyTimeout: ReturnType<typeof setTimeout> | null = null;
  editor.addEventListener('value-changed', () => {
    if (autoApplyTimeout) {
      clearTimeout(autoApplyTimeout);
    }
    autoApplyTimeout = setTimeout(() => {
      handleDebugOverrideChange();
    }, 1000);
  });

  const secondRowOverrideEditor = getDebugSecondRowOverrideCodeEditor();
  if (secondRowOverrideEditor) {
    const storedSecondRow = getStoredDebugSecondRowOverrideRaw();
    if (storedSecondRow) {
      secondRowOverrideEditor.value = storedSecondRow;
    }

    let autoApplySecondRowTimeout: ReturnType<typeof setTimeout> | null = null;
    secondRowOverrideEditor.addEventListener('value-changed', () => {
      if (autoApplySecondRowTimeout) {
        clearTimeout(autoApplySecondRowTimeout);
      }
      autoApplySecondRowTimeout = setTimeout(() => {
        handleDebugSecondRowOverrideChange();
      }, 1000);
    });
  }
}
