import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';

const THEMES_DIR = path.resolve(__dirname, '../../media/themes');

interface RawThemeNode {
  [key: string]: RawThemeNode | string | number;
}

export interface ThemeCSS {
  light: string;
  dark: string;
}

export function loadTheme(): ThemeCSS {
  try {
    const themePath = path.join(THEMES_DIR, 'catppuccin.yaml');
    if (!fs.existsSync(themePath)) throw new Error('Theme file not found');

    const content = fs.readFileSync(themePath, 'utf8');
    const themes = yaml.load(content) as RawThemeNode;
    const themeName = 'Catppuccin Auto Latte Mocha';
    const themeData = themes[themeName] as RawThemeNode;
    const themeModes = themeData.modes as RawThemeNode;

    const processMode = (modeData: RawThemeNode) => {
      return Object.entries(modeData)
        .filter(
          ([, value]) => typeof value === 'string' || typeof value === 'number',
        )
        .map(([key, value]) => `--${key}: ${value};`)
        .join('\n');
    };

    return {
      light: processMode(themeModes.light as RawThemeNode),
      dark: processMode(themeModes.dark as RawThemeNode),
    };
  } catch (e) {
    console.error('Error loading theme:', e);
    throw new Error('Failed to load theme');
  }
}
