import { HomeAssistant } from 'custom-card-helpers';
import {
  CSSResultGroup,
  LitElement,
  html,
  TemplateResult,
  PropertyValues,
  unsafeCSS,
} from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import styles from './styles.css';

type Style = Record<string, string>;

interface IconConfig {
  icon: string;
  style?: Style;
  raw_style?: string;
}

interface BackgroundConfig {
  style?: Style;
  raw_style?: string;
}

interface CellConfig {
  icon?: IconConfig;
  background?: BackgroundConfig;
  style?: Style;
  raw_style?: string;
}

interface EntityConfig {
  entity: string;
  name?: string;
  filter?: string;
  cell?: CellConfig;
}

interface GridConfig {
  style?: Style;
  raw_style?: string;
}

export interface CardConfig {
  type: string;
  entities: (string | EntityConfig)[];
  language?: string;
  time_format?: string;
  start_hour?: number;
  end_hour?: number;
  filter?: string;
  grid?: GridConfig;
  cell?: CellConfig;
  cell_filled?: CellConfig;
  cell_blank?: CellConfig;
  style?: Style;
  raw_style?: string;
}

export interface CalendarEvent {
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  summary?: string;
}

export interface Event extends Omit<CalendarEvent, 'start' | 'end'> {
  start: Date; // override with Date object
  end: Date; // override with Date object
  entity?: string;
  cell?: CellConfig;
}

interface DayInfo {
  date: Date;
  label: string;
  isToday: boolean;
}

