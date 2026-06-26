import { describe, expect, it } from "vitest";
import type { DocumentSyncMutationPlan } from "./sync-planner";
import {
  DOCUMENT_SYNC_SUPABASE_DOCUMENT_COLUMNS,
  DocumentSyncSupabaseMappingError,
  mapDocumentSyncRecordToSupabaseInsert,
  mapSupabaseConflictRowToSyncConflict,
  mapSupabaseDocumentRowToSyncCurrentState,
  mapSupabaseDocumentRowToStoreRecord,
  mapSyncConflictToSupabaseConflictInsert,
  mapSyncMutationToSupabaseDraftUpdate,
} from "./supabase-mapping";
import type { DocumentSyncStoreRecord } from "./sync-store";
import type { DocumentSyncConflict } from "./types";

const NOW = "2026-06-26T20:00:00.000Z";

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "SYNTHETIC_ONLY_DOC_A",
    user_id: "SYNTHETIC_ONLY_USER_A",
    scope_id: "SYNTHETIC_ONLY_SCOPE_A",
    local_document_id: "SYNTHETIC_ONLY_LOCAL_A",
    version: 1,
    document_lifecycle: "draft",
    integrity_lock: "unlocked",
    status_legacy: "borrador",
    payload_hash: "hash:payload",
    snapshot_hash: null,
    pdf_content_hash: null,
    numserie: null,
    document_series: null,
    updated_at: NOW,
    ...overrides,
  };
}

function record(overrides: Partial<DocumentSyncStoreRecord> = {}) {
  return {
    documentId: "SYNTHETIC_ONLY_DOC_A",
    localDocumentId: "SYNTHETIC_ONLY_LOCAL_A",
    userId: "SYNTHETIC_ONLY_USER_A",
    scopeId: "SYNTHETIC_ONLY_SCOPE_A",
    version: 1,
    payloadHash: "hash:payload",
    lifecycle: "draft" as const,
    integrityLock: "unlocked" as const,
    statusLegacy: "borrador",
    ...overrides,
  };
}

function allowedPlan(): DocumentSyncMutationPlan {
  return {
    status: "allowedMutation",
    dryRun: true,
    operationKind: "update_draft",
    localDocumentId: "SYNTHETIC_ONLY_LOCAL_A",
    targetDocumentId: "SYNTHETIC_ONLY_DOC_A",
    expectedVersion: 1,
    nextVersion: 2,
    safeSummary: {
      operationKind: "update_draft",
      documentId: "SYNTHETIC_ONLY_DOC_A",
      localDocumentId: "SYNTHETIC_ONLY_LOCAL_A",
      serverDerivedUserId: "SYNTHETIC_ONLY_USER_A",
      serverDerivedScopeId: "SYNTHETIC_ONLY_SCOPE_A",
      expectedVersion: 1,
      lifecycle: "draft",
      integrityLock: "unlocked",
      statusLegacy: "borrador",
      payloadHashPresent: true,
      snapshotHashPresent: false,
      pdfSnapshotHashPresent: false,
      riskFlags: [],
    },
  };
}

