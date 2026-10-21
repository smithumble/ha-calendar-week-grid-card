/**
 * Visual editor for Calendar Week Grid Card
 *
 * Built the way Bubble Card builds its editor:
 * - every field is a native Home Assistant `ha-form` selector (text, number,
 *   boolean, select, icon, entity), so the editor follows HA frontend
 *   upgrades instead of depending on the internals of individual components;
 * - sections are outlined `ha-expansion-panel`s with an icon header, whose
 *   open state is remembered across re-renders and whose heavy content is
 *   only rendered once the panel has been opened (lazy panels);
 * - values the form only displayed as defaults are never written back, and
 *   cleared fields are removed from the config instead of being stored empty;
 * - `hass` updates are throttled so state changes elsewhere in HA don't
 *   re-render the editor on every tick;
 * - info/warning boxes and pill buttons are plain styled elements.
 */

import { LitElement, TemplateResult, html, nothing, unsafeCSS } from 'lit';
import { state } from 'lit/decorators.js';
import type {
  HomeAssistant,
  CardConfig,
  EntityConfig,
  EntitiesPreset,
  ThemeVariable,
  EventCriteria,
  ThemeValues,
} from '../types';
import styles from './styles.css';
import { themes } from './themes';
import { ConfigManager } from './utils/config';
import type { FieldHandlerContext } from './utils/field';
import {
  handleTimeFormatTypeChange,
  handleCriteriaTypeChange,
} from './utils/field';
import {
  type FormData,
  type FormSchemaItem,
  type SelectOption,
  applyChanges,
  booleanField,
  computeHelper,
  computeLabel,
  entityField,
  iconField,
  isEmptyValue,
  isPlainObject,
  numberField,
  resolveFormChanges,
  selectField,
  textField,
} from './utils/form';
import {
  ThemeManager,
  getEffectiveCardCss,
  normalizeCssForCompare,
} from './utils/theme';

//-----------------------------------------------------------------------------
// STATIC OPTION LISTS
//-----------------------------------------------------------------------------

const ORIENTATION_OPTIONS: SelectOption[] = [
  { value: 'vertical', label: 'Vertical' },
  { value: 'horizontal', label: 'Horizontal' },
];

const WEEK_START_OPTIONS: SelectOption[] = [
  { value: 'today', label: 'Today' },
  { value: 'sunday', label: 'Sunday' },
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
];

const ALL_DAY_OPTIONS: SelectOption[] = [
  { value: 'grid', label: 'Grid' },
  { value: 'row', label: 'Row' },
  { value: 'both', label: 'Both' },
];

const ICONS_CONTAINER_OPTIONS: SelectOption[] = [
  { value: 'event', label: 'Event' },
  { value: 'cell', label: 'Cell' },
];

const ICONS_MODE_OPTIONS: SelectOption[] = [
  { value: 'top', label: 'Top' },
  { value: 'all', label: 'All' },
];

const DATE_FORMAT_SCHEMA: FormSchemaItem[] = [
  selectField('weekday', 'Weekday', [
    { value: 'narrow', label: 'Narrow (M, T, W)' },
    { value: 'short', label: 'Short (Mon, Tue, Wed)' },
    { value: 'long', label: 'Long (Monday, Tuesday)' },
  ]),
  selectField('day', 'Day', [
    { value: 'numeric', label: 'Numeric (15)' },
    { value: '2-digit', label: '2-digit (05)' },
  ]),
  selectField('month', 'Month', [
    { value: 'numeric', label: 'Numeric (3)' },
    { value: '2-digit', label: '2-digit (03)' },
    { value: 'narrow', label: 'Narrow (M)' },
    { value: 'short', label: 'Short (Mar)' },
    { value: 'long', label: 'Long (March)' },
  ]),
  selectField('year', 'Year', [
    { value: 'numeric', label: 'Numeric (2024)' },
    { value: '2-digit', label: '2-digit (24)' },
  ]),
];

const TIME_FORMAT_OBJECT_SCHEMA: FormSchemaItem[] = [
  selectField('hour', 'Hour', [
    { value: 'numeric', label: 'Numeric (9)' },
    { value: '2-digit', label: '2-digit (09)' },
  ]),
  selectField('minute', 'Minute', [
    { value: 'numeric', label: 'Numeric (5)' },
    { value: '2-digit', label: '2-digit (05)' },
  ]),
  selectField('second', 'Second', [
    { value: 'numeric', label: 'Numeric (30)' },
    { value: '2-digit', label: '2-digit (30)' },
  ]),
  selectField('hour12', '12/24 Hour Format', [
    { value: 'true', label: '12-hour (AM/PM)' },
    { value: 'false', label: '24-hour' },
  ]),
];

const TIME_FORMAT_TYPE_SCHEMA: FormSchemaItem[] = [
  selectField(
    'time_format_type',
    'Format Type',
    [
      { value: 'string', label: 'String Pattern (Legacy)' },
      { value: 'object', label: 'Structured Options (Recommended)' },
    ],
    { required: true },
  ),
];

const CRITERIA_TYPE_SCHEMA: FormSchemaItem[] = [
  selectField(
    '__type',
    'Type',
    [
      { value: 'string', label: 'Simple (Name)' },
      { value: 'object', label: 'Detailed (Criteria)' },
    ],
    { required: true },
  ),
];

const CRITERIA_NAME_SCHEMA: FormSchemaItem[] = [
  textField('name', 'Event Name', 'Match events by entity name'),
];

const CRITERIA_OBJECT_SCHEMA: FormSchemaItem[] = [
  textField('name', 'Name'),
  entityField('entity', 'Entity', { domain: 'calendar' }),
  textField(
    'filter',
    'Filter',
    'Match events by any combination of criteria (all must match)',
  ),
];

const ENTITY_SETTINGS_SCHEMA: FormSchemaItem[] = [
  textField('name', 'Name', 'Name for this calendar entity'),
  textField('filter', 'Filter', 'Filter events by text in summary'),
  iconField('icon', 'Icon', 'Icon for events from this entity'),
];

type EventConfigPath = 'event' | 'blank_event' | 'blank_all_day_event';

