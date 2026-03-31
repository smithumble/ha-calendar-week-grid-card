import type { Calendar, DataSource } from '../data';
import { getDummyCalendars } from '../parsers/dummy';
import { BaseProvider } from './base';

/**
 * Dummy data provider
 */
export class DummyProvider extends BaseProvider {
  readonly name = 'dummy';

  constructor(
    configPaths: Record<string, string>,
    options?: {
      defaultConfig?: string;
      defaultDataSource?: string;
    },
  ) {
    super();
    this.configPaths = configPaths;
    this.defaultConfig = options?.defaultConfig;
    this.defaultDataSource = options?.defaultDataSource;
  }

  getDataSources(): DataSource[] {
    return [{ value: 'data_1', name: 'data_1' }];
  }

  async loadCalendars(): Promise<Calendar[]> {
    return getDummyCalendars();
  }
}
