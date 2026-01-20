import { ASSET_MANIFEST } from 'virtual:asset-manifest';
import { BaseProvider } from './providers/base';
import { DummyProvider } from './providers/dummy';
import { YasnoProvider } from './providers/yasno';
import { YasnoApiProvider } from './providers/yasno-api';

/**
 * Search manifest for files matching a pattern
 */
function findAssetsInManifest(pattern: RegExp): string[] {
  return ASSET_MANIFEST.filter((path) => pattern.test(path));
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
    const yasnoCalendarPaths = getYasnoCalendarPaths();

    // Register dummy provider
    this.registerProvider(new DummyProvider(getConfigPaths('dummy')));

    // Register yasno providers
    this.registerProvider(
      new YasnoProvider(
        'yasno_image',
        getConfigPaths('yasno_image'),
        yasnoCalendarPaths,
      ),
    );

    this.registerProvider(
      new YasnoProvider(
        'yasno_v1',
        getConfigPaths('yasno_v1'),
        yasnoCalendarPaths,
      ),
    );

    this.registerProvider(
      new YasnoProvider(
        'yasno_v2',
        getConfigPaths('yasno_v2'),
        yasnoCalendarPaths,
      ),
    );

    this.registerProvider(
      new YasnoProvider(
        'yasno_v3',
        getConfigPaths('yasno_v3'),
        yasnoCalendarPaths,
      ),
    );

    // Register yasno API provider (uses yasno_v3 configs)
    this.registerProvider(new YasnoApiProvider(getConfigPaths('yasno_v3')));
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

  /**
   * Get metadata for all providers
   */
  getAllMetadata(): Record<string, ReturnType<BaseProvider['getMetadata']>> {
    const metadata: Record<
      string,
      ReturnType<BaseProvider['getMetadata']>
    > = {};

    for (const [name, provider] of this.providers) {
      metadata[name] = provider.getMetadata();
    }

    return metadata;
  }
}

// Singleton instance
export const providerRegistry = new ProviderRegistry();
