import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import type { CardConfig } from '../../src/calendar-week-grid-card';

const CONFIGS_DIR = path.resolve(__dirname, '../../media/configs');

export interface ConfigItem {
  name: string;
  config: CardConfig;
}

export function loadConfigs(): ConfigItem[] {
  const files = fs.readdirSync(CONFIGS_DIR);
  return files
    .filter((file) => file.endsWith('.yaml') || file.endsWith('.yml'))
    .map((file) => {
      const name = path.basename(file, path.extname(file));
      const content = fs.readFileSync(path.join(CONFIGS_DIR, file), 'utf8');
      return {
        name,
        config: yaml.load(content) as CardConfig,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
