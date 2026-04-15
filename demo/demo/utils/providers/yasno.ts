import type { Calendar, DataSource } from '../data';
import { MOCK_TIME_STR } from '../datetime';
import {
  parseYasnoData,
  type PlannedData,
  type ProbableData,
} from '../parsers/yasno';
import { BaseProvider } from './base';
import { CardConfig } from '@/types';

interface YasnoCalendarData {
  planned: PlannedData;
  probable: ProbableData;
}

const YASNO_GROUP_KEY = '6.1';

/**
 * Yasno data provider
 */
export class YasnoProvider extends BaseProvider {
  readonly name: string;

  private calendarPaths: Record<string, string> = {};
  private calendarsCache: Record<string, YasnoCalendarData> = {};
  private dataSourcesCache: DataSource[] | null = null;

  constructor(
    name: string,
    configPaths: Record<string, string>,
    calendarPaths: Record<string, string>,
    options?: {
      defaultConfig?: string;
      defaultDataSource?: string;
    },
    configOverrides?: Partial<CardConfig>,
  ) {
    super();
    this.name = name;
    this.configPaths = configPaths;
    this.calendarPaths = calendarPaths;
    this.defaultConfig = options?.defaultConfig;
    this.defaultDataSource = options?.defaultDataSource;
    this.configOverrides = configOverrides;
  }

  getDataSources(): DataSource[] {
    if (this.dataSourcesCache) {
      return this.dataSourcesCache;
    }

    const dataSources = new Set<string>();
    for (const path of Object.keys(this.calendarPaths)) {
      const match = path.match(/([^/]+)\/(planned|probable)\.json$/);
      if (match) {
        dataSources.add(match[1]);
      }
    }

    this.dataSourcesCache = Array.from(dataSources)
      .sort()
      .map((value) => ({ value, name: value }));
    return this.dataSourcesCache;
  }

  async loadCalendars(dataSource: string): Promise<Calendar[]> {
    await this.loadYasnoCalendar(dataSource);
    return this.getYasnoCalendars(dataSource);
  }

  /**
   * Load a single calendar data source
   */
  private async loadYasnoCalendar(dataSource: string): Promise<void> {
    if (this.calendarsCache[dataSource]) {
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

    const mockDate = this.getMockDate(dataSource);

    return parseYasnoData(
      calendarData.planned,
      calendarData.probable,
      YASNO_GROUP_KEY,
      YASNO_GROUP_KEY,
      mockDate,
    ) as Calendar[];
  }

  getMockDate(dataSource: string): Date | undefined {
    const cached = this.calendarsCache[dataSource];
    if (!cached) {
      return super.getMockDate(dataSource);
    }

    const plannedGroup =
      cached.planned[YASNO_GROUP_KEY] ?? Object.values(cached.planned)[0];
    if (!plannedGroup) {
      return super.getMockDate(dataSource);
    }

    const plannedDayEntries = Object.values(plannedGroup).filter(
      (value): value is { date?: string } =>
        typeof value === 'object' && value !== null,
    );
    const firstDate = plannedDayEntries
      .map((entry) => entry.date)
      .find((date): date is string => Boolean(date));
    if (!firstDate) {
      return super.getMockDate(dataSource);
    }

    const match = firstDate.match(
      /^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})?$/,
    );
    if (!match) {
      return super.getMockDate(dataSource);
    }

    const [, datePart, timezoneSuffix = ''] = match;
    const mockDateStr = `${datePart}T${MOCK_TIME_STR}${timezoneSuffix}`;
    const mockDate = new Date(mockDateStr);
    return mockDate;
  }
}
