/**
 * Theme management utilities for the editor
 */
import {
  EVENT_CONFIG_KEYS,
  type CardConfig,
  type DefaultEventConfig,
  type EntityConfig,
  type EventConfigKey,
  type ThemeValues,
  type ThemeVariable,
} from '../../types';
import { ConfigManager } from './config';

export interface ThemeInfo {
  id: string;
  name: string;
  config: Partial<CardConfig>;
}

export class ThemeManager {
  private config: CardConfig;
  private themes: ThemeInfo[];

  constructor(config: CardConfig, themes: ThemeInfo[]) {
    this.config = config;
    this.themes = themes;
  }

  /**
   * Detects which theme is currently selected based on CSS content
   */
  detectSelectedTheme(): string {
    const currentCss =
      (ConfigManager.getValue(this.config, 'css', '') as string) || '';

    if (!currentCss.trim()) {
      return 'custom';
    }

    const normalizedCurrent = this.normalizeCss(currentCss);

    for (const theme of this.themes) {
      const themeCss = (theme.config.css as string) || '';
      const normalizedTheme = this.normalizeCss(themeCss);
      if (normalizedCurrent === normalizedTheme) {
        return theme.id;
      }
    }

    return 'custom';
  }

  /**
   * Normalizes CSS for comparison
   */
  private normalizeCss(css: string): string {
    return css
      .replace(/\s+/g, ' ')
      .replace(/\s*{\s*/g, '{')
      .replace(/\s*}\s*/g, '}')
      .replace(/\s*:\s*/g, ':')
      .replace(/\s*;\s*/g, ';')
      .trim();
  }

  /**
   * Gets theme_values_examples entry by entity index (cycling with modulo)
   */
  getExampleByEntityIndex(
    entityIndex: number,
  ): Record<string, unknown> | undefined {
    const themeValuesExamples = ConfigManager.getValue(
      this.config,
      'theme_values_examples',
      [],
    ) as Array<Record<string, unknown>>;

    if (themeValuesExamples.length === 0) {
      return undefined;
    }

    return themeValuesExamples[entityIndex % themeValuesExamples.length];
  }

  /**
   * Apply theme values from example to a single entity
   */
  applyThemeValuesToEntity(
    entity: string | EntityConfig,
    example: Record<string, unknown>,
  ): string | EntityConfig {
    const themeVariables =
      (ConfigManager.getValue(this.config, 'theme_variables', {}) as Record<
        string,
        ThemeVariable
      >) || {};
    const themeVariableKeys = Object.keys(themeVariables);

    // Extract only theme variable properties from example
    const themeValuesProps: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(example)) {
      if (themeVariableKeys.includes(key)) {
        themeValuesProps[key] = value;
      }
    }

    // Handle string entities - convert to object
    if (typeof entity === 'string') {
      const result: EntityConfig = { entity };
      if (Object.keys(themeValuesProps).length > 0) {
        result.theme_values = themeValuesProps;
      }
      return result;
    }

