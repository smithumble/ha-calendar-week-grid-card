import type { Event, ThemeValues, CardConfig } from '../types';

/**
 * Extract CSS variable values from event
 * Reads from theme_values nested object in event and base configs
 * For blank events, also considers blank_event and blank_all_day_event configs
 * For regular events, also considers root event config
 */
export function getThemeValues(event: Event, config?: CardConfig): ThemeValues {
  const themeValues: ThemeValues = {};
  const themeVariables = config?.theme_variables;

  if (!themeVariables) {
    return themeValues;
  }

  // Build base config's theme_values based on event type
  let baseThemeValues: ThemeValues = {};

  if (event.type === 'blank') {
    // For blank events, merge theme_values from blank_event and blank_all_day_event configs
    baseThemeValues = {
      ...(config?.blank_event?.theme_values || {}),
    };

    // Override with blank_all_day_event if it's an all-day event
    if (event.isAllDay) {
      baseThemeValues = {
        ...baseThemeValues,
        ...(config?.blank_all_day_event?.theme_values || {}),
      };
    }
  } else {
    // For regular events, start with root event config's theme_values
    baseThemeValues = { ...(config?.event?.theme_values || {}) };
  }

  // Get event's theme_values
  const eventObj = event as Event;
  const eventThemeValues = eventObj.theme_values || {};

  // Extract variables defined in theme_variables config
  for (const varKey of Object.keys(themeVariables)) {
    // Check event.theme_values first, then baseThemeValues
    const eventValue = eventThemeValues[varKey];
    const baseValue = baseThemeValues[varKey];

    // Priority: event.theme_values > base config theme_values
    const finalValue = eventValue != null ? eventValue : baseValue;

    if (finalValue != null) {
      // Always convert to string
      themeValues[varKey] = String(finalValue);
    }
  }

  return themeValues;
}

/**
 * Build CSS variables style string from theme values
 */
export function buildThemeStyle(themeValues: ThemeValues): string {
  let style = '';
  for (const [varName, varValue] of Object.entries(themeValues)) {
    style += ` --${varName}: ${varValue};`;
  }
  return style;
}

/**
 * Get icon for event based on type and configuration
 */
export function getEventIcon(
  event: Event,
  isAllDay: boolean,
  config?: CardConfig,
  deprecatedBlankIcon?: string,
  deprecatedEventIcon?: string,
  deprecatedFilledIcon?: string,
): string {
  if (!event) {
    return '';
  }

  let icon;

  if (event.type === 'blank') {
    if (isAllDay) {
      // Blank all day event icon
      icon = config?.blank_all_day_event?.icon;
      // Blank all day event icon (legacy)
      icon = icon || config?.all_day_icon;
    } else {
      // Blank event icon
      icon = config?.blank_event?.icon;
      // Blank event icon (legacy)
      icon = icon || config?.blank_icon;
    }

    // Deprecated
    icon = icon || deprecatedBlankIcon;

    // Default
    icon = icon || '';
  }

  if (event.type !== 'blank') {
    // Event icon
    icon = event?.icon;
    // Default event icon
    icon = icon || config?.event?.icon;
    // Default event icon (legacy)
    icon = icon || config?.event_icon;

    // Deprecated
    icon = icon || deprecatedEventIcon;
    icon = icon || deprecatedFilledIcon;

    // Default
    icon = icon || 'mdi:check-circle';
  }

  return icon || '';
}
