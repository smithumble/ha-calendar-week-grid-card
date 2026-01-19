import type { Event, EventCriteria, EntityConfig } from '../types';

/**
 * Filter events that occur within the specified time range
 */
export function filterEvents(
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

/**
 * Filter out all-day events based on configuration
 */
export function filterAllDayEvents(
  events: Event[],
  allDayMode?: string,
): Event[] {
  if (allDayMode === 'row') {
    return events.filter((event) => !event.isAllDay);
  }
  return events;
}

/**
 * Check if an event matches the given criteria
 */
export function matchesCriteria(
  event: Event,
  criteria: EventCriteria,
): boolean {
  // Check if at least one field is specified
  const hasAnyField =
    criteria.name !== undefined ||
    criteria.type !== undefined ||
    criteria.entity !== undefined ||
    criteria.filter !== undefined;
  if (!hasAnyField) return false;

  // Match only if all specified criteria fields match (AND logic)
  if (criteria.name !== undefined && event.name !== criteria.name) return false;
  if (criteria.type !== undefined && event.type !== criteria.type) return false;
  if (criteria.entity !== undefined && event.entity !== criteria.entity)
    return false;
  if (criteria.filter !== undefined && event.filter !== criteria.filter)
    return false;
  return true;
}

/**
 * Hide events based on entity configuration
 */
export function hideEvents(
  events: Event[],
  normalizedEntities: EntityConfig[],
): Event[] {
  const entityHideMap = new Map<string, EventCriteria[]>();

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
    const hideCriteria = event.name ? entityHideMap.get(event.name) : undefined;

    if (hideCriteria && hideCriteria.length > 0) {
      for (const targetEvent of events) {
        if (targetEvent === event) continue;

        for (const criteria of hideCriteria) {
          if (matchesCriteria(targetEvent, criteria)) {
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

/**
 * Sort events based on shift configuration (under/over)
 */
export function shiftEvents(
  events: Event[],
  normalizedEntities: EntityConfig[],
): Event[] {
  // Build maps of entity name -> shift criteria lists from config
  const entityUnderMap = new Map<string, EventCriteria[]>();
  const entityOverMap = new Map<string, EventCriteria[]>();

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
          if (matchesCriteria(originalEvent, criteria)) {
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
        const eventsToMove: Array<{ event: Event; originalIndex: number }> = [];
        for (let j = i + 1; j < events.length; j++) {
          const laterEvent = events[j];
          for (const criteria of underCriteria) {
            if (matchesCriteria(laterEvent, criteria)) {
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
    const overCriteria = event.name ? entityOverMap.get(event.name) : undefined;

    if (overCriteria && overCriteria.length > 0) {
      // Check if any events match the over criteria
      let hasMatchingEvents = false;
      for (const originalEvent of events) {
        for (const criteria of overCriteria) {
          if (matchesCriteria(originalEvent, criteria)) {
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
        const eventsToMove: Array<{ event: Event; originalIndex: number }> = [];
        for (let j = i - 1; j >= 0; j--) {
          const earlierEvent = events[j];
          for (const criteria of overCriteria) {
            if (matchesCriteria(earlierEvent, criteria)) {
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
