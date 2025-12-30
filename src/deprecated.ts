type Style = Record<string, string>;

/**
 * Converts a style object to CSS string
 */
function styleObjectToCss(style?: Style): string {
  if (!style) return '';
  return Object.entries(style)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');
}

/**
 * Generates CSS from config style objects
 */
export function generateCssFromDeprecatedStyleConfig(
  config: any, // eslint-disable-line @typescript-eslint/no-explicit-any
): string {
  const cssRules: string[] = [];

  // Card-level styles
  if (config.style || config.raw_style) {
    cssRules.push('ha-card {');
    if (config.style) {
      cssRules.push(styleObjectToCss(config.style));
    }
    if (config.raw_style) {
      cssRules.push(config.raw_style);
    }
    cssRules.push('}');
  }

  // Grid styles
  if (config.grid?.style || config.grid?.raw_style) {
    cssRules.push('.grid-container {');
    if (config.grid.style) {
      cssRules.push(styleObjectToCss(config.grid.style));
    }
    if (config.grid.raw_style) {
      cssRules.push(config.grid.raw_style);
    }
    cssRules.push('}');
  }

  // Global cell styles
  if (config.cell?.style || config.cell?.raw_style) {
    cssRules.push('.cell {');
    if (config.cell.style) {
      cssRules.push(styleObjectToCss(config.cell.style));
    }
    if (config.cell.raw_style) {
      cssRules.push(config.cell.raw_style);
    }
    cssRules.push('}');
  }

  // Collect entities that have cell configurations (to exclude from cell_filled)
  const entitiesWithCellConfig = new Set<string>();
  const entities = config.entities || [];

  entities.forEach(
    (
      item: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    ) => {
      const entityConfig = typeof item === 'string' ? { entity: item } : item;
      if (entityConfig.entity && entityConfig.cell) {
        entitiesWithCellConfig.add(entityConfig.entity);
      }
    },
  );

  // Cell filled styles - only apply when event has no entity-specific style
  if (config.cell_filled) {
    if (config.cell_filled.style || config.cell_filled.raw_style) {
      cssRules.push('.cell.has-event {');
      if (config.cell_filled.style) {
        cssRules.push(styleObjectToCss(config.cell_filled.style));
      }
      if (config.cell_filled.raw_style) {
        cssRules.push(config.cell_filled.raw_style);
      }
      cssRules.push('}');
    }

    // Cell filled icon styles - exclude entities with cell config
    if (
      config.cell_filled.icon?.icon ||
      config.cell_filled.icon?.style ||
      config.cell_filled.icon?.raw_style
    ) {
      cssRules.push(`.cell.has-event .event-wrapper[data-entity] ha-icon {`);
      if (config.cell_filled.icon.icon) {
        cssRules.push(`  --icon: ${config.cell_filled.icon.icon};`);
      }
      if (config.cell_filled.icon.style) {
        cssRules.push(styleObjectToCss(config.cell_filled.icon.style));
      }
      if (config.cell_filled.icon.raw_style) {
        cssRules.push(config.cell_filled.icon.raw_style);
      }
      cssRules.push('}');
    }

    // Cell filled background styles - exclude entities with cell config
    if (
      config.cell_filled.background?.style ||
      config.cell_filled.background?.raw_style
    ) {
      cssRules.push(
        `.cell.has-event .event-wrapper[data-entity] .event-block {`,
      );
      if (config.cell_filled.background.style) {
        cssRules.push(styleObjectToCss(config.cell_filled.background.style));
      }
      if (config.cell_filled.background.raw_style) {
        cssRules.push(config.cell_filled.background.raw_style);
      }
      cssRules.push('}');
    }
  }

  // Cell blank styles
  if (config.cell_blank) {
    if (config.cell_blank.style || config.cell_blank.raw_style) {
      cssRules.push('.cell:not(.has-event) {');
      if (config.cell_blank.style) {
        cssRules.push(styleObjectToCss(config.cell_blank.style));
      }
      if (config.cell_blank.raw_style) {
        cssRules.push(config.cell_blank.raw_style);
      }
      cssRules.push('}');
    }

    // Cell blank icon styles
    if (
      config.cell_blank.icon?.icon ||
      config.cell_blank.icon?.style ||
      config.cell_blank.icon?.raw_style
    ) {
      cssRules.push('.cell .event-block-blank ha-icon {');
      if (config.cell_blank.icon.icon) {
        cssRules.push(`  --icon: ${config.cell_blank.icon.icon};`);
      }
      if (config.cell_blank.icon.style) {
        cssRules.push(styleObjectToCss(config.cell_blank.icon.style));
      }
      if (config.cell_blank.icon.raw_style) {
        cssRules.push(config.cell_blank.icon.raw_style);
      }
      cssRules.push('}');
    }

    // Cell blank background styles
    if (
      config.cell_blank.background?.style ||
      config.cell_blank.background?.raw_style
    ) {
      cssRules.push('.cell .event-block {');
      if (config.cell_blank.background.style) {
        cssRules.push(styleObjectToCss(config.cell_blank.background.style));
      }
      if (config.cell_blank.background.raw_style) {
        cssRules.push(config.cell_blank.background.raw_style);
      }
      cssRules.push('}');
    }
  }

  // Global cell icon styles (if not overridden by cell_filled/cell_blank)
  if (
    config.cell?.icon?.icon ||
    config.cell?.icon?.style ||
    config.cell?.icon?.raw_style
  ) {
    cssRules.push('.cell ha-icon {');
    if (config.cell.icon.icon) {
      cssRules.push(`  --icon: ${config.cell.icon.icon};`);
    }
    if (config.cell.icon.style) {
      cssRules.push(styleObjectToCss(config.cell.icon.style));
    }
    if (config.cell.icon.raw_style) {
      cssRules.push(config.cell.icon.raw_style);
    }
    cssRules.push('}');
  }

  // Global cell background styles (if not overridden by cell_filled/cell_blank)
  if (config.cell?.background?.style || config.cell?.background?.raw_style) {
    cssRules.push('.cell .event-block {');
    if (config.cell.background.style) {
      cssRules.push(styleObjectToCss(config.cell.background.style));
    }
    if (config.cell.background.raw_style) {
      cssRules.push(config.cell.background.raw_style);
    }
    cssRules.push('}');
  }

  // Entity-specific styles
  entities.forEach(
    (
      item: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    ) => {
      const entityConfig = typeof item === 'string' ? { entity: item } : item;

      if (!entityConfig.entity || !entityConfig.cell) return;

      const entitySelector = `[data-entity="${entityConfig.entity}"]`;

      // Entity cell styles
      if (entityConfig.cell.style || entityConfig.cell.raw_style) {
        cssRules.push(`.cell ${entitySelector} {`);
        if (entityConfig.cell.style) {
          cssRules.push(styleObjectToCss(entityConfig.cell.style));
        }
        if (entityConfig.cell.raw_style) {
          cssRules.push(entityConfig.cell.raw_style);
        }
        cssRules.push('}');
      }

      // Entity icon styles (in cell and in event-block)
      if (
        entityConfig.cell.icon?.icon ||
        entityConfig.cell.icon?.style ||
        entityConfig.cell.icon?.raw_style
      ) {
        // Icons with data-entity attribute (works for both cell and event-block contexts)
        // If filter is specified, add it to the selector
        // Increase specificity to override cell_filled styles by including .cell.has-event
        const filterSelector = entityConfig.filter
          ? `[data-filter="${entityConfig.filter}"]`
          : '';
        cssRules.push(
          `.cell.has-event ha-icon[data-entity="${entityConfig.entity}"]${filterSelector} {`,
        );
        if (entityConfig.cell.icon.icon) {
          cssRules.push(`  --icon: ${entityConfig.cell.icon.icon};`);
        }
        if (entityConfig.cell.icon.style) {
          cssRules.push(styleObjectToCss(entityConfig.cell.icon.style));
        }
        if (entityConfig.cell.icon.raw_style) {
          cssRules.push(entityConfig.cell.icon.raw_style);
        }
        cssRules.push('}');
      }

      // Entity background styles
      if (
        entityConfig.cell.background?.style ||
        entityConfig.cell.background?.raw_style
      ) {
        // Include filter in selector if specified
        const filterSelector = entityConfig.filter
          ? `[data-filter="${entityConfig.filter}"]`
          : '';
        cssRules.push(
          `.cell .event-wrapper${entitySelector}${filterSelector} .event-block {`,
        );
        if (entityConfig.cell.background.style) {
          cssRules.push(styleObjectToCss(entityConfig.cell.background.style));
        }
        if (entityConfig.cell.background.raw_style) {
          cssRules.push(entityConfig.cell.background.raw_style);
        }
        cssRules.push('}');
      }
    },
  );

  return cssRules.join('\n');
}
