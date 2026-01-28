import type { CardConfig } from '../../../src/types';
import { providerRegistry } from './registry';

export interface ConfigItem {
  name: string;
  config: CardConfig;
}

export interface Calendar {
  entity_id: string;
  events: unknown[];
}

export interface ProviderData {
  calendars: Record<string, Calendar[]>;
  configs: ConfigItem[];
  dataSources: string[];
  mockDate?: Date;
  defaultConfig?: string;
  defaultDataSource?: string;
}

/**
 * Get all provider names
 */
export function getAllProviderNames(): string[] {
  return providerRegistry.getAllProviderNames();
}

/**
 * Get available config names for a provider without loading configs
 */
export function getAvailableConfigNames(providerName: string): string[] {
  const provider = providerRegistry.getProvider(providerName);
  return provider ? provider.getConfigNames() : [];
}

/**
 * Get data sources for a provider
 */
export function getProviderDataSources(providerName: string): string[] {
  const provider = providerRegistry.getProvider(providerName);
  return provider ? provider.getDataSources() : [];
}

/**
 * Get default config for a provider
 */
export function getProviderDefaultConfig(
  providerName: string,
): string | undefined {
  const provider = providerRegistry.getProvider(providerName);
  return provider?.getDefaultConfig();
}

/**
 * Get default data source for a provider
 */
export function getProviderDefaultDataSource(
  providerName: string,
): string | undefined {
  const provider = providerRegistry.getProvider(providerName);
  return provider?.getDefaultDataSource();
}

/**
 * Get mock date for a provider
 */
export function getProviderMockDate(providerName: string): Date | undefined {
  const provider = providerRegistry.getProvider(providerName);
  return provider?.getMockDate();
}

/**
 * Load calendars for a specific data source
 */
export async function loadCalendarsForDataSource(
  dataSource: string,
  providerName: string,
): Promise<Calendar[]> {
  const provider = providerRegistry.getProvider(providerName);
  return provider ? provider.loadCalendars(dataSource) : [];
}

/**
 * Load a single config by name
 */
export async function loadConfigByName(
  providerName: string,
  configName: string,
): Promise<CardConfig | null> {
  const provider = providerRegistry.getProvider(providerName);
  return provider ? provider.loadConfig(configName) : null;
}

/**
 * Get filtered list of providers based on available providers
 */
export function getFilteredProviders(
  allProviders: string[],
  availableProviders?: string[],
): string[] {
  return availableProviders
    ? allProviders.filter((p) => availableProviders.includes(p))
    : allProviders;
}

/**
 * Get list of providers that should be visible in the dropdown
 */
export function getVisibleProviders(
  allProviders: string[],
  hiddenProviders: string[] = [],
): string[] {
  return allProviders.filter((name) => !hiddenProviders.includes(name));
}
