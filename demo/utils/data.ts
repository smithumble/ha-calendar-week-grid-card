import yaml from 'js-yaml';
import { ASSET_MANIFEST } from 'virtual:asset-manifest';
import type { CardConfig } from '../../src/types';
import { getDummyCalendars } from './parsers/dummy';
import { parseYasnoData, ProbableData, PlannedData } from './parsers/yasno';

export interface ConfigItem {
  name: string;
  config: CardConfig;
}

export interface Calendar {
  entity_id: string;
  events: unknown[];
}

export interface ProviderData {
  calendars: Record<string, Calendar[]>;
  configs: ConfigItem[];
  dataSources: string[];
}

interface YasnoCalendarData {
  planned: PlannedData;
  probable: ProbableData;
}

// Search manifest for files matching a pattern
function findAssetsInManifest(pattern: RegExp): string[] {
  return ASSET_MANIFEST.filter((path) => pattern.test(path));
}

// Get calendar JSON file paths from manifest
function getYasnoCalendarPaths(): Record<string, string> {
  const pattern = new RegExp(`assets/data/yasno/calendars/.*\\.json$`);
  const paths = findAssetsInManifest(pattern);
  const result: Record<string, string> = {};
  for (const path of paths) {
    result[path] = path;
  }
  return result;
}

// Get config YAML file paths from manifest
function getConfigPaths(configDir: string): Record<string, string> {
  const pattern = new RegExp(
    `assets/data/${configDir}/configs/.*\\.(yaml|yml)$`,
  );
  const paths = findAssetsInManifest(pattern);
  const result: Record<string, string> = {};
  for (const path of paths) {
    result[path] = path;
  }
  return result;
}

const YASNO_CALENDAR_PATHS = getYasnoCalendarPaths();

const DUMMY_CONFIG_PATHS = getConfigPaths('dummy');
const YASNO_IMAGE_CONFIG_PATHS = getConfigPaths('yasno_image');
const YASNO_V1_CONFIG_PATHS = getConfigPaths('yasno_v1');
const YASNO_V2_CONFIG_PATHS = getConfigPaths('yasno_v2');
const YASNO_V3_CONFIG_PATHS = getConfigPaths('yasno_v3');

// Load YAML file at runtime via HTTP
async function loadYamlFile(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load ${url}: ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    console.error(`Failed to load YAML file ${url}:`, error);
    throw error;
  }
}

// Extract data sources from scanned paths
function extractYasnoDataSources(): string[] {
  const dataSources = new Set<string>();
  for (const path of Object.keys(YASNO_CALENDAR_PATHS)) {
    const match = path.match(/yasno_(\d+)\/(planned|probable)\.json$/);
    if (match) {
      dataSources.add(`yasno_${match[1]}`);
    }
  }
  return Array.from(dataSources).sort();
}

