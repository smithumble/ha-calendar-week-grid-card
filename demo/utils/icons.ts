// Cache for loaded icons
const iconCache: Record<string, string> = {};
const loadingPromises: Record<string, Promise<string>> = {};

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
      const response = await fetch(`./assets/icons/${iconFile}`);

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
  return new Proxy({} as Record<string, string>, {
    get(target, prop: string) {
      const iconName = prop as string;

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
    has(target, prop: string) {
      // Check if icon is cached or being loaded
      return prop in iconCache || prop in loadingPromises;
    },
    ownKeys(target) {
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

// Export function to preload a specific icon (useful for known icons)
export async function preloadIcon(iconName: string): Promise<void> {
  await loadIcon(iconName);
}
