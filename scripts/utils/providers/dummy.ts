import { toTimeZoneISOString, MOCK_DATE_STR } from '../datetime';
import { BaseProvider } from './base';
import type { MockCalendar } from './index';

export class DummyProvider extends BaseProvider {
  constructor() {
    super('dummy');
  }

  getAvailableDataSources(): string[] {
    return ['data_1'];
  }

  getCalendars(): MockCalendar[] {
    const baseDate = new Date(MOCK_DATE_STR);
    baseDate.setHours(0, 0, 0, 0);

    // Calendar 1: Work Schedule
    const workCalendar: MockCalendar = {
      entity_id: 'calendar.work_schedule',
      events: (() => {
        const events: any[] = [];

        // Sleep: 23:00 - 07:00
        for (let day = 0; day < 8; day++) {
          const dayOffset = day * 24 * 60 * 60 * 1000;
          events.push({
            start: {
              dateTime: toTimeZoneISOString(
                new Date(
                  baseDate.getTime() -
                    24 * 60 * 60 * 1000 +
                    dayOffset +
                    23 * 60 * 60 * 1000,
                ),
              ),
            },
            end: {
              dateTime: toTimeZoneISOString(
                new Date(baseDate.getTime() + dayOffset + 7 * 60 * 60 * 1000),
              ),
            },
            summary: 'Sleep',
          });
        }

        // Monday through Friday (0-4 days from base date)
        for (let day = 0; day < 5; day++) {
          const dayOffset = day * 24 * 60 * 60 * 1000;

          // Working Hours: 9:00 - 18:00
          events.push({
            start: {
              dateTime: toTimeZoneISOString(
                new Date(baseDate.getTime() + dayOffset + 9 * 60 * 60 * 1000),
              ),
            },
            end: {
              dateTime: toTimeZoneISOString(
                new Date(baseDate.getTime() + dayOffset + 18 * 60 * 60 * 1000),
              ),
            },
            summary: 'Working Hours',
          });

          // Stand Up: 10:00 - 11:00
          events.push({
            start: {
              dateTime: toTimeZoneISOString(
                new Date(baseDate.getTime() + dayOffset + 10 * 60 * 60 * 1000),
              ),
            },
            end: {
              dateTime: toTimeZoneISOString(
                new Date(baseDate.getTime() + dayOffset + 11 * 60 * 60 * 1000),
              ),
            },
            summary: 'Stand Up',
          });
        }

        // Wednesday - Planning: 12:00 - 13:30
        const wednesdayOffset = 2 * 24 * 60 * 60 * 1000;
        events.push({
          start: {
            dateTime: toTimeZoneISOString(
              new Date(
                baseDate.getTime() + wednesdayOffset + 12 * 60 * 60 * 1000,
              ),
            ),
          },
          end: {
            dateTime: toTimeZoneISOString(
              new Date(
                baseDate.getTime() +
                  wednesdayOffset +
                  13 * 60 * 60 * 1000 +
                  30 * 60 * 1000,
              ),
            ),
          },
          summary: 'Planning',
        });

        // Friday - Beer: 18:30 - 20:00
        const fridayOffset = 4 * 24 * 60 * 60 * 1000;
        events.push({
          start: {
            dateTime: toTimeZoneISOString(
              new Date(baseDate.getTime() + fridayOffset + 19 * 60 * 60 * 1000),
            ),
          },
          end: {
            dateTime: toTimeZoneISOString(
              new Date(baseDate.getTime() + fridayOffset + 22 * 60 * 60 * 1000),
            ),
          },
          summary: 'Beer',
        });

        return events;
      })(),
    };

    // Calendar 2: Personal Events
    const personalCalendar: MockCalendar = {
      entity_id: 'calendar.personal',
      events: [
        // Monday - Gym session
        {
          start: {
            dateTime: toTimeZoneISOString(
              new Date(baseDate.getTime() + 18 * 60 * 60 * 1000),
            ),
          },
          end: {
            dateTime: toTimeZoneISOString(
              new Date(baseDate.getTime() + 19 * 30 * 60 * 1000),
            ),
          },
          summary: 'Gym Session',
        },
        // Thursday - Doctor appointment
        {
          start: {
            dateTime: toTimeZoneISOString(
              new Date(baseDate.getTime() + (72 + 10) * 60 * 60 * 1000),
            ),
          },
          end: {
            dateTime: toTimeZoneISOString(
              new Date(baseDate.getTime() + (72 + 11) * 60 * 60 * 1000),
            ),
          },
          summary: 'Doctor Appointment',
        },
        // Friday - Weekend planning
        {
          start: {
            dateTime: toTimeZoneISOString(
              new Date(baseDate.getTime() + (96 + 16) * 60 * 60 * 1000),
            ),
          },
          end: {
            dateTime: toTimeZoneISOString(
              new Date(baseDate.getTime() + (96 + 17) * 60 * 60 * 1000),
            ),
          },
          summary: 'Weekend Planning',
        },
      ],
    };

    return [workCalendar, personalCalendar];
  }
}
