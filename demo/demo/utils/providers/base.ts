import { THEME_HIDDEN_FIELDS } from '../../../../src/editor/utils/theme';
import type { CardConfig } from '../../../../src/types';
import type { Calendar } from '../data';

/**
 * Demo preset name
 */
export const DEMO_PRESET_NAME = 'yasno_en';

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
   * Transform entities_presets.demo to entities for demo providers
   * Preserves other presets for the editor to use
   */
  private transformEntitiesPresets(config: CardConfig): void {
    if (!config.entities_presets || !Array.isArray(config.entities_presets)) {
      return;
    }

    // Find preset with excluded names (e.g., "demo")
    const excludedPreset = config.entities_presets.find(
      (preset) => preset.name === DEMO_PRESET_NAME,
    );

    // Set entities from excluded preset if it exists and has entities, and entities is empty
    if (
      excludedPreset?.entities &&
      (!config.entities || config.entities.length === 0)
    ) {
      config.entities = excludedPreset.entities;
    }

    // Delete theme hidden fields
    THEME_HIDDEN_FIELDS.forEach((field) => {
      delete config[field as keyof CardConfig];
    });
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
      const config = yaml.load(yamlContent) as CardConfig;
      this.transformEntitiesPresets(config);
      return config;
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
