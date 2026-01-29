// ============================================================================
// GLOBAL STATE MANAGEMENT
// ============================================================================

import type { CardConfig } from '../../../src/types';
import { renderCards } from './browser';
import type { Calendar } from './data';
import { loadConfigByName, loadCalendarsForDataSource } from './data';

let currentProvider: string = '';
let currentConfig: CardConfig | null = null;
export let originalConfig: CardConfig | null = null;
let currentCalendars: Calendar[] = [];

export function getCurrentProvider(): string {
  return currentProvider;
}

export function setCurrentProvider(provider: string): void {
  currentProvider = provider;
}

export function getCurrentConfig(): CardConfig | null {
  return currentConfig;
}

export function setCurrentConfig(config: CardConfig | null): void {
  currentConfig = config;
}

export function getCurrentCalendars(): Calendar[] {
  return currentCalendars;
}

export function setCurrentCalendars(calendars: Calendar[]): void {
  currentCalendars = calendars;
}

export async function getConfigByName(
  provider: string,
  configName: string,
): Promise<CardConfig | null> {
  // Provider handles caching internally
  return await loadConfigByName(provider, configName);
}

export async function setConfig(
  configName: string,
  provider: string,
): Promise<boolean> {
  const config = await getConfigByName(provider, configName);
  if (config) {
    setCurrentConfig(config);
    originalConfig = JSON.parse(JSON.stringify(config));
    return true;
  }
  return false;
}

export function renderCurrentCards() {
  if (currentConfig && currentCalendars) {
    renderCards(currentConfig, currentCalendars);
  }
}

export async function updateCalendars(dataSource: string, provider: string) {
  // Provider handles caching internally
  const calendars = await loadCalendarsForDataSource(dataSource, provider);
  setCurrentCalendars(calendars);
}
