import { ThemeCSS } from './theme';
import type { CardConfig } from '../../src/calendar-week-grid-card';
import type { MockCalendarEvent } from './events';

declare global {
  interface Window {
    MOCK_DATE_STR: string;
    CONFIG: CardConfig;
    EVENTS: MockCalendarEvent[];
    THEME_CSS: ThemeCSS;
    ICON_MAP: Record<string, string>;
    Date: DateConstructor;
    setupBrowserEnv: () => void;
    renderCards: () => void;
  }
}

export function getPageContent(): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          /* Root Variables */
          :root {
            --box-sizing: border-box;
          }

          /* Base Styles */
          body { 
            font-family: 'Roboto', sans-serif; 
            margin: 0;
            padding: 0;
            display: flex;
            width: 100vw;
            min-height: 100vh;
          }

          .theme-container {
            flex: 1;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 80px 175px 40px;
            box-sizing: border-box;
            background-color: var(--primary-background-color, rgb(40, 40, 40));
            color: var(--primary-text-color);
            position: relative;
            min-height: 100vh;
          }
          
          /* Label for the theme mode */
          .theme-label {
            position: absolute;
            top: 20px;
            left: 20px;
            font-size: 24px;
            opacity: 0.5;
            font-weight: bold;
          }

          #card-container-light, #card-container-dark {
            width: 100%;
            max-width: 800px;
          }
        </style>
      </head>
      <body>
        <div class="theme-container theme-light">
          <div class="theme-label">Light</div>
          <div id="card-container-light"></div>
        </div>
        <div class="theme-container theme-dark">
          <div class="theme-label">Dark</div>
          <div id="card-container-dark"></div>
        </div>
      </body>
    </html>
  `;
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
                  width: 100%;
                  height: 100%;
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

function setupBrowserEnv() {
  mockHaCard();
  mockHaIcon();
  overrideDate();
  injectTheme();
}

function createMockHass(config: CardConfig, events: MockCalendarEvent[]) {
  return {
    language: config.language || 'en',
    config: {
      time_zone: 'Europe/Kiev',
    },
    callApi: async (method: string, path: string) => {
      if (path.startsWith('calendars/')) {
        const parts = path.split('/');
        if (parts.length >= 2) {
          // Extract entity_id before any query params
          let calendarId = decodeURIComponent(parts[1]);
          if (calendarId.includes('?')) {
            calendarId = calendarId.split('?')[0];
          }

          // Return filtered events for the given entity_id
          const filtered = events.filter((e) => e.entity_id === calendarId);
          return filtered;
        }
      }
      return [];
    },
  };
}

interface MockCard extends HTMLElement {
  hass: unknown;
  setConfig: (config: CardConfig) => void;
}

function renderCards() {
  const config = window.CONFIG;
  const events = window.EVENTS;

  const createCard = (containerId: string) => {
    const card = document.createElement('calendar-week-grid-card') as MockCard;

    card.hass = createMockHass(config, events);
    card.setConfig(config);

    const container = document.getElementById(containerId);
    if (container) {
      container.appendChild(card);
    }
  };

  createCard('card-container-light');
  createCard('card-container-dark');
}

// Expose functions on window for use in browser context
if (typeof window !== 'undefined') {
  window.setupBrowserEnv = setupBrowserEnv;
  window.renderCards = renderCards;
}
