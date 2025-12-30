export interface EntityConfig {
  entity: string;
  name?: string;
  filter?: string;
}

export interface CardConfig {
  type: string;
  language?: string;
  time_format?: string;
  start_hour?: number;
  end_hour?: number;
  filter?: string;
  icons_container?: 'event' | 'cell';
  icons_mode?: 'top' | 'all';
  entities: (string | EntityConfig)[];
  css?: string;
}

export interface CalendarEvent {
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  summary?: string;
}

export interface Event extends Omit<CalendarEvent, 'start' | 'end'> {
  start: Date; // override with Date object
  end: Date; // override with Date object
  entity?: string;
  filter?: string;
}

export interface DayInfo {
  date: Date;
  label: string;
  isToday: boolean;
}
