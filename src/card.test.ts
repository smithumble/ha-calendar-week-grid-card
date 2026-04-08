/* @vitest-environment jsdom */
import { render as litRender } from 'lit';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { CalendarWeekGridCard } from './card';
import type { CardConfig, HomeAssistant } from './types';

vi.mock('./configs/google_calendar_separated.yaml', () => ({
  default: {
    type: 'custom:calendar-week-grid-card',
    entities_presets: [
      {
        name: 'yasno_en',
        entities: [
          { entity: 'calendar.planned_outages' },
          { entity: 'calendar.probable_outages' },
        ],
      },
      {
        name: 'yasno_uk',
        entities: [
          { entity: 'calendar.planned_outages' },
          { entity: 'calendar.probable_outages' },
        ],
      },
    ],
    theme_values_examples: [{ color: 'red' }, { color: 'blue' }],
  },
}));
vi.mock('./configs/google_calendar_separated.yaml?import', () => ({
  default: {
    type: 'custom:calendar-week-grid-card',
    entities_presets: [
      {
        name: 'yasno_en',
        entities: [
          { entity: 'calendar.planned_outages' },
          { entity: 'calendar.probable_outages' },
        ],
      },
      {
        name: 'yasno_uk',
        entities: [
          { entity: 'calendar.planned_outages' },
          { entity: 'calendar.probable_outages' },
        ],
      },
    ],
    theme_values_examples: [{ color: 'red' }, { color: 'blue' }],
  },
}));

vi.mock('./styles.css', () => ({ default: '' }));
vi.mock('./editor/editor', () => ({
  CalendarWeekGridCardEditor: class extends HTMLElement {},
}));

let CalendarWeekGridCardClass: typeof CalendarWeekGridCard;

function createHass(overrides: Partial<HomeAssistant> = {}): HomeAssistant {
  return {
    states: {},
    config: {},
    entities: {},
    devices: {},
    language: 'en',
    callApi: async () => [],
    ...overrides,
  } as HomeAssistant;
}

function createCard(config: CardConfig): CalendarWeekGridCard {
  const card = new CalendarWeekGridCardClass();
  card.setConfig(config);
  return card;
}

function renderTemplate(template: unknown): string {
  const container = document.createElement('div');
  litRender(template as any, container);
  return container.innerHTML || '';
}

function createEvent(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Event',
    type: 'calendar',
    entity: 'calendar.work',
    filter: '',
    start: new Date('2026-03-31T10:00:00'),
    end: new Date('2026-03-31T11:00:00'),
    isAllDay: false,
    ...overrides,
  };
}

