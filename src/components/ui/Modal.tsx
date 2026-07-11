"use client";

import {
  useEffect,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import {
  getModalFocusableElements,
  handleModalKeyDown,
  modalAriaProps,
  restoreModalFocus,
  shouldCloseModalFromBackdrop,
} from "@/components/ui/modal-accessibility";

const openModalStack: HTMLElement[] = [];
let bodyLockCount = 0;
let bodyOverflowBeforeFirstModal = "";

function lockBodyScroll() {
  if (bodyLockCount === 0) {
    bodyOverflowBeforeFirstModal = document.body.style.overflow;
  }
  bodyLockCount += 1;
  document.body.style.overflow = "hidden";
}

function unlockBodyScroll() {
  bodyLockCount = Math.max(0, bodyLockCount - 1);
  if (bodyLockCount === 0) {
    document.body.style.overflow = bodyOverflowBeforeFirstModal;
  }
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  titleId: string;
  descriptionId?: string;
  children: ReactNode;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  initialFocusSelector?: string;
  overlayClassName?: string;
  panelClassName?: string;
  testId?: string;
}

export function Modal({
  open,
  onClose,
  titleId,
  descriptionId,
  children,
  closeOnBackdrop = true,
  closeOnEscape = true,
  initialFocusSelector,
  overlayClassName = "fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center",
  panelClassName = "max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl supports-[height:100dvh]:max-h-[90dvh]",
  testId,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    lockBodyScroll();
    openModalStack.push(dialog);

    const focusInitialElement = () => {
      const focusableElements = getModalFocusableElements(dialog);
      const requested = initialFocusSelector
        ? dialog.querySelector<HTMLElement>(initialFocusSelector)
        : null;
      const target =
        (requested && focusableElements.includes(requested)
          ? requested
          : focusableElements[0]) ?? dialog;
      target.focus({ preventScroll: true });
    };

    const animationFrame = window.requestAnimationFrame(focusInitialElement);

    function handleKeyDown(event: KeyboardEvent) {
      if (openModalStack[openModalStack.length - 1] !== dialog) return;
      if (event.key === "Escape" && !closeOnEscape) return;
      handleModalKeyDown(event, dialog, () => onCloseRef.current());
    }

    function keepFocusInside(event: FocusEvent) {
      if (openModalStack[openModalStack.length - 1] !== dialog) return;
      if (event.target instanceof Node && dialog.contains(event.target)) return;
      focusInitialElement();
    }

    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("focusin", keepFocusInside);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("focusin", keepFocusInside);
      const stackIndex = openModalStack.lastIndexOf(dialog);
      if (stackIndex >= 0) openModalStack.splice(stackIndex, 1);
      unlockBodyScroll();
      restoreModalFocus(previouslyFocused);
    };
  }, [closeOnEscape, initialFocusSelector, open]);

  if (!open) return null;

  function handleBackdropMouseDown(event: ReactMouseEvent<HTMLDivElement>) {
    if (
      shouldCloseModalFromBackdrop({
        closeOnBackdrop,
        button: event.button,
        target: event.target,
        currentTarget: event.currentTarget,
      })
    ) {
      onCloseRef.current();
    }
  }

  return (
    <div
      className={overlayClassName}
      onMouseDown={handleBackdropMouseDown}
      data-testid={testId ? `${testId}-backdrop` : undefined}
    >
      <div
        ref={dialogRef}
        {...modalAriaProps(titleId, descriptionId)}
        tabIndex={-1}
        className={panelClassName}
        data-testid={testId}
      >
        {children}
      </div>
    </div>
  );
}
