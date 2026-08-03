import { describe, expect, it } from "vitest";

import { EMPTY_DATA, type SyncChange } from "@/lib/types";

import {
  buildCentralAdoptionLegacyQueueRetirement,
  centralAdoptionLegacyQueueSignature,
} from "./legacy-queue-retirement";

const pendingChanges: SyncChange[] = [
  {
    entityType: "customer",
    entityId: "customer-1",
    deleted: false,
    payload: { id: "customer-1" },
    updatedAt: "2026-08-03T12:00:00.000Z",
  },
  {
    entityType: "document",
    entityId: "invoice-1",
    deleted: false,
    payload: { id: "invoice-1", type: "factura" },
    updatedAt: "2026-08-03T12:01:00.000Z",
  },
];

describe("retirada de la cola legacy tras adoptar central", () => {
  it("retira solo la cola esperada y conserva el dominio local", () => {
    const data = {
      ...EMPTY_DATA,
      customers: [{ id: "customer-1" }] as never,
      meta: {
        lastModified: "2026-08-03T12:02:00.000Z",
        lastSyncedAt: "2026-08-03T12:03:00.000Z",
        pendingChanges,
      },
    };

    const result = buildCentralAdoptionLegacyQueueRetirement({
      data,
      expectedPendingChangeCount: pendingChanges.length,
      expectedPendingChangesSignature:
        centralAdoptionLegacyQueueSignature(pendingChanges),
    });

    expect(result.value).toEqual({
      schema: "CENTRAL_ADOPTION_LEGACY_QUEUE_RETIREMENT_V1",
      discarded: 2,
    });
    expect(result.data.meta).toEqual({
      lastModified: "2026-08-03T12:02:00.000Z",
      lastSyncedAt: "2026-08-03T12:03:00.000Z",
    });
    expect(result.data.customers).toBe(data.customers);
    expect(result.data.documents).toBe(data.documents);
    expect(result.data.profile).toBe(data.profile);
  });

  it("conserva la cola si el recuento ya no coincide", () => {
    const data = {
      ...EMPTY_DATA,
      meta: {
        lastModified: "2026-08-03T12:02:00.000Z",
        pendingChanges,
      },
    };

    expect(() =>
      buildCentralAdoptionLegacyQueueRetirement({
        data,
        expectedPendingChangeCount: 1,
        expectedPendingChangesSignature:
          centralAdoptionLegacyQueueSignature(pendingChanges),
      }),
    ).toThrow("se conserva intacta");
    expect(data.meta.pendingChanges).toEqual(pendingChanges);
  });

  it("no convierte una cola vacia en una adopcion confirmada", () => {
    expect(() =>
      buildCentralAdoptionLegacyQueueRetirement({
        data: EMPTY_DATA,
        expectedPendingChangeCount: 0,
        expectedPendingChangesSignature:
          centralAdoptionLegacyQueueSignature([]),
      }),
    ).toThrow("se conserva intacta");
  });

  it("conserva la cola si cambia su contenido aunque mantenga el recuento", () => {
    const data = {
      ...EMPTY_DATA,
      meta: {
        lastModified: "2026-08-03T12:02:00.000Z",
        pendingChanges: [
          {
            ...pendingChanges[0],
            entityId: "customer-2",
          },
          pendingChanges[1],
        ],
      },
    };

    expect(() =>
      buildCentralAdoptionLegacyQueueRetirement({
        data,
        expectedPendingChangeCount: pendingChanges.length,
        expectedPendingChangesSignature:
          centralAdoptionLegacyQueueSignature(pendingChanges),
      }),
    ).toThrow("se conserva intacta");
  });
});
