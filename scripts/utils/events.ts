import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';

import type { CalendarEvent } from '../../src/calendar-week-grid-card';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../assets/data');

// Fixed date: Monday, May 20, 2024
export const MOCK_DATE_STR = '2024-05-20T11:45:00';

// Timezone for mock events (default: Kyiv/Ukraine)
const MOCK_EVENTS_TIMEZONE = 'Europe/Kyiv';

export interface MockCalendarEvent extends CalendarEvent {
  entity_id: string;
}

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

// Format date as ISO string with timezone offset (e.g., +02:00 or +03:00)
// Interprets the date's local time components as being in the specified timezone
function toTimeZoneISOString(
  date: Date,
  timeZone: string = MOCK_EVENTS_TIMEZONE,
): string {
  const zonedDate = fromZonedTime(date, timeZone);
  return formatInTimeZone(zonedDate, timeZone, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

// Helper function to get date string in YYYY-MM-DD format in a specific timezone
function getDateString(
  date: Date,
  timeZone: string = MOCK_EVENTS_TIMEZONE,
): string {
  return formatInTimeZone(date, timeZone, 'yyyy-MM-dd');
}

// Get planned dates
function getPlannedDates(
  plannedGroup: PlannedGroup,
  baseDate: Date,
): Set<string> {
  const plannedDates = new Set<string>();

  // Use baseDate for today and baseDate + 1 for tomorrow
  // The dates in the JSON are just metadata, the actual week is determined by baseDate
  if (plannedGroup.today) {
    const todayDate = new Date(baseDate);
    plannedDates.add(getDateString(todayDate));
  }

  if (plannedGroup.tomorrow) {
    const tomorrowDate = new Date(baseDate);
    tomorrowDate.setDate(baseDate.getDate() + 1);
    plannedDates.add(getDateString(tomorrowDate));
  }

  return plannedDates;
}

// Convert minutes from start of day to Date
function minutesToTime(minutes: number, date: Date): Date {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  // Handle end of day (24:00) - use midnight of next day
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

// Mock events based on the Monday, May 20, 2024 start date
export const getMockEvents = (dataSource?: string): MockCalendarEvent[] => {
  const baseDate = new Date(MOCK_DATE_STR);
  // Reset to start of the week (Monday)
  // May 20, 2024 is a Monday.
  baseDate.setHours(0, 0, 0, 0);

  // Determine data source paths
  // Default to yasno_1 if no dataSource is provided
  const effectiveDataSource = dataSource || 'yasno_1';

  let plannedPath: string;
  let probablePath: string;

  if (effectiveDataSource === 'yasno_1' || effectiveDataSource === 'yasno_2') {
    // Use yasno_1 or yasno_2 directory structure
    plannedPath = path.join(DATA_DIR, effectiveDataSource, 'planned.json');
    probablePath = path.join(DATA_DIR, effectiveDataSource, 'probable.json');
  } else {
    // Fallback: treat as directory name
    plannedPath = path.join(DATA_DIR, effectiveDataSource, 'planned.json');
    probablePath = path.join(DATA_DIR, effectiveDataSource, 'probable.json');
  }

  // Load data files
  const plannedRaw = fs.readFileSync(plannedPath, 'utf8');
  const plannedData = JSON.parse(plannedRaw) as PlannedData;

  const probableRaw = fs.readFileSync(probablePath, 'utf8');
  const probableData = JSON.parse(probableRaw) as ProbableData;

  // Extract group data
  const plannedGroup: PlannedGroup = plannedData['6.1']!;
  const probableGroup: ProbableGroup =
    probableData['25']!['dsos']!['902']!['groups']!['6.1']!;

  // Step 1: Parse all probable events for all weekdays (0-6, where 0=Monday)
  // Since baseDate is already Monday, weekday 0 = day 0, weekday 1 = day 1, etc.
  const probableEvents: MockCalendarEvent[] = [];
  for (let weekday = 0; weekday < 7; weekday++) {
    const slots = probableGroup?.slots?.[weekday.toString()];
    if (!slots) continue;

    // Calculate the date for this weekday (baseDate is Monday = weekday 0)
    const dayDate = new Date(baseDate);
    dayDate.setDate(baseDate.getDate() + weekday);
    dayDate.setHours(0, 0, 0, 0);

    slots.forEach((slot: Slot) => {
      if (slot.type === 'Definite') {
        const eventStart = minutesToTime(slot.start, dayDate);
        const eventEnd = minutesToTime(slot.end, dayDate);

        probableEvents.push({
          start: { dateTime: toTimeZoneISOString(eventStart) },
          end: { dateTime: toTimeZoneISOString(eventEnd) },
          summary: 'Probable Outage',
          entity_id: 'calendar.probable_outages',
        });
      }
    });
  }

  // Step 2: Parse all planned events

  // 2a. First parse slots for today and tomorrow
  const plannedSlotEvents: MockCalendarEvent[] = [];
  for (const dayKey of ['today', 'tomorrow'] as const) {
    const dayData = plannedGroup[dayKey];
    if (!dayData) continue;

    // Use baseDate for today and baseDate + 1 for tomorrow
    // The dates in the JSON are just metadata, the actual week is determined by baseDate
    const dayDate = new Date(baseDate);
    if (dayKey === 'tomorrow') {
      dayDate.setDate(baseDate.getDate() + 1);
    }
    dayDate.setHours(0, 0, 0, 0);

    // Parse slots for this day
    const slots = dayData.slots || [];
    slots.forEach((slot: Slot) => {
      if (slot.type === 'Definite') {
        const eventStart = minutesToTime(slot.start, dayDate);
        const eventEnd = minutesToTime(slot.end, dayDate);

        plannedSlotEvents.push({
          start: { dateTime: toTimeZoneISOString(eventStart) },
          end: { dateTime: toTimeZoneISOString(eventEnd) },
          summary: 'Outage',
          entity_id: 'calendar.planned_outages',
        });
      }
    });
  }

  // Merge planned events
  const mergedPlannedSlotEvents = mergeMultiDayEvents(plannedSlotEvents);

  // 2b. Then parse all day events (status-based) for today and tomorrow
  // These are added separately and NOT merged
  const allDayEvents: MockCalendarEvent[] = [];
  for (const dayKey of ['today', 'tomorrow'] as const) {
    const dayData = plannedGroup[dayKey];
    if (!dayData) continue;

    const dayStatus = dayData.status;
    if (
      dayStatus === 'ScheduleApplies' ||
      dayStatus === 'WaitingForSchedule' ||
      dayStatus === 'EmergencyShutdowns'
    ) {
      // Use baseDate for today and baseDate + 1 for tomorrow
      // The dates in the JSON are just metadata, the actual week is determined by baseDate
      const dayDate = new Date(baseDate);
      if (dayKey === 'tomorrow') {
        dayDate.setDate(baseDate.getDate() + 1);
      }
      dayDate.setHours(0, 0, 0, 0);

      const start = new Date(dayDate);
      const end = new Date(dayDate);
      end.setDate(dayDate.getDate() + 1);
      end.setHours(0, 0, 0, 0);

      let summary = '';
      if (dayStatus === 'ScheduleApplies') {
        summary = 'Schedule Applies';
      } else if (dayStatus === 'WaitingForSchedule') {
        summary = 'Waiting for Schedule';
      } else if (dayStatus === 'EmergencyShutdowns') {
        summary = 'Emergency Shutdowns';
      }

      allDayEvents.push({
        start: { dateTime: toTimeZoneISOString(start) },
        end: { dateTime: toTimeZoneISOString(end) },
        summary,
        entity_id: 'calendar.planned_outages',
      });
    }
  }

  // Step 3: Filter out probable events for days that have planned events
  const plannedDates = getPlannedDates(plannedGroup, baseDate);
  const filteredProbableEvents = probableEvents.filter((event) => {
    if (!event.start.dateTime) return false;
    const eventDate = new Date(event.start.dateTime);
    // Extract date string in the same timezone as planned dates
    const eventDateString = getDateString(eventDate, MOCK_EVENTS_TIMEZONE);
    // Remove probable events on days with planned outages
    return !plannedDates.has(eventDateString);
  });

  // Merge probable events
  const mergedProbableEvents = mergeMultiDayEvents(filteredProbableEvents);

  // Combine all events
  const allEvents = [
    ...mergedPlannedSlotEvents,
    ...allDayEvents,
    ...mergedProbableEvents,
  ];

  return allEvents;
};

// Merge consecutive events that span across midnight with the same summary
function mergeMultiDayEvents(events: MockCalendarEvent[]): MockCalendarEvent[] {
  if (events.length === 0) return events;

  // Sort events by summary first, then by start time
  const sorted = [...events].sort((a, b) => {
    // First sort by summary
    if (a.summary !== b.summary) {
      return (a.summary || '').localeCompare(b.summary || '');
    }
    // Then sort by start time
    const aStart = a.start.dateTime ? new Date(a.start.dateTime).getTime() : 0;
    const bStart = b.start.dateTime ? new Date(b.start.dateTime).getTime() : 0;
    return aStart - bStart;
  });

  const merged: MockCalendarEvent[] = [];
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

    // Check if events should be merged:
    // 1. Same summary
    // 2. Next starts exactly when current ends
    const timesMatch = currentEnd.getTime() === nextStart.getTime();
    const sameSummary = current.summary === next.summary;

    if (timesMatch && sameSummary) {
      // Merge: extend current event's end time to next event's end time
      const mergedEvent = {
        ...current,
        end: { dateTime: next.end.dateTime },
      };
      current = mergedEvent;
    } else {
      // No merge: push current and move to next
      merged.push(current);
      current = next;
    }
  }

  // Don't forget the last event
  merged.push(current);

  return merged;
}
