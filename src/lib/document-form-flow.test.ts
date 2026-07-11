import { describe, expect, it } from "vitest";
import {
  applyConfirmedDocumentIvaToItems,
  applyDocumentIvaToItems,
  documentFormAmounts,
  documentFormItemsForEditing,
  documentFormItemsForSave,
  firstDocumentFormLineIssue,
  lineItemFormTotal,
} from "./document-form-flow";
import type { LineItem } from "./types";

function item(overrides: Partial<LineItem> = {}): LineItem {
  return {
    id: "line-1",
    description: "Servicio",
    quantity: 1,
    unit: "ud",
    unitPrice: 100,
    ivaPercent: 21,
    ...overrides,
  };
}

describe("document form totals flow", () => {
  it("calcula un presupuesto con una línea de 100 + 21% como 121", () => {
    expect(documentFormAmounts([item()])).toEqual({
      subtotal: 100,
      iva: 21,
      total: 121,
    });
  });

  it("calcula una factura con una línea y mantiene IVA cero", () => {
    expect(documentFormAmounts([item({ ivaPercent: 0 })])).toEqual({
      subtotal: 100,
      iva: 0,
      total: 100,
    });
  });

  it("guardar y reabrir un borrador conserva el IVA 21% + 10% por línea", () => {
    const mixedItems = [
      item({ id: "line-21", description: "Servicio", ivaPercent: 21 }),
      item({ id: "line-10", description: "Producto", ivaPercent: 10 }),
    ];

    const savedItems = documentFormItemsForSave(mixedItems);
    const reopenedItems = documentFormItemsForEditing(savedItems);

    expect(reopenedItems.map((line) => line.ivaPercent)).toEqual([21, 10]);
    expect(documentFormAmounts(reopenedItems)).toEqual({
      subtotal: 200,
      iva: 31,
      total: 231,
    });
  });

  it("solo homogeneiza el IVA cuando se invoca la acción global", () => {
    const mixedItems = [
      item({ id: "line-21", ivaPercent: 21 }),
      item({ id: "line-10", ivaPercent: 10 }),
    ];

    expect(
      documentFormItemsForEditing(mixedItems).map(
        (line) => line.ivaPercent,
      ),
    ).toEqual([21, 10]);
    expect(
      applyDocumentIvaToItems(mixedItems, 4).map((line) => line.ivaPercent),
    ).toEqual([4, 4]);

    expect(
      applyConfirmedDocumentIvaToItems(mixedItems, 4, false).map(
        (line) => line.ivaPercent,
      ),
    ).toEqual([21, 10]);
    expect(
      applyConfirmedDocumentIvaToItems(mixedItems, 4, true).map(
        (line) => line.ivaPercent,
      ),
    ).toEqual([4, 4]);
  });

  it("redondea por línea y mantiene base + IVA igual al total visible", () => {
    const totals = documentFormAmounts([
      item({ quantity: 1.5, unitPrice: 33.33, ivaPercent: 21 }),
    ]);

    expect(totals.subtotal).toBe(50);
    expect(totals.iva).toBe(10.5);
    expect(totals.total).toBe(60.5);
  });

  it("muestra exactamente la proyección fiscal de líneas fraccionarias", () => {
    const lines = [
      item({ id: "fraction-1", unitPrice: 0.025 }),
      item({ id: "fraction-2", unitPrice: 0.025 }),
    ];

    expect(lineItemFormTotal(lines[0])).toBe(0.04);
    expect(documentFormAmounts(lines)).toEqual({
      subtotal: 0.06,
      iva: 0.02,
      total: 0.08,
    });
  });

  it("una línea vacía o inválida no produce NaN", () => {
    const totals = documentFormAmounts([
      item({
        description: "",
        quantity: Number.NaN,
        unitPrice: Number.NaN,
        ivaPercent: Number.NaN,
      }),
    ]);

    expect(Number.isNaN(totals.subtotal)).toBe(false);
    expect(Number.isNaN(totals.iva)).toBe(false);
    expect(Number.isNaN(totals.total)).toBe(false);
    expect(totals).toEqual({ subtotal: 0, iva: 0, total: 0 });
  });

  it("eliminar una línea recalcula el total esperado", () => {
    const lines = [
      item({ id: "line-1", unitPrice: 100 }),
      item({ id: "line-2", unitPrice: 50 }),
    ];

    expect(documentFormAmounts(lines).total).toBe(181.5);
    expect(
      documentFormAmounts(lines.filter((line) => line.id !== "line-2")).total,
    ).toBe(121);
  });

  it("detecta concepto y cantidad antes de guardar", () => {
    expect(
      firstDocumentFormLineIssue([item({ description: "", unitPrice: 0 })]),
    ).toBe("Añade al menos un concepto.");
    expect(
      firstDocumentFormLineIssue([item({ description: "", unitPrice: 50 })]),
    ).toBe("Completa el concepto de la línea 1 o elimínala.");
    expect(firstDocumentFormLineIssue([item({ quantity: 0 })])).toBe(
      "Indica una cantidad mayor que 0 en la línea 1.",
    );
  });

  it("permite presupuestos sin conceptos", () => {
    expect(
      firstDocumentFormLineIssue([item({ description: "", unitPrice: 0 })], {
        requireConcept: false,
      }),
    ).toBeNull();
  });

  it("prepara guardado sin líneas vacías y sanea valores negativos accidentales", () => {
    const saved = documentFormItemsForSave([
      item({ id: "line-1", description: "  Servicio  ", quantity: 2 }),
      item({ id: "line-2", description: "", unitPrice: 0 }),
      item({ id: "line-3", description: "Ajuste", unitPrice: -20 }),
    ]);

    expect(saved).toHaveLength(2);
    expect(saved[0]).toMatchObject({ description: "Servicio", quantity: 2 });
    expect(saved[1]).toMatchObject({ description: "Ajuste", unitPrice: 0 });
  });

  it("conserva importes firmados solo cuando el formulario edita una rectificativa", () => {
    const cancellation = item({ unitPrice: -100 });
    const signedOptions = { allowSignedAmounts: true };

    expect(firstDocumentFormLineIssue([cancellation])).toBe(
      "Indica un precio válido en la línea 1.",
    );
    expect(
      firstDocumentFormLineIssue([cancellation], signedOptions),
    ).toBeNull();
    expect(
      documentFormItemsForSave([cancellation], false, signedOptions)[0],
    ).toMatchObject({ quantity: 1, unitPrice: -100, ivaPercent: 21 });
    expect(documentFormAmounts([cancellation], false, signedOptions)).toEqual({
      subtotal: -100,
      iva: -21,
      total: -121,
    });
    expect(lineItemFormTotal(cancellation, false, signedOptions)).toBe(-121);

    expect(
      firstDocumentFormLineIssue(
        [item({ quantity: -2, unitPrice: -5 })],
        signedOptions,
      ),
    ).toBeNull();
  });

  it("guarda una línea de m2 con cantidad calculada y medidas en el concepto", () => {
    const saved = documentFormItemsForSave(
      [item({ description: "Persiana aluminio", unit: "m2", quantity: 0 })],
      false,
      {
        lineMeasurementDrafts: {
          "line-1": { pieces: 2, width: 1.2, height: 2.3 },
        },
      },
    );

    expect(saved[0]).toMatchObject({
      quantity: 5.52,
      unit: "m2",
      description: "Persiana aluminio (2 uds x 1,2 x 2,3 m = 5,52 m²)",
    });
  });

  it("guarda una línea de ml con cantidad calculada y metros en el concepto", () => {
    const saved = documentFormItemsForSave(
      [item({ description: "Guía lateral", unit: "ml", quantity: 0 })],
      false,
      {
        lineMeasurementDrafts: {
          "line-1": { pieces: 2, length: 2.55 },
        },
      },
    );

    expect(saved[0]).toMatchObject({
      quantity: 5.1,
      unit: "ml",
      description: "Guía lateral (2 uds x 2,55 m = 5,1 ml)",
    });
  });

  it("calcula el total de línea para mostrarlo en el formulario", () => {
    expect(lineItemFormTotal(item({ quantity: 2, unitPrice: 50 }))).toBe(121);
  });
});
