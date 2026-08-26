import { describe, expect, it } from "vitest";
import type { Document, Expense } from "@/lib/types";
import {
  BILLING_QUOTA_PACK_FULFILLMENT_CONTRACT,
  billingMonthWindow,
  buildBillingQuotaReconciliation,
  isBillingQuotaPackKey,
  isQuotaCountedDocument,
  isQuotaCountedManualExpense,
  quotaLimitForPlan,
} from "./quotas";

function document(overrides: Partial<Document> = {}): Document {
  return {
    id: "document-1",
    type: "factura",
    number: "F-2026-0001",
    date: "2026-08-26",
    client: { name: "Cliente" },
    items: [],
    status: "enviado",
    documentLifecycle: "issued",
    createdAt: "2026-08-26T10:00:00.000Z",
    updatedAt: "2026-08-26T10:00:00.000Z",
    ...overrides,
  };
}

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: "expense-1",
    date: "2026-08-26",
    origin: "manual",
    supplierName: "Proveedor",
    description: "Compra",
    amount: 10,
    ivaPercent: 21,
    category: "Otros",
    paymentMethod: "Tarjeta",
    createdAt: "2026-08-26T10:00:00.000Z",
    ...overrides,
  };
}

describe("central free-plan quotas", () => {
  it("aplica los límites acordados al plan Gratis", () => {
    expect(quotaLimitForPlan("free", "documents")).toBe(15);
    expect(quotaLimitForPlan("free", "manual_expenses")).toBe(10);
    expect(quotaLimitForPlan("free", "customers")).toBe(15);
    expect(quotaLimitForPlan("free", "suppliers")).toBe(15);
  });

  it("no cuenta borradores, rectificativas ni recibos automáticos", () => {
    expect(isQuotaCountedDocument(document())).toBe(true);
    expect(
      isQuotaCountedDocument(document({ status: "borrador" })),
    ).toBe(false);
    expect(
      isQuotaCountedDocument(
        document({
          rectification: {
            originalDocumentId: "invoice-1",
            originalNumber: "F-2026-0001",
            originalDate: "2026-08-26",
            reason: "Corrección",
            type: "correccion",
          },
        }),
      ),
    ).toBe(false);
    expect(
      isQuotaCountedDocument(
        document({ type: "recibo", sourceDocumentId: "invoice-1" }),
      ),
    ).toBe(false);
  });

  it("solo cuenta como manual el gasto creado a mano", () => {
    expect(isQuotaCountedManualExpense(expense())).toBe(true);
    expect(isQuotaCountedManualExpense(expense({ origin: "scan" }))).toBe(
      false,
    );
    expect(isQuotaCountedManualExpense(expense({ origin: "recurring" }))).toBe(
      false,
    );
  });

  it("reconcilia el mes de Madrid y excluye marcadores internos de producto", () => {
    const reconciliation = buildBillingQuotaReconciliation({
      documents: [
        document({ id: "april", createdAt: "2026-04-30T21:59:59.000Z" }),
        document({ id: "may", createdAt: "2026-04-30T22:00:00.000Z" }),
      ],
      expenses: [expense({ id: "expense-may" })],
      customers: [{ id: "customer-1" }],
      suppliers: [{ id: "supplier-1" }],
      products: [
        { id: "product-1", hidden: false },
        { id: "family-marker", hidden: true },
      ],
      monthKey: "2026-05",
    });

    expect(reconciliation.documents).toEqual(["may"]);
    expect(reconciliation.products).toEqual(["product-1"]);
  });

  it("calcula el reinicio mensual en medianoche de Madrid", () => {
    expect(
      billingMonthWindow(new Date("2026-03-15T12:00:00.000Z")).resetAt,
    ).toBe("2026-03-31T22:00:00.000Z");
    expect(
      billingMonthWindow(new Date("2026-10-15T12:00:00.000Z")).resetAt,
    ).toBe("2026-10-31T23:00:00.000Z");
  });

  it("solo acepta los tres packs con contrato atómico versionado", () => {
    expect(isBillingQuotaPackKey("documents_5")).toBe(true);
    expect(isBillingQuotaPackKey("manual_expenses_10")).toBe(true);
    expect(isBillingQuotaPackKey("contacts_5")).toBe(true);
    expect(isBillingQuotaPackKey("documents_5000")).toBe(false);
    expect(BILLING_QUOTA_PACK_FULFILLMENT_CONTRACT).toBe(
      "quota_pack_atomic_v1",
    );
  });
});
