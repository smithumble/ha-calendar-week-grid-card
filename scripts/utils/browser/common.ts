import { ThemeCSS } from '../theme';
import type { MockCalendarEvent } from '../events';

declare global {
  interface Window {
    MOCK_DATE_STR: string;
    CONFIG?: any;
    EVENTS: MockCalendarEvent[];
    THEME_CSS: ThemeCSS;
    ICON_MAP: Record<string, string>;
    Date: DateConstructor;
    setupBrowserEnv?: () => void;
    renderCards?: (config?: any) => void;
  }
}

interface MockCard extends HTMLElement {
  hass: unknown;
  setConfig: (config: any) => void;
}

function createMockHass(config: any, events: MockCalendarEvent[]) {
  return {
    language: config.language || 'en',
    config: { time_zone: 'Europe/Kiev' },
    callApi: async (_method: string, path: string) => {
      if (!path.startsWith('calendars/')) return [];

      const calendarId = decodeURIComponent(
        path.split('/')[1]?.split('?')[0] || '',
      );
      return events.filter((e) => e.entity_id === calendarId);
    },
  };
}

function injectTheme() {
  const style = document.createElement('style');
  style.textContent = `
    .theme-light {
      ${window.THEME_CSS.light}
    }
    .theme-dark {
      ${window.THEME_CSS.dark}
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
                  border-radius: var(--ha-card-border-radius, 4px);
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

function mockHaIcon() {
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
        render() {
          const icon = this.getAttribute('icon');
          const iconName = icon ? icon.replace('mdi:', 'mdi/') : '';

          if (!iconName) return;

          const svg = window.ICON_MAP?.[iconName];
          if (svg) {
            this.setIconContent(svg);
          } else {
            console.error(`Icon not found: ${iconName}`);
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

function overrideDate() {
  if (window.MOCK_DATE_STR) {
    const mockDateStr = window.MOCK_DATE_STR;
    const OriginalDate = Date;
    const mockTime = new OriginalDate(mockDateStr).getTime();

    class MockDate extends OriginalDate {
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
}

export function setupBrowserEnv() {
  mockHaCard();
  mockHaIcon();
  overrideDate();
  injectTheme();
}

export function renderCards(config?: any) {
  const cardConfig = config || window.CONFIG;
  const { EVENTS } = window;

  if (!cardConfig) {
    console.warn('No card config available');
    return;
  }

  ['card-container-light', 'card-container-dark'].forEach((containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Clear existing cards if config is provided (update mode)
    if (config) {
      container.innerHTML = '';
    }

    const card = document.createElement('calendar-week-grid-card') as MockCard;
    card.hass = createMockHass(cardConfig, EVENTS);
    card.setConfig(cardConfig);
    container.appendChild(card);
  });
}

// Expose functions on window for use in browser context
if (typeof window !== 'undefined') {
  window.setupBrowserEnv = setupBrowserEnv;
  window.renderCards = renderCards;
}
