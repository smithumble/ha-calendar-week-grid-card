import type { Calendar, DataSource } from '../data';
import { MOCK_DATE_STR } from '../datetime';
import { getDummyCalendars } from '../parsers/dummy';
import { BaseProvider } from './base';

/**
 * Dummy data provider
 */
export class DummyProvider extends BaseProvider {
  readonly name = 'dummy';
  readonly mockDate = new Date(MOCK_DATE_STR);

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
