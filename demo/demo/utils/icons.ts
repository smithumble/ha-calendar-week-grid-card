import { ASSET_MANIFEST } from 'virtual:asset-manifest';

// Cache for loaded icons
const iconCache: Record<string, string> = {};
const loadingPromises: Record<string, Promise<string>> = {};

// Find icon file path in manifest
function findIconPath(iconFile: string): string | null {
  // Look for exact match: assets/icons/icon-name.svg
  const exactPattern = `assets/icons/${iconFile}`;
  const exactMatch = ASSET_MANIFEST.find((path) => path.endsWith(exactPattern));
  if (exactMatch) {
    return exactMatch;
  }

  return null;
}

// Load a single icon by name on-demand via HTTP
export async function loadIcon(iconName: string): Promise<string> {
  // Return cached icon if available
  if (iconCache[iconName]) {
    return iconCache[iconName];
  }

  // Return existing loading promise if icon is being loaded
  const existingPromise = loadingPromises[iconName];
  if (existingPromise) {
    return existingPromise;
  }

  // Create loading promise
  const loadPromise = (async () => {
    try {
      // Convert icon name from "mdi/icon-name" to "icon-name.svg"
      const iconFile = iconName.replace('mdi/', '') + '.svg';
      const iconPath = findIconPath(iconFile);

      if (!iconPath) {
        throw new Error(`Icon ${iconName} not found in manifest`);
      }

      const response = await fetch(iconPath);

      if (!response.ok) {
        throw new Error(
          `Failed to load icon ${iconName}: ${response.statusText}`,
        );
      }

      const svgContent = await response.text();
      iconCache[iconName] = svgContent;
      return svgContent;
    } catch (error) {
      console.warn(`Failed to load icon ${iconName}:`, error);
      // Return empty string on error
      iconCache[iconName] = '';
      return '';
    } finally {
      // Remove loading promise after completion
      delete loadingPromises[iconName];
    }
  })();

  loadingPromises[iconName] = loadPromise;
  return loadPromise;
}

// Create a proxy that loads icons on-demand
function createIconMapProxy(): Record<string, string> {
  // Check if a property name looks like a valid icon name
  function isValidIconName(prop: string | symbol): prop is string {
    // Only handle string properties
    if (typeof prop !== 'string') {
      return false;
    }

    // Icon names follow the pattern "mdi/icon-name" or are already cached
    // Only intercept properties that match this pattern or are in cache
    return (
      prop.startsWith('mdi/') || prop in iconCache || prop in loadingPromises
    );
  }

  return new Proxy({} as Record<string, string>, {
    get(target, prop: string | symbol) {
      // Only handle properties that look like icon names
      if (!isValidIconName(prop)) {
        return undefined;
      }

      const iconName = prop;

      // Return cached icon if available
      if (iconCache[iconName]) {
        return iconCache[iconName];
      }

      // Load icon synchronously if already loaded, otherwise trigger async load
      // Note: This will return undefined initially, but the icon will be cached for next access
      loadIcon(iconName).catch(() => {
        // Error already logged in loadIcon
      });

      return iconCache[iconName] || '';
    },
    has(target, prop: string | symbol) {
      // Only check for properties that look like icon names
      if (!isValidIconName(prop)) {
        return false;
      }
      // Check if icon is cached or being loaded
      return prop in iconCache || prop in loadingPromises;
    },
    ownKeys() {
      // Return keys of cached icons
      return Object.keys(iconCache);
    },
    getOwnPropertyDescriptor(target, prop: string) {
      if (prop in iconCache) {
        return {
          enumerable: true,
          configurable: true,
          value: iconCache[prop],
        };
      }
      return undefined;
    },
  });
}

// Cache the icon map proxy
let iconMapCache: Record<string, string> | null = null;

export async function loadIcons(): Promise<Record<string, string>> {
  if (iconMapCache) {
    return iconMapCache;
  }

  iconMapCache = createIconMapProxy();
  return iconMapCache;
}
