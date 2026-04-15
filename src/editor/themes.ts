/**
 * Theme registry for the editor
 */
import basicYamlConfig from '../configs/basic.yaml';
import classicYamlConfig from '../configs/classic.yaml';
import googleCalendarYamlConfig from '../configs/google_calendar.yaml';
import neonYamlConfig from '../configs/neon.yaml';
import simpleYamlConfig from '../configs/simple.yaml';
import simpleColoredYamlConfig from '../configs/simple_colored.yaml';
import softUiYamlConfig from '../configs/soft_ui.yaml';
import yasnoLegacyYamlConfig from '../configs/yasno_legacy.yaml';
import type { ThemeInfo } from './utils/theme';

export const themes: ThemeInfo[] = [
  {
    id: 'basic',
    name: 'Basic',
    config: basicYamlConfig,
  },
  {
    id: 'simple',
    name: 'Simple',
    config: simpleYamlConfig,
  },
  {
    id: 'simple_colored',
    name: 'Simple Colored',
    config: simpleColoredYamlConfig,
  },
  {
    id: 'classic',
    name: 'Classic',
    config: classicYamlConfig,
  },
  {
    id: 'neon',
    name: 'Neon',
    config: neonYamlConfig,
  },
  {
    id: 'soft_ui',
    name: 'Soft UI',
    config: softUiYamlConfig,
  },
  {
    id: 'yasno_legacy',
    name: 'Yasno Legacy',
    config: yasnoLegacyYamlConfig,
  },
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    config: googleCalendarYamlConfig,
  },
];
