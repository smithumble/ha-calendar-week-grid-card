/**
 * Mock Home Assistant ha-card and ha-icon components
 */

import { loadIcon } from '../icons';

/**
 * Mock ha-card custom element
 */
export function mockHaCard(): void {
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

/**
 * Mock ha-icon custom element
 */
export function mockHaIcon(iconMap: Record<string, string>): void {
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
        async render() {
          const icon = this.getAttribute('icon');
          const iconName = icon ? icon.replace('mdi:', 'mdi/') : '';

          if (!iconName) return;

          // Try to get icon from map (might be cached via proxy)
          let svg = iconMap?.[iconName];

          // If icon is not available (empty string or undefined), load it on-demand
          if (!svg || svg === '') {
            svg = await loadIcon(iconName);
            if (!svg) {
              return;
            }
          }

          if (svg) {
            this.setIconContent(svg);
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
