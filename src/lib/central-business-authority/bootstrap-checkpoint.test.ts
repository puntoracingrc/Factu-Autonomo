import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import type { CentralBusinessQueueStorage } from "./durable-queue";
import { loadCentralBusinessDurableQueue } from "./durable-queue";
import { recordCentralBusinessBootstrapCheckpoint } from "./bootstrap-checkpoint";

class MemoryStorage implements CentralBusinessQueueStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

const ownerScope = "synthetic-bootstrap-user";
const entities = [
  {
    entityType: "customer" as const,
    entityId: "customer-created",
    payload: { id: "customer-created", name: "Creado" },
  },
  {
    entityType: "supplier" as const,
    entityId: "supplier-identical",
    payload: { id: "supplier-identical", name: "Igual" },
  },
];

describe("central business bootstrap checkpoint", () => {
  it("registra version uno para creados y la version central para identicos", async () => {
    const storage = new MemoryStorage();
    const result = await recordCentralBusinessBootstrapCheckpoint({
      ownerScope,
      entities,
      preview: {
        schema: "CENTRAL_BUSINESS_BOOTSTRAP_PREVIEW_V1",
        snapshotDigest: "a".repeat(64),
        centralStateDigest: "b".repeat(64),
        previewDigest: "c".repeat(64),
        summary: {
          local: 2,
          centralActive: 1,
          centralDeleted: 0,
          create: 1,
          identical: 1,
          conflict: 0,
          centralOnly: 0,
        },
        entries: [
          {
            entityType: "customer",
            entityId: "customer-created",
            status: "create",
            centralVersion: null,
            centralDeleted: false,
          },
          {
            entityType: "supplier",
            entityId: "supplier-identical",
            status: "identical",
            centralVersion: 4,
            centralDeleted: false,
          },
        ],
        canCommit: true,
      },
      storage,
    });

    expect(result.schema).toBe("CENTRAL_BUSINESS_BOOTSTRAP_CHECKPOINT_V1");
    const state = loadCentralBusinessDurableQueue(ownerScope, storage);
    expect(state.entityVersions["customer:customer-created"]).toMatchObject({
      version: 1,
      deleted: false,
    });
    expect(state.entityVersions["supplier:supplier-identical"]).toMatchObject({
      version: 4,
      deleted: false,
    });
    expect(
      state.entityVersions["customer:customer-created"]?.contentHash,
    ).toBe(
      createHash("sha256")
        .update('{"id":"customer-created","name":"Creado"}')
        .digest("hex"),
    );
  });

  it("rechaza una comparacion con diferencias", async () => {
    await expect(
      recordCentralBusinessBootstrapCheckpoint({
        ownerScope,
        entities: [entities[0]],
        preview: {
          schema: "CENTRAL_BUSINESS_BOOTSTRAP_PREVIEW_V1",
          snapshotDigest: "a".repeat(64),
          centralStateDigest: "b".repeat(64),
          previewDigest: "c".repeat(64),
          summary: {
            local: 1,
            centralActive: 1,
            centralDeleted: 0,
            create: 0,
            identical: 0,
            conflict: 1,
            centralOnly: 0,
          },
          entries: [
            {
              entityType: "customer",
              entityId: "customer-created",
              status: "conflict",
              centralVersion: 2,
              centralDeleted: false,
            },
          ],
          canCommit: false,
        },
        storage: new MemoryStorage(),
      }),
    ).rejects.toThrow("CENTRAL_BUSINESS_BOOTSTRAP_CHECKPOINT_NOT_IDENTICAL");
  });

  it("no enlaza si el snapshot local cambia durante la confirmacion", async () => {
    await expect(
      recordCentralBusinessBootstrapCheckpoint({
        ownerScope,
        entities: [entities[0]],
        preview: {
          schema: "CENTRAL_BUSINESS_BOOTSTRAP_PREVIEW_V1",
          snapshotDigest: "a".repeat(64),
          centralStateDigest: "b".repeat(64),
          previewDigest: "c".repeat(64),
          summary: {
            local: 1,
            centralActive: 0,
            centralDeleted: 0,
            create: 1,
            identical: 0,
            conflict: 0,
            centralOnly: 0,
          },
          entries: [
            {
              entityType: "customer",
              entityId: "customer-created",
              status: "create",
              centralVersion: null,
              centralDeleted: false,
            },
          ],
          canCommit: true,
        },
        storage: new MemoryStorage(),
        verifyCurrentSnapshot: () => false,
      }),
    ).rejects.toThrow(
      "CENTRAL_BUSINESS_BOOTSTRAP_CHECKPOINT_LOCAL_CHANGED",
    );
  });
});
