import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

import type { CalendarEvent } from '../../src/calendar-week-grid-card';

const DATA_DIR = path.resolve(__dirname, '../../media/data');

// Fixed date: Monday, May 20, 2024
export const MOCK_DATE_STR = '2024-05-20T11:38:00';

export interface MockCalendarEvent extends CalendarEvent {
  entity_id: string;
}

interface Slot {
  start: number;
  end: number;
  type: string;
}

// Mock events based on the Monday, May 20, 2024 start date
export const getMockEvents = (): MockCalendarEvent[] => {
  const baseDate = new Date(MOCK_DATE_STR);
  // Reset to start of the week (Monday)
  // May 20, 2024 is a Monday.
  baseDate.setHours(0, 0, 0, 0);

  const events: MockCalendarEvent[] = [];

  // Load data files
  const plannedRaw = fs.readFileSync(
    path.join(DATA_DIR, 'planned_1.json'),
    'utf8',
  );
  const probableRaw = fs.readFileSync(
    path.join(DATA_DIR, 'probable_1.json'),
    'utf8',
  );

  const plannedData = yaml.load(plannedRaw) as unknown;
  const probableData = yaml.load(probableRaw) as unknown;

  const GROUP_ID = '6.1';

  // Extract group data
  // @ts-expect-error - It's fine, we know it's there.
  const plannedGroup = plannedData?.[GROUP_ID] as {
    today: { slots: Slot[]; status: string };
    tomorrow: { slots: Slot[]; status: string };
  };
  // @ts-expect-error - It's fine, we know it's there.
  const probableGroup = probableData?.['25']?.['dsos']?.['902']?.['groups']?.[
    GROUP_ID
  ] as {
    slots: Record<string, Slot[]>;
  };

  if (!plannedGroup || !probableGroup) {
    console.error('Could not find group data for', GROUP_ID);
    return [];
  }

  // Iterate 7 days of the week (0=Mon, 6=Sun)
  for (let day = 0; day < 7; day++) {
    const dayDate = new Date(baseDate);
    dayDate.setDate(baseDate.getDate() + day);

    let slots: Slot[] = [];
    let source = '';
    let dayStatus = '';

    if (day === 0) {
      // Day 0 (Mon) gets "Today" data (Planned)
      source = 'planned';
      slots = plannedGroup.today.slots;
      dayStatus = plannedGroup.today.status;
    } else if (day === 1) {
      // Day 1 (Tue) gets "Tomorrow" data (Planned)
      source = 'planned';
      slots = plannedGroup.tomorrow.slots;
      dayStatus = plannedGroup.tomorrow.status;
    } else {
      // Days 2-6 get Probable data
      source = 'probable';
      slots = probableGroup?.slots?.[day.toString()];
    }

    if (dayStatus === 'ScheduleApplies' || dayStatus === 'WaitingForSchedule') {
      // Add full day event for the status
      const start = new Date(dayDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dayDate);
      end.setHours(23, 59, 59, 999);

      events.push({
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
        summary:
          dayStatus === 'ScheduleApplies'
            ? 'Schedule Applies'
            : 'Waiting for Schedule',
        entity_id: 'calendar.planned_outages',
      });
    }

    if (slots) {
      slots.forEach((slot: Slot) => {
        const start = new Date(dayDate);
        start.setHours(0, slot.start, 0, 0);

        const end = new Date(dayDate);
        end.setHours(0, slot.end, 0, 0);

        if (source === 'planned') {
          if (slot.type === 'Definite') {
            events.push({
              start: { dateTime: start.toISOString() },
              end: { dateTime: end.toISOString() },
              summary: 'Outage',
              entity_id: 'calendar.planned_outages',
            });
          }
        } else {
          if (slot.type === 'Definite') {
            events.push({
              start: { dateTime: start.toISOString() },
              end: { dateTime: end.toISOString() },
              summary: 'Probable Outage',
              entity_id: 'calendar.probable_outages',
            });
          }
        }
      });
    }
  }

  return events;
};
