// Minimal type definitions (replaces custom-card-helpers and home-assistant-js-websocket dependencies)

export interface HassEntity {
  entity_id: string;
  state: string;
  last_changed?: string;
  last_updated?: string;
  attributes?: {
    friendly_name?: string;
    [key: string]: unknown;
  };
  context?: {
    id: string;
    user_id: string | null;
    parent_id: string | null;
  };
}

export type HassEntities = Record<string, HassEntity>;

export interface HassConfig {
  time_zone?: string;
  [key: string]: unknown;
}

export interface EntityRegistryEntry {
  device_id?: string;
  [key: string]: unknown;
}

export interface DeviceRegistryEntry {
  name?: string;
  name_by_user?: string;
  [key: string]: unknown;
}

export interface HomeAssistant {
  states: HassEntities;
  config: HassConfig;
  entities: Record<string, EntityRegistryEntry>;
  devices: Record<string, DeviceRegistryEntry>;
  language?: string;
  themes?: {
    darkMode?: boolean;
  };
  callApi: <T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    parameters?: { [key: string]: unknown },
  ) => Promise<T>;
  [key: string]: unknown; // Allow other properties for compatibility
}

export interface CustomCard {
  type: string;
  name: string;
  preview?: boolean;
  description?: string;
  documentationURL?: string;
}

export interface EventCriteria {
  name?: string;
  type?: string;
  entity?: string;
  filter?: string;
}

export interface EntityConfig {
  name?: string;
  type?: string;
  entity: string;
  filter?: string;
  icon?: string;
  theme_values?: ThemeValues;
  theme_values_archive?: Record<string, ThemeValues>;
  under?: (string | EventCriteria)[];
  over?: (string | EventCriteria)[];
  hide?: (string | EventCriteria)[];
}

// Legacy layout options (deprecated, use grid_options instead)
export interface LayoutOptions {
  grid_rows?: number;
  grid_columns?: number;
}

// New HA standard grid options
export interface GridOptions {
  rows?: number | 'auto';
  columns?: number | 'auto';
}

export interface ThemeVariable {
  name?: string;
  description?: string;
}

export interface ThemeValues {
  [key: string]: unknown;
}

export interface DefaultEventConfig {
  icon?: string;
  theme_values?: ThemeValues;
}

export const EVENT_CONFIG_KEYS = [
  'event',
  'blank_event',
  'blank_all_day_event',
] as const;
export type EventConfigKey = (typeof EVENT_CONFIG_KEYS)[number];

export interface CardConfig {
  type: string;
  language?: string;
  primary_date_format?: Intl.DateTimeFormatOptions;
  secondary_date_format?: Intl.DateTimeFormatOptions;
  time_format?: string | Intl.DateTimeFormatOptions;
  time_range?: boolean;
  start_hour?: number;
  end_hour?: number;
  filter?: string;
  all_day?: 'grid' | 'row' | 'both';
  all_day_icon?: string;
  all_day_label?: string;
  icons_container?: 'event' | 'cell';
  icons_mode?: 'top' | 'all';
  event_icon?: string;
  blank_icon?: string;
  event?: DefaultEventConfig;
  blank_event?: DefaultEventConfig;
  blank_all_day_event?: DefaultEventConfig;
  theme_values_examples?: DefaultEventConfig[];
  week_start?:
    | 'today'
    | 'sunday'
    | 'monday'
    | 'tuesday'
    | 'wednesday'
    | 'thursday'
    | 'friday'
    | 'saturday';
  days?: number;
  entities?: (string | EntityConfig)[];
  theme_variables?: Record<string, ThemeVariable>;
  css?: string;
  grid_options?: GridOptions;
  layout_options?: LayoutOptions;
}

export interface CalendarEvent {
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  summary?: string;
}

export interface RawEvent extends CalendarEvent, Partial<EntityConfig> {}

export interface Event
  extends Omit<CalendarEvent, 'start' | 'end'>, Partial<EntityConfig> {
  start: Date; // override with Date object
  end: Date; // override with Date object
  isAllDay?: boolean;
}

export interface DayInfo {
  date: Date;
  label: string;
  secondaryLabel?: string;
  isToday: boolean;
}
