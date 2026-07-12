import { describe, expect, it } from "vitest";
import {
  applyExpenseWorkAllocationCostRepair,
  buildExpenseWorkAllocationRepairPreview,
  buildExpenseWorkAllocationRollbackPreview,
  rollbackExpenseWorkAllocationCostRepair,
} from "./expense-work-allocation-cost-repair";
import {
  attachRegisteredVerifactuToSnapshots,
  issueDocument,
} from "./document-integrity";
import { summarizeWorkDocumentExpenses } from "./expenses";
import { summarizeAllocatedWorkExpenses } from "./document-list-profitability";
import { buildRentabilidadRealWorkProfitabilityInputFromExistingData } from "./rentabilidad-real/calculation/work-profitability-builder";
import { EMPTY_DATA } from "./types";
import type {
  AppData,
  Document,
  Expense,
  ExpensePurchaseLine,
  ExpenseWorkAllocation,
} from "./types";

const APPLIED_AT = "2026-07-12T02:00:00.000Z";
const ROLLED_BACK_AT = "2026-07-12T02:05:00.000Z";

function document(id: string): Document {
  return {
    id,
    type: "factura",
    number: `F-${id}`,
    date: "2026-07-10",
    client: { name: "Cliente" },
    items: [],
    status: "borrador",
    createdAt: "2026-07-10T10:00:00.000Z",
    updatedAt: "2026-07-10T10:00:00.000Z",
  };
}

function lines60_40(sign = 1): ExpensePurchaseLine[] {
  return [
    {
      id: "line_60",
      description: "Material 60 %",
      quantity: 1,
      unitPrice: sign * 60,
      ivaPercent: 21,
    },
    {
      id: "line_40",
      description: "Material 40 %",
      quantity: 1,
      unitPrice: sign * 40,
      ivaPercent: 21,
    },
  ];
}

function allocation(
  workDocumentId: string,
  amount: number,
  includedLineIds: string[],
): ExpenseWorkAllocation {
  return {
    workDocumentId,
    amount,
    includedLineIds,
    allocatedAt: "2026-07-11T10:00:00.000Z",
    updatedAt: "2026-07-11T10:05:00.000Z",
  };
}

function legacyExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: "expense_re_1",
    date: "2026-07-10",
    supplierName: "Proveedor RE",
    description: "Compra con recargo",
    amount: 100,
    ivaPercent: 21,
    category: "Material",
    paymentMethod: "Tarjeta",
    providerSummary: {
      status: "pending_original",
      summaryId: "summary_re_1",
      importedAt: "2026-07-10T09:00:00.000Z",
      summaryInvoiceTotal: 126.2,
      summaryIvaAmount: 21,
    },
    purchaseLines: lines60_40(),
    workDocumentId: "doc_1",
    workAllocations: [allocation("doc_1", 100, ["line_60", "line_40"])],
    workAllocationClosed: true,
    createdAt: "2026-07-10T09:00:00.000Z",
    ...overrides,
  };
}

function appData(expenses: Expense[]): AppData {
  return {
    ...EMPTY_DATA,
    documents: [document("doc_1"), document("doc_2"), document("doc_3")],
    expenses,
  };
}

function reasonFor(data: AppData, expenseId: string) {
  return buildExpenseWorkAllocationRepairPreview(data).manualReview.find(
    (item) => item.expenseId === expenseId,
  )?.reasons;
}

function reorderObjectKeys<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => reorderObjectKeys(entry)) as T;
  }
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .reverse()
      .map(([key, entry]) => [key, reorderObjectKeys(entry)]),
  ) as T;
}

