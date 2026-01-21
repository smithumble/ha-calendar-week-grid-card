/**
 * Theme management utilities for the editor
 */
import type { CardConfig, EntityConfig, ThemeVariable } from '../../types';
import { ConfigManager } from './config';

export interface ThemeInfo {
  id: string;
  name: string;
  config: Partial<CardConfig>;
}

export class ThemeManager {
  private config: CardConfig;
  private selectedTheme: string;
  private themes: ThemeInfo[];

  constructor(
    config: CardConfig,
    themes: ThemeInfo[],
    selectedTheme: string = 'custom',
  ) {
    this.config = config;
    this.themes = themes;
    this.selectedTheme = selectedTheme;
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
   * Archives current theme_values for all entities
   * Only archives values that differ from the theme's example values
   */
  archiveEntityThemeValues(
    entities: Array<string | EntityConfig>,
    themeId: string,
  ): Array<string | EntityConfig> {
    return entities.map((entity, index) => {
      if (typeof entity === 'string') {
        return entity;
      }

      const entityObj = entity as EntityConfig;
      if (
        entityObj.theme_values &&
        Object.keys(entityObj.theme_values).length > 0
      ) {
        // Get example values for this entity index
        const example = this.getExampleByEntityIndex(index);

        // Only archive values that differ from examples
        const valuesToArchive: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(entityObj.theme_values)) {
          const exampleValue = example?.[key];
          // Archive if value differs from example (using type-aware comparison)
          if (!this.valuesAreEqual(value, exampleValue)) {
            valuesToArchive[key] = value;
          }
        }

        // Only update entity if there are values to archive
        if (Object.keys(valuesToArchive).length > 0) {
          const result = { ...entityObj };
          if (!result.theme_values_archive) {
            result.theme_values_archive = {};
          }
          result.theme_values_archive[themeId] = valuesToArchive;
          return result;
        }
      }

      return entity;
    });
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

  /**
   * Removes theme_values from all entities
   */
  static removeObsoleteThemeVariables(
    entities: Array<string | EntityConfig>,
  ): Array<string | EntityConfig> {
    return entities.map((entity) => {
      if (typeof entity === 'string') {
        return entity;
      }

      const entityObj = entity as EntityConfig;
      const cleanedEntity: EntityConfig = { ...entityObj };
      delete cleanedEntity.theme_values;

      return cleanedEntity;
    });
  }

  /**
   * Apply theme_values_examples to entities
   */
  applyThemeValuesExamplesToEntities(
    entities: Array<string | EntityConfig>,
    themeId?: string,
  ): Array<string | EntityConfig> {
    if (entities.length === 0) {
      return entities;
    }

    return entities.map((entity, index) => {
      // First check if there's an archived value for this theme
      if (
        themeId &&
        typeof entity === 'object' &&
        entity.theme_values_archive
      ) {
        const archivedValues = entity.theme_values_archive[themeId];
        if (archivedValues) {
          const result = { ...entity };
          result.theme_values = archivedValues;
          return result;
        }
      }

      // Fall back to theme_values_examples
      const example = this.getExampleByEntityIndex(index);
      if (!example) {
        return entity;
      }
      return this.applyThemeValuesToEntity(entity, example);
    });
  }
}
