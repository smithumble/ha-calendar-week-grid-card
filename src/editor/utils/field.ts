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
 * Handles date format field changes (primary_date_format or secondary_date_format)
 */
export function handleDateFormatFieldChange(
  configPath: string,
  fieldName: string,
  value: string | boolean | number | object | null,
  context: FieldHandlerContext,
): void {
  // Get current format object or create new one
  const currentFormat =
    (context.getConfigValue(configPath, {}) as Intl.DateTimeFormatOptions) ||
    {};
  const newFormat: Record<string, unknown> = { ...currentFormat };

  // Update the specific field
  if (value === '' || value === null || value === undefined) {
    delete newFormat[fieldName];
  } else {
    // Convert hour12 string to boolean if needed
    if (fieldName === 'hour12') {
      newFormat[fieldName] =
        value === 'true' ? true : value === 'false' ? false : value;
    } else {
      newFormat[fieldName] = value as string;
    }
  }

  // Remove empty object if no fields are set
  if (Object.keys(newFormat).length === 0) {
    context.setConfigValue(configPath, undefined);
  } else {
    context.setConfigValue(configPath, newFormat as Intl.DateTimeFormatOptions);
  }
}

/**
 * Handles time format object field changes
 */
export function handleTimeFormatObjectFieldChange(
  fieldName: string,
  value: string | boolean | number | object | null,
  context: FieldHandlerContext,
): void {
  const currentFormat = context.getConfigValue('time_format', {}) as
    | Intl.DateTimeFormatOptions
    | string;

  // Only handle if current format is an object
  if (typeof currentFormat === 'object' && currentFormat !== null) {
    const newFormat: Record<string, unknown> = { ...currentFormat };

    if (value === '' || value === null || value === undefined) {
      delete newFormat[fieldName];
    } else {
      // Convert hour12 string to boolean if needed
      if (fieldName === 'hour12') {
        newFormat[fieldName] =
          value === 'true' ? true : value === 'false' ? false : value;
      } else {
        newFormat[fieldName] = value as string;
      }
    }

    // Remove empty object if no fields are set
    if (Object.keys(newFormat).length === 0) {
      context.setConfigValue('time_format', undefined);
    } else {
      context.setConfigValue(
        'time_format',
        newFormat as Intl.DateTimeFormatOptions,
      );
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

/**
 * Handles criteria object field changes (name, type, entity, filter)
 */
export function handleCriteriaFieldChange(
  basePath: string,
  itemIndex: number,
  fieldName: string,
  value: string | boolean | number | object | null,
  context: FieldHandlerContext,
): void {
  const criteria =
    (context.getConfigValue(basePath, []) as Array<
      string | Record<string, unknown>
    >) || [];

  // Ensure the item exists
  if (!criteria[itemIndex]) {
    criteria[itemIndex] = {};
  }

  const currentItem = criteria[itemIndex];
  let itemObj: Record<string, unknown>;

  if (typeof currentItem === 'string') {
    // Convert to object if needed
    itemObj = { name: currentItem };
  } else {
    itemObj = { ...(currentItem as Record<string, unknown>) };
  }

  // Update the field
  if (value === '' || value === null || value === undefined) {
    delete itemObj[fieldName];
  } else {
    itemObj[fieldName] = value;
  }

  // Remove empty object fields and __type
  const cleanedObj: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(itemObj)) {
    if (key !== '__type' && val !== '' && val !== null && val !== undefined) {
      cleanedObj[key] = val;
    }
  }

  // If object is empty, convert to empty string
  if (Object.keys(cleanedObj).length === 0) {
    criteria[itemIndex] = '';
  } else {
    criteria[itemIndex] = cleanedObj;
  }

  context.setConfigValue(basePath, criteria);
}
