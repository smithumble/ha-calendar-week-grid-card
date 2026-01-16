import type { CalendarEvent } from '../../../src/types';

// Constants for data structure navigation
const PLANNED_GROUP_KEY = '6.1';
const PROBABLE_REGION_KEY = '25';
const PROBABLE_DSOS_KEY = '902';
const PROBABLE_GROUP_KEY = '6.1';

// Event type constants
const SLOT_TYPE_DEFINITE = 'Definite';
const ENTITY_PLANNED_OUTAGES = 'calendar.planned_outages';
const ENTITY_PROBABLE_OUTAGES = 'calendar.probable_outages';

// Status to summary mapping
const STATUS_SUMMARY_MAP: Record<string, string> = {
  ScheduleApplies: 'Schedule Applies',
  WaitingForSchedule: 'Waiting for Schedule',
  EmergencyShutdowns: 'Emergency Shutdowns',
};

// Mock date: Monday, May 20, 2024
const MOCK_DATE_STR = '2024-05-20T11:45:00';
const MOCK_EVENTS_TIMEZONE = 'Europe/Kyiv';

interface Slot {
  start: number;
  end: number;
  type: string;
}

interface PlannedDay {
  date?: string;
  slots?: Slot[];
  status?: string;
}

interface PlannedGroup {
  today?: PlannedDay;
  tomorrow?: PlannedDay;
  updatedOn?: string;
}

interface PlannedData {
  [groupKey: string]: PlannedGroup;
}

interface ProbableGroup {
  slots?: Record<string, Slot[]>;
}

interface ProbableDSOS {
  groups?: Record<string, ProbableGroup>;
}

interface ProbableRegion {
  dsos?: Record<string, ProbableDSOS>;
}

interface ProbableData {
  [regionKey: string]: ProbableRegion;
}

export interface MockCalendar {
  entity_id: string;
  events: CalendarEvent[];
}

