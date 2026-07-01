import { describe, expect, it } from "vitest";
import { normalizeExpenseScanPayload } from "./schema";

describe("expense scan schema", () => {
  it("normaliza un payload válido", () => {
    const result = normalizeExpenseScanPayload({
      supplier: { name: "Leroy Merlin", nif: "B12345678" },
      expense: {
        date: "12/05/2026",
        description: "Material",
        amount: 42.5,
        ivaPercent: 21,
        category: "Material",
        paymentMethod: "Tarjeta",
        notes: "FM-99",
      },
      confidence: 0.9,
      warnings: [],
    });

    expect(result?.supplier.name).toBe("Leroy Merlin");
    expect(result?.expense.date).toBe("2026-05-12");
    expect(result?.expense.businessKind).toBe("purchase_invoice");
    expect(result?.expense.amount).toBe(42.5);
    expect(result?.expense.paymentMethod).toBe("Tarjeta");
  });

  it("clasifica tickets escaneados sin NIF como gasto rápido", () => {
    const result = normalizeExpenseScanPayload({
      supplier: { name: "Gasolinera" },
      expense: {
        date: "2026-01-01",
        description: "Ticket combustible",
        amount: 15,
        ivaPercent: 21,
        category: "Vehículo",
        paymentMethod: "Tarjeta",
      },
      confidence: 0.9,
      warnings: [],
    });

    expect(result?.expense.businessKind).toBe("quick_ticket");
  });

  it("rechaza datos incompletos", () => {
    expect(
      normalizeExpenseScanPayload({
        supplier: { name: "" },
        expense: { description: "x", amount: 0 },
      }),
    ).toBeNull();
  });

  it("añade aviso con baja confianza", () => {
    const result = normalizeExpenseScanPayload({
      supplier: { name: "Tienda" },
      expense: {
        date: "2026-01-01",
        description: "Gasto",
        amount: 10,
        ivaPercent: 21,
        category: "Otros",
        paymentMethod: "Efectivo",
      },
      confidence: 0.4,
      warnings: [],
    });
    expect(result?.warnings.some((w) => w.includes("Confianza baja"))).toBe(true);
  });

  it("normaliza líneas de compra detectadas", () => {
    const result = normalizeExpenseScanPayload({
      supplier: { name: "Metalúrgica Arandes", nif: "B12345678" },
      expense: {
        date: "2026-06-30",
        description: "Material persiana",
        amount: 100,
        ivaPercent: 21,
        category: "Material",
        paymentMethod: "Tarjeta",
        purchaseLines: [
          {
            description: " Lama persiana ",
            quantity: "2",
            unit: "ud",
            unitPrice: "30,50",
            discountPercent: 10,
            ivaPercent: 21,
          },
          {
            description: "Transporte",
            quantity: 1,
            total: 12,
            ivaPercent: 0,
          },
          {
            description: "",
            quantity: 1,
            unitPrice: 99,
          },
        ],
      },
      confidence: 0.9,
      warnings: [],
    });

    expect(result?.expense.purchaseLines).toHaveLength(2);
    expect(result?.expense.purchaseLines?.[0]).toMatchObject({
      description: "Lama persiana",
      quantity: 2,
      unitPrice: 30.5,
      discountPercent: 10,
      ivaPercent: 21,
    });
    expect(result?.expense.purchaseLines?.[1]).toMatchObject({
      description: "Transporte",
      unitPrice: 12,
      total: 12,
      ivaPercent: 0,
    });
  });

  it("normaliza datos estructurados de factura de proveedor", () => {
    const result = normalizeExpenseScanPayload({
      supplier: { name: "Proveedor SL", nif: "B87654321" },
      expense: {
        date: "30/06/2026",
        description: "Compra material",
        amount: 100,
        ivaPercent: 21,
        category: "Material",
        paymentMethod: "Transferencia",
        purchaseDocument: {
          invoiceNumber: " FD-224572 ",
          dueDate: "15/07/2026",
          supplierAddress: "Calle Mayor 1",
          supplierPostalCode: "08001",
          supplierCity: "Barcelona",
          paymentTerms: "30 días",
        },
      },
      confidence: 0.9,
      warnings: [],
    });

    expect(result?.expense.purchaseDocument).toMatchObject({
      invoiceNumber: "FD-224572",
      issueDate: "2026-06-30",
      dueDate: "2026-07-15",
      supplierNif: "B87654321",
      supplierAddress: "Calle Mayor 1",
      supplierPostalCode: "08001",
      supplierCity: "Barcelona",
      paymentTerms: "30 días",
    });
  });
});
