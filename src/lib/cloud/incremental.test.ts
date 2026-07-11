import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { issueDocument } from "../document-integrity";
import { EMPTY_DATA, type Document, type SyncChange } from "../types";
import {
  hasPendingSyncChanges,
  markFullySynced,
  rebuildCloudSnapshot,
} from "./incremental";
import { hasUnsyncedChanges } from "./sync-queue";
import { snapshotIntegrityMetadataChange } from "./diff";

function legacyRemoteInvoice(): Document {
  const issued = issueDocument(
    {
      id: "remote-legacy-invoice",
      type: "factura",
      number: "F-2026-0001",
      date: "2026-06-30",
      client: { name: "Cliente cloud" },
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
  return {
    ...issued,
    snapshotSeal: undefined,
    snapshotIntegrityRequired: undefined,
  };
}

function remoteDocumentChange(document: Document): SyncChange {
  return {
    entityType: "document",
    entityId: document.id,
    deleted: false,
    payload: document,
    updatedAt: "2026-07-01T10:00:00.000Z",
  };
}

describe("incremental sync state", () => {
  it("migra una nube legacy sin marcador y deja sello y metadato en cola", () => {
    const legacy = legacyRemoteInvoice();
    const restored = rebuildCloudSnapshot([remoteDocumentChange(legacy)]).data;

    expect(restored.snapshotIntegrityVersion).toBe(1);
    expect(restored.documents[0].snapshotSeal).toBeDefined();
    expect(restored.documents[0].snapshotIntegrity).toBeUndefined();
    expect(
      restored.meta?.pendingChanges?.map(
        (change) => `${change.entityType}:${change.entityId}`,
      ),
    ).toEqual([
      `document:${legacy.id}`,
      "workspace_metadata:snapshot_integrity_version",
    ]);
  });

  it("bloquea una nube marcada v1 si falta el sello en vez de rellenarlo", () => {
    const legacy = legacyRemoteInvoice();
    const restored = rebuildCloudSnapshot([
      remoteDocumentChange(legacy),
      snapshotIntegrityMetadataChange("2026-07-01T11:00:00.000Z"),
    ]).data;

    expect(restored.snapshotIntegrityVersion).toBe(1);
    expect(restored.documents[0].snapshotSeal).toBeUndefined();
    expect(restored.documents[0].snapshotIntegrity?.issues).toContain(
      "snapshot_seal_missing",
    );
    expect(restored.meta?.pendingChanges).toBeUndefined();
  });

  it("conecta bootstrap inicial y descarga completa con la base cloud sin marcador", () => {
    const source = readFileSync(
      new URL("../../context/CloudSyncContext.tsx", import.meta.url),
      "utf8",
    );

    expect(source.match(/rebuildCloudSnapshot\(remoteChanges\)/g)).toHaveLength(
      2,
    );
    expect(source).not.toContain("mergeRemoteOntoLocal(\n          EMPTY_DATA");
  });

  it("marca los datos como sincronizados cuando no hay cola", () => {
    const data = {
      ...EMPTY_DATA,
      meta: {
        lastModified: "2026-06-10T12:00:00.000Z",
        lastSyncedAt: "2026-06-09T12:00:00.000Z",
      },
    };

    const synced = markFullySynced(data, "2026-06-10T12:00:00.000Z");

    expect(hasPendingSyncChanges(synced)).toBe(false);
    expect(hasUnsyncedChanges(synced)).toBe(false);
    expect(synced.meta?.lastSyncedAt).toBe("2026-06-10T12:00:00.000Z");
  });

  it("no toca los datos si aún hay cambios pendientes", () => {
    const data = {
      ...EMPTY_DATA,
      meta: {
        lastModified: "2026-06-10T12:00:00.000Z",
        pendingChanges: [
          {
            entityType: "profile" as const,
            entityId: "profile",
            action: "upsert" as const,
            deleted: false,
            payload: EMPTY_DATA.profile,
            updatedAt: "2026-06-10T12:00:00.000Z",
          },
        ],
      },
    };

    const synced = markFullySynced(data);
    expect(synced.meta?.pendingChanges?.length).toBe(1);
  });
});
