import { describe, expect, it, vi } from "vitest";
import {
  getFocusTrapTarget,
  handleModalKeyDown,
  modalAriaProps,
  restoreModalFocus,
  shouldCloseModalFromBackdrop,
} from "./modal-accessibility";

describe("contrato accesible de Modal", () => {
  it("expone semántica de diálogo y asocia título y descripción", () => {
    expect(modalAriaProps("modal-title", "modal-description")).toEqual({
      role: "dialog",
      "aria-modal": true,
      "aria-labelledby": "modal-title",
      "aria-describedby": "modal-description",
    });
  });

  it("cierra con Escape y consume el evento", () => {
    const onClose = vi.fn();
    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();

    handleModalKeyDown(
      {
        key: "Escape",
        shiftKey: false,
        preventDefault,
        stopPropagation,
      },
      {} as HTMLElement,
      onClose,
      null,
    );

    expect(onClose).toHaveBeenCalledOnce();
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(stopPropagation).toHaveBeenCalledOnce();
  });

  it("cicla el foco entre el primer y el último control", () => {
    const first = {} as HTMLElement;
    const middle = {} as HTMLElement;
    const last = {} as HTMLElement;
    const controls = [first, middle, last];

    expect(getFocusTrapTarget(controls, last, false)).toBe(first);
    expect(getFocusTrapTarget(controls, first, true)).toBe(last);
    expect(getFocusTrapTarget(controls, middle, false)).toBeNull();
    expect(getFocusTrapTarget(controls, null, false)).toBe(first);
    expect(getFocusTrapTarget(controls, null, true)).toBe(last);
    expect(getFocusTrapTarget([], null, false)).toBeNull();
  });

  it("restaura el foco únicamente cuando el disparador sigue conectado", () => {
    const focus = vi.fn();
    const connected = { isConnected: true, focus } as unknown as HTMLElement;
    const disconnected = {
      isConnected: false,
      focus,
    } as unknown as HTMLElement;

    restoreModalFocus(connected);
    restoreModalFocus(disconnected);
    restoreModalFocus(null);

    expect(focus).toHaveBeenCalledOnce();
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("solo cierra por pulsación primaria directa en el fondo habilitado", () => {
    const backdrop = {};
    const child = {};

    expect(
      shouldCloseModalFromBackdrop({
        closeOnBackdrop: true,
        button: 0,
        target: backdrop,
        currentTarget: backdrop,
      }),
    ).toBe(true);
    expect(
      shouldCloseModalFromBackdrop({
        closeOnBackdrop: true,
        button: 0,
        target: child,
        currentTarget: backdrop,
      }),
    ).toBe(false);
    expect(
      shouldCloseModalFromBackdrop({
        closeOnBackdrop: false,
        button: 0,
        target: backdrop,
        currentTarget: backdrop,
      }),
    ).toBe(false);
    expect(
      shouldCloseModalFromBackdrop({
        closeOnBackdrop: true,
        button: 2,
        target: backdrop,
        currentTarget: backdrop,
      }),
    ).toBe(false);
  });
});
