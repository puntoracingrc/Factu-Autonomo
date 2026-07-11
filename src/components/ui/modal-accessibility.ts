const FOCUSABLE_SELECTOR = [
  "a[href]:not([tabindex='-1'])",
  "area[href]:not([tabindex='-1'])",
  "button:not([disabled]):not([tabindex='-1'])",
  "input:not([disabled]):not([type='hidden']):not([tabindex='-1'])",
  "select:not([disabled]):not([tabindex='-1'])",
  "textarea:not([disabled]):not([tabindex='-1'])",
  "iframe:not([tabindex='-1'])",
  "[contenteditable='true']:not([tabindex='-1'])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function modalAriaProps(titleId: string, descriptionId?: string) {
  return {
    role: "dialog" as const,
    "aria-modal": true as const,
    "aria-labelledby": titleId,
    "aria-describedby": descriptionId,
  };
}

export function restoreModalFocus(element: HTMLElement | null) {
  if (element?.isConnected) {
    element.focus({ preventScroll: true });
  }
}

export function shouldCloseModalFromBackdrop({
  closeOnBackdrop,
  button,
  target,
  currentTarget,
}: {
  closeOnBackdrop: boolean;
  button: number;
  target: unknown;
  currentTarget: unknown;
}): boolean {
  return closeOnBackdrop && button === 0 && target === currentTarget;
}

export function getModalFocusableElements(
  container: HTMLElement,
): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((element) => {
    if (
      element.matches(":disabled") ||
      element.closest("[hidden], [inert], [aria-hidden='true']")
    ) {
      return false;
    }
    const style = window.getComputedStyle(element);
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      element.getClientRects().length > 0
    );
  });
}

export function getFocusTrapTarget(
  focusableElements: HTMLElement[],
  activeElement: Element | null,
  shiftKey: boolean,
): HTMLElement | null {
  if (focusableElements.length === 0) return null;

  const activeIndex = focusableElements.indexOf(activeElement as HTMLElement);
  if (activeIndex === -1) {
    return shiftKey
      ? focusableElements[focusableElements.length - 1]
      : focusableElements[0];
  }
  if (shiftKey && activeIndex === 0) {
    return focusableElements[focusableElements.length - 1];
  }
  if (!shiftKey && activeIndex === focusableElements.length - 1) {
    return focusableElements[0];
  }
  return null;
}

export function handleModalKeyDown(
  event: Pick<
    KeyboardEvent,
    "key" | "shiftKey" | "preventDefault" | "stopPropagation"
  >,
  container: HTMLElement,
  onClose: () => void,
  activeElement: Element | null = document.activeElement,
) {
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    onClose();
    return;
  }

  if (event.key !== "Tab") return;

  const focusableElements = getModalFocusableElements(container);
  const target = getFocusTrapTarget(
    focusableElements,
    activeElement,
    event.shiftKey,
  );

  if (focusableElements.length === 0) {
    event.preventDefault();
    container.focus({ preventScroll: true });
    return;
  }

  if (target) {
    event.preventDefault();
    target.focus({ preventScroll: true });
  }
}
