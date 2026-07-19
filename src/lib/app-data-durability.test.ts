import { afterEach, describe, expect, it, vi } from "vitest";
import { createDemoWorkspaceData } from "./demo-workspace";
import {
  commitAppDataDurably,
  commitAppDataDurablyWithStorageRecovery,
  durableBaselineContainsFixedExpenseBundle,
  durableStorageBaselineAfterSave,
  fixedExpenseBundleIds,
  inspectFixedExpenseBundle,
  prepareFixedExpenseBundle,
  type FixedExpenseBundleCommand,
} from "./app-data-durability";
import { syncRecurringExpenses } from "./recurring-expenses";
import { loadData, saveData } from "./storage";
import { EMPTY_DATA, type AppData, type RecurringExpenseFrequency } from "./types";

const NOW = "2026-07-12T09:00:00.000Z";

function appData(): AppData {
  return {
    ...EMPTY_DATA,
    profile: { ...EMPTY_DATA.profile, name: "Taller seguro" },
    meta: { lastModified: "2026-07-12T08:00:00.000Z" },
  };
}

function emptyFiscalWorkspace(
  ownerScope: string,
  createdAt: string,
): NonNullable<AppData["fiscalNotificationsWorkspace"]> {
  return {
    schemaVersion: 1,
    workspaceId: "fiscal-notifications-workspace-v1",
    ownerScope,
    revision: 0,
    createdAt,
    updatedAt: createdAt,
    packages: [],
    files: [],
    documents: [],
    parts: [],
    authorities: [],
    references: [],
    evidence: [],
    debts: [],
    debtObservations: [],
    cases: [],
    relations: [],
    analysisSnapshots: [],
    paymentOptions: [],
    paymentPlans: [],
    installments: [],
    interestCalculations: [],
    deadlineRules: [],
    obligations: [],
    timeline: [],
    accountingDrafts: [],
    auditEvents: [],
    driveArchives: [],
  };
}

