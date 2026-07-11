import { describe, expect, it } from "vitest";
import { EMPTY_DATA, type AppData, type Document, type Expense } from "@/lib/types";
import { summarizeWorkDocumentExpenses } from "@/lib/expenses";
import {
  buildExpenseLinkImpact,
  canLinkExpenseToWork,
  closeExpenseForFutureWork,
  createExpenseWorkDocumentUnlinkPayload,
  createExpenseWorkDocumentUpdatePayload,
  getAlreadyLinkedExpensesForWork,
  getExpenseLinkCandidatesForWork,
} from "./expense-linking";

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function appData(overrides: Partial<AppData> = {}): AppData {
  return {
    ...deepClone(EMPTY_DATA),
    ...overrides,
    profile: {
      ...deepClone(EMPTY_DATA.profile),
      ...overrides.profile,
    },
    documents: overrides.documents ?? [],
    expenses: overrides.expenses ?? [],
    recurringExpenses: overrides.recurringExpenses ?? [],
    userReminders: overrides.userReminders ?? [],
    suppliers: overrides.suppliers ?? [],
    products: overrides.products ?? [],
    customers: overrides.customers ?? [],
    counters: {
      ...EMPTY_DATA.counters,
      ...overrides.counters,
    },
  };
}

function documentFixture(overrides: Partial<Document> = {}): Document {
  return {
    id: "doc_1",
    type: "factura",
    number: "F-1",
    date: "2026-07-01",
    client: { name: "Cliente" },
    items: [],
    status: "enviado",
    createdAt: "2026-07-01T10:00:00.000Z",
    updatedAt: "2026-07-01T10:00:00.000Z",
    ...overrides,
  };
}

function expenseFixture(overrides: Partial<Expense> = {}): Expense {
  return {
    id: "expense_1",
    date: "2026-07-02",
    supplierName: "Proveedor",
    description: "Material",
    amount: 100,
    ivaPercent: 21,
    category: "Material",
    paymentMethod: "Tarjeta",
    createdAt: "2026-07-02T10:00:00.000Z",
    ...overrides,
  };
}

