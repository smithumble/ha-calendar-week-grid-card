import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import type { CalendarProvider, ConfigItem } from './index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../../assets/data');

export abstract class BaseProvider implements CalendarProvider {
  protected readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  abstract getCalendars(dataSource?: string): import('./index').MockCalendar[];
  abstract getAvailableDataSources(): string[];

  getConfigs(): ConfigItem[] {
    const configs: ConfigItem[] = [];

    const configsDir = path.join(DATA_DIR, this.name, 'configs');
    if (!fs.existsSync(configsDir)) {
      return configs;
    }

    try {
      const files = fs.readdirSync(configsDir);
      for (const file of files) {
        if (!file.endsWith('.yaml') && !file.endsWith('.yml')) continue;

        const filePath = path.join(configsDir, file);
        const name = path.basename(file, path.extname(file));
        const content = fs.readFileSync(filePath, 'utf8');

        configs.push({
          name: name,
          config: yaml.load(content) as any,
        });
      }
    } catch (error) {
      console.warn(`Failed to load ${this.name} configs:`, error);
    }

    return configs.sort((a, b) => a.name.localeCompare(b.name));
  }
}
