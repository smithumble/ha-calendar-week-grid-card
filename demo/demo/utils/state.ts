// ============================================================================
// GLOBAL STATE MANAGEMENT
// ============================================================================

import type { CardConfig } from '../../../src/types';
import { renderCards } from './browser';
import type { Calendar } from './data';
import { providerRegistry } from './registry';

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
  const providerInstance = providerRegistry.getProvider(provider);
  if (!providerInstance) return null;

  // Provider handles caching internally
  return await providerInstance.loadConfig(configName);
}

export async function selectConfig(
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

export async function updateCalendarsAndRender(
  dataSource: string,
  provider: string,
) {
  const providerInstance = providerRegistry.getProvider(provider);
  if (providerInstance) {
    // Provider handles caching internally
    const calendars = await providerInstance.loadCalendars(dataSource);
    setCurrentCalendars(calendars);
  }
  renderCurrentCards();
}
