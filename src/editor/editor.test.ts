/* @vitest-environment jsdom */
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { CardConfig, HomeAssistant } from '../types';
import type { CalendarWeekGridCardEditor } from './editor';

vi.mock('./styles.css', () => ({ default: '' }));
vi.mock('./themes', () => ({
  themes: [
    {
      id: 'basic',
      name: 'Basic',
      config: { css: '' },
    },
  ],
}));

class HaInputMock extends HTMLElement {
  private _value = '';

  get value() {
    return this._value;
  }

  set value(val: string) {
    this._value = val ?? '';
  }
}

let EditorClass: typeof CalendarWeekGridCardEditor;

beforeAll(async () => {
  if (!customElements.get('ha-input')) {
    customElements.define('ha-input', HaInputMock);
  }

  ({ CalendarWeekGridCardEditor: EditorClass } = await import('./editor'));

  if (!customElements.get('calendar-week-grid-card-editor')) {
    customElements.define('calendar-week-grid-card-editor', EditorClass);
  }
});

function createHass(): HomeAssistant {
  return {
    states: {},
    config: {},
    entities: {},
    devices: {},
    language: 'en',
    callApi: async () => [],
  } as HomeAssistant;
}

async function createEditor(
  config: Partial<CardConfig> = {},
): Promise<CalendarWeekGridCardEditor> {
  const editor = document.createElement(
    'calendar-week-grid-card-editor',
  ) as CalendarWeekGridCardEditor;
  editor.hass = createHass();
  editor.setConfig({
    type: 'custom:calendar-week-grid-card',
    entities: [],
    ...config,
  });
  document.body.appendChild(editor);
  await editor.updateComplete;
  return editor;
}

describe('CalendarWeekGridCardEditor ha-input', () => {
  it('renders ha-input controls instead of ha-textfield', async () => {
    const editor = await createEditor({ days: 5, language: 'en' });
    const root = editor.shadowRoot;
    expect(root).toBeTruthy();
    expect(root!.querySelectorAll('ha-textfield').length).toBe(0);
    expect(root!.querySelector('ha-input[name="days"]')).toBeTruthy();
    expect(root!.querySelector('ha-input[name="language"]')).toBeTruthy();
    editor.remove();
  });

  it('commits number and text values from ha-input change events', async () => {
    const editor = await createEditor({ days: 7, language: 'en' });
    const configs: CardConfig[] = [];
    editor.addEventListener('config-changed', ((event: CustomEvent) => {
      configs.push(event.detail.config);
    }) as EventListener);

    const daysInput = editor.shadowRoot!.querySelector(
      'ha-input[name="days"]',
    ) as HaInputMock;
    daysInput.value = '3';
    daysInput.dispatchEvent(new Event('change', { bubbles: true }));
    await editor.updateComplete;

    const languageInput = editor.shadowRoot!.querySelector(
      'ha-input[name="language"]',
    ) as HaInputMock;
    languageInput.value = 'uk';
    languageInput.dispatchEvent(new Event('change', { bubbles: true }));
    await editor.updateComplete;

    expect(configs.at(-1)?.days).toBe(3);
    expect(configs.at(-1)?.language).toBe('uk');
    editor.remove();
  });

  it('commits typed values after input debounce', async () => {
    vi.useFakeTimers();
    const editor = await createEditor({ filter: 'Outage' });
    const configs: CardConfig[] = [];
    editor.addEventListener('config-changed', ((event: CustomEvent) => {
      configs.push(event.detail.config);
    }) as EventListener);

    const filterInput = editor.shadowRoot!.querySelector(
      'ha-input[name="filter"]',
    ) as HaInputMock;
    filterInput.value = 'No Outages';
    filterInput.dispatchEvent(new Event('input', { bubbles: true }));

    expect(configs.some((config) => config.filter === 'No Outages')).toBe(
      false,
    );

    await vi.advanceTimersByTimeAsync(500);
    await editor.updateComplete;

    expect(configs.at(-1)?.filter).toBe('No Outages');
    editor.remove();
    vi.useRealTimers();
  });
});
