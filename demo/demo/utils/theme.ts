import yaml from 'js-yaml';
import { ASSET_MANIFEST } from 'virtual:asset-manifest';

interface RawThemeNode {
  [key: string]: RawThemeNode | string | number;
}

export interface ThemeCSS {
  light: string;
  dark: string;
}

// Load YAML file at runtime via HTTP
async function loadYamlFile(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load ${url}: ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    console.error(`Failed to load YAML file ${url}:`, error);
    throw error;
  }
}

// Find theme file in manifest
function findThemeFile(themeName: string): string | null {
  const pattern = new RegExp(`assets/themes/${themeName}\\.(yaml|yml)$`);
  const matches = ASSET_MANIFEST.filter((path) => pattern.test(path));
  return matches.length > 0 ? matches[0] : null;
}

function processMode(modeData: RawThemeNode): string {
  return Object.entries(modeData)
    .filter(
      ([, value]) => typeof value === 'string' || typeof value === 'number',
    )
    .map(([key, value]) => `--${key}: ${value};`)
    .join('\n');
}

export async function loadTheme(): Promise<ThemeCSS> {
  try {
    // Find theme file in manifest
    const themePath = findThemeFile('gruvbox');
    if (!themePath) {
      throw new Error('Theme file not found in manifest');
    }

    const yamlContent = await loadYamlFile(themePath);
    const themes = yaml.load(yamlContent) as RawThemeNode;
    const themeName = 'Gruvbox';
    const themeData = themes[themeName] as RawThemeNode;
    const themeModes = themeData.modes as RawThemeNode;

    return {
      light: processMode(themeModes.light as RawThemeNode),
      dark: processMode(themeModes.dark as RawThemeNode),
    };
  } catch (e) {
    console.error('Error loading theme:', e);
    throw new Error('Failed to load theme');
  }
}
