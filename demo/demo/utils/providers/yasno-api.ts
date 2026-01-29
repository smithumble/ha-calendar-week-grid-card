import { getCached, setCached } from '../cache';
import type { Calendar, DataSource } from '../data';
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

/**
 * Parse value and calculate numeric index for sorting
 * Splits by "." and "-" and converts each part to a number
 * Returns null if parsing fails
 */
function calculateNumericIndex(value: string): number | null {
  try {
    // Split by both "." and "-"
    const parts = value.split(/[.-]/);
    const numbers = parts.map((part) => {
      const num = parseInt(part, 10);
      if (isNaN(num)) {
        throw new Error(`Cannot parse part: ${part}`);
      }
      return num;
    });

    // Calculate index as a weighted sum to preserve order
    // Each part contributes: part * (1000 ^ position)
    // This allows up to 999 per part before overflow
    let index = 0;
    for (let i = 0; i < numbers.length; i++) {
      index += numbers[i] * Math.pow(1000, numbers.length - 1 - i);
    }

    return index;
  } catch {
    return null;
  }
}

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

  async getDataSources(): Promise<DataSource[]> {
    // Fetch both planned and probable outages (already has cache)
    const [plannedData, probableData] = await Promise.all([
      this.fetchPlannedOutages(),
      this.fetchProbableOutages(),
    ]);

    // Extract groups from planned outages
    const plannedGroups = Object.keys(plannedData).sort();
    if (plannedGroups.length === 0) {
      return [];
    }

    // Extract groups from probable outages
    const probableGroups = Object.keys(
      probableData[REGION_ID]?.dsos?.[DSO_ID]?.groups || {},
    ).sort();
    if (probableGroups.length === 0) {
      return [];
    }

    // Check if both lists are fully identical
    const listsAreIdentical =
      plannedGroups.length === probableGroups.length &&
      plannedGroups.every((group, index) => group === probableGroups[index]);

    // Construct data sources
    const dataSources: DataSource[] = [];

    if (listsAreIdentical) {
      // If lists are identical, use single groups
      for (const group of plannedGroups) {
        const index = calculateNumericIndex(group);
        dataSources.push({
          value: group,
          name: group,
          ...(index !== null && { index }),
        });
      }
    } else {
      // If lists differ, create all combinations
      for (const probableGroup of probableGroups) {
        for (const plannedGroup of plannedGroups) {
          const value = `${probableGroup}-${plannedGroup}`;
          const index = calculateNumericIndex(value);
          dataSources.push({
            value,
            name: value,
            ...(index !== null && { index }),
          });
        }
      }
    }

    return dataSources;
  }

  async loadCalendars(dataSource: string): Promise<Calendar[]> {
    const validDataSources = await this.getDataSources();
    const validValues = validDataSources.map((ds) => ds.value);
    if (!validValues.includes(dataSource)) {
      console.warn(`Invalid data source: ${dataSource}`);
      return [];
    }

    try {
      // Parse data source format
      // If it contains "-", it's a combination: [probable-group]-[planned-group]
      // Otherwise, it's a single common group used for both
      let probableGroupKey: string;
      let plannedGroupKey: string;

      const lastHyphenIndex = dataSource.lastIndexOf('-');
      if (lastHyphenIndex === -1) {
        // Single group format (e.g., "6.1") - use same group for both
        probableGroupKey = dataSource;
        plannedGroupKey = dataSource;
      } else {
        // Combination format (e.g., "1.1-6.1")
        probableGroupKey = dataSource.substring(0, lastHyphenIndex);
        plannedGroupKey = dataSource.substring(lastHyphenIndex + 1);
        if (!probableGroupKey || !plannedGroupKey) {
          console.warn(`Invalid data source format: ${dataSource}`);
          return [];
        }
      }

      // Fetch both planned and probable data from API
      const [plannedData, probableData] = await Promise.all([
        this.fetchPlannedOutages(),
        this.fetchProbableOutages(),
      ]);

      const currentDay = this.mockDate
        ? this.mockDate.getDay()
        : new Date().getDay();
      const mondayIndex = currentDay - 1;

      return parseYasnoData(
        plannedData,
        probableData,
        mondayIndex,
        plannedGroupKey,
        probableGroupKey,
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