interface FormOptions {
  /** Values displayed when the config does not set them (never written back). */
  defaults?: FormData;
  /** Data for UI-only forms that don't map onto a config object. */
  data?: FormData;
  /** Custom change handler; default writes the changes to `path`. */
  onChange?: (changes: FormData) => void;
}

interface PanelOptions {
  expanded?: boolean;
  /** Render content only once the panel has been opened. */
  lazy?: boolean;
  /** Custom header (must carry slot="header"). */
  header?: TemplateResult;
  className?: string;
}

/**
 * Calendar Week Grid Card Editor component
 */
export class CalendarWeekGridCardEditor extends LitElement {
  //-----------------------------------------------------------------------------
  // PROPERTIES
  //-----------------------------------------------------------------------------

  static get styles() {
    return unsafeCSS(styles);
  }

  @state() private _config?: CardConfig;
  @state() private _timeFormatType: 'string' | 'object' = 'object';
  @state() private _selectedTheme: string = 'custom';
  @state() private _showPresetForm: boolean = false;
  @state() private _selectedPresetName: string = '';
  @state() private _presetCalendarValues: Record<string, string> = {};
  @state() private _expandedPanels: Record<string, boolean> = {};

  /** Panels opened at least once (their lazy content stays rendered). */
  private _loadedPanels = new Set<string>();

  //-----------------------------------------------------------------------------
  // HASS (THROTTLED)
  //-----------------------------------------------------------------------------

  private _hass?: HomeAssistant;
  private _renderHass?: HomeAssistant;
  private _hassThrottleTimer?: ReturnType<typeof setTimeout>;

  /**
   * The first assignment renders immediately; later ones (every state change
   * in HA) are throttled, the editor only needs fresh entity names.
   */
  set hass(value: HomeAssistant | undefined) {
    this._hass = value;
    if (!value) {
      this._renderHass = undefined;
      this.requestUpdate();
      return;
    }
    if (!this._renderHass) {
      this._renderHass = value;
      this.requestUpdate();
      return;
    }
    if (this._hassThrottleTimer) return;
    this._hassThrottleTimer = setTimeout(() => {
      this._hassThrottleTimer = undefined;
      if (this._renderHass !== this._hass) {
        this._renderHass = this._hass;
        this.requestUpdate();
      }
    }, 1000);
  }

  get hass(): HomeAssistant | undefined {
    return this._renderHass ?? this._hass;
  }

  //-----------------------------------------------------------------------------
  // LIFECYCLE METHODS
  //-----------------------------------------------------------------------------

