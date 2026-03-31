import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  formatDay,
  formatHour,
  getDays,
  getWeekStartDate,
  normalizeDate,
  toHaTime,
} from './datetime';

describe('datetime utilities', () => {
  describe('toHaTime', () => {
    it('returns input date when hass timezone is missing', () => {
      const date = new Date('2026-03-31T10:15:00Z');

      expect(toHaTime(date)).toBe(date);
      expect(toHaTime(date, { config: {} } as any)).toBe(date);
    });
  });

  describe('normalizeDate', () => {
    it('returns date instance unchanged', () => {
      const date = new Date('2026-03-31T10:15:00Z');
      expect(normalizeDate(date)).toBe(date);
    });

    it('parses all-day date payload', () => {
      const normalized = normalizeDate({ date: '2026-03-31' });
      expect(normalized.getFullYear()).toBe(2026);
      expect(normalized.getMonth()).toBe(2);
      expect(normalized.getDate()).toBe(31);
      expect(normalized.getHours()).toBe(0);
      expect(normalized.getMinutes()).toBe(0);
    });

    it('parses dateTime payload', () => {
      const normalized = normalizeDate({ dateTime: '2026-03-31T12:30:00Z' });
      expect(normalized.toISOString()).toBe('2026-03-31T12:30:00.000Z');
    });
  });

  describe('getWeekStartDate', () => {
    it('returns same day for "today"', () => {
      const today = new Date('2026-03-31T12:00:00Z');
      const start = getWeekStartDate(today, 'today');
      expect(start.toISOString()).toBe(today.toISOString());
    });

    it('calculates monday week start', () => {
      const tuesday = new Date('2026-03-31T12:00:00Z');
      const start = getWeekStartDate(tuesday, 'monday');
      expect(start.toISOString()).toBe('2026-03-30T12:00:00.000Z');
    });

    it('falls back to today for invalid week start', () => {
      const today = new Date('2026-03-31T12:00:00Z');
      const start = getWeekStartDate(today, 'invalid-day');
      expect(start.toISOString()).toBe(today.toISOString());
    });
  });

  describe('formatHour', () => {
    it('formats string pattern tokens', () => {
      expect(formatHour(0, 'h A')).toBe('12 AM');
      expect(formatHour(13, 'HH:mm')).toBe('13:00');
      expect(formatHour(9, 'hh:mm a')).toBe('09:00 am');
    });

    it('formats using Intl options', () => {
      const result = formatHour(
        13,
        { hour: '2-digit', hour12: false },
        'en-US',
      );
      expect(result).toBe('13');
    });
  });

  describe('formatDay', () => {
    it('uses default weekday short format and capitalizes label', () => {
      const result = formatDay(
        new Date('2026-03-31T12:00:00Z'),
        undefined,
        'en',
      );
      expect(result).toBe('Tue');
    });

    it('formats custom day pattern without capitalization when disabled', () => {
      const result = formatDay(
        new Date('2026-03-31T12:00:00Z'),
        { month: '2-digit', day: '2-digit' },
        'en-US',
        false,
      );
      expect(result).toBe('03/31');
    });
  });

  describe('getDays', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-03-31T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('builds day labels and marks current day', () => {
      const days = getDays(3, 'monday', 'en', { weekday: 'short' });

      expect(days).toHaveLength(3);
      expect(days.map((d) => d.label)).toEqual(['Mon', 'Tue', 'Wed']);
      expect(days.map((d) => d.isToday)).toEqual([false, true, false]);
    });

    it('adds secondary labels when configured', () => {
      const days = getDays(
        2,
        'today',
        'en-US',
        { weekday: 'short' },
        { month: '2-digit', day: '2-digit' },
      );

      expect(days[0].secondaryLabel).toBe('03/31');
      expect(days[1].secondaryLabel).toBe('04/01');
    });
  });
});