function toTimeZoneISOString(
  date: Date,
  timeZone: string = MOCK_EVENTS_TIMEZONE,
): string {
  const offset = date.getTimezoneOffset();
  const offsetHours = Math.floor(Math.abs(offset) / 60);
  const offsetMinutes = Math.abs(offset) % 60;
  const sign = offset > 0 ? '-' : '+';
  const offsetStr = `${sign}${offsetHours.toString().padStart(2, '0')}:${offsetMinutes.toString().padStart(2, '0')}`;

  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetStr}`;
}

function getDateString(
  date: Date,
  timeZone: string = MOCK_EVENTS_TIMEZONE,
): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function minutesToTime(minutes: number, date: Date): Date {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 24) {
    const tomorrow = new Date(date);
    tomorrow.setDate(date.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }
  const result = new Date(date);
  result.setHours(hours, mins, 0, 0);
  return result;
}

function getDayDate(baseDate: Date, dayOffset: number): Date {
  const dayDate = new Date(baseDate);
  dayDate.setDate(baseDate.getDate() + dayOffset);
  dayDate.setHours(0, 0, 0, 0);
  return dayDate;
}

function createEventFromSlot(
  slot: Slot,
  dayDate: Date,
  summary: string,
): CalendarEvent {
  const eventStart = minutesToTime(slot.start, dayDate);
  const eventEnd = minutesToTime(slot.end, dayDate);

  return {
    start: { dateTime: toTimeZoneISOString(eventStart) },
    end: { dateTime: toTimeZoneISOString(eventEnd) },
    summary,
  };
}

function createAllDayEvent(dayDate: Date, summary: string): CalendarEvent {
  const start = new Date(dayDate);
  const end = new Date(dayDate);
  end.setDate(dayDate.getDate() + 1);

  return {
    start: { date: getDateString(start) },
    end: { date: getDateString(end) },
    summary,
  };
}

function mergeMultiDayEvents(events: CalendarEvent[]): CalendarEvent[] {
  if (events.length === 0) return events;

  const sorted = [...events].sort((a, b) => {
    if (a.summary !== b.summary) {
      return (a.summary || '').localeCompare(b.summary || '');
    }
    const aStart = a.start.dateTime ? new Date(a.start.dateTime).getTime() : 0;
    const bStart = b.start.dateTime ? new Date(b.start.dateTime).getTime() : 0;
    return aStart - bStart;
  });

  const merged: CalendarEvent[] = [];
  let current = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];

    if (!current.start.dateTime || !current.end.dateTime) {
      merged.push(current);
      current = next;
      continue;
    }

    if (!next.start.dateTime || !next.end.dateTime) {
      merged.push(current);
      current = next;
      continue;
    }

    const currentEnd = new Date(current.end.dateTime);
    const nextStart = new Date(next.start.dateTime);

    const canMerge =
      current.summary === next.summary &&
      currentEnd.getTime() === nextStart.getTime();

    if (canMerge) {
      current = { ...current, end: { dateTime: next.end.dateTime } };
    } else {
      merged.push(current);
      current = next;
    }
  }

  merged.push(current);
  return merged;
}

function parseProbableEvents(
  probableGroup: ProbableGroup,
  baseDate: Date,
  mondayIndex: number = 0,
): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  const weekOffsets = [-7, 0, 7];

  for (const weekOffset of weekOffsets) {
    const weekBaseDate = getDayDate(baseDate, weekOffset);

    for (let weekday = 0; weekday < 7; weekday++) {
      const slots = probableGroup?.slots?.[weekday.toString()];
      if (!slots) continue;

      const dayOffset = (weekday - mondayIndex + 7) % 7;
      const dayDate = getDayDate(weekBaseDate, dayOffset);

      slots.forEach((slot: Slot) => {
        if (slot.type === SLOT_TYPE_DEFINITE) {
          events.push(createEventFromSlot(slot, dayDate, 'Probable Outage'));
        }
      });
    }
  }

  return events;
}

function parsePlannedSlotEvents(
  plannedGroup: PlannedGroup,
  baseDate: Date,
): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  for (const dayKey of ['today', 'tomorrow'] as const) {
    const dayData = plannedGroup[dayKey];
    if (!dayData?.slots) continue;

    const dayOffset = dayKey === 'tomorrow' ? 1 : 0;
    const dayDate = getDayDate(baseDate, dayOffset);

    dayData.slots.forEach((slot: Slot) => {
      if (slot.type === SLOT_TYPE_DEFINITE) {
        events.push(createEventFromSlot(slot, dayDate, 'Outage'));
      }
    });
  }

  return events;
}

function parseAllDayStatusEvents(
  plannedGroup: PlannedGroup,
  baseDate: Date,
): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  for (const dayKey of ['today', 'tomorrow'] as const) {
    const dayData = plannedGroup[dayKey];
    if (!dayData?.status) continue;

    const status = dayData.status;
    const summary = STATUS_SUMMARY_MAP[status];
    if (!summary) continue;

    const dayOffset = dayKey === 'tomorrow' ? 1 : 0;
    const dayDate = getDayDate(baseDate, dayOffset);

    events.push(createAllDayEvent(dayDate, summary));
  }

  return events;
}

export function parseYasnoData(
  plannedData: PlannedData,
  probableData: ProbableData,
  mondayIndex: number = 0,
): MockCalendar[] {
  const baseDate = new Date(MOCK_DATE_STR);
  baseDate.setHours(0, 0, 0, 0);

  const plannedGroup = plannedData[PLANNED_GROUP_KEY];
  const probableGroup =
    probableData[PROBABLE_REGION_KEY]?.['dsos']?.[PROBABLE_DSOS_KEY]?.[
      'groups'
    ]?.[PROBABLE_GROUP_KEY];

  if (!plannedGroup) {
    throw new Error(`Planned group "${PLANNED_GROUP_KEY}" not found`);
  }

  if (!probableGroup) {
    throw new Error('Probable group not found');
  }

  const rawProbableEvents = parseProbableEvents(
    probableGroup,
    baseDate,
    mondayIndex,
  );
  const rawPlannedSlotEvents = parsePlannedSlotEvents(plannedGroup, baseDate);
  const allDayEvents = parseAllDayStatusEvents(plannedGroup, baseDate);

  const mergedPlannedSlotEvents = mergeMultiDayEvents(rawPlannedSlotEvents);
  const mergedProbableEvents = mergeMultiDayEvents(rawProbableEvents);

  const plannedEvents = [...mergedPlannedSlotEvents, ...allDayEvents];
  const probableEvents = [...mergedProbableEvents];

  const calendars: MockCalendar[] = [];

  if (plannedEvents.length > 0) {
    calendars.push({
      entity_id: ENTITY_PLANNED_OUTAGES,
      events: plannedEvents,
    });
  }

  if (probableEvents.length > 0) {
    calendars.push({
      entity_id: ENTITY_PROBABLE_OUTAGES,
      events: probableEvents,
    });
  }

  return calendars;
}
