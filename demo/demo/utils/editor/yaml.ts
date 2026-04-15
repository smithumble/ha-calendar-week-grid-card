/**
 * YAML editor functionality
 */

import yaml from 'js-yaml';
import { getCurrentConfig } from '../state';
import { getEditorElements } from './ui';

export { parseYamlConfig } from './parse';

/**
 * Update YAML editor with current config
 */
export function updateYamlEditor(): void {
  const { textarea } = getEditorElements();
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
  } catch (e) {
    console.error('Failed to serialize config:', e);
  }
}
