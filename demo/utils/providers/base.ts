import type { CardConfig } from '../../../src/types';
import type { Calendar } from '../data';

/**
 * Base class for data providers
 */
export abstract class BaseProvider {
  protected configCache: Record<string, string> = {};
  protected configPaths: Record<string, string> = {};
  protected defaultConfig?: string;
  protected defaultDataSource?: string;

  abstract readonly name: string;
  abstract readonly mockDate?: Date;

  /**
   * Get available data sources for this provider
   */
  abstract getDataSources(): string[];

  /**
   * Get available config names
   */
  getConfigNames(): string[] {
    return Object.keys(this.configPaths)
      .map((path) => this.extractConfigName(path))
      .filter(Boolean)
      .sort();
  }

  /**
   * Get default config name for this provider
   */
  getDefaultConfig(): string | undefined {
    const configs = this.getConfigNames();
    if (this.defaultConfig && configs.includes(this.defaultConfig)) {
      return this.defaultConfig;
    }
    return configs[0];
  }

  /**
   * Get default data source for this provider
   */
  getDefaultDataSource(): string | undefined {
    const dataSources = this.getDataSources();
    if (
      this.defaultDataSource &&
      dataSources.includes(this.defaultDataSource)
    ) {
      return this.defaultDataSource;
    }
    return dataSources[0];
  }

  /**
   * Get mock date for this provider
   */
  getMockDate(): Date | undefined {
    return this.mockDate;
  }

  /**
   * Load calendars for a specific data source
   */
  abstract loadCalendars(dataSource: string): Promise<Calendar[]>;

  /**
   * Load a single config by name
   */
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
   * Load and parse a config by name
   */
  async loadConfig(configName: string): Promise<CardConfig | null> {
    const yamlContent = await this.loadConfigContent(configName);
    if (!yamlContent) {
      return null;
    }

    try {
      const yaml = await import('js-yaml');
      return yaml.load(yamlContent) as CardConfig;
    } catch (error) {
      console.warn(`Failed to parse config ${configName}:`, error);
      return null;
    }
  }

  /**
   * Generic fetch helper
   */
  protected async fetchResource<T>(
    url: string,
    parser: (response: Response) => Promise<T>,
    resourceType: string,
  ): Promise<T> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load ${url}: ${response.statusText}`);
      }
      return await parser(response);
    } catch (error) {
      console.error(`Failed to load ${resourceType} ${url}:`, error);
      throw error;
    }
  }

  /**
   * Load YAML file via HTTP
   */
  protected async loadYamlFile(url: string): Promise<string> {
    return this.fetchResource(url, (r) => r.text(), 'YAML file');
  }

  /**
   * Extract config name from file path
   */
  protected extractConfigName(filePath: string): string {
    return (
      filePath
        .split('/')
        .pop()
        ?.replace(/\.(yaml|yml)$/, '') || ''
    );
  }
}
