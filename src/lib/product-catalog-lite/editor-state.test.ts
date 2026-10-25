import { describe, it, expect } from "vitest";
import { catalogEdit, type CatalogEdit } from "./model";
import { catalogEditHasChanges } from "./editor-state";
import type { Product } from "@/lib/types";

const product: Product = {
  id: "synthetic-editor",
  key: "synthetic-editor",
  name: "Producto de prueba",
  family: "Prueba",
  unit: "ud",
  cost: 50,
  sales: { unit: "ud", unitPrice: 100, ivaPercent: 21 },
  attributes: [{ value: "Blanco", label: "Color", key: "color" }],
  notes: "\nPrimera línea\r\nSegunda línea",
  priceSources: [
    {
      unit: "ud",
      kind: "manual",
      id: "synthetic-source",
      recordedAt: "2026-01-01T00:00:00Z",
      netUnitCost: 50,
    },
  ],
  source: "manual",
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};
const reordered = <T extends object>(value: T): T =>
  Object.fromEntries(Object.entries(value).reverse()) as T;
describe("catalogue editor unsaved changes", () => {
  it("does not turn a read-only form round trip into changes", () => {
    const original = catalogEdit(product),
      before = structuredClone(original);
    const draft = {
      ...reordered(original),
      notes: original.notes.replace(/\r\n/g, "\n"),
      attributes: original.attributes.map((a) => ({
        key: a.key,
        label: a.label,
        value: a.value,
        unit: "",
      })),
      priceSources: original.priceSources.map(reordered),
    };
    expect(catalogEditHasChanges(original, draft)).toBe(false);
    expect(original).toEqual(before);
  });
  it("keeps optional absent and empty characteristic units equivalent", () => {
    const original = catalogEdit({
      ...product,
      attributes: [{ key: "color", label: "Color", value: "Blanco", unit: "" }],
    });
    expect(
      catalogEditHasChanges(original, {
        ...original,
        attributes: original.attributes.map(({ unit, ...rest }) => {
          void unit;
          return rest;
        }),
      }),
    ).toBe(false);
  });
  it("still protects every editable field and invalid numeric input", () => {
    const original = catalogEdit(product);
    for (const key of [
      "name",
      "sku",
      "family",
      "subfamily",
      "description",
      "unit",
      "salePrice",
      "cost",
      "vat",
      "listPrice",
      "discount",
      "notes",
    ] as const) {
      expect(
        catalogEditHasChanges(original, {
          ...original,
          [key]: original[key] + "x",
        }),
      ).toBe(true);
    }
    expect(
      catalogEditHasChanges(original, {
        ...original,
        cost: "precio incorrecto",
      }),
    ).toBe(true);
  });
  it("detects changed, added, removed or reordered characteristics and price evidence", () => {
    const original = catalogEdit(product);
    const drafts: CatalogEdit[] = [
      { ...original, attributes: [{ ...original.attributes[0], unit: "cm" }] },
      {
        ...original,
        attributes: [{ ...original.attributes[0], value: "Negro" }],
      },
      { ...original, attributes: [] },
      {
        ...original,
        attributes: [
          ...original.attributes,
          { key: "width", label: "Ancho", value: "100", unit: "cm" },
        ],
      },
      {
        ...original,
        priceSources: [{ ...original.priceSources[0], netUnitCost: 60 }],
      },
      { ...original, purchasePriceSourceId: "synthetic-source" },
      { ...original, salePriceSourceId: "synthetic-source" },
    ];
    for (const draft of drafts)
      expect(catalogEditHasChanges(original, draft)).toBe(true);
    const added = drafts[3];
    expect(
      catalogEditHasChanges(added, {
        ...added,
        attributes: [...added.attributes].reverse(),
      }),
    ).toBe(true);
  });
});
