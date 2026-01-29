/**
 * Shared mock Home Assistant instance
 * Used by both card rendering and visual editor for consistency
 */

import type { HomeAssistant, HassEntities } from '../../../../src/types';
import type { Calendar } from '../data';

let sharedMockHass: HomeAssistant | null = null;
let cacheKey: string = '';

/**
 * Creates a simple hash from a string
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Creates a cache key from calendars and darkMode
 * Includes events data to ensure cache invalidation when datasource changes
 */
function getCacheKey(calendars: Calendar[], darkMode: boolean): string {
  const calendarIds = calendars
    .map((c) => c.entity_id)
    .sort()
    .join(',');

  // Include events data in cache key to detect when datasource changes
  // Create a hash from events: count + hash of events content
  const eventsHash = calendars
    .map((c) => {
      const eventCount = c.events?.length || 0;
      // Create a hash from the stringified events array
      // This ensures cache invalidation when events change even if entity_ids are the same
      const eventsStr = JSON.stringify(c.events || []);
      const eventsContentHash = simpleHash(eventsStr).substring(0, 8);
      return `${eventCount}:${eventsContentHash}`;
    })
    .sort()
    .join('|');

  return `${calendarIds}|${darkMode}|${eventsHash}`;
}

/**
 * Creates or updates the shared mock Home Assistant instance
 */
function createMockHass(
  calendars: Calendar[],
  darkMode: boolean = false,
): HomeAssistant {
  // Create states object with calendar entities
  const states: HassEntities = {};
  calendars.forEach((calendar) => {
    const now = new Date().toISOString();
    states[calendar.entity_id] = {
      entity_id: calendar.entity_id,
      state: 'on',
      last_changed: now,
      last_updated: now,
      attributes: {
        friendly_name: calendar.entity_id
          .replace('calendar.', '')
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (letter: string) => letter.toUpperCase()),
      },
      context: {
        id: '',
        user_id: null,
        parent_id: null,
      },
    };
  });

  // Extract calendar ID from API path
  const extractCalendarId = (path: string): string | null => {
    if (!path.startsWith('calendars/')) return null;
    const pathParts = path.split('/');
    const calendarPart = pathParts[1];
    if (!calendarPart) return null;
    // Remove query parameters if present
    const calendarId = calendarPart.split('?')[0];
    return decodeURIComponent(calendarId);
  };

  // Mock callApi function
  const callApi = async (_method: string, path: string) => {
    const calendarId = extractCalendarId(path);
    if (!calendarId) return [];

    const calendar = calendars.find((c) => c.entity_id === calendarId);
    return calendar?.events ?? [];
  };

  // Return the mock Home Assistant instance
  return {
    language: 'en',
    config: { time_zone: 'Europe/Kiev' },
    themes: { darkMode: darkMode },
    states: states,
    entities: {},
    devices: {},
    callApi,
  } as HomeAssistant;
}

/**
 * Get or create the shared mock Hass instance
 * Updates it if calendars or darkMode changed
 * Both card and editor use the same instance for consistency
 */
export function getSharedMockHass(
  calendars: Calendar[],
  darkMode: boolean = false,
): HomeAssistant {
  const newCacheKey = getCacheKey(calendars, darkMode);

  // Check if we need to recreate the instance
  if (!sharedMockHass || cacheKey !== newCacheKey) {
    sharedMockHass = createMockHass(calendars, darkMode);
    cacheKey = newCacheKey;
  }

  return sharedMockHass;
}

/**
 * Clear the cached instance (useful for testing or when data changes)
 */
export function clearSharedMockHass(): void {
  sharedMockHass = null;
  cacheKey = '';
}
