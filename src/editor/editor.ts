/**
 * Visual editor for Calendar Week Grid Card
 * Provides a visual configuration interface using native Home Assistant elements
 */

import type { HomeAssistant } from 'custom-card-helpers';
import { LitElement, TemplateResult, html, unsafeCSS } from 'lit';
import { property, state } from 'lit/decorators.js';
import type {
  CardConfig,
  DefaultEventConfig,
  EntityConfig,
  ThemeVariable,
} from '../types';
import styles from './styles.css';
import { themes } from './themes';
import { ConfigManager } from './utils/config';
import type { FieldHandlerContext } from './utils/field';
import {
  handleTimeFormatTypeChange,
  handleDateFormatFieldChange,
  handleTimeFormatObjectFieldChange,
  handleCriteriaTypeChange,
  handleCriteriaFieldChange,
} from './utils/field';
import { ThemeManager } from './utils/theme';

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

  @property({ attribute: false }) hass?: HomeAssistant & {
    entities: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    devices: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  };
  @state() private _config?: CardConfig;
  @state() private _timeFormatType: 'string' | 'object' = 'object';
  @state() private _expandedEntityIndex: number | null = null;
  @state() private _selectedTheme: string = 'custom';
  private _isInitializing: boolean = true;

  //-----------------------------------------------------------------------------
  // LIFECYCLE METHODS
  //-----------------------------------------------------------------------------

  connectedCallback(): void {
    super.connectedCallback();
    this.loadHaComponents();
  }

  private loadHaComponents(): void {
    // Hack to load ha-components needed for editor
    if (!customElements.get('ha-entity-picker')) {
      (
        customElements.get('hui-entities-card') as unknown as {
          getConfigElement: () => HTMLElement;
        }
      )?.getConfigElement();
    }
  }

  //-----------------------------------------------------------------------------
  // CONFIG MANAGEMENT
  //-----------------------------------------------------------------------------

  setConfig(config: Partial<CardConfig>): void {
    this._isInitializing = true;
    this._config = {
      type: 'custom:calendar-week-grid-card',
      entities: [],
      ...config,
    };

    // Initialize time format type based on current config
    const timeFormat = this._config?.time_format;
    this._timeFormatType =
      typeof timeFormat === 'string' || timeFormat === undefined
        ? 'string'
        : 'object';

    // Detect which theme is currently selected based on CSS content
    this._detectSelectedTheme();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this._isInitializing = false;
      });
    });
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
    const newConfig = ConfigManager.setValue(this._config, path, value);
    this._fireConfigChanged(newConfig);
  }

  private _fireConfigChanged(config: CardConfig): void {
    if (this._isInitializing) {
      this._config = config;
      return;
    }

    this._config = config;
    this.dispatchEvent(
      new CustomEvent('config-changed', {
        detail: { config },
      }),
    );
  }

  //-----------------------------------------------------------------------------
  // INPUT/EVENT HANDLERS
  //-----------------------------------------------------------------------------

  _valueChanged(event: Event): void {
    if (!event.target) return;

    event.stopPropagation();

    const target = event.target as
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement;
    const name = target.getAttribute('name');

    if (!name) return;

    let value: string | boolean | number | object | null = target.value;

    if (target.tagName === 'HA-SWITCH') {
      value = (target as HTMLInputElement).checked;
    }

    if (target.getAttribute('type') === 'number' && value !== '') {
      value = parseFloat(value as string);
    }

    // Create context for field handlers
    const context: FieldHandlerContext = {
      getConfigValue: this.getConfigValue.bind(this),
      setConfigValue: this.setConfigValue.bind(this),
    };

    // Handle theme_selection (UI-only field that controls theme switching)
    if (name === 'theme_selection') {
      this._handleThemeSelection(value as string);
      return;
    }

    // Handle time_format_type (UI-only field that controls format switching)
    if (name === 'time_format_type') {
      const formatType = value as 'string' | 'object';
      this._timeFormatType = formatType;
      handleTimeFormatTypeChange(formatType, context);
      return;
    }

    // Handle date format fields (build object from individual fields)
    if (
      name.startsWith('primary_date_format.') ||
      name.startsWith('secondary_date_format.')
    ) {
      const configPath = name.split('.')[0];
      const fieldName = name.split('.')[1];
      handleDateFormatFieldChange(configPath, fieldName, value, context);
      return;
    }

    // Handle time format object fields
    if (name.startsWith('time_format.')) {
      const fieldName = name.split('.')[1];
      handleTimeFormatObjectFieldChange(fieldName, value, context);
      return;
    }

    // Handle criteria type switching (UI-only field)
    if (name.endsWith('.__type')) {
      const basePath = name.replace('.__type', '');
      const newType = value as 'string' | 'object';
      handleCriteriaTypeChange(basePath, newType, context);
      return;
    }

    // Handle criteria object fields (name, type, entity, filter)
    const criteriaFieldMatch = name.match(
      /^(entities\.\d+\.(under|over|hide))\.(\d+)\.(.+)$/,
    );
    if (criteriaFieldMatch) {
      const basePath = criteriaFieldMatch[1];
      const itemIndex = parseInt(criteriaFieldMatch[3], 10);
      const fieldName = criteriaFieldMatch[4];

      if (fieldName === '__type') {
        return;
      }

      handleCriteriaFieldChange(basePath, itemIndex, fieldName, value, context);
      return;
    }

    // Try to parse JSON for object fields (legacy support)
    const objectFields = [
      'primary_date_format',
      'secondary_date_format',
      'time_format',
      'grid_options',
      'layout_options',
    ];
    if (
      typeof value === 'string' &&
      value.trim() !== '' &&
      objectFields.includes(name) &&
      (value.startsWith('{') || value.startsWith('['))
    ) {
      try {
        value = JSON.parse(value);
      } catch {
        // If parsing fails, keep as string
      }
    }

    this.setConfigValue(name, value);
  }

  /**
   * Handles theme selection changes
   */
  private _handleThemeSelection(themeId: string): void {
    const previousTheme = this._selectedTheme;
    this._selectedTheme = themeId;

    if (themeId === 'custom') {
      return;
    }

    const selectedTheme = themes.find((t) => t.id === themeId);
    if (selectedTheme && selectedTheme.config) {
      if (previousTheme !== 'custom') {
        this._archiveCurrentThemeValues(previousTheme);
      }

      // Clear theme-related fields if not present in theme (e.g., basic theme has no CSS or theme variables)
      if (!('css' in selectedTheme.config)) {
        this.setConfigValue('css', '');
      }
      if (!('theme_variables' in selectedTheme.config)) {
        this.setConfigValue('theme_variables', undefined);
      }
      if (!('theme_values_examples' in selectedTheme.config)) {
        this.setConfigValue('theme_values_examples', undefined);
      }

      Object.entries(selectedTheme.config).forEach(([key, value]) => {
        if (key !== 'entities' && value !== null && value !== undefined) {
          this.setConfigValue(key, value);
        }
      });

      this._removeObsoleteThemeVariables();
      this._applyThemeValuesExamplesToEntities(themeId);

      this._restoreEventConfigThemeValues('event', themeId);
      this._restoreEventConfigThemeValues('blank_event', themeId);
      this._restoreEventConfigThemeValues('blank_all_day_event', themeId);
    }
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
        <!-- CALENDAR ENTITIES -->
        ${this.addExpansionPanel(
          'Calendar Entities',
          'mdi:calendar-multiple',
          html` ${this._renderCalendarEntities()} `,
          true,
        )}

        <!-- CORE SETTINGS -->
        ${this.addExpansionPanel(
          'Core Settings',
          'mdi:calendar-month',
          html`
            <!-- Language & Theme -->
            <h3>Language & Theme</h3>
            ${this.addTextField('language', 'Language Code')}
            <div class="helper-text">
              Language code for date formatting (e.g., en, fr, de)
            </div>
            ${this.addSelectField(
              'theme',
              'Theme',
              [
                { value: 'auto', label: 'Auto' },
                { value: 'dark', label: 'Dark' },
                { value: 'light', label: 'Light' },
              ],
              false,
              'auto',
            )}

            <!-- Days Range -->
            <h3>Days Range</h3>
            ${this.addTextField('days', 'Days to show', 'number', '7')}
            <div class="helper-text">
              Number of days to display (default: 7)
            </div>
            ${this.addSelectField(
              'week_start',
              'Week Start',
              [
                { value: 'today', label: 'Today' },
                { value: 'sunday', label: 'Sunday' },
                { value: 'monday', label: 'Monday' },
                { value: 'tuesday', label: 'Tuesday' },
                { value: 'wednesday', label: 'Wednesday' },
                { value: 'thursday', label: 'Thursday' },
                { value: 'friday', label: 'Friday' },
                { value: 'saturday', label: 'Saturday' },
              ],
              false,
              'today',
            )}

            <!-- Time Range -->
            <h3>Time Range</h3>
            ${this.addTextField('start_hour', 'Start Hour', 'number', '0')}
            <div class="helper-text">
              Hour to start displaying (0-23, default: 0)
            </div>
            ${this.addTextField('end_hour', 'End Hour', 'number', '24')}
            <div class="helper-text">
              Hour to stop displaying (0-24, default: 24)
            </div>
            ${this.addBooleanField('time_range', 'Show Time Range')}
            <div class="helper-text">
              Display time as a range (e.g., "09 - 10" instead of "09")
            </div>
          `,
        )}

        <!-- DATE & TIME FORMAT -->
        ${this.addExpansionPanel(
          'Date & Time Format',
          'mdi:clock-outline',
          html`
            <!-- Primary Date Format -->
            <h3>Date Format</h3>
            <div class="helper-text">
              Primary date format options. Displayed as the main label.
            </div>
            ${this._renderDateFormatFields('primary_date_format')}
            <h3>Secondary Date Format</h3>
            <div class="helper-text">
              Secondary date format (optional). Displayed below primary format.
            </div>
            ${this._renderDateFormatFields('secondary_date_format')}

            <!-- Time Format -->
            <h3>Time Format</h3>
            <div class="helper-text">
              Configure time display format. Choose between string pattern or
              structured options.
            </div>
            ${this._renderTimeFormatFields()}
          `,
        )}

        <!-- EVENT DISPLAY -->
        ${this.addExpansionPanel(
          'Event Display',
          'mdi:format-color-text',
          html`
            <!-- All Day Events -->
            <h3>All Day Events</h3>
            ${this.addSelectField(
              'all_day',
              'All Day Display',
              [
                { value: 'grid', label: 'Grid' },
                { value: 'row', label: 'Row' },
                { value: 'both', label: 'Both' },
              ],
              false,
              'grid',
            )}
            ${this.addTextField('all_day_label', 'All Day Label')}
            ${this.addIconPickerField('all_day_icon', 'All Day Icon')}

            <!-- Icons -->
            <h3>Icons</h3>
            ${this.addSelectField(
              'icons_container',
              'Icons Container',
              [
                { value: 'event', label: 'Event' },
                { value: 'cell', label: 'Cell' },
              ],
              false,
              'cell',
            )}
            ${this.addSelectField(
              'icons_mode',
              'Icons Mode',
              [
                { value: 'top', label: 'Top' },
                { value: 'all', label: 'All' },
              ],
              false,
              'top',
            )}

            <!-- Default Event Config -->
            <h3>Default Event</h3>
            <div class="helper-text">
              Configure default properties for all events (can be overridden by
              individual entity configs)
            </div>
            ${this.addIconPickerField('event.icon', 'Default Event Icon')}
            ${this._renderThemeConfigVariables('event')}

            <!-- Blank Event Config -->
            <h3>Blank Event</h3>
            <div class="helper-text">
              Configure blank event appearance and variables
            </div>
            ${this.addIconPickerField('blank_event.icon', 'Blank Event Icon')}
            ${this._renderThemeConfigVariables('blank_event')}

            <!-- Blank All-Day Event Config -->
            <h3>Blank All-Day Event</h3>
            <div class="helper-text">
              Configure blank all-day event appearance and variables
            </div>
            ${this.addIconPickerField(
              'blank_all_day_event.icon',
              'Blank All-Day Event Icon',
            )}
            ${this._renderThemeConfigVariables('blank_all_day_event')}

            <!-- Filter -->
            <h3>Filter</h3>
            ${this.addTextField('filter', 'Global Filter')}
            <div class="helper-text">
              Filter events by text in summary (applies to all entities)
            </div>
          `,
        )}

        <!-- STYLING -->
        ${this.addExpansionPanel(
          'Styling',
          'mdi:palette',
          html`
            <!-- Theme Selection -->
            <h3>Theme</h3>
            <div class="helper-text">
              Select a theme or choose "Custom" to edit CSS manually.
            </div>
            ${this.addSelectField(
              'theme_selection',
              'Theme',
              [
                { value: 'custom', label: 'Custom' },
                ...themes.map((theme) => ({
                  value: theme.id,
                  label: theme.name,
                })),
              ],
              false,
              this._selectedTheme,
            )}
            <!-- Custom CSS -->
            <h3>Custom CSS</h3>
            <div class="helper-text">
              Custom CSS styles. Use CSS variables and selectors to style the
              card.
            </div>
            <ha-code-editor
              .hass="${this.hass}"
              name="css"
              label="Custom CSS"
              .value="${this.getConfigValue('css', '')}"
              @value-changed="${(e: CustomEvent) => {
                e.stopPropagation();
                this._handleCssChange(e.detail.value);
              }}"
            ></ha-code-editor>
          `,
        )}
      </div>
    `;
  }

  //-----------------------------------------------------------------------------
  // RENDERING HELPERS (UI FIELD GENERATORS)
  //-----------------------------------------------------------------------------

  addTextField(
    name: string,
    label?: string,
    type?: string,
    defaultValue?: string,
  ): TemplateResult {
    let value = this.getConfigValue(name, defaultValue);

    if (value === undefined) {
      value = '';
    } else if (typeof value === 'object') {
      value = JSON.stringify(value);
    } else {
      value = String(value);
    }

    return html`
      <ha-textfield
        name="${name}"
        label="${label ?? name}"
        type="${type ?? 'text'}"
        .value="${value}"
        @change="${this._valueChanged}"
        @keyup="${this._valueChanged}"
      ></ha-textfield>
    `;
  }

  addEntityPickerField(
    name: string,
    label?: string,
    includeDomains?: string[],
    defaultValue?: string,
  ): TemplateResult {
    return html`
      <ha-entity-picker
        .hass="${this.hass}"
        name="${name}"
        label="${label ?? name}"
        .value="${this.getConfigValue(name, defaultValue)}"
        .includeDomains="${includeDomains}"
        @value-changed="${(e: CustomEvent) => {
          e.stopPropagation();
          this.setConfigValue(name, e.detail.value);
        }}"
      ></ha-entity-picker>
    `;
  }

  addBooleanField(
    name: string,
    label?: string,
    defaultValue?: boolean,
  ): TemplateResult {
    return html`
      <ha-formfield label="${label ?? name}">
        <ha-switch
          name="${name}"
          .checked="${this.getConfigValue(name, defaultValue)}"
          @change="${this._valueChanged}"
        ></ha-switch>
      </ha-formfield>
    `;
  }

  addSelectField(
    name: string,
    label?: string,
    options?: Array<{ value: string; label: string }>,
    clearable?: boolean,
    defaultValue?: string,
  ): TemplateResult {
    const configValue = this.getConfigValue(name, defaultValue);
    const value: string | null =
      configValue === undefined ||
      configValue === null ||
      String(configValue) === ''
        ? null
        : String(configValue);

    return html`
      <ha-select
        name="${name}"
        label="${label ?? name}"
        .value="${value}"
        .clearable="${clearable ?? false}"
        @change="${this._valueChanged}"
        @closed="${(event: Event) => event.stopPropagation()}"
      >
        ${options?.map(
          (option) => html`
            <mwc-list-item value="${option.value}"
              >${option.label}</mwc-list-item
            >
          `,
        )}
      </ha-select>
    `;
  }

  addIconPickerField(
    name: string,
    label?: string,
    placeholder: string = 'mdi:cancel',
  ): TemplateResult {
    return html`
      <ha-icon-picker
        .hass="${this.hass}"
        name="${name}"
        label="${label ?? name}"
        placeholder="${placeholder}"
        .value="${this.getConfigValue(name)}"
        @value-changed="${(event: CustomEvent<{ value: string }>) => {
          this.setConfigValue(name, event.detail.value);
        }}"
      ></ha-icon-picker>
    `;
  }

  addExpansionPanel(
    header: string | TemplateResult,
    icon: string,
    content: TemplateResult,
    expanded?: boolean,
    extra?: TemplateResult,
  ): TemplateResult {
    return html`
      <ha-expansion-panel .expanded="${expanded ?? false}" outlined>
        <ha-icon slot="leading-icon" icon="${icon}"></ha-icon>
        ${typeof header === 'string'
          ? html`<span slot="header">${header}</span>`
          : html`<div slot="header" class="expansion-panel-header">
              ${header}
            </div>`}
        <div class="panel-content">${content}</div>
      </ha-expansion-panel>
      ${extra ? extra : ''}
    `;
  }

  addButton(
    text: string,
    icon: string,
    clickFunction: () => void,
  ): TemplateResult {
    return html`
      <ha-button @click="${clickFunction}">
        <ha-icon icon="${icon}"></ha-icon>
        ${text}
      </ha-button>
    `;
  }

  addIconButton(
    icon: string,
    clickFunction: () => void,
    title?: string,
    disabled?: boolean,
  ): TemplateResult {
    return html`
      <ha-icon-button
        @click="${(e: Event) => {
          e.stopPropagation();
          if (!disabled) {
            clickFunction();
          }
        }}"
        .title="${title ?? ''}"
        .disabled="${disabled ?? false}"
      >
        <ha-icon icon="${icon}"></ha-icon>
      </ha-icon-button>
    `;
  }

  //-----------------------------------------------------------------------------
  // DATETIME FORMAT FIELD RENDERING
  //-----------------------------------------------------------------------------

  /**
   * Renders date format fields for primary or secondary date format
   */
  _renderDateFormatFields(configPath: string): TemplateResult {
    return html`
      <div class="format-fields">
        ${this.addSelectField(
          `${configPath}.weekday`,
          'Weekday',
          [
            { value: 'narrow', label: 'Narrow (M, T, W)' },
            { value: 'short', label: 'Short (Mon, Tue, Wed)' },
            { value: 'long', label: 'Long (Monday, Tuesday)' },
          ],
          true,
        )}
        ${this.addSelectField(
          `${configPath}.day`,
          'Day',
          [
            { value: 'numeric', label: 'Numeric (15)' },
            { value: '2-digit', label: '2-digit (05)' },
          ],
          true,
        )}
        ${this.addSelectField(
          `${configPath}.month`,
          'Month',
          [
            { value: 'numeric', label: 'Numeric (3)' },
            { value: '2-digit', label: '2-digit (03)' },
            { value: 'narrow', label: 'Narrow (M)' },
            { value: 'short', label: 'Short (Mar)' },
            { value: 'long', label: 'Long (March)' },
          ],
          true,
        )}
        ${this.addSelectField(
          `${configPath}.year`,
          'Year',
          [
            { value: 'numeric', label: 'Numeric (2024)' },
            { value: '2-digit', label: '2-digit (24)' },
          ],
          true,
        )}
      </div>
    `;
  }

  /**
   * Renders time format fields with support for both string and object formats
   */
  _renderTimeFormatFields(): TemplateResult {
    const timeFormat = this.getConfigValue('time_format') as
      | string
      | Intl.DateTimeFormatOptions
      | undefined;

    const formatType = this._timeFormatType;

    return html`
      <div class="format-fields">
        ${this.addSelectField(
          'time_format_type',
          'Format Type',
          [
            { value: 'string', label: 'String Pattern (Legacy)' },
            { value: 'object', label: 'Structured Options (Recommended)' },
          ],
          false,
          formatType,
        )}
        ${formatType === 'string'
          ? html`
              <div class="helper-text">
                Use tokens: H (0-23), HH (00-23), h (1-12), hh (01-12), m
                (0-59), mm (00-59), a (am/pm), A (AM/PM)
              </div>
              ${this.addTextField(
                'time_format',
                'Time Format Pattern',
                'text',
                typeof timeFormat === 'string' ? timeFormat : 'h A',
              )}
              <div class="helper-text">
                Examples: "h A" → "9 AM", "HH:mm" → "09:00", "hh:mm A" → "09:00
                AM"
              </div>
            `
          : html`
              ${this.addSelectField(
                'time_format.hour',
                'Hour',
                [
                  { value: 'numeric', label: 'Numeric (9)' },
                  { value: '2-digit', label: '2-digit (09)' },
                ],
                true,
              )}
              ${this.addSelectField(
                'time_format.minute',
                'Minute',
                [
                  { value: 'numeric', label: 'Numeric (5)' },
                  { value: '2-digit', label: '2-digit (05)' },
                ],
                true,
              )}
              ${this.addSelectField(
                'time_format.second',
                'Second',
                [
                  { value: 'numeric', label: 'Numeric (30)' },
                  { value: '2-digit', label: '2-digit (30)' },
                ],
                true,
              )}
              ${this.addSelectField(
                'time_format.hour12',
                '12/24 Hour Format',
                [
                  { value: 'true', label: '12-hour (AM/PM)' },
                  { value: 'false', label: '24-hour' },
                ],
                true,
              )}
            `}
      </div>
    `;
  }

  //-----------------------------------------------------------------------------
  // CRITERIA ARRAY RENDERING & MANAGEMENT
  //-----------------------------------------------------------------------------

  /**
   * Renders a criteria array field (under/over/hide)
   */
  _renderCriteriaArray(
    configPath: string,
    label: string,
    description: string,
  ): TemplateResult {
    const criteria =
      (this.getConfigValue(configPath, []) as Array<
        string | Record<string, unknown>
      >) || [];

    return html`
      <div class="criteria-array-section">
        <h4>${label}</h4>
        <div class="helper-text">${description}</div>
        ${criteria.map((item, itemIndex) =>
          this._renderCriteriaItem(configPath, item, itemIndex),
        )}
        ${this.addButton(`Add ${label} Criteria`, 'mdi:plus', () =>
          this._addCriteriaItem(configPath),
        )}
      </div>
    `;
  }

  /**
   * Renders a single criteria item (string or object)
   */
  _renderCriteriaItem(
    configPath: string,
    item: string | Record<string, unknown>,
    itemIndex: number,
  ): TemplateResult {
    const isString = typeof item === 'string';
    const itemPath = `${configPath}.${itemIndex}`;
    const itemObj = isString ? {} : (item as Record<string, unknown>);

    return html`
      <div class="criteria-item">
        <div class="criteria-item-header">
          ${this.addSelectField(
            `${itemPath}.__type`,
            'Type',
            [
              { value: 'string', label: 'Simple (Name)' },
              { value: 'object', label: 'Detailed (Criteria)' },
            ],
            false,
            isString ? 'string' : 'object',
          )}
          ${this.addButton('Remove', 'mdi:delete', () =>
            this._removeCriteriaItem(configPath, itemIndex),
          )}
        </div>
        ${isString
          ? html`
              ${this.addTextField(
                itemPath,
                'Event Name',
                'text',
                item as string,
              )}
              <div class="helper-text">Match events by entity name</div>
            `
          : html`
              <div class="criteria-object-fields">
                ${this.addTextField(
                  `${itemPath}.name`,
                  'Name',
                  'text',
                  (itemObj.name as string) || '',
                )}
                ${this.addTextField(
                  `${itemPath}.entity`,
                  'Entity',
                  'text',
                  (itemObj.entity as string) || '',
                )}
                ${this.addTextField(
                  `${itemPath}.filter`,
                  'Filter',
                  'text',
                  (itemObj.filter as string) || '',
                )}
                <div class="helper-text">
                  Match events by any combination of criteria (all must match)
                </div>
              </div>
            `}
      </div>
    `;
  }

  /**
   * Adds a new criteria item to the array
   */
  _addCriteriaItem(configPath: string): void {
    const criteria =
      (this.getConfigValue(configPath, []) as Array<
        string | Record<string, unknown>
      >) || [];
    criteria.push('');
    this.setConfigValue(configPath, criteria);
  }

  /**
   * Removes a criteria item from the array
   */
  _removeCriteriaItem(configPath: string, itemIndex: number): void {
    const criteria =
      (this.getConfigValue(configPath, []) as Array<
        string | Record<string, unknown>
      >) || [];
    criteria.splice(itemIndex, 1);
    if (criteria.length === 0) {
      this.setConfigValue(configPath, undefined);
    } else {
      this.setConfigValue(configPath, criteria);
    }
  }

  //-----------------------------------------------------------------------------
  // CALENDAR ENTITY RENDERING & MANAGEMENT
  //-----------------------------------------------------------------------------

  /**
   * Gets entity information from Home Assistant
   */
  private _getEntityInfo(entityId: string): {
    calendarName: string;
    deviceName: string;
  } {
    if (!this.hass || !entityId) {
      return { calendarName: entityId || '', deviceName: '' };
    }

    const state = this.hass?.states[entityId];

    // 1. Get the full friendly name
    const fullString = state?.attributes?.friendly_name || '';

    // 2. Find the Device Name via the hass object registries
    const entityReg = this.hass.entities[entityId];
    const deviceReg =
      entityReg && entityReg.device_id
        ? this.hass.devices[entityReg.device_id]
        : null;
    const deviceName = deviceReg
      ? deviceReg.name_by_user || deviceReg.name
      : '';

    // 3. Calculate the Calendar Name by removing the Device Name
    // We replace "DeviceName " (note the space) with empty string
    const calendarName = fullString?.replace(deviceName, '').trim();

    return { calendarName, deviceName };
  }

  /**
   * Renders a structured multiline header for entity expansion panel
   */
  private _renderEntityHeader(
    entity: string | EntityConfig,
    managementButtons?: TemplateResult,
  ): TemplateResult {
    const isStringEntity = typeof entity === 'string';
    const entityId = isStringEntity ? entity : entity.entity;

    const { calendarName, deviceName } = this._getEntityInfo(entityId);

    const customFilter = !isStringEntity ? entity.filter : undefined;
    const customName = !isStringEntity
      ? entity.name || customFilter || calendarName
      : undefined;

    return html`
      <div class="entity-header">
        <div class="entity-header-content">
          <div class="entity-header-primary">
            ${customName
              ? html`<div class="entity-header-name">${customName}</div>`
              : ''}
            ${calendarName
              ? html`<div class="entity-header-entity">${calendarName}</div>`
              : ''}
          </div>
          <div class="entity-header-secondary">
            ${deviceName
              ? html`<div class="entity-header-id">${deviceName}</div>`
              : ''}
          </div>
        </div>
        ${managementButtons
          ? html`<div class="entity-header-buttons">${managementButtons}</div>`
          : ''}
      </div>
    `;
  }

  _renderCalendarEntity(
    entity: string | EntityConfig,
    index: number,
  ): TemplateResult {
    const isStringEntity = typeof entity === 'string';

    const entities = this._config?.entities || [];
    const canMoveUp = index > 0;
    const canMoveDown = index < entities.length - 1;

    const managementButtons = html`
      ${this.addIconButton(
        'mdi:arrow-up',
        () => this._moveEntityUp(index),
        'Move up',
        !canMoveUp,
      )}
      ${this.addIconButton(
        'mdi:arrow-down',
        () => this._moveEntityDown(index),
        'Move down',
        !canMoveDown,
      )}
      ${this.addIconButton(
        'mdi:trash-can',
        () => this._removeCalendarEntity(index),
        'Remove',
      )}
    `;

    const panelHeader = this._renderEntityHeader(entity, managementButtons);
    const isExpanded = this._expandedEntityIndex === index;

    return html`
      ${this.addExpansionPanel(
        panelHeader,
        'mdi:calendar',
        html`
          <!-- Entity Identification -->
          <div class="editor-section">
            <h4>Entity</h4>
            ${this.addEntityPickerField(
              `entities.${index}${isStringEntity ? '' : '.entity'}`,
              'Calendar Entity',
              ['calendar'],
            )}
          </div>

          ${!isStringEntity
            ? html`
                <!-- Entity Configuration -->
                <div class="editor-section">
                  <h4>Entity Settings</h4>
                  ${this.addTextField(`entities.${index}.name`, 'Name')}
                  <div class="helper-text">Name for this calendar entity</div>
                  ${this.addTextField(`entities.${index}.filter`, 'Filter')}
                  <div class="helper-text">
                    Filter events by text in summary
                  </div>
                  ${this.addIconPickerField(`entities.${index}.icon`, 'Icon')}
                  <div class="helper-text">
                    Icon for events from this entity
                  </div>
                  ${this._renderThemeVariables(index)}
                </div>

                <!-- Advanced Event Control -->
                ${this.addExpansionPanel(
                  'Advanced Event Control',
                  'mdi:code-braces',
                  html`
                    <div class="helper-text">
                      Control event layering and visibility. Each item can be a
                      simple name (string) or detailed criteria (object).
                    </div>
                    ${this._renderCriteriaArray(
                      `entities.${index}.hide`,
                      'Hide',
                      'Events to hide when this event is present',
                    )}
                    ${this._renderCriteriaArray(
                      `entities.${index}.under`,
                      'Under',
                      'Events to render underneath this one',
                    )}
                    ${this._renderCriteriaArray(
                      `entities.${index}.over`,
                      'Over',
                      'Events to render on top of this one',
                    )}
                  `,
                  false,
                )}
              `
            : html``}

          <!-- Entity Action Buttons -->
          ${isStringEntity
            ? html`
                <div class="editor-section button-section">
                  ${this.addButton('Convert to Advanced', 'mdi:code-json', () =>
                    this._convertEntityToObject(index),
                  )}
                </div>
              `
            : html``}
        `,
        isExpanded,
      )}
    `;
  }

  _renderCalendarEntities(): TemplateResult {
    const entities = this._config?.entities || [];

    return html`
      ${entities.map((entity, index) =>
        this._renderCalendarEntity(entity, index),
      )}
      <div class="button-group">
        ${this.addButton('Add Calendar', 'mdi:plus', () =>
          this._addCalendarEntity(),
        )}
        ${entities.length > 0
          ? this.addButton('Remove All', 'mdi:delete-sweep', () =>
              this._removeAllCalendarEntities(),
            )
          : ''}
      </div>
    `;
  }

  _addCalendarEntity(): void {
    const entities = [...(this._config?.entities || [])];
    const newIndex = entities.length;

    // Get example by entity index and apply theme values
    const example = this._getExampleByEntityIndex(newIndex);
    const newEntity = example
      ? this._applyThemeValuesToEntity('', example)
      : '';

    entities.push(newEntity);
    this.setConfigValue('entities', entities);
    // Auto-expand the newly added entity
    this._expandedEntityIndex = newIndex;
  }

  _removeCalendarEntity(index: number): void {
    this._collapseAllEntityPanels();
    const entities = [...(this._config?.entities || [])];
    entities.splice(index, 1);
    this.setConfigValue('entities', entities);
  }

  _removeAllCalendarEntities(): void {
    this._collapseAllEntityPanels();
    this.setConfigValue('entities', []);
  }

  _moveEntityUp(index: number): void {
    if (index <= 0) return;
    this._collapseAllEntityPanels();
    const entities = [...(this._config?.entities || [])];
    const temp = entities[index];
    entities[index] = entities[index - 1];
    entities[index - 1] = temp;
    this.setConfigValue('entities', entities);
  }

  _moveEntityDown(index: number): void {
    const entities = [...(this._config?.entities || [])];
    if (index >= entities.length - 1) return;
    this._collapseAllEntityPanels();
    const temp = entities[index];
    entities[index] = entities[index + 1];
    entities[index + 1] = temp;
    this.setConfigValue('entities', entities);
  }

  _collapseAllEntityPanels(): void {
    this._expandedEntityIndex = null;
    // Use requestAnimationFrame to ensure DOM is updated after config change
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Find all expansion panels
        const allPanels =
          this.shadowRoot?.querySelectorAll('ha-expansion-panel');

        if (allPanels) {
          allPanels.forEach((panel) => {
            // Check if this panel has .entity-header directly in its header slot
            // (not nested in parent panels)
            const headerSlot = panel.querySelector('[slot="header"]');
            const entityHeader = headerSlot?.querySelector('.entity-header');

            if (entityHeader) {
              // Only collapse panels that have .entity-header directly in their header
              if (panel instanceof HTMLElement && 'expanded' in panel) {
                panel.expanded = false;

                // Also collapse all nested expansion panels within this entity panel
                const nestedPanels = panel.querySelectorAll(
                  '.panel-content ha-expansion-panel',
                );
                nestedPanels.forEach((nestedPanel) => {
                  if (
                    nestedPanel instanceof HTMLElement &&
                    'expanded' in nestedPanel
                  ) {
                    nestedPanel.expanded = false;
                  }
                });
              }
            }
          });
        }
      });
    });
  }

  _convertEntityToObject(index: number): void {
    const entities = [...(this._config?.entities || [])];
    const entityValue = entities[index] as string;
    entities[index] = { entity: entityValue };
    this.setConfigValue('entities', entities);
  }

  //-----------------------------------------------------------------------------
  // THEME MANAGEMENT
  //-----------------------------------------------------------------------------

  /**
   * Compares two values for equality, handling type conversions
   * (e.g., string "0.3" equals number 0.3)
   */
  private _valuesAreEqual(a: unknown, b: unknown): boolean {
    // Strict equality check first
    if (a === b) {
      return true;
    }

    // If either is undefined, they're not equal (unless both are, caught above)
    if (a === undefined || b === undefined) {
      return false;
    }

    // Convert both to strings and compare
    const aStr = String(a);
    const bStr = String(b);

    // String comparison
    if (aStr === bStr) {
      return true;
    }

    // Try numeric comparison if both can be parsed as numbers
    const aNum = parseFloat(aStr);
    const bNum = parseFloat(bStr);
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return aNum === bNum;
    }

    return false;
  }

  /**
   * Gets theme_values_examples entry by entity index (cycling with modulo)
   */
  private _getExampleByEntityIndex(
    entityIndex: number,
  ): Record<string, unknown> | undefined {
    if (!this._config) {
      return undefined;
    }
    const themeManager = new ThemeManager(
      this._config,
      themes,
      this._selectedTheme,
    );
    return themeManager.getExampleByEntityIndex(entityIndex);
  }

  /**
   * Detects which theme is currently selected based on CSS content
   */
  private _detectSelectedTheme(): void {
    if (!this._config) {
      this._selectedTheme = 'custom';
      return;
    }
    const themeManager = new ThemeManager(
      this._config,
      themes,
      this._selectedTheme,
    );
    this._selectedTheme = themeManager.detectSelectedTheme();
  }

  /**
   * Get the display name for the currently selected theme
   */
  private get _selectedThemeName(): string {
    if (this._selectedTheme === 'custom') {
      return 'Custom';
    }
    const theme = themes.find((t) => t.id === this._selectedTheme);
    return theme?.name || 'Custom';
  }

  /**
   * Apply theme values from example to a single entity
   */
  private _applyThemeValuesToEntity(
    entity: string | EntityConfig,
    example: Record<string, unknown>,
  ): string | EntityConfig {
    if (!this._config) {
      return entity;
    }
    const themeManager = new ThemeManager(
      this._config,
      themes,
      this._selectedTheme,
    );
    return themeManager.applyThemeValuesToEntity(entity, example);
  }

  /**
   * Archives current theme_values for all entities and configs
   */
  private _archiveCurrentThemeValues(themeId: string): void {
    if (!this._config) {
      return;
    }

    const entities = this._config.entities || [];
    if (entities.length > 0) {
      const themeManager = new ThemeManager(
        this._config,
        themes,
        this._selectedTheme,
      );
      const updatedEntities = themeManager.archiveEntityThemeValues(
        entities,
        themeId,
      );
      this.setConfigValue('entities', updatedEntities);
    }

    this._archiveConfigThemeValues('event', themeId);
    this._archiveConfigThemeValues('blank_event', themeId);
    this._archiveConfigThemeValues('blank_all_day_event', themeId);
  }

  /**
   * Archives theme_values for a specific config (event, blank_event, blank_all_day_event)
   * Only archives values that differ from the theme's example values
   */
  private _archiveConfigThemeValues(
    configKey: 'event' | 'blank_event' | 'blank_all_day_event',
    themeId: string,
  ): void {
    const config = this.getConfigValue(configKey) as
      | DefaultEventConfig
      | undefined;
    if (
      !config ||
      !config.theme_values ||
      Object.keys(config.theme_values).length === 0
    ) {
      return;
    }

    // Get example values from the theme
    const theme = themes.find((t) => t.id === themeId);
    const exampleThemeValues = theme?.config[configKey] as
      | { theme_values?: Record<string, unknown> }
      | undefined;

    const archivePath = `${configKey}.theme_values_archive.${themeId}`;
    const currentArchive = this.getConfigValue(archivePath, {}) as Record<
      string,
      unknown
    >;

    // Only archive values that differ from examples
    const valuesToArchive: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(config.theme_values)) {
      const exampleValue = exampleThemeValues?.theme_values?.[key];
      // Archive if value differs from example (using type-aware comparison)
      if (!this._valuesAreEqual(value, exampleValue)) {
        valuesToArchive[key] = value;
      }
    }

    if (Object.keys(valuesToArchive).length > 0) {
      const updatedArchive = { ...currentArchive, ...valuesToArchive };
      this.setConfigValue(archivePath, updatedArchive);
    }
  }

  /**
   * Restores archived theme_values for a specific config if available
   */
  private _restoreEventConfigThemeValues(
    configKey: 'event' | 'blank_event' | 'blank_all_day_event',
    themeId: string,
  ): void {
    const archivePath = `${configKey}.theme_values_archive.${themeId}`;
    const archivedValues = this.getConfigValue(archivePath) as
      | Record<string, unknown>
      | undefined;

    if (archivedValues && Object.keys(archivedValues).length > 0) {
      // Restore archived values
      this.setConfigValue(`${configKey}.theme_values`, archivedValues);
    }
  }

  /**
   * Apply properties from theme_values_examples to existing entities
   */
  private _applyThemeValuesExamplesToEntities(themeId?: string): void {
    if (!this._config) {
      return;
    }

    const entities = this._config.entities || [];
    if (entities.length === 0) {
      return;
    }

    const themeManager = new ThemeManager(
      this._config,
      themes,
      this._selectedTheme,
    );
    const updatedEntities = themeManager.applyThemeValuesExamplesToEntities(
      entities,
      themeId,
    );
    this.setConfigValue('entities', updatedEntities);
  }

  /**
   * Removes theme_values from all entities before applying new theme
   */
  private _removeObsoleteThemeVariables(): void {
    if (!this._config) {
      return;
    }

    const entities = this._config.entities || [];
    if (entities.length === 0) {
      return;
    }

    const updatedEntities = ThemeManager.removeObsoleteThemeVariables(entities);
    this.setConfigValue('entities', updatedEntities);
  }

  /**
   * Renders fields for entity variables defined in theme_variables config
   * Values are stored in theme_values nested object
   */
  private _renderThemeVariables(entityIndex: number): TemplateResult {
    const themeVariables = this.getConfigValue('theme_variables', {}) as Record<
      string,
      ThemeVariable
    >;

    return html`
      ${Object.entries(themeVariables).map(([varKey, varConfig]) => {
        const varName = varConfig?.name || varKey;
        const varDescription = varConfig?.description || '';
        return html`
          ${this.addTextField(
            `entities.${entityIndex}.theme_values.${varKey}`,
            varName,
          )}
          <div class="helper-text" style="color: var(--primary-text-color);">
            Theme: ${this._selectedThemeName}
          </div>
          ${varDescription
            ? html`<div class="helper-text">${varDescription}</div>`
            : ''}
        `;
      })}
    `;
  }

  /**
   * Renders fields for theme variables defined in theme_variables config
   * Used for event, blank_event, and blank_all_day_event configs
   * Values are stored in theme_values nested object
   */
  private _renderThemeConfigVariables(
    configPath: 'event' | 'blank_event' | 'blank_all_day_event',
  ): TemplateResult {
    const themeVariables = this.getConfigValue('theme_variables', {}) as Record<
      string,
      ThemeVariable
    >;

    return html`
      ${Object.entries(themeVariables).map(([varKey, varConfig]) => {
        const varName = varConfig?.name || varKey;
        const varDescription = varConfig?.description || '';
        return html`
          ${this.addTextField(`${configPath}.theme_values.${varKey}`, varName)}
          <div class="helper-text" style="color: var(--primary-text-color);">
            Theme: ${this._selectedThemeName}
          </div>
          ${varDescription
            ? html`<div class="helper-text">${varDescription}</div>`
            : ''}
        `;
      })}
    `;
  }

  /**
   * Handles CSS changes from the code editor
   */
  private _handleCssChange(newCss: string): void {
    this.setConfigValue('css', newCss);
    this._detectSelectedTheme();
  }
}
