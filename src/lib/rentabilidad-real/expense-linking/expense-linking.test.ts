import { describe, expect, it } from "vitest";
import { EMPTY_DATA, type AppData, type Document, type Expense } from "@/lib/types";
import {
  buildExpenseLinkImpact,
  canLinkExpenseToWork,
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
    expect(payload).toEqual({ ...expense, workDocumentId: "doc_1" });
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
});
