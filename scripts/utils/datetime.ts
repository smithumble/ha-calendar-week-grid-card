import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';

// Fixed date: Monday, May 20, 2024
export const MOCK_DATE_STR = '2024-05-20T11:45:00';

// Timezone for mock events (default: Kyiv/Ukraine)
export const MOCK_EVENTS_TIMEZONE = 'Europe/Kyiv';

/**
 * Format date as ISO string with timezone offset (e.g., +02:00 or +03:00)
 * Interprets the date's local time components as being in the specified timezone
 */
export function toTimeZoneISOString(
  date: Date,
  timeZone: string = MOCK_EVENTS_TIMEZONE,
): string {
  const zonedDate = fromZonedTime(date, timeZone);
  return formatInTimeZone(zonedDate, timeZone, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

/**
 * Get date string in YYYY-MM-DD format in a specific timezone
 */
export function getDateString(
  date: Date,
  timeZone: string = MOCK_EVENTS_TIMEZONE,
): string {
  return formatInTimeZone(date, timeZone, 'yyyy-MM-dd');
}

/**
 * Convert minutes from start of day to Date
 */
export function minutesToTime(minutes: number, date: Date): Date {
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

/**
 * Create a date for a specific day relative to base date
 */
export function getDayDate(baseDate: Date, dayOffset: number): Date {
  const dayDate = new Date(baseDate);
  dayDate.setDate(baseDate.getDate() + dayOffset);
  dayDate.setHours(0, 0, 0, 0);
  return dayDate;
}
