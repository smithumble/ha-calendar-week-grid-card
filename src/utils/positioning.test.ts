import { describe, expect, it } from 'vitest';
import type { Event } from '../types';
import {
  calculateEventDimensions,
  calculateSubBlockPosition,
  generateEventSubBlocks,
  mergeVisibleBlocks,
} from './positioning';

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

describe('positioning utilities', () => {
  describe('calculateEventDimensions', () => {
    it('calculates percentages for event clipped by cell bounds', () => {
      const result = calculateEventDimensions(
        new Date('2026-03-31T10:15:00Z').getTime(),
        new Date('2026-03-31T10:45:00Z').getTime(),
        new Date('2026-03-31T10:00:00Z').getTime(),
        new Date('2026-03-31T11:00:00Z').getTime(),
      );

      expect(result).toEqual({
        topPct: 25,
        heightPct: 50,
        innerTopPct: -50,
        innerHeightPct: 200,
      });
    });

    it('returns zero-height and neutral inner offsets when no overlap', () => {
      const result = calculateEventDimensions(
        new Date('2026-03-31T09:00:00Z').getTime(),
        new Date('2026-03-31T10:00:00Z').getTime(),
        new Date('2026-03-31T10:00:00Z').getTime(),
        new Date('2026-03-31T11:00:00Z').getTime(),
      );

      expect(result.heightPct).toBe(0);
      expect(result.innerTopPct).toBe(0);
      expect(result.innerHeightPct).toBe(100);
    });
  });

  describe('mergeVisibleBlocks', () => {
    it('merges consecutive visible blocks for topmost event', () => {
      const topEvent = createEvent(
        'Top',
        '2026-03-31T10:00:00Z',
        '2026-03-31T10:30:00Z',
      );
      const lowerEvent = createEvent(
        'Lower',
        '2026-03-31T10:00:00Z',
        '2026-03-31T10:30:00Z',
      );
      const blocks = [
        {
          start: new Date('2026-03-31T10:00:00Z').getTime(),
          end: new Date('2026-03-31T10:05:00Z').getTime(),
        },
        {
          start: new Date('2026-03-31T10:05:00Z').getTime(),
          end: new Date('2026-03-31T10:10:00Z').getTime(),
        },
      ];

      const result = mergeVisibleBlocks(blocks, topEvent, [
        lowerEvent,
        topEvent,
      ]);
      expect(result).toEqual([
        {
          start: new Date('2026-03-31T10:00:00Z').getTime(),
          end: new Date('2026-03-31T10:10:00Z').getTime(),
        },
      ]);
    });

    it('splits visibility when another event becomes topmost', () => {
      const target = createEvent(
        'Target',
        '2026-03-31T10:00:00Z',
        '2026-03-31T10:20:00Z',
      );
      const overlay = createEvent(
        'Overlay',
        '2026-03-31T10:05:00Z',
        '2026-03-31T10:10:00Z',
      );
      const blocks = [
        {
          start: new Date('2026-03-31T10:00:00Z').getTime(),
          end: new Date('2026-03-31T10:05:00Z').getTime(),
        },
        {
          start: new Date('2026-03-31T10:05:00Z').getTime(),
          end: new Date('2026-03-31T10:10:00Z').getTime(),
        },
        {
          start: new Date('2026-03-31T10:10:00Z').getTime(),
          end: new Date('2026-03-31T10:15:00Z').getTime(),
        },
      ];

      const result = mergeVisibleBlocks(blocks, target, [target, overlay]);
      expect(result).toEqual([
        {
          start: new Date('2026-03-31T10:00:00Z').getTime(),
          end: new Date('2026-03-31T10:05:00Z').getTime(),
        },
        {
          start: new Date('2026-03-31T10:10:00Z').getTime(),
          end: new Date('2026-03-31T10:15:00Z').getTime(),
        },
      ]);
    });
  });

  describe('calculateSubBlockPosition', () => {
    it('computes top and height percentages inside a cell', () => {
      const result = calculateSubBlockPosition(
        {
          start: new Date('2026-03-31T10:15:00Z').getTime(),
          end: new Date('2026-03-31T10:30:00Z').getTime(),
        },
        new Date('2026-03-31T10:00:00Z').getTime(),
        60 * 60 * 1000,
      );

      expect(result).toEqual({ topPct: 25, heightPct: 25 });
    });
  });

  describe('generateEventSubBlocks', () => {
    it('creates 5-minute sub-blocks clipped by event bounds', () => {
      const blocks = generateEventSubBlocks(
        new Date('2026-03-31T10:03:00Z').getTime(),
        new Date('2026-03-31T10:12:00Z').getTime(),
        new Date('2026-03-31T10:00:00Z').getTime(),
        new Date('2026-03-31T10:20:00Z').getTime(),
      );

      expect(blocks).toEqual([
        {
          start: new Date('2026-03-31T10:03:00Z').getTime(),
          end: new Date('2026-03-31T10:05:00Z').getTime(),
        },
        {
          start: new Date('2026-03-31T10:05:00Z').getTime(),
          end: new Date('2026-03-31T10:10:00Z').getTime(),
        },
        {
          start: new Date('2026-03-31T10:10:00Z').getTime(),
          end: new Date('2026-03-31T10:12:00Z').getTime(),
        },
      ]);
    });

    it('respects non-aligned cell boundaries', () => {
      const blocks = generateEventSubBlocks(
        new Date('2026-03-31T10:06:00Z').getTime(),
        new Date('2026-03-31T10:16:00Z').getTime(),
        new Date('2026-03-31T10:02:00Z').getTime(),
        new Date('2026-03-31T10:17:00Z').getTime(),
      );

      expect(blocks).toEqual([
        {
          start: new Date('2026-03-31T10:06:00Z').getTime(),
          end: new Date('2026-03-31T10:10:00Z').getTime(),
        },
        {
          start: new Date('2026-03-31T10:10:00Z').getTime(),
          end: new Date('2026-03-31T10:15:00Z').getTime(),
        },
        {
          start: new Date('2026-03-31T10:15:00Z').getTime(),
          end: new Date('2026-03-31T10:16:00Z').getTime(),
        },
      ]);
    });
  });
});
