import { describe, expect, it } from "vitest";
import type { TaxSummary } from "@/lib/taxes";
import type { Document, Expense } from "@/lib/types";
import { mapExistingExpenseToProfitabilityCost } from "./expense-adapter";
import { mapExistingInvoiceToProfitabilityIncome } from "./invoice-adapter";
import { mapExistingQuoteToProfitabilityQuote } from "./quote-adapter";
import { mapExistingTaxSummaryToProfitabilityTaxContext } from "./tax-adapter";

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function baseDocument(overrides: Partial<Document>): Document {
  return {
    id: "doc_1",
    type: "factura",
    number: "F-2026-0001",
    date: "2026-07-01",
    client: {
      name: "Cliente Demo",
    },
    items: [
      {
        id: "line_1",
        description: "Servicio",
        quantity: 2,
        unitPrice: 100,
        ivaPercent: 21,
      },
    ],
    status: "enviado",
    createdAt: "2026-07-01T10:00:00.000Z",
    updatedAt: "2026-07-01T10:00:00.000Z",
    ...overrides,
  };
}

function baseExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: "expense_1",
    date: "2026-07-02",
    origin: "scan",
    businessKind: "purchase",
    supplierName: "Proveedor Demo",
    description: "Material para trabajo",
    amount: 50,
    ivaPercent: 21,
    category: "Material",
    paymentMethod: "Tarjeta",
    purchaseLines: [
      {
        id: "purchase_line_1",
        description: "Material A",
        quantity: 1,
        unitPrice: 50,
        ivaPercent: 21,
      },
    ],
    createdAt: "2026-07-02T10:00:00.000Z",
    ...overrides,
  };
}

describe("rentabilidad real read-only adapters", () => {
  it("mapExistingExpenseToProfitabilityCost does not mutate input", () => {
    const expense = baseExpense();
    const before = deepClone(expense);

    const mapped = mapExistingExpenseToProfitabilityCost(expense);

    expect(expense).toEqual(before);
    expect(mapped).toMatchObject({
      id: "expense_1",
      amount: 50,
      ivaAmount: 10.5,
      total: 60.5,
      purchaseLineCount: 1,
    });
  });

  it("mapExistingInvoiceToProfitabilityIncome does not mutate input", () => {
    const invoice = baseDocument({
      sourceQuoteDocumentId: "quote_1",
      sourceQuoteNumber: "P-2026-0001",
    });
    const before = deepClone(invoice);

    const mapped = mapExistingInvoiceToProfitabilityIncome(invoice);

    expect(invoice).toEqual(before);
    expect(mapped).toMatchObject({
      id: "doc_1",
      subtotal: 200,
      iva: 42,
      total: 242,
      sourceQuoteDocumentId: "quote_1",
    });
  });

  it("mapExistingInvoiceToProfitabilityIncome treats total annulment as final income zero", () => {
    const rectificativa = baseDocument({
      id: "rect_1",
      number: "FR-2026-0001",
      rectification: {
        originalDocumentId: "doc_1",
        originalNumber: "F-2026-0001",
        originalDate: "2026-07-01",
        reason: "Anulación total",
        type: "anulacion",
      },
      items: [
        {
          id: "line_1",
          description: "Servicio",
          quantity: 2,
          unitPrice: -100,
          ivaPercent: 21,
        },
      ],
    });

    const mapped = mapExistingInvoiceToProfitabilityIncome(rectificativa);

    expect(mapped).toMatchObject({
      subtotal: 0,
      iva: 0,
      total: 0,
    });
  });

  it("mapExistingQuoteToProfitabilityQuote does not mutate input", () => {
    const quote = baseDocument({
      id: "quote_1",
      type: "presupuesto",
      number: "P-2026-0001",
      status: "aceptado",
      acceptanceStatus: "accepted",
    });
    const invoice = baseDocument({
      id: "invoice_1",
      sourceQuoteDocumentId: "quote_1",
    });
    const before = deepClone(quote);

    const mapped = mapExistingQuoteToProfitabilityQuote(quote, [
      quote,
      invoice,
    ]);

    expect(quote).toEqual(before);
    expect(mapped).toMatchObject({
      id: "quote_1",
      linkedInvoiceId: "invoice_1",
      subtotal: 200,
    });
  });

  it("mapExistingTaxSummaryToProfitabilityTaxContext does not mutate input", () => {
    const summary: TaxSummary = {
      vatExempt: false,
      salesBase: 1000,
      salesIva: 210,
      expenseBase: 300,
      expenseIva: 63,
      netIva: 147,
      ivaToPay: 147,
      ivaCredit: 0,
      grossProfit: 700,
      irpfPercent: 20,
      irpfEstimate: 140,
      estimatedNetProfit: 413,
    };
    const before = deepClone(summary);

    const mapped = mapExistingTaxSummaryToProfitabilityTaxContext(summary);

    expect(summary).toEqual(before);
    expect(mapped).toMatchObject({
      salesBase: 1000,
      expenseBase: 300,
      ivaToPay: 147,
      sourceLink: {
        href: "/impuestos",
      },
    });
  });
});
