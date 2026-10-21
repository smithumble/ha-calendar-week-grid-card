/**
 * Field value change handlers for the editor
 * Separates concerns from the main event handler
 */

export interface FieldHandlerContext {
  getConfigValue: (path: string, defaultValue?: unknown) => unknown;
  setConfigValue: (path: string, value: unknown) => void;
}

/**
 * Handles time format type switching between string and object
 */
export function handleTimeFormatTypeChange(
  formatType: 'string' | 'object',
  context: FieldHandlerContext,
): void {
  const currentTimeFormat = context.getConfigValue('time_format');

  if (formatType === 'string') {
    // Convert object to string format (default pattern)
    if (typeof currentTimeFormat === 'object' && currentTimeFormat !== null) {
      const formatObj = currentTimeFormat as Intl.DateTimeFormatOptions;
      if (formatObj.hour === 'numeric' && formatObj.hour12) {
        context.setConfigValue('time_format', 'h A');
      } else if (
        formatObj.hour === '2-digit' &&
        formatObj.minute === '2-digit'
      ) {
        context.setConfigValue('time_format', 'HH:mm');
      } else {
        context.setConfigValue('time_format', 'h A');
      }
    } else if (!currentTimeFormat) {
      context.setConfigValue('time_format', 'h A');
    }
  } else {
    // Convert string to object format
    if (typeof currentTimeFormat === 'string') {
      const formatObj: Intl.DateTimeFormatOptions = {};
      if (currentTimeFormat.includes('H')) {
        formatObj.hour = '2-digit';
        formatObj.hour12 = false;
      } else if (currentTimeFormat.includes('h')) {
        formatObj.hour = currentTimeFormat.includes('hh')
          ? '2-digit'
          : 'numeric';
        formatObj.hour12 = true;
      }
      if (currentTimeFormat.includes('mm')) {
        formatObj.minute = '2-digit';
      } else if (currentTimeFormat.includes('m')) {
        formatObj.minute = 'numeric';
      }
      context.setConfigValue('time_format', formatObj);
    } else if (!currentTimeFormat) {
      context.setConfigValue('time_format', { hour: 'numeric' });
    }
  }
}

/**
 * Handles criteria type switching between string and object
 */
export function handleCriteriaTypeChange(
  basePath: string,
  newType: 'string' | 'object',
  context: FieldHandlerContext,
): void {
  const currentItem = context.getConfigValue(basePath);

  if (newType === 'string') {
    // Convert object to string (use name field if available)
    if (
      typeof currentItem === 'object' &&
      currentItem !== null &&
      !Array.isArray(currentItem)
    ) {
      const obj = currentItem as Record<string, unknown>;
      context.setConfigValue(basePath, obj.name || '');
    } else if (typeof currentItem !== 'string') {
      context.setConfigValue(basePath, '');
    }
  } else {
    // Convert string to object
    if (typeof currentItem === 'string') {
      context.setConfigValue(basePath, { name: currentItem });
    } else if (
      typeof currentItem !== 'object' ||
      currentItem === null ||
      Array.isArray(currentItem)
    ) {
      context.setConfigValue(basePath, {});
    }
  }
}
