import { describe, expect, it } from "vitest";
import {
  documentFormAmounts,
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

  it("redondea cantidades y precios decimales en totales visibles", () => {
    const totals = documentFormAmounts([
      item({ quantity: 1.5, unitPrice: 33.33, ivaPercent: 21 }),
    ]);

    expect(totals.subtotal).toBe(50);
    expect(totals.iva).toBe(10.5);
    expect(totals.total).toBe(60.49);
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

  it("calcula el total de línea para mostrarlo en el formulario", () => {
    expect(lineItemFormTotal(item({ quantity: 2, unitPrice: 50 }))).toBe(121);
  });
});
