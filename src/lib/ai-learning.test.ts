import { describe, expect, it } from "vitest";
import {
  aiLearningAccountForEmail,
  buildExpenseScanLearningEvent,
} from "./ai-learning";
import type { ExpenseScanPayload } from "./expense-scan/schema";

function payload(patch: Partial<ExpenseScanPayload> = {}): ExpenseScanPayload {
  return {
    document: {
      kind: "expense_invoice",
      isExpenseDocument: true,
    },
    supplier: {
      name: "METALURGICA ARANDES",
      nif: "B12345678",
      suggestedCategory: "Material",
    },
    expense: {
      date: "2026-07-03",
      businessKind: "purchase",
      description: "Factura FD-225585 persianas",
      amount: 320.38,
      ivaPercent: 21,
      category: "Material",
      paymentMethod: "Transferencia",
      notes: "Factura proveedor",
      purchaseDocument: {
        invoiceNumber: "FD-225585",
        supplierNif: "B12345678",
        supplierAddress: "Calle Mayor 1",
      },
      purchaseLines: [
        {
          description: "MB490 MINIAL Blanco",
          quantity: 4,
          unit: "ud",
          unitPrice: 78.58,
          discountPercent: 40,
          ivaPercent: 21,
          total: 320.38,
        },
      ],
    },
    confidence: 0.84,
    warnings: [],
    ...patch,
  };
}

describe("ai learning", () => {
  it("limita las cuentas autorizadas", () => {
    expect(aiLearningAccountForEmail("puntoracingrc@gmail.com").allowed).toBe(
      true,
    );
    expect(aiLearningAccountForEmail("persianasalmar@gmail.com").allowed).toBe(
      true,
    );
    expect(aiLearningAccountForEmail("persianasalmar@gamail.com").allowed).toBe(
      false,
    );
    expect(aiLearningAccountForEmail("cliente@example.com").allowed).toBe(false);
  });

  it("construye aprendizaje estructural sin datos identificativos ni precios", () => {
    const event = buildExpenseScanLearningEvent(
      {
        original: payload(),
        corrected: payload({
          expense: {
            ...payload().expense,
            amount: 320.38,
            purchaseLines: [
              {
                description: "MB490 MINIAL Blanco",
                quantity: 8.21,
                unit: "m2",
                unitPrice: 39,
                discountPercent: 40,
                ivaPercent: 21,
                total: 320.38,
              },
            ],
          },
        }),
      },
      {
        userId: "user-1",
        email: "persianasalmar@gmail.com",
      },
    );

    expect(event?.accountLabel).toBe("persianas_almar");
    const serialized = JSON.stringify(event?.payload);
    expect(serialized).not.toContain("METALURGICA");
    expect(serialized).not.toContain("B12345678");
    expect(serialized).not.toContain("FD-225585");
    expect(serialized).not.toContain("320.38");
    expect(serialized).toContain("m2");
    expect(serialized).toContain("changed");
  });
});