describe('CalendarWeekGridCard', () => {
  beforeAll(async () => {
    const mod = await import('./card');
    CalendarWeekGridCardClass = mod.CalendarWeekGridCard;
  });

  describe('getStubConfig', () => {
    it('maps calendar entities with cycling theme values when yasno pair is absent', () => {
      const hass = createHass({
        states: {
          'calendar.work': { entity_id: 'calendar.work', state: 'on' },
          'calendar.home': { entity_id: 'calendar.home', state: 'on' },
          'sensor.temperature': {
            entity_id: 'sensor.temperature',
            state: '20',
          },
        },
      });

      const config = CalendarWeekGridCardClass.getStubConfig(hass);

      expect(config.type).toBe('custom:calendar-week-grid-card');
      expect(config.entities).toHaveLength(2);
      expect(config.entities?.[0]).toMatchObject({ entity: 'calendar.work' });
      expect(config.entities?.[1]).toMatchObject({ entity: 'calendar.home' });

      // Hidden editor-only fields should not be present in generated stub.
      expect(config).not.toHaveProperty('entities_presets');
      expect(config).not.toHaveProperty('theme_values_examples');
    });

    it('uses yasno preset and replaces template entities when both yasno calendars exist', () => {
      const hass = createHass({
        language: 'uk-UA',
        states: {
          'calendar.yasno_kyiv_planned_outages': {
            entity_id: 'calendar.yasno_kyiv_planned_outages',
            state: 'on',
          },
          'calendar.yasno_kyiv_probable_outages': {
            entity_id: 'calendar.yasno_kyiv_probable_outages',
            state: 'on',
          },
          'calendar.other': { entity_id: 'calendar.other', state: 'on' },
        },
      });

      const config = CalendarWeekGridCardClass.getStubConfig(hass);
      const entities = (config.entities || []) as Array<{ entity?: string }>;

      expect(entities.length).toBeGreaterThan(0);
      expect(
        entities.every(
          (item) =>
            item.entity === 'calendar.yasno_kyiv_planned_outages' ||
            item.entity === 'calendar.yasno_kyiv_probable_outages',
        ),
      ).toBe(true);
    });
  });

  describe('static helpers', () => {
    it('creates editor config element', () => {
      const el = CalendarWeekGridCardClass.getConfigElement();
      expect(el).toBeTruthy();
    });
  });

  describe('lifecycle and class helpers', () => {
    it('updated triggers fetch and theme update when hass changed', () => {
      const card = createCard({ type: 'custom:calendar-week-grid-card' });
      (card as any).fetchEventsIfNeeded = vi.fn();
      (card as any).updateThemeClass = vi.fn();

      const changed = new Map<string, unknown>();
      changed.set('hass', undefined);
      (card as any).updated(changed);

      expect((card as any).fetchEventsIfNeeded).toHaveBeenCalledOnce();
      expect((card as any).updateThemeClass).toHaveBeenCalledOnce();
    });

    it('toggles dark and light classes on ha-card', () => {
      const card = createCard({ type: 'custom:calendar-week-grid-card' });
      card.hass = createHass({ themes: { darkMode: true } });

      const toggle = vi.fn();
      vi.spyOn(card, 'shadowRoot', 'get').mockReturnValue({
        querySelector: () => ({ classList: { toggle } }),
      } as any);

      (card as any).updateThemeClass();
      expect(toggle).toHaveBeenCalledWith('theme-dark', true);
      expect(toggle).toHaveBeenCalledWith('theme-light', false);
    });

    it('buildClassList includes only truthy keys', () => {
      const card = createCard({ type: 'custom:calendar-week-grid-card' });
      expect((card as any).buildClassList({ a: true, b: false, c: true })).toBe(
        'a c',
      );
    });
  });

  describe('entity normalization', () => {
    it('merges default event config and filters invalid entries', () => {
      const card = createCard({
        type: 'custom:calendar-week-grid-card',
        event: { icon: 'mdi:calendar' },
        entities: [
          'calendar.a',
          { entity: 'calendar.b', icon: 'mdi:star' },
          { entity: '' } as any,
          {} as any,
        ],
      });

      const normalized = (card as any).getNormalizedEntities();

      expect(normalized).toEqual([
        { entity: 'calendar.a', icon: 'mdi:calendar' },
        { entity: 'calendar.b', icon: 'mdi:star' },
      ]);
    });
  });

  describe('grid layout helpers', () => {
    it('prefers grid_options.rows over legacy layout_options.grid_rows', () => {
      const card = createCard({
        type: 'custom:calendar-week-grid-card',
        grid_options: { rows: 5 },
        layout_options: { grid_rows: 9 },
      });

      expect((card as any).getGridRows()).toBe(5);
    });

    it('returns fit rows template when layout-fit is enabled', () => {
      const card = createCard({
        type: 'custom:calendar-week-grid-card',
        grid_options: { rows: 4 },
      });

      const withAllDay = (card as any).getGridTemplateRows(true, 3);
      const noRows = (card as any).getGridTemplateRows(false, 0);

      expect(withAllDay).toBe('min-content repeat(4, minmax(0, 1fr))');
      expect(noRows).toBe('min-content');
    });

    it('returns undefined for auto grid rows and falls back to legacy', () => {
      const cardAuto = createCard({
        type: 'custom:calendar-week-grid-card',
        grid_options: { rows: 'auto' },
      });
      expect((cardAuto as any).getGridRows()).toBeUndefined();

      const cardLegacy = createCard({
        type: 'custom:calendar-week-grid-card',
        layout_options: { grid_rows: 6 },
      });
      expect((cardLegacy as any).getGridRows()).toBe(6);
    });
  });

  describe('visible hour trimming', () => {
    it('trims leading and trailing empty hours when enabled', () => {
      const card = createCard({
        type: 'custom:calendar-week-grid-card',
        start_hour: 8,
        end_hour: 18,
        trim_empty_hours: true,
      });

      (card as any).events = [
        {
          name: 'Event',
          type: 'calendar',
          entity: 'calendar.work',
          start: new Date('2026-03-31T10:15:00'),
          end: new Date('2026-03-31T12:30:00'),
          isAllDay: false,
        },
      ];

      const days = [
        {
          date: new Date('2026-03-31T00:00:00'),
          label: 'Tue',
          isToday: false,
        },
      ];

      expect((card as any).getVisibleHours(days)).toEqual([10, 11, 12]);
    });

    it('returns empty list when there are no timed events in range', () => {
      const card = createCard({
        type: 'custom:calendar-week-grid-card',
        start_hour: 8,
        end_hour: 18,
        trim_empty_hours: true,
      });

      (card as any).events = [
        {
          name: 'All day',
          type: 'calendar',
          entity: 'calendar.work',
          start: new Date('2026-03-31T00:00:00'),
          end: new Date('2026-04-01T00:00:00'),
          isAllDay: true,
        },
      ];

      const days = [
        {
          date: new Date('2026-03-31T00:00:00'),
          label: 'Tue',
          isToday: false,
        },
      ];

      expect((card as any).getVisibleHours(days)).toEqual([]);
    });

    it('keeps hours for offset date-time events', () => {
      const card = createCard({
        type: 'custom:calendar-week-grid-card',
        start_hour: 8,
        end_hour: 18,
        trim_empty_hours: true,
      });

      (card as any).events = [
        {
          name: 'Outage',
          type: 'calendar',
          entity: 'calendar.planned_outages',
          start: new Date(2026, 3, 8, 11, 0, 0, 0),
          end: new Date(2026, 3, 8, 13, 0, 0, 0),
          isAllDay: false,
        },
      ];

      const dayDate = new Date(2026, 3, 8, 0, 0, 0, 0);
      const days = [{ date: dayDate, label: 'Wed', isToday: false }];

      expect((card as any).getVisibleHours(days)).toEqual([11, 12]);
    });

    it('does not trim away outage when hidden event is on another day', () => {
      const card = createCard({
        type: 'custom:calendar-week-grid-card',
        start_hour: 8,
        end_hour: 18,
        trim_empty_hours: true,
        entities: [
          {
            name: 'Planned Outages',
            entity: 'calendar.planned_outages',
            filter: 'Outage',
          },
          {
            name: 'Waiting for Schedule',
            entity: 'calendar.planned_outages',
            filter: 'Waiting for Schedule',
            hide: ['Planned Outages'],
          },
        ],
      });

      (card as any).events = [
        {
          name: 'Planned Outages',
          type: 'calendar',
          entity: 'calendar.planned_outages',
          filter: 'Outage',
          start: new Date(2026, 3, 8, 11, 0, 0, 0),
          end: new Date(2026, 3, 8, 13, 0, 0, 0),
          isAllDay: false,
        },
        {
          name: 'Waiting for Schedule',
          type: 'calendar',
          entity: 'calendar.planned_outages',
          filter: 'Waiting for Schedule',
          start: new Date(2026, 3, 9, 0, 0, 0, 0),
          end: new Date(2026, 3, 10, 0, 0, 0, 0),
          isAllDay: true,
        },
      ];

      const days = [
        {
          date: new Date(2026, 3, 8, 0, 0, 0, 0),
          label: 'Wed',
          isToday: false,
        },
        {
          date: new Date(2026, 3, 9, 0, 0, 0, 0),
          label: 'Thu',
          isToday: false,
        },
      ];

      expect((card as any).getVisibleHours(days)).toEqual([11, 12]);
    });

    it('returns full range when trim_empty_hours is disabled', () => {
      const card = createCard({
        type: 'custom:calendar-week-grid-card',
        start_hour: 20,
        end_hour: 24,
        trim_empty_hours: false,
      });
      expect((card as any).getVisibleHours([])).toEqual([20, 21, 22, 23]);
    });

    it('returns empty for invalid hour bounds', () => {
      const card = createCard({
        type: 'custom:calendar-week-grid-card',
        start_hour: 10,
        end_hour: 10,
        trim_empty_hours: false,
      });
      expect((card as any).getVisibleHours([])).toEqual([]);
    });
  });

  describe('render helpers', () => {
    it('returns empty content when hass or config is missing', () => {
      const card = new CalendarWeekGridCardClass();
      expect(renderTemplate((card as any).renderCardContent())).not.toContain(
        'grid-container',
      );
    });

    it('render returns card container markup', () => {
      const card = createCard({
        type: 'custom:calendar-week-grid-card',
        days: 1,
      });
      card.hass = createHass();
      (card as any).lastFetched = Date.now();
      (card as any).events = [];

      const text = renderTemplate((card as any).render());
      expect(text).toContain('ha-card');
    });

    it('renderRow renders time label and day cells', () => {
      const card = createCard({ type: 'custom:calendar-week-grid-card' });
      const days = [
        { date: new Date('2026-03-31'), label: 'Tue', isToday: false },
      ];
      const text = renderTemplate((card as any).renderRow([], days, 10, 1));
      expect(text).toContain('10');
    });

    it('renderCellIcons renders icons for each event', () => {
      const card = createCard({ type: 'custom:calendar-week-grid-card' });
      const icons = (card as any).renderCellIcons([
        createEvent(),
        createEvent(),
      ]);
      const text = renderTemplate(icons);
      expect(text).toContain('cell-icons');
    });

    it('renderCurrentTimeLine only renders for current hour and today', () => {
      const card = createCard({ type: 'custom:calendar-week-grid-card' });
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-03-31T10:30:00'));
      const today = {
        date: new Date('2026-03-31'),
        label: 'Tue',
        isToday: true,
      };
      const notToday = {
        date: new Date('2026-03-31'),
        label: 'Tue',
        isToday: false,
      };
      expect(
        renderTemplate((card as any).renderCurrentTimeLine(today, 10)),
      ).toContain('current-time-circle');
      expect((card as any).renderCurrentTimeLine(notToday, 10)).toBe('');
      expect((card as any).renderCurrentTimeLine(today, 11)).toBe('');
      vi.useRealTimers();
    });

    it('renderTimeLabel and renderAllDayLabel format content', () => {
      const card = createCard({
        type: 'custom:calendar-week-grid-card',
        time_range: true,
        time_format: 'HH:mm',
      });
      expect(renderTemplate((card as any).renderTimeLabel(10))).toContain(
        '10:00',
      );
      expect(
        renderTemplate((card as any).renderAllDayLabel('All Day')),
      ).toContain('All Day');
    });
  });

  describe('event render internals', () => {
    it('renders event sub-block and block list', () => {
      const card = createCard({ type: 'custom:calendar-week-grid-card' });
      const sub = (card as any).renderEventSubBlock(
        { start: 0, end: 30 * 60 * 1000 },
        0,
        60 * 60 * 1000,
      );
      expect(renderTemplate(sub)).toContain('event-sub-block');

      const list = (card as any).renderEventSubBlocks(
        [{ start: 0, end: 15 * 60 * 1000 }],
        0,
        60 * 60 * 1000,
      );
      expect(list).toHaveLength(1);
    });

    it('renders event and icon with attributes', () => {
      const card = createCard({ type: 'custom:calendar-week-grid-card' });
      const event = createEvent({ icon: 'mdi:star' });
      const template = (card as any).renderEvent(
        event,
        new Date('2026-03-31T10:00:00').getTime(),
        new Date('2026-03-31T11:00:00').getTime(),
        [event],
        false,
      );
      expect(renderTemplate(template)).toContain('event-wrapper');
      expect(
        renderTemplate((card as any).renderEventIcon(event, false)),
      ).toContain('event-icon');
      expect(
        renderTemplate((card as any).renderEventIcon(undefined, false)),
      ).not.toContain('event-icon');
    });

    it('renders events list and cell content', () => {
      const card = createCard({
        type: 'custom:calendar-week-grid-card',
        all_day: 'grid',
      });
      const event = createEvent();
      const list = (card as any).renderEvents(
        [event],
        new Date('2026-03-31T10:00:00').getTime(),
        new Date('2026-03-31T11:00:00').getTime(),
        false,
      );
      expect(list).toHaveLength(1);

      const day = { date: new Date('2026-03-31'), label: 'Tue', isToday: true };
      const cell = (card as any).renderCell([event], day, 10, 1, 1);
      expect(renderTemplate(cell)).toContain('cell-wrapper');
    });
  });

  describe('data fetching', () => {
    it('fetchEventsIfNeeded respects throttle', () => {
      const card = createCard({ type: 'custom:calendar-week-grid-card' });
      (card as any).fetchEvents = vi.fn();

      (card as any).lastFetched = Date.now();
      (card as any).fetchEventsIfNeeded();
      expect((card as any).fetchEvents).not.toHaveBeenCalled();

      (card as any).lastFetched = 0;
      (card as any).fetchEventsIfNeeded();
      expect((card as any).fetchEvents).toHaveBeenCalledOnce();
    });

    it('fetchEntityEvents applies filter and merges item fields', async () => {
      const card = createCard({
        type: 'custom:calendar-week-grid-card',
        filter: 'Keep',
      });
      card.hass = createHass({
        callApi: vi.fn(
          async () =>
            [
              {
                start: { dateTime: '2026-03-31T10:00:00Z' },
                end: { dateTime: '2026-03-31T11:00:00Z' },
                summary: 'Keep',
              },
              {
                start: { dateTime: '2026-03-31T11:00:00Z' },
                end: { dateTime: '2026-03-31T12:00:00Z' },
                summary: 'Drop',
              },
            ] as any,
        ) as any,
      });

      const item = { entity: 'calendar.work', type: 'calendar' };
      const events = await (card as any).fetchEntityEvents(item, 's', 'e');
      expect(events).toHaveLength(1);
      expect(events[0].entity).toBe('calendar.work');
    });

    it('fetchEntityEvents handles errors and returns empty', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const card = createCard({ type: 'custom:calendar-week-grid-card' });
      card.hass = createHass({
        callApi: vi.fn(async () => {
          throw new Error('boom');
        }) as any,
      });
      expect(
        await (card as any).fetchEntityEvents(
          { entity: 'calendar.work' },
          's',
          'e',
        ),
      ).toEqual([]);
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('fetchEvents normalizes results and appends blank event', async () => {
      const card = createCard({
        type: 'custom:calendar-week-grid-card',
        days: 1,
        entities: ['calendar.work'],
        blank_event: { icon: 'mdi:minus' },
      });
      card.hass = createHass();
      (card as any).fetchEntityEvents = vi.fn(async () => [
        {
          start: { dateTime: '2026-03-31T10:00:00Z' },
          end: { dateTime: '2026-03-31T11:00:00Z' },
          summary: 'Meeting',
        },
      ]);

      await (card as any).fetchEvents();
      expect((card as any).events.length).toBe(2);
      expect((card as any).events[0].start).toBeInstanceOf(Date);
      expect((card as any).events[1].type).toBe('blank');
    });

    it('fetchEvents catches errors and clears events', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const card = createCard({
        type: 'custom:calendar-week-grid-card',
        entities: ['calendar.work'],
      });
      card.hass = createHass();
      (card as any).fetchEntityEvents = vi.fn(async () => {
        throw new Error('boom');
      });

      await (card as any).fetchEvents();
      expect((card as any).events).toEqual([]);
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  describe('utility wrappers', () => {
    it('getDays delegates using config and hass language', () => {
      const card = createCard({
        type: 'custom:calendar-week-grid-card',
        days: 2,
      });
      card.hass = createHass({ language: 'en' });
      const days = (card as any).getDays();
      expect(days).toHaveLength(2);
    });

    it('event utility wrappers return expected values', () => {
      const card = createCard({
        type: 'custom:calendar-week-grid-card',
        all_day: 'row',
        entities: [
          {
            entity: 'calendar.work',
            name: 'Target',
            hide: ['Hidden'],
            under: ['Target'],
          },
        ],
      });
      const events = [
        createEvent({ name: 'Hidden' }),
        createEvent({ name: 'Target' }),
        createEvent({ name: 'Keep', isAllDay: true }),
      ];
      const filtered = (card as any).filterEvents(
        events,
        new Date('2026-03-31T10:00:00').getTime(),
        new Date('2026-03-31T11:00:00').getTime(),
      );
      expect(filtered.length).toBeGreaterThan(0);
      expect(
        (card as any).filterAllDayEvents(events).some((e: any) => e.isAllDay),
      ).toBe(false);
      expect((card as any).getThemeValues(createEvent())).toEqual({});
      expect(
        (card as any).hideEvents(events).some((e: any) => e.name === 'Hidden'),
      ).toBe(false);
      expect(
        (card as any).shiftEvents(events).map((e: any) => e.name),
      ).toContain('Target');
    });

    it('getDynamicStyles returns css and deprecated fallback output', () => {
      const cardWithCss = createCard({
        type: 'custom:calendar-week-grid-card',
        css: '.x{color:red;}',
      });
      expect(String((cardWithCss as any).getDynamicStyles())).toContain('.x');

      const cardNoCss = createCard({ type: 'custom:calendar-week-grid-card' });
      expect((cardNoCss as any).getDynamicStyles()).toBeTruthy();
    });
  });
});