describe("explicit legacy expense work allocation cost repair", () => {
  it("previsualiza y repara un reparto completo 100 -> 126,20 sin tocar el resto", () => {
    const expense = legacyExpense();
    const data = appData([expense]);
    const documentsBefore = structuredClone(data.documents);
    const linesBefore = structuredClone(expense.purchaseLines);
    const allocationsBefore = structuredClone(expense.workAllocations);
    const preview = buildExpenseWorkAllocationRepairPreview(data);

    expect(preview).toMatchObject({
      affectedCount: 1,
      affectedExpenseIds: ["expense_re_1"],
      manualReview: [],
    });
    expect(preview.candidates[0]).toMatchObject({
      legacyOperatingCost: 100,
      canonicalOperatingCost: 126.2,
      workDocumentIds: ["doc_1"],
    });
    expect(preview.candidates[0]?.beforeFingerprint).toMatch(
      /^sha256:[0-9a-f]{64}$/,
    );
    expect(preview.candidates[0]?.afterFingerprint).toMatch(
      /^sha256:[0-9a-f]{64}$/,
    );

    const applied = applyExpenseWorkAllocationCostRepair(
      data,
      preview,
      APPLIED_AT,
    );
    const repaired = applied.data.expenses[0]!;

    expect(applied.appliedExpenseIds).toEqual(["expense_re_1"]);
    expect(repaired.workAllocations).toEqual([
      {
        ...allocationsBefore?.[0],
        amount: 126.2,
        fullAmountAtAllocation: 126.2,
      },
    ]);
    expect(repaired.workDocumentId).toBe(expense.workDocumentId);
    expect(repaired.workAllocationClosed).toBe(true);
    expect(repaired.purchaseLines).toEqual(linesBefore);
    expect(applied.data.documents).toEqual(documentsBefore);
    expect(repaired.workAllocationCostRepair).toMatchObject({
      schemaVersion: 1,
      kind: "provider_summary_equivalence_surcharge_v1",
      status: "applied",
      beforeAllocations: allocationsBefore,
      events: [{ action: "applied", at: APPLIED_AT }],
    });
    expect(summarizeWorkDocumentExpenses(applied.data.expenses, "doc_1")).toEqual({
      count: 1,
      cost: 126.2,
      deductibleBase: 126.2,
      deductibleIva: 0,
    });
  });

  it("recalcula 60/40 por base de líneas y suma exactamente 126,20", () => {
    const expense = legacyExpense({
      workAllocations: [
        allocation("doc_1", 60, ["line_60"]),
        allocation("doc_2", 40, ["line_40"]),
      ],
    });
    const data = appData([expense]);
    const applied = applyExpenseWorkAllocationCostRepair(
      data,
      buildExpenseWorkAllocationRepairPreview(data),
      APPLIED_AT,
    );

    expect(applied.data.expenses[0]?.workAllocations).toEqual([
      {
        ...expense.workAllocations?.[0],
        amount: 75.72,
        fullAmountAtAllocation: 126.2,
      },
      {
        ...expense.workAllocations?.[1],
        amount: 50.48,
        fullAmountAtAllocation: 126.2,
      },
    ]);
    expect(summarizeWorkDocumentExpenses(applied.data.expenses, "doc_1").cost).toBe(
      75.72,
    );
    expect(summarizeWorkDocumentExpenses(applied.data.expenses, "doc_2").cost).toBe(
      50.48,
    );
    expect(
      summarizeAllocatedWorkExpenses({
        expenses: applied.data.expenses,
        workDocumentIds: ["doc_1"],
      }),
    ).toEqual({
      count: 1,
      cost: 75.72,
      deductibleBase: 75.72,
      deductibleIva: 0,
    });
    expect(
      buildRentabilidadRealWorkProfitabilityInputFromExistingData(applied.data, {
        sourceDocumentId: "doc_1",
      })?.directCosts[0],
    ).toMatchObject({
      id: "expense_re_1",
      amount: 75.72,
      ivaAmount: 0,
      total: 75.72,
    });
  });

  it("mantiene documentos, snapshots, sellos, hashes y VeriFactu byte-semánticamente intactos", () => {
    const profile = {
      ...EMPTY_DATA.profile,
      name: "Mi empresa",
      nif: "B12345678",
      verifactu: {
        enabled: true,
        environment: "test" as const,
        optInVersion: 1 as const,
      },
    };
    const issued = issueDocument(
      {
        id: "doc_1",
        type: "factura",
        number: "F-2026-0001",
        date: "2026-07-10",
        client: { name: "Cliente" },
        items: [
          {
            id: "sale-line",
            description: "Trabajo",
            quantity: 1,
            unitPrice: 300,
            ivaPercent: 21,
          },
        ],
        status: "borrador",
        createdAt: "2026-07-10T10:00:00.000Z",
        updatedAt: "2026-07-10T10:00:00.000Z",
      },
      profile,
      "2026-07-10T11:00:00.000Z",
    );
    const registered = attachRegisteredVerifactuToSnapshots({
      ...issued,
      verifactuPersistence: "server_confirmed",
      verifactu: {
        recordHash: "A".repeat(64),
        previousHash: "",
        recordTimestamp: "2026-07-10T13:00:00+02:00",
        qrUrl: "https://example.invalid/qr",
        status: "test_registered",
        recordType: "alta",
        environment: "test",
      },
    });
    const data: AppData = {
      ...appData([legacyExpense()]),
      profile,
      documents: [registered],
    };
    const preview = buildExpenseWorkAllocationRepairPreview(data);
    const applied = applyExpenseWorkAllocationCostRepair(data, preview, APPLIED_AT);

    expect(applied.data.documents).toBe(data.documents);
    expect(applied.data.documents).toEqual([registered]);
    expect(applied.data.documents[0]?.documentSnapshot).toEqual(
      registered.documentSnapshot,
    );
    expect(applied.data.documents[0]?.pdfSnapshot).toEqual(registered.pdfSnapshot);
    expect(applied.data.documents[0]?.snapshotSeal).toEqual(registered.snapshotSeal);
    expect(applied.data.documents[0]?.snapshotIntegrity).toEqual(
      registered.snapshotIntegrity,
    );
    expect(applied.data.documents[0]?.verifactu).toEqual(registered.verifactu);
  });

  it("mantiene el signo de un abono -100 -> -126,20", () => {
    const expense = legacyExpense({
      amount: -100,
      providerSummary: {
        status: "pending_original",
        summaryId: "summary_credit_re",
        importedAt: "2026-07-10T09:00:00.000Z",
        summaryInvoiceTotal: -126.2,
        summaryIvaAmount: -21,
      },
      purchaseLines: lines60_40(-1),
      workAllocations: [
        allocation("doc_1", -60, ["line_60"]),
        allocation("doc_2", -40, ["line_40"]),
      ],
    });
    const data = appData([expense]);
    const applied = applyExpenseWorkAllocationCostRepair(
      data,
      buildExpenseWorkAllocationRepairPreview(data),
      APPLIED_AT,
    );

    expect(applied.data.expenses[0]?.workAllocations?.map((item) => item.amount)).toEqual([
      -75.72,
      -50.48,
    ]);
  });

  it("reparte los céntimos de forma determinista y simétrica por orden original", () => {
    const thirdLines: ExpensePurchaseLine[] = ["a", "b", "c"].map((id) => ({
      id: `line_${id}`,
      description: id,
      quantity: 1,
      unitPrice: 100 / 3,
      total: 100 / 3,
      ivaPercent: 21,
    }));
    const expense = legacyExpense({
      purchaseLines: thirdLines,
      workAllocations: [
        allocation("doc_1", 33.33, ["line_a"]),
        allocation("doc_2", 33.33, ["line_b"]),
        allocation("doc_3", 33.33, ["line_c"]),
      ],
    });
    const data = appData([expense]);
    const applied = applyExpenseWorkAllocationCostRepair(
      data,
      buildExpenseWorkAllocationRepairPreview(data),
      APPLIED_AT,
    );

    expect(applied.data.expenses[0]?.workAllocations?.map((item) => item.amount)).toEqual([
      42.07,
      42.07,
      42.06,
    ]);
  });

  it("reproduce el cap secuencial histórico antes de calcular el nuevo reparto", () => {
    const bases = [81.79, 0.89, 13.55, 1.98, 1.79];
    const legacyAmounts = [98.97, 1.08, 16.4, 2.4, 2.15];
    const expense = legacyExpense({
      deductibility: "non_deductible",
      purchaseLines: bases.map((base, index) => ({
        id: `cap_line_${index}`,
        description: `Línea ${index}`,
        quantity: 1,
        unitPrice: base,
        total: base,
        ivaPercent: 21,
      })),
      workAllocations: legacyAmounts.map((amount, index) =>
        allocation(`doc_${index + 1}`, amount, [`cap_line_${index}`]),
      ),
    });
    const data: AppData = {
      ...appData([expense]),
      documents: bases.map((_, index) => document(`doc_${index + 1}`)),
    };
    const preview = buildExpenseWorkAllocationRepairPreview(data);
    const applied = applyExpenseWorkAllocationCostRepair(data, preview, APPLIED_AT);

    expect(preview.affectedCount).toBe(1);
    expect(applied.data.expenses[0]?.workAllocations?.map((item) => item.amount)).toEqual([
      103.22,
      1.12,
      17.1,
      2.5,
      2.26,
    ]);
  });

  it("es idempotente y el rollback restaura exactamente before con eventos append-only", () => {
    const data = appData([legacyExpense()]);
    const preview = buildExpenseWorkAllocationRepairPreview(data);
    const first = applyExpenseWorkAllocationCostRepair(data, preview, APPLIED_AT);
    const second = applyExpenseWorkAllocationCostRepair(
      first.data,
      preview,
      "2026-07-12T02:01:00.000Z",
    );

    expect(second.data).toBe(first.data);
    expect(second.appliedExpenseIds).toEqual([]);

    const rollbackPreview = buildExpenseWorkAllocationRollbackPreview(first.data);
    const rollback = rollbackExpenseWorkAllocationCostRepair(
      first.data,
      rollbackPreview,
      ROLLED_BACK_AT,
    );
    expect(rollback.rolledBackExpenseIds).toEqual(["expense_re_1"]);
    expect(rollback.data.expenses[0]?.workAllocations).toEqual(
      data.expenses[0]?.workAllocations,
    );
    expect(rollback.data.expenses[0]?.workAllocationCostRepair?.events).toEqual([
      { action: "applied", at: APPLIED_AT },
      { action: "rolled_back", at: ROLLED_BACK_AT },
    ]);

    const repeated = rollbackExpenseWorkAllocationCostRepair(
      rollback.data,
      rollbackPreview,
      "2026-07-12T02:06:00.000Z",
    );
    expect(repeated.data).toBe(rollback.data);
    expect(repeated.rolledBackExpenseIds).toEqual([]);
  });

  it("rechaza apply stale y bloquea rollback tras una edición posterior", () => {
    const data = appData([legacyExpense()]);
    const preview = buildExpenseWorkAllocationRepairPreview(data);
    const staleData: AppData = {
      ...data,
      expenses: data.expenses.map((expense) => ({
        ...expense,
        purchaseLines: expense.purchaseLines?.map((line) =>
          line.id === "line_60" ? { ...line, description: "Editada" } : line,
        ),
      })),
    };
    const staleApply = applyExpenseWorkAllocationCostRepair(
      staleData,
      preview,
      APPLIED_AT,
    );
    expect(staleApply.data).toBe(staleData);
    expect(staleApply.skippedExpenseIds).toEqual(["expense_re_1"]);

    const applied = applyExpenseWorkAllocationCostRepair(
      data,
      preview,
      APPLIED_AT,
    );
    const edited: AppData = {
      ...applied.data,
      expenses: applied.data.expenses.map((expense) => ({
        ...expense,
        workAllocations: expense.workAllocations?.map((item) => ({
          ...item,
          amount: item.amount - 1,
        })),
      })),
    };
    const rollbackPreview = buildExpenseWorkAllocationRollbackPreview(edited);
    expect(rollbackPreview).toMatchObject({
      affectedCount: 0,
      blockedExpenseIds: ["expense_re_1"],
    });
  });

  it("aplica un plan con varios gastos de forma atómica o no aplica ninguno", () => {
    const first = legacyExpense({ id: "expense_first" });
    const second = legacyExpense({ id: "expense_second" });
    const data = appData([first, second]);
    const preview = buildExpenseWorkAllocationRepairPreview(data);
    expect(preview.affectedCount).toBe(2);

    const changed: AppData = {
      ...data,
      expenses: data.expenses.map((expense) =>
        expense.id === "expense_second"
          ? {
              ...expense,
              purchaseLines: expense.purchaseLines?.map((line) =>
                line.id === "line_40" ? { ...line, description: "Cambio" } : line,
              ),
            }
          : expense,
      ),
    };
    const result = applyExpenseWorkAllocationCostRepair(
      changed,
      preview,
      APPLIED_AT,
    );

    expect(result.data).toBe(changed);
    expect(result.appliedExpenseIds).toEqual([]);
    expect(result.skippedExpenseIds).toEqual(["expense_first", "expense_second"]);
    expect(result.data.expenses[0]?.workAllocations?.[0]?.amount).toBe(100);
  });

  it("permite reaplicar tras rollback conservando el historial append-only", () => {
    const data = appData([legacyExpense()]);
    const applied = applyExpenseWorkAllocationCostRepair(
      data,
      buildExpenseWorkAllocationRepairPreview(data),
      APPLIED_AT,
    );
    const rolledBack = rollbackExpenseWorkAllocationCostRepair(
      applied.data,
      buildExpenseWorkAllocationRollbackPreview(applied.data),
      ROLLED_BACK_AT,
    );
    const reapplied = applyExpenseWorkAllocationCostRepair(
      rolledBack.data,
      buildExpenseWorkAllocationRepairPreview(rolledBack.data),
      "2026-07-12T02:10:00.000Z",
    );

    expect(reapplied.appliedExpenseIds).toEqual(["expense_re_1"]);
    expect(reapplied.data.expenses[0]?.workAllocationCostRepair?.events).toEqual([
      { action: "applied", at: APPLIED_AT },
      { action: "rolled_back", at: ROLLED_BACK_AT },
      { action: "applied", at: "2026-07-12T02:10:00.000Z" },
    ]);
  });

  it("bloquea rollback si la preimagen del repair record fue manipulada", () => {
    const data = appData([legacyExpense()]);
    const applied = applyExpenseWorkAllocationCostRepair(
      data,
      buildExpenseWorkAllocationRepairPreview(data),
      APPLIED_AT,
    );
    const repaired = applied.data.expenses[0]!;
    const audit = repaired.workAllocationCostRepair!;
    const tampered: AppData = {
      ...applied.data,
      expenses: [
        {
          ...repaired,
          workAllocationCostRepair: {
            ...audit,
            beforeFingerprint: "arbitrary",
            beforeAllocations: audit.beforeAllocations.map((item) => ({
              ...item,
              amount: 999,
            })),
          },
        },
      ],
    };

    expect(buildExpenseWorkAllocationRollbackPreview(tampered)).toMatchObject({
      affectedCount: 0,
      blockedExpenseIds: ["expense_re_1"],
    });
  });

  it("bloquea auditorías truncadas, desordenadas o con repairId ajeno", () => {
    const data = appData([legacyExpense()]);
    const applied = applyExpenseWorkAllocationCostRepair(
      data,
      buildExpenseWorkAllocationRepairPreview(data),
      APPLIED_AT,
    );
    const repaired = applied.data.expenses[0]!;
    const audit = repaired.workAllocationCostRepair!;
    const variants = [
      { ...audit, events: [] },
      {
        ...audit,
        events: [
          { action: "rolled_back" as const, at: ROLLED_BACK_AT },
          { action: "applied" as const, at: APPLIED_AT },
        ],
      },
      { ...audit, repairId: "otro-repair" },
    ];

    for (const workAllocationCostRepair of variants) {
      const tampered: AppData = {
        ...applied.data,
        expenses: [{ ...repaired, workAllocationCostRepair }],
      };
      expect(buildExpenseWorkAllocationRollbackPreview(tampered)).toMatchObject({
        affectedCount: 0,
        blockedExpenseIds: ["expense_re_1"],
      });
    }
  });

  it("mantiene rollback tras un roundtrip semántico que reordena claves", () => {
    const data = appData([legacyExpense()]);
    const applied = applyExpenseWorkAllocationCostRepair(
      data,
      buildExpenseWorkAllocationRepairPreview(data),
      APPLIED_AT,
    );
    const reordered = reorderObjectKeys(applied.data);

    expect(buildExpenseWorkAllocationRollbackPreview(reordered)).toMatchObject({
      affectedCount: 1,
      affectedExpenseIds: ["expense_re_1"],
      blockedExpenseIds: [],
    });
  });

  it("bloquea rollback ante cualquier cambio posterior del gasto", () => {
    const source = legacyExpense({
      supplierId: "supplier_1",
      purchaseDocument: { invoiceNumber: "A-1", issueDate: "2026-07-10" },
    });
    const data = appData([source]);
    const applied = applyExpenseWorkAllocationCostRepair(
      data,
      buildExpenseWorkAllocationRepairPreview(data),
      APPLIED_AT,
    );
    const changed: AppData = {
      ...applied.data,
      expenses: applied.data.expenses.map((expense) => ({
        ...expense,
        date: "2026-10-01",
        supplierId: "supplier_2",
        supplierName: "Otro proveedor",
        purchaseDocument: { ...expense.purchaseDocument, invoiceNumber: "A-2" },
      })),
    };

    expect(buildExpenseWorkAllocationRollbackPreview(changed)).toMatchObject({
      affectedCount: 0,
      blockedExpenseIds: ["expense_re_1"],
    });
  });

  it("ignora resúmenes ordinarios sin recargo en vez de marcarlos bloqueados", () => {
    const ordinary = legacyExpense({
      providerSummary: {
        status: "pending_original",
        summaryId: "ordinary",
        importedAt: "2026-07-10T09:00:00.000Z",
        summaryInvoiceTotal: 121,
        summaryIvaAmount: 21,
      },
    });
    const preview = buildExpenseWorkAllocationRepairPreview(
      appData([ordinary, { ...ordinary, id: "ordinary_fixed", businessKind: "fixed" }]),
    );

    expect(preview.affectedCount).toBe(0);
    expect(preview.manualReview).toEqual([]);
  });

  it("excluye IDs de gasto duplicados y no colapsa planes por Map", () => {
    const first = legacyExpense({ id: "duplicate" });
    const second = legacyExpense({
      id: "duplicate",
      amount: 200,
      providerSummary: {
        status: "pending_original",
        summaryId: "summary_200",
        importedAt: "2026-07-10T09:00:00.000Z",
        summaryInvoiceTotal: 252.4,
        summaryIvaAmount: 42,
      },
      purchaseLines: [
        { ...lines60_40()[0]!, unitPrice: 120 },
        { ...lines60_40()[1]!, unitPrice: 80 },
      ],
      workAllocations: [
        allocation("doc_1", 120, ["line_60"]),
        allocation("doc_2", 80, ["line_40"]),
      ],
    });
    const data = appData([first, second]);
    const preview = buildExpenseWorkAllocationRepairPreview(data);
    const result = applyExpenseWorkAllocationCostRepair(data, preview, APPLIED_AT);

    expect(preview.affectedCount).toBe(0);
    expect(preview.manualReview).toHaveLength(2);
    expect(preview.manualReview.every((item) =>
      item.reasons.includes("duplicate_expense_id"),
    )).toBe(true);
    expect(result.data).toBe(data);
    expect(data.expenses.map((expense) => expense.workAllocations?.[0]?.amount)).toEqual([
      100,
      120,
    ]);
  });

  it("incluye el caso no deducible sin reabrir base ni IVA fiscal", () => {
    const expense = legacyExpense({
      deductibility: "non_deductible",
      workAllocations: [
        allocation("doc_1", 72.6, ["line_60"]),
        allocation("doc_2", 48.4, ["line_40"]),
      ],
    });
    const data = appData([expense]);
    const preview = buildExpenseWorkAllocationRepairPreview(data);
    expect(preview.candidates[0]).toMatchObject({
      legacyOperatingCost: 121,
      canonicalOperatingCost: 126.2,
    });
    const applied = applyExpenseWorkAllocationCostRepair(data, preview, APPLIED_AT);

    expect(applied.data.expenses[0]?.workAllocations?.map((item) => item.amount)).toEqual([
      75.72,
      50.48,
    ]);
    expect(summarizeWorkDocumentExpenses(applied.data.expenses, "doc_1")).toEqual({
      count: 1,
      cost: 75.72,
      deductibleBase: 0,
      deductibleIva: 0,
    });
  });

  it("deja todos los casos parciales o ambiguos en revisión sin mutarlos", () => {
    const cases: Array<{
      id: string;
      expense: Expense;
      reason?: string;
      ignored?: boolean;
    }> = [
      {
        id: "no_lines",
        expense: legacyExpense({ id: "no_lines", purchaseLines: undefined }),
        reason: "invalid_purchase_lines",
      },
      {
        id: "partial",
        expense: legacyExpense({
          id: "partial",
          workAllocations: [allocation("doc_1", 60, ["line_60"])],
        }),
        reason: "incomplete_line_coverage",
      },
      {
        id: "duplicate_coverage",
        expense: legacyExpense({
          id: "duplicate_coverage",
          workAllocations: [
            allocation("doc_1", 60, ["line_60"]),
            allocation("doc_2", 40, ["line_60", "line_40"]),
          ],
        }),
        reason: "duplicate_line_coverage",
      },
      {
        id: "unknown_line",
        expense: legacyExpense({
          id: "unknown_line",
          workAllocations: [allocation("doc_1", 100, ["line_missing"])],
        }),
        reason: "unknown_line_coverage",
      },
      {
        id: "manual_amount",
        expense: legacyExpense({
          id: "manual_amount",
          workAllocations: [
            allocation("doc_1", 55, ["line_60"]),
            allocation("doc_2", 45, ["line_40"]),
          ],
        }),
        reason: "allocation_share_mismatch",
      },
      {
        id: "wrong_sign",
        expense: legacyExpense({
          id: "wrong_sign",
          workAllocations: [allocation("doc_1", -100, ["line_60", "line_40"])],
        }),
        reason: "allocation_sign_mismatch",
      },
      {
        id: "already_versioned",
        expense: legacyExpense({
          id: "already_versioned",
          workAllocations: [
            {
              ...allocation("doc_1", 100, ["line_60", "line_40"]),
              fullAmountAtAllocation: 100,
            },
          ],
        }),
        reason: "allocation_provenance_present",
      },
      {
        id: "missing_document",
        expense: legacyExpense({
          id: "missing_document",
          workDocumentId: "doc_missing",
          workAllocations: [
            allocation("doc_missing", 100, ["line_60", "line_40"]),
          ],
        }),
        reason: "missing_work_document",
      },
      {
        id: "duplicate_purchase_line",
        expense: legacyExpense({
          id: "duplicate_purchase_line",
          purchaseLines: [lines60_40()[0]!, { ...lines60_40()[1]!, id: "line_60" }],
        }),
        reason: "invalid_purchase_lines",
      },
      {
        id: "whitespace_line_id",
        expense: legacyExpense({
          id: "whitespace_line_id",
          purchaseLines: [
            { ...lines60_40()[0]!, id: " line_60 " },
            lines60_40()[1]!,
          ],
        }),
        reason: "invalid_purchase_lines",
      },
      {
        id: "invalid_line_total",
        expense: legacyExpense({
          id: "invalid_line_total",
          purchaseLines: [
            { ...lines60_40()[0]!, total: Number.NaN },
            lines60_40()[1]!,
          ],
        }),
        reason: "invalid_purchase_lines",
      },
      {
        id: "zero_line_total",
        expense: legacyExpense({
          id: "zero_line_total",
          purchaseLines: [
            { ...lines60_40()[0]!, total: 0 },
            lines60_40()[1]!,
          ],
        }),
        reason: "invalid_purchase_lines",
      },
      {
        id: "invalid_expense_id",
        expense: legacyExpense({ id: " " }),
        reason: "invalid_expense_id",
      },
      {
        id: "invalid_allocation_date",
        expense: legacyExpense({
          id: "invalid_allocation_date",
          workAllocations: [
            {
              ...allocation("doc_1", 100, ["line_60", "line_40"]),
              updatedAt: 123 as unknown as string,
            },
          ],
        }),
        reason: "invalid_allocation",
      },
      {
        id: "vat_blocked",
        expense: legacyExpense({
          id: "vat_blocked",
          providerSummary: {
            status: "pending_original",
            summaryId: "blocked",
            importedAt: "2026-07-10T09:00:00.000Z",
            summaryInvoiceTotal: 147.2,
            summaryIvaAmount: 42,
          },
        }),
        reason: "fiscal_evidence_blocked",
      },
      {
        id: "fixed",
        expense: legacyExpense({ id: "fixed", businessKind: "fixed" }),
        reason: "fixed_expense",
      },
      {
        id: "new_explicit_surcharge",
        expense: legacyExpense({
          id: "new_explicit_surcharge",
          providerSummary: {
            status: "pending_original",
            summaryId: "new",
            importedAt: "2026-07-12T01:00:00.000Z",
            summaryInvoiceTotal: 126.2,
            summaryIvaPercent: 21,
            summaryIvaAmount: 21,
            summaryRecargoPercent: 5.2,
            summaryRecargoAmount: 5.2,
          },
        }),
        ignored: true,
      },
    ];

    for (const item of cases) {
      const data = appData([item.expense]);
      const preview = buildExpenseWorkAllocationRepairPreview(data);
      expect(preview.affectedCount, item.id).toBe(0);
      const applied = applyExpenseWorkAllocationCostRepair(data, preview, APPLIED_AT);
      expect(applied.data, item.id).toBe(data);
      if (item.ignored) {
        expect(preview.manualReview, item.id).toEqual([]);
      } else {
        expect(reasonFor(data, item.expense.id), item.id).toContain(item.reason);
      }
    }
  });
});
