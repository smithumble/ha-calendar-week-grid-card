/**
 * Configuration management utilities for nested path-based access
 */
import type { CardConfig } from '../../types';

export class ConfigManager {
  /**
   * Gets a value from config using a dot-notation path
   * Supports array indices in path (e.g., "entities.0.name")
   */
  static getValue(
    config: CardConfig,
    path: string,
    defaultValue?: unknown,
  ): unknown {
    if (!config) {
      return defaultValue;
    }

    if (!path.includes('.')) {
      return config[path as keyof CardConfig] ?? defaultValue;
    }

    const pathParts = path.split('.');
    let current: unknown = config;

    for (const part of pathParts) {
      if (current === undefined || current === null) {
        return defaultValue;
      }

      if (/^\d+$/.test(part)) {
        const index = parseInt(part, 10);
        if (Array.isArray(current) && index >= 0 && index < current.length) {
          current = current[index];
          continue;
        }
        return defaultValue;
      }

      if (
        typeof current === 'object' &&
        current !== null &&
        part in (current as Record<string, unknown>)
      ) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return defaultValue;
      }
    }

    return current ?? defaultValue;
  }

  /**
   * Sets a value in config using a dot-notation path
   * Returns a new config object with the updated value
   */
  static setValue(
    config: CardConfig,
    path: string,
    value: unknown,
  ): CardConfig {
    if (!config) {
      return config;
    }

    const newConfig = JSON.parse(JSON.stringify(config)) as Record<
      string,
      unknown
    >;

    if (!path.includes('.')) {
      if (value === undefined) {
        delete newConfig[path];
      } else {
        newConfig[path] = value;
      }
      return newConfig as unknown as CardConfig;
    }

    const pathParts = path.split('.');
    const lastPart = pathParts.pop()!;
    let current: Record<string, unknown> | unknown[] = newConfig;

    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      const nextPart = pathParts[i + 1] || lastPart;
      const isNextPartNumeric = /^\d+$/.test(nextPart);

      if (/^\d+$/.test(part)) {
        const index = parseInt(part, 10);
        if (!Array.isArray(current)) {
          current = [] as unknown[];
        }
        while ((current as unknown[]).length <= index) {
          (current as unknown[]).push(isNextPartNumeric ? [] : {});
        }
        const item = (current as unknown[])[index];
        if (!item || (isNextPartNumeric && !Array.isArray(item))) {
          (current as unknown[])[index] = isNextPartNumeric ? [] : {};
        } else if (
          !isNextPartNumeric &&
          (typeof item !== 'object' || item === null)
        ) {
          // Replace string/primitive/null with empty object
          (current as unknown[])[index] = {};
        }
        const nextItem = (current as unknown[])[index];
        // Ensure the item exists and is not null
        if (nextItem === null || nextItem === undefined) {
          (current as unknown[])[index] = isNextPartNumeric ? [] : {};
          current = (current as unknown[])[index] as
            | Record<string, unknown>
            | unknown[];
        } else {
          current = nextItem as Record<string, unknown> | unknown[];
        }
        continue;
      }

      // Ensure current is an object (not array, not null) before accessing properties
      if (typeof current !== 'object' || current === null) {
        current = {} as Record<string, unknown>;
      }

      if (!Object.prototype.hasOwnProperty.call(current, part)) {
        (current as Record<string, unknown>)[part] = isNextPartNumeric
          ? []
          : {};
      } else {
        const existing = (current as Record<string, unknown>)[part];
        if (isNextPartNumeric && !Array.isArray(existing)) {
          (current as Record<string, unknown>)[part] = [];
        } else if (!isNextPartNumeric) {
          // Handle null, string, or non-object values - replace with empty object
          if (
            existing === null ||
            typeof existing !== 'object' ||
            Array.isArray(existing)
          ) {
            (current as Record<string, unknown>)[part] = {};
          }
        }
      }
      current = (current as Record<string, unknown>)[part] as
        | Record<string, unknown>
        | unknown[];
    }

    // Handle last part - could be array index or object property
    if (/^\d+$/.test(lastPart)) {
      const index = parseInt(lastPart, 10);
      if (!Array.isArray(current)) {
        current = [] as unknown[];
      }
      while ((current as unknown[]).length <= index) {
        (current as unknown[]).push(undefined);
      }
      if (value === undefined) {
        (current as unknown[]).splice(index, 1);
      } else {
        (current as unknown[])[index] = value;
      }
    } else {
      // Ensure current is a non-null object before setting property
      if (typeof current !== 'object' || current === null) {
        current = {} as Record<string, unknown>;
      }
      if (value === undefined) {
        delete (current as Record<string, unknown>)[lastPart];
      } else {
        (current as Record<string, unknown>)[lastPart] = value;
      }
    }

    return newConfig as unknown as CardConfig;
  }
}
