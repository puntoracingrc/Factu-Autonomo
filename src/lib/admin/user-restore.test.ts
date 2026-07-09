import { describe, expect, it } from "vitest";
import {
  appDataFromSyncRows,
  buildRestoreChanges,
  summarizeRestoreData,
  summarizeRestoreDiff,
  type AdminSyncEntityRow,
} from "./user-restore";
import { EMPTY_DATA, type AppData, type Customer } from "../types";

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
});
