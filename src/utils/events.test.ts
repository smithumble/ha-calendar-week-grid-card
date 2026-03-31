import { describe, expect, it } from 'vitest';
import type { EntityConfig, Event, EventCriteria } from '../types';
import {
  filterAllDayEvents,
  filterEvents,
  hideEvents,
  matchesCriteria,
  shiftEvents,
} from './events';

function createEvent(
  name: string,
  start: string,
  end: string,
  overrides: Partial<Event> = {},
): Event {
  return {
    name,
    entity: `calendar.${name.toLowerCase()}`,
    type: 'calendar',
    filter: 'default',
    start: new Date(start),
    end: new Date(end),
    isAllDay: false,
    ...overrides,
  };
}

describe('events utilities', () => {
  describe('filterEvents', () => {
    it('keeps only events that overlap the range', () => {
      const events = [
        createEvent('Before', '2026-03-31T08:00:00Z', '2026-03-31T09:00:00Z'),
        createEvent(
          'OverlapStart',
          '2026-03-31T09:30:00Z',
          '2026-03-31T10:30:00Z',
        ),
        createEvent('Inside', '2026-03-31T10:15:00Z', '2026-03-31T10:45:00Z'),
        createEvent('After', '2026-03-31T11:00:00Z', '2026-03-31T12:00:00Z'),
      ];

      const result = filterEvents(
        events,
        new Date('2026-03-31T10:00:00Z').getTime(),
        new Date('2026-03-31T11:00:00Z').getTime(),
      );

      expect(result.map((event) => event.name)).toEqual([
        'OverlapStart',
        'Inside',
      ]);
    });

    it('excludes events that only touch boundaries', () => {
      const events = [
        createEvent(
          'EndsAtStart',
          '2026-03-31T08:00:00Z',
          '2026-03-31T10:00:00Z',
        ),
        createEvent(
          'StartsAtEnd',
          '2026-03-31T11:00:00Z',
          '2026-03-31T12:00:00Z',
        ),
      ];

      const result = filterEvents(
        events,
        new Date('2026-03-31T10:00:00Z').getTime(),
        new Date('2026-03-31T11:00:00Z').getTime(),
      );

      expect(result).toEqual([]);
    });
  });

  describe('filterAllDayEvents', () => {
    it('removes all-day events when all_day mode is row', () => {
      const events = [
        createEvent('Timed', '2026-03-31T10:00:00Z', '2026-03-31T11:00:00Z'),
        createEvent('AllDay', '2026-03-31T00:00:00Z', '2026-04-01T00:00:00Z', {
          isAllDay: true,
        }),
      ];

      const result = filterAllDayEvents(events, 'row');
      expect(result.map((event) => event.name)).toEqual(['Timed']);
    });

    it('returns events unchanged for other modes', () => {
      const events = [
        createEvent('Timed', '2026-03-31T10:00:00Z', '2026-03-31T11:00:00Z'),
        createEvent('AllDay', '2026-03-31T00:00:00Z', '2026-04-01T00:00:00Z', {
          isAllDay: true,
        }),
      ];

      expect(filterAllDayEvents(events, 'grid')).toBe(events);
      expect(filterAllDayEvents(events)).toBe(events);
    });
  });

  describe('matchesCriteria', () => {
    const event = createEvent(
      'Meeting',
      '2026-03-31T10:00:00Z',
      '2026-03-31T11:00:00Z',
      {
        type: 'work',
        entity: 'calendar.team',
        filter: 'important',
      },
    );

    it('returns false for empty criteria', () => {
      expect(matchesCriteria(event, {})).toBe(false);
    });

    it('requires all specified fields to match', () => {
      const matching: EventCriteria = {
        name: 'Meeting',
        type: 'work',
        entity: 'calendar.team',
        filter: 'important',
      };
      const mismatched: EventCriteria = { name: 'Meeting', type: 'personal' };

      expect(matchesCriteria(event, matching)).toBe(true);
      expect(matchesCriteria(event, mismatched)).toBe(false);
    });
  });

  describe('hideEvents', () => {
    it('returns original array when there are no hide rules', () => {
      const events = [
        createEvent(
          'Controller',
          '2026-03-31T10:00:00Z',
          '2026-03-31T10:30:00Z',
        ),
      ];

      const result = hideEvents(events, []);
      expect(result).toBe(events);
    });

    it('removes events matching hide criteria triggered by source event name', () => {
      const controller = createEvent(
        'Controller',
        '2026-03-31T10:00:00Z',
        '2026-03-31T10:30:00Z',
      );
      const targetByName = createEvent(
        'Target',
        '2026-03-31T10:15:00Z',
        '2026-03-31T10:45:00Z',
      );
      const targetByEntity = createEvent(
        'Other',
        '2026-03-31T10:20:00Z',
        '2026-03-31T10:50:00Z',
        { entity: 'calendar.to-hide' },
      );
      const keep = createEvent(
        'Keep',
        '2026-03-31T10:30:00Z',
        '2026-03-31T11:00:00Z',
      );

      const entities: EntityConfig[] = [
        {
          entity: 'calendar.controller',
          name: 'Controller',
          hide: ['Target', { entity: 'calendar.to-hide' }],
        },
      ];

      const result = hideEvents(
        [controller, targetByName, targetByEntity, keep],
        entities,
      );
      expect(result.map((event) => event.name)).toEqual(['Controller', 'Keep']);
    });
  });

  describe('shiftEvents', () => {
    it('moves matching events under the configured event', () => {
      const lead = createEvent(
        'Lead',
        '2026-03-31T10:00:00Z',
        '2026-03-31T10:30:00Z',
      );
      const blocker = createEvent(
        'Blocker',
        '2026-03-31T10:10:00Z',
        '2026-03-31T10:20:00Z',
      );
      const other = createEvent(
        'Other',
        '2026-03-31T10:15:00Z',
        '2026-03-31T10:25:00Z',
      );

      const entities: EntityConfig[] = [
        { entity: 'calendar.lead', name: 'Lead', under: ['Blocker'] },
      ];

      const result = shiftEvents([lead, blocker, other], entities);
      expect(result.map((event) => event.name)).toEqual([
        'Blocker',
        'Lead',
        'Other',
      ]);
    });

    it('moves matching events over the configured event', () => {
      const blocker = createEvent(
        'Blocker',
        '2026-03-31T10:00:00Z',
        '2026-03-31T10:30:00Z',
      );
      const anchor = createEvent(
        'Anchor',
        '2026-03-31T10:10:00Z',
        '2026-03-31T10:20:00Z',
      );
      const other = createEvent(
        'Other',
        '2026-03-31T10:15:00Z',
        '2026-03-31T10:25:00Z',
      );

      const entities: EntityConfig[] = [
        { entity: 'calendar.anchor', name: 'Anchor', over: ['Blocker'] },
      ];

      const result = shiftEvents([blocker, anchor, other], entities);
      expect(result.map((event) => event.name)).toEqual([
        'Anchor',
        'Blocker',
        'Other',
      ]);
    });

    it('returns original order when shift rules have no matches', () => {
      const first = createEvent(
        'First',
        '2026-03-31T10:00:00Z',
        '2026-03-31T10:30:00Z',
      );
      const second = createEvent(
        'Second',
        '2026-03-31T10:30:00Z',
        '2026-03-31T11:00:00Z',
      );
      const entities: EntityConfig[] = [
        {
          entity: 'calendar.first',
          name: 'First',
          under: [{ name: 'Missing' }],
        },
      ];

      const result = shiftEvents([first, second], entities);
      expect(result.map((event) => event.name)).toEqual(['First', 'Second']);
    });
  });
});