  connectedCallback(): void {
    super.connectedCallback();
    this._loadHaComponents();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._hassThrottleTimer) {
      clearTimeout(this._hassThrottleTimer);
      this._hassThrottleTimer = undefined;
    }
  }

  /**
   * `ha-form` and the pickers are lazy-loaded by HA. Asking a built-in card
   * for its editor makes HA load them when they aren't defined yet.
   */
  private _loadHaComponents(): void {
    const loadEditorOf = (cardTag: string) => {
      try {
        (
          customElements.get(cardTag) as unknown as
            | { getConfigElement?: () => unknown }
            | undefined
        )?.getConfigElement?.();
      } catch {
        // Not available in this HA version
      }
    };
    if (!customElements.get('ha-form')) loadEditorOf('hui-tile-card');
    if (!customElements.get('ha-entity-picker')) {
      loadEditorOf('hui-entities-card');
    }
  }

  //-----------------------------------------------------------------------------
  // CONFIG MANAGEMENT
  //-----------------------------------------------------------------------------

  setConfig(config: Partial<CardConfig>): void {
    this._config = {
      type: 'custom:calendar-week-grid-card',
      ...config,
    };
    if (!this._config.entities) {
      this._config.entities = [];
    }

    const timeFormat = this._config.time_format;
    this._timeFormatType =
      typeof timeFormat === 'string' || timeFormat === undefined
        ? 'string'
        : 'object';

    this._detectSelectedTheme();
    this._migrateLegacyThemeCssToThemeField();
  }

  getConfigValue(path: string, defaultValue?: unknown): unknown {
    if (!this._config) {
      return defaultValue;
    }
    return ConfigManager.getValue(this._config, path, defaultValue);
  }

  setConfigValue(path: string, value: unknown): void {
    if (!this._config) {
      return;
    }
    this._config = ConfigManager.setValue(this._config, path, value);
    this._fireConfigChanged();
  }

  private _fieldContext(): FieldHandlerContext {
    return {
      getConfigValue: this.getConfigValue.bind(this),
      setConfigValue: this.setConfigValue.bind(this),
    };
  }

  /** Object stored at `path` ('' = the config itself), or {} */
  private _getObject(path: string): FormData {
    const value = path ? this.getConfigValue(path) : this._config;
    return isPlainObject(value) ? value : {};
  }

  /**
   * Writes `changes` into the object at `path`. An object that ends up empty
   * is removed, and so are the empty parents it leaves behind (e.g. clearing
   * the last theme value of `event` removes `event` entirely).
   */
  private _applyObjectChanges(path: string, changes: FormData): void {
    if (!this._config) return;
    const updated = applyChanges(this._getObject(path), changes);

    if (!path) {
      this._config = {
        ...(updated as unknown as CardConfig),
        type: this._config.type,
      };
      this._fireConfigChanged();
      return;
    }

    const parts = path.split('.');
    const isArrayItem = /^\d+$/.test(parts[parts.length - 1]);
    let config = ConfigManager.setValue(
      this._config,
      path,
      !isArrayItem && isEmptyValue(updated) ? undefined : updated,
    );

    parts.pop();
    while (parts.length > 0) {
      const last = parts[parts.length - 1];
      if (/^\d+$/.test(last)) break;
      const parentPath = parts.join('.');
      const parentValue = ConfigManager.getValue(config, parentPath);
      if (!isPlainObject(parentValue) || Object.keys(parentValue).length) break;
      config = ConfigManager.setValue(config, parentPath, undefined);
      parts.pop();
    }

    this._config = config;
    this._fireConfigChanged();
  }

  private _mergeOverrideValue(base: unknown, override: unknown): unknown {
    if (Array.isArray(override)) {
      return [...override];
    }
    if (!isPlainObject(override)) {
      return override;
    }

    const baseObject = isPlainObject(base) ? base : {};
    const merged: FormData = { ...baseObject };
    for (const [key, value] of Object.entries(override)) {
      merged[key] = this._mergeOverrideValue(baseObject[key], value);
    }
    return merged;
  }

  private _applyPresetOverrides(preset: EntitiesPreset): void {
    if (!this._config || !preset.overrides) {
      return;
    }
    this._config = this._mergeOverrideValue(
      this._config,
      preset.overrides,
    ) as CardConfig;
  }

  private _fireConfigChanged(): void {
    this.dispatchEvent(
      new CustomEvent('config-changed', {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      }),
    );
  }

  //-----------------------------------------------------------------------------
  // BUILDING BLOCKS
  //-----------------------------------------------------------------------------

  /**
   * Renders an `ha-form` bound to the object at `path`.
   */
  private _form(
    path: string,
    schema: FormSchemaItem[],
    options: FormOptions = {},
  ): TemplateResult {
    const stored = options.data ?? this._getObject(path);
    const data = { ...(options.defaults ?? {}), ...stored };

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        .computeLabel=${computeLabel}
        .computeHelper=${computeHelper}
        @value-changed=${(event: CustomEvent<{ value?: FormData }>) => {
          event.stopPropagation();
          const changes = resolveFormChanges(
            schema,
            stored,
            event.detail?.value ?? {},
            options.defaults,
          );
          if (Object.keys(changes).length === 0) return;
          if (options.onChange) {
            options.onChange(changes);
          } else {
            this._applyObjectChanges(path, changes);
          }
        }}
      ></ha-form>
    `;
  }

  /**
   * Outlined expansion panel with an icon header. Its open state survives
   * re-renders; lazy panels render their content on first open.
   */
  private _panel(
    key: string,
    title: string,
    icon: string,
    content: () => unknown,
    options: PanelOptions = {},
  ): TemplateResult {
    const expanded = this._expandedPanels[key] ?? options.expanded ?? false;
    if (expanded) this._loadedPanels.add(key);
    const showContent = !options.lazy || this._loadedPanels.has(key);

    return html`
      <ha-expansion-panel
        outlined
        class=${options.className ?? ''}
        .expanded=${expanded}
        @expanded-changed=${(event: CustomEvent<{ expanded?: boolean }>) =>
          this._onPanelToggled(event, key)}
      >
        ${options.header ??
        html`<h4 slot="header" class="panel-header">
          <ha-icon icon=${icon}></ha-icon>
          <span>${title}</span>
        </h4>`}
        <div class="content">${showContent ? content() : nothing}</div>
      </ha-expansion-panel>
    `;
  }

  private _onPanelToggled(
    event: CustomEvent<{ expanded?: boolean }>,
    key: string,
  ): void {
    // The event bubbles: only react to this panel, not to nested ones
    if (event.target !== event.currentTarget) return;
    const panel = event.currentTarget as HTMLElement & { expanded?: boolean };
    const expanded = Boolean(event.detail?.expanded ?? panel.expanded);
    if (expanded) this._loadedPanels.add(key);
    if (this._expandedPanels[key] === expanded) return;
    this._expandedPanels = { ...this._expandedPanels, [key]: expanded };
  }

  private _collapsePanels(prefix: string): void {
    const next: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(this._expandedPanels)) {
      next[key] = key.startsWith(prefix) ? false : value;
    }
    this._expandedPanels = next;
  }

  /** Section inside a panel: icon title, optional description, content */
  private _section(
    title: string,
    icon: string,
    content: unknown,
    description?: string,
  ): TemplateResult {
    return html`
      <div class="section">
        <h3 class="section-title">
          <ha-icon icon=${icon}></ha-icon>
          ${title}
        </h3>
        ${description
          ? html`<p class="section-description">${description}</p>`
          : nothing}
        ${content}
      </div>
    `;
  }

  /** Bubble-style info box */
  private _info(
    title: string,
    body: unknown,
    variant: 'info' | 'warning' = 'info',
  ): TemplateResult {
    return html`
      <div class="editor-info ${variant}">
        <h4 class="editor-info-title">
          <ha-icon
            icon=${variant === 'warning'
              ? 'mdi:alert-outline'
              : 'mdi:information-outline'}
          ></ha-icon>
          ${title}
        </h4>
        <div class="editor-info-content">${body}</div>
      </div>
    `;
  }

  /** Pill button */
  private _button(
    label: string,
    icon: string,
    onClick: () => void,
    variant: '' | 'secondary' | 'danger' = '',
  ): TemplateResult {
    return html`
      <button
        type="button"
        class="icon-button ${variant}"
        @click=${(event: Event) => {
          event.stopPropagation();
          onClick();
        }}
      >
        <ha-icon icon=${icon}></ha-icon>
        <span>${label}</span>
      </button>
    `;
  }

  /** Round icon-only button used in panel headers and item rows */
  private _iconButton(
    icon: string,
    title: string,
    onClick: () => void,
    config: { disabled?: boolean; danger?: boolean } = {},
  ): TemplateResult {
    return html`
      <button
        type="button"
        class="icon-button round ${config.danger ? 'danger' : ''}"
        title=${title}
        aria-label=${title}
        ?disabled=${config.disabled ?? false}
        @click=${(event: Event) => {
          event.stopPropagation();
          if (!config.disabled) onClick();
        }}
      >
        <ha-icon icon=${icon}></ha-icon>
      </button>
    `;
  }

  //-----------------------------------------------------------------------------
  // MAIN RENDER METHOD
  //-----------------------------------------------------------------------------

  render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    return html`
      <div class="card-config">
        ${this._panel(
          'entities',
          'Calendar Entities',
          'mdi:calendar-multiple',
          () => this._renderCalendarEntities(),
          { expanded: true },
        )}
        ${this._panel(
          'core',
          'Core Settings',
          'mdi:calendar-month',
          () => this._renderCoreSettings(),
          { lazy: true },
        )}
        ${this._panel(
          'format',
          'Date & Time Format',
          'mdi:clock-outline',
          () => this._renderDateTimeFormat(),
          { lazy: true },
        )}
        ${this._panel(
          'events',
          'Event Display',
          'mdi:format-color-text',
          () => this._renderEventDisplay(),
          { lazy: true },
        )}
        ${this._panel(
          'styling',
          'Styling',
          'mdi:palette',
          () => this._renderStyling(),
          { expanded: true },
        )}
      </div>
    `;
  }

  //-----------------------------------------------------------------------------
  // CORE SETTINGS
  //-----------------------------------------------------------------------------

  private _renderCoreSettings(): TemplateResult {
    return html`
      ${this._section(
        'Language',
        'mdi:translate',
        this._form('', [
          textField(
            'language',
            'Language Code',
            'Language code for date formatting (e.g., en, fr, de)',
          ),
        ]),
      )}
      ${this._section(
        'Days Range',
        'mdi:calendar-range',
        this._form(
          '',
          [
            numberField(
              'days',
              'Days to show',
              'Number of days to display (default: 7)',
              { min: 1 },
            ),
            selectField('orientation', 'Orientation', ORIENTATION_OPTIONS, {
              helper:
                'Grid orientation: vertical (days as columns) or horizontal (days as rows)',
            }),
            selectField('week_start', 'Week Start', WEEK_START_OPTIONS),
          ],
          {
            defaults: { days: 7, orientation: 'vertical', week_start: 'today' },
          },
        ),
      )}
      ${this._section(
        'Time Range',
        'mdi:clock-start',
        this._form(
          '',
          [
            numberField(
              'start_hour',
              'Start Hour',
              'Hour to start displaying (0-23, default: 0)',
              { min: 0, max: 23 },
            ),
            numberField(
              'end_hour',
              'End Hour',
              'Hour to stop displaying (0-24, default: 24)',
              { min: 0, max: 24 },
            ),
            booleanField(
              'trim_empty_hours',
              'Trim Empty Hours',
              'Trim empty hours at the top and bottom across all visible days',
            ),
            numberField(
              'trim_empty_hours_start_limit',
              'Trim Empty Hours Max Start Hour',
              'With trimming enabled, do not move start later than this hour',
              { min: 0, max: 23 },
            ),
            numberField(
              'trim_empty_hours_end_limit',
              'Trim Empty Hours Min End Hour',
              'With trimming enabled, do not move end earlier than this hour',
              { min: 1, max: 24 },
            ),
            booleanField(
              'time_range',
              'Show Time Range',
              'Display time as a range (e.g., "09 - 10" instead of "09")',
            ),
          ],
          {
            defaults: {
              start_hour: 0,
              end_hour: 24,
              trim_empty_hours: false,
              time_range: false,
            },
          },
        ),
      )}
    `;
  }

  //-----------------------------------------------------------------------------
  // DATE & TIME FORMAT
  //-----------------------------------------------------------------------------

  private _renderDateTimeFormat(): TemplateResult {
    return html`
      ${this._section(
        'Date Format',
        'mdi:calendar-text',
        this._form('primary_date_format', DATE_FORMAT_SCHEMA),
        'Primary date format options. Displayed as the main label.',
      )}
      ${this._section(
        'Secondary Date Format',
        'mdi:calendar-text-outline',
        this._form('secondary_date_format', DATE_FORMAT_SCHEMA),
        'Secondary date format (optional). Displayed below primary format.',
      )}
      ${this._section(
        'Time Format',
        'mdi:clock-time-four-outline',
        this._renderTimeFormatFields(),
        'Configure time display format. Choose between string pattern or structured options.',
      )}
    `;
  }

  private _renderTimeFormatFields(): TemplateResult {
    const timeFormat = this.getConfigValue('time_format') as
      | string
      | Intl.DateTimeFormatOptions
      | undefined;

    const typeForm = this._form('', TIME_FORMAT_TYPE_SCHEMA, {
      data: { time_format_type: this._timeFormatType },
      onChange: (changes) => {
        const formatType = changes.time_format_type as 'string' | 'object';
        if (!formatType) return;
        this._timeFormatType = formatType;
        handleTimeFormatTypeChange(formatType, this._fieldContext());
      },
    });

    if (this._timeFormatType === 'string') {
      return html`
        ${typeForm}
        <p class="section-description">
          Use tokens: H (0-23), HH (00-23), h (1-12), hh (01-12), m (0-59), mm
          (00-59), a (am/pm), A (AM/PM)
        </p>
        ${this._form(
          '',
          [
            textField(
              'time_format',
              'Time Format Pattern',
              'Examples: "h A" → "9 AM", "HH:mm" → "09:00", "hh:mm A" → "09:00 AM"',
            ),
          ],
          {
            data: {
              time_format: typeof timeFormat === 'string' ? timeFormat : 'h A',
            },
          },
        )}
      `;
    }

    // hour12 is a boolean in the config but a select in the form
    const formatObject = isPlainObject(timeFormat) ? timeFormat : {};
    const displayed: FormData = { ...formatObject };
    if (typeof formatObject.hour12 === 'boolean') {
      displayed.hour12 = String(formatObject.hour12);
    }

    return html`
      ${typeForm}
      ${this._form('time_format', TIME_FORMAT_OBJECT_SCHEMA, {
        data: displayed,
        onChange: (changes) => {
          const mapped = { ...changes };
          if (typeof mapped.hour12 === 'string') {
            mapped.hour12 = mapped.hour12 === 'true';
          }
          this._applyObjectChanges('time_format', mapped);
        },
      })}
    `;
  }

  //-----------------------------------------------------------------------------
  // EVENT DISPLAY
  //-----------------------------------------------------------------------------

  private _renderEventDisplay(): TemplateResult {
    return html`
      ${this._section(
        'All Day Events',
        'mdi:calendar-today',
        this._form(
          '',
          [
            selectField('all_day', 'All Day Display', ALL_DAY_OPTIONS),
            textField('all_day_label', 'All Day Label'),
          ],
          { defaults: { all_day: 'grid' } },
        ),
      )}
      ${this._section(
        'Icons',
        'mdi:emoticon-outline',
        this._form(
          '',
          [
            selectField(
              'icons_container',
              'Icons Container',
              ICONS_CONTAINER_OPTIONS,
            ),
            selectField('icons_mode', 'Icons Mode', ICONS_MODE_OPTIONS),
          ],
          { defaults: { icons_container: 'cell', icons_mode: 'top' } },
        ),
      )}
      ${this._section(
        'Default Event',
        'mdi:calendar-star',
        this._renderEventConfig('event', 'Default Event Icon'),
        'Configure default properties for all events (can be overridden by individual entity configs)',
      )}
      ${this._section(
        'Blank Event',
        'mdi:calendar-blank-outline',
        this._renderEventConfig('blank_event', 'Blank Event Icon'),
        'Configure blank event appearance and variables',
      )}
      ${this._section(
        'Blank All-Day Event',
        'mdi:calendar-blank',
        this._renderEventConfig(
          'blank_all_day_event',
          'Blank All-Day Event Icon',
        ),
        'Configure blank all-day event appearance and variables',
      )}
      ${this._section(
        'Filter',
        'mdi:filter-outline',
        this._form('', [
          textField(
            'filter',
            'Global Filter',
            'Filter events by text in summary (applies to all entities)',
          ),
        ]),
      )}
    `;
  }

  private _renderEventConfig(
    path: EventConfigPath,
    iconLabel: string,
  ): TemplateResult {
    return html`
      ${this._form(path, [
        iconField('icon', iconLabel, undefined, 'mdi:cancel'),
      ])}
      ${this._renderThemeValuesForm(`${path}.theme_values`)}
    `;
  }

  //-----------------------------------------------------------------------------
  // STYLING
  //-----------------------------------------------------------------------------

  private _renderStyling(): TemplateResult {
    const hasCustomCss =
      typeof this._config?.css === 'string' &&
      this._config.css.trim().length > 0;
    const customCssWarning = this._info(
      'Warning',
      html`<p>
        Custom CSS may not be fully supported in newer versions of this card. If
        something looks broken after an update, select one of the standard
        themes.
      </p>`,
      'warning',
    );

    return html`
      ${this._section(
        'Theme',
        'mdi:palette-swatch',
        this._form(
          '',
          [
            selectField(
              'theme_selection',
              'Theme',
              [
                { value: 'custom', label: 'Custom' },
                ...themes.map((theme) => ({
                  value: theme.id,
                  label: theme.name,
                })),
              ],
              { required: true },
            ),
          ],
          {
            data: { theme_selection: this._selectedTheme },
            onChange: (changes) => {
              const themeId = changes.theme_selection;
              if (typeof themeId === 'string') {
                this._handleThemeSelection(themeId);
              }
            },
          },
        ),
        'Select a theme or choose "Custom" to edit CSS manually.',
      )}
      ${this._section(
        'Change Theme CSS',
        'mdi:language-css3',
        html`
          ${hasCustomCss ? customCssWarning : nothing}
          ${this._panel(
            'theme_css',
            'Theme CSS',
            'mdi:code-tags',
            () => html`
              ${!hasCustomCss ? customCssWarning : nothing}
              <ha-code-editor
                .hass=${this.hass}
                .value=${this._getEditorCssValue()}
                @value-changed=${(event: CustomEvent<{ value: string }>) => {
                  event.stopPropagation();
                  this._handleCssChange(event.detail.value);
                }}
              ></ha-code-editor>
            `,
            { lazy: true },
          )}
        `,
        'Change theme CSS styles. Use CSS variables and selectors to style the card.',
      )}
    `;
  }

  //-----------------------------------------------------------------------------
  // THEME VARIABLES
  //-----------------------------------------------------------------------------

  /**
   * Form for the theme variables (`theme_variables`) of the current theme,
   * stored in the `theme_values` object at `path`.
   */
  private _renderThemeValuesForm(
    path: string,
  ): TemplateResult | typeof nothing {
    const themeVariables = this.getConfigValue('theme_variables', {}) as Record<
      string,
      ThemeVariable
    >;
    const entries = Object.entries(themeVariables ?? {});
    if (entries.length === 0) return nothing;

    const schema = entries.map(([key, variable]) =>
      textField(
        key,
        variable?.name || key,
        [`Theme: ${this._selectedThemeName}`, variable?.description]
          .filter(Boolean)
          .join(' · '),
      ),
    );

    // Values may be numbers in YAML; the text selector edits them as strings
    const displayed: FormData = {};
    for (const [key, value] of Object.entries(this._getObject(path))) {
      displayed[key] =
        value === undefined || value === null ? value : String(value);
    }

    return this._form(path, schema, {
      data: displayed,
      onChange: (changes) => this._applyObjectChanges(path, changes),
    });
  }

  //-----------------------------------------------------------------------------
  // CRITERIA (hide / under / over)
  //-----------------------------------------------------------------------------

  private _renderCriteriaArray(
    configPath: string,
    label: string,
    description: string,
  ): TemplateResult {
    const criteria =
      (this.getConfigValue(configPath, []) as Array<string | EventCriteria>) ||
      [];

    return html`
      <div class="criteria-array-section">
        <h4 class="criteria-title">
          ${label}
          ${criteria.length
            ? html`<span class="badge">${criteria.length}</span>`
            : nothing}
        </h4>
        <p class="section-description">${description}</p>
        ${criteria.map((item, itemIndex) =>
          this._renderCriteriaItem(configPath, item, itemIndex),
        )}
        <div class="element-actions">
          ${this._button(`Add ${label} Criteria`, 'mdi:plus', () =>
            this._addCriteriaItem(configPath),
          )}
        </div>
      </div>
    `;
  }

  private _renderCriteriaItem(
    configPath: string,
    item: string | EventCriteria,
    itemIndex: number,
  ): TemplateResult {
    const isString = typeof item === 'string';
    const itemPath = `${configPath}.${itemIndex}`;

    return html`
      <div class="criteria-item">
        <div class="criteria-item-header">
          ${this._form('', CRITERIA_TYPE_SCHEMA, {
            data: { __type: isString ? 'string' : 'object' },
            onChange: (changes) => {
              const type = changes.__type as 'string' | 'object' | undefined;
              if (type) {
                handleCriteriaTypeChange(itemPath, type, this._fieldContext());
              }
            },
          })}
          ${this._iconButton(
            'mdi:delete-outline',
            'Remove',
            () => this._removeCriteriaItem(configPath, itemIndex),
            { danger: true },
          )}
        </div>
        ${isString
          ? this._form('', CRITERIA_NAME_SCHEMA, {
              data: { name: item },
              onChange: (changes) =>
                this.setConfigValue(
                  itemPath,
                  (changes.name as string | undefined) ?? '',
                ),
            })
          : this._form(itemPath, CRITERIA_OBJECT_SCHEMA, {
              onChange: (changes) => {
                const updated = applyChanges(
                  this._getObject(itemPath),
                  changes,
                );
                // An empty criteria object goes back to an empty name
                this.setConfigValue(
                  itemPath,
                  Object.keys(updated).length ? updated : '',
                );
              },
            })}
      </div>
    `;
  }

  _addCriteriaItem(configPath: string): void {
    const criteria = [
      ...((this.getConfigValue(configPath, []) as Array<
        string | EventCriteria
      >) || []),
    ];
    criteria.push('');
    this.setConfigValue(configPath, criteria);
  }

  _removeCriteriaItem(configPath: string, itemIndex: number): void {
    const criteria = [
      ...((this.getConfigValue(configPath, []) as Array<
        string | EventCriteria
      >) || []),
    ];
    criteria.splice(itemIndex, 1);
    this.setConfigValue(configPath, criteria.length ? criteria : undefined);
  }

  //-----------------------------------------------------------------------------
  // CALENDAR ENTITIES
  //-----------------------------------------------------------------------------

  private _getEntityInfo(entityId: string): {
    calendarName: string;
    deviceName: string;
  } {
    const hass = this.hass;
    if (!hass || !entityId) {
      return { calendarName: entityId || '', deviceName: '' };
    }

    const fullName = hass.states?.[entityId]?.attributes?.friendly_name || '';
    const entityReg = hass.entities?.[entityId];
    const deviceReg = entityReg?.device_id
      ? hass.devices?.[entityReg.device_id]
      : null;
    const deviceName: string = deviceReg
      ? deviceReg.name_by_user || deviceReg.name || ''
      : '';
    const calendarName =
      fullName.replace(deviceName, '').trim() || fullName || entityId;

    return { calendarName, deviceName };
  }

  private _renderEntityHeader(
    entity: string | EntityConfig,
    index: number,
  ): TemplateResult {
    const isStringEntity = typeof entity === 'string';
    const entityId = isStringEntity ? entity : entity.entity;
    const { calendarName, deviceName } = this._getEntityInfo(entityId);
    const customName = !isStringEntity
      ? entity.name || entity.filter || undefined
      : undefined;

    const entities = this._config?.entities || [];
    const stop = (event: Event) => event.stopPropagation();

    return html`
      <div slot="header" class="entity-header">
        <ha-icon
          class="entity-header-icon"
          icon=${(!isStringEntity && entity.icon) || 'mdi:calendar'}
        ></ha-icon>
        <div class="entity-header-content">
          <div class="entity-header-name">
            ${customName || calendarName || `Calendar ${index + 1}`}
          </div>
          ${customName && calendarName
            ? html`<div class="entity-header-entity">${calendarName}</div>`
            : nothing}
          ${deviceName
            ? html`<div class="entity-header-device">${deviceName}</div>`
            : nothing}
        </div>
        <div
          class="entity-header-buttons"
          @click=${stop}
          @mousedown=${stop}
          @touchstart=${stop}
          @keydown=${stop}
        >
          ${this._iconButton(
            'mdi:arrow-up',
            'Move up',
            () => this._moveEntity(index, -1),
            { disabled: index === 0 },
          )}
          ${this._iconButton(
            'mdi:arrow-down',
            'Move down',
            () => this._moveEntity(index, 1),
            { disabled: index >= entities.length - 1 },
          )}
          ${this._iconButton(
            'mdi:trash-can-outline',
            'Remove',
            () => this._removeCalendarEntity(index),
            { danger: true },
          )}
        </div>
      </div>
    `;
  }

  private _renderCalendarEntity(
    entity: string | EntityConfig,
    index: number,
  ): TemplateResult {
    const isStringEntity = typeof entity === 'string';
    const path = `entities.${index}`;
    const panelKey = `entity_${index}`;
    const pickerSchema = [
      entityField('entity', '', {
        domain: 'calendar',
        required: true,
      }),
    ];

    const entityPicker = isStringEntity
      ? this._form('', pickerSchema, {
          data: { entity },
          onChange: (changes) =>
            this.setConfigValue(
              path,
              (changes.entity as string | undefined) ?? '',
            ),
        })
      : this._form(path, pickerSchema, {
          onChange: (changes) =>
            this._applyObjectChanges(path, {
              entity: (changes.entity as string | undefined) ?? '',
            }),
        });

    return this._panel(
      panelKey,
      '',
      'mdi:calendar',
      () => html`
        ${this._section('Entity', 'mdi:calendar', entityPicker)}
        ${isStringEntity
          ? html`
              <div class="element-actions">
                ${this._button('Convert to Advanced', 'mdi:code-json', () =>
                  this._convertEntityToObject(index),
                )}
              </div>
            `
          : html`
              ${this._section(
                'Entity Settings',
                'mdi:tune-variant',
                html`
                  ${this._form(path, ENTITY_SETTINGS_SCHEMA)}
                  ${this._renderThemeValuesForm(`${path}.theme_values`)}
                `,
              )}
              ${this._panel(
                `${panelKey}_advanced`,
                'Advanced Event Control',
                'mdi:code-braces',
                () => html`
                  ${this._info(
                    'Layering & visibility',
                    html`<p>
                      Control event layering and visibility. Each item can be a
                      simple name (string) or detailed criteria (object).
                    </p>`,
                  )}
                  ${this._renderCriteriaArray(
                    `${path}.hide`,
                    'Hide',
                    'Events to hide when this event is present',
                  )}
                  ${this._renderCriteriaArray(
                    `${path}.under`,
                    'Under',
                    'Events to render underneath this one',
                  )}
                  ${this._renderCriteriaArray(
                    `${path}.over`,
                    'Over',
                    'Events to render on top of this one',
                  )}
                `,
                { lazy: true },
              )}
            `}
      `,
      {
        lazy: true,
        header: this._renderEntityHeader(entity, index),
        className: 'entity-panel',
      },
    );
  }

  private _renderCalendarEntities(): TemplateResult {
    const entities = this._config?.entities || [];

    return html`
      ${entities.length === 0
        ? html`<p class="section-description">
            No calendars yet. Add a calendar entity or apply a preset.
          </p>`
        : nothing}
      ${entities.map((entity, index) =>
        this._renderCalendarEntity(entity, index),
      )}
      <div class="element-actions">
        ${this._button('Add Calendar', 'mdi:plus', () =>
          this._addCalendarEntity(),
        )}
        ${entities.length > 0
          ? this._button(
              'Remove All',
              'mdi:delete-sweep-outline',
              () => this._removeAllCalendarEntities(),
              'danger',
            )
          : nothing}
        ${this._button(
          'Apply Preset',
          'mdi:package-variant',
          () => this._togglePresetForm(),
          'secondary',
        )}
      </div>
      ${this._showPresetForm ? this._renderPresetForm() : nothing}
    `;
  }

  _addCalendarEntity(): void {
    const entities = [...(this._config?.entities || [])];
    const newIndex = entities.length;

    const example = this._getExampleByEntityIndex(newIndex);
    const newEntity = example
      ? this._applyThemeValuesToEntity('', example)
      : '';

    entities.push(newEntity);
    this._collapsePanels('entity_');
    this._expandedPanels = {
      ...this._expandedPanels,
      [`entity_${newIndex}`]: true,
    };
    this.setConfigValue('entities', entities);
  }

  _removeCalendarEntity(index: number): void {
    this._collapsePanels('entity_');
    const entities = [...(this._config?.entities || [])];
    entities.splice(index, 1);
    this.setConfigValue('entities', entities);
  }

  _removeAllCalendarEntities(): void {
    this._collapsePanels('entity_');
    this.setConfigValue('entities', []);
  }

  _moveEntity(index: number, direction: -1 | 1): void {
    const entities = [...(this._config?.entities || [])];
    const target = index + direction;
    if (target < 0 || target >= entities.length) return;
    this._collapsePanels('entity_');
    [entities[index], entities[target]] = [entities[target], entities[index]];
    this.setConfigValue('entities', entities);
  }

  _convertEntityToObject(index: number): void {
    const entities = [...(this._config?.entities || [])];
    const entityValue = entities[index] as string;
    entities[index] = { entity: entityValue };
    this.setConfigValue('entities', entities);
  }

  //-----------------------------------------------------------------------------
  // PRESETS
  //-----------------------------------------------------------------------------

  /**
   * Theme id used for examples/presets when UI shows "Custom" but config
   * still references a package theme
   */
  private _themeIdForPackagedTheme(): string | null {
    const t = this._config?.theme;
    if (t && themes.some((x) => x.id === t)) {
      return t;
    }
    return this._selectedTheme !== 'custom' ? this._selectedTheme : null;
  }

  private _getAvailablePresets(): EntitiesPreset[] {
    const packagedId = this._themeIdForPackagedTheme();

    // Custom theme: offer the presets of every theme
    if (this._selectedTheme === 'custom' && !packagedId) {
      const presetMap = new Map<string, EntitiesPreset>();
      themes.forEach((theme) => {
        (theme.config.entities_presets || []).forEach((preset) => {
          const presetName = `${preset.name}_${theme.id}`;
          if (!presetMap.has(presetName)) {
            presetMap.set(presetName, {
              ...preset,
              name: presetName,
              title: `${theme.name}: ${preset.title}`,
            });
          }
        });
      });
      return Array.from(presetMap.values());
    }

    const selectedTheme = themes.find(
      (t) => t.id === (packagedId ?? this._selectedTheme),
    );
    return selectedTheme?.config.entities_presets || [];
  }

  private _ensureDefaultPresetSelection(presets: EntitiesPreset[]): void {
    if (
      presets.length > 0 &&
      !presets.some((p) => p.name === this._selectedPresetName)
    ) {
      this._selectedPresetName = presets[0].name;
    }
  }

  _togglePresetForm(): void {
    this._showPresetForm = !this._showPresetForm;
    this._presetCalendarValues = {};
    if (this._showPresetForm) {
      this._ensureDefaultPresetSelection(this._getAvailablePresets());
    } else {
      this._selectedPresetName = '';
    }
  }

  private _renderPresetForm(): TemplateResult {
    const presets = this._getAvailablePresets();

    if (presets.length === 0) {
      return this._info('Apply Preset', html`<p>No presets available</p>`);
    }

    this._ensureDefaultPresetSelection(presets);

    const selectedPreset = presets.find(
      (p) => p.name === this._selectedPresetName,
    );
    const calendars = selectedPreset?.calendars || [];

    return html`
      <div class="preset-form">
        <h4 class="preset-title">
          <ha-icon icon="mdi:package-variant"></ha-icon>
          Apply Preset
        </h4>
        ${this._form(
          '',
          [
            selectField(
              'preset',
              'Preset',
              presets.map((p) => ({ value: p.name, label: p.title })),
              { required: true },
            ),
          ],
          {
            data: { preset: this._selectedPresetName },
            onChange: (changes) => {
              this._selectedPresetName =
                (changes.preset as string | undefined) ?? '';
              this._presetCalendarValues = {};
            },
          },
        )}
        ${calendars.length > 0
          ? this._form(
              '',
              calendars.map((calendar) =>
                entityField(calendar.template, calendar.title, {
                  domain: 'calendar',
                  helper: calendar.description,
                }),
              ),
              {
                data: { ...this._presetCalendarValues },
                onChange: (changes) => {
                  const values = { ...this._presetCalendarValues };
                  for (const [key, value] of Object.entries(changes)) {
                    if (typeof value === 'string' && value) {
                      values[key] = value;
                    } else {
                      delete values[key];
                    }
                  }
                  this._presetCalendarValues = values;
                },
              },
            )
          : nothing}
        ${selectedPreset
          ? html`
              <div class="element-actions">
                ${this._button('Apply', 'mdi:check', () => this._applyPreset())}
                ${this._button(
                  'Cancel',
                  'mdi:close',
                  () => this._togglePresetForm(),
                  'secondary',
                )}
              </div>
            `
          : nothing}
      </div>
    `;
  }

  _applyPreset(): void {
    if (!this._selectedPresetName || !this._config) {
      return;
    }

    const selectedPreset = this._getAvailablePresets().find(
      (p) => p.name === this._selectedPresetName,
    );
    if (!selectedPreset || !selectedPreset.entities) {
      return;
    }

    const calendars = selectedPreset.calendars || [];
    // undefined: not a template; '': template without a selected calendar
    const selectedFor = (template: string): string | undefined => {
      const calendar = calendars.find((c) => c.template === template);
      if (!calendar) return undefined;
      return this._presetCalendarValues[calendar.template]?.trim() || '';
    };

    const entities = (
      JSON.parse(JSON.stringify(selectedPreset.entities)) as (
        | string
        | EntityConfig
      )[]
    )
      .map((entity) => {
        const template = typeof entity === 'string' ? entity : entity?.entity;
        const selected = template ? selectedFor(template) : undefined;
        if (selected === undefined) return entity;
        if (!selected) return null;
        return typeof entity === 'string'
          ? selected
          : { ...entity, entity: selected };
      })
      .filter((entity): entity is string | EntityConfig => entity !== null);

    this._applyPresetOverrides(selectedPreset);
    if (!this._config) {
      return;
    }

    this._collapsePanels('entity_');
    this._config = {
      ...this._config,
      entities,
    };
    this._fireConfigChanged();
    this._togglePresetForm();
  }

  //-----------------------------------------------------------------------------
  // THEME MANAGEMENT
  //-----------------------------------------------------------------------------

  private _handleThemeSelection(themeId: string): void {
    if (!this._config) return;
    const previousTheme = this._selectedTheme;
    this._selectedTheme = themeId;

    if (themeId === 'custom') {
      const effective = getEffectiveCardCss(this._config, themes);
      this._config = ConfigManager.setValue(this._config, 'theme', undefined);
      this._config = ConfigManager.setValue(
        this._config,
        'css',
        effective.trim() ? effective : undefined,
      );
      this._fireConfigChanged();
      return;
    }

    const selectedTheme = themes.find((t) => t.id === themeId);
    if (selectedTheme && selectedTheme.config) {
      if (previousTheme !== 'custom') {
        this._config = new ThemeManager(
          this._config,
          themes,
        ).archiveThemeValues(previousTheme);
      }
      this._config = new ThemeManager(this._config, themes).applyThemeConfig(
        selectedTheme.config,
        themeId,
      );
      this._fireConfigChanged();
    }
  }

  private _getExampleByEntityIndex(
    entityIndex: number,
  ): ThemeValues | undefined {
    if (!this._config) {
      return undefined;
    }
    const themeId = this._themeIdForPackagedTheme();
    if (!themeId) {
      return undefined;
    }
    return new ThemeManager(this._config, themes).getExampleByEntityIndex(
      entityIndex,
      themeId,
    );
  }

  private _detectSelectedTheme(): void {
    if (!this._config) {
      this._selectedTheme = 'custom';
      return;
    }
    this._selectedTheme = new ThemeManager(
      this._config,
      themes,
    ).detectSelectedTheme();
  }

  /**
   * Migrates legacy configs that store packaged theme CSS in `css` only.
   * Rewrites to `theme` + no `css`, so saved config stays compact.
   */
  private _migrateLegacyThemeCssToThemeField(): void {
    if (!this._config || this._selectedTheme === 'custom') {
      return;
    }
    if (this._config.theme === this._selectedTheme && !this._config.css) {
      return;
    }

    const theme = themes.find((t) => t.id === this._selectedTheme);
    const themeCss = (theme?.config.css as string) || '';
    const currentCss = this._config.css || '';

    if (
      currentCss &&
      normalizeCssForCompare(currentCss) === normalizeCssForCompare(themeCss)
    ) {
      this._config = ConfigManager.setValue(
        this._config,
        'theme',
        this._selectedTheme,
      );
      this._config = ConfigManager.setValue(this._config, 'css', undefined);
      this._fireConfigChanged();
    }
  }

  private get _selectedThemeName(): string {
    if (this._selectedTheme === 'custom') {
      return 'Custom';
    }
    const theme = themes.find((t) => t.id === this._selectedTheme);
    return theme?.name || 'Custom';
  }

  private _applyThemeValuesToEntity(
    entity: string | EntityConfig,
    example: ThemeValues,
  ): string | EntityConfig {
    if (!this._config) {
      return entity;
    }
    return new ThemeManager(this._config, themes).applyThemeValuesToEntity(
      entity,
      example,
    );
  }

  /** Effective CSS shown in the editor (theme default when not overridden) */
  private _getEditorCssValue(): string {
    if (!this._config) {
      return '';
    }
    return getEffectiveCardCss(this._config, themes);
  }

  private _handleCssChange(newCss: string): void {
    if (!this._config) {
      return;
    }
    const themeId = this._config.theme;
    const theme = themeId ? themes.find((t) => t.id === themeId) : undefined;
    const defaultCss = (theme?.config.css as string) || '';
    if (
      theme &&
      normalizeCssForCompare(newCss) === normalizeCssForCompare(defaultCss)
    ) {
      this.setConfigValue('css', undefined);
    } else {
      this.setConfigValue('css', newCss);
    }
    this._detectSelectedTheme();
  }
}
