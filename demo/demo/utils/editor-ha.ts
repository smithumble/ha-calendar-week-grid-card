/**
 * Utilities for running the visual editor in the demo environment
 * Creates mock Home Assistant components and provides editor setup
 */

import type {
  HomeAssistant,
  HassEntities,
  CardConfig,
} from '../../../src/types';
import type { Calendar } from './data';

/**
 * Creates a mock Home Assistant object for the visual editor
 */
export function createMockHassForEditor(
  config: CardConfig,
  calendars: Calendar[],
  darkMode: boolean = false,
): HomeAssistant {
  // Create states object with calendar entities
  const states: HassEntities = {};
  calendars.forEach((calendar) => {
    const now = new Date().toISOString();
    states[calendar.entity_id] = {
      entity_id: calendar.entity_id,
      state: 'on',
      last_changed: now,
      last_updated: now,
      attributes: {
        friendly_name: calendar.entity_id
          .replace('calendar.', '')
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (letter: string) => letter.toUpperCase()),
      },
      context: {
        id: '',
        user_id: null,
        parent_id: null,
      },
    };
  });

  return {
    language: config.language || 'en',
    config: { time_zone: 'Europe/Kiev' },
    themes: {
      darkMode: darkMode,
    },
    states: states,
    entities: {},
    devices: {},
    callApi: async (_method: string, path: string) => {
      if (!path.startsWith('calendars/')) return [];
      const calendarId = decodeURIComponent(
        path.split('/')[1]?.split('?')[0] || '',
      );
      const calendar = calendars.find((c) => c.entity_id === calendarId);
      return calendar ? calendar.events : [];
    },
  } as unknown as HomeAssistant;
}

/**
 * Mocks Home Assistant custom elements needed by the visual editor
 */
