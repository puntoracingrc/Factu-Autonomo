import { describe, expect, it } from "vitest";
import {
  DOCUMENT_UNIT_CATALOG,
  formatQuantityWithUnit,
  normalizeDocumentUnitId,
  normalizeDocumentUnits,
  normalizeLineItemUnits,
  toggleDocumentUnit,
} from "./document-units";
import type { LineItem } from "./types";

describe("document-units", () => {
  it("expone una sola opción canónica para unidades", () => {
    expect(
      DOCUMENT_UNIT_CATALOG.filter((unit) => unit.id === "ud"),
    ).toHaveLength(1);
    expect(DOCUMENT_UNIT_CATALOG.some((unit) => unit.id === "und")).toBe(false);
  });

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
    expect(formatQuantityWithUnit(1.25, "m3")).toBe("1.25 m³");
    expect(formatQuantityWithUnit(0.1234, "m3")).toBe("0.1234 m³");
    expect(formatQuantityWithUnit(2.5, "m")).toBe("2.5 m");
    expect(formatQuantityWithUnit(3, "und")).toBe("3 ud");
    expect(formatQuantityWithUnit(250, "ml")).toBe("250 ml");
    expect(formatQuantityWithUnit(12, "km")).toBe("12 km");
  });

  it("normaliza unidades habituales de negocio real", () => {
    expect(normalizeDocumentUnitId("M2")).toBe("m2");
    expect(normalizeDocumentUnitId("m²")).toBe("m2");
    expect(normalizeDocumentUnitId("M3")).toBe("m3");
    expect(normalizeDocumentUnitId("m³")).toBe("m3");
    expect(normalizeDocumentUnitId("metros cúbicos")).toBe("m3");
    expect(normalizeDocumentUnitId("metro lineal")).toBe("ml");
    expect(normalizeDocumentUnitId("m.l.")).toBe("ml");
    expect(normalizeDocumentUnitId("JG")).toBe("ud");
    expect(normalizeDocumentUnitId("juego")).toBe("ud");
    expect(normalizeDocumentUnitId("und")).toBe("ud");
    expect(normalizeDocumentUnitId("UND")).toBe("ud");
  });

  it("conserva ajustes antiguos de und bajo la unidad canónica ud", () => {
    expect(
      normalizeDocumentUnits({
        enabledUnitIds: ["und", "m2", "ud"],
        defaultUnitId: "und",
      }),
    ).toEqual({
      enabledUnitIds: ["ud", "m2"],
      defaultUnitId: "ud",
    });
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
      normalizeDocumentUnits({
        enabledUnitIds: ["ud", "m2"],
        defaultUnitId: "m2",
      }),
    );
    expect(normalized[0].unit).toBe("m2");
  });

  it("normaliza líneas operativas antiguas de und a ud", () => {
    const items: LineItem[] = [
      {
        id: "legacy-unit",
        description: "Producto por unidad",
        quantity: 3,
        unit: "und",
        unitPrice: 10,
        ivaPercent: 21,
      },
    ];

    const normalized = normalizeLineItemUnits(
      items,
      normalizeDocumentUnits({
        enabledUnitIds: ["und"],
        defaultUnitId: "und",
      }),
    );

    expect(normalized[0].unit).toBe("ud");
  });
});
