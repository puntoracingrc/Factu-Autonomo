import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_DATA, type Expense } from "./types";
import {
  commitAppDataDurably,
  commitLatestAppDataDurably,
  fixedExpenseBundleIds,
  prepareFixedExpenseBundle,
} from "./app-data-durability";
import { buildScannedExpenseDurableTransition } from "./scanned-expense-durability";
import { loadData, saveData } from "./storage";

const NOW = "2026-07-17T10:00:00.000Z";
const HASH = "a".repeat(64);

function draft(): Omit<Expense, "id" | "createdAt"> {
  return {
    date: "2026-07-17",
    supplierName: "Proveedor",
    description: "Material",
    amount: 100,
    ivaPercent: 21,
    category: "Material",
    paymentMethod: "Tarjeta",
    origin: "scan",
    businessKind: "purchase_invoice",
    originalArchive: {
      schemaVersion: 1,
      status: "archived_verified",
      source: "scan",
      sourceSha256: HASH,
      sourceMimeType: "application/pdf",
      driveFileId: "drive-file-1",
      driveFolderId: "drive-folder-1",
      documentDate: "2026-07-17",
      verification: "SHA256_READBACK_MATCH",
      archivedAt: NOW,
    },
  };
}

describe("scanned expense durable transition", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    });
    vi.stubGlobal("window", {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("crea proveedor y gasto dentro del mismo candidato", () => {
    const transition = buildScannedExpenseDurableTransition({
      data: EMPTY_DATA,
      expense: draft(),
      operationId: "scan-1",
      now: NOW,
      supplier: { name: "Proveedor", category: "Material" },
    });

    expect(transition.data.suppliers).toHaveLength(1);
    expect(transition.data.expenses).toHaveLength(1);
    expect(transition.value.expense.supplierId).toBe(
      transition.value.supplier?.id,
    );
    expect(transition.value.expense.originalArchive?.sourceSha256).toBe(HASH);
  });

  it("es idempotente por ID de operación y procedencia exacta", () => {
    const first = buildScannedExpenseDurableTransition({
      data: EMPTY_DATA,
      expense: draft(),
      operationId: "scan-1",
      now: NOW,
    });
    const second = buildScannedExpenseDurableTransition({
      data: first.data,
      expense: draft(),
      operationId: "scan-1",
      now: "2026-07-17T10:01:00.000Z",
    });

    expect(second.data).toBe(first.data);
    expect(second.value.expense.id).toBe(first.value.expense.id);
  });

  it("actualiza un gasto existente sin duplicarlo", () => {
    const first = buildScannedExpenseDurableTransition({
      data: EMPTY_DATA,
      expense: draft(),
      operationId: "scan-1",
      now: NOW,
    });
    const changed = buildScannedExpenseDurableTransition({
      data: first.data,
      expense: { ...first.value.expense, notes: "Revisado" },
      operationId: "scan-1",
      now: "2026-07-17T10:01:00.000Z",
    });

    expect(changed.data.expenses).toHaveLength(1);
    expect(changed.value.expense.notes).toBe("Revisado");
  });

  it("no toca documentos emitidos ni integridad/VeriFactu", () => {
    const documents = [{ id: "issued-fixture" }] as typeof EMPTY_DATA.documents;
    const profile = { ...EMPTY_DATA.profile };
    const baseline = { ...EMPTY_DATA, documents, profile };

    const transition = buildScannedExpenseDurableTransition({
      data: baseline,
      expense: draft(),
      operationId: "scan-1",
      now: NOW,
    });

    expect(transition.data.documents).toBe(documents);
    expect(transition.data.profile).toBe(profile);
  });

  it("solo publica memoria después de una escritura durable aplicada", () => {
    let current = EMPTY_DATA;
    const persist = vi.fn(() => ({ status: "applied" as const }));
    const result = commitAppDataDurably({
      expected: EMPTY_DATA,
      getCurrent: () => current,
      build: (previous) =>
        buildScannedExpenseDurableTransition({
          data: previous,
          expense: draft(),
          operationId: "scan-1",
          now: NOW,
        }),
      persist,
    });

    expect(result.status).toBe("applied");
    expect(current.expenses).toHaveLength(0);
    if (result.status === "applied") current = result.data;
    expect(current.expenses).toHaveLength(1);
  });

  it("guarda sobre la cuenta vigente aunque el escáner se abriera antes de una sincronización", () => {
    const stale = structuredClone(EMPTY_DATA);
    const current = {
      ...structuredClone(EMPTY_DATA),
      profile: { ...EMPTY_DATA.profile, name: "Perfil recibido de la nube" },
    };
    const persist = vi.fn(() => ({ status: "applied" as const }));

    const result = commitLatestAppDataDurably({
      storageBaseline: { status: "known", data: stale },
      getCurrent: () => current,
      build: (previous) =>
        buildScannedExpenseDurableTransition({
          data: previous,
          expense: { ...draft(), originalArchive: undefined },
          operationId: "scan-after-sync",
          now: NOW,
        }),
      persist,
    });

    expect(result.status).toBe("applied");
    expect(persist).toHaveBeenCalledTimes(1);
    if (result.status !== "applied") return;
    expect(result.data.profile.name).toBe("Perfil recibido de la nube");
    expect(result.data.expenses).toEqual([
      expect.objectContaining({
        id: "scanned-expense-scan-after-sync",
        description: "Material",
        originalArchive: undefined,
      }),
    ]);
  });

  it("persiste y vuelve a leer un gasto escaneado sobre la cuenta vigente", () => {
    const stale = structuredClone(EMPTY_DATA);
    const current = {
      ...structuredClone(EMPTY_DATA),
      profile: { ...EMPTY_DATA.profile, name: "Perfil durable vigente" },
    };
    expect(saveData(current)).toEqual({ status: "applied" });

    const result = commitLatestAppDataDurably({
      storageBaseline: { status: "known", data: stale },
      getCurrent: () => current,
      build: (previous) =>
        buildScannedExpenseDurableTransition({
          data: previous,
          expense: { ...draft(), originalArchive: undefined },
          operationId: "scan-real-storage",
          now: NOW,
        }),
      persist: (candidate) => saveData(candidate),
    });

    expect(result.status).toBe("applied");
    expect(loadData()).toMatchObject({
      profile: { name: "Perfil durable vigente" },
      expenses: [
        {
          id: "scanned-expense-scan-real-storage",
          description: "Material",
          origin: "scan",
        },
      ],
    });
  });

  it("persiste juntos el gasto fijo escaneado y su recurrencia sobre la cuenta vigente", () => {
    const stale = structuredClone(EMPTY_DATA);
    const current = {
      ...structuredClone(EMPTY_DATA),
      profile: { ...EMPTY_DATA.profile, name: "Perfil fijo vigente" },
    };
    expect(saveData(current)).toEqual({ status: "applied" });
    const ids = fixedExpenseBundleIds("scan-fixed-real-storage");
    const command = {
      expense: {
        ...draft(),
        originalArchive: undefined,
        businessKind: "fixed" as const,
      },
      recurringExpense: {
        supplierName: "Proveedor",
        description: "Material",
        amount: 100,
        ivaPercent: 21,
        category: "Material",
        paymentMethod: "Tarjeta",
        frequency: "monthly" as const,
        dueTiming: { kind: "end_of_month" as const },
        duration: { kind: "indefinite" as const },
        startDate: "2026-07-17",
        enabled: true,
      },
      ids,
    };

    const result = commitLatestAppDataDurably({
      storageBaseline: { status: "known", data: stale },
      getCurrent: () => current,
      build: (previous) => {
        const prepared = prepareFixedExpenseBundle(previous, command, {
          now: NOW,
        });
        if (prepared.status !== "ready") {
          throw new Error(`UNEXPECTED_${prepared.status}`);
        }
        return prepared.transition;
      },
      persist: (candidate) => saveData(candidate),
    });

    expect(result.status).toBe("applied");
    const persisted = loadData();
    expect(persisted.profile.name).toBe("Perfil fijo vigente");
    expect(persisted.expenses).toEqual([
      expect.objectContaining({
        id: ids.expenseId,
        businessKind: "fixed",
        recurringExpenseId: ids.recurringExpenseId,
      }),
    ]);
    expect(persisted.recurringExpenses).toEqual([
      expect.objectContaining({
        id: ids.recurringExpenseId,
        frequency: "monthly",
      }),
    ]);
  });
});
