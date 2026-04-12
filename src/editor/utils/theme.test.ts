import { describe, expect, it } from 'vitest';
import type { CardConfig } from '../../types';
import {
  ThemeManager,
  getEffectiveCardCss,
  normalizeCssForCompare,
  type ThemeInfo,
} from './theme';

const mockThemes: ThemeInfo[] = [
  {
    id: 'pack',
    name: 'Pack',
    config: { css: '.foo { color: red; }' },
  },
];

describe('normalizeCssForCompare', () => {
  it('treats whitespace variants as equal', () => {
    expect(normalizeCssForCompare('.foo { color: red; }')).toEqual(
      normalizeCssForCompare('.foo{color:red}'),
    );
  });
});

describe('getEffectiveCardCss', () => {
  it('returns theme default when theme is set and css is absent', () => {
    const config = {
      type: 'custom:calendar-week-grid-card',
      theme: 'pack',
    } as CardConfig;
    expect(getEffectiveCardCss(config, mockThemes)).toBe(
      '.foo { color: red; }',
    );
  });

  it('returns override when css differs from theme default', () => {
    const config = {
      type: 'custom:calendar-week-grid-card',
      theme: 'pack',
      css: '.bar { color: blue; }',
    } as CardConfig;
    expect(getEffectiveCardCss(config, mockThemes)).toBe(
      '.bar { color: blue; }',
    );
  });

  it('returns theme default when css matches theme default (normalized)', () => {
    const config = {
      type: 'custom:calendar-week-grid-card',
      theme: 'pack',
      css: '.foo{color:red}',
    } as CardConfig;
    expect(getEffectiveCardCss(config, mockThemes)).toBe(
      '.foo { color: red; }',
    );
  });

  it('uses config.css when no theme', () => {
    const config = {
      type: 'custom:calendar-week-grid-card',
      css: 'x{}',
    } as CardConfig;
    expect(getEffectiveCardCss(config, mockThemes)).toBe('x{}');
  });
});

describe('ThemeManager.detectSelectedTheme', () => {
  it('uses config.theme when css is absent', () => {
    const config = {
      type: 'custom:calendar-week-grid-card',
      theme: 'pack',
    } as CardConfig;
    const m = new ThemeManager(config, mockThemes);
    expect(m.detectSelectedTheme()).toBe('pack');
  });

  it('uses config.theme when css matches theme default', () => {
    const config = {
      type: 'custom:calendar-week-grid-card',
      theme: 'pack',
      css: '.foo { color: red; }',
    } as CardConfig;
    const m = new ThemeManager(config, mockThemes);
    expect(m.detectSelectedTheme()).toBe('pack');
  });

  it('returns custom when css overrides theme default', () => {
    const config = {
      type: 'custom:calendar-week-grid-card',
      theme: 'pack',
      css: '.other {}',
    } as CardConfig;
    const m = new ThemeManager(config, mockThemes);
    expect(m.detectSelectedTheme()).toBe('custom');
  });
});
