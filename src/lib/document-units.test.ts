import { describe, expect, it } from "vitest";
import {
  formatQuantityWithUnit,
  normalizeDocumentUnitId,
  normalizeDocumentUnits,
  normalizeLineItemUnits,
  toggleDocumentUnit,
} from "./document-units";
import type { LineItem } from "./types";

describe("document-units", () => {
  it("mantiene al menos una unidad activa", () => {
    const settings = normalizeDocumentUnits({
      enabledUnitIds: ["ud", "m2"],
      defaultUnitId: "m2",
    });
    const toggled = toggleDocumentUnit(settings, "m2", false);
    expect(toggled.enabledUnitIds).toEqual(["ud"]);
    expect(toggled.defaultUnitId).toBe("ud");
  });

  it("formatea cantidad con unidad en PDF", () => {
    expect(formatQuantityWithUnit(5, "m2")).toBe("5 m²");
    expect(formatQuantityWithUnit(2.5, "m")).toBe("2.5 m");
    expect(formatQuantityWithUnit(3, "und")).toBe("3 und");
    expect(formatQuantityWithUnit(250, "ml")).toBe("250 ml");
    expect(formatQuantityWithUnit(12, "km")).toBe("12 km");
  });

  it("normaliza unidades habituales de negocio real", () => {
    expect(normalizeDocumentUnitId("M2")).toBe("m2");
    expect(normalizeDocumentUnitId("m²")).toBe("m2");
    expect(normalizeDocumentUnitId("metro lineal")).toBe("ml");
    expect(normalizeDocumentUnitId("m.l.")).toBe("ml");
  });

  it("normaliza líneas antiguas sin unidad", () => {
    const items: LineItem[] = [
      {
        id: "1",
        description: "Instalación",
        quantity: 12,
        unitPrice: 10,
        ivaPercent: 21,
      },
    ];
    const normalized = normalizeLineItemUnits(
      items,
      normalizeDocumentUnits({ enabledUnitIds: ["ud", "m2"], defaultUnitId: "m2" }),
    );
    expect(normalized[0].unit).toBe("m2");
  });
});
