// ============================================================================
// KEYBOARD NAVIGATION
// ============================================================================

const ARROW_KEYS = {
  UP: 'ArrowUp',
  DOWN: 'ArrowDown',
  LEFT: 'ArrowLeft',
  RIGHT: 'ArrowRight',
} as const;

const NAVIGATION_KEYS = [
  ARROW_KEYS.UP,
  ARROW_KEYS.DOWN,
  ARROW_KEYS.LEFT,
  ARROW_KEYS.RIGHT,
] as const;

const KEYBOARD_NAV_ATTRIBUTE = 'data-keyboard-nav-attached';

function isEditableElement(element: Element | null): boolean {
  if (!element) return false;

  if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
    return true;
  }

  return element instanceof HTMLElement && element.isContentEditable;
}

function getSelectElement(id: string): HTMLSelectElement | null {
  return document.getElementById(id) as HTMLSelectElement | null;
}

export function isAnySelectorFocused(selectorIds: string[]): boolean {
  return selectorIds.some((id) => {
    const select = getSelectElement(id);
    return select !== null && document.activeElement === select;
  });
}

function navigateSelectOption(
  select: HTMLSelectElement,
  direction: 'up' | 'down',
): void {
  const options = Array.from(select.options);
  const currentIndex = select.selectedIndex;

  const newIndex =
    direction === 'down'
      ? currentIndex < options.length - 1
        ? currentIndex + 1
        : 0
      : currentIndex > 0
        ? currentIndex - 1
        : options.length - 1;

  select.selectedIndex = newIndex;
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

function navigateBetweenSelects(
  selectorIds: readonly string[],
  currentIndex: number,
  direction: 'left' | 'right',
): void {
  const targetIndex =
    direction === 'right'
      ? currentIndex < selectorIds.length - 1
        ? currentIndex + 1
        : 0
      : currentIndex > 0
        ? currentIndex - 1
        : selectorIds.length - 1;

  const targetSelect = getSelectElement(selectorIds[targetIndex]);
  if (targetSelect) {
    targetSelect.focus();
  }
}

let globalKeyboardNavSetup = false;

export function setupGlobalKeyboardNavigation(
  selectorIds: string[],
  defaultSelectorId: string,
): void {
  if (globalKeyboardNavSetup) return;
  globalKeyboardNavSetup = true;

  document.addEventListener('keydown', (e) => {
    if (!NAVIGATION_KEYS.includes(e.key as (typeof NAVIGATION_KEYS)[number])) {
      return;
    }

    if (isAnySelectorFocused(selectorIds)) {
      return;
    }

    if (isEditableElement(document.activeElement)) {
      return;
    }

    const configSelect = getSelectElement(defaultSelectorId);
    if (!configSelect) return;

    e.preventDefault();
    configSelect.focus();

    if (e.key === ARROW_KEYS.DOWN || e.key === ARROW_KEYS.UP) {
      navigateSelectOption(
        configSelect,
        e.key === ARROW_KEYS.DOWN ? 'down' : 'up',
      );
    }
  });
}

export function setupSelectKeyboardNavigation(
  selectorIds: readonly string[],
  selectId: string,
): void {
  const select = getSelectElement(selectId);
  if (!select || select.hasAttribute(KEYBOARD_NAV_ATTRIBUTE)) {
    return;
  }

  select.setAttribute(KEYBOARD_NAV_ATTRIBUTE, 'true');

  select.addEventListener('keydown', (e) => {
    const currentSelectorIndex = selectorIds.indexOf(selectId);

    if (e.key === ARROW_KEYS.LEFT || e.key === ARROW_KEYS.RIGHT) {
      e.preventDefault();
      navigateBetweenSelects(
        selectorIds,
        currentSelectorIndex,
        e.key === ARROW_KEYS.RIGHT ? 'right' : 'left',
      );
      return;
    }

    if (e.key !== ARROW_KEYS.DOWN && e.key !== ARROW_KEYS.UP) {
      return;
    }

    e.preventDefault();
    navigateSelectOption(select, e.key === ARROW_KEYS.DOWN ? 'down' : 'up');
  });
}
