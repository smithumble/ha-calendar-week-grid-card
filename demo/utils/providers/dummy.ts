import type { Calendar } from '../data';
import { MOCK_DATE_STR } from '../datetime';
import { getDummyCalendars } from '../parsers/dummy';
import { BaseProvider } from './base';

/**
 * Dummy data provider
 */
export class DummyProvider extends BaseProvider {
  readonly name = 'dummy';
  readonly hidden = false;
  readonly mockDate = new Date(MOCK_DATE_STR);

  private configPaths: Record<string, string> = {};

  constructor(configPaths: Record<string, string>) {
    super();
    this.configPaths = configPaths;
  }

  getDataSources(): string[] {
    return ['data_1'];
  }

  getConfigNames(): string[] {
    return Object.keys(this.configPaths)
      .map((path) => this.extractConfigName(path))
      .filter(Boolean)
      .sort();
  }

  async loadCalendars(): Promise<Calendar[]> {
    return getDummyCalendars();
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
}