@customElement('calendar-week-grid-card')
export class CalendarWeekGridCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private config?: CardConfig;
  @state() private events: Event[] = [];

  private lastFetched: number = 0;

  static get styles(): CSSResultGroup {
    return unsafeCSS(styles);
  }

  public setConfig(config: CardConfig): void {
    if (!config.entities) {
      throw new Error('Please define entities');
    }
    this.config = config;
  }

  protected updated(changedProps: PropertyValues): void {
    if (changedProps.has('hass')) {
      this.fetchEventsIfNeeded();
    }
  }

  protected render(): TemplateResult {
    if (!this.hass || !this.config) {
      return html``;
    }

    if (!this.lastFetched) {
      this.fetchEvents();
      return html`<ha-card>Loading...</ha-card>`;
    }

    const days = this.getDays();

    const cardStyle = this.stylesObjectToString(this.config.style) || '';
    const rawCardStyle = this.config.raw_style || '';
    const gridStyle = this.stylesObjectToString(this.config.grid?.style) || '';
    const rawGridStyle = this.config.grid?.raw_style || '';

    const startHour = this.config.start_hour ?? 0;
    const endHour = this.config.end_hour ?? 24;
    const hours = Array.from(
      { length: endHour - startHour },
      (_, i) => startHour + i,
    );

    return html`
      <ha-card style="${cardStyle} ${rawCardStyle}">
        <div class="grid-container" style="${gridStyle} ${rawGridStyle}">
          <!-- Header Row -->
          <div></div>
          ${days.map(
            (day) => html`
              <div class="day-header ${day.isToday ? 'today' : ''}">
                ${day.label}
              </div>
            `,
          )}

          <!-- Grid Rows -->
          ${hours.map((hour) => this.renderRow(hour, days))}
        </div>
      </ha-card>
    `;
  }

  private renderRow(hour: number, days: DayInfo[]): TemplateResult {
    const timeLabel = this.formatTime(hour);
    return html`
      <div class="time-label">${timeLabel}</div>
      ${days.map((day) => this.renderCell(day, hour))}
    `;
  }

  private formatTime(hour: number): string {
    const format = this.config?.time_format || 'h A';

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

  private renderCell(day: DayInfo, hour: number): TemplateResult {
    const cellDate = new Date(day.date);
    const cellStartTime = cellDate.setHours(hour);
    const cellEndTime = cellDate.setHours(hour + 1);

    // Filter events that are within the cell time range
    const cellEvents = this.events.filter((event) => {
      return (
        cellStartTime < event.end.getTime() &&
        cellEndTime > event.start.getTime()
      );
    });

    // Main event is the first one in the list
    const mainEvent = cellEvents[0];

    // Reverse the list to render the events in the correct order
    cellEvents.reverse();

    const style = this.getCellConfigStyle('style', mainEvent) || '';
    const rawStyle = this.getCellConfig('raw_style', mainEvent) || '';

    return html`
      <div class="cell-wrapper">
        <div
          class="cell ${mainEvent ? 'has-event' : ''}"
          style="${style} ${rawStyle}"
        >
          ${this.renderBackgroundBlock()}
          ${this.renderEventBlocks(cellEvents, cellStartTime, cellEndTime)}
          ${this.renderEventIcon(mainEvent)}
        </div>
        ${this.renderCurrentTimeLine(day, hour)}
      </div>
    `;
  }

  private renderEventIcon(event?: Event): TemplateResult {
    const icon = this.getCellConfig('icon.icon', event, 'mdi:check-circle');
    const style = this.getCellConfigStyle('icon.style', event) || '';
    const rawStyle = this.getCellConfig('icon.raw_style', event) || '';

    return html`<ha-icon
      icon="${icon}"
      style="${style} ${rawStyle}"
    ></ha-icon>`;
  }

  private renderCurrentTimeLine(
    day: DayInfo,
    hour: number,
  ): TemplateResult | string {
    if (!day.isToday) return '';

    const now = new Date();
    if (now.getHours() !== hour) return '';

    const minutes = now.getMinutes();
    const topPct = (minutes / 60) * 100;

    const style = `top: ${topPct}%;`;

    return html`
      <div class="current-time-line" style="${style}">
        <div class="current-time-circle"></div>
      </div>
    `;
  }

  private renderEventBlocks(
    cellEvents: Event[],
    cellStartTime: number,
    cellEndTime: number,
  ): TemplateResult[] {
    return cellEvents.map((event) =>
      this.renderEventBlock(event, cellStartTime, cellEndTime),
    );
  }

  private renderEventBlock(
    event: Event,
    cellStartTime: number,
    cellEndTime: number,
  ): TemplateResult {
    const eventStartTime = event.start.getTime();
    const eventEndTime = event.end.getTime();

    const start = Math.max(cellStartTime, eventStartTime);
    const end = Math.min(cellEndTime, eventEndTime);

    const duration = cellEndTime - cellStartTime;
    const topPct = ((start - cellStartTime) / duration) * 100;
    const heightPct = ((end - start) / duration) * 100;

    const rawStyle = this.getCellConfig('background.raw_style', event) || '';
    const style = this.getCellConfigStyle('background.style', event) || '';

    if (heightPct < 0.01) return html``;

    const innerHeightPct = (100 / heightPct) * 100;
    const innerTopPct = -(topPct / heightPct) * 100;

    return html`<div
      class="event-block-wrapper"
      style="top: ${topPct}%; height: ${heightPct}%;"
    >
      <div
        class="event-block"
        style="top: ${innerTopPct}%; height: ${innerHeightPct}%; ${style} ${rawStyle}"
      ></div>
    </div>`;
  }

  private renderBackgroundBlock(): TemplateResult {
    const style = this.getCellConfigStyle('background.style', undefined) || '';
    const rawStyle =
      this.getCellConfig('background.raw_style', undefined) || '';

    return html`<div class="event-block-wrapper" style="top: 0%; height: 100%;">
      <div
        class="event-block"
        style="top: 0%; height: 100%; ${style} ${rawStyle}"
      ></div>
    </div>`;
  }

  private getDays(): DayInfo[] {
    const days: DayInfo[] = [];
    const today = this.toHaTime(new Date());
    today.setHours(0, 0, 0, 0);

    const lang = this.config?.language || this.hass?.language || 'en';
    const dateFormat = new Intl.DateTimeFormat(lang, { weekday: 'short' });

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      const weekday = dateFormat.format(date);
      const label = weekday.charAt(0).toUpperCase() + weekday.slice(1);

      days.push({
        date: date,
        label: label,
        isToday: i === 0,
      });
    }
    return days;
  }

  private fetchEventsIfNeeded(): void {
    const now = Date.now();
    if (this.lastFetched && now - this.lastFetched < 60 * 1000) {
      return;
    }
    this.fetchEvents();
  }

  private async fetchEvents(): Promise<void> {
    if (!this.hass) return;

    const entities = this.getNormalizedEntities();
    if (!entities.length) {
      this.events = [];
      return;
    }

    this.lastFetched = Date.now();

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 10);

    const startIso = start.toISOString();
    const endIso = end.toISOString();

    try {
      const promises = entities.map((item) =>
        this.fetchEntityEvents(item, startIso, endIso),
      );
      const results = await Promise.all(promises);
      const rawEvents = results.flat();

      this.events = rawEvents.map((e) => ({
        ...e,
        start: this.normalizeDate(e.start),
        end: this.normalizeDate(e.end),
      }));
    } catch (e) {
      console.error('CalendarWeekGridCard: Error fetching events:', e);
      this.events = [];
    }
  }

  private async fetchEntityEvents(
    item: EntityConfig,
    startIso: string,
    endIso: string,
  ): Promise<Event[]> {
    if (!this.hass) return [];
    try {
      const events = await this.hass.callApi<CalendarEvent[]>(
        'GET',
        `calendars/${item.entity}?start=${startIso}&end=${endIso}`,
      );

      const filterText = item.filter || this.config?.filter;

      return events
        .filter(
          (e) => !filterText || (e.summary && e.summary.includes(filterText)),
        )
        .map((e) => ({ ...e, ...item }) as unknown as Event);
    } catch (e) {
      console.error(`CalendarWeekGridCard: Failed to fetch ${item.entity}`, e);
      return [];
    }
  }

  private normalizeDate(
    dateObj: { dateTime?: string; date?: string } | Date,
  ): Date {
    if (dateObj instanceof Date) return dateObj;
    if (dateObj.dateTime) {
      return this.toHaTime(new Date(dateObj.dateTime));
    }
    if (dateObj.date) {
      return new Date(dateObj.date + 'T00:00:00');
    }
    return new Date();
  }

  private getNormalizedEntities(): EntityConfig[] {
    const rawEntities = this.config?.entities || [];
    return rawEntities
      .map((item) => {
        if (typeof item === 'string') return { entity: item };
        return item;
      })
      .filter((item): item is EntityConfig => !!(item && item.entity));
  }

  private getCellConfig<T = string | number>(
    path: string,
    event?: Event,
    defaultEventValue?: T,
    defaultBlankValue?: T,
  ): T | undefined {
    const keys = path.split('.');

    const getNested = (obj: CellConfig, pathKeys: string[]) => {
      return pathKeys.reduce(
        (
          acc: any, // eslint-disable-line @typescript-eslint/no-explicit-any
          key,
        ) =>
          acc && typeof acc === 'object' && acc[key] !== undefined
            ? acc[key]
            : undefined,
        obj,
      );
    };

    const globalConfig = this.config?.cell
      ? getNested(this.config.cell, keys)
      : undefined;

    if (event) {
      const eventConfig = event.cell ? getNested(event.cell, keys) : undefined;
      const filledGlobalConfig = this.config?.cell_filled
        ? getNested(this.config.cell_filled, keys)
        : undefined;
      return (
        eventConfig ?? filledGlobalConfig ?? globalConfig ?? defaultEventValue
      );
    } else {
      const blankGlobalConfig = this.config?.cell_blank
        ? getNested(this.config.cell_blank, keys)
        : undefined;
      return blankGlobalConfig ?? globalConfig ?? defaultBlankValue;
    }
  }

  private getCellConfigStyle(path: string, event?: Event): string | undefined {
    const config = this.getCellConfig<Style>(path, event);
    return this.stylesObjectToString(config);
  }

  private stylesObjectToString(style?: Style): string {
    if (!style) return '';
    return Object.entries(style)
      .map(([k, v]) => `${k}: ${v};`)
      .join(' ');
  }

  private toHaTime(date: Date): Date {
    try {
      const tz = this.hass?.config?.time_zone;
      if (!tz) return date;
      const str = date.toLocaleString('en-US', { timeZone: tz });
      return new Date(str);
    } catch (e) {
      console.error('Timezone conversion error', e);
      return date;
    }
  }
}
