import { describe, expect, it } from "vitest";

import {
  buildCentralBusinessBootstrapPreview,
  type CentralBusinessBootstrapCentralRow,
  type CentralBusinessBootstrapEntityInput,
} from "./bootstrap-preview";

const local: CentralBusinessBootstrapEntityInput[] = [
  {
    entityType: "customer",
    entityId: "customer-a",
    payload: { id: "customer-a", name: "Cliente A" },
  },
  {
    entityType: "supplier",
    entityId: "supplier-a",
    payload: { id: "supplier-a", name: "Proveedor A" },
  },
];

describe("central business bootstrap preview", () => {
  it("clasifica altas sin escribir y produce digests deterministas", () => {
    const first = buildCentralBusinessBootstrapPreview({
      localEntities: local,
      centralEntities: [],
    });
    const reordered = buildCentralBusinessBootstrapPreview({
      localEntities: [...local].reverse(),
      centralEntities: [],
    });

    expect(first.summary).toEqual({
      local: 2,
      centralActive: 0,
      centralDeleted: 0,
      create: 2,
      identical: 0,
      conflict: 0,
      centralOnly: 0,
    });
    expect(first.canCommit).toBe(true);
    expect(first.previewDigest).toBe(reordered.previewDigest);
    expect(first.entries.map((entry) => entry.status)).toEqual([
      "create",
      "create",
    ]);
  });

  it("distingue coincidencias, tombstones, diferencias y filas solo centrales", () => {
    const localHash = buildCentralBusinessBootstrapPreview({
      localEntities: [local[0]],
      centralEntities: [],
    }).snapshotDigest;
    const identicalContentHash =
      "f5d6653878e7b1a237fff77116f30f22e49ad34090ad3713a985d4ba1579c65c";
    const central: CentralBusinessBootstrapCentralRow[] = [
      {
        entityType: "customer",
        entityId: "customer-a",
        currentVersion: 2,
        deleted: false,
        contentHash: identicalContentHash,
      },
      {
        entityType: "supplier",
        entityId: "supplier-a",
        currentVersion: 3,
        deleted: true,
        contentHash: "tombstone",
      },
      {
        entityType: "product",
        entityId: "product-central",
        currentVersion: 1,
        deleted: false,
        contentHash: "central-only",
      },
    ];

    const preview = buildCentralBusinessBootstrapPreview({
      localEntities: local,
      centralEntities: central,
    });

    expect(localHash).toMatch(/^[a-f0-9]{64}$/);
    expect(preview.entries).toEqual([
      {
        entityType: "customer",
        entityId: "customer-a",
        status: "identical",
        centralVersion: 2,
        centralDeleted: false,
      },
      {
        entityType: "product",
        entityId: "product-central",
        status: "central_only",
        centralVersion: 1,
        centralDeleted: false,
      },
      {
        entityType: "supplier",
        entityId: "supplier-a",
        status: "conflict",
        centralVersion: 3,
        centralDeleted: true,
      },
    ]);
    expect(preview.canCommit).toBe(false);
  });

  it("rechaza ids duplicados y payloads cuyo id no coincide", () => {
    expect(() =>
      buildCentralBusinessBootstrapPreview({
        localEntities: [local[0], local[0]],
        centralEntities: [],
      }),
    ).toThrow("DUPLICATE_BOOTSTRAP_ENTITY");
    expect(() =>
      buildCentralBusinessBootstrapPreview({
        localEntities: [
          {
            entityType: "customer",
            entityId: "customer-a",
            payload: { id: "other" },
          },
        ],
        centralEntities: [],
      }),
    ).toThrow("INVALID_BOOTSTRAP_ENTITY");
  });
});