function fixedCommand(input?: {
  operationId?: string;
  frequency?: RecurringExpenseFrequency;
  supplier?: "new" | "existing" | "none";
  nonDeductible?: boolean;
}): FixedExpenseBundleCommand {
  const operationId = input?.operationId ?? "inbox-1";
  const supplierMode = input?.supplier ?? "new";
  const supplierId =
    supplierMode === "existing" ? "supplier-existing" : undefined;
  return {
    ids: fixedExpenseBundleIds(operationId),
    supplier:
      supplierMode === "new"
        ? { name: "Proveedor seguro", nif: "B12345678", category: "Otros" }
        : undefined,
    expense: {
      date: "2026-07-12",
      origin: "scan",
      businessKind: "fixed",
      supplierId,
      supplierName:
        supplierMode === "none" ? "Sin proveedor" : "Proveedor seguro",
      description: "Cuota operativa",
      amount: 100,
      ivaPercent: input?.nonDeductible ? 0 : 21,
      deductibility: input?.nonDeductible
        ? "non_deductible"
        : "deductible",
      category: "Otros",
      paymentMethod: "Domiciliación",
    },
    recurringExpense: {
      supplierName:
        supplierMode === "none" ? "Sin proveedor" : "Proveedor seguro",
      description: "Cuota operativa",
      amount: 100,
      ivaPercent: input?.nonDeductible ? 0 : 21,
      deductibility: input?.nonDeductible
        ? "non_deductible"
        : "deductible",
      category: "Otros",
      paymentMethod: "Domiciliación",
      frequency: input?.frequency ?? "monthly",
      dueTiming: { kind: "end_of_month" },
      duration: { kind: "indefinite" },
      startDate: "2026-07-12",
      enabled: true,
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("commitAppDataDurably", () => {
  it("persiste el candidato resuelto antes de devolverlo como aplicado", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW));
    const previous = appData();
    const events: string[] = [];
    const result = commitAppDataDurably({
      expected: previous,
      getCurrent: () => previous,
      build: (current) => {
        events.push("build");
        return {
          data: {
            ...current,
            recurringExpenses: [
              {
                ...fixedCommand().recurringExpense,
                id: "recurring-1",
                createdAt: NOW,
                updatedAt: NOW,
              },
            ],
          },
          value: "saved",
        };
      },
      persist: (candidate) => {
        events.push("persist");
        expect(candidate.meta?.pendingChanges).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              entityType: "recurring_expense",
              entityId: "recurring-1",
            }),
          ]),
        );
        return { status: "applied" };
      },
    });

    expect(events).toEqual(["build", "persist"]);
    expect(result.status).toBe("applied");
    if (result.status === "applied") {
      expect(result.value).toBe("saved");
      expect(result.data).not.toBe(previous);
      expect(result.replayed).toBe(false);
    }
  });

  it("bloquea stale antes de construir o persistir", () => {
    const expected = appData();
    const current = { ...expected };
    const build = vi.fn();
    const persist = vi.fn();

    expect(
      commitAppDataDurably({
        expected,
        getCurrent: () => current,
        build,
        persist,
      }),
    ).toEqual({ status: "blocked", reason: "stale_precondition" });
    expect(build).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
  });

  it("repite la precondición justo antes de persistir", () => {
    const expected = appData();
    const current = { ...expected };
    let reads = 0;
    const persist = vi.fn();

    expect(
      commitAppDataDurably({
        expected,
        getCurrent: () => (++reads === 1 ? expected : current),
        build: (previous) => ({ data: { ...previous }, value: undefined }),
        persist,
      }),
    ).toEqual({ status: "blocked", reason: "stale_precondition" });
    expect(persist).not.toHaveBeenCalled();
  });

  it.each([
    {
      persistence: { status: "blocked", reason: "quota_exceeded" } as const,
      expected: { status: "blocked", reason: "quota_exceeded" } as const,
    },
    {
      persistence: {
        status: "indeterminate",
        reason: "storage_state_unknown",
      } as const,
      expected: {
        status: "indeterminate",
        reason: "storage_state_unknown",
      } as const,
    },
  ])("no publica un candidato no durable: $persistence.status", ({
    persistence,
    expected: expectedResult,
  }) => {
    const previous = appData();
    const current = previous;
    const result = commitAppDataDurably({
      expected: previous,
      getCurrent: () => current,
      build: (data) => ({
        data: { ...data, customers: [] },
        value: "candidate",
      }),
      persist: () => persistence,
    });

    expect(result).toEqual(expectedResult);
    expect(current).toBe(previous);
  });

  it.each([
    { status: "blocked", reason: "protected_existing_data" } as const,
    {
      status: "indeterminate",
      reason: "storage_state_unknown",
    } as const,
  ])(
    "no construye ni persiste con baseline durable $status",
    (invalidBaseline) => {
      const expected = appData();
      const build = vi.fn();
      const persist = vi.fn();

      expect(
        commitAppDataDurably({
          expected,
          storageBaseline: invalidBaseline,
          getCurrent: () => expected,
          build,
          persist,
        }),
      ).toEqual(invalidBaseline);
      expect(build).not.toHaveBeenCalled();
      expect(persist).not.toHaveBeenCalled();
    },
  );

  it("invalida el baseline cuando un guardado global no fue aplicado", () => {
    const data = appData();
    expect(
      durableStorageBaselineAfterSave(data, {
        status: "blocked",
        reason: "protected_existing_data",
      }),
    ).toEqual({ status: "blocked", reason: "protected_existing_data" });
    expect(
      durableStorageBaselineAfterSave(data, { status: "applied" }),
    ).toEqual({ status: "known", data });
  });

  it("hace idempotente el doble submit mediante la identidad esperada", () => {
    const expected = appData();
    let current = expected;
    const persist = vi.fn(() => ({ status: "applied" }) as const);
    const build = (previous: AppData) => ({
      data: {
        ...previous,
        recurringExpenses: [
          {
            ...fixedCommand().recurringExpense,
            id: "only-once",
            createdAt: NOW,
            updatedAt: NOW,
          },
        ],
      },
      value: "only-once",
    });

    const first = commitAppDataDurably({
      expected,
      getCurrent: () => current,
      build,
      persist,
    });
    expect(first.status).toBe("applied");
    if (first.status === "applied") current = first.data;

    expect(
      commitAppDataDurably({
        expected,
        getCurrent: () => current,
        build,
        persist,
      }),
    ).toEqual({ status: "blocked", reason: "stale_precondition" });
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("acepta memoria sincronizada contra su última base durable", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW));
    const store = new Map<string, string>();
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    });
    const recurring = {
      ...fixedCommand({ supplier: "none" }).recurringExpense,
      id: "overdue-template",
      startDate: "2026-07-01",
      dueTiming: { kind: "start_of_month" as const },
      createdAt: NOW,
      updatedAt: NOW,
    };
    expect(
      saveData({ ...appData(), recurringExpenses: [recurring] }),
    ).toEqual({ status: "applied" });
    const storageExpected = loadData();
    const expected = syncRecurringExpenses(storageExpected, "2026-07-12");
    expect(storageExpected.expenses).toHaveLength(0);
    expect(expected.expenses.length).toBeGreaterThan(0);

    const result = commitAppDataDurably({
      expected,
      storageBaseline: { status: "known", data: storageExpected },
      getCurrent: () => expected,
      build: (previous) => ({
        data: {
          ...previous,
          profile: { ...previous.profile, name: "Cambio tras sincronizar" },
        },
        value: "saved",
      }),
      persist: (candidate, durableBaseline) =>
        saveData(candidate, { expected: durableBaseline }),
    });

    expect(result.status).toBe("applied");
    expect(loadData().profile.name).toBe("Cambio tras sincronizar");
    expect(loadData().expenses).toEqual(expected.expenses);
  });

  it("recupera una referencia durable obsoleta solo tras comprobar el estado exacto", () => {
    const expected = appData();
    const staleBaseline = {
      ...expected,
      profile: { ...expected.profile, name: "Referencia anterior" },
    };
    const persist = vi.fn(() => ({ status: "applied" }) as const);
    const inspectPersisted = vi.fn(() => ({ status: "applied" }) as const);

    const result = commitAppDataDurablyWithStorageRecovery({
      expected,
      storageBaseline: { status: "known", data: staleBaseline },
      getCurrent: () => expected,
      build: (current) => ({
        data: {
          ...current,
          profile: { ...current.profile, name: "Guardado recuperado" },
        },
        value: "saved",
      }),
      persist: (candidate, storageExpected) => {
        if (storageExpected === staleBaseline) {
          return { status: "blocked", reason: "stale_precondition" };
        }
        expect(storageExpected).toBe(expected);
        expect(candidate.profile.name).toBe("Guardado recuperado");
        return persist();
      },
      inspectPersisted,
    });

    expect(result.status).toBe("applied");
    expect(inspectPersisted).toHaveBeenCalledWith(expected);
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("recupera un bloqueo durable anterior cuando el almacenamiento vuelve a coincidir", () => {
    const expected = appData();
    const build = vi.fn((current: AppData) => ({
      data: {
        ...current,
        profile: { ...current.profile, name: "Reintento seguro" },
      },
      value: "saved",
    }));
    const persist = vi.fn(() => ({ status: "applied" }) as const);

    const result = commitAppDataDurablyWithStorageRecovery({
      expected,
      storageBaseline: { status: "blocked", reason: "quota_exceeded" },
      getCurrent: () => expected,
      build,
      persist,
      inspectPersisted: () => ({ status: "applied" }),
    });

    expect(result.status).toBe("applied");
    expect(build).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("recupera un bloqueo anterior cuando solo cambió la cola de sincronización", () => {
    const lastKnown = appData();
    const expected = {
      ...lastKnown,
      meta: {
        ...lastKnown.meta,
        lastModified: "2026-07-12T08:30:00.000Z",
        pendingChanges: [
          {
            entityType: "profile" as const,
            entityId: "profile",
            deleted: false,
            payload: lastKnown.profile,
            updatedAt: "2026-07-12T08:30:00.000Z",
          },
        ],
      },
    };
    const persist = vi.fn(() => ({ status: "applied" }) as const);
    const inspectPersisted = vi.fn((candidate: AppData) =>
      candidate === lastKnown
        ? ({ status: "applied" } as const)
        : ({ status: "blocked", reason: "stale_precondition" } as const),
    );

    const result = commitAppDataDurablyWithStorageRecovery({
      expected,
      storageBaseline: { status: "blocked", reason: "write_failed" },
      lastKnownStorageBaseline: lastKnown,
      getCurrent: () => expected,
      build: (current) => ({
        data: {
          ...current,
          profile: { ...current.profile, name: "Guardado local" },
        },
        value: "saved",
      }),
      persist: (candidate, storageExpected) => {
        expect(storageExpected).toBe(lastKnown);
        expect(candidate.profile.name).toBe("Guardado local");
        return persist();
      },
      inspectPersisted,
    });

    expect(result.status).toBe("applied");
    expect(inspectPersisted).toHaveBeenNthCalledWith(1, expected);
    expect(inspectPersisted).toHaveBeenNthCalledWith(2, lastKnown);
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("recupera cambios de negocio legítimos en memoria si la última base durable sigue intacta", () => {
    const lastKnown = appData();
    const expected = {
      ...lastKnown,
      profile: {
        ...lastKnown.profile,
        name: "Cambio pendiente en memoria",
      },
    };
    const persist = vi.fn(() => ({ status: "applied" }) as const);
    const inspectPersisted = vi.fn((candidate: AppData) =>
      candidate === lastKnown
        ? ({ status: "applied" } as const)
        : ({ status: "blocked", reason: "stale_precondition" } as const),
    );

    const result = commitAppDataDurablyWithStorageRecovery({
      expected,
      storageBaseline: { status: "blocked", reason: "write_failed" },
      lastKnownStorageBaseline: lastKnown,
      getCurrent: () => expected,
      build: (current) => ({
        data: {
          ...current,
          products: [
            {
              id: "product-recovered",
              key: "producto-recuperado",
              name: "Producto recuperado",
              family: "prueba",
              pvp: 10,
              ivaPercent: 21,
              unit: "unidad",
              source: "manual",
              createdAt: NOW,
              updatedAt: NOW,
            },
          ],
        },
        value: "saved",
      }),
      persist: (candidate, storageExpected) => {
        expect(storageExpected).toBe(lastKnown);
        expect(candidate.profile.name).toBe("Cambio pendiente en memoria");
        return persist();
      },
      inspectPersisted,
    });

    expect(result.status).toBe("applied");
    expect(inspectPersisted).toHaveBeenNthCalledWith(1, expected);
    expect(inspectPersisted).toHaveBeenNthCalledWith(2, lastKnown);
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("no recupera contra la última base si el almacenamiento ya no coincide exactamente", () => {
    const lastKnown = appData();
    const expected = {
      ...lastKnown,
      profile: { ...lastKnown.profile, name: "Cambio en memoria" },
    };
    const persist = vi.fn();

    expect(
      commitAppDataDurablyWithStorageRecovery({
        expected,
        storageBaseline: { status: "blocked", reason: "write_failed" },
        lastKnownStorageBaseline: lastKnown,
        getCurrent: () => expected,
        build: (current) => ({ data: current, value: "blocked" }),
        persist,
        inspectPersisted: () => ({
          status: "blocked",
          reason: "stale_precondition",
        }),
      }),
    ).toEqual({ status: "blocked", reason: "write_failed" });
    expect(persist).not.toHaveBeenCalled();
  });

  it("recupera contra la lectura durable vigente cuando solo cambiaron metadatos", () => {
    const expected = {
      ...appData(),
      meta: {
        lastModified: "2026-07-12T08:45:00.000Z",
        pendingChanges: [
          {
            entityType: "profile" as const,
            entityId: "profile",
            deleted: false,
            payload: appData().profile,
            updatedAt: "2026-07-12T08:45:00.000Z",
          },
        ],
      },
    };
    const persisted = {
      ...expected,
      meta: {
        lastModified: "2026-07-12T08:46:00.000Z",
        pendingChanges: undefined,
      },
    };
    const persist = vi.fn(() => ({ status: "applied" }) as const);

    const result = commitAppDataDurablyWithStorageRecovery({
      expected,
      storageBaseline: { status: "blocked", reason: "write_failed" },
      getCurrent: () => expected,
      build: (current) => ({
        data: {
          ...current,
          profile: { ...current.profile, name: "Guardado tras sincronizar" },
        },
        value: "saved",
      }),
      persist: (candidate, storageExpected) => {
        expect(storageExpected).toBe(persisted);
        expect(candidate.profile.name).toBe("Guardado tras sincronizar");
        return persist();
      },
      inspectPersisted: () => ({
        status: "blocked",
        reason: "stale_precondition",
      }),
      readPersisted: () => persisted,
    });

    expect(result.status).toBe("applied");
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("no usa la lectura durable vigente cuando cambió un dato de negocio", () => {
    const expected = appData();
    const persisted = {
      ...expected,
      profile: { ...expected.profile, name: "Otro estado durable" },
    };
    const persist = vi.fn();

    expect(
      commitAppDataDurablyWithStorageRecovery({
        expected,
        storageBaseline: { status: "blocked", reason: "write_failed" },
        getCurrent: () => expected,
        build: (current) => ({ data: current, value: "blocked" }),
        persist,
        inspectPersisted: () => ({
          status: "blocked",
          reason: "stale_precondition",
        }),
        readPersisted: () => persisted,
      }),
    ).toEqual({ status: "blocked", reason: "write_failed" });
    expect(persist).not.toHaveBeenCalled();
  });

  it("recupera un bloqueo anterior cuando solo queda un expediente fiscal vacío", () => {
    const lastKnown = appData();
    const expected: AppData = {
      ...lastKnown,
      fiscalNotificationsWorkspace: emptyFiscalWorkspace(
        "user:00000000-0000-4000-8000-000000000701",
        "2026-07-12T08:31:00.000Z",
      ),
      meta: {
        ...lastKnown.meta,
        lastModified: "2026-07-12T08:31:00.000Z",
        pendingChanges: [
          {
            entityType: "fiscal_notifications_workspace",
            entityId: "fiscal-notifications-workspace-v2",
            deleted: false,
            payload: {},
            updatedAt: "2026-07-12T08:31:00.000Z",
          },
        ],
      },
    };
    const persist = vi.fn(() => ({ status: "applied" }) as const);
    const inspectPersisted = vi.fn((candidate: AppData) =>
      candidate === lastKnown
        ? ({ status: "applied" } as const)
        : ({ status: "blocked", reason: "stale_precondition" } as const),
    );

    const result = commitAppDataDurablyWithStorageRecovery({
      expected,
      storageBaseline: { status: "blocked", reason: "write_failed" },
      lastKnownStorageBaseline: lastKnown,
      getCurrent: () => expected,
      build: (current) => ({
        data: {
          ...current,
          profile: { ...current.profile, name: "Guardado tras borrar" },
        },
        value: "saved",
      }),
      persist: (candidate, storageExpected) => {
        expect(storageExpected).toBe(lastKnown);
        expect(candidate.profile.name).toBe("Guardado tras borrar");
        return persist();
      },
      inspectPersisted,
    });

    expect(result.status).toBe("applied");
    expect(inspectPersisted).toHaveBeenNthCalledWith(1, expected);
    expect(inspectPersisted).toHaveBeenNthCalledWith(2, lastKnown);
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("no usa la última referencia durable si el almacenamiento no confirma su contenido exacto", () => {
    const lastKnown = appData();
    const expected = {
      ...lastKnown,
      profile: { ...lastKnown.profile, name: "Cambio no persistido" },
    };
    const persist = vi.fn();
    const inspectPersisted = vi.fn(() => ({
      status: "blocked" as const,
      reason: "stale_precondition" as const,
    }));

    expect(
      commitAppDataDurablyWithStorageRecovery({
        expected,
        storageBaseline: { status: "blocked", reason: "write_failed" },
        lastKnownStorageBaseline: lastKnown,
        getCurrent: () => expected,
        build: (current) => ({ data: current, value: "blocked" }),
        persist,
        inspectPersisted,
      }),
    ).toEqual({ status: "blocked", reason: "write_failed" });
    expect(inspectPersisted).toHaveBeenNthCalledWith(1, expected);
    expect(inspectPersisted).toHaveBeenNthCalledWith(2, lastKnown);
    expect(persist).not.toHaveBeenCalled();
  });

  it("mantiene el bloqueo y no escribe cuando el estado durable diverge de verdad", () => {
    const expected = appData();
    const build = vi.fn();
    const persist = vi.fn();

    expect(
      commitAppDataDurablyWithStorageRecovery({
        expected,
        storageBaseline: { status: "blocked", reason: "write_failed" },
        getCurrent: () => expected,
        build,
        persist,
        inspectPersisted: () => ({
          status: "blocked",
          reason: "stale_precondition",
        }),
      }),
    ).toEqual({ status: "blocked", reason: "write_failed" });
    expect(build).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
  });

  it("no reintenta una transición inválida aunque el estado previo siga persistido", () => {
    const expected = appData();
    const inspectPersisted = vi.fn(() => ({ status: "applied" }) as const);
    const persist = vi.fn();

    expect(
      commitAppDataDurablyWithStorageRecovery({
        expected,
        storageBaseline: { status: "known", data: expected },
        getCurrent: () => expected,
        build: () => {
          throw new Error("invalid transition");
        },
        persist,
        inspectPersisted,
      }),
    ).toEqual({ status: "blocked", reason: "transition_failed" });
    expect(inspectPersisted).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
  });
});

describe("prepareFixedExpenseBundle", () => {
  it("crea proveedor, gasto fijo y recurrencia como un solo candidato", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    });
    const previous = appData();
    const command = fixedCommand({ operationId: "scan-inbox-atomic" });
    const prepared = prepareFixedExpenseBundle(previous, command, {
      now: NOW,
      referenceDate: "2026-07-12",
    });

    expect(prepared.status).toBe("ready");
    if (prepared.status !== "ready") return;
    expect(previous.suppliers).toHaveLength(0);
    expect(previous.expenses).toHaveLength(0);
    expect(previous.recurringExpenses).toHaveLength(0);
    expect(prepared.transition.data.suppliers).toHaveLength(1);
    expect(prepared.transition.data.recurringExpenses).toHaveLength(1);
    expect(prepared.transition.value.expense).toMatchObject({
      id: command.ids.expenseId,
      supplierId: command.ids.supplierId,
      recurringExpenseId: command.ids.recurringExpenseId,
    });
    expect(saveData(prepared.transition.data)).toEqual({ status: "applied" });
    const reloaded = loadData();
    expect(reloaded.suppliers.map((entry) => entry.id)).toContain(
      command.ids.supplierId,
    );
    expect(reloaded.expenses.map((entry) => entry.id)).toContain(
      command.ids.expenseId,
    );
    expect(reloaded.recurringExpenses.map((entry) => entry.id)).toContain(
      command.ids.recurringExpenseId,
    );
  });

  it("reutiliza un proveedor existente sin crear otro", () => {
    const previous: AppData = {
      ...appData(),
      suppliers: [
        {
          id: "supplier-existing",
          name: "Proveedor seguro",
          nif: "B12345678",
          createdAt: NOW,
        },
      ],
    };
    const prepared = prepareFixedExpenseBundle(
      previous,
      fixedCommand({ supplier: "existing" }),
      { now: NOW, referenceDate: "2026-07-12" },
    );

    expect(prepared.status).toBe("ready");
    if (prepared.status !== "ready") return;
    expect(prepared.transition.data.suppliers).toEqual(previous.suppliers);
    expect(prepared.transition.value.expense.supplierId).toBe(
      "supplier-existing",
    );
  });

  it.each(["monthly", "quarterly", "annual"] as const)(
    "persiste una regla %s y la conserva tras reload",
    (frequency) => {
      const store = new Map<string, string>();
      vi.stubGlobal("window", {});
      vi.stubGlobal("localStorage", {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
      });
      const command = fixedCommand({ frequency, supplier: "none" });
      const prepared = prepareFixedExpenseBundle(appData(), command, {
        now: NOW,
        referenceDate: "2026-07-12",
      });
      expect(prepared.status).toBe("ready");
      if (prepared.status !== "ready") return;

      expect(saveData(prepared.transition.data)).toEqual({ status: "applied" });
      const reloaded = loadData();
      expect(
        reloaded.recurringExpenses.find(
          (entry) => entry.id === command.ids.recurringExpenseId,
        )?.frequency,
      ).toBe(frequency);
      expect(
        reloaded.expenses.find((entry) => entry.id === command.ids.expenseId)
          ?.recurringExpenseId,
      ).toBe(command.ids.recurringExpenseId);
      expect(inspectFixedExpenseBundle(reloaded, "inbox-1").status).toBe(
        "applied",
      );
    },
  );

  it("mantiene IVA cero y no deducibilidad en el bundle no fiscal", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    });
    const command = fixedCommand({
      nonDeductible: true,
      supplier: "none",
    });
    const prepared = prepareFixedExpenseBundle(appData(), command, {
      now: NOW,
      referenceDate: "2026-07-12",
    });

    expect(prepared.status).toBe("ready");
    if (prepared.status !== "ready") return;
    expect(prepared.transition.value.expense).toMatchObject({
      ivaPercent: 0,
      deductibility: "non_deductible",
    });
    expect(prepared.transition.value.recurringExpense).toMatchObject({
      ivaPercent: 0,
      deductibility: "non_deductible",
    });
    expect(saveData(prepared.transition.data)).toEqual({ status: "applied" });
    const reloaded = loadData();
    expect(
      reloaded.expenses.find((expense) => expense.id === command.ids.expenseId),
    ).toMatchObject({ ivaPercent: 0, deductibility: "non_deductible" });
    expect(
      reloaded.recurringExpenses.find(
        (recurring) => recurring.id === command.ids.recurringExpenseId,
      ),
    ).toMatchObject({ ivaPercent: 0, deductibility: "non_deductible" });
    expect(
      inspectFixedExpenseBundle(
        reloaded,
        "inbox-1",
      ).status,
    ).toBe("applied");
  });

  it("reconoce una segunda ejecución exacta sin duplicar entidades", () => {
    const command = fixedCommand({ operationId: "same-inbox" });
    const first = prepareFixedExpenseBundle(appData(), command, {
      now: NOW,
      referenceDate: "2026-07-12",
    });
    expect(first.status).toBe("ready");
    if (first.status !== "ready") return;

    const replay = prepareFixedExpenseBundle(first.transition.data, command, {
      now: "2026-07-12T10:00:00.000Z",
      referenceDate: "2026-07-12",
    });
    expect(replay.status).toBe("already_applied");
    expect(first.transition.data.suppliers).toHaveLength(1);
    expect(first.transition.data.recurringExpenses).toHaveLength(1);
    expect(
      first.transition.data.expenses.filter(
        (expense) => expense.id === command.ids.expenseId,
      ),
    ).toHaveLength(1);
  });

  it("solo confirma replay cuando el bundle ya existe en la base durable", () => {
    const command = fixedCommand({ operationId: "durable-replay" });
    const previous = appData();
    const prepared = prepareFixedExpenseBundle(previous, command, {
      now: NOW,
      referenceDate: "2026-07-12",
    });
    expect(prepared.status).toBe("ready");
    if (prepared.status !== "ready") return;

    expect(
      durableBaselineContainsFixedExpenseBundle(previous, command, {
        now: NOW,
        referenceDate: "2026-07-12",
      }),
    ).toBe(false);
    expect(
      durableBaselineContainsFixedExpenseBundle(
        prepared.transition.data,
        command,
        { now: NOW, referenceDate: "2026-07-12" },
      ),
    ).toBe(true);
  });

  it("reconoce el replay después de commit y reload sin duplicar el bundle", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    });
    expect(saveData(appData())).toEqual({ status: "applied" });
    const previous = loadData();
    let current = previous;
    const command = fixedCommand({ operationId: "reload-replay" });
    const committed = commitAppDataDurably({
      expected: previous,
      getCurrent: () => current,
      build: (data) => {
        const prepared = prepareFixedExpenseBundle(data, command, {
          now: NOW,
          referenceDate: "2026-07-12",
        });
        if (prepared.status !== "ready") throw new Error("bundle_not_ready");
        return prepared.transition;
      },
      persist: (candidate) => saveData(candidate, { expected: previous }),
    });

    expect(committed.status).toBe("applied");
    if (committed.status !== "applied") return;
    current = committed.data;
    const reloaded = loadData();
    const replay = prepareFixedExpenseBundle(reloaded, command, {
      now: "2026-07-12T10:00:00.000Z",
      referenceDate: "2026-07-12",
    });

    expect(replay.status).toBe("already_applied");
    expect(
      reloaded.suppliers.filter((entry) => entry.id === command.ids.supplierId),
    ).toHaveLength(1);
    expect(
      reloaded.expenses.filter((entry) => entry.id === command.ids.expenseId),
    ).toHaveLength(1);
    expect(
      reloaded.recurringExpenses.filter(
        (entry) => entry.id === command.ids.recurringExpenseId,
      ),
    ).toHaveLength(1);
    expect(reloaded.meta?.pendingChanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityType: "supplier",
          entityId: command.ids.supplierId,
        }),
        expect.objectContaining({
          entityType: "expense",
          entityId: command.ids.expenseId,
        }),
        expect.objectContaining({
          entityType: "recurring_expense",
          entityId: command.ids.recurringExpenseId,
        }),
      ]),
    );
  });

  it("reconoce el replay de un resumen completado aunque conserve su ID previo", () => {
    const command = fixedCommand({
      operationId: "provider-summary",
      supplier: "none",
    });
    const original = {
      ...command.expense,
      id: "provider-summary-expense",
      createdAt: "2026-06-01T08:00:00.000Z",
      providerSummary: {
        status: "completed_with_original" as const,
        summaryId: "summary-1",
        importedAt: "2026-06-01T08:00:00.000Z",
        completedAt: NOW,
      },
    };
    const previous: AppData = { ...appData(), expenses: [original] };
    const first = prepareFixedExpenseBundle(
      previous,
      { ...command, expense: original },
      { now: NOW, referenceDate: "2026-07-12" },
    );
    expect(first.status).toBe("ready");
    if (first.status !== "ready") return;

    const replay = prepareFixedExpenseBundle(first.transition.data, command, {
      now: "2026-07-12T10:00:00.000Z",
      referenceDate: "2026-07-12",
    });
    expect(replay.status).toBe("already_applied");
    if (replay.status === "already_applied") {
      expect(replay.value.expense.id).toBe("provider-summary-expense");
    }
  });

  it("bloquea una colisión de identificador con contenido distinto", () => {
    const command = fixedCommand({ operationId: "collision" });
    const first = prepareFixedExpenseBundle(appData(), command, {
      now: NOW,
      referenceDate: "2026-07-12",
    });
    expect(first.status).toBe("ready");
    if (first.status !== "ready") return;

    expect(
      prepareFixedExpenseBundle(
        first.transition.data,
        {
          ...command,
          recurringExpense: {
            ...command.recurringExpense,
            amount: 999,
          },
        },
        { now: NOW, referenceDate: "2026-07-12" },
      ),
    ).toEqual({ status: "blocked", reason: "identifier_collision" });
  });

  it("bloquea un Expense objetivo duplicado antes de construir el candidato", () => {
    const command = fixedCommand({
      operationId: "duplicate-target",
      supplier: "none",
    });
    const target = {
      ...command.expense,
      id: "expense-existing",
      createdAt: NOW,
    };
    const previous: AppData = {
      ...appData(),
      expenses: [target, { ...target }],
    };

    expect(
      prepareFixedExpenseBundle(
        previous,
        { ...command, expense: target },
        { now: NOW, referenceDate: "2026-07-12" },
      ),
    ).toEqual({ status: "blocked", reason: "identifier_collision" });
  });

  it("clasifica como ambiguo un bundle incompleto o con IDs duplicados", () => {
    const operationId = "ambiguous-inbox";
    const ids = fixedExpenseBundleIds(operationId);
    const command = fixedCommand({ operationId, supplier: "none" });
    const prepared = prepareFixedExpenseBundle(appData(), command, {
      now: NOW,
      referenceDate: "2026-07-12",
    });
    expect(prepared.status).toBe("ready");
    if (prepared.status !== "ready") return;

    expect(
      inspectFixedExpenseBundle(
        {
          ...prepared.transition.data,
          expenses: prepared.transition.data.expenses.filter(
            (expense) => expense.id !== ids.expenseId,
          ),
        },
        operationId,
      ),
    ).toEqual({ status: "ambiguous" });
    expect(
      inspectFixedExpenseBundle(
        {
          ...prepared.transition.data,
          recurringExpenses: [
            ...prepared.transition.data.recurringExpenses,
            prepared.transition.value.recurringExpense,
          ],
        },
        operationId,
      ),
    ).toEqual({ status: "ambiguous" });
    expect(
      inspectFixedExpenseBundle(
        {
          ...prepared.transition.data,
          expenses: [
            ...prepared.transition.data.expenses,
            { ...prepared.transition.value.expense },
          ],
        },
        operationId,
      ),
    ).toEqual({ status: "ambiguous" });
  });

  it.each([
    {
      label: "tipo operativo distinto",
      mutate: (expense: AppData["expenses"][number]) => ({
        ...expense,
        businessKind: "purchase_invoice" as const,
      }),
    },
    {
      label: "clave de ocurrencia ausente",
      mutate: (expense: AppData["expenses"][number]) => ({
        ...expense,
        recurringOccurrenceKey: undefined,
      }),
    },
    {
      label: "clave de ocurrencia con fecha imposible",
      mutate: (expense: AppData["expenses"][number]) => ({
        ...expense,
        recurringOccurrenceKey: `${expense.recurringExpenseId}:2026-02-31`,
      }),
    },
    {
      label: "clave de otra recurrencia",
      mutate: (expense: AppData["expenses"][number]) => ({
        ...expense,
        recurringOccurrenceKey: "otra-regla:2026-07-12",
      }),
    },
  ])("falla cerrado ante provenance manipulada: $label", ({ mutate }) => {
    const operationId = "tampered-provenance";
    const command = fixedCommand({ operationId, supplier: "none" });
    const prepared = prepareFixedExpenseBundle(appData(), command, {
      now: NOW,
      referenceDate: "2026-07-12",
    });
    expect(prepared.status).toBe("ready");
    if (prepared.status !== "ready") return;
    const tampered: AppData = {
      ...prepared.transition.data,
      expenses: prepared.transition.data.expenses.map((expense) =>
        expense.id === prepared.transition.value.expense.id
          ? mutate(expense)
          : expense,
      ),
    };

    expect(inspectFixedExpenseBundle(tampered, operationId)).toEqual({
      status: "ambiguous",
    });
    expect(
      prepareFixedExpenseBundle(tampered, command, {
        now: "2026-07-12T10:00:00.000Z",
        referenceDate: "2026-07-12",
      }),
    ).toEqual({ status: "blocked", reason: "identifier_collision" });
  });

  it("no altera documentos emitidos, snapshots, sellos, hashes ni cadena VeriFactu", () => {
    const demo = createDemoWorkspaceData();
    const invoice = demo.documents.find(
      (document) => document.type === "factura",
    )!;
    const protectedInvoice = {
      ...invoice,
      verifactu: {
        recordHash: "A".repeat(64),
        previousHash: "B".repeat(64),
        recordTimestamp: "2026-07-12T09:00:00+02:00",
        qrUrl: "https://prewww2.aeat.es/verifactu-demo",
        status: "test_registered" as const,
        recordType: "alta" as const,
        environment: "test" as const,
        submittedAt: NOW,
      },
      verifactuPersistence: "server_confirmed" as const,
    };
    const protectedReminder = {
      id: "office-reminder-protected",
      text: "Revisión de oficina",
      link: { kind: "none" as const },
      target: "office" as const,
      origin: "office" as const,
      completed: false,
      createdAt: NOW,
      updatedAt: NOW,
    };
    const protectedPendingChange = {
      entityType: "user_reminder" as const,
      entityId: protectedReminder.id,
      deleted: false,
      payload: protectedReminder,
      updatedAt: NOW,
    };
    const previous: AppData = {
      ...demo,
      profile: {
        ...demo.profile,
        verifactu: { enabled: true, environment: "test" },
      },
      documents: demo.documents.map((document) =>
        document.id === invoice.id ? protectedInvoice : document,
      ),
      userReminders: [...demo.userReminders, protectedReminder],
      meta: {
        lastModified: NOW,
        pendingChanges: [protectedPendingChange],
      },
      verifactuChain: {
        issuerNif: demo.profile.nif,
        lastHash: protectedInvoice.verifactu.recordHash,
        lastNumSerie: protectedInvoice.number,
        lastFechaExpedicion: protectedInvoice.date,
        recordCount: 1,
      },
    };
    const protectedBefore = structuredClone({
      documents: previous.documents,
      verifactuChain: previous.verifactuChain,
      snapshotIntegrityVersion: previous.snapshotIntegrityVersion,
      userReminders: previous.userReminders,
    });
    const prepared = prepareFixedExpenseBundle(
      previous,
      fixedCommand({ operationId: "integrity", supplier: "none" }),
      { now: NOW, referenceDate: "2026-07-12" },
    );

    expect(prepared.status).toBe("ready");
    if (prepared.status !== "ready") return;
    const committed = commitAppDataDurably({
      expected: previous,
      getCurrent: () => previous,
      build: () => prepared.transition,
      persist: () => ({ status: "applied" }),
    });
    expect(committed.status).toBe("applied");
    if (committed.status !== "applied") return;
    expect({
      documents: committed.data.documents,
      verifactuChain: committed.data.verifactuChain,
      snapshotIntegrityVersion: committed.data.snapshotIntegrityVersion,
      userReminders: committed.data.userReminders,
    }).toEqual(protectedBefore);
    expect(committed.data.meta?.pendingChanges).toContainEqual(
      protectedPendingChange,
    );
    expect(
      committed.data.meta?.pendingChanges?.some(
        (change) => change.entityType === "document",
      ),
    ).toBe(false);
  });
});
