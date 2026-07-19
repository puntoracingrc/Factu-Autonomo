import { trackDataDiff } from "./cloud/incremental";
import {
  saveFixedExpenseWithRecurringTemplateToData,
  type RecurringExpenseDraft,
} from "./recurring-expenses";
import {
  fiscalNotificationsWorkspaceHasStoredContent,
  touchAppData,
  type SaveDataBlockedReason,
  type SaveDataResult,
} from "./storage";
import type { AppData, Expense, RecurringExpense, Supplier } from "./types";

export type AppDataDurabilityBlockedReason =
  | SaveDataBlockedReason
  | "stale_precondition"
  | "transition_failed"
  | "identifier_collision"
  | "not_found";

export type AppDataDurabilityResult<T> =
  | {
      status: "applied";
      data: AppData;
      value: T;
      replayed: boolean;
    }
  | { status: "blocked"; reason: AppDataDurabilityBlockedReason }
  | { status: "indeterminate"; reason: "storage_state_unknown" };

export type DurableStorageBaseline =
  | { status: "known"; data: AppData }
  | Exclude<SaveDataResult, { status: "applied" }>;

export function durableStorageBaselineAfterSave(
  data: AppData,
  result: SaveDataResult,
): DurableStorageBaseline {
  return result.status === "applied" ? { status: "known", data } : result;
}

export interface AppDataTransition<T> {
  data: AppData;
  value: T;
}

export function commitAppDataDurably<T>(input: {
  expected: AppData;
  storageBaseline?: DurableStorageBaseline;
  getCurrent: () => AppData;
  build: (previous: AppData) => AppDataTransition<T>;
  persist: (candidate: AppData, storageExpected: AppData) => SaveDataResult;
}): AppDataDurabilityResult<T> {
  if (input.getCurrent() !== input.expected) {
    return { status: "blocked", reason: "stale_precondition" };
  }
  const storageBaseline = input.storageBaseline ?? {
    status: "known" as const,
    data: input.expected,
  };
  if (storageBaseline.status !== "known") return storageBaseline;

  let transition: AppDataTransition<T>;
  let resolved: AppData;
  try {
    transition = input.build(input.expected);
    resolved = trackDataDiff(
      input.expected,
      touchAppData(transition.data),
    );
  } catch {
    return { status: "blocked", reason: "transition_failed" };
  }

  // El candidato puede ser costoso de construir. Se vuelve a comprobar la
  // identidad inmediatamente antes de la única escritura durable.
  if (input.getCurrent() !== input.expected) {
    return { status: "blocked", reason: "stale_precondition" };
  }

  let persistence: SaveDataResult;
  try {
    persistence = input.persist(
      resolved,
      storageBaseline.data,
    );
  } catch {
    return { status: "indeterminate", reason: "storage_state_unknown" };
  }

  if (persistence.status === "blocked") return persistence;
  if (persistence.status === "indeterminate") return persistence;
  return {
    status: "applied",
    data: resolved,
    value: transition.value,
    replayed: false,
  };
}

/**
 * Reintenta una transición una sola vez cuando el bloqueo procede únicamente
 * de una referencia durable antigua. Recupera contra la lectura actual cuando
 * conserva el mismo dominio de negocio o contra la última base conocida cuando
 * el almacenamiento confirma byte-semánticamente que sigue intacta. Nunca
 * rebasa una divergencia durable real ni repite una transición inválida.
 */
