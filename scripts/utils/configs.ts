import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIGS_DIR = path.resolve(__dirname, '../../assets/configs');

export interface ConfigItem {
  name: string;
  config: any;
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
        config: yaml.load(content) as any,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
