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
  syncRecurringExpenses,
} from "../recurring-expenses";
import { mergeRemoteOntoLocal } from "./incremental";
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
