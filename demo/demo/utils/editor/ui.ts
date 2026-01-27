/**
 * UI helpers for config editor
 */

export interface EditorElements {
  panel: HTMLElement | null;
  toggleBtn: HTMLElement | null;
  closeBtn: HTMLElement | null;
  applyBtn: HTMLElement | null;
  resetBtn: HTMLElement | null;
  textarea: HTMLTextAreaElement | null;
  errorDiv: HTMLElement | null;
  yamlEditor: HTMLElement | null;
  visualEditorDiv: HTMLElement | null;
  visualContainer: HTMLElement | null;
  yamlBtn: HTMLElement | null;
  visualBtn: HTMLElement | null;
}

/**
 * Get editor DOM elements
 */
export function getEditorElements(): EditorElements {
  return {
    panel: document.getElementById('config-editor-panel'),
    toggleBtn: document.getElementById('config-editor-toggle-btn'),
    closeBtn: document.getElementById('config-editor-close'),
    applyBtn: document.getElementById('config-editor-apply'),
    resetBtn: document.getElementById('config-editor-reset'),
    textarea: document.getElementById(
      'config-editor-textarea',
    ) as HTMLTextAreaElement,
    errorDiv: document.getElementById('config-editor-error'),
    yamlEditor: document.getElementById('config-editor-yaml'),
    visualEditorDiv: document.getElementById('config-editor-visual'),
    visualContainer: document.getElementById('visual-editor-container'),
    yamlBtn: document.getElementById('config-editor-mode-yaml'),
    visualBtn: document.getElementById('config-editor-mode-visual'),
  };
}

/**
 * Show config editor error message
 */
export function showConfigEditorError(message: string): void {
  const { errorDiv } = getEditorElements();
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.classList.add('visible');
  }
}

/**
 * Hide config editor error message
 */
export function hideConfigEditorError(): void {
  const { errorDiv } = getEditorElements();
  if (errorDiv) {
    errorDiv.classList.remove('visible');
  }
}

/**
 * Apply theme to container based on panel/body theme
 */
export function applyThemeToContainer(container: HTMLElement): void {
  const { panel } = getEditorElements();
  const isDark =
    panel?.classList.contains('theme-dark') ||
    document.body.classList.contains('theme-dark');

  if (isDark) {
    container.classList.add('theme-dark');
    container.classList.remove('theme-light');
  } else {
    container.classList.add('theme-light');
    container.classList.remove('theme-dark');
  }
}

/**
 * Setup scroll indicator on element
 */
export function setupScrollIndicator(
  element: HTMLElement,
  className = 'scrolling',
  timeout = 1000,
): void {
  let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
  element.addEventListener('scroll', () => {
    element.classList.add(className);
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }
    scrollTimeout = setTimeout(() => {
      element.classList.remove(className);
    }, timeout);
  });
}