export function commitAppDataDurablyWithStorageRecovery<T>(input: {
  expected: AppData;
  storageBaseline?: DurableStorageBaseline;
  lastKnownStorageBaseline?: AppData;
  getCurrent: () => AppData;
  build: (previous: AppData) => AppDataTransition<T>;
  persist: (candidate: AppData, storageExpected: AppData) => SaveDataResult;
  inspectPersisted: (expected: AppData) => SaveDataResult;
  readPersisted?: () => AppData | null;
}): AppDataDurabilityResult<T> {
  const attempt = (storageBaseline: DurableStorageBaseline | undefined) =>
    commitAppDataDurably({
      expected: input.expected,
      storageBaseline,
      getCurrent: input.getCurrent,
      build: input.build,
      persist: input.persist,
    });

  const first = attempt(input.storageBaseline);
  if (first.status === "applied") return first;
  if (input.getCurrent() !== input.expected) return first;

  const baselineCanBeRecovered =
    input.storageBaseline?.status !== "known" ||
    first.reason === "stale_precondition" ||
    first.reason === "storage_state_unknown";
  if (!baselineCanBeRecovered) return first;
  if (input.inspectPersisted(input.expected).status === "applied") {
    return attempt({ status: "known", data: input.expected });
  }

  const persisted = input.readPersisted?.() ?? null;
  if (persisted && appDataDomainEquals(input.expected, persisted)) {
    return attempt({ status: "known", data: persisted });
  }

  if (
    input.storageBaseline?.status === "blocked" &&
    input.lastKnownStorageBaseline &&
    input.inspectPersisted(input.lastKnownStorageBaseline).status === "applied"
  ) {
    return attempt({
      status: "known",
      data: input.lastKnownStorageBaseline,
    });
  }

  return first;
}

function appDataDomainEquals(left: AppData, right: AppData): boolean {
  return jsonEqual(appDataDomainComparable(left), appDataDomainComparable(right));
}

function appDataDomainComparable(value: AppData): AppData {
  const comparable: AppData = { ...value, meta: undefined };
  if (
    !fiscalNotificationsWorkspaceHasStoredContent(
      comparable.fiscalNotificationsWorkspace,
    )
  ) {
    delete comparable.fiscalNotificationsWorkspace;
  }
  return comparable;
}

export interface FixedExpenseBundleIds {
  expenseId: string;
  recurringExpenseId: string;
  supplierId: string;
}

export function fixedExpenseBundleIds(
  operationId: string,
): FixedExpenseBundleIds {
  return {
    recurringExpenseId: `fixed-recurring-${operationId}`,
    expenseId: `fixed-expense-${operationId}`,
    supplierId: `fixed-supplier-${operationId}`,
  };
}

export type FixedExpenseBundleInspection =
  | { status: "not_applied" }
  | {
      status: "applied";
      expense: Expense;
      recurringExpense: RecurringExpense;
    }
  | { status: "ambiguous" };

