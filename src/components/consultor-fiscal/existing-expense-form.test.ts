import { describe, expect, it } from "vitest";
import { adaptExistingExpenseForEvaluation } from "@/lib/expense-deductibility";
import type { Expense } from "@/lib/types";
import { projectExistingExpenseToForm } from "./existing-expense-form";

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: "expense-form-1",
    date: "2026-07-12",
    origin: "manual",
    businessKind: "purchase_invoice",
    supplierName: "Proveedor",
    description: "combustible",
    amount: 100,
    ivaPercent: 21,
    category: "Transporte",
    paymentMethod: "Tarjeta",
    purchaseDocument: { invoiceNumber: "F-1" },
    createdAt: "2026-07-12T10:00:00.000Z",
    ...overrides,
  };
}

describe("projectExistingExpenseToForm", () => {
  it("proyecta la adaptación actual sin elevar el documento a factura completa", () => {
    const source = expense();
    const adaptation = adaptExistingExpenseForEvaluation(source, {
      vatExempt: false,
    });

    expect(projectExistingExpenseToForm(source, adaptation)).toEqual({
      concept: "combustible",
      expenseDate: "2026-07-12",
      supplierName: "Proveedor",
      netAmount: "100,00",
      vatAmount: "21,00",
      totalAmount: "121,00",
      paymentMethod: "CARD",
      invoiceType: "UNKNOWN",
    });
  });

  it("resincroniza importes al cambiar Expense o el perfil fiscal", () => {
    const source = expense({ amount: 125 });
    const adaptation = adaptExistingExpenseForEvaluation(source, {
      vatExempt: true,
    });

    expect(projectExistingExpenseToForm(source, adaptation)).toMatchObject({
      netAmount: "125,00",
      vatAmount: "0,00",
      totalAmount: "125,00",
    });
  });

  it("deja importes vacíos cuando el bloqueo canónico impide adaptar", () => {
    const source = expense({
      providerSummary: {
        status: "pending_original",
        summaryId: "summary-1",
        importedAt: "2026-07-12T09:00:00.000Z",
      },
    });
    const adaptation = adaptExistingExpenseForEvaluation(source, {
      vatExempt: false,
    });

    expect(projectExistingExpenseToForm(source, adaptation)).toMatchObject({
      concept: "combustible",
      netAmount: "",
      vatAmount: "",
      totalAmount: "",
      invoiceType: "UNKNOWN",
    });
  });
});
