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
import { themes } from './editor/themes';
import { getEffectiveCardCss, THEME_HIDDEN_FIELDS } from './editor/utils/theme';
import styles from './styles.css';
import type {
  HomeAssistant,
  CardConfig,
  Event,
  DayInfo,
  CustomCard,
  EntityConfig,
  RawEvent,
  CalendarEvent,
  EntitiesPreset,
  ThemeValues,
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
    const defaultTheme = themes.find((theme) => theme.id === 'google_calendar');
    const stubConfig = (defaultTheme?.config || {}) as Partial<CardConfig>;

    const config = {
      type: 'custom:calendar-week-grid-card',
      ...stubConfig,
    } as CardConfig;

    if (defaultTheme?.id) {
      config.theme = defaultTheme.id;
      delete config.css;
    }

    const calendarEntities = this.findCalendarEntities(hass);

    // Check if yasno calendar entity is available
    const plannedOutagesEntity = calendarEntities.find((entityId) =>
      /^calendar\.yasno_.*_planned_outages$/.test(entityId),
    );
    const probableOutagesEntity = calendarEntities.find((entityId) =>
      /^calendar\.yasno_.*_probable_outages$/.test(entityId),
    );

    // If yasno entity exists, use yasno preset
    if (plannedOutagesEntity && stubConfig.entities_presets) {
      // Determine preset name based on Home Assistant language
      const language = hass.language || 'en';
      const preferredPresetNames = language.startsWith('uk')
        ? ['yasno_compact_uk', 'yasno_uk']
        : ['yasno_compact_en', 'yasno_en'];
      const yasnoPreset = stubConfig.entities_presets.find(
        (p: EntitiesPreset) => preferredPresetNames.includes(p.name),
      );

      if (yasnoPreset?.entities) {
        // Clone entities from yasno preset and replace template values
        const yasnoEntities = JSON.parse(
          JSON.stringify(yasnoPreset.entities),
        ) as EntityConfig[];

        yasnoEntities.forEach((entity) => {
          if (entity && typeof entity === 'object' && 'entity' in entity) {
            // Replace entity field if it matches a template
            if (entity.entity === 'calendar.planned_outages') {
              entity.entity = plannedOutagesEntity;
            } else if (
              entity.entity === 'calendar.probable_outages' &&
              probableOutagesEntity
            ) {
              entity.entity = probableOutagesEntity;
            }
          }
        });

        if (yasnoPreset.overrides) {
          Object.assign(config, yasnoPreset.overrides);
        }
        config.entities = yasnoEntities;
      }
    } else {
      // Default: map all calendar entities to config
      const configEntities = this.mapExamplesToEntities(
        calendarEntities,
        stubConfig.theme_values_examples,
      );
      config.entities = configEntities;
    }

    THEME_HIDDEN_FIELDS.forEach((field) => {
      delete config[field as keyof CardConfig];
    });

    return config;
  }

  /**
   * Find all calendar entities in Home Assistant
   */
  private static findCalendarEntities(hass: HomeAssistant): string[] {
    return Object.keys(hass.states).filter((entityId) => {
      if (!entityId.startsWith('calendar.')) {
        return false;
      }

      // It can be disabled and not present in entities object
      return !!hass.entities?.[entityId];
    });
  }

  /**
   * Map calendar entities to configuration with cycling event examples
   */
  private static mapExamplesToEntities(
    entities: string[],
    themeValuesExamples?: ThemeValues[],
  ): EntityConfig[] {
    const examples = themeValuesExamples || [];
    if (examples.length === 0) {
      return entities.map((entity) => ({ entity }));
    }

    return entities.map((entity, index) => {
      const example = examples[index % examples.length];
      const themeValues =
        typeof example === 'object' && example !== null ? example : {};
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
  }

  private updateThemeClass(): void {
    const darkMode = this.hass?.themes?.darkMode || false;
    const haCard = this.shadowRoot?.querySelector('ha-card');
    haCard?.classList.toggle('theme-dark', !!darkMode);
    haCard?.classList.toggle('theme-light', !darkMode);
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

    const hours = this.getVisibleHours(days);

    const gridEvents = this.events;
    const allDayEvents = this.events.filter(
      (e) => e.isAllDay || e.type === 'blank',
    );

    const orientation = this.config?.orientation || 'vertical';

    if (orientation === 'horizontal') {
      return this.renderHorizontalGrid(days, hours, gridEvents, allDayEvents);
    }

    return this.renderVerticalGrid(days, hours, gridEvents, allDayEvents);
  }

  private renderVerticalGrid(
    days: DayInfo[],
    hours: number[],
    gridEvents: Event[],
    allDayEvents: Event[],
  ): TemplateResult {
    const showAllDayRow =
      this.config?.all_day === 'row' || this.config?.all_day === 'both';
    const daysCount = days.length;
    const gridTemplateColumns = this.getVerticalGridTemplateColumns(daysCount);
    const gridTemplateRows = this.getVerticalGridTemplateRows(
      showAllDayRow,
      hours.length,
    );

    // Track row index for row-odd/row-even classes
    let currentRowIndex = 0;

    const headerRowClasses = this.buildClassList({
      'row-odd': currentRowIndex % 2 === 1,
      'row-even': currentRowIndex % 2 === 0,
      'column-even': true,
    });

    let gridStyle = `grid-template-columns: ${gridTemplateColumns};`;
    if (gridTemplateRows) {
      gridStyle += `grid-template-rows: ${gridTemplateRows};`;
    }

    return html`
      <div
        class="grid-container"
        style="${gridStyle}"
        data-icons-container="${this.config?.icons_container || 'cell'}"
        data-icons-mode="${this.config?.icons_mode || 'top'}"
        data-all-day="${this.config?.all_day || 'grid'}"
        data-orientation="vertical"
        data-layout-fit="${!!this.getGridRows()}"
      >
        <!-- Header Row -->
        <div class="${headerRowClasses}"></div>
        ${days.map(
          (day) => html`
            <div class="day-header-wrapper ${headerRowClasses}">
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
        ${showAllDayRow
          ? this.renderRow(allDayEvents, days, undefined, ++currentRowIndex)
          : ''}

        <!-- Grid Rows -->
        ${hours.map((hour) =>
          this.renderRow(gridEvents, days, hour, ++currentRowIndex),
        )}
      </div>
    `;
  }

  private renderHorizontalGrid(
    days: DayInfo[],
    hours: number[],
    gridEvents: Event[],
    allDayEvents: Event[],
  ): TemplateResult {
    const showAllDayRow =
      this.config?.all_day === 'row' || this.config?.all_day === 'both';

    const gridTemplateColumns = this.getHorizontalGridTemplateColumns(
      showAllDayRow,
      hours.length,
    );
    const gridTemplateRows = this.getHorizontalGridTemplateRows(days.length);

    let gridStyle = `grid-template-columns: ${gridTemplateColumns};`;
    if (gridTemplateRows) {
      gridStyle += `grid-template-rows: ${gridTemplateRows};`;
    }

    let currentRowIndex = 0;
    const headerRowClasses = this.buildClassList({
      'row-odd': currentRowIndex % 2 === 1,
      'row-even': currentRowIndex % 2 === 0,
      'column-even': true,
    });

    return html`
      <div
        class="grid-container"
        style="${gridStyle}"
        data-icons-container="${this.config?.icons_container || 'cell'}"
        data-icons-mode="${this.config?.icons_mode || 'top'}"
        data-all-day="${this.config?.all_day || 'grid'}"
        data-orientation="horizontal"
        data-layout-fit="false"
      >
        <div class="${headerRowClasses}"></div>
        ${showAllDayRow
          ? html`
              <div class="time-label-wrapper ${headerRowClasses}">
                <div class="time-label ${headerRowClasses}">
                  ${this.renderAllDayLabel(this.config?.all_day_label)}
                </div>
              </div>
            `
          : ''}
        ${hours.map((hour) => {
          const isNow = new Date().getHours() === hour;
          const classes = this.buildClassList({
            now: isNow,
            'row-odd': currentRowIndex % 2 === 1,
            'row-even': currentRowIndex % 2 === 0,
          });

          return html`
            <div class="time-label-wrapper ${classes}">
              <div class="time-label ${classes}">
                ${this.renderTimeLabel(hour)}
              </div>
            </div>
          `;
        })}
        ${days.map((day) => {
          currentRowIndex++;
          const rowClasses = this.buildClassList({
            'row-odd': currentRowIndex % 2 === 1,
            'row-even': currentRowIndex % 2 === 0,
            'column-even': true,
          });

          let colIndex = 0;

          return html`
            <div class="day-header-wrapper ${rowClasses}">
              <div class="day-header ${day.isToday ? 'today' : ''}">
                <div class="day-header-primary">${day.label}</div>
                ${day.secondaryLabel
                  ? html`<div class="day-header-secondary">
                      ${day.secondaryLabel}
                    </div>`
                  : ''}
              </div>
            </div>
            ${showAllDayRow
              ? this.renderCell(
                  allDayEvents,
                  day,
                  undefined,
                  currentRowIndex,
                  ++colIndex,
                )
              : ''}
            ${hours.map((hour) =>
              this.renderCell(
                gridEvents,
                day,
                hour,
                currentRowIndex,
                ++colIndex,
              ),
            )}
          `;
        })}
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

  private getGridTemplateRows(extraRowsCount: number): string | undefined {
    const layoutFitEnabled = !!this.getGridRows();
    if (!layoutFitEnabled) return undefined;

    if (extraRowsCount <= 0) return 'min-content';

    return `min-content repeat(${extraRowsCount}, minmax(0, 1fr))`;
  }

  private getGridTemplateColumns(extraColumnsCount: number): string {
    return `auto repeat(${extraColumnsCount}, minmax(0, 1fr))`;
  }

  private getVerticalGridTemplateColumns(daysCount: number): string {
    const extraColumnsCount = daysCount;
    return this.getGridTemplateColumns(extraColumnsCount);
  }

  private getVerticalGridTemplateRows(
    showAllDayRow: boolean,
    hoursCount: number,
  ): string | undefined {
    const allDayColumns = showAllDayRow ? 1 : 0;
    const extraRowsCount = hoursCount + allDayColumns;
    return this.getGridTemplateRows(extraRowsCount);
  }

  private getHorizontalGridTemplateColumns(
    showAllDayRow: boolean,
    hoursCount: number,
  ): string {
    const allDayColumns = showAllDayRow ? 1 : 0;
    const extraColumnsCount = allDayColumns + hoursCount;
    return this.getGridTemplateColumns(extraColumnsCount);
  }

  private getHorizontalGridTemplateRows(daysCount: number): string | undefined {
    const extraRowsCount = daysCount;
    return this.getGridTemplateRows(extraRowsCount);
  }

  private getVisibleHours(days: DayInfo[]): number[] {
    const rawStartHour = Number(this.config?.start_hour ?? 0);
    const rawEndHour = Number(this.config?.end_hour ?? 24);
    const startHour = Number.isFinite(rawStartHour) ? rawStartHour : 0;
    const endHour = Number.isFinite(rawEndHour) ? rawEndHour : 24;
    const boundedStartHour = Math.max(0, Math.min(23, startHour));
    const boundedEndHour = Math.max(0, Math.min(24, endHour));

    if (boundedEndHour <= boundedStartHour) {
      return [];
    }

    const allHours = Array.from(
      { length: boundedEndHour - boundedStartHour },
      (_, i) => boundedStartHour + i,
    );

    if (!this.config?.trim_empty_hours) {
      return allHours;
    }

    const hourHasAnyEvent = new Map<number, boolean>();
    for (const hour of allHours) {
      hourHasAnyEvent.set(hour, false);
    }

    const dayRanges = days.map((day) => {
      const dayStart = new Date(day.date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      return { start: dayStart.getTime(), end: dayEnd.getTime() };
    });

    const visibleEvents = this.hideEvents(this.events).filter(
      (event) => event.type !== 'blank' && !event.isAllDay,
    );

    for (const event of visibleEvents) {
      const eventStart = event.start.getTime();
      const eventEnd = event.end.getTime();

      for (const range of dayRanges) {
        const clippedStart = Math.max(eventStart, range.start);
        const clippedEnd = Math.min(eventEnd, range.end);
        if (clippedEnd <= clippedStart) continue;

        const startDate = new Date(clippedStart);
        const endDate = new Date(clippedEnd - 1);
        const eventStartHour = startDate.getHours();
        const eventEndHour = endDate.getHours();

        for (let hour = eventStartHour; hour <= eventEndHour; hour++) {
          if (hour >= boundedStartHour && hour < boundedEndHour) {
            hourHasAnyEvent.set(hour, true);
          }
        }
      }
    }

    const firstHourWithEvent = allHours.find((hour) =>
      hourHasAnyEvent.get(hour),
    );
    const lastHourWithEvent = [...allHours]
      .reverse()
      .find((hour) => hourHasAnyEvent.get(hour));

    const rawMaxStartHour = this.config?.trim_empty_hours_start_limit;
    const rawMinEndHour = this.config?.trim_empty_hours_end_limit;
    const maxStartHour =
      typeof rawMaxStartHour === 'number' && Number.isFinite(rawMaxStartHour)
        ? Math.max(
            boundedStartHour,
            Math.min(boundedEndHour - 1, rawMaxStartHour),
          )
        : undefined;
    const minEndHour =
      typeof rawMinEndHour === 'number' && Number.isFinite(rawMinEndHour)
        ? Math.max(
            boundedStartHour + 1,
            Math.min(boundedEndHour, rawMinEndHour),
          )
        : undefined;

    if (firstHourWithEvent == undefined || lastHourWithEvent == undefined) {
      const fallbackStartHour =
        maxStartHour != undefined ? maxStartHour : boundedStartHour;
      const fallbackEndHour =
        minEndHour != undefined ? minEndHour - 1 : fallbackStartHour - 1;

      return allHours.filter(
        (hour) => hour >= fallbackStartHour && hour <= fallbackEndHour,
      );
    }

    const effectiveStartHour =
      maxStartHour != undefined
        ? Math.max(boundedStartHour, Math.min(firstHourWithEvent, maxStartHour))
        : firstHourWithEvent;
    const effectiveEndHour =
      minEndHour != undefined
        ? Math.min(
            boundedEndHour - 1,
            Math.max(lastHourWithEvent, minEndHour - 1),
          )
        : lastHourWithEvent;

    const trimmedHours = allHours.filter(
      (hour) => hour >= effectiveStartHour && hour <= effectiveEndHour,
    );

    return trimmedHours;
  }

  private getDynamicStyles(): CSSResultGroup {
    if (!this.config) return unsafeCSS('');

    const effective = getEffectiveCardCss(this.config, themes);
    if (effective.trim()) {
      return unsafeCSS(effective);
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
    rowIndex: number = 0,
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
      'row-odd': rowIndex % 2 === 1,
      'row-even': rowIndex % 2 === 0,
      'column-even': true,
    });

    return html`
      <div class="time-label-wrapper ${timeLabelClasses}">
        <div class="time-label ${timeLabelClasses}">${timeLabel}</div>
      </div>
      ${days.map((day, colIndex) =>
        this.renderCell(events, day, hour, rowIndex, colIndex + 1),
      )}
    `;
  }

  private renderCell(
    events: Event[],
    day: DayInfo,
    hour?: number,
    rowIndex: number = 0,
    colIndex: number = 0,
  ): TemplateResult {
    const cellDate = new Date(day.date);

    const isAllDay = hour == undefined;

    let cellStartTime: number;
    let cellEndTime: number;

    if (isAllDay) {
      const dayStart = new Date(cellDate);
      dayStart.setHours(0, 0, 0, 0);
      const nextDayStart = new Date(dayStart);
      nextDayStart.setDate(nextDayStart.getDate() + 1);

      // Use local midnight boundaries so DST transition days are sized correctly.
      cellStartTime = dayStart.getTime();
      cellEndTime = nextDayStart.getTime();
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
      'row-odd': rowIndex % 2 === 1,
      'row-even': rowIndex % 2 === 0,
      'column-odd': colIndex % 2 === 1,
      'column-even': colIndex % 2 === 0,
    });

    return html`
      <div class="cell-wrapper ${cellClasses}">
        <div class="cell-slot">
          <div class="cell ${cellClasses}">
            ${this.renderEvents(
              cellEvents,
              cellStartTime,
              cellEndTime,
              isAllDay,
            )}
            ${this.renderCellIcons(cellEvents, isAllDay)}
          </div>
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

    const orientation = this.config?.orientation || 'vertical';
    const isHorizontal = orientation === 'horizontal';
    const startProperty = isHorizontal ? 'left' : 'top';
    const lengthProperty = isHorizontal ? 'width' : 'height';

    const wrapperStyle = `${startProperty}: ${dimensions.startPct}%; ${lengthProperty}: ${dimensions.lengthPct}%;`;
    const innerStyle = `${startProperty}: ${dimensions.innerStartPct}%; ${lengthProperty}: ${dimensions.innerLengthPct}%;`;

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
    const orientation = this.config?.orientation || 'vertical';
    const isHorizontal = orientation === 'horizontal';
    const { startPct, lengthPct } = calculateSubBlockPosition(
      block,
      cellStartTime,
      duration,
    );
    const style = isHorizontal
      ? `left: ${startPct}%; width: ${lengthPct}%; top: 0%; height: 100%;`
      : `top: ${startPct}%; height: ${lengthPct}%; left: 0%; width: 100%;`;

    const full = lengthPct === 100;

    return html`<div
      class="event-sub-block"
      data-full="${full}"
      style="${style}"
    ></div>`;
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

    const entities = this.getNormalizedEntities();

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
        .filter((e) => !filterText || (e.summary && e.summary == filterText))
        .map((e) => ({ ...e, ...item }) as RawEvent);
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
    const lang: string = this.config?.language || this.hass?.language || 'en';
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
    const lang: string = this.config?.language || this.hass?.language || 'en';

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
    const startPct = (minutes / 60) * 100;

    const orientation = this.config?.orientation || 'vertical';
    const isHorizontal = orientation === 'horizontal';
    const startProperty = isHorizontal ? 'left' : 'top';

    const style = `${startProperty}: ${startPct}%;`;

    return html`
      <div class="current-time-line-wrapper">
        <div class="current-time-line" style="${style}">
          <div class="current-time-circle"></div>
        </div>
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
