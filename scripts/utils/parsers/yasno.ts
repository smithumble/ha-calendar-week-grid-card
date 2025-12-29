import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { CalendarEvent } from '../../../src/calendar-week-grid-card';
import {
  toTimeZoneISOString,
  minutesToTime,
  getDayDate,
  MOCK_DATE_STR,
} from '../datetime';
import type { MockCalendar } from '../providers/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../../assets/data');
const YASNO_DATA_DIR = path.join(DATA_DIR, 'yasno', 'calendars');

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

// ============================================================================
// Event Processing Utilities
// ============================================================================

/**
 * Create a calendar event from slot data
 */
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

/**
 * Create an all-day event for a specific date
 */
function createAllDayEvent(dayDate: Date, summary: string): CalendarEvent {
  const start = new Date(dayDate);
  const end = new Date(dayDate);
  end.setDate(dayDate.getDate() + 1);
  end.setHours(0, 0, 0, 0);

  return {
    start: { dateTime: toTimeZoneISOString(start) },
    end: { dateTime: toTimeZoneISOString(end) },
    summary,
  };
}

/**
 * Merge consecutive events that span across midnight with the same summary
 */
function mergeMultiDayEvents(events: CalendarEvent[]): CalendarEvent[] {
  if (events.length === 0) return events;

  // Sort events by summary first, then by start time
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

    // Skip events without dateTime
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

    // Merge if: same summary AND next starts exactly when current ends
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

// ============================================================================
// Data Loading
// ============================================================================

/**
 * Load and parse planned and probable data files
 */
function loadYasnoData(dataSource: string): {
  plannedGroup: PlannedGroup;
  probableGroup: ProbableGroup;
} {
  const plannedPath = path.join(YASNO_DATA_DIR, dataSource, 'planned.json');
  const probablePath = path.join(YASNO_DATA_DIR, dataSource, 'probable.json');

  if (!fs.existsSync(plannedPath) || !fs.existsSync(probablePath)) {
    throw new Error(
      `Data files not found for data source: ${dataSource}. Expected ${plannedPath} and ${probablePath}`,
    );
  }

  const plannedRaw = fs.readFileSync(plannedPath, 'utf8');
  const plannedData = JSON.parse(plannedRaw) as PlannedData;

  const probableRaw = fs.readFileSync(probablePath, 'utf8');
  const probableData = JSON.parse(probableRaw) as ProbableData;

  const plannedGroup = plannedData[PLANNED_GROUP_KEY];
  const probableGroup =
    probableData[PROBABLE_REGION_KEY]?.['dsos']?.[PROBABLE_DSOS_KEY]?.[
      'groups'
    ]?.[PROBABLE_GROUP_KEY];

  if (!plannedGroup) {
    throw new Error(
      `Planned group "${PLANNED_GROUP_KEY}" not found in data source: ${dataSource}`,
    );
  }

  if (!probableGroup) {
    throw new Error(`Probable group not found in data source: ${dataSource}`);
  }

  return { plannedGroup, probableGroup };
}

// ============================================================================
// Event Parsing
// ============================================================================

/**
 * Parse probable events for all weekdays (0-6, where 0=Monday)
 */
function parseProbableEvents(
  probableGroup: ProbableGroup,
  baseDate: Date,
): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  for (let weekday = 0; weekday < 7; weekday++) {
    const slots = probableGroup?.slots?.[weekday.toString()];
    if (!slots) continue;

    const dayDate = getDayDate(baseDate, weekday);

    slots.forEach((slot: Slot) => {
      if (slot.type === SLOT_TYPE_DEFINITE) {
        events.push(createEventFromSlot(slot, dayDate, 'Probable Outage'));
      }
    });
  }

  return events;
}

/**
 * Parse planned slot events for today and tomorrow
 */
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

/**
 * Parse all-day status events for today and tomorrow
 */
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

/**
 * Generate mock calendars based on the Monday, May 20, 2024 start date
 */
export function getMockCalendars(dataSource?: string): MockCalendar[] {
  if (!dataSource) {
    throw new Error('Data source is required for yasno provider');
  }

  const baseDate = new Date(MOCK_DATE_STR);
  baseDate.setHours(0, 0, 0, 0);

  const { plannedGroup, probableGroup } = loadYasnoData(dataSource);

  // Parse all event types
  const rawProbableEvents = parseProbableEvents(probableGroup, baseDate);
  const rawPlannedSlotEvents = parsePlannedSlotEvents(plannedGroup, baseDate);
  const allDayEvents = parseAllDayStatusEvents(plannedGroup, baseDate);

  // Merge multi-day events
  const mergedPlannedSlotEvents = mergeMultiDayEvents(rawPlannedSlotEvents);
  const mergedProbableEvents = mergeMultiDayEvents(rawProbableEvents);

  // Combine planned events
  const plannedEvents = [...mergedPlannedSlotEvents, ...allDayEvents];
  const probableEvents = [...mergedProbableEvents];

  // Create calendars
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
