import { describe, expect, it } from "vitest";
import type { Expense } from "@/lib/types";
import { adaptExistingExpenseForEvaluation } from "./existing-expense-adapter";

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: "expense-1",
    date: "2026-07-12",
    origin: "manual",
    businessKind: "purchase_invoice",
    supplierName: "Taller Ejemplo",
    description: "reparación coche",
    amount: 100,
    ivaPercent: 21,
    category: "Transporte",
    paymentMethod: "Tarjeta",
    purchaseDocument: { invoiceNumber: "F-42" },
    createdAt: "2026-07-12T10:00:00.000Z",
    ...overrides,
  };
}

const PROFILE = { vatExempt: false } as const;

describe("adaptExistingExpenseForEvaluation", () => {
  it("reutiliza Expense y el cálculo canónico de IVA sin crear otra entidad", () => {
    const result = adaptExistingExpenseForEvaluation(expense(), PROFILE);

    expect(result).toEqual({
      status: "READY",
      sourceExpenseId: "expense-1",
      input: {
        concept: "reparación coche",
        supplierName: "Taller Ejemplo",
        expenseDate: "2026-07-12",
        netAmountCents: 10_000,
        vatAmountCents: 2_100,
        totalAmountCents: 12_100,
        currency: "EUR",
        paymentMethod: "CARD",
        invoiceType: "UNKNOWN",
      },
      warnings: [],
    });
  });

  it("no convierte un número de factura aislado en justificante completo", () => {
    const result = adaptExistingExpenseForEvaluation(expense(), PROFILE);

    expect(result).toMatchObject({
      status: "READY",
      input: { invoiceType: "UNKNOWN" },
    });
  });

  it("no convierte un escaneo legacy en ticket sin clasificación canónica explícita", () => {
    const result = adaptExistingExpenseForEvaluation(
      expense({ origin: "scan", businessKind: undefined }),
      PROFILE,
    );

    expect(result).toMatchObject({
      status: "READY",
      input: { invoiceType: "UNKNOWN" },
    });
  });

  it("conserva un ticket cuando la clasificación canónica es explícita", () => {
    const result = adaptExistingExpenseForEvaluation(
      expense({ origin: "scan", businessKind: "quick_ticket" }),
      PROFILE,
    );

    expect(result).toMatchObject({
      status: "READY",
      input: { invoiceType: "RECEIPT" },
    });
  });

  it("mantiene visible un bloqueo de IVA mixto en vez de devolver ceros", () => {
    const result = adaptExistingExpenseForEvaluation(
      expense({
        purchaseLines: [
          {
            id: "line-1",
            description: "pieza",
            quantity: 1,
            unitPrice: 50,
            total: 50,
            ivaPercent: 10,
          },
          {
            id: "line-2",
            description: "servicio sin tipo",
            quantity: 1,
            unitPrice: 50,
            total: 50,
          },
        ],
      }),
      PROFILE,
    );

    expect(result).toMatchObject({
      status: "NEEDS_REVIEW",
      input: null,
      vatIssue: "mixed_vat_missing_rate",
    });
    expect(JSON.stringify(result)).not.toContain("netAmountCents");
  });

  it("bloquea resúmenes de proveedor pendientes del original", () => {
    const result = adaptExistingExpenseForEvaluation(
      expense({
        providerSummary: {
          status: "pending_original",
          summaryId: "summary-1",
          importedAt: "2026-07-12T09:00:00.000Z",
        },
      }),
      PROFILE,
    );

    expect(result).toMatchObject({ status: "NEEDS_REVIEW", input: null });
    if (result.status === "READY") throw new Error("Expected review blocker");
    expect(result.missingInformation.join(" ")).toMatch(/documento original/i);
  });

  it("no reinterpreta automáticamente un gasto marcado no deducible", () => {
    const result = adaptExistingExpenseForEvaluation(
      expense({ deductibility: "non_deductible" }),
      PROFILE,
    );

    expect(result).toMatchObject({ status: "READY" });
    expect(result.warnings.join(" ")).toMatch(/no modifica/i);
  });

  it("reutiliza del perfil la exención de IVA sin alterar el Expense", () => {
    const original = expense();

    const result = adaptExistingExpenseForEvaluation(original, {
      vatExempt: true,
    });

    expect(result).toMatchObject({
      status: "READY",
      input: {
        netAmountCents: 10_000,
        vatAmountCents: 0,
        totalAmountCents: 10_000,
      },
    });
    expect(original).toEqual(expense());
  });
});
