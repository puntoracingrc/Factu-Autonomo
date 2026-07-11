import { describe, expect, it } from "vitest";
import {
  appDataFromSyncRows,
  buildRestoreChanges,
  buildRestoreChangesFromRows,
  summarizeRestoreData,
  summarizeRestoreDiff,
  type AdminSyncEntityRow,
} from "./user-restore";
import { issueDocument } from "../document-integrity";
import {
  EMPTY_DATA,
  type AppData,
  type Customer,
  type Document,
} from "../types";

function customer(id: string, name: string): Customer {
  return {
    id,
    firstName: name,
    lastName: "",
    name,
    createdAt: "2026-07-01T10:00:00.000Z",
    updatedAt: "2026-07-01T10:00:00.000Z",
  };
}

function dataWithCustomers(customers: Customer[]): AppData {
  return {
    ...EMPTY_DATA,
    customers,
    profile: EMPTY_DATA.profile,
    counters: EMPTY_DATA.counters,
  };
}

describe("admin user restore", () => {
  it("restaura explícitamente el metadato de versión desde sync_entities", () => {
    const restored = appDataFromSyncRows([
      {
        entity_type: "workspace_metadata",
        entity_id: "snapshot_integrity_version",
        payload: { snapshotIntegrityVersion: 1 },
        deleted: false,
        updated_at: "2026-07-11T10:00:00.000Z",
      },
    ]);

    expect(restored.snapshotIntegrityVersion).toBe(1);
    expect(restored.meta?.pendingChanges).toBeUndefined();
  });

  it("reconstruye el estado activo desde sync_entities sin revivir tombstones", () => {
    const rows: AdminSyncEntityRow[] = [
      {
        entity_type: "customer",
        entity_id: "customer-1",
        payload: customer("customer-1", "Ana"),
        deleted: false,
        updated_at: "2026-07-01T10:00:00.000Z",
      },
      {
        entity_type: "customer",
        entity_id: "customer-2",
        payload: null,
        deleted: true,
        updated_at: "2026-07-02T10:00:00.000Z",
      },
    ];

    const restored = appDataFromSyncRows(rows);
    const summary = summarizeRestoreData(restored, rows);

    expect(restored.customers).toHaveLength(1);
    expect(restored.customers[0]).toMatchObject(customer("customer-1", "Ana"));
    expect(summary).toMatchObject({
      customers: 1,
      deletedEntities: 1,
      totalRows: 2,
      latestSyncAt: "2026-07-02T10:00:00.000Z",
    });
  });

  it("resume altas cambios y borrados antes de restaurar", () => {
    const current = dataWithCustomers([
      customer("customer-1", "Ana"),
      customer("customer-3", "Pedro"),
    ]);
    const target = dataWithCustomers([
      customer("customer-1", "Ana actualizada"),
      customer("customer-2", "Lucia"),
    ]);

    const diff = summarizeRestoreDiff(current, target);

    expect(diff).toMatchObject({
      added: 1,
      updated: 1,
      deleted: 1,
      totalChanges: 3,
    });
    expect(diff.byType.customer).toEqual({
      added: 1,
      updated: 1,
      deleted: 1,
    });
  });

  it("ignora diferencias que solo vienen del orden interno del JSON", () => {
    const currentCustomer = {
      id: "customer-1",
      firstName: "Ana",
      lastName: "",
      name: "Ana",
      createdAt: "2026-07-01T10:00:00.000Z",
      updatedAt: "2026-07-01T10:00:00.000Z",
      metadata: {
        b: 2,
        a: 1,
      },
    } as unknown as Customer;
    const targetCustomer = {
      metadata: {
        a: 1,
        b: 2,
      },
      updatedAt: "2026-07-01T10:00:00.000Z",
      createdAt: "2026-07-01T10:00:00.000Z",
      name: "Ana",
      lastName: "",
      firstName: "Ana",
      id: "customer-1",
    } as unknown as Customer;

    const diff = summarizeRestoreDiff(
      dataWithCustomers([currentCustomer]),
      dataWithCustomers([targetCustomer]),
    );
    const changes = buildRestoreChanges(
      dataWithCustomers([currentCustomer]),
      dataWithCustomers([targetCustomer]),
    );

    expect(diff.totalChanges).toBe(0);
    expect(changes).toEqual([]);
  });

  it("genera cambios con marca nueva para que los dispositivos reciban la restauracion", () => {
    const current = dataWithCustomers([
      customer("customer-1", "Ana"),
      customer("customer-3", "Pedro"),
    ]);
    const target = dataWithCustomers([
      customer("customer-1", "Ana actualizada"),
      customer("customer-2", "Lucia"),
    ]);

    const changes = buildRestoreChanges(
      current,
      target,
      "2026-07-09T08:00:00.000Z",
    );

    expect(changes).toHaveLength(3);
    expect(changes.every((change) => change.updatedAt === "2026-07-09T08:00:00.000Z")).toBe(
      true,
    );
    expect(changes).toContainEqual(
      expect.objectContaining({
        entityType: "customer",
        entityId: "customer-3",
        deleted: true,
      }),
    );
  });

  it("compara contra filas reales y despliega sellos y marcador ausentes", () => {
    const issued = issueDocument(
      {
        id: "legacy-admin-invoice",
        type: "factura",
        number: "F-2026-0001",
        date: "2026-06-30",
        client: { name: "Cliente" },
        items: [
          {
            id: "line-1",
            description: "Servicio",
            quantity: 1,
            unitPrice: 100,
            ivaPercent: 21,
          },
        ],
        status: "borrador",
        createdAt: "2026-06-30T10:00:00.000Z",
        updatedAt: "2026-06-30T10:00:00.000Z",
      },
      EMPTY_DATA.profile,
      "2026-06-30T10:00:00.000Z",
    );
    const legacy: Document = {
      ...issued,
      snapshotSeal: undefined,
      snapshotIntegrityRequired: undefined,
    };
    const rows: AdminSyncEntityRow[] = [
      {
        entity_type: "document",
        entity_id: legacy.id,
        payload: legacy,
        deleted: false,
        updated_at: "2026-07-01T10:00:00.000Z",
      },
    ];
    const target = appDataFromSyncRows(rows);

    const changes = buildRestoreChangesFromRows(
      rows,
      target,
      "2026-07-11T12:00:00.000Z",
    );

    expect(target.documents[0].snapshotSeal).toBeDefined();
    expect(
      changes.map((change) => `${change.entityType}:${change.entityId}`),
    ).toEqual([
      `document:${legacy.id}`,
      "profile:profile",
      "counters:counters",
      "workspace_metadata:snapshot_integrity_version",
    ]);
  });
});
