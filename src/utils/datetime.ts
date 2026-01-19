import type { HomeAssistant } from 'custom-card-helpers';
import type { DayInfo } from '../types';

/**
 * Convert a date to Home Assistant timezone
 */
export function toHaTime(date: Date, hass?: HomeAssistant): Date {
  try {
    const tz = hass?.config?.time_zone;
    if (!tz) return date;
    const str = date.toLocaleString('en-US', { timeZone: tz });
    return new Date(str);
  } catch (e) {
    console.error('Timezone conversion error', e);
    return date;
  }
}

/**
 * Normalize date object from various formats
 */
export function normalizeDate(
  dateObj: { dateTime?: string; date?: string } | Date,
  hass?: HomeAssistant,
): Date {
  if (dateObj instanceof Date) return dateObj;
  if (dateObj.dateTime) {
    return toHaTime(new Date(dateObj.dateTime), hass);
  }
  if (dateObj.date) {
    return new Date(dateObj.date + 'T00:00:00');
  }
  return new Date();
}

/**
 * Calculate the start date of the week based on configuration
 */
export function getWeekStartDate(today: Date, weekStart: string): Date {
  if (weekStart === 'today') {
    return new Date(today);
  }

  // Map day names to day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const dayMap: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  const targetDay = dayMap[weekStart.toLowerCase()];
  if (targetDay === undefined) {
    // Invalid week_start, default to today
    return new Date(today);
  }

  const currentDay = today.getDay();
  const daysToSubtract = (currentDay - targetDay + 7) % 7;

  const startDate = new Date(today);
  startDate.setDate(today.getDate() - daysToSubtract);
  return startDate;
}

/**
 * Format hour using either string pattern or Intl options
 */
export function formatHour(
  hour: number,
  timeFormat: string | Intl.DateTimeFormatOptions | undefined,
  language?: string,
): string {
  // If it's a string, use old style pattern replacement
  if (typeof timeFormat === 'string') {
    const format = timeFormat || 'h A';

    // Custom pattern replacement
    // H: 0-23, HH: 00-23
    // h: 1-12, hh: 01-12
    // m: 0-59, mm: 00-59
    // a: am/pm, A: AM/PM
    const tokens: Record<string, string> = {
      HH: hour.toString().padStart(2, '0'),
      H: hour.toString(),
      hh: (hour % 12 || 12).toString().padStart(2, '0'),
      h: (hour % 12 || 12).toString(),
      mm: '00',
      m: '0',
      a: hour < 12 ? 'am' : 'pm',
      A: hour < 12 ? 'AM' : 'PM',
    };

    return format.replace(/HH|H|hh|h|mm|m|a|A/g, (match) => tokens[match]);
  }

  // If it's an object or undefined, use Intl.DateTimeFormat
  const lang = language || 'en';
  const formatOptions = timeFormat || { hour: 'numeric' };

  // Create a date object with the specified hour
  const date = new Date();
  date.setHours(hour, 0, 0, 0);

  const formatter = new Intl.DateTimeFormat(lang, formatOptions);
  return formatter.format(date);
}

/**
 * Generate array of day information for the grid
 */
export function getDays(
  daysCount: number,
  weekStart: string,
  language: string,
  primaryDateFormat?: Intl.DateTimeFormatOptions,
  secondaryDateFormat?: Intl.DateTimeFormatOptions,
  hass?: HomeAssistant,
): DayInfo[] {
  const days: DayInfo[] = [];
  const today = toHaTime(new Date(), hass);
  today.setHours(0, 0, 0, 0);

  // Calculate the start date based on week_start config
  const startDate = getWeekStartDate(today, weekStart);

  const lang = language || 'en';

  // Primary date format (default: weekday:short)
  const primaryFormat = primaryDateFormat || { weekday: 'short' };
  const primaryFormatter = new Intl.DateTimeFormat(lang, primaryFormat);

  // Secondary date format (optional)
  const secondaryFormatter = secondaryDateFormat
    ? new Intl.DateTimeFormat(lang, secondaryDateFormat)
    : null;

  for (let i = 0; i < daysCount; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);

    const primaryLabel = primaryFormatter.format(date);
    const label = primaryLabel.charAt(0).toUpperCase() + primaryLabel.slice(1);

    const secondaryLabel = secondaryFormatter
      ? secondaryFormatter.format(date)
      : undefined;

    // Check if this date is today
    const isToday = date.toDateString() === today.toDateString();

    days.push({
      date: date,
      label: label,
      secondaryLabel: secondaryLabel,
      isToday: isToday,
    });
  }
  return days;
}