describe("Supabase sync safe mapping", () => {
  it("mapea draft row a current state sin cuerpos completos", () => {
    const current = mapSupabaseDocumentRowToSyncCurrentState(row());

    expect(current).toMatchObject({
      documentId: "SYNTHETIC_ONLY_DOC_A",
      lifecycle: "draft",
      integrityLock: "unlocked",
      payloadHash: "hash:payload",
    });
    expect(JSON.stringify(current)).not.toContain("payload\":");
  });

  it("mapea issued, locked, canceled y legacy como estados protegibles", () => {
    expect(
      mapSupabaseDocumentRowToSyncCurrentState(
        row({ document_lifecycle: "issued", integrity_lock: "locked" }),
      ),
    ).toMatchObject({ lifecycle: "issued", integrityLock: "locked" });
    expect(
      mapSupabaseDocumentRowToSyncCurrentState(
        row({ document_lifecycle: "canceled" }),
      ),
    ).toMatchObject({ lifecycle: "canceled" });
    expect(
      mapSupabaseDocumentRowToSyncCurrentState(row({ status_legacy: "enviado" })),
    ).toMatchObject({ statusLegacy: "enviado" });
  });

  it("mantiene presencia de hashes sin snapshot completo", () => {
    const mapped = mapSupabaseDocumentRowToStoreRecord(
      row({
        snapshot_hash: "hash:snapshot",
        pdf_content_hash: "hash:pdf",
      }),
    );

    expect(mapped.snapshotHash).toBe("hash:snapshot");
    expect(mapped.pdfSnapshotHash).toBe("hash:pdf");
    expect(JSON.stringify(mapped)).not.toContain("document_snapshot");
    expect(JSON.stringify(mapped)).not.toContain("pdf_snapshot");
  });

  it("mapea mutation plan a update con campos permitidos", () => {
    const update = mapSyncMutationToSupabaseDraftUpdate(allowedPlan(), {
      updatedAt: NOW,
      payloadHash: "hash:new",
      documentNumber: "SYNTHETIC-1",
    });

    expect(update).toMatchObject({
      version: 2,
      updated_at: NOW,
      document_lifecycle: "draft",
      integrity_lock: "unlocked",
      status_legacy: "borrador",
      payload_hash: "hash:new",
      numserie: "SYNTHETIC-1",
    });
    expect(update).not.toHaveProperty("payload");
    expect(update).not.toHaveProperty("pdf_snapshot");
  });

  it("mapea insert sin datos fiscales completos", () => {
    const insert = mapDocumentSyncRecordToSupabaseInsert(
      record({ snapshotHash: "hash:snapshot" }),
      NOW,
    );

    expect(insert).toMatchObject({
      user_id: "SYNTHETIC_ONLY_USER_A",
      scope_id: "SYNTHETIC_ONLY_SCOPE_A",
      snapshot_hash: "hash:snapshot",
      document_type: "factura",
      document_kind: "standard",
      payload: {},
    });
    expect(insert.payload).toEqual({});
    expect(insert).not.toHaveProperty("issuer_nif");
    expect(insert).not.toHaveProperty("document_snapshot");
  });

  it("mapea conflict row seguro", () => {
    const conflict = mapSupabaseConflictRowToSyncConflict({
      id: "SYNTHETIC_ONLY_CONFLICT_A",
      user_id: "SYNTHETIC_ONLY_USER_A",
      scope_id: "SYNTHETIC_ONLY_SCOPE_A",
      server_document_id: "SYNTHETIC_ONLY_DOC_A",
      local_document_id: "SYNTHETIC_ONLY_LOCAL_A",
      conflict_type: "version",
      local_version: 1,
      remote_version: 2,
      expected_version: 1,
      resolution_status: "open",
      created_at: NOW,
    });

    expect(conflict).toMatchObject({
      conflictReason: "expected_version_mismatch",
      remoteVersion: 2,
    });
    expect(JSON.stringify(conflict)).not.toContain("payload completo");
  });

  it("mapea sync conflict a insert sin payloads", () => {
    const conflict: DocumentSyncConflict = {
      documentId: "SYNTHETIC_ONLY_DOC_A",
      localDocumentId: "SYNTHETIC_ONLY_LOCAL_A",
      serverDerivedUserId: "SYNTHETIC_ONLY_USER_A",
      serverDerivedScopeId: "SYNTHETIC_ONLY_SCOPE_A",
      localVersion: 1,
      remoteVersion: 2,
      expectedVersion: 1,
      conflictReason: "expected_version_mismatch",
      safeSummary: {
        operationKind: "update_draft",
        documentId: "SYNTHETIC_ONLY_DOC_A",
        localDocumentId: "SYNTHETIC_ONLY_LOCAL_A",
        serverDerivedUserId: "SYNTHETIC_ONLY_USER_A",
        serverDerivedScopeId: "SYNTHETIC_ONLY_SCOPE_A",
        payloadHashPresent: true,
        snapshotHashPresent: false,
        pdfSnapshotHashPresent: false,
        riskFlags: ["version_conflict"],
      },
    };

    const insert = mapSyncConflictToSupabaseConflictInsert(conflict, {
      id: "SYNTHETIC_ONLY_CONFLICT_A",
      createdAt: NOW,
    });

    expect(insert).toMatchObject({
      conflict_type: "version",
      incoming_payload_hash: null,
      server_payload_hash: null,
    });
  });

  it("rechaza filas desconocidas o malformadas", () => {
    expect(() => mapSupabaseDocumentRowToSyncCurrentState({})).toThrow(
      DocumentSyncSupabaseMappingError,
    );
    expect(() =>
      mapSupabaseConflictRowToSyncConflict({
        user_id: "SYNTHETIC_ONLY_USER_A",
        local_document_id: "SYNTHETIC_ONLY_LOCAL_A",
        conflict_type: "unexpected",
      }),
    ).toThrow(DocumentSyncSupabaseMappingError);
  });

  it("no usa SELECT estrella conceptual", () => {
    expect(DOCUMENT_SYNC_SUPABASE_DOCUMENT_COLUMNS).not.toContain("*");
  });
});
