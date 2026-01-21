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
import googleCalendarSeparatedYamlConfig from './configs/google_calendar_separated.yaml';
import {
  generateCssFromDeprecatedStyleConfig,
  getDeprecatedEventIcon,
  getDeprecatedFilledIcon,
  getDeprecatedBlankIcon,
} from './deprecated';
import { CalendarWeekGridCardEditor } from './editor/editor';
import styles from './styles.css';
import type {
  CardConfig,
  Event,
  DayInfo,
  CustomCard,
  EntityConfig,
  RawEvent,
  CalendarEvent,
} from './types';
import {
  getDays,
  formatHour,
  toHaTime,
  normalizeDate,
  getWeekStartDate,
} from './utils/datetime';
import {
  filterEvents,
  filterAllDayEvents,
  hideEvents,
  shiftEvents,
} from './utils/events';
import {
  calculateEventDimensions,
  mergeVisibleBlocks,
  calculateSubBlockPosition,
  generateEventSubBlocks,
} from './utils/positioning';
import { getThemeValues, buildThemeStyle, getEventIcon } from './utils/theme';

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
    const stubConfig = googleCalendarSeparatedYamlConfig;
    const calendarEntities = this.findCalendarEntities(hass);
    const configEntities = this.mapEntitiesToConfig(
      calendarEntities,
      stubConfig.theme_values_examples,
    );

    return {
      ...stubConfig,
      type: 'custom:calendar-week-grid-card',
      entities: configEntities,
    };
  }

  /**
   * Find all calendar entities in Home Assistant
   */
  private static findCalendarEntities(hass: HomeAssistant): string[] {
    return Object.keys(hass.states).filter((key) =>
      key.startsWith('calendar.'),
    );
  }

  /**
   * Map calendar entities to configuration with cycling event examples
   */
  private static mapEntitiesToConfig(
    entities: string[],
    themeValuesExamples?: unknown[],
  ): EntityConfig[] {
    const examples = themeValuesExamples || [];
    if (examples.length === 0) {
      return entities.map((entity) => ({ entity }));
    }

    return entities.map((entity, index) => {
      const example = examples[index % examples.length];
      const themeValues =
        typeof example === 'object' && example !== null
          ? (example as Record<string, unknown>)
          : {};
      return {
        entity,
        theme_values: themeValues,
      };
    });
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

    const timeLabelClasses = this.buildClassList({
      now: isNow,
      'all-day': isAllDay,
    });

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

    const cellClasses = this.buildClassList({
      today: day.isToday,
      now: isNow,
      'all-day': isAllDay,
    });

    return html`
      <div class="cell-wrapper ${cellClasses}">
        <div class="cell ${cellClasses}">
          ${this.renderEvents(cellEvents, cellStartTime, cellEndTime, isAllDay)}
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
    isAllDay: boolean = false,
  ): TemplateResult[] {
    return cellEvents.map((event) => {
      return this.renderEvent(
        event,
        cellStartTime,
        cellEndTime,
        cellEvents,
        isAllDay,
      );
    });
  }

  private renderEvent(
    event: Event,
    cellStartTime: number,
    cellEndTime: number,
    cellEvents: Event[],
    isAllDay: boolean = false,
  ): TemplateResult {
    const eventStartTime = event.start.getTime();
    const eventEndTime = event.end.getTime();

    const dimensions = calculateEventDimensions(
      eventStartTime,
      eventEndTime,
      cellStartTime,
      cellEndTime,
    );

    const blocks = generateEventSubBlocks(
      Math.max(cellStartTime, eventStartTime),
      Math.min(cellEndTime, eventEndTime),
      cellStartTime,
      cellEndTime,
    );

    const mergedBlocks = mergeVisibleBlocks(blocks, event, cellEvents);

    const wrapperStyle = `top: ${dimensions.topPct}%; height: ${dimensions.heightPct}%;`;
    const innerStyle = `top: ${dimensions.innerTopPct}%; height: ${dimensions.innerHeightPct}%;`;

    const eventClasses = this.buildClassList({
      'all-day': !!event.isAllDay,
    });

    // Build style with CSS variables values
    const variables = this.getThemeValues(event);
    const themeStyle = buildThemeStyle(variables);
    const eventWrapperStyle = wrapperStyle + themeStyle;

    const duration = cellEndTime - cellStartTime;

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
        ${this.renderEventIcon(event, isAllDay)}
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
    const { topPct, heightPct } = calculateSubBlockPosition(
      block,
      cellStartTime,
      duration,
    );
    const style = `top: ${topPct}%; height: ${heightPct}%;`;

    return html`<div class="event-sub-block" style="${style}"></div>`;
  }

  private renderEventIcon(
    event: Event,
    isAllDay: boolean = false,
  ): TemplateResult {
    if (!event) {
      return html``;
    }

    const icon = getEventIcon(
      event,
      isAllDay,
      this.config,
      getDeprecatedBlankIcon(this.config),
      getDeprecatedEventIcon(event),
      getDeprecatedFilledIcon(this.config),
    );

    const eventClasses = this.buildClassList({
      'all-day': isAllDay,
    });

    // Build style with CSS variables from theme_variables config
    const variables = this.getThemeValues(event);
    const iconStyle = buildThemeStyle(variables);

    return html`<ha-icon
      class="event-icon ${eventClasses}"
      style="${iconStyle}"
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
    const today = toHaTime(new Date(), this.hass);
    today.setHours(0, 0, 0, 0);

    // Calculate the start date based on week_start config
    const weekStart = this.config?.week_start || 'today';
    const displayStartDate = getWeekStartDate(today, weekStart);

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
        start: normalizeDate(e.start, this.hass),
        end: normalizeDate(e.end, this.hass),
        isAllDay: !!e.start.date,
      }));

      // Add blank event with config properties
      const blankEventConfig = this.config?.blank_event || {};
      this.events.push({
        start: new Date(start),
        end: new Date(end),
        entity: '',
        filter: '',
        type: 'blank',
        isAllDay: false,
        ...blankEventConfig,
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
    const daysCount = this.config?.days ?? 7;
    const weekStart = this.config?.week_start || 'today';
    const lang = this.config?.language || this.hass?.language || 'en';
    const primaryFormat = this.config?.primary_date_format;
    const secondaryFormat = this.config?.secondary_date_format;

    return getDays(
      daysCount,
      weekStart,
      lang,
      primaryFormat,
      secondaryFormat,
      this.hass,
    );
  }

  private renderTimeLabel(hour: number): TemplateResult {
    const timeFormat = this.config?.time_format;
    const showRange = this.config?.time_range || false;
    const nextHour = (hour + 1) % 24;
    const lang = this.config?.language || this.hass?.language || 'en';

    const hourLabel = formatHour(hour, timeFormat, lang);

    if (showRange) {
      const nextHourLabel = formatHour(nextHour, timeFormat, lang);
      return html`
        <span class="time-label-hour time-label-hour-start">
          ${hourLabel}
        </span>
        <span class="time-label-hour time-label-hour-separator">
          &nbsp;-&nbsp;
        </span>
        <span class="time-label-hour time-label-hour-end">
          ${nextHourLabel}
        </span>
      `;
    }

    return html`<span class="time-label-hour">${hourLabel}</span>`;
  }

  private renderAllDayLabel(label: string | undefined): TemplateResult {
    const cleanLabel = label || html`&nbsp;`;
    return html`<div class="time-label-all-day">${cleanLabel}</div>`;
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

  private filterEvents(
    events: Event[],
    startTime: number,
    endTime: number,
  ): Event[] {
    return filterEvents(events, startTime, endTime);
  }

  private filterAllDayEvents(events: Event[]): Event[] {
    return filterAllDayEvents(events, this.config?.all_day);
  }

  private getThemeValues(event: Event) {
    return getThemeValues(event, this.config);
  }

  private hideEvents(events: Event[]): Event[] {
    const normalizedEntities = this.getNormalizedEntities();
    return hideEvents(events, normalizedEntities);
  }

  private shiftEvents(events: Event[]): Event[] {
    const normalizedEntities = this.getNormalizedEntities();
    return shiftEvents(events, normalizedEntities);
  }

  private getNormalizedEntities(): EntityConfig[] {
    const rawEntities = this.config?.entities || [];
    const defaultEventConfig = this.config?.event || {};

    return rawEntities
      .map((item) => {
        // Convert string to entity config
        const entityConfig = typeof item === 'string' ? { entity: item } : item;

        // Merge default event config with entity config
        // Entity config takes precedence over defaults
        return {
          ...defaultEventConfig,
          ...entityConfig,
        };
      })
      .filter((item): item is EntityConfig => !!(item && item.entity));
  }

  private buildClassList(conditions: Record<string, boolean>): string {
    return Object.entries(conditions)
      .filter(([, value]) => value)
      .map(([key]) => key)
      .join(' ');
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
