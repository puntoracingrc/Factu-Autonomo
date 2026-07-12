import { describe, expect, it } from "vitest";
import {
  assertTaxSummaryExportable,
  calculateTaxSummary,
  expenseIvaAmount,
  isTaxableSaleDocument,
  selectTaxableFiscalDocumentsForPeriod,
  TaxExportBlockedError,
} from "./taxes";
import { issueDocument } from "./document-integrity";
import { isCollectedDocument } from "./income";
import { isDateInQuarter } from "./periods";
import type {
  BusinessProfile,
  Document,
  Expense,
  RectificationType,
} from "./types";
import { DEFAULT_PROFILE } from "./types";
import { collectedSalesTotal } from "./vat-regime";

const TEST_PROFILE: BusinessProfile = {
  ...DEFAULT_PROFILE,
  name: "Autónomo Test",
  nif: "12345678Z",
  address: "Calle Mayor 1",
  postalCode: "28001",
  city: "Madrid",
};

function invoice(
  status: Document["status"],
  subtotal = 100,
  overrides: Partial<Document> = {},
): Document {
  return {
    id: "1",
    type: "factura",
    number: "F-2026-0001",
    date: "2026-06-09",
    client: {
      name: "Ana",
      firstName: "Ana",
      lastName: "",
      nif: "X1234567L",
      address: "Calle Cliente 2",
      postalCode: "28002",
      city: "Madrid",
    },
    items: [
      {
        id: "l1",
        description: "Servicio",
        quantity: 1,
        unitPrice: subtotal,
        ivaPercent: 21,
      },
    ],
    status,
    createdAt: "2026-06-09",
    updatedAt: "2026-06-09",
    ...overrides,
  };
}

function issuedInvoice(
  status: Document["status"],
  subtotal = 100,
  overrides: Partial<Document> = {},
  profile: BusinessProfile = TEST_PROFILE,
): Document {
  const issued = issueDocument(
    invoice("borrador", subtotal, overrides),
    profile,
    "2026-06-09T10:00:00.000Z",
  );
  return { ...issued, status };
}

function issuedRectificationPair({
  type,
  originalDate,
  rectificationDate,
  originalSubtotal = 100,
  rectificationSubtotal = type === "anulacion" ? -originalSubtotal : 70,
}: {
  type: RectificationType;
  originalDate: string;
  rectificationDate: string;
  originalSubtotal?: number;
  rectificationSubtotal?: number;
}): { original: Document; rectification: Document } {
  const original = issueDocument(
    invoice("borrador", originalSubtotal, {
      id: `original-${type}-${originalDate}`,
      number: `F-${originalDate.slice(0, 4)}-0001`,
      date: originalDate,
    }),
    TEST_PROFILE,
    `${originalDate}T10:00:00.000Z`,
  );
  const rectification = issueDocument(
    invoice("borrador", rectificationSubtotal, {
      id: `rectification-${type}-${rectificationDate}`,
      number: `FR-${rectificationDate.slice(0, 4)}-0001`,
      date: rectificationDate,
      rectification: {
        originalDocumentId: original.id,
        originalNumber: original.number,
        originalDate: original.date,
        reason:
          type === "anulacion" ? "Anulación total" : "Corrección de datos",
        type,
      },
      documentLifecycle: "draft",
      integrityLock: "unlocked",
    }),
    TEST_PROFILE,
    `${rectificationDate}T10:00:00.000Z`,
  );

  return {
    original: {
      ...original,
      status: type === "anulacion" ? "anulada" : "rectificada",
      documentLifecycle: type === "anulacion" ? "canceled" : "issued",
      rectifiedById: rectification.id,
    },
    rectification,
  };
}

const expense: Expense = {
  id: "e1",
  date: "2026-06-09",
  supplierName: "Proveedor",
  description: "Material",
  amount: 50,
  ivaPercent: 21,
  category: "Material",
  paymentMethod: "Tarjeta",
  createdAt: "2026-06-09",
};

function mixedVatExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    ...expense,
    id: "mixed-expense",
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
    ...overrides,
  };
}

