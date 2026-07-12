import { describe, expect, it } from "vitest";
import {
  applySyncChanges,
  appDataToSyncChanges,
  diffAppData,
  emptyCloudBootstrapData,
  snapshotIntegrityMetadataChange,
} from "./diff";
import { EMPTY_DATA } from "../types";
import type {
  AppData,
  Customer,
  RecurringExpense,
  SyncChange,
} from "../types";
import {
  deleteExpenseFromData,
  saveFixedExpenseWithRecurringTemplateToData,
  syncRecurringExpenses,
} from "../recurring-expenses";
import { mergeRemoteOntoLocal, trackDataDiff } from "./incremental";
import { buildCloudUploadChanges } from "./sync-queue";

function customer(id: string, name: string): Customer {
  const [firstName, ...rest] = name.split(" ");
  return {
    id,
    firstName,
    lastName: rest.join(" "),
    name,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("sync por cambios", () => {
  it("detecta solo el cliente añadido", () => {
    const prev = EMPTY_DATA;
    const next = {
      ...EMPTY_DATA,
      customers: [customer("c1", "Ana López")],
    };

    const changes = diffAppData(prev, next);
    expect(changes).toHaveLength(1);
    expect(changes[0].entityType).toBe("customer");
    expect(changes[0].entityId).toBe("c1");
  });

  it("conserva en cola el proveedor y el gasto añadidos en dos transiciones", () => {
    const supplier = {
      id: "supplier-batch",
      name: "Proveedor del lote",
      nif: "B12345678",
      createdAt: "2026-07-12T03:00:00.000Z",
    };
    const afterSupplier = trackDataDiff(EMPTY_DATA, {
      ...EMPTY_DATA,
      suppliers: [supplier],
    });
    const afterExpense = trackDataDiff(afterSupplier, {
      ...afterSupplier,
      expenses: [
        {
          id: "expense-batch",
          date: "2026-07-12",
          supplierId: supplier.id,
          supplierName: supplier.name,
          description: "Factura del lote",
          amount: 100,
          ivaPercent: 21,
          category: "Material",
          paymentMethod: "Transferencia",
          createdAt: "2026-07-12T03:00:00.000Z",
        },
      ],
    });

    expect(
      afterExpense.meta?.pendingChanges
        ?.map((change) => `${change.entityType}:${change.entityId}`)
        .sort(),
    ).toEqual([
      "expense:expense-batch",
      "supplier:supplier-batch",
    ]);
  });

  it("encola juntos el gasto fijo escaneado y su regla recurrente", () => {
    const ids = ["fixed-template", "fixed-expense"];
    const saved = saveFixedExpenseWithRecurringTemplateToData(
      EMPTY_DATA,
      {
        date: "2026-07-11",
        origin: "scan",
        businessKind: "fixed",
        supplierName: "Google Commerce Limited",
        description: "Suscripción mensual de streaming",
        amount: 13.21,
        ivaPercent: 21,
        category: "Suscripciones",
        paymentMethod: "Tarjeta",
      },
      {
        supplierName: "Google Commerce Limited",
        description: "Suscripción mensual de streaming",
        amount: 13.21,
        ivaPercent: 21,
        category: "Suscripciones",
        paymentMethod: "Tarjeta",
        frequency: "monthly",
        dueTiming: { kind: "end_of_month" },
        duration: { kind: "indefinite" },
        startDate: "2026-07-11",
        enabled: true,
      },
      {
        now: "2026-07-11T20:05:00.000Z",
        newId: () => ids.shift() ?? "unexpected-id",
        referenceDate: "2026-07-31",
      },
    );

    const changes = diffAppData(EMPTY_DATA, saved.data);
    expect(
      changes.map((change) => `${change.entityType}:${change.entityId}`).sort(),
    ).toEqual([
      "expense:fixed-expense",
      "recurring_expense:fixed-template",
    ]);

    const reloaded = applySyncChanges(EMPTY_DATA, changes);
    expect(reloaded.expenses[0]?.recurringExpenseId).toBe("fixed-template");
    expect(reloaded.recurringExpenses[0]?.id).toBe("fixed-template");
  });

  it("conserva la evidencia anidada de recargo en el diff cloud", () => {
    const expense = {
      id: "expense-re",
      date: "2026-04-01",
      supplierName: "Proveedor Recargo SL",
      description: "Compra con recargo",
      amount: 100,
      ivaPercent: 21,
      category: "Material",
      paymentMethod: "Tarjeta",
      providerSummary: {
        status: "pending_original" as const,
        summaryId: "summary-re",
        importedAt: "2026-07-11T10:00:00.000Z",
        summaryInvoiceTotal: 126.2,
        summaryIvaPercent: 21,
        summaryIvaAmount: 21,
        summaryRecargoPercent: 5.2,
        summaryRecargoAmount: 5.2,
      },
      createdAt: "2026-07-11T10:00:00.000Z",
    };
    const changes = diffAppData(EMPTY_DATA, {
      ...EMPTY_DATA,
      expenses: [expense],
    });
    const reloaded = applySyncChanges(EMPTY_DATA, changes);

    expect(reloaded.expenses[0]?.providerSummary).toEqual(
      expense.providerSummary,
    );
  });

  it("sincroniza una reparación reversible cambiando solo la entidad expense", () => {
    const beforeAllocation = {
      workDocumentId: "doc-work",
      amount: 100,
      includedLineIds: ["line-1"],
      allocatedAt: "2026-07-11T10:00:00.000Z",
    };
    const afterAllocation = {
      ...beforeAllocation,
      amount: 126.2,
      fullAmountAtAllocation: 126.2,
    };
    const baselineExpense = {
      id: "expense-repair",
      date: "2026-04-01",
      supplierName: "Proveedor Recargo SL",
      description: "Compra repartida",
      amount: 100,
      ivaPercent: 21,
      category: "Material",
      paymentMethod: "Tarjeta",
      workDocumentId: "doc-work",
      workAllocations: [beforeAllocation],
      createdAt: "2026-07-11T09:00:00.000Z",
    };
    const baseline: AppData = {
      ...EMPTY_DATA,
      documents: [
        {
          id: "doc-work",
          type: "factura",
          number: "F-2026-0001",
          date: "2026-07-10",
          client: { name: "Cliente" },
          items: [],
          status: "borrador",
          createdAt: "2026-07-10T10:00:00.000Z",
          updatedAt: "2026-07-10T10:00:00.000Z",
        },
      ],
      expenses: [baselineExpense],
    };
    const repaired: AppData = {
      ...baseline,
      expenses: [
        {
          ...baselineExpense,
          workAllocations: [afterAllocation],
          workAllocationCostRepair: {
            schemaVersion: 1,
            kind: "provider_summary_equivalence_surcharge_v1",
            repairId: "aud-p2-26-work-allocation:expense-repair:v1",
            status: "applied",
            legacyOperatingCost: 100,
            canonicalOperatingCost: 126.2,
            beforeFingerprint: "before",
            afterFingerprint: "after",
            beforeAllocations: [beforeAllocation],
            afterAllocations: [afterAllocation],
            events: [
              { action: "applied", at: "2026-07-12T02:00:00.000Z" },
            ],
          },
        },
      ],
    };

    const changes = diffAppData(baseline, repaired);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      entityType: "expense",
      entityId: "expense-repair",
      deleted: false,
    });

    const reloaded = applySyncChanges(baseline, changes);
    expect(reloaded.documents).toEqual(baseline.documents);
    expect(reloaded.expenses[0]).toEqual(repaired.expenses[0]);
  });

  it("aplica un cambio remoto sin tocar el resto", () => {
    const local = {
      ...EMPTY_DATA,
      customers: [customer("c1", "Ana López")],
    };
    const remote = [
      {
        entityType: "customer" as const,
        entityId: "c2",
        deleted: false,
        payload: customer("c2", "Luis Pérez"),
        updatedAt: "2026-06-10T12:00:00.000Z",
      },
    ];

    const merged = applySyncChanges(local, remote);
    expect(merged.customers).toHaveLength(2);
  });

  it("sincroniza el marcador de integridad como metadato monotónico", () => {
    const legacy = {
      ...EMPTY_DATA,
      snapshotIntegrityVersion: undefined,
    };
    const versioned = { ...legacy, snapshotIntegrityVersion: 1 as const };

    expect(diffAppData(legacy, versioned)).toEqual([
      expect.objectContaining({
        entityType: "workspace_metadata",
        entityId: "snapshot_integrity_version",
        deleted: false,
        payload: { snapshotIntegrityVersion: 1 },
      }),
    ]);
    expect(diffAppData(versioned, legacy)).toEqual([]);
    expect(
      appDataToSyncChanges(versioned).at(-1),
    ).toMatchObject({
      entityType: "workspace_metadata",
      entityId: "snapshot_integrity_version",
      payload: { snapshotIntegrityVersion: 1 },
    });

    const applied = applySyncChanges(legacy, [
      snapshotIntegrityMetadataChange("2026-07-11T12:00:00.000Z"),
    ]);
    expect(applied.snapshotIntegrityVersion).toBe(1);

    const tombstoneIgnored = applySyncChanges(applied, [
      {
        ...snapshotIntegrityMetadataChange("2026-07-11T13:00:00.000Z"),
        deleted: true,
        payload: undefined,
      },
    ]);
    expect(tombstoneIgnored.snapshotIntegrityVersion).toBe(1);
    expect(emptyCloudBootstrapData().snapshotIntegrityVersion).toBeUndefined();
  });

  it("sincroniza juntos el borrado del cargo y su exclusión persistente", () => {
    const recurring: RecurringExpense = {
      id: "recurring-cloud",
      supplierName: "Proveedor cloud",
      description: "Servicio mensual",
      amount: 50,
      ivaPercent: 21,
      category: "Servicios",
      paymentMethod: "Domiciliación",
      frequency: "monthly",
      dueTiming: { kind: "end_of_month" },
      duration: { kind: "indefinite" },
      startDate: "2026-01-01",
      enabled: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const before = syncRecurringExpenses(
      { ...EMPTY_DATA, recurringExpenses: [recurring] },
      "2026-01-31",
    );
    const after = deleteExpenseFromData(
      before,
      before.expenses[0]!.id,
      "2026-02-01T00:00:00.000Z",
    );

    const changes = diffAppData(before, after);
    expect(
      changes.map((change) => ({
        type: change.entityType,
        deleted: change.deleted,
      })),
    ).toEqual([
      { type: "expense", deleted: true },
      { type: "recurring_expense", deleted: false },
      { type: "recurring_occurrence_exclusion", deleted: false },
    ]);

    const downloaded = applySyncChanges(before, changes);
    const reloaded = syncRecurringExpenses(downloaded, "2026-01-31");
    expect(reloaded.expenses).toEqual([]);
    expect(
      reloaded.recurringExpenses[0]?.occurrenceExclusions?.[0]?.key,
    ).toBe("recurring-cloud:2026-01-31");
  });

  it("conserva el tombstone ante un segundo dispositivo con plantilla obsoleta", () => {
    const recurring: RecurringExpense = {
      id: "recurring-two-devices",
      supplierName: "Proveedor cloud",
      description: "Servicio mensual",
      amount: 50,
      ivaPercent: 21,
      category: "Servicios",
      paymentMethod: "Domiciliación",
      frequency: "monthly",
      dueTiming: { kind: "end_of_month" },
      duration: { kind: "indefinite" },
      startDate: "2026-01-01",
      enabled: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const shared = syncRecurringExpenses(
      { ...EMPTY_DATA, recurringExpenses: [recurring] },
      "2026-01-31",
    );

    const deviceA = deleteExpenseFromData(
      shared,
      shared.expenses[0]!.id,
      "2026-02-01T10:00:00.000Z",
    );
    const changesFromA = diffAppData(shared, deviceA).map((change) => ({
      ...change,
      updatedAt:
        change.entityType === "recurring_occurrence_exclusion"
          ? change.updatedAt
          : "2026-02-01T10:00:00.000Z",
    }));

    const staleTemplate = {
      ...recurring,
      enabled: false,
      updatedAt: "2026-02-02T10:00:00.000Z",
    };
    const deviceB: AppData = {
      ...shared,
      recurringExpenses: [staleTemplate],
      meta: {
        lastModified: "2026-02-02T10:00:00.000Z",
        lastSyncedAt: "2026-01-31T10:00:00.000Z",
        pendingChanges: [
          {
            entityType: "recurring_expense",
            entityId: recurring.id,
            deleted: false,
            payload: staleTemplate,
            updatedAt: "2026-02-02T10:00:00.000Z",
          },
        ],
      },
    };

    const reconciledB = mergeRemoteOntoLocal(deviceB, changesFromA).data;
    expect(reconciledB.expenses).toEqual([]);
    expect(reconciledB.recurringExpenses[0]).toMatchObject({
      enabled: false,
      occurrenceExclusions: [
        {
          key: "recurring-two-devices:2026-01-31",
          excludedAt: "2026-02-01T10:00:00.000Z",
        },
      ],
    });

    const outgoingFromB = buildCloudUploadChanges(reconciledB);
    const staleOutgoingTemplate = outgoingFromB.find(
      (change) => change.entityType === "recurring_expense",
    )?.payload as RecurringExpense;
    expect(staleOutgoingTemplate.occurrenceExclusions).toHaveLength(1);
    expect(
      outgoingFromB.some(
        (change) =>
          change.entityType === "recurring_occurrence_exclusion" &&
          change.entityId === "recurring-two-devices:2026-01-31",
      ),
    ).toBe(true);

    // Reproduce el LWW real: B pisa el payload de plantilla de A, pero la fila
    // estable de exclusión sobrevive por tener otra clave de entidad.
    const serverRows = new Map<string, SyncChange>();
    for (const change of changesFromA) {
      serverRows.set(`${change.entityType}:${change.entityId}`, change);
    }
    serverRows.set(`recurring_expense:${recurring.id}`, {
      entityType: "recurring_expense",
      entityId: recurring.id,
      deleted: false,
      payload: staleTemplate,
      updatedAt: "2026-02-02T10:00:00.000Z",
    });

    const freshDevice = applySyncChanges(EMPTY_DATA, [...serverRows.values()]);
    const afterReload = syncRecurringExpenses(freshDevice, "2026-01-31");
    expect(afterReload.expenses).toEqual([]);
    expect(
      afterReload.recurringExpenses[0]?.occurrenceExclusions?.[0]?.key,
    ).toBe("recurring-two-devices:2026-01-31");
  });
});
