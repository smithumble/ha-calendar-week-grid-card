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
import styles from './styles.css';
import type {
  CardConfig,
  CalendarEvent,
  Event,
  DayInfo,
  EntityConfig,
  ShiftCriteria,
} from './types';

@customElement('calendar-week-grid-card')
export class CalendarWeekGridCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private config?: CardConfig;
  @state() private events: Event[] = [];

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
      return html`Loading...`;
    }

    const days = this.getDays();

    const startHour = this.config.start_hour ?? 0;
    const endHour = this.config.end_hour ?? 24;
    const hours = Array.from(
      { length: endHour - startHour },
      (_, i) => startHour + i,
    );

    return html`
      <div
        class="grid-container"
        data-icons-container="${this.config?.icons_container || 'cell'}"
        data-icons-mode="${this.config?.icons_mode || 'top'}"
      >
        <!-- Header Row -->
        <div></div>
        ${days.map(
          (day) => html`
            <div class="day-header-wrapper">
              <div class="day-header ${day.isToday ? 'today' : ''}">
                ${day.label}
              </div>
            </div>
          `,
        )}

        <!-- Grid Rows -->
        ${hours.map((hour) => this.renderRow(hour, days))}
      </div>
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
    return unsafeCSS(generateCssFromDeprecatedStyleConfig(this.config));
  }

  // ============================================================================
  // Render
  // ============================================================================

  private renderRow(hour: number, days: DayInfo[]): TemplateResult {
    const timeLabel = this.formatTime(hour);

    // Determine if this is the current hour (for all days)
    const now = new Date();
    const isNow = now.getHours() === hour;

    return html`
      <div class="time-label-wrapper">
        <div class="time-label ${isNow ? 'now' : ''}">${timeLabel}</div>
      </div>
      ${days.map((day) => this.renderCell(day, hour))}
    `;
  }

  private renderCell(day: DayInfo, hour: number): TemplateResult {
    const cellDate = new Date(day.date);
    const cellStartTime = cellDate.setHours(hour);
    const cellEndTime = cellDate.setHours(hour + 1);

    let cellEvents = [...this.events];

    // Reverse the list to render the events in the correct order
    cellEvents.reverse();

    // Filter events that are within the cell time range
    cellEvents = this.filterEvents(cellEvents, cellStartTime, cellEndTime);

    // Sort events based on shift configuration
    cellEvents = this.shiftEvents(cellEvents);

    // Determine if this is the current hour (for all days)
    const now = new Date();
    const isNow = now.getHours() === hour;

    // Build cell classes
    const cellClasses = [];
    if (day.isToday) {
      cellClasses.push('today');
    }
    if (isNow) {
      cellClasses.push('now');
    }

    return html`
      <div class="cell-wrapper">
        <div class="cell ${cellClasses.join(' ')}">
          ${this.renderEvents(cellEvents, cellStartTime, cellEndTime)}
          ${this.renderCellIcons(cellEvents)}
        </div>
        ${this.renderCurrentTimeLine(day, hour)}
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

    return html`<div
      class="event-wrapper"
      style="${wrapperStyle}"
      data-name="${event.name || ''}"
      data-type="${event.type || ''}"
      data-entity="${event.entity || ''}"
      data-filter="${event.filter || ''}"
    >
      <div class="event-block" style="${innerStyle}">
        ${this.renderEventSubBlocks(mergedBlocks, cellStartTime, duration)}
      </div>
      <div class="event-icon-overlay" style="${innerStyle}">
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

  private renderEventIcon(event: Event): TemplateResult {
    if (!event) {
      return html``;
    }

    let icon;

    if (event.type === 'blank') {
      // Configured
      icon = this.config?.blank_icon;

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

    return html`<ha-icon
      class="event-icon"
      data-name="${event.name || ''}"
      data-type="${event.type || ''}"
      data-entity="${event.entity || ''}"
      data-filter="${event.filter || ''}"
      icon="${icon}"
    ></ha-icon>`;
  }

  private renderCellIcons(events: Event[]): TemplateResult {
    return html`<div class="cell-icons">
      ${events.map((event) => this.renderEventIcon(event))}
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

  private shiftEvents(events: Event[]): Event[] {
    if (!this.config) return events;

    // Build maps of entity name -> shift criteria lists from config
    const entityShiftLeftMap = new Map<string, ShiftCriteria[]>();
    const entityShiftRightMap = new Map<string, ShiftCriteria[]>();
    const normalizedEntities = this.getNormalizedEntities();

    for (const entityConfig of normalizedEntities) {
      if (entityConfig.name) {
        // Process shift_left
        if (entityConfig.shift_left && entityConfig.shift_left.length > 0) {
          const criteria: ShiftCriteria[] = entityConfig.shift_left.map(
            (shift) => {
              if (typeof shift === 'string') {
                // String is treated as name
                return { name: shift };
              }
              return shift;
            },
          );
          entityShiftLeftMap.set(entityConfig.name, criteria);
        }

        // Process shift_right
        if (entityConfig.shift_right && entityConfig.shift_right.length > 0) {
          const criteria: ShiftCriteria[] = entityConfig.shift_right.map(
            (shift) => {
              if (typeof shift === 'string') {
                // String is treated as name
                return { name: shift };
              }
              return shift;
            },
          );
          entityShiftRightMap.set(entityConfig.name, criteria);
        }
      }
    }

    // If no entities have shift configuration, return events as-is
    if (entityShiftLeftMap.size === 0 && entityShiftRightMap.size === 0) {
      return events;
    }

    // Helper function to check if an event matches shift criteria (AND logic within object)
    const matchesCriteria = (
      event: Event,
      criteria: ShiftCriteria,
    ): boolean => {
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
    };

    // Start with events in original order
    const result = [...events];

    // Process shift-left: move matching events before the current event
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const shiftLeftCriteria = event.name
        ? entityShiftLeftMap.get(event.name)
        : undefined;

      if (shiftLeftCriteria && shiftLeftCriteria.length > 0) {
        // Check if any events match the shift-left criteria
        let hasMatchingEvents = false;
        for (const originalEvent of events) {
          for (const criteria of shiftLeftCriteria) {
            if (matchesCriteria(originalEvent, criteria)) {
              hasMatchingEvents = true;
              break;
            }
          }
          if (hasMatchingEvents) break;
        }

        if (hasMatchingEvents) {
          // Find the current position of the event with shift-left in result
          const eventIndex = result.indexOf(event);
          if (eventIndex < 0) continue;

          // Find all events that match shift-left criteria and come after this event
          const eventsToMove: Array<{ event: Event; originalIndex: number }> =
            [];
          for (let j = i + 1; j < events.length; j++) {
            const laterEvent = events[j];
            for (const criteria of shiftLeftCriteria) {
              if (matchesCriteria(laterEvent, criteria)) {
                eventsToMove.push({ event: laterEvent, originalIndex: j });
                break;
              }
            }
          }

          // Move matching events to come before the event with shift-left
          for (const { event: eventToMove } of eventsToMove) {
            const eventToMoveIndex = result.indexOf(eventToMove);
            if (eventToMoveIndex >= 0 && eventToMoveIndex > eventIndex) {
              // Remove from current position
              result.splice(eventToMoveIndex, 1);
              // Insert before the event with shift-left
              const newEventIndex = result.indexOf(event);
              result.splice(newEventIndex, 0, eventToMove);
            }
          }
        }
      }
    }

    // Process shift-right: move matching events after the current event
    // Process in reverse order to maintain correct positioning
    for (let i = events.length - 1; i >= 0; i--) {
      const event = events[i];
      const shiftRightCriteria = event.name
        ? entityShiftRightMap.get(event.name)
        : undefined;

      if (shiftRightCriteria && shiftRightCriteria.length > 0) {
        // Check if any events match the shift-right criteria
        let hasMatchingEvents = false;
        for (const originalEvent of events) {
          for (const criteria of shiftRightCriteria) {
            if (matchesCriteria(originalEvent, criteria)) {
              hasMatchingEvents = true;
              break;
            }
          }
          if (hasMatchingEvents) break;
        }

        if (hasMatchingEvents) {
          // Find the current position of the event with shift-right in result
          const eventIndex = result.indexOf(event);
          if (eventIndex < 0) continue;

          // Find all events that match shift-right criteria and come before this event
          const eventsToMove: Array<{ event: Event; originalIndex: number }> =
            [];
          for (let j = i - 1; j >= 0; j--) {
            const earlierEvent = events[j];
            for (const criteria of shiftRightCriteria) {
              if (matchesCriteria(earlierEvent, criteria)) {
                eventsToMove.push({ event: earlierEvent, originalIndex: j });
                break;
              }
            }
          }

          // Move matching events to come after the event with shift-right
          for (const { event: eventToMove } of eventsToMove) {
            const eventToMoveIndex = result.indexOf(eventToMove);
            if (eventToMoveIndex >= 0 && eventToMoveIndex < eventIndex) {
              // Remove from current position
              result.splice(eventToMoveIndex, 1);
              // Insert after the event with shift-right
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
