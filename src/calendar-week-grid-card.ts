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
import { generateCssFromDeprecatedStyleConfig } from './deprecated';
import styles from './styles.css';
import type {
  CardConfig,
  CalendarEvent,
  Event,
  DayInfo,
  EntityConfig,
} from './types';

@customElement('calendar-week-grid-card')
export class CalendarWeekGridCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private config?: CardConfig;
  @state() private events: Event[] = [];
  @state() private cellHeight: number = 24;

  private lastFetched: number = 0;

  // ============================================================================
  // Public API
  // ============================================================================

  public setConfig(config: CardConfig): void {
    if (!config.entities) {
      throw new Error('Please define entities');
    }
    this.config = config;
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  protected updated(changedProps: PropertyValues): void {
    if (changedProps.has('hass')) {
      this.fetchEventsIfNeeded();
    }
    // Update icons from CSS custom properties after DOM updates
    requestAnimationFrame(() => {
      this.updateIconsAndHeightFromCss();
    });
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

    const startHour = this.config.start_hour ?? 0;
    const endHour = this.config.end_hour ?? 24;
    const hours = Array.from(
      { length: endHour - startHour },
      (_, i) => startHour + i,
    );

    return html`
      <style>
        ${unsafeCSS(styles)}
      </style>
      <style>
        ${this.getDynamicStyles()}
      </style>
      <ha-card>
        <div class="grid-container">
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

  // ============================================================================
  // Style Helpers
  // ============================================================================

  private getDynamicStyles(): CSSResultGroup {
    if (!this.config) return unsafeCSS('');

    if (this.config.css) {
      return unsafeCSS(this.config.css);
    }

    // Deprecated: generate CSS from config objects
    return unsafeCSS(
      generateCssFromDeprecatedStyleConfig(
        this.config as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      ),
    );
  }

  private updateIconsAndHeightFromCss(): void {
    // Find all ha-icon elements and check if they have --icon CSS custom property set
    const icons = this.shadowRoot?.querySelectorAll('ha-icon') || [];
    icons.forEach((iconEl) => {
      const computedStyle = window.getComputedStyle(iconEl);
      const iconValue = computedStyle.getPropertyValue('--icon').trim();
      if (iconValue) {
        iconEl.setAttribute('icon', iconValue);
      }
    });

    const cell = this.shadowRoot?.querySelector('.cell');
    if (cell) {
      const heightStr = window.getComputedStyle(cell).height;
      const height = parseFloat(heightStr);
      if (height && Math.abs(height - this.cellHeight) > 0.1) {
        this.cellHeight = height;
      }
    }
  }

  // ============================================================================
  // Render
  // ============================================================================

  private renderRow(hour: number, days: DayInfo[]): TemplateResult {
    const timeLabel = this.formatTime(hour);
    return html`
      <div class="time-label">${timeLabel}</div>
      ${days.map((day) => this.renderCell(day, hour))}
    `;
  }

  private renderCell(day: DayInfo, hour: number): TemplateResult {
    const cellDate = new Date(day.date);
    const cellStartTime = cellDate.setHours(hour);
    const cellEndTime = cellDate.setHours(hour + 1);

    // Filter events that are within the cell time range
    const cellEvents = this.filterEvents(
      this.events,
      cellStartTime,
      cellEndTime,
    );

    // Reverse the list to render the events in the correct order
    cellEvents.reverse();

    // Main event is the last one in the list
    const mainEvent = cellEvents[cellEvents.length - 1];

    const iconPosition = this.getIconPosition();
    const iconMode = this.getIconMode();

    // Determine which event icons to show and whether to show blank icon
    let cellIconEvents: Event[] = [];
    let showBlankIcon = false;

    if (iconMode === 'all') {
      if (iconPosition === 'cell') {
        cellIconEvents = cellEvents;
        showBlankIcon = cellIconEvents.length === 0;
      } else {
        cellIconEvents = [];
        showBlankIcon = true;
      }
    } else {
      if (iconPosition === 'cell') {
        showBlankIcon = !mainEvent;
        cellIconEvents = mainEvent ? [mainEvent] : [];
      } else {
        cellIconEvents = [];
        showBlankIcon = true;
      }
    }

    return html`
      <div class="cell-wrapper">
        <div class="cell ${mainEvent ? 'has-event' : ''}">
          ${this.renderBlankEvent(showBlankIcon)}
          ${this.renderEvents(
            cellEvents,
            cellStartTime,
            cellEndTime,
            mainEvent,
          )}
          ${this.renderCellIcons(cellIconEvents)}
        </div>
        ${this.renderCurrentTimeLine(day, hour)}
      </div>
    `;
  }

  private renderBlankEvent(showBlankIcon: boolean = false): TemplateResult {
    return html`<div class="event-wrapper" style="top: 0%; height: 100%;">
      <div class="event-block event-block-blank" style="top: 0%; height: 100%;">
        ${showBlankIcon ? this.renderEventIcon(undefined) : ''}
      </div>
    </div>`;
  }

  private renderEvents(
    cellEvents: Event[],
    cellStartTime: number,
    cellEndTime: number,
    mainEvent?: Event,
  ): TemplateResult[] {
    return cellEvents.map((event) => {
      const iconPosition = this.getIconPosition();
      const iconMode = this.getIconMode();

      // Determine if this event should show an icon
      const shouldShowIcon =
        iconPosition === 'event' &&
        (iconMode === 'all' || (iconMode === 'top' && event === mainEvent));

      return this.renderEvent(
        event,
        cellStartTime,
        cellEndTime,
        cellEvents,
        shouldShowIcon,
      );
    });
  }

  private renderEvent(
    event: Event,
    cellStartTime: number,
    cellEndTime: number,
    cellEvents: Event[],
    shouldShowIcon?: boolean,
  ): TemplateResult {
    const eventStartTime = event.start.getTime();
    const eventEndTime = event.end.getTime();

    const start = Math.max(cellStartTime, eventStartTime);
    const end = Math.min(cellEndTime, eventEndTime);

    const duration = cellEndTime - cellStartTime;

    const startRatio = (start - cellStartTime) / duration;
    const endRatio = (end - cellStartTime) / duration;

    const topPx = Math.round(startRatio * this.cellHeight);
    const bottomPx = Math.round(endRatio * this.cellHeight);

    const heightPx = bottomPx - topPx;

    const blocks = this.generateEventSubBlocks(
      start,
      end,
      cellStartTime,
      cellEndTime,
    );

    const innerHeightPx = this.cellHeight;
    const innerTopPx = -topPx;

    // Filter and merge blocks that should be rendered
    const mergedBlocks: Array<{ start: number; end: number }> = [];
    let currentBlock: { start: number; end: number } | null = null;

    for (const block of blocks) {
      // Find all events that overlap with this block time period
      const events = this.filterEvents(cellEvents, block.start, block.end);

      // The last one is the topmost event
      if (events.length > 0 && events[events.length - 1] === event) {
        if (currentBlock && currentBlock.end === block.start) {
          currentBlock.end = block.end;
        } else {
          if (currentBlock) mergedBlocks.push(currentBlock);
          currentBlock = { ...block };
        }
      } else {
        if (currentBlock) {
          mergedBlocks.push(currentBlock);
          currentBlock = null;
        }
      }
    }

    if (currentBlock) mergedBlocks.push(currentBlock);

    const wrapperStyle = `top: ${topPx}px; height: ${heightPx}px;`;
    const innerStyle = `top: ${innerTopPx}px; height: ${innerHeightPx}px;`;

    return html`<div
      class="event-wrapper"
      style="${wrapperStyle}"
      data-entity="${event.entity || ''}"
      data-filter="${event.filter || ''}"
    >
      <div class="event-sub-blocks" style="${innerStyle}">
        ${this.renderEventSubBlocks(mergedBlocks, cellStartTime, duration)}
      </div>
      <div class="event-block" style="${innerStyle}"></div>
      <div class="event-icon-overlay" style="${innerStyle}">
        ${shouldShowIcon ? this.renderEventIcon(event) : ''}
      </div>
    </div>`;
  }

  private renderEventSubBlocks(
    blocks: { start: number; end: number }[],
    cellStartTime: number,
    duration: number,
  ): TemplateResult[] {
    return blocks.map((block) =>
      this.renderEventSubBlock(block, cellStartTime, duration),
    );
  }

  private renderEventSubBlock(
    block: { start: number; end: number },
    cellStartTime: number,
    duration: number,
  ): TemplateResult {
    const startRatio = (block.start - cellStartTime) / duration;
    const endRatio = (block.end - cellStartTime) / duration;

    const blockTopPx = Math.round(startRatio * this.cellHeight);
    const blockBottomPx = Math.round(endRatio * this.cellHeight);

    const blockHeightPx = blockBottomPx - blockTopPx;

    const style = `top: ${blockTopPx}px; height: ${blockHeightPx}px;`;

    return html`<div class="event-sub-block" style="${style}"></div>`;
  }

  private renderEventIcon(event?: Event | undefined): TemplateResult {
    // Icon will be set via CSS --icon custom property by updateIconsFromCss
    return html`<ha-icon
      class="event-icon"
      data-entity="${event?.entity || ''}"
      data-filter="${event?.filter || ''}"
    ></ha-icon>`;
  }

  private renderCellIcons(events: Event[]): TemplateResult {
    return html`${events.map((event) => this.renderEventIcon(event))}`;
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

  // ============================================================================
  // Data Fetching
  // ============================================================================

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

      // this.events.push({
      //   start: new Date(start),
      //   end: new Date(end),
      //   entity: '',
      //   filter: '',
      // });
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

  // ============================================================================
  // Utilities
  // ============================================================================

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

  private filterEvents(
    events: Event[],
    startTime: number,
    endTime: number,
  ): Event[] {
    return events.filter((event) => {
      const eventStart = event.start.getTime();
      const eventEnd = event.end.getTime();
      return endTime > eventStart && startTime < eventEnd;
    });
  }

  private getIconPosition(): 'event' | 'cell' {
    return this.config?.icons_container || 'cell';
  }

  private getIconMode(): 'top' | 'all' {
    return this.config?.icons_mode || 'top';
  }

  private generateEventSubBlocks(
    eventStart: number,
    eventEnd: number,
    cellStartTime: number,
    cellEndTime: number,
  ): Array<{ start: number; end: number }> {
    const BLOCK_INTERVAL_MINUTES = 5;
    const BLOCK_INTERVAL_MS = BLOCK_INTERVAL_MINUTES * 60 * 1000;

    const blocks: Array<{ start: number; end: number }> = [];

    // Find the first event block start that is >= cellStartTime
    const cellStartDate = new Date(cellStartTime);
    const cellStartMinutes = cellStartDate.getMinutes();
    const roundedCellStartMinutes =
      Math.floor(cellStartMinutes / BLOCK_INTERVAL_MINUTES) *
      BLOCK_INTERVAL_MINUTES;
    cellStartDate.setMinutes(roundedCellStartMinutes, 0, 0);
    let currentBlockStart = cellStartDate.getTime();

    // If we rounded down, move to the next block if needed
    if (currentBlockStart < cellStartTime) {
      currentBlockStart += BLOCK_INTERVAL_MS;
    }

    // Find the last event block end that is <= cellEndTime
    const cellEndDate = new Date(cellEndTime);
    const cellEndMinutes = cellEndDate.getMinutes();
    const roundedCellEndMinutes =
      Math.ceil(cellEndMinutes / BLOCK_INTERVAL_MINUTES) *
      BLOCK_INTERVAL_MINUTES;
    cellEndDate.setMinutes(roundedCellEndMinutes, 0, 0);
    const finalBlockEnd = Math.min(cellEndDate.getTime(), cellEndTime);

    while (currentBlockStart < finalBlockEnd) {
      const currentBlockEnd = Math.min(
        currentBlockStart + BLOCK_INTERVAL_MS,
        finalBlockEnd,
      );

      // Only create block if it overlaps with the actual event
      if (currentBlockEnd > eventStart && currentBlockStart < eventEnd) {
        blocks.push({
          start: Math.max(currentBlockStart, eventStart),
          end: Math.min(currentBlockEnd, eventEnd),
        });
      }

      currentBlockStart = currentBlockEnd;
    }

    return blocks;
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
