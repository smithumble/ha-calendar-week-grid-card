import type { CardConfig } from '../../../src/types';
import type { Calendar } from '../data';

export interface ProviderMetadata {
  name: string;
  dataSources: string[];
  hidden: boolean;
  mockDate?: Date;
}

/**
 * Base class for data providers
 */
export abstract class BaseProvider {
  protected configCache: Record<string, string> = {};

  abstract readonly name: string;
  abstract readonly hidden: boolean;
  abstract readonly mockDate?: Date;

  /**
   * Get available data sources for this provider
   */
  abstract getDataSources(): string[];

  /**
   * Get available config names
   */
  abstract getConfigNames(): string[];

  /**
   * Load calendars for a specific data source
   */
  abstract loadCalendars(dataSource: string): Promise<Calendar[]>;

  /**
   * Load a single config by name
   */
  abstract loadConfigContent(configName: string): Promise<string | null>;

  /**
   * Get provider metadata
   */
  getMetadata(): ProviderMetadata {
    return {
      name: this.name,
      dataSources: this.getDataSources(),
      hidden: this.hidden,
      mockDate: this.mockDate,
    };
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
