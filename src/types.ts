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

export interface StandardEntityConfig {
  name?: string;
  type?: string;
  entity: string;
  filter?: string;
  icon?: string;
  theme_values?: Record<string, unknown>;
  theme_values_archive?: Record<string, Record<string, unknown>>;
  under?: (string | EventCriteria)[];
  over?: (string | EventCriteria)[];
  hide?: (string | EventCriteria)[];
}

export interface EntityConfig extends StandardEntityConfig {
  [key: string]: unknown;
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

export interface DefaultEventConfig {
  icon?: string;
  theme_values?: Record<string, unknown>;
  theme_values_archive?: Record<string, Record<string, unknown>>;
  [key: string]: unknown;
}

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
  theme?: 'dark' | 'light' | 'auto';
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
  extends Omit<CalendarEvent, 'start' | 'end'>,
    Partial<EntityConfig> {
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