describe("rentabilidad real expense linking", () => {
  it("detecta gastos enlazados por workDocumentId", () => {
    const linked = expenseFixture({ id: "linked", workDocumentId: "doc_1" });
    const unrelated = expenseFixture({ id: "other", workDocumentId: "doc_2" });

    const result = getAlreadyLinkedExpensesForWork(
      appData({ expenses: [linked, unrelated] }),
      ["doc_1"],
    );

    expect(result.map((item) => item.expense.id)).toEqual(["linked"]);
  });

  it("permite varios gastos enlazados a la misma factura", () => {
    const first = expenseFixture({ id: "linked_1", workDocumentId: "doc_1" });
    const second = expenseFixture({ id: "linked_2", workDocumentId: "doc_1" });

    const result = getAlreadyLinkedExpensesForWork(
      appData({ expenses: [first, second] }),
      ["doc_1"],
    );

    expect(result.map((item) => item.expense.id)).toEqual([
      "linked_1",
      "linked_2",
    ]);
  });

  it("detecta candidatos sin enlazar", () => {
    const unlinked = expenseFixture({ id: "candidate" });
    const linked = expenseFixture({ id: "linked", workDocumentId: "doc_1" });

    const result = getExpenseLinkCandidatesForWork(
      appData({
        documents: [documentFixture()],
        expenses: [unlinked, linked],
      }),
      ["doc_1"],
    );

    expect(result.map((item) => item.expense.id)).toEqual(["candidate"]);
    expect(result[0].warnings.map((warning) => warning.code)).toContain(
      "expense_unlinked",
    );
  });

  it("no incluye gastos fijos como directos por defecto", () => {
    const fixed = expenseFixture({ id: "fixed", businessKind: "fixed" });

    expect(
      getExpenseLinkCandidatesForWork(appData({ expenses: [fixed] }), [
        "doc_1",
      ]),
    ).toHaveLength(0);
    expect(canLinkExpenseToWork(fixed, "doc_1")).toBe(false);
  });

  it("genera payload de enlace sin mutar input", () => {
    const expense = expenseFixture();
    const before = deepClone(expense);

    const payload = createExpenseWorkDocumentUpdatePayload(expense, "doc_1");

    expect(expense).toEqual(before);
    expect(payload.workDocumentId).toBe("doc_1");
    expect(payload.workAllocations).toEqual([
      expect.objectContaining({
        workDocumentId: "doc_1",
        amount: 100,
      }),
    ]);
  });

  it("genera payload de desvinculación sin mutar input", () => {
    const expense = expenseFixture({ workDocumentId: "doc_1" });
    const before = deepClone(expense);

    const payload = createExpenseWorkDocumentUnlinkPayload(expense);

    expect(expense).toEqual(before);
    expect(payload.workDocumentId).toBeUndefined();
  });

  it("gasto ya enlazado a otro documento requiere confirmación", () => {
    const expense = expenseFixture({ workDocumentId: "doc_2" });

    const impact = buildExpenseLinkImpact(expense, "doc_1");

    expect(impact.action).toBe("reassign");
    expect(impact.requiresConfirmation).toBe(true);
  });

  it("gasto de escaneo IA genera warning de revisión", () => {
    const expense = expenseFixture({ origin: "scan" });

    const result = getExpenseLinkCandidatesForWork(
      appData({ expenses: [expense] }),
      ["doc_1"],
    );

    expect(result[0].warnings.map((warning) => warning.code)).toContain(
      "scanned_expense_review",
    );
  });

  it("incluye gastos de resumen de proveedor como candidatos con aviso de original pendiente", () => {
    const expense = expenseFixture({
      origin: "import",
      purchaseDocument: { invoiceNumber: "FD/222386" },
      providerSummary: {
        status: "pending_original",
        summaryId: "summary_1",
        importedAt: "2026-07-07T10:00:00.000Z",
        providerName: "Metalúrgica Arandes SL",
      },
    });

    const result = getExpenseLinkCandidatesForWork(
      appData({ documents: [documentFixture()], expenses: [expense] }),
      ["doc_1"],
    );

    expect(result[0].suggestedReason).toBe(
      "Registrado desde resumen de proveedor; falta la factura original.",
    );
    expect(result[0].warnings.map((warning) => warning.code)).toContain(
      "provider_summary_missing_original",
    );
  });

  it("mantiene como candidato un gasto con líneas todavía libres", () => {
    const expense = expenseFixture({
      purchaseLines: [
        {
          id: "line_1",
          description: "Material trabajo uno",
          quantity: 1,
          unitPrice: 60,
        },
        {
          id: "line_2",
          description: "Material trabajo dos",
          quantity: 1,
          unitPrice: 40,
        },
      ],
    });
    const firstLink = createExpenseWorkDocumentUpdatePayload(
      expense,
      "doc_1",
      ["line_1"],
    );

    const candidates = getExpenseLinkCandidatesForWork(
      appData({ expenses: [firstLink] }),
      ["doc_2"],
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      status: "partially_linked_elsewhere",
      availableLineIds: ["line_2"],
      allocatedElsewhereAmount: 60,
      remainingAmount: 40,
    });

    const secondLink = createExpenseWorkDocumentUpdatePayload(
      firstLink,
      "doc_2",
      candidates[0].availableLineIds,
    );
    expect(
      getExpenseLinkCandidatesForWork(appData({ expenses: [secondLink] }), [
        "doc_3",
      ]),
    ).toHaveLength(0);
    expect(
      getAlreadyLinkedExpensesForWork(appData({ expenses: [secondLink] }), [
        "doc_1",
      ]),
    ).toHaveLength(1);
    expect(
      getAlreadyLinkedExpensesForWork(appData({ expenses: [secondLink] }), [
        "doc_2",
      ]),
    ).toHaveLength(1);
  });

  it("reparte una asignación nueva con recargo una sola vez entre líneas", () => {
    const expense = expenseFixture({
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
      purchaseLines: [
        {
          id: "line_60",
          description: "Material 60%",
          quantity: 1,
          unitPrice: 60,
          ivaPercent: 21,
        },
        {
          id: "line_40",
          description: "Material 40%",
          quantity: 1,
          unitPrice: 40,
          ivaPercent: 21,
        },
      ],
    });

    const first = createExpenseWorkDocumentUpdatePayload(
      expense,
      "doc_1",
      ["line_60"],
    );
    const second = createExpenseWorkDocumentUpdatePayload(
      first,
      "doc_2",
      ["line_40"],
    );

    expect(first.workAllocations?.[0].amount).toBe(75.72);
    expect(second.workAllocations?.map((allocation) => allocation.amount)).toEqual([
      75.72,
      50.48,
    ]);
    expect(
      second.workAllocations?.reduce(
        (total, allocation) => total + allocation.amount,
        0,
      ),
    ).toBeCloseTo(126.2, 2);
  });

  it("actualiza a 126,20 un vínculo legacy completo sin reparto explícito", () => {
    const expense = expenseFixture({
      workDocumentId: "doc_1",
      providerSummary: {
        status: "pending_original",
        summaryId: "legacy-summary-re",
        importedAt: "2026-07-10T10:00:00.000Z",
        summaryInvoiceTotal: 126.2,
        summaryIvaAmount: 21,
      },
    });

    expect(summarizeWorkDocumentExpenses([expense], "doc_1")).toMatchObject({
      count: 1,
      cost: 126.2,
      deductibleBase: 126.2,
      deductibleIva: 0,
    });
  });

  it("no ofrece un resto falso si una asignación antigua ya cubre todas las líneas", () => {
    const expense = expenseFixture({
      providerSummary: {
        status: "pending_original",
        summaryId: "legacy-summary-re",
        importedAt: "2026-07-10T10:00:00.000Z",
        summaryInvoiceTotal: 126.2,
        summaryIvaAmount: 21,
      },
      workDocumentId: "doc_1",
      workAllocations: [
        {
          workDocumentId: "doc_1",
          amount: 100,
          includedLineIds: ["line_60", "line_40"],
          allocatedAt: "2026-07-10T10:00:00.000Z",
        },
      ],
      purchaseLines: [
        {
          id: "line_60",
          description: "Material 60%",
          quantity: 1,
          unitPrice: 60,
          ivaPercent: 21,
        },
        {
          id: "line_40",
          description: "Material 40%",
          quantity: 1,
          unitPrice: 40,
          ivaPercent: 21,
        },
      ],
    });

    expect(
      getExpenseLinkCandidatesForWork(appData({ expenses: [expense] }), [
        "doc_2",
      ]),
    ).toHaveLength(0);
  });

  it("desvincula solo el trabajo elegido y conserva los demás repartos", () => {
    const expense = expenseFixture({
      workDocumentId: "doc_1",
      workAllocations: [
        {
          workDocumentId: "doc_1",
          amount: 60,
          allocatedAt: "2026-07-11T10:00:00.000Z",
        },
        {
          workDocumentId: "doc_2",
          amount: 40,
          allocatedAt: "2026-07-11T10:00:00.000Z",
        },
      ],
    });

    const payload = createExpenseWorkDocumentUnlinkPayload(expense, ["doc_1"]);

    expect(payload.workDocumentId).toBe("doc_2");
    expect(payload.workAllocations).toEqual([
      expect.objectContaining({ workDocumentId: "doc_2", amount: 40 }),
    ]);
  });

  it("permite cerrar el importe restante para retirarlo de candidatos", () => {
    const expense = closeExpenseForFutureWork(expenseFixture());

    expect(
      getExpenseLinkCandidatesForWork(appData({ expenses: [expense] }), [
        "doc_1",
      ]),
    ).toHaveLength(0);
  });
});