describe("isTaxableSaleDocument", () => {
  it("incluye facturas emitidas y excluye borradores", () => {
    expect(isTaxableSaleDocument(invoice("enviado"))).toBe(true);
    expect(isTaxableSaleDocument(invoice("borrador"))).toBe(false);
    expect(isTaxableSaleDocument(invoice("anulada"))).toBe(false);
  });

  it("excluye recibos automáticos", () => {
    const autoReceipt: Document = {
      ...invoice("pagado"),
      id: "r1",
      type: "recibo",
      number: "R-1",
      sourceDocumentId: "inv-1",
    };
    expect(isTaxableSaleDocument(autoReceipt)).toBe(false);
  });

  it("excluye la factura original cuando ya tiene rectificativa", () => {
    expect(
      isTaxableSaleDocument(
        invoice("rectificada", 100, { rectifiedById: "rect-1" }),
      ),
    ).toBe(false);
    expect(
      isTaxableSaleDocument(
        invoice("enviado", 80, {
          id: "rect-1",
          number: "FR-2026-0001",
          rectification: {
            originalDocumentId: "1",
            originalNumber: "F-2026-0001",
            originalDate: "2026-06-09",
            reason: "Corrección de datos",
            type: "correccion",
          },
        }),
      ),
    ).toBe(true);
  });
});

