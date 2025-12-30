import type { CalendarEvent } from '../../../src/types';
import { DummyProvider } from './dummy';
import { YasnoProvider } from './yasno';
import { YasnoDeprecatedProvider } from './yasno_deprecated';

export interface ConfigItem {
  name: string;
  config: any;
}

export interface MockCalendar {
  entity_id: string;
  events: CalendarEvent[];
}

export interface CalendarProvider {
  getCalendars(dataSource?: string): MockCalendar[];
  getAvailableDataSources(): string[];
  getConfigs(): ConfigItem[];
}

export const PROVIDERS: Record<string, CalendarProvider> = {
  yasno: new YasnoProvider(),
  yasno_deprecated: new YasnoDeprecatedProvider(),
  dummy: new DummyProvider(),
};

export interface ProviderData {
  calendars: Record<string, MockCalendar[]>;
  configs: ConfigItem[];
  dataSources: string[];
}

/**
 * Preload all data for all providers
 */
export function preloadAllProviderData(): Record<string, ProviderData> {
  const providerDataMap: Record<string, ProviderData> = {};

  for (const providerName of Object.keys(PROVIDERS)) {
    const provider = PROVIDERS[providerName];
    const dataSources = provider.getAvailableDataSources();
    const configs = provider.getConfigs();
    const calendars: Record<string, MockCalendar[]> = {};

    for (const dataSource of dataSources) {
      try {
        calendars[dataSource] = provider.getCalendars(dataSource);
      } catch (error) {
        console.warn(
          `Failed to load calendars for provider "${providerName}" data source "${dataSource}":`,
          error,
        );
      }
    }

    providerDataMap[providerName] = {
      calendars,
      configs,
      dataSources,
    };
  }

  return providerDataMap;
}
