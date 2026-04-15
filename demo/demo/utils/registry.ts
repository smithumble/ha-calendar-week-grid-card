import { getAssetManifest } from './manifest';
import { BaseProvider } from './providers/base';
import { DummyProvider } from './providers/dummy';
import { YasnoProvider } from './providers/yasno';
import { YasnoApiProvider } from './providers/yasno-api';

/**
 * Search manifest for files matching a pattern
 */
function findAssetsInManifest(pattern: RegExp): string[] {
  return getAssetManifest().filter((path) => pattern.test(path));
}

/**
 * Get paths from manifest as a Record
 */
function getPathsFromManifest(pattern: RegExp): Record<string, string> {
  const paths = findAssetsInManifest(pattern);
  return Object.fromEntries(paths.map((path) => [path, path]));
}

/**
 * Get calendar JSON file paths from manifest
 */
function getYasnoCalendarPaths(): Record<string, string> {
  const pattern = /assets\/data\/yasno\/calendars\/.*\.json$/;
  return getPathsFromManifest(pattern);
}

/**
 * Get calendar JSON file paths from manifest
 */
function getYasnoImageCalendarPaths(): Record<string, string> {
  const pattern = /assets\/data\/yasno_image\/calendars\/.*\.json$/;
  return getPathsFromManifest(pattern);
}

/**
 * Get config YAML file paths from manifest
 */
function getConfigPaths(configDir: string): Record<string, string> {
  const pattern = new RegExp(
    `assets/data/${configDir}/configs/.*\\.(yaml|yml)$`,
  );
  return getPathsFromManifest(pattern);
}

/**
 * Provider Registry - manages all data providers
 */
export class ProviderRegistry {
  private providers: Map<string, BaseProvider> = new Map();

  constructor() {
    this.initializeProviders();
  }

  /**
   * Initialize all providers
   */
  private initializeProviders(): void {
    // Register dummy provider
    this.registerProvider(
      new DummyProvider(
        getConfigPaths('dummy'), //
      ),
    );

    // Register yasno providers
    this.registerProvider(
      new YasnoProvider(
        'yasno_v1',
        getConfigPaths('yasno_v1'),
        getYasnoCalendarPaths(),
        {
          defaultConfig: 'basic',
          defaultDataSource: 'yasno_1',
        },
      ),
    );

    this.registerProvider(
      new YasnoProvider(
        'yasno_v2',
        getConfigPaths('yasno_v2'),
        getYasnoCalendarPaths(),
        {
          defaultConfig: 'basic',
          defaultDataSource: 'yasno_1',
        },
      ),
    );

    this.registerProvider(
      new YasnoProvider(
        'yasno_v3',
        getConfigPaths('yasno_v3'),
        getYasnoCalendarPaths(),
        {
          defaultConfig: 'basic',
          defaultDataSource: 'yasno_1',
        },
      ),
    );

    this.registerProvider(
      new YasnoProvider(
        'yasno_v4',
        getConfigPaths('yasno_v4'),
        getYasnoCalendarPaths(),
        {
          defaultConfig: 'google_calendar',
          defaultDataSource: 'yasno_1',
        },
      ),
    );

    // Register yasno API provider
    this.registerProvider(
      new YasnoApiProvider(
        getConfigPaths('yasno_v4'), //
        {
          defaultConfig: 'google_calendar',
          defaultDataSource: 'yasno_1',
          cacheTtlMinutes: 5,
        },
      ),
    );

    this.registerProvider(
      new YasnoProvider(
        'yasno_image',
        getConfigPaths('yasno_v4'),
        getYasnoImageCalendarPaths(),
        {
          defaultConfig: 'google_calendar',
          defaultDataSource: 'yasno_1',
        },
        {
          time_format: 'h A',
          start_hour: 7,
          end_hour: 22,
          days: 8,
          week_start: 'sunday',
        },
      ),
    );
  }

  /**
   * Register a provider
   */
  private registerProvider(provider: BaseProvider): void {
    this.providers.set(provider.name, provider);
  }

  /**
   * Get a provider by name
   */
  getProvider(name: string): BaseProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Get all provider names
   */
  getAllProviderNames(): string[] {
    return Array.from(this.providers.keys());
  }
}

let providerRegistrySingleton: ProviderRegistry | null = null;

function getProviderRegistrySingleton(): ProviderRegistry {
  if (!providerRegistrySingleton) {
    providerRegistrySingleton = new ProviderRegistry();
  }
  return providerRegistrySingleton;
}

/**
 * Lazily constructs the registry so it runs after entry `setAssetManifest(...)`
 * (Rollup may evaluate shared chunks before the entry’s manifest side effect).
 */
export const providerRegistry = {
  getProvider(name: string): BaseProvider | undefined {
    return getProviderRegistrySingleton().getProvider(name);
  },
  getAllProviderNames(): string[] {
    return getProviderRegistrySingleton().getAllProviderNames();
  },
};
