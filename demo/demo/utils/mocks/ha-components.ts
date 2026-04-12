/**
 * Mock Home Assistant custom elements for demo environment
 */

import type { HomeAssistant } from '../../../../src/types';

/**
 * Mocks Home Assistant custom elements needed by the visual editor
 */
export function mockHaEditorComponents(): void {
  mockHaTextField();
  mockHaSelect();
  mockHaSwitch();
  mockHaFormfield();
  mockHaEntityPicker();
  mockHaIconPicker();
  mockHaExpansionPanel();
  mockHaCodeEditor();
  mockHaButton();
  mockHaIconButton();
}

function mockHaTextField() {
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
}

function mockHaSelect() {
  if (!customElements.get('ha-select')) {
    customElements.define(
      'ha-select',
      class extends HTMLElement {
        private select: HTMLSelectElement;
        private _value: string | null = null;
        private _clearable: boolean = false;
        private _options: Array<
          string | { value: string; label?: string }
        > | null = null;
        private _listenersBound = false;
        constructor() {
          super();
          this.select = document.createElement('select');
          this.attachShadow({ mode: 'open' });
        }

        connectedCallback() {
          if (!this.shadowRoot) return;

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
                .select-wrap {
                  position: relative;
                  width: 100%;
                  max-width: 500px;
                }
                .select-wrap::after {
                  content: '';
                  position: absolute;
                  right: 10px;
                  top: 50%;
                  transform: translateY(-50%);
                  width: 0;
                  height: 0;
                  border-left: 5px solid transparent;
                  border-right: 5px solid transparent;
                  border-top: 6px solid var(--input-dropdown-icon-color, var(--secondary-text-color));
                  pointer-events: none;
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
              <div class="select-wrap"></div>
            `;
          const wrap = this.shadowRoot.querySelector('.select-wrap');
          if (!wrap) return;
          wrap.appendChild(this.select);

          if (!this._listenersBound) {
            this._listenersBound = true;
            this.select.addEventListener('change', () => {
              this._value = this.select.value;
              const raw = this.select.value;
              const detailValue =
                raw === '' && this._clearable ? undefined : raw;
              this.dispatchEvent(
                new CustomEvent('selected', {
                  bubbles: true,
                  composed: true,
                  detail: { value: detailValue },
                }),
              );
            });
            this.select.addEventListener('click', (e) => {
              e.stopPropagation();
            });
          }

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
        }

        restoreNativeSelectValue(
          select: HTMLSelectElement,
          candidates: Array<string | null | undefined>,
        ): void {
          for (const v of candidates) {
            if (
              v &&
              Array.from(select.options).some((opt) => opt.value === v)
            ) {
              select.value = v;
              return;
            }
          }
        }

        updateOptions() {
          if (!this.select) return;

          const currentValue = this.select.value;

          this.select.innerHTML = '';

          // Add empty option if clearable
          if (this._clearable) {
            const emptyOption = document.createElement('option');
            emptyOption.value = '';
            emptyOption.textContent = '';
            this.select.appendChild(emptyOption);
          }

          if (Array.isArray(this._options)) {
            for (const entry of this._options) {
              const option = document.createElement('option');
              if (typeof entry === 'string') {
                option.value = entry;
                option.textContent = entry;
              } else {
                option.value = entry.value;
                option.textContent = entry.label ?? entry.value;
              }
              this.select.appendChild(option);
            }
          }

          this.restoreNativeSelectValue(this.select, [
            currentValue,
            this._value,
          ]);
        }

        get options() {
          return this._options;
        }

        set options(
          val: Array<string | { value: string; label?: string }> | null,
        ) {
          this._options = val;
          this.updateOptions();
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
}

function mockHaSwitch() {
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
}

function mockHaFormfield() {
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
}

function mockHaEntityPicker() {
  if (!customElements.get('ha-entity-picker')) {
    customElements.define(
      'ha-entity-picker',
      class extends HTMLElement {
        private select: HTMLSelectElement;
        private _hass: HomeAssistant | null = null;
        private _value: string = '';
        private _listenersBound = false;
        constructor() {
          super();
          this.select = document.createElement('select');
          this.attachShadow({ mode: 'open' });
        }
        connectedCallback() {
          if (!this.shadowRoot) return;

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
                .select-wrap {
                  position: relative;
                  width: 100%;
                  max-width: 500px;
                }
                .select-wrap::after {
                  content: '';
                  position: absolute;
                  right: 10px;
                  top: 50%;
                  transform: translateY(-50%);
                  width: 0;
                  height: 0;
                  border-left: 5px solid transparent;
                  border-right: 5px solid transparent;
                  border-top: 6px solid var(--input-dropdown-icon-color, var(--secondary-text-color));
                  pointer-events: none;
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
              <div class="select-wrap"></div>
            `;
          const wrap = this.shadowRoot.querySelector('.select-wrap');
          if (!wrap) return;
          wrap.appendChild(this.select);
          this.updateOptions();
          const value = this._value || this.getAttribute('value') || '';
          if (value) this.select.value = value;
          if (!this._listenersBound) {
            this._listenersBound = true;
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
}

function mockHaIconPicker() {
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
}

function mockHaExpansionPanel() {
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
                background-color: var(--input-fill-color);
              }
              .top.expanded {
                background-color: var(--input-fill-color);
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
}

function mockHaCodeEditor() {
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
                  display: flex;
                  flex-direction: column;
                  min-height: 0;
                  width: 100%;
                  max-width: 100%;
                  margin: 8px 0;
                  --ha-code-editor-min-height: 500px;
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
                  flex: 1 1 auto;
                  min-height: var(--ha-code-editor-min-height);
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
            this.textarea.placeholder = this.getAttribute('placeholder') || '';
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
          return ['value', 'placeholder'];
        }
        attributeChangedCallback(name: string, _old: string, newVal: string) {
          if (name === 'value') {
            this._value = newVal || '';
            if (this.textarea) {
              this.textarea.value = this._value;
            }
          }
          if (name === 'placeholder' && this.textarea) {
            this.textarea.placeholder = newVal || '';
          }
        }
      },
    );
  }
}

function mockHaButton() {
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
}

function mockHaIconButton() {
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
                  background-color: var(--input-fill-color);
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
}
