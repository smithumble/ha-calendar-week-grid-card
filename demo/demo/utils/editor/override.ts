/**
 * Debug config override (localStorage) — no demo state imports (avoids circular deps).
 */

import type { CardConfig } from '../../../../src/types';
import { parseYamlConfig } from './parse';

const DEBUG_OVERRIDE_KEY = 'calendar-week-grid-card-demo-debug-override';
const DEBUG_OVERRIDE_ENABLED_KEY =
  'calendar-week-grid-card-demo-debug-override-enabled';
const DEBUG_SECOND_ROW_ENABLED_KEY =
  'calendar-week-grid-card-demo-debug-second-row-enabled';
const DEBUG_SECOND_ROW_OVERRIDE_KEY =
  'calendar-week-grid-card-demo-debug-second-row-override';
const DEBUG_SECOND_ROW_OVERRIDE_ENABLED_KEY =
  'calendar-week-grid-card-demo-debug-second-row-override-enabled';

/** Screenshot/schedule bundles share this module but must not apply stored YAML overrides. */
let debugConfigOverrideAllowed = false;

/** Call from the interactive demo entry only. */
export function allowDebugConfigOverrideInApp(): void {
  debugConfigOverrideAllowed = true;
}

export function isDebugOverrideEnabled(): boolean {
  const stored = localStorage.getItem(DEBUG_OVERRIDE_ENABLED_KEY);
  if (stored === null) return true;
  return stored === 'true';
}

export function setDebugOverrideEnabledFlag(enabled: boolean): void {
  localStorage.setItem(DEBUG_OVERRIDE_ENABLED_KEY, String(enabled));
}

export function isDebugSecondRowEnabled(): boolean {
  return localStorage.getItem(DEBUG_SECOND_ROW_ENABLED_KEY) === 'true';
}

export function setDebugSecondRowEnabledFlag(enabled: boolean): void {
  localStorage.setItem(DEBUG_SECOND_ROW_ENABLED_KEY, String(enabled));
}

export function isDebugSecondRowOverrideEnabled(): boolean {
  const stored = localStorage.getItem(DEBUG_SECOND_ROW_OVERRIDE_ENABLED_KEY);
  if (stored === null) return true;
  return stored === 'true';
}

export function setDebugSecondRowOverrideEnabledFlag(enabled: boolean): void {
  localStorage.setItem(DEBUG_SECOND_ROW_OVERRIDE_ENABLED_KEY, String(enabled));
}

export function getDebugOverride(): Partial<CardConfig> {
  const stored = localStorage.getItem(DEBUG_OVERRIDE_KEY);
  if (!stored) return {};
  try {
    const parsed = parseYamlConfig(stored);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (e) {
    console.error('Failed to parse debug override:', e);
    return {};
  }
}

export function applyDebugOverrideToConfig(config: CardConfig): CardConfig {
  if (!debugConfigOverrideAllowed) return config;
  if (!isDebugOverrideEnabled()) return config;
  const override = getDebugOverride();
  if (Object.keys(override).length === 0) return config;

  return {
    ...config,
    ...override,
  };
}

export function clearStoredDebugOverride(): void {
  localStorage.removeItem(DEBUG_OVERRIDE_KEY);
}

export function setStoredDebugOverrideYaml(yamlStr: string): void {
  localStorage.setItem(DEBUG_OVERRIDE_KEY, yamlStr);
}

export function getStoredDebugOverrideRaw(): string | null {
  return localStorage.getItem(DEBUG_OVERRIDE_KEY);
}

export function clearStoredDebugSecondRowOverride(): void {
  localStorage.removeItem(DEBUG_SECOND_ROW_OVERRIDE_KEY);
}

export function setStoredDebugSecondRowOverrideYaml(yamlStr: string): void {
  localStorage.setItem(DEBUG_SECOND_ROW_OVERRIDE_KEY, yamlStr);
}

export function getStoredDebugSecondRowOverrideRaw(): string | null {
  return localStorage.getItem(DEBUG_SECOND_ROW_OVERRIDE_KEY);
}

export function getDebugSecondRowOverride(): Partial<CardConfig> {
  const stored = getStoredDebugSecondRowOverrideRaw();
  if (!stored) return {};
  try {
    const parsed = parseYamlConfig(stored);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (e) {
    console.error('Failed to parse second-row debug override:', e);
    return {};
  }
}
