import type { CardConfig, HomeAssistant } from '../../../src/types';
import { Calendar } from './data';
import { mockHaCard, mockHaIcon } from './mocks/ha-card';
import { getSharedMockHass } from './mocks/ha-hass';

export interface MockCard extends HTMLElement {
  hass: HomeAssistant;
  setConfig: (config: CardConfig) => void;
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
      card.hass = getSharedMockHass(calendars, darkMode);
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
    card.style.gridRow = `span ${gridRows}`;
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
