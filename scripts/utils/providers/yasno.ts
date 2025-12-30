import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getMockCalendars } from '../parsers/yasno';
import { BaseProvider } from './base';
import type { MockCalendar } from './index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../../assets/data');

// Mapping of data source to Monday index in probable events data
const DATA_SOURCE_MONDAY_INDEX: Record<string, number> = {
  yasno_1: 2,
  yasno_2: 2,
  yasno_3: 0,
  yasno_4: 0,
};

export class YasnoProvider extends BaseProvider {
  constructor(name: string = 'yasno') {
    super(name);
  }

  getCalendars(dataSource?: string): MockCalendar[] {
    if (!dataSource) {
      return getMockCalendars(dataSource);
    }

    const mondayIndex = DATA_SOURCE_MONDAY_INDEX[dataSource] ?? 0;
    return getMockCalendars(dataSource, mondayIndex);
  }

  getAvailableDataSources(): string[] {
    const dataSources: string[] = [];

    const yasnoDataDir = path.join(DATA_DIR, 'yasno', 'calendars');

    try {
      if (!fs.existsSync(yasnoDataDir)) {
        return dataSources;
      }

      const entries = fs.readdirSync(yasnoDataDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const dirPath = path.join(yasnoDataDir, entry.name);
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
