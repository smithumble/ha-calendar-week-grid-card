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
  under?: (string | EventCriteria)[];
  over?: (string | EventCriteria)[];
  hide?: (string | EventCriteria)[];
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
  entities: (string | EntityConfig)[];
  css?: string;
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