export function mockHaEditorComponents(): void {
  // Mock ha-textfield
  if (!customElements.get('ha-textfield')) {
    customElements.define(
      'ha-textfield',
      class extends HTMLElement {
        private input: HTMLInputElement;
        constructor() {
          super();
          this.input = document.createElement('input');
          this.input.type = this.getAttribute('type') || 'text';
          this.attachShadow({ mode: 'open' });
        }
        private _value: string = '';

        connectedCallback() {
          if (this.shadowRoot) {
            const label = this.getAttribute('label') || '';
            this.shadowRoot.innerHTML = `
              <style>
                :host {
                  display: block;
                  width: 100%;
                  max-width: 100%;
                }
                label {
                  display: block;
                  margin-bottom: 4px;
                  font-size: 12px;
                  font-weight: 500;
                  color: var(--primary-text-color);
                  font-family: var(--mdc-typography-body1-font-family, Roboto, sans-serif);
                }
                input {
                  width: 100%;
                  height: 46px;
                  max-width: 500px;
                  box-sizing: border-box;
                  padding: 8px 12px;
                  border: none;
                  border-bottom: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
                  border-radius: 0px;
                  font-size: 14px;
                  background-color: var(--mdc-text-field-fill-color, var(--card-background-color));
                  color: var(--primary-text-color);
                  font-family: var(--mdc-typography-body1-font-family, Roboto, sans-serif);
                }
                input:focus {
                  border-bottom-color: var(--primary-color);
                  outline: none;
                }
                input::placeholder {
                  color: var(--secondary-text-color);
                  opacity: 0.6;
                }
              </style>
              ${label ? `<label>${label}</label>` : ''}
            `;
            this.shadowRoot.appendChild(this.input);
            const value = this._value || this.getAttribute('value') || '';
            this.input.value = value;
            this.input.addEventListener('input', () => {
              this._value = this.input.value;
              this.dispatchEvent(
                new CustomEvent('change', { bubbles: true, composed: true }),
              );
            });
            this.input.addEventListener('keyup', () => {
              this._value = this.input.value;
              this.dispatchEvent(
                new CustomEvent('keyup', { bubbles: true, composed: true }),
              );
            });
          }
        }
        get value() {
          return this.input?.value || this._value || '';
        }
        set value(val: string) {
          this._value = val || '';
          if (this.input) {
            this.input.value = this._value;
          }
        }
        static get observedAttributes() {
          return ['value', 'type'];
        }
        attributeChangedCallback(name: string, _old: string, newVal: string) {
          if (name === 'value') {
            this._value = newVal || '';
            if (this.input) {
              this.input.value = this._value;
            }
          } else if (name === 'type' && this.input) {
            this.input.type = newVal || 'text';
          }
        }
      },
    );
  }

  // Mock ha-select
  if (!customElements.get('ha-select')) {
    customElements.define(
      'ha-select',
      class extends HTMLElement {
        private select: HTMLSelectElement;
        private _value: string | null = null;
        private _clearable: boolean = false;
        constructor() {
          super();
          this.select = document.createElement('select');
          this.attachShadow({ mode: 'open' });
        }
        private _observer: MutationObserver | null = null;

        connectedCallback() {
          if (this.shadowRoot && !this._observer) {
            const label = this.getAttribute('label') || '';
            this.shadowRoot.innerHTML = `
              <style>
                :host {
                  display: block;
                  width: 100%;
                  max-width: 100%;
                }
                label {
                  display: block;
                  margin-bottom: 4px;
                  font-size: 12px;
                  font-weight: 500;
                  color: var(--primary-text-color);
                  font-family: var(--mdc-typography-body1-font-family, Roboto, sans-serif);
                }
                select {
                  width: 100%;
                  height: 46px;
                  max-width: 500px;
                  box-sizing: border-box;
                  padding: 8px 12px;
                  padding-right: 32px;
                  border: none;
                  border-bottom: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
                  border-radius: 0px;
                  font-size: 14px;
                  background-color: var(--mdc-text-field-fill-color, var(--card-background-color));
                  color: var(--primary-text-color);
                  font-family: var(--mdc-typography-body1-font-family, Roboto, sans-serif);
                  cursor: pointer;
                  -webkit-appearance: none;
                  -moz-appearance: none;
                  appearance: none;
                  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M6 8L0 0h12z' fill='%23666'/%3E%3C/svg%3E");
                  background-repeat: no-repeat;
                  background-position: right 8px center;
                  background-size: 12px 8px;
                }
                select:focus {
                  border-bottom-color: var(--primary-color);
                  outline: none;
                }
                select option {
                  background-color: var(--card-background-color, var(--primary-background-color));
                  color: var(--primary-text-color);
                }
              </style>
              ${label ? `<label>${label}</label>` : ''}
            `;
            this.shadowRoot.appendChild(this.select);

            // Update options after a short delay to allow Lit to render children
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                this.updateOptions();
                const value =
                  this._value !== null
                    ? this._value
                    : this.getAttribute('value') || '';
                if (value) this.select.value = value;
              });
            });

            this.select.addEventListener('change', () => {
              this._value = this.select.value;
              this.dispatchEvent(
                new CustomEvent('change', { bubbles: true, composed: true }),
              );
            });
            this.select.addEventListener('click', (e) => {
              e.stopPropagation();
            });

            // Observe changes to child elements (mwc-list-item)
            this._observer = new MutationObserver(() => {
              this.updateOptions();
            });
            this._observer.observe(this, {
              childList: true,
              subtree: true,
            });
          }
        }

        disconnectedCallback() {
          if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
          }
        }

        updateOptions() {
          if (!this.select) return;

          // Get mwc-list-item children from light DOM
          const listItems = Array.from(this.querySelectorAll('mwc-list-item'));
          const currentValue = this.select.value;

          this.select.innerHTML = '';

          // Add empty option if clearable
          if (this._clearable) {
            const emptyOption = document.createElement('option');
            emptyOption.value = '';
            emptyOption.textContent = '';
            this.select.appendChild(emptyOption);
          }

          // Add options from mwc-list-item elements
          listItems.forEach((item) => {
            const option = document.createElement('option');
            option.value = item.getAttribute('value') || '';
            option.textContent = item.textContent || option.value;
            this.select.appendChild(option);
          });

          // Restore value if it still exists
          if (
            currentValue &&
            Array.from(this.select.options).some(
              (opt) => opt.value === currentValue,
            )
          ) {
            this.select.value = currentValue;
          } else if (
            this._value &&
            Array.from(this.select.options).some(
              (opt) => opt.value === this._value,
            )
          ) {
            this.select.value = this._value;
          }
        }

        get value() {
          return this.select?.value || this._value || '';
        }
        set value(val: string | null) {
          this._value = val;
          if (this.select) {
            this.select.value = val || '';
          }
        }
        get clearable() {
          return this._clearable;
        }
        set clearable(val: boolean) {
          this._clearable = val;
          this.updateOptions();
        }
        static get observedAttributes() {
          return ['value', 'clearable'];
        }
        attributeChangedCallback(name: string, _old: string, newVal: string) {
          if (name === 'value') {
            this._value = newVal || null;
            if (this.select) {
              this.select.value = newVal || '';
            }
          } else if (name === 'clearable') {
            this._clearable = this.hasAttribute('clearable');
            this.updateOptions();
          }
        }
      },
    );
  }

  // Mock ha-switch
  if (!customElements.get('ha-switch')) {
    customElements.define(
      'ha-switch',
      class extends HTMLElement {
        private checkbox: HTMLInputElement;
        constructor() {
          super();
          this.checkbox = document.createElement('input');
          this.checkbox.type = 'checkbox';
          this.attachShadow({ mode: 'open' });
        }
        connectedCallback() {
          if (this.shadowRoot) {
            this.shadowRoot.innerHTML = `
              <style>
                :host {
                  display: inline-block;
                }
                input[type="checkbox"] {
                  width: 20px;
                  height: 20px;
                  cursor: pointer;
                  accent-color: var(--primary-color);
                }
              </style>
            `;
            this.shadowRoot.appendChild(this.checkbox);
            const checked = this.hasAttribute('checked');
            this.checkbox.checked = checked;
            this.checkbox.addEventListener('change', () => {
              this.dispatchEvent(
                new CustomEvent('change', { bubbles: true, composed: true }),
              );
            });
          }
        }
        get checked() {
          return this.checkbox?.checked || false;
        }
        set checked(val: boolean) {
          if (this.checkbox) this.checkbox.checked = val;
        }
        static get observedAttributes() {
          return ['checked'];
        }
        attributeChangedCallback(name: string) {
          if (name === 'checked' && this.checkbox) {
            this.checkbox.checked = this.hasAttribute('checked');
          }
        }
      },
    );
  }

  // Mock ha-formfield
  if (!customElements.get('ha-formfield')) {
    customElements.define(
      'ha-formfield',
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
                  margin: 8px 0;
                }
                label {
                  display: flex;
                  align-items: center;
                  gap: 8px;
                  color: var(--primary-text-color);
                  font-family: var(--mdc-typography-body1-font-family, Roboto, sans-serif);
                }
              </style>
              <label>
                <slot></slot>
                <span>${this.getAttribute('label') || ''}</span>
              </label>
            `;
          }
        }
      },
    );
  }

  // Mock ha-entity-picker
  if (!customElements.get('ha-entity-picker')) {
    customElements.define(
      'ha-entity-picker',
      class extends HTMLElement {
        private select: HTMLSelectElement;
        private _hass: HomeAssistant | null = null;
        private _value: string = '';
        constructor() {
          super();
          this.select = document.createElement('select');
          this.attachShadow({ mode: 'open' });
        }
        connectedCallback() {
          if (this.shadowRoot) {
            const label = this.getAttribute('label') || '';
            this.shadowRoot.innerHTML = `
              <style>
                :host {
                  display: block;
                  width: 100%;
                  max-width: 100%;
                }
                label {
                  display: block;
                  margin-bottom: 4px;
                  font-size: 12px;
                  font-weight: 500;
                  color: var(--primary-text-color);
                  font-family: var(--mdc-typography-body1-font-family, Roboto, sans-serif);
                }
                select {
                  width: 100%;
                  height: 46px;
                  max-width: 500px;
                  box-sizing: border-box;
                  padding: 8px 12px;
                  padding-right: 32px;
                  border: none;
                  border-bottom: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
                  border-radius: 0px;
                  font-size: 14px;
                  background-color: var(--mdc-text-field-fill-color, var(--card-background-color));
                  color: var(--primary-text-color);
                  font-family: var(--mdc-typography-body1-font-family, Roboto, sans-serif);
                  cursor: pointer;
                  -webkit-appearance: none;
                  -moz-appearance: none;
                  appearance: none;
                  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M6 8L0 0h12z' fill='%23666'/%3E%3C/svg%3E");
                  background-repeat: no-repeat;
                  background-position: right 8px center;
                  background-size: 12px 8px;
                }
                select:focus {
                  border-bottom-color: var(--primary-color);
                  outline: none;
                }
                select option {
                  background-color: var(--mdc-text-field-fill-color, var(--card-background-color));
                  color: var(--primary-text-color);
                }
              </style>
              ${label ? `<label>${label}</label>` : ''}
            `;
            this.shadowRoot.appendChild(this.select);
            this.updateOptions();
            const value = this._value || this.getAttribute('value') || '';
            if (value) this.select.value = value;
            this.select.addEventListener('change', () => {
              this._value = this.select.value;
              this.dispatchEvent(
                new CustomEvent('value-changed', {
                  bubbles: true,
                  composed: true,
                  detail: { value: this.select.value },
                }),
              );
            });
          }
        }
        set hass(hass: HomeAssistant | null) {
          this._hass = hass;
          this.updateOptions();
        }
        get hass() {
          return this._hass;
        }
        get value() {
          return this.select?.value || this._value || '';
        }
        set value(val: string) {
          this._value = val || '';
          if (this.select) {
            this.select.value = this._value;
          }
        }
        updateOptions() {
          if (!this.select) return;
          const includeDomains = this.getAttribute('includeDomains')?.split(
            ',',
          ) || ['calendar'];
          const states = this._hass?.states || {};
          const entities = Object.keys(states).filter((entityId) =>
            includeDomains.some((domain) => entityId.startsWith(`${domain}.`)),
          );
          const currentValue = this._value || this.select.value;
          this.select.innerHTML = `<option value="">None</option>${entities
            .map((e) => `<option value="${e}">${e}</option>`)
            .join('')}`;
          if (currentValue && entities.includes(currentValue)) {
            this.select.value = currentValue;
          } else if (this._value) {
            this.select.value = this._value;
          }
        }
        static get observedAttributes() {
          return ['value', 'includeDomains'];
        }
        attributeChangedCallback(name: string, _old: string, newVal: string) {
          if (name === 'value') {
            this._value = newVal || '';
            if (this.select) {
              this.select.value = this._value;
            }
          } else if (name === 'includeDomains') {
            this.updateOptions();
          }
        }
      },
    );
  }

  // Mock ha-icon-picker
  if (!customElements.get('ha-icon-picker')) {
    customElements.define(
      'ha-icon-picker',
      class extends HTMLElement {
        private input: HTMLInputElement;
        private _value: string = '';
        constructor() {
          super();
          this.input = document.createElement('input');
          this.input.type = 'text';
          this.attachShadow({ mode: 'open' });
        }
        connectedCallback() {
          if (this.shadowRoot) {
            const label = this.getAttribute('label') || '';
            const placeholder = this.getAttribute('placeholder') || 'mdi:icon';
            this.shadowRoot.innerHTML = `
              <style>
                :host {
                  display: block;
                  width: 100%;
                  max-width: 100%;
                }
                label {
                  display: block;
                  margin-bottom: 4px;
                  font-size: 12px;
                  font-weight: 500;
                  color: var(--primary-text-color);
                  font-family: var(--mdc-typography-body1-font-family, Roboto, sans-serif);
                }
                input {
                  width: 100%;
                  max-width: 500px;
                  height: 46px;
                  box-sizing: border-box;
                  padding: 8px 12px;
                  border: none;
                  border-bottom: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
                  border-radius: 0px;
                  font-size: 14px;
                  background-color: var(--mdc-text-field-fill-color, var(--card-background-color));
                  color: var(--primary-text-color);
                  font-family: var(--mdc-typography-body1-font-family, Roboto, sans-serif);
                }
                input:focus {
                  border-bottom-color: var(--primary-color);
                  outline: none;
                }
                input::placeholder {
                  color: var(--secondary-text-color);
                  opacity: 0.6;
                }
              </style>
              ${label ? `<label>${label}</label>` : ''}
            `;
            this.shadowRoot.appendChild(this.input);
            const value = this._value || this.getAttribute('value') || '';
            this.input.value = value;
            this.input.placeholder = placeholder;
            this.input.addEventListener('change', () => {
              this._value = this.input.value;
              this.dispatchEvent(
                new CustomEvent('value-changed', {
                  bubbles: true,
                  composed: true,
                  detail: { value: this.input.value },
                }),
              );
            });
          }
        }
        get value() {
          return this.input?.value || this._value || '';
        }
        set value(val: string) {
          this._value = val || '';
          if (this.input) {
            this.input.value = this._value;
          }
        }
        static get observedAttributes() {
          return ['value'];
        }
        attributeChangedCallback(name: string, _old: string, newVal: string) {
          if (name === 'value') {
            this._value = newVal || '';
            if (this.input) {
              this.input.value = this._value;
            }
          }
        }
      },
    );
  }

  // Mock ha-expansion-panel
  if (!customElements.get('ha-expansion-panel')) {
    customElements.define(
      'ha-expansion-panel',
      class extends HTMLElement {
        private _expanded: boolean = false;
        private _isUpdating: boolean = false;
        constructor() {
          super();
          this.attachShadow({ mode: 'open' });
        }
        connectedCallback() {
          // Check initial expanded state from attribute
          this._expanded = this.hasAttribute('expanded');
          this.updateRender();
        }
        updateRender() {
          if (!this.shadowRoot || this._isUpdating) return;
          this._isUpdating = true;

          const contentDisplay = this._expanded ? 'block' : 'none';
          this.shadowRoot.innerHTML = `
            <style>
              :host {
                display: block;
                border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
                border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg), 4px);
                margin: 8px 0;
                background-color: var(--card-background-color, var(--primary-background-color));
              }
              .top {
                display: flex;
                align-items: center;
                padding: 0 8px;
                min-height: 48px;
                cursor: pointer;
                user-select: none;
                border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg), 4px);
                color: var(--primary-text-color);
                transition: background-color 0.2s;
              }
              .top:hover {
                background-color: var(--hover-color);
              }
              .top.expanded {
                background-color: var(--hover-color);
                border-bottom-left-radius: 0px;
                border-bottom-right-radius: 0px;
              }
              .content {
                padding: 0 12px;
                display: ${contentDisplay};
                color: var(--primary-text-color);
              }
              ::slotted([slot="leading-icon"]), :host([left-chevron]) .summary-icon {
                  margin-left: 0px;
                  margin-right: 8px;
                  margin-inline: 0px 8px;
              }
            </style>
            <div class="top${this._expanded ? ' expanded' : ''}">
              <slot name="leading-icon"></slot>
              <slot name="header"></slot>
            </div>
            <div class="content">
              <slot></slot>
            </div>
          `;

          const header = this.shadowRoot.querySelector('.top');
          if (header) {
            // Remove old listeners by cloning the header
            const newHeader = header.cloneNode(true);
            header.parentNode?.replaceChild(newHeader, header);

            newHeader.addEventListener('click', () => {
              this._expanded = !this._expanded;
              this.updateRender();
            });
          }

          this._isUpdating = false;
        }
        set expanded(val: boolean) {
          if (this._expanded === val) return;
          this._expanded = val;
          if (val) {
            this.setAttribute('expanded', '');
          } else {
            this.removeAttribute('expanded');
          }
          this.updateRender();
        }
        get expanded() {
          return this._expanded;
        }
        static get observedAttributes() {
          return ['expanded'];
        }
        attributeChangedCallback(name: string) {
          if (name === 'expanded' && !this._isUpdating) {
            const shouldBeExpanded = this.hasAttribute('expanded');
            if (this._expanded !== shouldBeExpanded) {
              this._expanded = shouldBeExpanded;
              this.updateRender();
            }
          }
        }
      },
    );
  }

  // Mock ha-code-editor
  if (!customElements.get('ha-code-editor')) {
    customElements.define(
      'ha-code-editor',
      class extends HTMLElement {
        private textarea: HTMLTextAreaElement;
        private _value: string = '';
        constructor() {
          super();
          this.textarea = document.createElement('textarea');
          this.attachShadow({ mode: 'open' });
        }
        connectedCallback() {
          if (this.shadowRoot) {
            const label = this.getAttribute('label') || '';
            this.shadowRoot.innerHTML = `
              <style>
                :host {
                  display: block;
                  width: 100%;
                  max-width: 100%;
                  margin: 8px 0;
                }
                label {
                  display: block;
                  margin-bottom: 4px;
                  font-size: 12px;
                  font-weight: 500;
                  color: var(--primary-text-color);
                  font-family: var(--mdc-typography-body1-font-family, Roboto, sans-serif);
                }
                textarea {
                  width: 100%;
                  max-width: 100%;
                  box-sizing: border-box;
                  min-height: 500px;
                  padding: 8px 12px;
                  border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
                  font-family: 'Roboto Mono', 'Courier New', monospace;
                  font-size: 14px;
                  background-color: var(--mdc-text-field-fill-color, var(--card-background-color));
                  color: var(--primary-text-color);
                  resize: vertical;
                }
                textarea:focus {
                  border-color: var(--primary-color);
                  outline: none;
                }
              </style>
              ${label ? `<label>${label}</label>` : ''}
            `;
            this.shadowRoot.appendChild(this.textarea);
            const value = this._value || this.getAttribute('value') || '';
            this.textarea.value = value;
            this.textarea.addEventListener('input', () => {
              this._value = this.textarea.value;
              this.dispatchEvent(
                new CustomEvent('value-changed', {
                  bubbles: true,
                  composed: true,
                  detail: { value: this.textarea.value },
                }),
              );
            });
          }
        }
        get value() {
          return this.textarea?.value || this._value || '';
        }
        set value(val: string) {
          this._value = val || '';
          if (this.textarea) {
            this.textarea.value = this._value;
          }
        }
        static get observedAttributes() {
          return ['value'];
        }
        attributeChangedCallback(name: string, _old: string, newVal: string) {
          if (name === 'value') {
            this._value = newVal || '';
            if (this.textarea) {
              this.textarea.value = this._value;
            }
          }
        }
      },
    );
  }

  // Mock ha-button
  if (!customElements.get('ha-button')) {
    customElements.define(
      'ha-button',
      class extends HTMLElement {
        private _clickHandler: ((e: MouseEvent) => void) | null = null;
        constructor() {
          super();
          this.attachShadow({ mode: 'open' });
        }
        connectedCallback() {
          if (this.shadowRoot && !this._clickHandler) {
            this.shadowRoot.innerHTML = `
              <style>
                :host {
                  display: inline-block;
                }
                button {
                  padding: 8px 16px;
                  border: 1px solid var(--primary-color);
                  border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg, 4px));
                  background: var(--primary-color);
                  color: var(--text-primary-on-background, var(--primary-text-color));
                  cursor: pointer;
                  font-size: 14px;
                  font-family: var(--mdc-typography-button-font-family, Roboto, sans-serif);
                  font-weight: 500;
                  transition: opacity 0.2s, background-color 0.2s;
                }
                button:hover {
                  opacity: 0.9;
                  background-color: var(--primary-color);
                  filter: brightness(1.1);
                }
                button:active {
                  filter: brightness(0.9);
                }
              </style>
              <button>
                <slot></slot>
              </button>
            `;
            const button = this.shadowRoot.querySelector('button');
            if (button) {
              this._clickHandler = (e: MouseEvent) => {
                e.stopPropagation();
                e.preventDefault();
                this.dispatchEvent(
                  new CustomEvent('click', { bubbles: true, composed: true }),
                );
              };
              button.addEventListener('click', this._clickHandler);
            }
          }
        }
        disconnectedCallback() {
          if (this._clickHandler && this.shadowRoot) {
            const button = this.shadowRoot.querySelector('button');
            if (button) {
              button.removeEventListener('click', this._clickHandler);
            }
            this._clickHandler = null;
          }
        }
      },
    );
  }

  // Mock ha-icon-button
  if (!customElements.get('ha-icon-button')) {
    customElements.define(
      'ha-icon-button',
      class extends HTMLElement {
        private _clickHandler: ((e: MouseEvent) => void) | null = null;
        constructor() {
          super();
          this.attachShadow({ mode: 'open' });
        }
        connectedCallback() {
          if (this.shadowRoot && !this._clickHandler) {
            this.shadowRoot.innerHTML = `
              <style>
                :host {
                  display: inline-block;
                }
                button {
                  padding: 8px;
                  border: none;
                  background: transparent;
                  cursor: pointer;
                  border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg, 4px));
                  color: var(--primary-text-color);
                  transition: background-color 0.2s, opacity 0.2s;
                }
                button:hover:not(:disabled) {
                  background-color: var(--hover-color);
                }
                button:disabled {
                  opacity: 0.38;
                  cursor: not-allowed;
                  color: var(--disabled-text-color, var(--secondary-text-color));
                }
              </style>
              <button>
                <slot></slot>
              </button>
            `;
            const button = this.shadowRoot.querySelector('button');
            if (button) {
              this._clickHandler = (e: MouseEvent) => {
                if (!this.hasAttribute('disabled')) {
                  e.stopPropagation();
                  e.preventDefault();
                  this.dispatchEvent(
                    new CustomEvent('click', { bubbles: true, composed: true }),
                  );
                }
              };
              button.addEventListener('click', this._clickHandler);
            }
          }
        }
        disconnectedCallback() {
          if (this._clickHandler && this.shadowRoot) {
            const button = this.shadowRoot.querySelector('button');
            if (button) {
              button.removeEventListener('click', this._clickHandler);
            }
            this._clickHandler = null;
          }
        }
        static get observedAttributes() {
          return ['disabled', 'title'];
        }
        attributeChangedCallback(name: string, _old: string, newVal: string) {
          const button = this.shadowRoot?.querySelector('button');
          if (button) {
            if (name === 'disabled') {
              button.disabled = this.hasAttribute('disabled');
            } else if (name === 'title') {
              button.title = newVal || '';
            }
          }
        }
      },
    );
  }

  // Mock mwc-list-item (used by ha-select)
  if (!customElements.get('mwc-list-item')) {
    customElements.define(
      'mwc-list-item',
      class extends HTMLElement {
        constructor() {
          super();
        }
        connectedCallback() {
          // This is handled by the parent ha-select
        }
      },
    );
  }
}
