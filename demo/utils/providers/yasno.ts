import type { Calendar } from '../data';
import { MOCK_DATE_STR } from '../datetime';
import {
  parseYasnoData,
  type PlannedData,
  type ProbableData,
} from '../parsers/yasno';
import { BaseProvider } from './base';

interface YasnoCalendarData {
  planned: PlannedData;
  probable: ProbableData;
}

// Mapping of data source to Monday index in probable events data
const DATA_SOURCE_MONDAY_INDEX: Record<string, number> = {
  yasno_1: 2,
  yasno_2: 2,
  yasno_3: 0,
  yasno_4: 0,
  yasno_5: 0,
  yasno_6: 0,
};

/**
 * Yasno data provider (handles yasno_image, yasno_v1, yasno_v2, yasno_v3)
 */
export class YasnoProvider extends BaseProvider {
  readonly name: string;
  readonly hidden: boolean;
  readonly mockDate?: Date = new Date(MOCK_DATE_STR);

  private configPaths: Record<string, string> = {};
  private calendarPaths: Record<string, string> = {};
  private calendarsCache: Record<string, YasnoCalendarData> = {};
  private loadedCalendars: Set<string> = new Set();
  private dataSourcesCache: string[] | null = null;

  constructor(
    name: string,
    configPaths: Record<string, string>,
    calendarPaths: Record<string, string>,
    options: { hidden?: boolean } = {},
  ) {
    super();
    this.name = name;
    this.configPaths = configPaths;
    this.calendarPaths = calendarPaths;
    this.hidden = options.hidden ?? false;
  }

  getDataSources(): string[] {
    if (this.dataSourcesCache) {
      return this.dataSourcesCache;
    }

    const dataSources = new Set<string>();
    for (const path of Object.keys(this.calendarPaths)) {
      const match = path.match(/yasno_(\d+)\/(planned|probable)\.json$/);
      if (match) {
        dataSources.add(`yasno_${match[1]}`);
      }
    }

    this.dataSourcesCache = Array.from(dataSources).sort();
    return this.dataSourcesCache;
  }

  getConfigNames(): string[] {
    return Object.keys(this.configPaths)
      .map((path) => this.extractConfigName(path))
      .filter(Boolean)
      .sort();
  }

  async loadCalendars(dataSource: string): Promise<Calendar[]> {
    await this.loadYasnoCalendar(dataSource);
    return this.getYasnoCalendars(dataSource);
  }

  async loadConfigContent(configName: string): Promise<string | null> {
    // Check cache
    if (this.configCache[configName]) {
      return this.configCache[configName];
    }

    // Find file path
    const filePath = Object.keys(this.configPaths).find(
      (path) => this.extractConfigName(path) === configName,
    );

    if (!filePath) {
      console.warn(`Config file not found for ${configName} in ${this.name}`);
      return null;
    }

    try {
      const content = await this.loadYamlFile(this.configPaths[filePath]);
      this.configCache[configName] = content;
      return content;
    } catch (error) {
      console.warn(
        `Failed to load config ${configName} from ${this.name}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Load a single calendar data source
   */
  private async loadYasnoCalendar(dataSource: string): Promise<void> {
    if (this.loadedCalendars.has(dataSource)) {
      return;
    }

    try {
      const plannedPath = Object.keys(this.calendarPaths).find((p) =>
        p.includes(`${dataSource}/planned.json`),
      );
      const probablePath = Object.keys(this.calendarPaths).find((p) =>
        p.includes(`${dataSource}/probable.json`),
      );

      if (!plannedPath || !probablePath) {
        throw new Error(`Missing files for ${dataSource}`);
      }

      const [planned, probable] = await Promise.all([
        this.loadCalendarFile(plannedPath),
        this.loadCalendarFile(probablePath),
      ]);

      this.calendarsCache[dataSource] = {
        planned: planned as PlannedData,
        probable: probable as ProbableData,
      };
      this.loadedCalendars.add(dataSource);
    } catch (error) {
      console.warn(`Failed to load calendar for ${dataSource}:`, error);
      throw error;
    }
  }

  /**
   * Load calendar JSON file via HTTP
   */
  private async loadCalendarFile(
    url: string,
  ): Promise<PlannedData | ProbableData> {
    return this.fetchResource(url, (r) => r.json(), 'calendar file');
  }

  /**
   * Get calendars from loaded Yasno data
   */
  private getYasnoCalendars(dataSource: string): Calendar[] {
    const calendarData = this.calendarsCache[dataSource];
    if (!calendarData) {
      return [];
    }

    const mondayIndex = DATA_SOURCE_MONDAY_INDEX[dataSource] ?? 0;
    return parseYasnoData(
      calendarData.planned,
      calendarData.probable,
      mondayIndex,
      '6.1',
      this.mockDate,
    ) as Calendar[];
  }
}
