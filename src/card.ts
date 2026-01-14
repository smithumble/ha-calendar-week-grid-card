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
import {
  generateCssFromDeprecatedStyleConfig,
  getDeprecatedEventIcon,
  getDeprecatedFilledIcon,
  getDeprecatedBlankIcon,
} from './deprecated';
import { CalendarWeekGridCardEditor } from './editor/editor';
import styles from './styles.css';
import GoogleCalendarSeparated from './themes/google_calendar_separated.css';
import type {
  CardConfig,
  CalendarEvent,
  Event,
  RawEvent,
  DayInfo,
  EntityConfig,
  EventCriteria,
  CustomCard,
} from './types';

//-----------------------------------------------------------------------------
// GLOBAL TYPE DECLARATIONS
//-----------------------------------------------------------------------------
declare global {
  interface Window {
    customCards: CustomCard[];
  }
}

//-----------------------------------------------------------------------------
// MAIN COMPONENT CLASS
//-----------------------------------------------------------------------------
@customElement('calendar-week-grid-card')
export class CalendarWeekGridCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private config?: CardConfig;
  @state() private events: Event[] = [];

  private lastFetched: number = 0;

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Static method that returns a new instance of the editor
   * This is how Home Assistant discovers and loads the editor
   */
  static getConfigElement() {
    return document.createElement('calendar-week-grid-card-editor');
  }

  /**
   * Generate a stub configuration for the card editor
   */
  static getStubConfig(hass: HomeAssistant): CardConfig {
    const states = hass.states;

    // Find a calendar entity
    const calendarEntities = Object.keys(states).filter((key) =>
      key.startsWith('calendar.'),
    );

    // Generate a random color in hex format that works with both light and dark text
    // Uses medium brightness to ensure good contrast with both text colors
    const generateRandomColor = (): string => {
      // Generate RGB values in a range that ensures medium brightness
      // Range 80-180 for each component gives us colors that work with both light and dark text
      const r = Math.floor(Math.random() * 100) + 80;
      const g = Math.floor(Math.random() * 100) + 80;
      const b = Math.floor(Math.random() * 100) + 80;

      // Convert to hex
      const toHex = (n: number) => n.toString(16).padStart(2, '0');
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    };

    // Predefined color values (CSS variables)
    const predefinedColors = [
      'var(--primary-color)',
      'var(--success-color)',
      'var(--error-color)',
      'var(--warning-color)',
      'var(--info-color)',
    ];

    // Generate a list of entities for the card editor with colors
    const configEntities = calendarEntities.map((entity, index) => {
      const entityConfig: { entity: string; color?: string } = {
        entity: entity,
      };

      // Use predefined colors first, then generate random colors
      if (index < predefinedColors.length) {
        entityConfig.color = predefinedColors[index];
      } else {
        entityConfig.color = generateRandomColor();
      }

      return entityConfig;
    });

    // Generate a stub configuration for the card editor
    return {
      type: 'custom:calendar-week-grid-card',
      entities: configEntities,
      primary_date_format: {
        weekday: 'short',
      },
      secondary_date_format: {
        day: 'numeric',
      },
      time_format: {
        hour: 'numeric',
        hour12: true,
      },
      time_range: true,
      icons_mode: 'all',
      icons_container: 'event',
      all_day: 'row',
      days: 7,
      week_start: 'sunday',
      css: GoogleCalendarSeparated.cssText,
    };
  }

  public setConfig(config: CardConfig): void {
    this.config = config;
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  protected updated(changedProps: PropertyValues): void {
    if (changedProps.has('hass')) {
      this.fetchEventsIfNeeded();
      this.updateThemeClass();
    }
    if (changedProps.has('config')) {
      this.updateThemeClass();
    }
  }

  private updateThemeClass(): void {
    const themeConfig = this.config?.theme || 'auto';
    let isDark = false;

    if (themeConfig === 'dark') {
      isDark = true;
    } else if (themeConfig === 'light') {
      isDark = false;
    } else {
      const themes = this.hass?.themes as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      isDark = themes?.darkMode || false;
    }

    this.classList.toggle('theme-dark', !!isDark);
    this.classList.toggle('theme-light', !isDark);

    const haCard = this.shadowRoot?.querySelector('ha-card');
    if (!haCard) {
      return;
    }

    haCard.classList.toggle('theme-dark', !!isDark);
    haCard.classList.toggle('theme-light', !isDark);
  }

  protected render(): TemplateResult {
    return html`
      <style>
        ${unsafeCSS(styles)}
      </style>
      <style>
        ${this.getDynamicStyles()}
      </style>
      <ha-card>${this.renderCardContent()}</ha-card>
    `;
  }

  private renderCardContent(): TemplateResult {
    if (!this.hass || !this.config) {
      return html``;
    }

    if (!this.lastFetched) {
      this.fetchEvents();
    }

    const days = this.getDays();

    const startHour = this.config.start_hour ?? 0;
    const endHour = this.config.end_hour ?? 24;
    const hours = Array.from(
      { length: endHour - startHour },
      (_, i) => startHour + i,
    );

    const gridEvents = this.events;
    const allDayEvents = this.events.filter(
      (e) => e.isAllDay || e.type === 'blank',
    );
    const showAllDayRow =
      this.config?.all_day === 'row' || this.config?.all_day === 'both';

    const daysCount = days.length;

    return html`
      <div
        class="grid-container"
        style="grid-template-columns: auto repeat(${daysCount}, minmax(0, 1fr));"
        data-icons-container="${this.config?.icons_container || 'cell'}"
        data-icons-mode="${this.config?.icons_mode || 'top'}"
        data-all-day="${this.config?.all_day || 'grid'}"
        data-layout-fit="${!!this.getGridRows()}"
      >
        <!-- Header Row -->
        <div></div>
        ${days.map(
          (day) => html`
            <div class="day-header-wrapper">
              <div class="day-header ${day.isToday ? 'today' : ''}">
                <div class="day-header-primary">${day.label}</div>
                ${day.secondaryLabel
                  ? html`<div class="day-header-secondary">
                      ${day.secondaryLabel}
                    </div>`
                  : ''}
              </div>
            </div>
          `,
        )}

        <!-- All Day Row -->
        ${showAllDayRow ? this.renderRow(allDayEvents, days) : ''}

        <!-- Grid Rows -->
        ${hours.map((hour) => this.renderRow(gridEvents, days, hour))}
      </div>
    `;
  }

  // ============================================================================
  // Style Helpers
  // ============================================================================

  private getGridRows(): number | undefined {
    if (!this.config) return undefined;

    // Check new HA standard first
    const gridOptionsRows = this.config.grid_options?.rows;
    if (gridOptionsRows !== undefined && gridOptionsRows !== 'auto') {
      return typeof gridOptionsRows === 'number' ? gridOptionsRows : undefined;
    }

    // Fallback to legacy layout_options for backward compatibility
    return this.config.layout_options?.grid_rows;
  }

  private getDynamicStyles(): CSSResultGroup {
    if (!this.config) return unsafeCSS('');

    if (this.config.css) {
      return unsafeCSS(this.config.css);
    }

    // Deprecated: generate CSS from config objects
    return unsafeCSS(generateCssFromDeprecatedStyleConfig(this.config));
  }

  // ============================================================================
  // Render
  // ============================================================================

  private renderRow(
    events: Event[],
    days: DayInfo[],
    hour?: number,
  ): TemplateResult {
    const isAllDay = hour == undefined;

    let isNow: boolean;
    let timeLabel: string | TemplateResult;

    if (isAllDay) {
      timeLabel = this.renderAllDayLabel(this.config?.all_day_label);
      isNow = false;
    } else {
      timeLabel = this.renderTimeLabel(hour);
      isNow = new Date().getHours() === hour;
    }

    // Build cell classes
    const timeLabelClassesList: string[] = [];
    timeLabelClassesList.push(isNow ? 'now' : '');
    timeLabelClassesList.push(isAllDay ? 'all-day' : '');
    const timeLabelClasses = timeLabelClassesList.filter(Boolean).join(' ');

    return html`
      <div class="time-label-wrapper ${timeLabelClasses}">
        <div class="time-label ${timeLabelClasses}">${timeLabel}</div>
      </div>
      ${days.map((day) => this.renderCell(events, day, hour))}
    `;
  }

  private renderCell(
    events: Event[],
    day: DayInfo,
    hour?: number,
  ): TemplateResult {
    const cellDate = new Date(day.date);

    const isAllDay = hour == undefined;

    let cellStartTime: number;
    let cellEndTime: number;

    if (isAllDay) {
      cellStartTime = cellDate.getTime();
      cellEndTime = cellDate.getTime() + 1000 * 60 * 60 * 24; // 1 day
    } else {
      cellStartTime = cellDate.setHours(hour);
      cellEndTime = cellDate.setHours(hour + 1);
    }

    let cellEvents = [...events];

    // Reverse the list to render the events in the correct order
    cellEvents.reverse();

    // Filter events that are within the cell time range
    cellEvents = this.filterEvents(cellEvents, cellStartTime, cellEndTime);

    // Filter hidden events
    cellEvents = this.hideEvents(cellEvents);

    // If not all day and all day is in a row, filter out all day events

    cellEvents = isAllDay ? cellEvents : this.filterAllDayEvents(cellEvents);

    // Sort events based on shift configuration
    cellEvents = this.shiftEvents(cellEvents);

    // Determine if this is the current hour (for all days)
    const isNow = new Date().getHours() === hour;

    // Build cell classes
    const cellClassesList: string[] = [];
    cellClassesList.push(day.isToday ? 'today' : '');
    cellClassesList.push(isNow ? 'now' : '');
    cellClassesList.push(isAllDay ? 'all-day' : '');
    const cellClasses = cellClassesList.filter(Boolean).join(' ');

    return html`
      <div class="cell-wrapper ${cellClasses}">
        <div class="cell ${cellClasses}">
          ${this.renderEvents(cellEvents, cellStartTime, cellEndTime)}
          ${this.renderCellIcons(cellEvents, isAllDay)}
        </div>
        ${isAllDay ? '' : this.renderCurrentTimeLine(day, hour)}
      </div>
    `;
  }

  private renderEvents(
    cellEvents: Event[],
    cellStartTime: number,
    cellEndTime: number,
  ): TemplateResult[] {
    return cellEvents.map((event) => {
      return this.renderEvent(event, cellStartTime, cellEndTime, cellEvents);
    });
  }

  private renderEvent(
    event: Event,
    cellStartTime: number,
    cellEndTime: number,
    cellEvents: Event[],
  ): TemplateResult {
    const eventStartTime = event.start.getTime();
    const eventEndTime = event.end.getTime();

    const start = Math.max(cellStartTime, eventStartTime);
    const end = Math.min(cellEndTime, eventEndTime);

    const duration = cellEndTime - cellStartTime;

    const startRatio = (start - cellStartTime) / duration;
    const endRatio = (end - cellStartTime) / duration;

    const topPct = startRatio * 100;
    const heightRatio = endRatio - startRatio;
    const heightPct = heightRatio * 100;

    const blocks = this.generateEventSubBlocks(
      start,
      end,
      cellStartTime,
      cellEndTime,
    );

    const innerHeightPct = heightRatio > 0 ? 100 / heightRatio : 100;
    const innerTopPct = heightRatio > 0 ? -(startRatio / heightRatio) * 100 : 0;

    // Filter and merge blocks that should be rendered
    const mergedBlocks: Array<{ start: number; end: number }> = [];
    let currentBlock: { start: number; end: number } | null = null;

    for (const block of blocks) {
      // Find all events that overlap with this block time period
      let events = this.filterEvents(cellEvents, block.start, block.end);

      // Sort events based on shift configuration
      events = this.shiftEvents(events);

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

    const wrapperStyle = `top: ${topPct}%; height: ${heightPct}%;`;
    const innerStyle = `top: ${innerTopPct}%; height: ${innerHeightPct}%;`;

    const eventClassesList: string[] = [];
    eventClassesList.push(event.isAllDay ? 'all-day' : '');
    const eventClasses = eventClassesList.filter(Boolean).join(' ');

    // Build style with color CSS variable if color is set
    let eventWrapperStyle = wrapperStyle;
    if (event.color) {
      eventWrapperStyle += ` --event-color: ${event.color};`;
    }

    return html`<div
      class="event-wrapper ${eventClasses}"
      style="${eventWrapperStyle}"
      data-name="${event.name || ''}"
      data-type="${event.type || ''}"
      data-entity="${event.entity || ''}"
      data-filter="${event.filter || ''}"
    >
      <div class="event-block ${eventClasses}" style="${innerStyle}">
        ${this.renderEventSubBlocks(mergedBlocks, cellStartTime, duration)}
      </div>
      <div class="event-icon-overlay ${eventClasses}" style="${innerStyle}">
        ${this.renderEventIcon(event)}
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

    const blockTopPct = startRatio * 100;
    const blockHeightPct = (endRatio - startRatio) * 100;

    const style = `top: ${blockTopPct}%; height: ${blockHeightPct}%;`;

    return html`<div class="event-sub-block" style="${style}"></div>`;
  }

  private renderEventIcon(
    event: Event,
    isAllDay: boolean = false,
  ): TemplateResult {
    if (!event) {
      return html``;
    }

    let icon;

    if (event.type === 'blank') {
      // Configured
      icon = this.config?.blank_icon;
      icon = isAllDay ? this.config?.all_day_icon || icon : icon;

      // Deprecated
      icon = icon || getDeprecatedBlankIcon(this.config);

      // Default
      icon = icon || '';
    }

    if (event.type !== 'blank') {
      // Configured
      icon = event?.icon || this.config?.event_icon;

      // Deprecated
      icon = icon || getDeprecatedEventIcon(event);
      icon = icon || getDeprecatedFilledIcon(this.config);

      // Default
      icon = icon || 'mdi:check-circle';
    }

    const eventClassesList: string[] = [];
    eventClassesList.push(isAllDay ? 'all-day' : '');
    const eventClasses = eventClassesList.filter(Boolean).join(' ');

    return html`<ha-icon
      class="event-icon ${eventClasses}"
      data-name="${event.name || ''}"
      data-type="${event.type || ''}"
      data-entity="${event.entity || ''}"
      data-filter="${event.filter || ''}"
      icon="${icon}"
    ></ha-icon>`;
  }

  private renderCellIcons(
    events: Event[],
    isAllDay: boolean = false,
  ): TemplateResult {
    return html`<div class="cell-icons">
      ${events.map((event) => this.renderEventIcon(event, isAllDay))}
    </div>`;
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

    const daysCount = this.config?.days ?? 7;
    const today = this.toHaTime(new Date());
    today.setHours(0, 0, 0, 0);

    // Calculate the start date based on week_start config (same as in getDays)
    const weekStart = this.config?.week_start || 'today';
    const displayStartDate = this.getWeekStartDate(today, weekStart);

    // Fetch events starting from a few days before the display start (buffer)
    // and extending to cover all displayed days
    const start = new Date(displayStartDate);
    start.setDate(start.getDate() - daysCount - 1);
    const end = new Date(displayStartDate);
    end.setDate(end.getDate() + daysCount + 1);

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
        isAllDay: !!e.start.date,
      }));

      this.events.push({
        start: new Date(start),
        end: new Date(end),
        entity: '',
        filter: '',
        type: 'blank',
      });
    } catch (e) {
      console.error('CalendarWeekGridCard: Error fetching events:', e);
      this.events = [];
    }
  }

  private async fetchEntityEvents(
    item: EntityConfig,
    startIso: string,
    endIso: string,
  ): Promise<RawEvent[]> {
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
        .map((e) => ({ ...e, ...item }) as unknown as RawEvent);
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

    // Calculate the start date based on week_start config
    const weekStart = this.config?.week_start || 'today';
    const startDate = this.getWeekStartDate(today, weekStart);

    const lang = this.config?.language || this.hass?.language || 'en';

    // Primary date format (default: weekday:short)
    const primaryFormat = this.config?.primary_date_format || {
      weekday: 'short',
    };
    const primaryDateFormat = new Intl.DateTimeFormat(lang, primaryFormat);

    // Secondary date format (optional)
    const secondaryFormat = this.config?.secondary_date_format;
    const secondaryDateFormat = secondaryFormat
      ? new Intl.DateTimeFormat(lang, secondaryFormat)
      : null;

    const daysCount = this.config?.days ?? 7;
    for (let i = 0; i < daysCount; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);

      const primaryLabel = primaryDateFormat.format(date);
      const label =
        primaryLabel.charAt(0).toUpperCase() + primaryLabel.slice(1);

      const secondaryLabel = secondaryDateFormat
        ? secondaryDateFormat.format(date)
        : undefined;

      // Check if this date is today
      const isToday = date.toDateString() === today.toDateString();

      days.push({
        date: date,
        label: label,
        secondaryLabel: secondaryLabel,
        isToday: isToday,
      });
    }
    return days;
  }

  private getWeekStartDate(today: Date, weekStart: string): Date {
    if (weekStart === 'today') {
      return new Date(today);
    }

    // Map day names to day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const dayMap: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    const targetDay = dayMap[weekStart.toLowerCase()];
    if (targetDay === undefined) {
      // Invalid week_start, default to today
      return new Date(today);
    }

    const currentDay = today.getDay();
    const daysToSubtract = (currentDay - targetDay + 7) % 7;

    const startDate = new Date(today);
    startDate.setDate(today.getDate() - daysToSubtract);
    return startDate;
  }

  private formatHour(
    h: number,
    timeFormat: string | Intl.DateTimeFormatOptions | undefined,
  ): string {
    // If it's a string, use old style pattern replacement
    if (typeof timeFormat === 'string') {
      const format = timeFormat || 'h A';

      // Custom pattern replacement
      // H: 0-23, HH: 00-23
      // h: 1-12, hh: 01-12
      // m: 0-59, mm: 00-59
      // a: am/pm, A: AM/PM
      const tokens: Record<string, string> = {
        HH: h.toString().padStart(2, '0'),
        H: h.toString(),
        hh: (h % 12 || 12).toString().padStart(2, '0'),
        h: (h % 12 || 12).toString(),
        mm: '00',
        m: '0',
        a: h < 12 ? 'am' : 'pm',
        A: h < 12 ? 'AM' : 'PM',
      };

      return format.replace(/HH|H|hh|h|mm|m|a|A/g, (match) => tokens[match]);
    }

    // If it's an object or undefined, use Intl.DateTimeFormat
    const lang = this.config?.language || this.hass?.language || 'en';
    const formatOptions = timeFormat || { hour: 'numeric' };

    // Create a date object with the specified hour
    const date = new Date();
    date.setHours(h, 0, 0, 0);

    const formatter = new Intl.DateTimeFormat(lang, formatOptions);
    return formatter.format(date);
  }

  private renderTimeLabel(hour: number): TemplateResult {
    const timeFormat = this.config?.time_format;
    const showRange = this.config?.time_range || false;
    const nextHour = (hour + 1) % 24;

    if (showRange) {
      return html`
        <span class="time-label-hour time-label-hour-start">
          ${this.formatHour(hour, timeFormat)}
        </span>
        <span class="time-label-hour time-label-hour-separator">
          &nbsp;-&nbsp;
        </span>
        <span class="time-label-hour time-label-hour-end">
          ${this.formatHour(nextHour, timeFormat)}
        </span>
      `;
    }

    return html`
      <span class="time-label-hour">
        ${this.formatHour(hour, timeFormat)}
      </span>
    `;
  }

  private renderAllDayLabel(label: string | undefined): TemplateResult {
    const cleanLabel = label || html`&nbsp;`;
    return html`<div class="time-label-all-day">${cleanLabel}</div>`;
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

  private filterAllDayEvents(events: Event[]): Event[] {
    if (this.config?.all_day === 'row') {
      return events.filter((event) => !event.isAllDay);
    }
    return events;
  }

  private matchesCriteria(event: Event, criteria: EventCriteria): boolean {
    // Check if at least one field is specified
    const hasAnyField =
      criteria.name !== undefined ||
      criteria.type !== undefined ||
      criteria.entity !== undefined ||
      criteria.filter !== undefined;
    if (!hasAnyField) return false;

    // Match only if all specified criteria fields match (AND logic)
    if (criteria.name !== undefined && event.name !== criteria.name)
      return false;
    if (criteria.type !== undefined && event.type !== criteria.type)
      return false;
    if (criteria.entity !== undefined && event.entity !== criteria.entity)
      return false;
    if (criteria.filter !== undefined && event.filter !== criteria.filter)
      return false;
    return true;
  }

  private hideEvents(events: Event[]): Event[] {
    if (!this.config) return events;

    const entityHideMap = new Map<string, EventCriteria[]>();
    const normalizedEntities = this.getNormalizedEntities();

    for (const entityConfig of normalizedEntities) {
      if (
        entityConfig.name &&
        entityConfig.hide &&
        entityConfig.hide.length > 0
      ) {
        const criteria: EventCriteria[] = entityConfig.hide.map((hide) => {
          if (typeof hide === 'string') {
            return { name: hide };
          }
          return hide;
        });
        entityHideMap.set(entityConfig.name, criteria);
      }
    }

    if (entityHideMap.size === 0) {
      return events;
    }

    const eventsToRemove = new Set<Event>();

    for (const event of events) {
      const hideCriteria = event.name
        ? entityHideMap.get(event.name)
        : undefined;

      if (hideCriteria && hideCriteria.length > 0) {
        for (const targetEvent of events) {
          if (targetEvent === event) continue;

          for (const criteria of hideCriteria) {
            if (this.matchesCriteria(targetEvent, criteria)) {
              eventsToRemove.add(targetEvent);
              break;
            }
          }
        }
      }
    }

    if (eventsToRemove.size === 0) return events;

    return events.filter((e) => !eventsToRemove.has(e));
  }

  private shiftEvents(events: Event[]): Event[] {
    if (!this.config) return events;

    // Build maps of entity name -> shift criteria lists from config
    const entityUnderMap = new Map<string, EventCriteria[]>();
    const entityOverMap = new Map<string, EventCriteria[]>();
    const normalizedEntities = this.getNormalizedEntities();

    for (const entityConfig of normalizedEntities) {
      if (entityConfig.name) {
        // Process under
        const underConfig = entityConfig.under;
        if (underConfig && underConfig.length > 0) {
          const criteria: EventCriteria[] = underConfig.map((shift) => {
            if (typeof shift === 'string') {
              // String is treated as name
              return { name: shift };
            }
            return shift;
          });
          entityUnderMap.set(entityConfig.name, criteria);
        }

        // Process over
        const overConfig = entityConfig.over;
        if (overConfig && overConfig.length > 0) {
          const criteria: EventCriteria[] = overConfig.map((shift) => {
            if (typeof shift === 'string') {
              // String is treated as name
              return { name: shift };
            }
            return shift;
          });
          entityOverMap.set(entityConfig.name, criteria);
        }
      }
    }

    // If no entities have shift configuration, return events as-is
    if (entityUnderMap.size === 0 && entityOverMap.size === 0) {
      return events;
    }

    // Start with events in original order
    const result = [...events];

    // Process under: move matching events before the current event
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const underCriteria = event.name
        ? entityUnderMap.get(event.name)
        : undefined;

      if (underCriteria && underCriteria.length > 0) {
        // Check if any events match the under criteria
        let hasMatchingEvents = false;
        for (const originalEvent of events) {
          for (const criteria of underCriteria) {
            if (this.matchesCriteria(originalEvent, criteria)) {
              hasMatchingEvents = true;
              break;
            }
          }
          if (hasMatchingEvents) break;
        }

        if (hasMatchingEvents) {
          // Find the current position of the event with under in result
          const eventIndex = result.indexOf(event);
          if (eventIndex < 0) continue;

          // Find all events that match under criteria and come after this event
          const eventsToMove: Array<{ event: Event; originalIndex: number }> =
            [];
          for (let j = i + 1; j < events.length; j++) {
            const laterEvent = events[j];
            for (const criteria of underCriteria) {
              if (this.matchesCriteria(laterEvent, criteria)) {
                eventsToMove.push({ event: laterEvent, originalIndex: j });
                break;
              }
            }
          }

          // Move matching events to come before the event with under
          for (const { event: eventToMove } of eventsToMove) {
            const eventToMoveIndex = result.indexOf(eventToMove);
            if (eventToMoveIndex >= 0 && eventToMoveIndex > eventIndex) {
              // Remove from current position
              result.splice(eventToMoveIndex, 1);
              // Insert before the event with under
              const newEventIndex = result.indexOf(event);
              result.splice(newEventIndex, 0, eventToMove);
            }
          }
        }
      }
    }

    // Process over: move matching events after the current event
    // Process in reverse order to maintain correct positioning
    for (let i = events.length - 1; i >= 0; i--) {
      const event = events[i];
      const overCriteria = event.name
        ? entityOverMap.get(event.name)
        : undefined;

      if (overCriteria && overCriteria.length > 0) {
        // Check if any events match the over criteria
        let hasMatchingEvents = false;
        for (const originalEvent of events) {
          for (const criteria of overCriteria) {
            if (this.matchesCriteria(originalEvent, criteria)) {
              hasMatchingEvents = true;
              break;
            }
          }
          if (hasMatchingEvents) break;
        }

        if (hasMatchingEvents) {
          // Find the current position of the event with over in result
          const eventIndex = result.indexOf(event);
          if (eventIndex < 0) continue;

          // Find all events that match over criteria and come before this event
          const eventsToMove: Array<{ event: Event; originalIndex: number }> =
            [];
          for (let j = i - 1; j >= 0; j--) {
            const earlierEvent = events[j];
            for (const criteria of overCriteria) {
              if (this.matchesCriteria(earlierEvent, criteria)) {
                eventsToMove.push({ event: earlierEvent, originalIndex: j });
                break;
              }
            }
          }

          // Move matching events to come after the event with over
          for (const { event: eventToMove } of eventsToMove) {
            const eventToMoveIndex = result.indexOf(eventToMove);
            if (eventToMoveIndex >= 0 && eventToMoveIndex < eventIndex) {
              // Remove from current position
              result.splice(eventToMoveIndex, 1);
              // Insert after the event with over
              const newEventIndex = result.indexOf(event);
              result.splice(newEventIndex + 1, 0, eventToMove);
            }
          }
        }
      }
    }

    return result;
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

//-----------------------------------------------------------------------------
// REGISTRATION
//-----------------------------------------------------------------------------

// Register the editor
customElements.define(
  'calendar-week-grid-card-editor',
  CalendarWeekGridCardEditor,
);

// Register with HACS
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'calendar-week-grid-card',
  name: 'Calendar Week Grid Card',
  preview: true,
  description:
    'A custom Home Assistant card that displays calendar events in a week grid format.',
  documentationURL: 'https://github.com/smithumble/ha-calendar-week-grid-card',
});
