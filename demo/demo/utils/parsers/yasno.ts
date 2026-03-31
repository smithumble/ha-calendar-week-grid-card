import type { CalendarEvent } from '../../../../src/types';
import { Calendar } from '../data';
import {
  toTimeZoneISOString,
  getDateString,
  minutesToTime,
  getDayDate,
} from '../datetime';

// Constants for data structure navigation
const PLANNED_GROUP_KEY = '6.1';
const PROBABLE_REGION_KEY = '25';
const PROBABLE_DSOS_KEY = '902';

// Event type constants
const SLOT_TYPE_DEFINITE = 'Definite';
const ENTITY_PLANNED_OUTAGES = 'calendar.planned_outages';
const ENTITY_PROBABLE_OUTAGES = 'calendar.probable_outages';

// Status to summary mapping
const STATUS_SUMMARY_MAP: Record<string, string> = {
  ScheduleApplies: 'Schedule Applies',
  WaitingForSchedule: 'Waiting for Schedule',
  EmergencyShutdowns: 'Emergency Shutdowns',
  NoOutages: 'No Outages',
};

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
  [dayKey: string]: PlannedDay | string | undefined;
}

export interface PlannedData {
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

export interface ProbableData {
  [regionKey: string]: ProbableRegion;
}

function parseIsoDateToLocalDay(value?: string): Date | undefined {
  if (!value) return undefined;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return undefined;

  const [, year, month, day] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
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
): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const baseWeekday = baseDate.getDay() - 1;

  const weekOffsets = [-7, 0, 7];

  for (const weekOffset of weekOffsets) {
    const weekBaseDate = getDayDate(baseDate, weekOffset);

    for (let weekday = 0; weekday < 7; weekday++) {
      const slots = probableGroup?.slots?.[weekday.toString()];
      if (!slots) continue;

      const dayOffset = (weekday - baseWeekday + 7) % 7;
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

  const plannedDayEntries = Object.entries(plannedGroup).filter(
    ([, value]) => typeof value === 'object' && value !== null,
  ) as Array<[string, PlannedDay]>;

  for (const [dayKey, dayData] of plannedDayEntries) {
    if (!dayData.slots) continue;

    const parsedDayDate = parseIsoDateToLocalDay(dayData.date);
    const hasValidDate =
      parsedDayDate instanceof Date && !Number.isNaN(parsedDayDate.getTime());
    const fallbackDayOffset = dayKey === 'tomorrow' ? 1 : 0;
    const dayDate = hasValidDate
      ? parsedDayDate
      : getDayDate(baseDate, fallbackDayOffset);

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

  const plannedDayEntries = Object.entries(plannedGroup).filter(
    ([, value]) => typeof value === 'object' && value !== null,
  ) as Array<[string, PlannedDay]>;

  for (const [dayKey, dayData] of plannedDayEntries) {
    if (!dayData.status) continue;

    const parsedDayDate = parseIsoDateToLocalDay(dayData.date);
    const hasValidDate =
      parsedDayDate instanceof Date && !Number.isNaN(parsedDayDate.getTime());
    const fallbackDayOffset = dayKey === 'tomorrow' ? 1 : 0;
    const dayDate = hasValidDate
      ? parsedDayDate
      : getDayDate(baseDate, fallbackDayOffset);

    const summary = STATUS_SUMMARY_MAP[dayData.status];
    if (!summary) continue;

    events.push(createAllDayEvent(dayDate, summary));
  }

  return events;
}

export function parseYasnoData(
  plannedData: PlannedData,
  probableData: ProbableData,
  plannedGroupKey: string = PLANNED_GROUP_KEY,
  probableGroupKey?: string,
  mockDate?: Date,
): Calendar[] {
  const baseDate: Date = mockDate ?? new Date();
  baseDate.setHours(0, 0, 0, 0);

  // Use separate group keys if provided, otherwise use the same key for both
  const groupKey = probableGroupKey ?? plannedGroupKey;

  const plannedGroup = plannedData[plannedGroupKey];
  const probableGroup =
    probableData[PROBABLE_REGION_KEY]?.['dsos']?.[PROBABLE_DSOS_KEY]?.[
      'groups'
    ]?.[groupKey];

  if (!plannedGroup) {
    throw new Error(`Planned group "${plannedGroupKey}" not found`);
  }

  if (!probableGroup) {
    throw new Error(`Probable group "${groupKey}" not found`);
  }

  const rawProbableEvents = parseProbableEvents(probableGroup, baseDate);
  const rawPlannedSlotEvents = parsePlannedSlotEvents(plannedGroup, baseDate);
  const allDayEvents = parseAllDayStatusEvents(plannedGroup, baseDate);

  const mergedPlannedSlotEvents = mergeMultiDayEvents(rawPlannedSlotEvents);
  const mergedProbableEvents = mergeMultiDayEvents(rawProbableEvents);

  const plannedEvents = [...mergedPlannedSlotEvents, ...allDayEvents];
  const probableEvents = [...mergedProbableEvents];

  const calendars: Calendar[] = [];

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
