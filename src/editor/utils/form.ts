/**
 * Schema helpers for the visual editor.
 *
 * Every field in the editor is rendered through Home Assistant's own
 * `ha-form` with native selectors (the approach used by Bubble Card). This
 * keeps the editor working across HA frontend upgrades: the selectors own
 * their inner components (text fields, selects, pickers), so the editor never
 * talks to `ha-select` / `ha-textfield` / `ha-input` APIs directly.
 */

export type FormData = Record<string, unknown>;

export interface SelectOption {
  value: string;
  label: string;
}

export interface FormSchemaItem {
  name: string;
  label?: string;
  helper?: string;
  required?: boolean;
  selector: Record<string, unknown>;
}

//-----------------------------------------------------------------------------
// FIELD FACTORIES
//-----------------------------------------------------------------------------

export function textField(
  name: string,
  label: string,
  helper?: string,
): FormSchemaItem {
  return { name, label, helper, selector: { text: {} } };
}

export function numberField(
  name: string,
  label: string,
  helper?: string,
  options: { min?: number; max?: number; step?: number } = {},
): FormSchemaItem {
  return {
    name,
    label,
    helper,
    selector: { number: { mode: 'box', step: 1, ...options } },
  };
}

export function booleanField(
  name: string,
  label: string,
  helper?: string,
): FormSchemaItem {
  return { name, label, helper, selector: { boolean: {} } };
}

/**
 * Dropdown select. A select that is not `required` can be cleared, which
 * removes the key from the config instead of storing an empty value.
 */
export function selectField(
  name: string,
  label: string,
  options: SelectOption[],
  config: { helper?: string; required?: boolean } = {},
): FormSchemaItem {
  return {
    name,
    label,
    helper: config.helper,
    required: config.required ?? false,
    selector: { select: { mode: 'dropdown', options } },
  };
}

export function iconField(
  name: string,
  label: string,
  helper?: string,
  placeholder?: string,
): FormSchemaItem {
  return {
    name,
    label,
    helper,
    selector: { icon: placeholder ? { placeholder } : {} },
  };
}

export function entityField(
  name: string,
  label: string,
  config: { helper?: string; domain?: string; required?: boolean } = {},
): FormSchemaItem {
  return {
    name,
    label,
    helper: config.helper,
    required: config.required ?? false,
    selector: {
      entity: config.domain ? { filter: { domain: config.domain } } : {},
    },
  };
}

export const computeLabel = (schema: FormSchemaItem): string =>
  schema.label ?? schema.name;

export const computeHelper = (schema: FormSchemaItem): string | undefined =>
  schema.helper;

//-----------------------------------------------------------------------------
// VALUE HELPERS
//-----------------------------------------------------------------------------

export function isPlainObject(value: unknown): value is FormData {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Values that mean "not set". Selectors hand back `undefined`, `null` or an
 * empty string when a field is cleared, and older HA versions could even
 * hand back the literal string "null".
 */
export function normalizeEmpty(value: unknown): unknown {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string' && (value === '' || value === 'null')) {
    return undefined;
  }
  if (typeof value === 'number' && Number.isNaN(value)) return undefined;
  return value;
}

export function isEmptyValue(value: unknown): boolean {
  if (normalizeEmpty(value) === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (isPlainObject(value)) return Object.keys(value).length === 0;
  return false;
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a === 'object' || typeof b === 'object') {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}

/**
 * Works out what the user actually changed in an `ha-form`.
 *
 * `ha-form` hands back the whole data object on every edit, including the
 * defaults the editor only displayed. A field that was missing from the
 * config and still holds the default it was shown was not chosen, so it is
 * left out (the same rule Bubble Card applies to module defaults). Only the
 * fields of the given schema are considered, so keys the form does not own
 * are never touched.
 *
 * Returns a map of changed keys; `undefined` means "remove the key".
 */
export function resolveFormChanges(
  schema: FormSchemaItem[],
  before: FormData,
  next: FormData,
  defaults: FormData = {},
): FormData {
  const changes: FormData = {};
  for (const { name } of schema) {
    let value = normalizeEmpty(next?.[name]);
    const previous = normalizeEmpty(before?.[name]);
    if (
      previous === undefined &&
      defaults[name] !== undefined &&
      valuesEqual(value, defaults[name])
    ) {
      value = undefined;
    }
    if (!valuesEqual(value, previous)) {
      changes[name] = value;
    }
  }
  return changes;
}

/**
 * Returns a copy of `target` with `changes` applied (undefined removes a key).
 */
export function applyChanges(target: FormData, changes: FormData): FormData {
  const result: FormData = { ...target };
  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined) {
      delete result[key];
    } else {
      result[key] = value;
    }
  }
  return result;
}
