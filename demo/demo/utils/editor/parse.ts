/**
 * YAML → CardConfig parsing only (no demo state / UI imports).
 */

import yaml from 'js-yaml';
import type { CardConfig } from '../../../../src/types';

/**
 * Parse YAML text into config object.
 * Throws an error if parsing fails.
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
