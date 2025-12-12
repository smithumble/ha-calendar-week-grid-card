import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getMockCalendars } from '../parsers/yasno';
import { BaseProvider } from './base';
import type { MockCalendar } from './index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../../assets/data');
const YASNO_DATA_DIR = path.join(DATA_DIR, 'yasno', 'calendars');

export class YasnoProvider extends BaseProvider {
  constructor() {
    super('yasno');
  }

  getCalendars(dataSource?: string): MockCalendar[] {
    return getMockCalendars(dataSource);
  }

  getAvailableDataSources(): string[] {
    const dataSources: string[] = [];

    try {
      if (!fs.existsSync(YASNO_DATA_DIR)) {
        return dataSources;
      }

      const entries = fs.readdirSync(YASNO_DATA_DIR, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const dirPath = path.join(YASNO_DATA_DIR, entry.name);
        const plannedPath = path.join(dirPath, 'planned.json');
        const probablePath = path.join(dirPath, 'probable.json');

        if (fs.existsSync(plannedPath) && fs.existsSync(probablePath)) {
          dataSources.push(entry.name);
        }
      }
    } catch (error) {
      console.warn('Failed to scan yasno data directory:', error);
    }

    return dataSources.sort();
  }
}
