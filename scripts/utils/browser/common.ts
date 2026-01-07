import type { MockCalendar } from '../providers';
import { ThemeCSS } from '../theme';

declare global {
  interface Window {
    MOCK_DATE_STR: string;
    CONFIG?: any;
    CALENDARS: any[];
    THEME_CSS: ThemeCSS;
    ICON_MAP: Record<string, string>;
    Date: DateConstructor;
    setupBrowserEnv?: () => void;
    renderCards?: (config: any, calendars: MockCalendar[]) => void;
  }
}

interface MockCard extends HTMLElement {
  hass: unknown;
  setConfig: (config: any) => void;
}

function createMockHass(
  config: any,
  calendars: MockCalendar[],
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

function createCard(): MockCard {
  return document.createElement('calendar-week-grid-card') as MockCard;
}

function setupCard(
  card: MockCard,
  cardConfig: any,
  calendars: MockCalendar[],
  darkMode: boolean = false,
): void {
  Promise.resolve().then(() => {
    try {
      card.hass = createMockHass(cardConfig, calendars, darkMode);
      card.setConfig(cardConfig);
    } catch (error) {
      console.error('Error setting up card:', error);
    }
  });
}

function renderCardToContainer(
  containerId: string,
  cardConfig: any,
  calendars: MockCalendar[],
): void {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Determine theme based on container ID
  const isDarkMode = containerId.includes('dark');

  container.innerHTML = '';
  const card = createCard();
  container.appendChild(card);
  setupCard(card, cardConfig, calendars, isDarkMode);
}

export function renderCards(config: any, calendars: MockCalendar[]) {
  const containerIds = ['card-container-light', 'card-container-dark'];
  containerIds.forEach((containerId) => {
    renderCardToContainer(containerId, config, calendars);
  });
}

// Expose functions on window for use in browser context
if (typeof window !== 'undefined') {
  window.setupBrowserEnv = setupBrowserEnv;
  window.renderCards = renderCards;
}