function recurringProvenanceMatches(
  expense: Expense,
  recurringExpenseId: string,
): boolean {
  if (
    expense.businessKind !== "fixed" ||
    expense.recurringExpenseId !== recurringExpenseId
  ) {
    return false;
  }
  const key = expense.recurringOccurrenceKey;
  const prefix = `${recurringExpenseId}:`;
  if (!key?.startsWith(prefix)) return false;
  const occurrenceDate = key.slice(prefix.length);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurrenceDate)) return false;
  const parsed = new Date(`${occurrenceDate}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === occurrenceDate
  );
}

export function inspectFixedExpenseBundle(
  data: AppData,
  operationId: string,
): FixedExpenseBundleInspection {
  const ids = fixedExpenseBundleIds(operationId);
  const recurring = data.recurringExpenses.filter(
    (entry) => entry.id === ids.recurringExpenseId,
  );
  const linked = data.expenses.filter(
    (entry) => entry.recurringExpenseId === ids.recurringExpenseId,
  );
  const seeds = linked.filter((entry) => entry.origin !== "recurring");
  const operationSuppliers = data.suppliers.filter(
    (entry) => entry.id === ids.supplierId,
  );
  const seedIdMatches = seeds[0]
    ? data.expenses.filter((entry) => entry.id === seeds[0].id)
    : [];

  if (
    recurring.length === 0 &&
    linked.length === 0 &&
    operationSuppliers.length === 0
  ) {
    return { status: "not_applied" };
  }
  if (
    recurring.length !== 1 ||
    seeds.length !== 1 ||
    seedIdMatches.length !== 1 ||
    linked.some(
      (entry) => !recurringProvenanceMatches(entry, ids.recurringExpenseId),
    ) ||
    operationSuppliers.length > 1 ||
    (seeds[0].supplierId === ids.supplierId &&
      operationSuppliers.length !== 1)
  ) {
    return { status: "ambiguous" };
  }
  return {
    status: "applied",
    expense: seeds[0],
    recurringExpense: recurring[0],
  };
}

export interface FixedExpenseBundleCommand {
  expense: Omit<Expense, "id" | "createdAt"> | Expense;
  recurringExpense: RecurringExpenseDraft;
  supplier?: Omit<Supplier, "id" | "createdAt">;
  ids: FixedExpenseBundleIds;
}

export interface FixedExpenseBundleValue {
  expense: Expense;
  recurringExpense: RecurringExpense;
  supplier?: Supplier;
}

export type FixedExpenseBundlePreparation =
  | { status: "ready"; transition: AppDataTransition<FixedExpenseBundleValue> }
  | { status: "already_applied"; value: FixedExpenseBundleValue }
  | {
      status: "blocked";
      reason: "identifier_collision" | "not_found" | "transition_failed";
    };

function jsonEqual(left: unknown, right: unknown): boolean {
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
}

function recurringDraftMatches(
  stored: RecurringExpense,
  expected: RecurringExpenseDraft,
): boolean {
  return Object.entries(expected).every(([key, value]) =>
    jsonEqual(stored[key as keyof RecurringExpense], value),
  );
}

function purchaseLinesForReplay(lines: Expense["purchaseLines"]): unknown {
  return lines?.map((line) => ({ ...line, id: undefined }));
}

function expenseReplayShape(
  expense: Omit<Expense, "id" | "createdAt"> | Expense,
): unknown {
  return {
    date: expense.date,
    origin: expense.origin,
    businessKind: expense.businessKind,
    supplierId: expense.supplierId,
    supplierName: expense.supplierName,
    description: expense.description,
    amount: expense.amount,
    ivaPercent: expense.ivaPercent,
    deductibility: expense.deductibility,
    category: expense.category,
    paymentMethod: expense.paymentMethod,
    notes: expense.notes,
    purchaseDocument: expense.purchaseDocument,
    purchaseLines: purchaseLinesForReplay(expense.purchaseLines),
  };
}

function supplierMatches(
  stored: Supplier | undefined,
  expected: Omit<Supplier, "id" | "createdAt"> | undefined,
): boolean {
  if (!expected) return true;
  if (!stored) return false;
  return Object.entries(expected).every(([key, value]) =>
    jsonEqual(stored[key as keyof Supplier], value),
  );
}

export function prepareFixedExpenseBundle(
  data: AppData,
  command: FixedExpenseBundleCommand,
  options: { now: string; referenceDate?: string },
): FixedExpenseBundlePreparation {
  const recurringMatches = data.recurringExpenses.filter(
    (entry) => entry.id === command.ids.recurringExpenseId,
  );
  if (recurringMatches.length > 1) {
    return { status: "blocked", reason: "identifier_collision" };
  }

  const targetExpenseId =
    "id" in command.expense ? command.expense.id : command.ids.expenseId;
  const targetExpenses = data.expenses.filter(
    (entry) => entry.id === targetExpenseId,
  );
  const linkedExpenses = data.expenses.filter(
    (entry) => entry.recurringExpenseId === command.ids.recurringExpenseId,
  );
  const seedExpenses = linkedExpenses.filter(
    (entry) => entry.origin !== "recurring",
  );
  const targetExpense = targetExpenses[0];
  const replayExpense =
    targetExpense?.recurringExpenseId === command.ids.recurringExpenseId
      ? targetExpense
      : seedExpenses.length === 1
        ? seedExpenses[0]
        : undefined;
  const recurring = recurringMatches[0];
  const linkedProvenanceIsValid = linkedExpenses.every((entry) =>
    recurringProvenanceMatches(entry, command.ids.recurringExpenseId),
  );
  const supplierCandidates = command.supplier
    ? data.suppliers.filter((entry) => entry.id === command.ids.supplierId)
    : [];
  const supplier = supplierCandidates[0];
  const expectedExpense = command.supplier
    ? {
        ...command.expense,
        supplierId: command.ids.supplierId,
        supplierName: command.supplier.name,
      }
    : command.expense;

  if (targetExpenses.length > 1) {
    return { status: "blocked", reason: "identifier_collision" };
  }

  if (recurring) {
    const replayExpenseIdMatches = replayExpense
      ? data.expenses.filter((entry) => entry.id === replayExpense.id)
      : [];
    if (
      !replayExpense ||
      replayExpenseIdMatches.length !== 1 ||
      seedExpenses.length > 1 ||
      !linkedProvenanceIsValid ||
      !recurringProvenanceMatches(
        replayExpense,
        command.ids.recurringExpenseId,
      ) ||
      !recurringDraftMatches(recurring, command.recurringExpense) ||
      !jsonEqual(
        expenseReplayShape(replayExpense),
        expenseReplayShape(expectedExpense),
      ) ||
      supplierCandidates.length > 1 ||
      !supplierMatches(supplier, command.supplier)
    ) {
      return { status: "blocked", reason: "identifier_collision" };
    }
    return {
      status: "already_applied",
      value: {
        expense: replayExpense,
        recurringExpense: recurring,
        supplier,
      },
    };
  }

  if (
    linkedExpenses.length > 0 ||
    supplier
  ) {
    return { status: "blocked", reason: "identifier_collision" };
  }

  const existingExpense = targetExpenses[0];
  if ("id" in command.expense) {
    if (!existingExpense) return { status: "blocked", reason: "not_found" };
    if (existingExpense.recurringExpenseId) {
      return { status: "blocked", reason: "identifier_collision" };
    }
  } else if (existingExpense) {
    return { status: "blocked", reason: "identifier_collision" };
  }

  const createdSupplier: Supplier | undefined = command.supplier
    ? {
        ...command.supplier,
        id: command.ids.supplierId,
        createdAt: options.now,
      }
    : undefined;
  const withSupplier: AppData = createdSupplier
    ? { ...data, suppliers: [...data.suppliers, createdSupplier] }
    : data;
  const generatedIds = [command.ids.recurringExpenseId, command.ids.expenseId];
  let generatedIdIndex = 0;
  const saved = saveFixedExpenseWithRecurringTemplateToData(
    withSupplier,
    expectedExpense,
    command.recurringExpense,
    {
      now: options.now,
      referenceDate: options.referenceDate,
      newId: () => {
        const generatedId = generatedIds[generatedIdIndex++];
        if (!generatedId) throw new Error("fixed_expense_id_exhausted");
        return generatedId;
      },
    },
  );
  const expense = saved.data.expenses.find(
    (entry) => entry.recurringExpenseId === command.ids.recurringExpenseId,
  );
  if (!expense) return { status: "blocked", reason: "transition_failed" };

  return {
    status: "ready",
    transition: {
      data: saved.data,
      value: {
        expense,
        recurringExpense: saved.recurringExpense,
        supplier: createdSupplier,
      },
    },
  };
}

export function durableBaselineContainsFixedExpenseBundle(
  data: AppData,
  command: FixedExpenseBundleCommand,
  options: { now: string; referenceDate?: string },
): boolean {
  try {
    return (
      prepareFixedExpenseBundle(data, command, options).status ===
      "already_applied"
    );
  } catch {
    return false;
  }
}
