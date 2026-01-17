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

// Search manifest for files matching a pattern
function findAssetsInManifest(pattern: RegExp): string[] {
  return ASSET_MANIFEST.filter((path) => pattern.test(path));
}

// Get calendar JSON file paths from manifest
function getYasnoCalendarPaths(): Record<string, string> {
  const paths = findAssetsInManifest(
    /assets\/data\/yasno\/calendars\/.*\.json$/,
  );
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

const yasnoCalendarPaths = getYasnoCalendarPaths();
const yasnoConfigPaths = getConfigPaths('yasno');
const yasnoDeprecatedConfigPaths = getConfigPaths('yasno_deprecated');
const dummyConfigPaths = getConfigPaths('dummy');

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
  for (const path of Object.keys(yasnoCalendarPaths)) {
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
const YASNO_CALENDARS: Record<string, { planned: unknown; probable: unknown }> =
  {};
const YASNO_CONFIGS: Record<string, string> = {};
const YASNO_DEPRECATED_CONFIGS: Record<string, string> = {};
const DUMMY_CONFIGS: Record<string, string> = {};

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
    case 'yasno':
      pathMap = yasnoConfigPaths;
      break;
    case 'yasno_deprecated':
      pathMap = yasnoDeprecatedConfigPaths;
      break;
    case 'dummy':
      pathMap = dummyConfigPaths;
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
    const plannedPath = Object.keys(yasnoCalendarPaths).find((p) =>
      p.includes(`${dataSource}/planned.json`),
    );
    const probablePath = Object.keys(yasnoCalendarPaths).find((p) =>
      p.includes(`${dataSource}/probable.json`),
    );

    if (!plannedPath || !probablePath) {
      throw new Error(`Missing files for ${dataSource}`);
    }

    const [planned, probable] = await Promise.all([
      loadYasnoCalendarFile(plannedPath),
      loadYasnoCalendarFile(probablePath),
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
    case 'yasno':
      pathMap = yasnoConfigPaths;
      configCache = YASNO_CONFIGS;
      break;
    case 'yasno_deprecated':
      pathMap = yasnoDeprecatedConfigPaths;
      configCache = YASNO_DEPRECATED_CONFIGS;
      break;
    case 'dummy':
      pathMap = dummyConfigPaths;
      configCache = DUMMY_CONFIGS;
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
  if (provider === 'yasno' || provider === 'yasno_deprecated') {
    await loadYasnoCalendar(dataSource);
    return getYasnoCalendars(dataSource);
  } else if (provider === 'dummy') {
    return getDummyCalendars();
  }
  return [];
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

// Get provider data structure without loading all files
export function getProviderMetadata(): Record<
  string,
  Omit<ProviderData, 'calendars' | 'configs'>
> {
  const yasnoDataSources = extractYasnoDataSources();

  return {
    yasno: {
      dataSources: yasnoDataSources,
    },
    yasno_deprecated: {
      dataSources: yasnoDataSources,
    },
    dummy: {
      dataSources: ['data_1'],
    },
  };
}
