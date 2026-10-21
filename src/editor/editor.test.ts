/* @vitest-environment jsdom */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
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

interface SchemaItem {
  name: string;
  required?: boolean;
  selector: Record<string, unknown>;
}

/** Stand-in for HA's ha-form: keeps data/schema, lets tests fire changes */
class HaFormMock extends HTMLElement {
  data: Record<string, unknown> = {};
  schema: SchemaItem[] = [];

  change(name: string, value: unknown) {
    this.dispatchEvent(
      new CustomEvent('value-changed', {
        detail: { value: { ...this.data, [name]: value } },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

class HaExpansionPanelMock extends HTMLElement {
  expanded = false;
}

let EditorClass: typeof CalendarWeekGridCardEditor;

beforeAll(async () => {
  if (!customElements.get('ha-form')) {
    customElements.define('ha-form', HaFormMock);
  }
  if (!customElements.get('ha-expansion-panel')) {
    customElements.define('ha-expansion-panel', HaExpansionPanelMock);
  }

  ({ CalendarWeekGridCardEditor: EditorClass } = await import('./editor'));

  if (!customElements.get('calendar-week-grid-card-editor')) {
    customElements.define('calendar-week-grid-card-editor', EditorClass);
  }
});

afterEach(() => {
  document.body.innerHTML = '';
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

interface EditorHarness {
  editor: CalendarWeekGridCardEditor;
  configs: CardConfig[];
  last: () => CardConfig | undefined;
}

async function createEditor(
  config: Partial<CardConfig> = {},
): Promise<EditorHarness> {
  const editor = document.createElement(
    'calendar-week-grid-card-editor',
  ) as CalendarWeekGridCardEditor;
  editor.hass = createHass();
  editor.setConfig({
    type: 'custom:calendar-week-grid-card',
    entities: [],
    ...config,
  });
  const configs: CardConfig[] = [];
  editor.addEventListener('config-changed', ((event: CustomEvent) => {
    configs.push(event.detail.config);
    // Mirror HA: the dashboard hands the new config back to the editor
    editor.setConfig(event.detail.config);
  }) as EventListener);
  document.body.appendChild(editor);
  await editor.updateComplete;
  return { editor, configs, last: () => configs.at(-1) };
}

function panels(editor: CalendarWeekGridCardEditor): HaExpansionPanelMock[] {
  return Array.from(
    editor.shadowRoot!.querySelectorAll('ha-expansion-panel'),
  ) as HaExpansionPanelMock[];
}

/** Opens every panel (lazy panels render their content on first open) */
async function expandAll(editor: CalendarWeekGridCardEditor) {
  for (let pass = 0; pass < 4; pass++) {
    let opened = false;
    for (const panel of panels(editor)) {
      if (panel.expanded) continue;
      opened = true;
      panel.expanded = true;
      panel.dispatchEvent(
        new CustomEvent('expanded-changed', {
          detail: { expanded: true },
          bubbles: true,
          composed: true,
        }),
      );
    }
    await editor.updateComplete;
    if (!opened) break;
  }
}

function findForm(
  editor: CalendarWeekGridCardEditor,
  field: string,
  nth = 0,
): HaFormMock {
  const forms = Array.from(
    editor.shadowRoot!.querySelectorAll('ha-form'),
  ) as HaFormMock[];
  const matches = forms.filter((form) =>
    form.schema.some((item) => item.name === field),
  );
  if (!matches[nth]) throw new Error(`No ha-form with field "${field}"`);
  return matches[nth];
}

describe('CalendarWeekGridCardEditor (ha-form selectors)', () => {
  it('renders fields through ha-form instead of raw inputs', async () => {
    const { editor } = await createEditor({ days: 5, language: 'en' });
    await expandAll(editor);
    const root = editor.shadowRoot!;
    expect(root.querySelectorAll('ha-input').length).toBe(0);
    expect(root.querySelectorAll('ha-select').length).toBe(0);
    expect(root.querySelectorAll('ha-textfield').length).toBe(0);
    expect(findForm(editor, 'days').data.days).toBe(5);
    expect(findForm(editor, 'language').data.language).toBe('en');
  });

  it('keeps lazy panel content unrendered until opened', async () => {
    const { editor } = await createEditor();
    expect(() => findForm(editor, 'days')).toThrow();
    await expandAll(editor);
    expect(findForm(editor, 'days')).toBeTruthy();
  });

  it('commits number and text values', async () => {
    const { editor, last } = await createEditor({ days: 7, language: 'en' });
    await expandAll(editor);

    findForm(editor, 'days').change('days', 3);
    await editor.updateComplete;
    findForm(editor, 'language').change('language', 'uk');
    await editor.updateComplete;

    expect(last()?.days).toBe(3);
    expect(last()?.language).toBe('uk');
  });

  it('removes a key when a field is cleared (undefined, empty or "null")', async () => {
    const { editor, last } = await createEditor({
      filter: 'Outage',
      all_day: 'row',
      language: 'en',
    });
    await expandAll(editor);

    findForm(editor, 'filter').change('filter', '');
    await editor.updateComplete;
    expect(last()).not.toHaveProperty('filter');

    findForm(editor, 'all_day').change('all_day', undefined);
    await editor.updateComplete;
    expect(last()).not.toHaveProperty('all_day');

    findForm(editor, 'language').change('language', 'null');
    await editor.updateComplete;
    expect(last()).not.toHaveProperty('language');
  });

  it('shows defaults without writing them back', async () => {
    const { editor, last } = await createEditor();
    await expandAll(editor);

    const form = findForm(editor, 'week_start');
    expect(form.data.orientation).toBe('vertical');
    expect(form.data.days).toBe(7);

    form.change('week_start', 'monday');
    await editor.updateComplete;

    expect(last()?.week_start).toBe('monday');
    expect(last()).not.toHaveProperty('orientation');
    expect(last()).not.toHaveProperty('days');
  });

  it('builds and removes date format objects', async () => {
    const { editor, last } = await createEditor();
    await expandAll(editor);

    findForm(editor, 'weekday', 0).change('weekday', 'short');
    await editor.updateComplete;
    expect(last()?.primary_date_format).toEqual({ weekday: 'short' });

    findForm(editor, 'weekday', 0).change('weekday', undefined);
    await editor.updateComplete;
    expect(last()).not.toHaveProperty('primary_date_format');
  });

  it('maps hour12 between select strings and booleans', async () => {
    const { editor, last } = await createEditor({
      time_format: { hour: 'numeric', hour12: true },
    });
    await expandAll(editor);

    const form = findForm(editor, 'hour12');
    expect(form.data.hour12).toBe('true');

    form.change('hour12', 'false');
    await editor.updateComplete;
    expect(last()?.time_format).toEqual({ hour: 'numeric', hour12: false });
  });

  it('prunes empty parent objects', async () => {
    const { editor, last } = await createEditor({
      event: { icon: 'mdi:star' },
    });
    await expandAll(editor);

    findForm(editor, 'icon', 0).change('icon', '');
    await editor.updateComplete;
    expect(last()).not.toHaveProperty('event');
  });

  it('adds, edits and reorders calendar entities', async () => {
    const { editor, last } = await createEditor({
      entities: ['calendar.a', { entity: 'calendar.b', name: 'B' }],
    });

    const buttons = Array.from(
      editor.shadowRoot!.querySelectorAll('button[title="Move down"]'),
    ) as HTMLButtonElement[];
    buttons[0].click();
    await editor.updateComplete;
    expect(last()?.entities).toEqual([
      { entity: 'calendar.b', name: 'B' },
      'calendar.a',
    ]);

    await expandAll(editor);
    findForm(editor, 'name', 0).change('name', 'Renamed');
    await editor.updateComplete;
    expect(last()?.entities?.[0]).toEqual({
      entity: 'calendar.b',
      name: 'Renamed',
    });
  });

  it('switches criteria between simple and detailed', async () => {
    const { editor, last } = await createEditor({
      entities: [{ entity: 'calendar.a', hide: ['Planned'] }],
    });
    await expandAll(editor);

    findForm(editor, '__type').change('__type', 'object');
    await editor.updateComplete;
    expect((last()?.entities?.[0] as { hide: unknown[] }).hide).toEqual([
      { name: 'Planned' },
    ]);

    await expandAll(editor);
    findForm(editor, 'filter', 1).change('filter', 'Outage');
    await editor.updateComplete;
    expect((last()?.entities?.[0] as { hide: unknown[] }).hide).toEqual([
      { name: 'Planned', filter: 'Outage' },
    ]);
  });
});
