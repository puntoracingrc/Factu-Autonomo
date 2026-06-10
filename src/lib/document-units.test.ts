import { describe, expect, it } from "vitest";
import {
  formatQuantityWithUnit,
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
