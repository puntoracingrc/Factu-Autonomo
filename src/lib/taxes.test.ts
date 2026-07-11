import { describe, expect, it } from "vitest";
import { calculateTaxSummary, isTaxableSaleDocument } from "./taxes";
import { issueDocument } from "./document-integrity";
import type { BusinessProfile, Document, Expense } from "./types";
import { DEFAULT_PROFILE } from "./types";

const TEST_PROFILE: BusinessProfile = {
  ...DEFAULT_PROFILE,
  nif: "12345678Z",
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
    client: { name: "Ana", firstName: "Ana", lastName: "" },
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
  it("calcula IVA neto, IRPF y beneficio neto", () => {
    const summary = calculateTaxSummary([issuedInvoice("pagado", 1000)], [expense], {
      irpfPercent: 20,
    });
    expect(summary.salesBase).toBe(1000);
    expect(summary.salesIva).toBe(210);
    expect(summary.expenseBase).toBe(50);
    expect(summary.expenseIva).toBe(10.5);
    expect(summary.netIva).toBeCloseTo(199.5, 1);
    expect(summary.ivaToPay).toBeCloseTo(199.5, 1);
    expect(summary.grossProfit).toBe(950);
    expect(summary.irpfEstimate).toBe(190);
    expect(summary.estimatedNetProfit).toBeCloseTo(560.5, 1);
  });

  it("no calcula IVA si el perfil está exento", () => {
    const exemptProfile: BusinessProfile = {
      ...DEFAULT_PROFILE,
      nif: "12345678Z",
      vatExempt: true,
    };
    const summary = calculateTaxSummary(
      [issuedInvoice("pagado", 1000, {}, exemptProfile)],
      [expense],
      {
        vatExempt: true,
        profile: exemptProfile,
      },
    );
    expect(summary.vatExempt).toBe(true);
    expect(summary.salesIva).toBe(0);
    expect(summary.expenseIva).toBe(0);
    expect(summary.estimatedNetProfit).toBe(950 - 190);
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
  });

  it("usa la rectificativa vigente y deja fuera la factura original rectificada", () => {
    const original: Document = {
      ...issuedInvoice("enviado", 1000),
      status: "rectificada",
      rectifiedById: "rect-1",
    };
    const rectification = issuedInvoice("enviado", 700, {
      id: "rect-1",
      number: "FR-2026-0001",
      rectification: {
        originalDocumentId: original.id,
        originalNumber: original.number,
        originalDate: original.date,
        reason: "Corrección de datos",
        type: "correccion",
      },
      documentLifecycle: "draft",
      integrityLock: "unlocked",
    });

    const summary = calculateTaxSummary([original, rectification], [], {
      irpfPercent: 20,
    });

    expect(summary.salesBase).toBe(700);
    expect(summary.salesIva).toBe(147);
    expect(summary.grossProfit).toBe(700);
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
    const issued = issuedInvoice("enviado", 100);
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
  });
});