// Load calendar JSON files at runtime via HTTP
async function loadYasnoCalendarFile(
  url: string,
): Promise<PlannedData | ProbableData> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load ${url}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to load calendar file ${url}:`, error);
    throw error;
  }
}

// These will be populated lazily at runtime
const YASNO_CALENDARS: Record<string, YasnoCalendarData> = {};
const DUMMY_CONFIGS: Record<string, string> = {};
const YASNO_IMAGE_CONFIGS: Record<string, string> = {};
const YASNO_V1_CONFIGS: Record<string, string> = {};
const YASNO_V2_CONFIGS: Record<string, string> = {};
const YASNO_V3_CONFIGS: Record<string, string> = {};

// Track what's been loaded
const loadedCalendars: Set<string> = new Set();

// Mapping of data source to Monday index in probable events data
const DATA_SOURCE_MONDAY_INDEX: Record<string, number> = {
  yasno_1: 2,
  yasno_2: 2,
  yasno_3: 0,
  yasno_4: 0,
  yasno_5: 0,
  yasno_6: 0,
};

// Get available config names without loading configs
export function getAvailableConfigNames(provider: string): string[] {
  let pathMap: Record<string, string>;
  switch (provider) {
    case 'dummy':
      pathMap = DUMMY_CONFIG_PATHS;
      break;
    case 'yasno_image':
      pathMap = YASNO_IMAGE_CONFIG_PATHS;
      break;
    case 'yasno_v1':
      pathMap = YASNO_V1_CONFIG_PATHS;
      break;
    case 'yasno_v2':
      pathMap = YASNO_V2_CONFIG_PATHS;
      break;
    case 'yasno_v3':
      pathMap = YASNO_V3_CONFIG_PATHS;
      break;
    default:
      return [];
  }

  return Object.keys(pathMap)
    .map((filePath) => {
      const fileName = filePath
        .split('/')
        .pop()
        ?.replace(/\.(yaml|yml)$/, '');
      return fileName || '';
    })
    .filter(Boolean)
    .sort();
}

// Load a single calendar data source
async function loadYasnoCalendar(dataSource: string): Promise<void> {
  if (loadedCalendars.has(dataSource)) {
    return;
  }

  try {
    const plannedPath = Object.keys(YASNO_CALENDAR_PATHS).find((p) =>
      p.includes(`${dataSource}/planned.json`),
    );
    const probablePath = Object.keys(YASNO_CALENDAR_PATHS).find((p) =>
      p.includes(`${dataSource}/probable.json`),
    );

    if (!plannedPath || !probablePath) {
      throw new Error(`Missing files for ${dataSource}`);
    }

    const [planned, probable] = await Promise.all([
      loadYasnoCalendarFile(plannedPath) as Promise<PlannedData>,
      loadYasnoCalendarFile(probablePath) as Promise<ProbableData>,
    ]);

    YASNO_CALENDARS[dataSource] = { planned, probable };
    loadedCalendars.add(dataSource);
  } catch (error) {
    console.warn(`Failed to load calendar for ${dataSource}:`, error);
    throw error;
  }
}

// Load a single config file by name
async function loadSingleConfig(
  provider: string,
  configName: string,
): Promise<string | null> {
  let pathMap: Record<string, string>;
  let configCache: Record<string, string>;

  switch (provider) {
    case 'dummy':
      pathMap = DUMMY_CONFIG_PATHS;
      configCache = DUMMY_CONFIGS;
      break;
    case 'yasno_image':
      pathMap = YASNO_IMAGE_CONFIG_PATHS;
      configCache = YASNO_IMAGE_CONFIGS;
      break;
    case 'yasno_v1':
      pathMap = YASNO_V1_CONFIG_PATHS;
      configCache = YASNO_V1_CONFIGS;
      break;
    case 'yasno_v2':
      pathMap = YASNO_V2_CONFIG_PATHS;
      configCache = YASNO_V2_CONFIGS;
      break;
    case 'yasno_v3':
      pathMap = YASNO_V3_CONFIG_PATHS;
      configCache = YASNO_V3_CONFIGS;
      break;
    default:
      return null;
  }

  // Check if already loaded
  if (configCache[configName]) {
    return configCache[configName];
  }

  // Find the file path for this config name
  const filePath = Object.keys(pathMap).find((path) => {
    const fileName = path
      .split('/')
      .pop()
      ?.replace(/\.(yaml|yml)$/, '');
    return fileName === configName;
  });

  if (!filePath) {
    console.warn(`Config file not found for ${configName} in ${provider}`);
    return null;
  }

  try {
    const content = await loadYamlFile(pathMap[filePath]);
    configCache[configName] = content;
    return content;
  } catch (error) {
    console.warn(
      `Failed to load config ${configName} from ${provider}:`,
      error,
    );
    return null;
  }
}

function getYasnoCalendars(dataSource: string): Calendar[] {
  const calendarData = YASNO_CALENDARS[dataSource];
  if (!calendarData) return [];

  const mondayIndex = DATA_SOURCE_MONDAY_INDEX[dataSource] ?? 0;
  return parseYasnoData(
    calendarData.planned as PlannedData,
    calendarData.probable as ProbableData,
    mondayIndex,
  ) as Calendar[];
}

// Load calendars for a specific data source
export async function loadCalendarsForDataSource(
  dataSource: string,
  provider: string,
): Promise<Calendar[]> {
  switch (provider) {
    case 'dummy':
      return getDummyCalendars();
    case 'yasno_image':
      await loadYasnoCalendar(dataSource);
      return getYasnoCalendars(dataSource);
    case 'yasno_v1':
      await loadYasnoCalendar(dataSource);
      return getYasnoCalendars(dataSource);
    case 'yasno_v2':
      await loadYasnoCalendar(dataSource);
      return getYasnoCalendars(dataSource);
    case 'yasno_v3':
      await loadYasnoCalendar(dataSource);
      return getYasnoCalendars(dataSource);
    default:
      return [];
  }
}

// Load a single config by name
export async function loadConfigByName(
  provider: string,
  configName: string,
): Promise<CardConfig | null> {
  const yamlContent = await loadSingleConfig(provider, configName);
  if (!yamlContent) {
    return null;
  }

  try {
    return yaml.load(yamlContent) as CardConfig;
  } catch (error) {
    console.warn(`Failed to parse config ${configName}:`, error);
    return null;
  }
}

// Providers that should be hidden from the dropdown but still accessible via query params
const HIDDEN_PROVIDERS: string[] = ['yasno_image'];

// Get list of providers that should be visible in the dropdown
export function getVisibleProviders(allProviders: string[]): string[] {
  return allProviders.filter(
    (provider) => !HIDDEN_PROVIDERS.includes(provider),
  );
}

// Get provider data structure without loading all files
export function getProviderMetadata(): Record<
  string,
  Omit<ProviderData, 'calendars' | 'configs'>
> {
  const yasnoDataSources = extractYasnoDataSources();

  return {
    dummy: {
      dataSources: ['data_1'],
    },
    yasno_image: {
      dataSources: yasnoDataSources,
    },
    yasno_v1: {
      dataSources: yasnoDataSources,
    },
    yasno_v2: {
      dataSources: yasnoDataSources,
    },
    yasno_v3: {
      dataSources: yasnoDataSources,
    },
  };
}
