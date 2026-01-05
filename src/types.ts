export interface ShiftCriteria {
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
  shift_left?: (string | ShiftCriteria)[];
  shift_right?: (string | ShiftCriteria)[];
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
  event_icon?: string;
  blank_icon?: string;
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
  name?: string;
  type?: string;
  entity?: string;
  filter?: string;
  icon?: string;
}

export interface DayInfo {
  date: Date;
  label: string;
  isToday: boolean;
}
