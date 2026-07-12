import { describe, expect, it } from "vitest";
import { issueDocument } from "@/lib/document-integrity";
import { DEFAULT_PROFILE, type Document, type Expense } from "@/lib/types";
import {
  buildRentabilidadRealFixedCostDisplay,
  buildRentabilidadRealWorkDocumentOptions,
  filterRentabilidadRealWorkDocumentOptions,
} from "./work-calculator-view-model";

function documentFixture(overrides: Partial<Document>): Document {
  const requestedStatus = overrides.status ?? "borrador";
  const draft: Document = {
    id: "doc",
    type: "factura",
    number: "F-2026-0001",
    date: "2026-07-01",
    client: { name: "Cliente" },
    items: [
      {
        id: "line-1",
        description: "Trabajo",
        quantity: 1,
        unitPrice: 100,
        ivaPercent: 21,
      },
    ],
    createdAt: "2026-07-01T10:00:00.000Z",
    updatedAt: "2026-07-01T10:00:00.000Z",
    ...overrides,
    status: "borrador",
  };
  if (requestedStatus === "borrador") return draft;
  const draftForIssue: Document = {
    ...draft,
    documentLifecycle: "draft",
    integrityLock: "unlocked",
  };
  delete draftForIssue.rectifiedById;
  return {
    ...issueDocument(
      draftForIssue,
      { ...DEFAULT_PROFILE, name: "Negocio Demo", nif: "12345678Z" },
      draft.createdAt,
    ),
    status: requestedStatus,
    rectifiedById: overrides.rectifiedById,
  };
}

function expenseFixture(overrides: Partial<Expense>): Expense {
  return {
    id: "expense-1",
    date: "2026-07-01",
    supplierName: "Proveedor",
    description: "Material",
    amount: 50,
    ivaPercent: 21,
    category: "Material",
    paymentMethod: "Tarjeta",
    createdAt: "2026-07-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("work calculator view model", () => {
  it("muestra gastos fijos detectados pero aplicados a cero con metodo none", () => {
    const display = buildRentabilidadRealFixedCostDisplay({
      method: "none",
      selectedTotal: 770.25,
      allocatedFixedCosts: 320,
    });

    expect(display.totalLabel).toBe("Gastos fijos detectados");
    expect(display.totalAmount).toBe(770.25);
    expect(display.appliedAmount).toBe(0);
    expect(display.showSelectionControls).toBe(false);
    expect(display.helperText).toContain("no se aplicarán");
  });

  it("muestra gastos fijos seleccionados y aplicados cuando hay regla", () => {
    const display = buildRentabilidadRealFixedCostDisplay({
      method: "revenue_share",
      selectedTotal: 770.25,
      allocatedFixedCosts: 154.05,
    });

    expect(display.totalLabel).toBe("Gastos fijos seleccionados");
    expect(display.totalAmount).toBe(770.25);
    expect(display.appliedAmount).toBe(154.05);
    expect(display.showSelectionControls).toBe(true);
    expect(display.helperText).toBeUndefined();
  });

  it("ordena documentos por fecha descendente y añade contexto de vinculos", () => {
    const quote = documentFixture({
      id: "quote-1",
      type: "presupuesto",
      number: "P-2026-0001",
      date: "2026-06-01",
      client: { name: "Cliente antiguo" },
      status: "enviado",
    });
    const oldInvoice = documentFixture({
      id: "invoice-old",
      number: "F-2026-0001",
      date: "2026-06-10",
      client: { name: "Cliente antiguo" },
      sourceQuoteDocumentId: "quote-1",
    });
    const recentInvoice = documentFixture({
      id: "invoice-recent",
      number: "F-2026-0002",
      date: "2026-07-05",
      client: { name: "Cliente reciente" },
      items: [
        {
          id: "line-2",
          description: "Trabajo reciente",
          quantity: 1,
          unitPrice: 500,
          ivaPercent: 21,
        },
      ],
    });

    const options = buildRentabilidadRealWorkDocumentOptions({
      documents: [oldInvoice, recentInvoice],
      allDocuments: [quote, oldInvoice, recentInvoice],
      expenses: [
        expenseFixture({ id: "linked", workDocumentId: "invoice-recent" }),
        expenseFixture({
          id: "fixed",
          workDocumentId: "invoice-recent",
          businessKind: "fixed",
        }),
      ],
    });

    expect(options.map((option) => option.id)).toEqual([
      "invoice-recent",
      "invoice-old",
    ]);
    expect(options[0].subtotal).toBe(500);
    expect(options[0].linkedExpensesCount).toBe(1);
    expect(options[1].linkedDocumentLabel).toBe(
      "Presupuesto origen P-2026-0001",
    );
    expect(
      filterRentabilidadRealWorkDocumentOptions(options, "reciente"),
    ).toHaveLength(1);
  });

  it("documento sin client usa fallback", () => {
    const withClient = documentFixture({
      id: "invoice-no-client",
      number: "F-2026-0003",
    });
    const invoice: Partial<Document> = { ...withClient };
    delete invoice.client;

    const options = buildRentabilidadRealWorkDocumentOptions({
      documents: [invoice as Document],
      allDocuments: [invoice as Document],
      expenses: [],
    });

    expect(options[0].customerName).toBe("Cliente sin asignar");
  });

  it("oculta facturas sustituidas por rectificativa y conserva la vigente", () => {
    const original = documentFixture({
      id: "invoice-original",
      number: "F-2026-0001",
      date: "2026-07-01",
      status: "rectificada",
      rectifiedById: "invoice-rect",
    });
    const rectificativa = documentFixture({
      id: "invoice-rect",
      number: "FR-2026-0001",
      date: "2026-07-02",
      status: "enviado",
      rectification: {
        originalDocumentId: "invoice-original",
        originalNumber: "F-2026-0001",
        originalDate: "2026-07-01",
        reason: "Error en datos",
        type: "correccion",
      },
    });

    const options = buildRentabilidadRealWorkDocumentOptions({
      documents: [original, rectificativa],
      allDocuments: [original, rectificativa],
      expenses: [],
    });

    expect(options.map((option) => option.id)).toEqual(["invoice-rect"]);
  });
});
