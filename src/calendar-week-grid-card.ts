import {
  CSSResultGroup,
  LitElement,
  html,
  TemplateResult,
  PropertyValues,
  unsafeCSS,
} from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';

import styles from './styles.css';

type Style = Record<string, string>;

interface IconConfig {
  icon: string;
  size?: string;
  color?: string;
  opacity?: number;
  raw_style?: string;
  style?: Style;
}

interface BackgroundConfig {
  color?: string;
  opacity?: number;
  raw_style?: string;
  style?: Style;
}

interface CellConfig {
  height?: string;
  icon?: IconConfig;
  background?: BackgroundConfig;
  raw_style?: string;
  style?: Style;
}

interface EntityConfig {
  entity: string;
  name?: string;
  filter?: string;
  cell?: CellConfig;
}

interface GridConfig {
  raw_style?: string;
  style?: Style;
}

interface CardConfig {
  type: string;
  entities: (string | EntityConfig)[];
  language?: string;
  start_hour?: number;
  end_hour?: number;
  filter?: string;
  grid?: GridConfig;
  cell?: CellConfig;
  cell_filled?: CellConfig;
  cell_blank?: CellConfig;
  raw_style?: string;
  style?: Style;
}

interface CalendarEvent {
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  summary?: string;
}

interface Event extends Omit<CalendarEvent, 'start' | 'end'> {
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

    const rawCardStyle = this.config.raw_style || '';
    const cardStyle = this.stylesObjectToString(this.config.style);
    const rawGridStyle = this.config.grid?.raw_style || '';
    const gridStyle = this.stylesObjectToString(this.config.grid?.style);

    const startHour = this.config.start_hour ?? 0;
    const endHour = this.config.end_hour ?? 24;
    const hours = Array.from(
      { length: endHour - startHour },
      (_, i) => startHour + i,
    );

    return html`
      <ha-card style="${rawCardStyle} ${cardStyle}">
        <div class="grid-container" style="${rawGridStyle} ${gridStyle}">
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
    const timeLabel = `${hour.toString().padStart(2, '0')}:00`;
    return html`
      <div class="time-label">${timeLabel}</div>
      ${days.map((day) => this.renderCell(day, hour))}
    `;
  }

  private renderCell(day: DayInfo, hour: number): TemplateResult {
    const cellDate = new Date(day.date);
    const cellStartTime = cellDate.setHours(hour);
    const cellEndTime = cellDate.setHours(hour + 1);

    const cellEvents = this.events.filter((evt) => {
      return (
        cellStartTime < evt.end.getTime() && cellEndTime > evt.start.getTime()
      );
    });

    const primaryEvent = cellEvents[0];

    const height = this.getCellConfig('height', primaryEvent);
    const size = this.getCellConfig('icon.size', primaryEvent);
    const recordStyle = this.getCellConfigStyle('style', primaryEvent);
    const rawStyle = this.getCellConfig('raw_style', primaryEvent);

    const style = `
      ${height !== undefined ? `height: ${height};` : ''}
      ${size !== undefined ? `--icon-size: ${size};` : ''}
      ${recordStyle || ''}
      ${rawStyle || ''}
    `;

    return html`
      <div class="cell ${primaryEvent ? 'has-event' : ''}" style="${style}">
        ${this.renderCurrentTimeLine(day, hour)} ${this.renderBackgroundBlock()}
        ${this.renderEventBlocks(cellEvents, cellStartTime, cellEndTime)}
        ${this.renderEventIcon(primaryEvent)}
      </div>
    `;
  }

  private renderEventIcon(event?: Event): TemplateResult {
    const icon = this.getCellConfig('icon.icon', event, 'mdi:check-circle');
    const opacity = this.getCellConfig('icon.opacity', event, 1, 1);
    const color = this.getCellConfig('icon.color', event);
    const rawStyle = this.getCellConfig('icon.raw_style', event);
    const recordStyle = this.getCellConfigStyle('icon.style', event);

    const style = `
      ${color !== undefined ? `color: ${color};` : ''}
      ${opacity !== undefined ? `opacity: ${opacity};` : ''}
      ${recordStyle || ''}
      ${rawStyle || ''}
    `;

    return html`<ha-icon icon="${icon}" style="${style}"></ha-icon>`;
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
    return cellEvents.map((evt) =>
      this.renderEventBlock(evt, cellStartTime, cellEndTime),
    );
  }

  private renderBackgroundBlock(): TemplateResult {
    const color = this.getCellConfig(
      'background.color',
      undefined,
      'transparent',
      'transparent',
    );
    const opacity = this.getCellConfig(
      'background.opacity',
      undefined,
      0.2,
      0.2,
    );
    const rawStyle = this.getCellConfig('background.raw_style', undefined);
    const recordStyle = this.getCellConfigStyle('background.style', undefined);
    const style = `
      top: 0%;
      height: 100%;
      background-color: ${color};
      ${opacity !== undefined ? `opacity: ${opacity};` : ''}
      ${recordStyle || ''}
      ${rawStyle || ''}
    `;
    return html`<div class="event-background-block" style="${style}"></div>`;
  }

  private renderEventBlock(
    evt: Event,
    cellStartTime: number,
    cellEndTime: number,
  ): TemplateResult {
    const eventStartTime = evt.start.getTime();
    const eventEndTime = evt.end.getTime();

    const start = Math.max(cellStartTime, eventStartTime);
    const end = Math.min(cellEndTime, eventEndTime);

    const duration = cellEndTime - cellStartTime;
    const topPct = ((start - cellStartTime) / duration) * 100;
    const heightPct = ((end - start) / duration) * 100;

    const t = 'transparent';
    const color = this.getCellConfig('background.color', evt, t, t);
    const opacity = this.getCellConfig('background.opacity', evt, 0.2, 0.2);
    const rawStyle = this.getCellConfig('background.raw_style', evt);
    const recordStyle = this.getCellConfigStyle('background.style', evt);

    const style = `
      top: ${topPct}%;
      height: ${heightPct}%;
      background-color: ${color};
      ${opacity !== undefined ? `opacity: ${opacity};` : ''}
      ${recordStyle || ''}
      ${rawStyle || ''}
    `;

    return html`<div class="event-block" style="${style}"></div>`;
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