    // Handle object entities - replace theme_values
    const result = { ...entity };
    if (Object.keys(themeValuesProps).length > 0) {
      result.theme_values = themeValuesProps;
    }
    return result;
  }

  /**
   * Archives theme_values for a config object (entity or event config)
   * Only archives values that differ from the theme's example values
   */
  archiveEntityThemeValues(
    config: EntityConfig,
    exampleValues: ThemeValues | undefined,
    themeId: string,
  ): EntityConfig | null {
    if (!config.theme_values || Object.keys(config.theme_values).length === 0) {
      return null;
    }

    // Only archive values that differ from examples
    const valuesToArchive: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(config.theme_values)) {
      const exampleValue = exampleValues?.[key];
      // Archive if value differs from example (using type-aware comparison)
      if (!this.valuesAreEqual(value, exampleValue)) {
        valuesToArchive[key] = value;
      }
    }

    // Only update config if there are values to archive
    if (Object.keys(valuesToArchive).length > 0) {
      const result = { ...config };
      if (!result.theme_values_archive) {
        result.theme_values_archive = {};
      }
      // Merge with existing archive entries for this themeId to preserve any existing values
      const existingArchive = result.theme_values_archive[themeId] || {};
      result.theme_values_archive[themeId] = {
        ...existingArchive,
        ...valuesToArchive,
      };
      return result;
    }

    return null;
  }

  /**
   * Restores archived theme_values for a config object if available
   */
  getRestoredEntityConfig(config: EntityConfig, themeId: string): EntityConfig {
    const restoredConfig = { ...config };

    // Check if there's an archived value for this theme
    if (config.theme_values_archive?.[themeId]) {
      restoredConfig.theme_values = { ...config.theme_values_archive[themeId] };
      return restoredConfig;
    }

    return restoredConfig;
  }

  /**
   * Gets example theme values for an event config from a theme
   */
  getEventConfigDefaultValue(
    configKey: EventConfigKey,
    themeId: string,
  ): DefaultEventConfig | undefined {
    const theme = this.themes.find((t) => t.id === themeId);
    const eventConfig = theme?.config[configKey];
    return eventConfig || undefined;
  }

  /**
   * Archives theme_values for all entities before switching themes
   * Only archives values that differ from the theme's example values
   */
  archiveThemeValues(themeId: string): CardConfig {
    // Archive entities
    const entities = this.config.entities || [];
    if (entities.length > 0) {
      const updatedEntities = entities.map((entity, index) => {
        if (typeof entity === 'string') {
          return entity;
        }

        // Get example values for this entity index
        const example = this.getExampleByEntityIndex(index);
        const archivedEntity = this.archiveEntityThemeValues(
          entity,
          example,
          themeId,
        );
        return archivedEntity || entity;
      });
      this.config = ConfigManager.setValue(
        this.config,
        'entities',
        updatedEntities,
      );
    }

    return this.config;
  }

  /**
   * Restores archived theme_values for all entities
   * Falls back to theme_values_examples if no archive exists
   */
  restoreEntitiesThemeValues(themeId: string): Array<string | EntityConfig> {
    const entities = this.config.entities || [];
    const restoredEntities = entities.map((entity, index) => {
      if (typeof entity === 'string') {
        return entity;
      }

      // Create a new object
      const originalEntity = { ...entity };

      // Clear theme_values
      delete originalEntity.theme_values;

      // First try to restore archived values
      const restoredEntity = this.getRestoredEntityConfig(
        originalEntity,
        themeId,
      );
      if (restoredEntity.theme_values) {
        return restoredEntity;
      }

      // Fall back to theme_values_examples
      const example = this.getExampleByEntityIndex(index);
      if (example) {
        const populatedEntity = this.applyThemeValuesToEntity(
          restoredEntity,
          example,
        );
        return populatedEntity;
      }

      return originalEntity;
    });

    this.config = ConfigManager.setValue(
      this.config,
      'entities',
      restoredEntities,
    );

    return restoredEntities;
  }

  /**
   * Restores archived theme_values for an event config
   */
  restoreEventConfigThemeValues(
    configKey: EventConfigKey,
    themeId: string,
  ): DefaultEventConfig | undefined {
    const config = ConfigManager.getValue(this.config, configKey) || {};
    const example = this.getEventConfigDefaultValue(configKey, themeId);

    const restoredConfig: DefaultEventConfig = { ...config };
    delete restoredConfig.theme_values;
    delete restoredConfig.icon;

    // Restore theme values
    if (example?.theme_values) {
      restoredConfig.theme_values = { ...example.theme_values };
    }

    // Restore icon
    if (example?.icon) {
      restoredConfig.icon = example.icon;
    }

    // If no fields in restoredConfig (any), remove event config
    if (Object.keys(restoredConfig).length === 0) {
      this.config = ConfigManager.setValue(this.config, configKey, undefined);
      return;
    }

    this.config = ConfigManager.setValue(
      this.config,
      configKey,
      restoredConfig,
    );

    return restoredConfig;
  }

  /**
   * Restores archived theme_values for all entities and event configs
   */
  restoreAllThemeValues(themeId: string): CardConfig {
    // Restore entities
    this.restoreEntitiesThemeValues(themeId);

    // Restore event configs
    EVENT_CONFIG_KEYS.forEach((configKey) => {
      this.restoreEventConfigThemeValues(configKey, themeId);
    });

    return this.config;
  }

  /**
   * Applies theme configuration to the current config
   * Clears theme-related fields if not present, updates fields from theme config,
   * and restores theme_values from archived values for entities and event configs
   */
  applyThemeConfig(
    themeConfig: Partial<CardConfig>,
    themeId: string,
  ): CardConfig {
    // Clear theme-related fields if not present in theme
    const themeRelatedKeys = [
      'css',
      'theme_variables',
      'theme_values_examples',
    ];
    themeRelatedKeys.forEach((key) => {
      if (!(key in themeConfig)) {
        this.config = ConfigManager.setValue(this.config, key, undefined);
      }
    });

    // Update fields from theme config
    const excludedKeys = ['entities', 'entities_presets', ...EVENT_CONFIG_KEYS];
    Object.entries(themeConfig).forEach(([key, value]) => {
      if (excludedKeys.includes(key)) return;
      if (value === null || value === undefined) return;
      this.config = ConfigManager.setValue(this.config, key, value);
    });

    // Restore theme_values from archived values for all entities and event configs
    return this.restoreAllThemeValues(themeId);
  }

  /**
   * Compares two values for equality, handling type conversions
   * (e.g., string "0.3" equals number 0.3)
   */
  private valuesAreEqual(a: unknown, b: unknown): boolean {
    // Strict equality check first
    if (a === b) {
      return true;
    }

    // If either is undefined, they're not equal (unless both are, caught above)
    if (a === undefined || b === undefined) {
      return false;
    }

    // Convert both to strings and compare
    const aStr = String(a);
    const bStr = String(b);

    // String comparison
    if (aStr === bStr) {
      return true;
    }

    // Try numeric comparison if both can be parsed as numbers
    const aNum = parseFloat(aStr);
    const bNum = parseFloat(bStr);
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return aNum === bNum;
    }

    return false;
  }
}
