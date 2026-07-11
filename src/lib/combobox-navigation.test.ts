import { describe, expect, it } from "vitest";
import {
  getComboboxOptionId,
  resolveComboboxKeyboardAction,
} from "./combobox-navigation";

describe("resolveComboboxKeyboardAction", () => {
  it("abre la lista por el principio o el final con las flechas", () => {
    expect(
      resolveComboboxKeyboardAction({
        key: "ArrowDown",
        itemCount: 3,
        highlightedIndex: 0,
        open: false,
      }),
    ).toEqual({ type: "highlight", index: 0 });
    expect(
      resolveComboboxKeyboardAction({
        key: "ArrowUp",
        itemCount: 3,
        highlightedIndex: 0,
        open: false,
      }),
    ).toEqual({ type: "highlight", index: 2 });
  });

  it("mantiene la navegacion dentro de los limites", () => {
    expect(
      resolveComboboxKeyboardAction({
        key: "ArrowDown",
        itemCount: 3,
        highlightedIndex: 2,
        open: true,
      }),
    ).toEqual({ type: "highlight", index: 2 });
    expect(
      resolveComboboxKeyboardAction({
        key: "ArrowUp",
        itemCount: 3,
        highlightedIndex: 0,
        open: true,
      }),
    ).toEqual({ type: "highlight", index: 0 });
  });

  it("selecciona con Enter, cierra con Escape e ignora teclas ajenas", () => {
    expect(
      resolveComboboxKeyboardAction({
        key: "Enter",
        itemCount: 3,
        highlightedIndex: 1,
        open: true,
      }),
    ).toEqual({ type: "select", index: 1 });
    expect(
      resolveComboboxKeyboardAction({
        key: "Escape",
        itemCount: 3,
        highlightedIndex: 1,
        open: true,
      }),
    ).toEqual({ type: "close" });
    expect(
      resolveComboboxKeyboardAction({
        key: "Tab",
        itemCount: 3,
        highlightedIndex: 1,
        open: true,
      }),
    ).toEqual({ type: "none" });
    expect(
      resolveComboboxKeyboardAction({
        key: "Home",
        itemCount: 3,
        highlightedIndex: 1,
        open: true,
      }),
    ).toEqual({ type: "none" });
  });

  it("conserva la seleccion directa de la unica coincidencia", () => {
    expect(
      resolveComboboxKeyboardAction({
        key: "Enter",
        itemCount: 1,
        highlightedIndex: 0,
        open: false,
      }),
    ).toEqual({ type: "select", index: 0 });
  });
});

describe("getComboboxOptionId", () => {
  it("genera referencias deterministas y seguras para aria-activedescendant", () => {
    expect(getComboboxOptionId("clientes-lista", "cliente/1")).toBe(
      "clientes-lista-option-cliente%2F1",
    );
    expect(getComboboxOptionId("clientes-lista", "cliente/1")).toBe(
      getComboboxOptionId("clientes-lista", "cliente/1"),
    );
  });
});
