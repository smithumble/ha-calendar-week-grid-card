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
const CORS_PROXY = 'https://corsproxy.io/?';
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
  readonly hidden = false;

  private configPaths: Record<string, string> = {};
  private dataSourcesCache: string[] | null = null;

  constructor(configPaths: Record<string, string> = {}) {
    super();
    this.configPaths = configPaths;
  }

  getDataSources(): string[] {
    if (this.dataSourcesCache) {
      return this.dataSourcesCache;
    }

    this.dataSourcesCache = [...DATA_SOURCES];
    return this.dataSourcesCache;
  }

  getConfigNames(): string[] {
    return Object.keys(this.configPaths)
      .map((path) => this.extractConfigName(path))
      .filter(Boolean)
      .sort();
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
        false,
      );
    } catch (error) {
      console.error(
        `Failed to load calendars for ${dataSource} from API:`,
        error,
      );
      return [];
    }
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
   * Fetch planned outages from API
   */
  private async fetchPlannedOutages(): Promise<PlannedData> {
    const url = PLANNED_OUTAGES_ENDPOINT.replace(
      '{region_id}',
      REGION_ID,
    ).replace('{dso_id}', DSO_ID);
    const proxiedUrl = CORS_PROXY ? `${CORS_PROXY}${encodeURIComponent(url)}` : url;
    return this.fetchResource(proxiedUrl, (r) => r.json(), 'planned outages');
  }

  /**
   * Fetch probable outages from API
   */
  private async fetchProbableOutages(): Promise<ProbableData> {
    const url = PROBABLE_OUTAGES_ENDPOINT.replace(
      '{region_id}',
      REGION_ID,
    ).replace('{dso_id}', DSO_ID);
    const proxiedUrl = CORS_PROXY ? `${CORS_PROXY}${encodeURIComponent(url)}` : url;
    return this.fetchResource(proxiedUrl, (r) => r.json(), 'probable outages');
  }
}
