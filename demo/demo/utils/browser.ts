import type { CardConfig } from '../../../src/types';
import { Calendar } from './data';
import { loadIcon } from './icons';

export interface MockCard extends HTMLElement {
  hass: unknown;
  setConfig: (config: CardConfig) => void;
}

function createMockHass(
  config: CardConfig,
  calendars: Calendar[],
  darkMode: boolean = false,
) {
  return {
    language: config.language || 'en',
    config: { time_zone: 'Europe/Kiev' },
    themes: {
      darkMode: darkMode,
    },
    callApi: async (_method: string, path: string) => {
      if (!path.startsWith('calendars/')) return [];

      const calendarId = decodeURIComponent(
        path.split('/')[1]?.split('?')[0] || '',
      );
      const calendar = calendars.find((c) => c.entity_id === calendarId);
      return calendar ? calendar.events : [];
    },
  };
}

function injectTheme(haTheme: { light: string; dark: string }) {
  const style = document.createElement('style');
  style.textContent = `
    .theme-light {
      ${haTheme.light}
    }
    .theme-dark {
      ${haTheme.dark}
    }
  `;
  document.head.appendChild(style);
}

function mockHaCard() {
  if (!customElements.get('ha-card')) {
    customElements.define(
      'ha-card',
      class extends HTMLElement {
        constructor() {
          super();
          this.attachShadow({ mode: 'open' });
        }
        connectedCallback() {
          if (this.shadowRoot) {
            this.shadowRoot.innerHTML = `
              <style>
                :host {
                  display: block;
                  background: var(--ha-card-background, var(--card-background-color, #fff));
                  box-shadow: var(--ha-card-box-shadow, none);
                  border-radius: var(--ha-card-border-radius, 12px);
                  color: var(--primary-text-color);
                  transition: all 0.3s ease-out;
                  position: relative;
                }
              </style>
              <slot></slot>
            `;
          }
        }
      },
    );
  }
}

function mockHaIcon(iconMap: Record<string, string>) {
  if (!customElements.get('ha-icon')) {
    customElements.define(
      'ha-icon',
      class extends HTMLElement {
        static get observedAttributes() {
          return ['icon'];
        }
        constructor() {
          super();
          this.attachShadow({ mode: 'open' });
        }
        connectedCallback() {
          this.render();
        }
        attributeChangedCallback() {
          this.render();
        }
        async render() {
          const icon = this.getAttribute('icon');
          const iconName = icon ? icon.replace('mdi:', 'mdi/') : '';

          if (!iconName) return;

          // Try to get icon from map (might be cached via proxy)
          let svg = iconMap?.[iconName];

          // If icon is not available (empty string or undefined), load it on-demand
          if (!svg || svg === '') {
            svg = await loadIcon(iconName);
            if (!svg) {
              return;
            }
          }

          if (svg) {
            this.setIconContent(svg);
          }
        }
        setIconContent(svg: string) {
          if (this.shadowRoot) {
            this.shadowRoot.innerHTML = `
              <style>
                :host {
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                  position: relative;
                  vertical-align: middle;
                  fill: currentcolor;
                  width: var(--mdc-icon-size, 24px);
                  height: var(--mdc-icon-size, 24px);
                }
                svg {
                  width: 100%;
                  height: 100%;
                  fill: currentColor;
                }
              </style>
              ${svg}
            `;
          }
        }
      },
    );
  }
}

const originalDateConstructor: DateConstructor = Date;

function overrideDate(mockDate: Date) {
  const mockTime = mockDate.getTime();

  class MockDate extends Date {
    constructor(...args: unknown[]) {
      if (args.length === 0) {
        super(mockTime);
      } else {
        super(...(args as [number]));
      }
    }
    static now() {
      return mockTime;
    }
  }
  window.Date = MockDate as DateConstructor;
}

function restoreDate() {
  if (originalDateConstructor) {
    window.Date = originalDateConstructor;
  }
}

export function updateDateOverride(mockDate?: Date) {
  if (mockDate) {
    overrideDate(mockDate);
  } else {
    restoreDate();
  }
}

export function setupBrowserEnv(
  haTheme: { light: string; dark: string },
  haIcons: Record<string, string>,
) {
  mockHaCard();
  mockHaIcon(haIcons);
  injectTheme(haTheme);
}

function createCard(): MockCard {
  return document.createElement('calendar-week-grid-card') as MockCard;
}

function setupCard(
  card: MockCard,
  config: CardConfig,
  calendars: Calendar[],
  darkMode: boolean = false,
): void {
  Promise.resolve().then(() => {
    try {
      card.hass = createMockHass(config, calendars, darkMode);
      card.setConfig(config);
    } catch (error) {
      console.error('Error setting up card:', error);
    }
  });
}

export function renderCardToContainer(
  containerId: string,
  config: CardConfig,
  calendars: Calendar[],
): void {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Determine theme based on container ID
  const isDarkMode = containerId.includes('dark');

  // Set dynamic grid rows and min-height based on card config
  const gridOptionsRows = config?.grid_options?.rows;
  const layoutOptionsRows = config?.layout_options?.grid_rows;
  const gridRows =
    gridOptionsRows !== undefined && gridOptionsRows !== 'auto'
      ? typeof gridOptionsRows === 'number'
        ? gridOptionsRows
        : undefined
      : layoutOptionsRows;

  if (gridRows) {
    const rowHeight = 60;
    container.style.setProperty(
      'grid-template-rows',
      `repeat(${gridRows}, ${rowHeight}px)`,
    );
  } else {
    container.style.removeProperty('grid-template-rows');
  }

  container.innerHTML = '';
  const card = createCard();

  if (gridRows) {
    (card as HTMLElement).style.gridRow = `span ${gridRows}`;
  }

  container.appendChild(card);
  setupCard(card, config, calendars, isDarkMode);
}

export function renderCards(config: CardConfig, calendars: Calendar[]) {
  const containerIds = ['card-container-light', 'card-container-dark'];
  containerIds.forEach((containerId) => {
    renderCardToContainer(containerId, config, calendars);
  });
}
