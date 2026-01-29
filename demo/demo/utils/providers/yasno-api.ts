import { getCached, setCached } from '../cache';
import type { Calendar } from '../data';
import {
  parseYasnoData,
  type PlannedData,
  type ProbableData,
} from '../parsers/yasno';
import { BaseProvider } from './base';

// API endpoints
const PLANNED_OUTAGES_ENDPOINT =
  'https://app.yasno.ua/api/blackout-service/public/shutdowns/regions/{region_id}/dsos/{dso_id}/planned-outages';
const PROBABLE_OUTAGES_ENDPOINT =
  'https://app.yasno.ua/api/blackout-service/public/shutdowns/probable-outages?regionId={region_id}&dsoId={dso_id}';

// CORS proxy for demo environment (optional)
// Set to empty string to use direct API calls
const CORS_PROXY = 'https://api.cors.lol/?url=';
// const CORS_PROXY = ''; // Uncomment to disable CORS proxy

// Default region and DSO IDs
const REGION_ID = '25';
const DSO_ID = '902';

// Available data sources
const DATA_SOURCES = [
  '1.1',
  '1.2',
  '2.1',
  '2.2',
  '3.1',
  '3.2',
  '4.1',
  '4.2',
  '5.1',
  '5.2',
  '6.1',
  '6.2',
];

/**
 * Yasno API data provider - fetches data from API in real-time
 */
export class YasnoApiProvider extends BaseProvider {
  readonly name = 'yasno_api';
  readonly mockDate?: Date;
  private cacheTtlMs: number;

  constructor(
    configPaths: Record<string, string> = {},
    options?: {
      defaultConfig?: string;
      defaultDataSource?: string;
      cacheTtlMinutes?: number;
    },
  ) {
    super();
    this.configPaths = configPaths;
    this.defaultConfig = options?.defaultConfig;
    this.defaultDataSource = options?.defaultDataSource;
    this.cacheTtlMs =
      options?.cacheTtlMinutes !== undefined
        ? options.cacheTtlMinutes * 60 * 1000
        : 0; // Default: disabled
  }

  getDataSources(): string[] {
    return DATA_SOURCES;
  }

  async loadCalendars(dataSource: string): Promise<Calendar[]> {
    if (!DATA_SOURCES.includes(dataSource)) {
      console.warn(`Invalid data source: ${dataSource}`);
      return [];
    }

    try {
      // Fetch both planned and probable data from API
      const [plannedData, probableData] = await Promise.all([
        this.fetchPlannedOutages(),
        this.fetchProbableOutages(),
      ]);

      // Parse the data using the yasno parser
      return parseYasnoData(
        plannedData,
        probableData,
        0,
        dataSource,
        this.mockDate,
      );
    } catch (error) {
      console.error(
        `Failed to load calendars for ${dataSource} from API:`,
        error,
      );
      return [];
    }
  }

  /**
   * Fetch data with caching support
   */
  private async fetchWithCache<T>(
    cacheKey: string,
    fetchFn: () => Promise<T>,
  ): Promise<T> {
    // Check cache first if caching is enabled
    if (this.cacheTtlMs > 0) {
      const cached = getCached<T>(cacheKey, this.cacheTtlMs);
      if (cached) {
        return cached;
      }
    }

    // Fetch from API
    const data = await fetchFn();

    // Cache the result if caching is enabled
    if (this.cacheTtlMs > 0) {
      setCached(cacheKey, data, this.cacheTtlMs);
    }

    return data;
  }

  /**
   * Fetch planned outages from API
   */
  private async fetchPlannedOutages(): Promise<PlannedData> {
    const cacheKey = `yasno_cache_planned_${REGION_ID}_${DSO_ID}`;
    let url = PLANNED_OUTAGES_ENDPOINT;
    url = url.replace('{region_id}', REGION_ID);
    url = url.replace('{dso_id}', DSO_ID);
    url = `${CORS_PROXY}${encodeURIComponent(url)}`;

    return this.fetchWithCache(cacheKey, () =>
      this.fetchResource(url, (r) => r.json(), 'planned outages'),
    );
  }

  /**
   * Fetch probable outages from API
   */
  private async fetchProbableOutages(): Promise<ProbableData> {
    const cacheKey = `yasno_cache_probable_${REGION_ID}_${DSO_ID}`;
    let url = PROBABLE_OUTAGES_ENDPOINT;
    url = url.replace('{region_id}', REGION_ID);
    url = url.replace('{dso_id}', DSO_ID);
    url = `${CORS_PROXY}${encodeURIComponent(url)}`;

    return this.fetchWithCache(cacheKey, () =>
      this.fetchResource(url, (r) => r.json(), 'probable outages'),
    );
  }
}
