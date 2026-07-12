import { describe, expect, it } from "vitest";
import { expenseFromRecurring } from "@/lib/recurring-expenses";
import type { TaxSummary } from "@/lib/taxes";
import type { Document, Expense, RecurringExpense } from "@/lib/types";
import {
  mapExistingExpenseToProfitabilityCost,
  mapExistingRecurringExpenseToProfitabilityFixedCost,
  mapExistingRecurringOccurrenceToProfitabilityFixedCost,
} from "./expense-adapter";
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
      fiscalDeductible: true,
      ivaAmount: 10.5,
      total: 60.5,
      purchaseLineCount: 1,
    });
  });

  it("propaga el IVA mixto conciliado a Rentabilidad Real", () => {
    const mapped = mapExistingExpenseToProfitabilityCost(
      baseExpense({
        amount: 200,
        ivaPercent: 21,
        purchaseLines: [
          {
            id: "mixed-21",
            description: "Material general",
            quantity: 1,
            unitPrice: 100,
            ivaPercent: 21,
          },
          {
            id: "mixed-10",
            description: "Material reducido",
            quantity: 1,
            unitPrice: 100,
            ivaPercent: 10,
          },
        ],
      }),
    );

    expect(mapped).toMatchObject({
      amount: 200,
      fiscalDeductible: true,
      ivaAmount: 31,
      total: 231,
      purchaseLineCount: 2,
    });
  });

  it("propaga el coste no recuperable con recargo a Rentabilidad Real", () => {
    const mapped = mapExistingExpenseToProfitabilityCost(
      baseExpense({
        amount: 100,
        purchaseLines: undefined,
        providerSummary: {
          status: "pending_original",
          summaryId: "summary-re",
          importedAt: "2026-07-11T10:00:00.000Z",
          summaryInvoiceTotal: 126.2,
          summaryIvaPercent: 21,
          summaryIvaAmount: 21,
          summaryRecargoPercent: 5.2,
          summaryRecargoAmount: 5.2,
        },
      }),
    );

    expect(mapped).toMatchObject({
      amount: 126.2,
      fiscalDeductible: true,
      ivaAmount: 0,
      total: 126.2,
    });
  });

  it("propaga un abono firmado como coste e IVA negativos", () => {
    const credit = baseExpense({
      id: "expense_credit",
      amount: -100,
      ivaPercent: 21,
      purchaseLines: [
        {
          id: "credit_line",
          description: "Devolución de material",
          quantity: -1,
          unitPrice: 100,
          ivaPercent: 21,
          total: -100,
        },
      ],
    });
    const before = deepClone(credit);

    expect(mapExistingExpenseToProfitabilityCost(credit)).toMatchObject({
      id: "expense_credit",
      amount: -100,
      fiscalDeductible: true,
      ivaPercent: 21,
      ivaAmount: -21,
      total: -121,
      purchaseLineCount: 1,
    });
    expect(credit).toEqual(before);
  });

  it("mantiene íntegro un fijo no deducible con líneas documentales", () => {
    const expense = baseExpense({
      amount: 100,
      ivaPercent: 21,
      businessKind: "fixed",
      deductibility: "non_deductible",
      purchaseLines: [
        {
          id: "fixed-21",
          description: "Cuota general",
          quantity: 1,
          unitPrice: 60,
          ivaPercent: 21,
        },
        {
          id: "fixed-10",
          description: "Cuota reducida",
          quantity: 1,
          unitPrice: 40,
          ivaPercent: 10,
        },
      ],
    });
    const before = deepClone(expense);

    expect(mapExistingExpenseToProfitabilityCost(expense)).toMatchObject({
      amount: 100,
      fiscalDeductible: false,
      ivaPercent: 0,
      ivaAmount: 0,
      total: 100,
      businessKind: "fixed",
      purchaseLineCount: 2,
    });
    expect(expense).toEqual(before);
  });

  it("mantiene el coste no deducible completo sin IVA fiscal", () => {
    const mapped = mapExistingExpenseToProfitabilityCost(
      baseExpense({ deductibility: "non_deductible" }),
    );

    expect(mapped).toMatchObject({
      amount: 60.5,
      fiscalDeductible: false,
      ivaPercent: 0,
      ivaAmount: 0,
      total: 60.5,
    });
  });

  it("normaliza recurrencias mensuales, trimestrales y anuales", () => {
    const annual: RecurringExpense = {
      id: "annual_1",
      supplierName: "Aseguradora Demo",
      description: "Seguro anual",
      amount: 1200,
      ivaPercent: 21,
      category: "Seguros",
      paymentMethod: "Domiciliación",
      frequency: "annual",
      dueTiming: { kind: "day_of_month", day: 1 },
      dueMonth: 1,
      duration: { kind: "indefinite" },
      startDate: "2026-01-01",
      enabled: true,
      createdAt: "2026-01-01T10:00:00.000Z",
      updatedAt: "2026-01-01T10:00:00.000Z",
    };
    const before = deepClone(annual);

    const mapped = [
      mapExistingRecurringExpenseToProfitabilityFixedCost({
        ...annual,
        id: "monthly_1",
        frequency: "monthly",
      }),
      mapExistingRecurringExpenseToProfitabilityFixedCost({
        ...annual,
        id: "quarterly_1",
        frequency: "quarterly",
      }),
      mapExistingRecurringExpenseToProfitabilityFixedCost(annual),
    ];

    expect(annual).toEqual(before);
    expect(
      mapped.map(({ id, amount, ivaAmount, total, frequency }) => ({
        id,
        amount,
        ivaAmount,
        total,
        frequency,
      })),
    ).toEqual([
      {
        id: "monthly_1",
        amount: 1200,
        ivaAmount: 252,
        total: 1452,
        frequency: "monthly",
      },
      {
        id: "quarterly_1",
        amount: 400,
        ivaAmount: 84,
        total: 484,
        frequency: "quarterly",
      },
      {
        id: "annual_1",
        amount: 100,
        ivaAmount: 21,
        total: 121,
        frequency: "annual",
      },
    ]);
  });

  it("mantiene base más IVA igual al total tras mensualizar", () => {
    const annual: RecurringExpense = {
      id: "annual_rounding",
      supplierName: "Aseguradora Demo",
      description: "Seguro anual",
      amount: 100,
      ivaPercent: 10,
      category: "Seguros",
      paymentMethod: "Domiciliación",
      frequency: "annual",
      dueTiming: { kind: "day_of_month", day: 1 },
      dueMonth: 1,
      duration: { kind: "indefinite" },
      startDate: "2026-01-01",
      enabled: true,
      createdAt: "2026-01-01T10:00:00.000Z",
      updatedAt: "2026-01-01T10:00:00.000Z",
    };

    const mapped = mapExistingRecurringExpenseToProfitabilityFixedCost(annual);

    expect(mapped).toMatchObject({
      amount: 8.33,
      ivaAmount: 0.83,
      total: 9.16,
    });
    expect(mapped.total).toBe(mapped.amount + mapped.ivaAmount);
  });

  it("mensualiza el coste no deducible completo sin deducir su IVA", () => {
    const recurring: RecurringExpense = {
      id: "annual_non_deductible",
      supplierName: "Aseguradora Demo",
      description: "Seguro no desgravable",
      amount: 1200,
      ivaPercent: 21,
      deductibility: "non_deductible",
      category: "Seguros",
      paymentMethod: "Domiciliación",
      frequency: "annual",
      dueTiming: { kind: "day_of_month", day: 1 },
      dueMonth: 1,
      duration: { kind: "indefinite" },
      startDate: "2026-01-01",
      enabled: true,
      createdAt: "2026-01-01T10:00:00.000Z",
      updatedAt: "2026-01-01T10:00:00.000Z",
    };

    expect(
      mapExistingRecurringExpenseToProfitabilityFixedCost(recurring),
    ).toMatchObject({
      amount: 100,
      fiscalDeductible: false,
      ivaPercent: 0,
      ivaAmount: 0,
      total: 100,
    });
  });

  it("mantiene paridad entre regla activa y ocurrencia histórica no deducible", () => {
    const recurring: RecurringExpense = {
      id: "annual_non_deductible_parity",
      supplierName: "Aseguradora Demo",
      description: "Seguro no desgravable",
      amount: 1200,
      ivaPercent: 21,
      deductibility: "non_deductible",
      category: "Seguros",
      paymentMethod: "Domiciliación",
      frequency: "annual",
      dueTiming: { kind: "day_of_month", day: 1 },
      dueMonth: 1,
      duration: { kind: "indefinite" },
      startDate: "2026-01-01",
      enabled: true,
      createdAt: "2026-01-01T10:00:00.000Z",
      updatedAt: "2026-01-01T10:00:00.000Z",
    };
    const generated: Expense = {
      ...expenseFromRecurring(recurring, "2026-07-01"),
      id: "annual_non_deductible_occurrence",
      createdAt: "2026-07-01T10:00:00.000Z",
    };
    const paused = { ...recurring, enabled: false };

    const active = mapExistingRecurringExpenseToProfitabilityFixedCost(
      recurring,
    );
    const historical =
      mapExistingRecurringOccurrenceToProfitabilityFixedCost(
        generated,
        paused,
      );

    expect(generated.ivaPercent).toBe(0);
    expect(active).toMatchObject({
      amount: 100,
      fiscalDeductible: false,
      ivaPercent: 0,
      ivaAmount: 0,
      total: 100,
    });
    expect(historical).toMatchObject({
      amount: 100,
      fiscalDeductible: false,
      ivaPercent: 0,
      ivaAmount: 0,
      total: 100,
    });
  });

  it("hereda la deducibilidad de la regla y respeta un override de ocurrencia", () => {
    const recurring: RecurringExpense = {
      id: "annual_inheritance",
      supplierName: "Aseguradora Demo",
      description: "Seguro anual",
      amount: 1200,
      ivaPercent: 21,
      deductibility: "non_deductible",
      category: "Seguros",
      paymentMethod: "Domiciliación",
      frequency: "annual",
      dueTiming: { kind: "day_of_month", day: 1 },
      dueMonth: 1,
      duration: { kind: "indefinite" },
      startDate: "2026-01-01",
      enabled: false,
      createdAt: "2026-01-01T10:00:00.000Z",
      updatedAt: "2026-01-01T10:00:00.000Z",
    };
    const occurrence = baseExpense({
      id: "annual_inheritance_occurrence",
      amount: 1200,
      ivaPercent: 21,
      deductibility: undefined,
      businessKind: "fixed",
      recurringExpenseId: recurring.id,
    });

    expect(
      mapExistingRecurringOccurrenceToProfitabilityFixedCost(
        occurrence,
        recurring,
      ),
    ).toMatchObject({
      amount: 100,
      fiscalDeductible: false,
      ivaPercent: 0,
      ivaAmount: 0,
      total: 100,
    });
    expect(
      mapExistingRecurringOccurrenceToProfitabilityFixedCost(
        { ...occurrence, deductibility: "deductible" },
        recurring,
      ),
    ).toMatchObject({
      amount: 100,
      fiscalDeductible: true,
      ivaPercent: 21,
      ivaAmount: 21,
      total: 121,
    });
  });

  it("falla cerrado ante deducibilidad recurrente desconocida", () => {
    const recurring: RecurringExpense = {
      id: "annual_unknown_deductibility",
      supplierName: "Aseguradora Demo",
      description: "Seguro con marca desconocida",
      amount: 1200,
      ivaPercent: 21,
      deductibility: "unknown" as never,
      category: "Seguros",
      paymentMethod: "Domiciliación",
      frequency: "annual",
      dueTiming: { kind: "day_of_month", day: 1 },
      dueMonth: 1,
      duration: { kind: "indefinite" },
      startDate: "2026-01-01",
      enabled: true,
      createdAt: "2026-01-01T10:00:00.000Z",
      updatedAt: "2026-01-01T10:00:00.000Z",
    };

    expect(
      mapExistingRecurringExpenseToProfitabilityFixedCost(recurring),
    ).toMatchObject({
      amount: 121,
      fiscalDeductible: false,
      ivaPercent: 0,
      ivaAmount: 0,
      total: 121,
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
      integrityBlockedDocuments: 0,
      unsupportedRectificationDocuments: 0,
      lineVatExpenseCount: 0,
      headerVatExpenseCount: 0,
      unsupportedMixedVatExpenses: 0,
      salesBase: 1000,
      salesIva: 210,
      expenseBase: 300,
      expenseIva: 63,
      operatingExpenseCost: 300,
      nonDeductibleExpenseCount: 0,
      nonDeductibleExpenseTotal: 0,
      netIva: 147,
      ivaToPay: 147,
      ivaCredit: 0,
      grossProfit: 700,
      estimatedIrpfBase: 700,
      irpfPercent: 20,
      irpfEstimate: 140,
      profitAfterIrpfReserve: 560,
    };
    const before = deepClone(summary);

    const mapped = mapExistingTaxSummaryToProfitabilityTaxContext(summary);

    expect(summary).toEqual(before);
    expect(mapped).toMatchObject({
      salesBase: 1000,
      expenseBase: 300,
      operatingExpenseCost: 300,
      estimatedIrpfBase: 700,
      ivaToPay: 147,
      profitAfterIrpfReserve: 560,
      sourceLink: {
        href: "/impuestos",
      },
    });
  });
});
