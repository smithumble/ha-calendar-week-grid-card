// ============================================================================
// KEYBOARD NAVIGATION
// ============================================================================

const SELECTOR_IDS = [
  'provider-select',
  'config-select',
  'data-source-select',
] as const;

function isAnySelectorFocused(): boolean {
  return SELECTOR_IDS.some((id) => {
    const select = document.getElementById(id) as HTMLSelectElement;
    return select && document.activeElement === select;
  });
}

let globalKeyboardNavSetup = false;

export function setupGlobalKeyboardNavigation(): void {
  if (globalKeyboardNavSetup) return;
  globalKeyboardNavSetup = true;

  document.addEventListener('keydown', (e) => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      return;
    }

    if (!isAnySelectorFocused()) {
      const activeElement = document.activeElement;
      if (
        activeElement &&
        (activeElement.tagName === 'TEXTAREA' ||
          activeElement.tagName === 'INPUT' ||
          (activeElement instanceof HTMLElement &&
            activeElement.isContentEditable))
      ) {
        return;
      }

      const configSelect = document.getElementById(
        'config-select',
      ) as HTMLSelectElement;
      if (configSelect) {
        e.preventDefault();
        configSelect.focus();
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          const options = Array.from(configSelect.options);
          const currentIndex = configSelect.selectedIndex;
          let newIndex: number;
          if (e.key === 'ArrowDown') {
            newIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
          } else {
            newIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
          }
          configSelect.selectedIndex = newIndex;
          configSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }
  });
}

export function setupSelectKeyboardNavigation(selectId: string): void {
  const select = document.getElementById(selectId) as HTMLSelectElement;
  if (!select || select.hasAttribute('data-keyboard-nav-attached')) return;

  select.setAttribute('data-keyboard-nav-attached', 'true');
  select.addEventListener('keydown', (e) => {
    const currentSelectorIndex = SELECTOR_IDS.indexOf(
      selectId as (typeof SELECTOR_IDS)[number],
    );

    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      let targetIndex: number;
      if (e.key === 'ArrowRight') {
        targetIndex =
          currentSelectorIndex < SELECTOR_IDS.length - 1
            ? currentSelectorIndex + 1
            : 0;
      } else {
        targetIndex =
          currentSelectorIndex > 0
            ? currentSelectorIndex - 1
            : SELECTOR_IDS.length - 1;
      }

      const targetSelect = document.getElementById(
        SELECTOR_IDS[targetIndex],
      ) as HTMLSelectElement;
      if (targetSelect) {
        targetSelect.focus();
      }
      return;
    }

    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;

    e.preventDefault();

    const options = Array.from(select.options);
    const currentIndex = select.selectedIndex;

    let newIndex: number;
    if (e.key === 'ArrowDown') {
      newIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
    } else {
      newIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
    }

    select.selectedIndex = newIndex;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
