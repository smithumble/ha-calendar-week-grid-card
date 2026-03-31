import { describe, expect, it } from 'vitest';
import type { CardConfig, Event } from '../types';
import { buildThemeStyle, getEventIcon, getThemeValues } from './theme';

function createEvent(overrides: Partial<Event> = {}): Event {
  return {
    name: 'Event',
    entity: 'calendar.main',
    type: 'calendar',
    filter: 'default',
    start: new Date('2026-03-31T10:00:00Z'),
    end: new Date('2026-03-31T11:00:00Z'),
    isAllDay: false,
    ...overrides,
  };
}

describe('theme utilities', () => {
  describe('getThemeValues', () => {
    it('returns empty object when theme variables are not configured', () => {
      const event = createEvent({ theme_values: { color: 'red' } });
      expect(getThemeValues(event)).toEqual({});
      expect(
        getThemeValues(event, { type: 'custom:calendar-week-grid-card' }),
      ).toEqual({});
    });

    it('prefers event theme values over base event config values', () => {
      const event = createEvent({
        theme_values: { color: 'red', opacity: 0.8 },
      });
      const config: CardConfig = {
        type: 'custom:calendar-week-grid-card',
        theme_variables: { color: {}, opacity: {}, border: {} },
        event: {
          theme_values: { color: 'blue', opacity: 0.4, border: '1px solid' },
        },
      };

      expect(getThemeValues(event, config)).toEqual({
        color: 'red',
        opacity: '0.8',
        border: '1px solid',
      });
    });

    it('uses blank and blank_all_day base theme values for blank events', () => {
      const blankAllDay = createEvent({
        type: 'blank',
        isAllDay: true,
        theme_values: { color: 'yellow' },
      });
      const config: CardConfig = {
        type: 'custom:calendar-week-grid-card',
        theme_variables: { color: {}, bg: {}, shape: {} },
        blank_event: {
          theme_values: { color: 'gray', bg: 'base' },
        },
        blank_all_day_event: {
          theme_values: { bg: 'all-day', shape: 'pill' },
        },
      };

      expect(getThemeValues(blankAllDay, config)).toEqual({
        color: 'yellow',
        bg: 'all-day',
        shape: 'pill',
      });
    });
  });

  describe('buildThemeStyle', () => {
    it('builds css custom properties style string', () => {
      const style = buildThemeStyle({
        color: 'red',
        opacity: '0.8',
      });

      expect(style).toBe(' --color: red; --opacity: 0.8;');
    });

    it('returns empty string for no values', () => {
      expect(buildThemeStyle({})).toBe('');
    });
  });

  describe('getEventIcon', () => {
    it('returns blank icon with all-day and legacy fallbacks', () => {
      const blankEvent = createEvent({ type: 'blank' });

      const config: CardConfig = {
        type: 'custom:calendar-week-grid-card',
        blank_all_day_event: { icon: 'mdi:weather-night' },
        all_day_icon: 'mdi:calendar',
      };

      expect(getEventIcon(blankEvent, true, config)).toBe('mdi:weather-night');
      expect(
        getEventIcon(
          blankEvent,
          true,
          { type: 'custom:calendar-week-grid-card' },
          undefined,
        ),
      ).toBe('');
      expect(
        getEventIcon(
          blankEvent,
          true,
          {
            type: 'custom:calendar-week-grid-card',
            all_day_icon: 'mdi:calendar',
          },
          undefined,
        ),
      ).toBe('mdi:calendar');
    });

    it('returns timed blank icon with legacy and deprecated fallback', () => {
      const blankEvent = createEvent({ type: 'blank' });

      expect(
        getEventIcon(
          blankEvent,
          false,
          {
            type: 'custom:calendar-week-grid-card',
            blank_event: { icon: 'mdi:minus-box' },
          },
          'mdi:deprecated',
        ),
      ).toBe('mdi:minus-box');

      expect(
        getEventIcon(
          blankEvent,
          false,
          { type: 'custom:calendar-week-grid-card', blank_icon: 'mdi:legacy' },
          'mdi:deprecated',
        ),
      ).toBe('mdi:legacy');

      expect(
        getEventIcon(
          blankEvent,
          false,
          { type: 'custom:calendar-week-grid-card' },
          'mdi:deprecated',
        ),
      ).toBe('mdi:deprecated');
    });

    it('returns regular event icon with priority chain and default', () => {
      const eventWithIcon = createEvent({ icon: 'mdi:star' });
      expect(
        getEventIcon(eventWithIcon, false, {
          type: 'custom:calendar-week-grid-card',
        }),
      ).toBe('mdi:star');

      const plainEvent = createEvent({ icon: undefined });
      expect(
        getEventIcon(plainEvent, false, {
          type: 'custom:calendar-week-grid-card',
          event: { icon: 'mdi:calendar-star' },
        }),
      ).toBe('mdi:calendar-star');
      expect(
        getEventIcon(plainEvent, false, {
          type: 'custom:calendar-week-grid-card',
          event_icon: 'mdi:legacy-event',
        }),
      ).toBe('mdi:legacy-event');
      expect(
        getEventIcon(
          plainEvent,
          false,
          { type: 'custom:calendar-week-grid-card' },
          undefined,
          'mdi:deprecated-event',
        ),
      ).toBe('mdi:deprecated-event');
      expect(
        getEventIcon(
          plainEvent,
          false,
          { type: 'custom:calendar-week-grid-card' },
          undefined,
          undefined,
          'mdi:deprecated-filled',
        ),
      ).toBe('mdi:deprecated-filled');
      expect(
        getEventIcon(plainEvent, false, {
          type: 'custom:calendar-week-grid-card',
        }),
      ).toBe('mdi:check-circle');
    });
  });
});
