/**
 * YAML editor functionality
 */

import yaml from 'js-yaml';
import type { CardConfig } from '../../../../src/types';
import { getCurrentConfig } from '../state';
import { getEditorElements } from './ui';

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

/**
 * Parse YAML text into config object
 * Throws an error if parsing fails
 */
export function parseYamlConfig(yamlText: string): CardConfig {
  try {
    const parsed = yaml.load(yamlText) as CardConfig | undefined;
    if (!parsed) {
      throw new Error('YAML parsed to empty or undefined value');
    }
    return parsed;
  } catch (e) {
    throw new Error(
      `Invalid YAML: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}