describe("calculateTaxSummary", () => {
  it("mantiene el IVA separado del resultado tras reservar el IRPF", () => {
    const summary = calculateTaxSummary([issuedInvoice("pagado", 1000)], [expense], {
      irpfPercent: 20,
    });
    expect(summary.salesBase).toBe(1000);
    expect(summary.salesIva).toBe(210);
    expect(summary.expenseBase).toBe(50);
    expect(summary.expenseIva).toBe(10.5);
    expect(summary.operatingExpenseCost).toBe(50);
    expect(summary.netIva).toBeCloseTo(199.5, 1);
    expect(summary.ivaToPay).toBeCloseTo(199.5, 1);
    expect(summary.grossProfit).toBe(950);
    expect(summary.estimatedIrpfBase).toBe(950);
    expect(summary.irpfEstimate).toBe(190);
    expect(summary.profitAfterIrpfReserve).toBe(760);
    expect(summary.lineVatExpenseCount).toBe(0);
    expect(summary.headerVatExpenseCount).toBe(1);
    expect(summary.unsupportedMixedVatExpenses).toBe(0);
  });

  it("lleva IVA y recargo no recuperables al coste y al gasto de IRPF", () => {
    const surchargeExpense: Expense = {
      ...expense,
      id: "expense-re",
      amount: 100,
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
    };

    const summary = calculateTaxSummary(
      [issuedInvoice("pagado", 1000)],
      [surchargeExpense],
      { irpfPercent: 20 },
    );

    expect(summary).toMatchObject({
      expenseBase: 126.2,
      expenseIva: 0,
      operatingExpenseCost: 126.2,
      netIva: 210,
      grossProfit: 873.8,
      estimatedIrpfBase: 873.8,
      irpfEstimate: 174.76,
      profitAfterIrpfReserve: 699.04,
    });
    expect(expenseIvaAmount(surchargeExpense)).toBe(0);
  });

  it("usa el desglose mixto conciliado en IVA, IRPF y coste económico", () => {
    const summary = calculateTaxSummary(
      [issuedInvoice("pagado", 1000)],
      [mixedVatExpense()],
      { irpfPercent: 20 },
    );

    expect(summary.expenseBase).toBe(200);
    expect(summary.expenseIva).toBe(31);
    expect(summary.operatingExpenseCost).toBe(200);
    expect(summary.netIva).toBe(179);
    expect(summary.grossProfit).toBe(800);
    expect(summary.estimatedIrpfBase).toBe(800);
    expect(summary.irpfEstimate).toBe(160);
    expect(summary.profitAfterIrpfReserve).toBe(640);
    expect(summary.lineVatExpenseCount).toBe(1);
    expect(summary.headerVatExpenseCount).toBe(0);
    expect(summary.unsupportedMixedVatExpenses).toBe(0);
    expect(expenseIvaAmount(mixedVatExpense())).toBe(31);
  });

  it("compensa una compra y su abono de proveedor con el mismo tipo", () => {
    const summary = calculateTaxSummary(
      [],
      [expense, { ...expense, id: "expense-credit", amount: -50 }],
      { irpfPercent: 20 },
    );

    expect(summary).toMatchObject({
      expenseBase: 0,
      expenseIva: 0,
      operatingExpenseCost: 0,
      netIva: 0,
      grossProfit: 0,
      estimatedIrpfBase: 0,
      irpfEstimate: 0,
      profitAfterIrpfReserve: 0,
      headerVatExpenseCount: 2,
      unsupportedMixedVatExpenses: 0,
    });
  });

  it("aplica firmado un abono mixto a IVA, IRPF y coste económico", () => {
    const credit = mixedVatExpense({
      id: "mixed-credit",
      amount: -200,
      purchaseLines: [
        {
          id: "credit-21",
          description: "Material general devuelto",
          quantity: -1,
          unitPrice: 100,
          total: -100,
          ivaPercent: 21,
        },
        {
          id: "credit-10",
          description: "Material reducido devuelto",
          quantity: -1,
          unitPrice: 100,
          total: -100,
          ivaPercent: 10,
        },
      ],
    });
    const summary = calculateTaxSummary([], [credit], { irpfPercent: 20 });

    expect(summary).toMatchObject({
      expenseBase: -200,
      expenseIva: -31,
      operatingExpenseCost: -200,
      netIva: 31,
      ivaToPay: 31,
      grossProfit: 200,
      estimatedIrpfBase: 200,
      irpfEstimate: 40,
      profitAfterIrpfReserve: 160,
      lineVatExpenseCount: 1,
      unsupportedMixedVatExpenses: 0,
    });
    expect(expenseIvaAmount(credit)).toBe(-31);
  });

  it("bloquea fiscalmente un IVA mixto explícito sin conciliar", () => {
    const blockedExpense = mixedVatExpense({
      amount: 300,
      purchaseLines: [
        ...(mixedVatExpense().purchaseLines ?? []),
        {
          id: "mixed-missing",
          description: "Línea sin tipo",
          quantity: 1,
          unitPrice: 100,
        },
      ],
    });
    const summary = calculateTaxSummary([], [blockedExpense]);

    expect(summary.expenseBase).toBe(300);
    expect(summary.expenseIva).toBe(0);
    expect(summary.operatingExpenseCost).toBe(363);
    expect(summary.lineVatExpenseCount).toBe(0);
    expect(summary.headerVatExpenseCount).toBe(0);
    expect(summary.unsupportedMixedVatExpenses).toBe(1);
    expect(expenseIvaAmount(blockedExpense)).toBe(0);

    let error: TaxExportBlockedError | null = null;
    try {
      assertTaxSummaryExportable(summary);
    } catch (caught) {
      error = caught as TaxExportBlockedError;
    }
    expect(error).toBeInstanceOf(TaxExportBlockedError);
    expect(error).toMatchObject({
      integrityBlockedDocuments: 0,
      unsupportedRectificationDocuments: 0,
      unsupportedMixedVatExpenses: 1,
    });
  });

  it("conserva el coste de cabecera pero no el IVA fiscal de un mixto bloqueado no deducible", () => {
    const blockedExpense = mixedVatExpense({
      amount: 300,
      deductibility: "non_deductible",
      purchaseLines: [
        ...(mixedVatExpense().purchaseLines ?? []),
        {
          id: "mixed-missing-nondeductible",
          description: "Línea sin tipo",
          quantity: 1,
          unitPrice: 100,
        },
      ],
    });
    const summary = calculateTaxSummary([], [blockedExpense]);

    expect(summary.expenseBase).toBe(0);
    expect(summary.expenseIva).toBe(0);
    expect(summary.operatingExpenseCost).toBe(363);
    expect(summary.nonDeductibleExpenseTotal).toBe(363);
    expect(summary.unsupportedMixedVatExpenses).toBe(1);
  });

  it("respeta el importe íntegro de un fijo no deducible y mantiene line-aware el deducible", () => {
    const fixedLines = [
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
    ];
    const fixedNonDeductible = mixedVatExpense({
      id: "fixed-non-deductible",
      amount: 100,
      businessKind: "fixed",
      deductibility: "non_deductible",
      purchaseLines: fixedLines,
    });
    const nonDeductibleSummary = calculateTaxSummary(
      [],
      [fixedNonDeductible],
    );

    expect(nonDeductibleSummary).toMatchObject({
      expenseBase: 0,
      expenseIva: 0,
      operatingExpenseCost: 100,
      nonDeductibleExpenseTotal: 100,
      lineVatExpenseCount: 0,
      headerVatExpenseCount: 1,
      unsupportedMixedVatExpenses: 0,
    });
    expect(expenseIvaAmount(fixedNonDeductible)).toBe(0);

    const deductibleSummary = calculateTaxSummary(
      [],
      [
        {
          ...fixedNonDeductible,
          id: "fixed-deductible",
          deductibility: "deductible",
        },
      ],
    );
    expect(deductibleSummary).toMatchObject({
      expenseBase: 100,
      expenseIva: 16.6,
      operatingExpenseCost: 100,
      lineVatExpenseCount: 1,
      headerVatExpenseCount: 0,
      unsupportedMixedVatExpenses: 0,
    });
  });

  it("excluye gastos no deducibles de base, IVA e IRPF fiscales", () => {
    const nonDeductibleExpense: Expense = {
      ...expense,
      id: "non-deductible",
      amount: 120,
      ivaPercent: 21,
      deductibility: "non_deductible",
    };

    const summary = calculateTaxSummary(
      [issuedInvoice("pagado", 1000)],
      [expense, nonDeductibleExpense],
      { irpfPercent: 20 },
    );

    expect(summary.expenseBase).toBe(50);
    expect(summary.expenseIva).toBe(10.5);
    expect(summary.nonDeductibleExpenseCount).toBe(1);
    expect(summary.nonDeductibleExpenseTotal).toBe(145.2);
    expect(summary.operatingExpenseCost).toBeCloseTo(195.2, 1);
    expect(summary.grossProfit).toBeCloseTo(804.8, 1);
    expect(summary.estimatedIrpfBase).toBe(950);
    expect(summary.irpfEstimate).toBe(190);
    expect(summary.profitAfterIrpfReserve).toBeCloseTo(614.8, 1);
  });

  it("trata valores desconocidos de deducibilidad como no fiscales", () => {
    const summary = calculateTaxSummary(
      [],
      [{ ...expense, deductibility: "unknown" as never }],
    );

    expect(summary.expenseBase).toBe(0);
    expect(summary.expenseIva).toBe(0);
    expect(summary.nonDeductibleExpenseCount).toBe(1);
    expect(summary.nonDeductibleExpenseTotal).toBe(60.5);
    expect(summary.operatingExpenseCost).toBe(60.5);
    expect(summary.estimatedIrpfBase).toBe(0);
    expect(summary.irpfEstimate).toBe(0);
    expect(summary.profitAfterIrpfReserve).toBe(-60.5);
  });

  it("reserva IRPF sobre la base fiscal aunque el coste real deje pérdidas", () => {
    const summary = calculateTaxSummary(
      [issuedInvoice("pagado", 100)],
      [
        {
          ...expense,
          amount: 100,
          deductibility: "non_deductible",
        },
      ],
      { irpfPercent: 20 },
    );

    expect(summary.operatingExpenseCost).toBe(121);
    expect(summary.grossProfit).toBe(-21);
    expect(summary.estimatedIrpfBase).toBe(100);
    expect(summary.irpfEstimate).toBe(20);
    expect(summary.profitAfterIrpfReserve).toBe(-41);
  });

  it("no cambia el resultado tras reservar IRPF al variar la posición de IVA", () => {
    const standardVat = calculateTaxSummary(
      [issuedInvoice("pagado", 1000)],
      [expense],
      { irpfPercent: 20 },
    );
    const reducedVat = calculateTaxSummary(
      [
        issuedInvoice("pagado", 1000, {
          items: [
            {
              id: "l1",
              description: "Servicio",
              quantity: 1,
              unitPrice: 1000,
              ivaPercent: 10,
            },
          ],
        }),
      ],
      [expense],
      { irpfPercent: 20 },
    );

    expect(standardVat.ivaToPay).toBeCloseTo(199.5, 1);
    expect(reducedVat.ivaToPay).toBeCloseTo(89.5, 1);
    expect(standardVat.profitAfterIrpfReserve).toBe(760);
    expect(reducedVat.profitAfterIrpfReserve).toBe(760);
  });

  it("mantiene separado un crédito de IVA cuando el beneficio es positivo", () => {
    const lowVatSale = issuedInvoice("pagado", 1000, {
      items: [
        {
          id: "l1",
          description: "Servicio",
          quantity: 1,
          unitPrice: 1000,
          ivaPercent: 10,
        },
      ],
    });
    const highBaseExpense: Expense = { ...expense, amount: 900 };

    const summary = calculateTaxSummary(
      [lowVatSale],
      [highBaseExpense],
      { irpfPercent: 20 },
    );

    expect(summary.grossProfit).toBe(100);
    expect(summary.irpfEstimate).toBe(20);
    expect(summary.ivaToPay).toBe(0);
    expect(summary.ivaCredit).toBe(89);
    expect(summary.profitAfterIrpfReserve).toBe(80);
  });

  it("no calcula IVA si el perfil está exento", () => {
    const exemptProfile: BusinessProfile = {
      ...TEST_PROFILE,
      vatExempt: true,
    };
    const summary = calculateTaxSummary(
      [issuedInvoice("pagado", 1000, {}, exemptProfile)],
      [
        expense,
        {
          ...expense,
          id: "non-deductible-exempt",
          amount: 120,
          deductibility: "non_deductible",
        },
      ],
      {
        vatExempt: true,
        profile: exemptProfile,
      },
    );
    expect(summary.vatExempt).toBe(true);
    expect(summary.salesIva).toBe(0);
    expect(summary.expenseIva).toBe(0);
    expect(summary.expenseBase).toBe(50);
    expect(summary.nonDeductibleExpenseCount).toBe(1);
    expect(summary.nonDeductibleExpenseTotal).toBe(120);
    expect(summary.operatingExpenseCost).toBe(170);
    expect(summary.grossProfit).toBe(830);
    expect(summary.estimatedIrpfBase).toBe(950);
    expect(summary.irpfEstimate).toBe(190);
    expect(summary.profitAfterIrpfReserve).toBe(640);
  });

  it("perfil exento con solo no deducibles conserva la pérdida económica", () => {
    const exemptProfile: BusinessProfile = {
      ...TEST_PROFILE,
      vatExempt: true,
    };
    const summary = calculateTaxSummary(
      [],
      [
        {
          ...expense,
          amount: 100,
          ivaPercent: 21,
          deductibility: "non_deductible",
        },
      ],
      {
        vatExempt: true,
        profile: exemptProfile,
        irpfPercent: 20,
      },
    );

    expect(summary.expenseBase).toBe(0);
    expect(summary.expenseIva).toBe(0);
    expect(summary.nonDeductibleExpenseTotal).toBe(100);
    expect(summary.operatingExpenseCost).toBe(100);
    expect(summary.grossProfit).toBe(-100);
    expect(summary.estimatedIrpfBase).toBe(0);
    expect(summary.irpfEstimate).toBe(0);
    expect(summary.profitAfterIrpfReserve).toBe(-100);
  });

  it("marca crédito de IVA cuando los gastos superan ventas", () => {
    const bigExpense: Expense = { ...expense, amount: 500 };
    const summary = calculateTaxSummary(
      [issuedInvoice("enviado", 100)],
      [bigExpense],
      { irpfPercent: 20 },
    );
    expect(summary.ivaCredit).toBeGreaterThan(0);
    expect(summary.ivaToPay).toBe(0);
    expect(summary.irpfEstimate).toBe(0);
    expect(summary.profitAfterIrpfReserve).toBe(summary.grossProfit);
  });

  it("usa la rectificativa vigente y deja fuera la factura original rectificada", () => {
    const { original, rectification } = issuedRectificationPair({
      type: "correccion",
      originalDate: "2026-06-09",
      rectificationDate: "2026-06-10",
      originalSubtotal: 1000,
      rectificationSubtotal: 700,
    });

    const summary = calculateTaxSummary([original, rectification], [], {
      irpfPercent: 20,
      profile: TEST_PROFILE,
    });

    expect(summary.salesBase).toBe(700);
    expect(summary.salesIva).toBe(147);
    expect(summary.grossProfit).toBe(700);
    expect(summary.integrityBlockedDocuments).toBe(0);
    expect(summary.unsupportedRectificationDocuments).toBe(0);
  });

  it("compensa una anulación cuando original y abono caen en el mismo periodo", () => {
    const { original, rectification } = issuedRectificationPair({
      type: "anulacion",
      originalDate: "2026-05-10",
      rectificationDate: "2026-05-11",
    });

    const summary = calculateTaxSummary([original, rectification], [], {
      profile: TEST_PROFILE,
      isDocumentDateInPeriod: (date) => isDateInQuarter(date, 2026, 2),
    });

    expect(summary).toMatchObject({
      salesBase: 0,
      salesIva: 0,
      integrityBlockedDocuments: 0,
      unsupportedRectificationDocuments: 0,
    });
  });

  it("conserva el original en Q1 e imputa el abono en Q2", () => {
    const { original, rectification } = issuedRectificationPair({
      type: "anulacion",
      originalDate: "2026-03-31",
      rectificationDate: "2026-04-01",
    });
    const documents = [original, rectification];

    const q1 = calculateTaxSummary(documents, [], {
      profile: TEST_PROFILE,
      isDocumentDateInPeriod: (date) => isDateInQuarter(date, 2026, 1),
    });
    const q2 = calculateTaxSummary(documents, [], {
      profile: TEST_PROFILE,
      isDocumentDateInPeriod: (date) => isDateInQuarter(date, 2026, 2),
    });

    expect(q1).toMatchObject({
      salesBase: 100,
      salesIva: 21,
      integrityBlockedDocuments: 0,
      unsupportedRectificationDocuments: 0,
    });
    expect(q2).toMatchObject({
      salesBase: -100,
      salesIva: -21,
      integrityBlockedDocuments: 0,
      unsupportedRectificationDocuments: 0,
    });
  });

  it("retiene el original en Q1 y bloquea una corrección sustitutiva en Q2", () => {
    const { original, rectification } = issuedRectificationPair({
      type: "correccion",
      originalDate: "2026-03-31",
      rectificationDate: "2026-04-01",
      rectificationSubtotal: 70,
    });
    const documents = [original, rectification];

    const q1 = calculateTaxSummary(documents, [], {
      profile: TEST_PROFILE,
      isDocumentDateInPeriod: (date) => isDateInQuarter(date, 2026, 1),
    });
    const q2 = calculateTaxSummary(documents, [], {
      profile: TEST_PROFILE,
      isDocumentDateInPeriod: (date) => isDateInQuarter(date, 2026, 2),
    });

    expect(q1).toMatchObject({
      salesBase: 100,
      salesIva: 21,
      integrityBlockedDocuments: 0,
      unsupportedRectificationDocuments: 0,
    });
    expect(q2).toMatchObject({
      salesBase: 0,
      salesIva: 0,
      integrityBlockedDocuments: 0,
      unsupportedRectificationDocuments: 1,
    });
    expect(() => assertTaxSummaryExportable(q2)).toThrow(
      TaxExportBlockedError,
    );
  });

  it("mantiene el régimen y los importes congelados frente al perfil vivo", () => {
    const issued = issuedInvoice("enviado", 100);
    const drifted: Document = {
      ...issued,
      items: [{ ...issued.items[0], unitPrice: 999, ivaPercent: 0 }],
    };
    const liveExemptProfile: BusinessProfile = {
      ...TEST_PROFILE,
      vatExempt: true,
    };

    const summary = calculateTaxSummary([drifted], [], {
      vatExempt: true,
      profile: liveExemptProfile,
    });

    expect(summary.salesBase).toBe(100);
    expect(summary.salesIva).toBe(21);
    expect(summary.vatExempt).toBe(false);
  });

  it("usa importes congelados y excluye evidencia bloqueada", () => {
    const issued = issueDocument(
      invoice("borrador", 100),
      TEST_PROFILE,
      "2026-06-09T10:00:00.000Z",
    );
    const drifted: Document = {
      ...issued,
      items: [{ ...issued.items[0], unitPrice: 999 }],
    };

    expect(calculateTaxSummary([drifted], [])).toMatchObject({
      salesBase: 100,
      integrityBlockedDocuments: 0,
    });

    const blocked = calculateTaxSummary(
      [
        {
          ...drifted,
          snapshotIntegrity: {
            status: "blocked",
            issues: ["document_hash_mismatch"],
          },
        },
      ],
      [],
    );

    expect(blocked.salesBase).toBe(0);
    expect(blocked.salesIva).toBe(0);
    expect(blocked.integrityBlockedDocuments).toBe(1);
  });

  it("bloquea en tiempo real una factura sellada disfrazada de presupuesto borrador", () => {
    const issued = issueDocument(
      invoice("borrador", 100),
      DEFAULT_PROFILE,
      "2026-06-09T10:00:00.000Z",
    );
    const disguised: Document = {
      ...issued,
      type: "presupuesto",
      status: "borrador",
      items: [{ ...issued.items[0], unitPrice: 999 }],
    };

    expect(calculateTaxSummary([disguised], [])).toMatchObject({
      salesBase: 0,
      salesIva: 0,
      integrityBlockedDocuments: 1,
    });
  });

  it("no pierde el bloqueo si también manipulan el tipo canónico o eliminan la evidencia", () => {
    const issued = issuedInvoice("enviado", 100);
    const bothTypesDisguised: Document = {
      ...issued,
      type: "presupuesto",
      status: "borrador",
      documentSnapshot: {
        ...issued.documentSnapshot!,
        documentType: "presupuesto",
        documentKind: "presupuesto",
      },
    };
    const stripped: Document = {
      ...issued,
      type: "presupuesto",
      status: "borrador",
      documentSnapshot: undefined,
      pdfSnapshot: undefined,
      snapshotSeal: undefined,
      snapshotIntegrityRequired: undefined,
      snapshotIntegrity: undefined,
    };

    for (const disguised of [bothTypesDisguised, stripped]) {
      expect(calculateTaxSummary([disguised], [])).toMatchObject({
        salesBase: 0,
        salesIva: 0,
        integrityBlockedDocuments: 1,
      });
    }
  });

  it("bloquea una factura anulada sin relación rectificativa verificable", () => {
    const orphanCanceled = issuedInvoice("anulada", 100);

    expect(calculateTaxSummary([orphanCanceled], [])).toMatchObject({
      salesBase: 0,
      salesIva: 0,
      integrityBlockedDocuments: 1,
    });
  });

  it("bloquea un recibo sellado disfrazado de automático sin vínculo recíproco", () => {
    const receipt = issueDocument(
      invoice("borrador", 100, {
        id: "receipt-standalone",
        type: "recibo",
        number: "R-2026-0001",
      }),
      DEFAULT_PROFILE,
      "2026-06-09T10:00:00.000Z",
    );
    const disguised: Document = {
      ...receipt,
      status: "pagado",
      sourceDocumentId: "invoice-without-reciprocal-link",
    };

    expect(calculateTaxSummary([disguised], [])).toMatchObject({
      salesBase: 0,
      salesIva: 0,
      integrityBlockedDocuments: 1,
    });
  });

  it("detecta una mutación de taxSummary aunque no exista señal persistida", () => {
    const issued = issuedInvoice("pagado", 100);
    const tampered: Document = {
      ...issued,
      snapshotIntegrity: undefined,
      documentSnapshot: {
        ...issued.documentSnapshot!,
        taxSummary: {
          ...issued.documentSnapshot!.taxSummary,
          subtotal: 999999,
        },
      },
    };

    expect(calculateTaxSummary([tampered], [])).toMatchObject({
      salesBase: 0,
      salesIva: 0,
      integrityBlockedDocuments: 1,
    });
    const selection = selectTaxableFiscalDocumentsForPeriod([tampered], {
      profile: TEST_PROFILE,
    });
    expect(selection.documents).toEqual([]);
    expect(
      collectedSalesTotal(
        selection.documents,
        false,
        isCollectedDocument,
      ),
    ).toBe(0);
  });
});
