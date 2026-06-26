import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createSupabaseDocumentSyncStore,
  createSupabaseLocalStagingDocumentSyncAdapter,
} from "../src/lib/document-sync-integrity";
import type { DocumentSyncCandidate } from "../src/lib/document-sync-integrity";

// PHASE2C22_SUPABASE_LOCAL_SYNC_ACCEPTANCE_V1

const enabled = process.env.PHASE2C22_SUPABASE_LOCAL_SYNC_ACCEPTANCE === "true";
const localUrl = process.env.PHASE2C_SUPABASE_LOCAL_URL;
const adminKey = process.env.PHASE2C_SUPABASE_LOCAL_ADMIN_KEY;
const describeLocal = enabled && localUrl && adminKey ? describe : describe.skip;
const localHosts = new Set(["127.0.0.1", "localhost", "::1"]);

let admin: SupabaseClient;
let userId = "";
let scopeId = "";

function assertLocalUrl(value: string): void {
  const parsed = new URL(value);
  if (!localHosts.has(parsed.hostname)) {
    throw new Error("Phase 2C.22 only runs against Supabase local.");
  }
}

function candidate(
  overrides: Partial<DocumentSyncCandidate> = {},
): DocumentSyncCandidate {
  return {
    operationKind: "create_draft",
    documentId: randomUUID(),
    localDocumentId: `SYNTHETIC_ONLY_LOCAL_${randomUUID()}`,
    payloadHash: "hash:create",
    requestedResponseShape: "safe_summary",
    context: {
      userId,
      scopeId,
      requestId: `SYNTHETIC_ONLY_REQUEST_${randomUUID()}`,
      userIdSource: "test",
    },
    ...overrides,
  };
}

async function seedDocument(overrides: Record<string, unknown> = {}) {
  const localDocumentId = `SYNTHETIC_ONLY_SEED_${randomUUID()}`;
  const row = {
    id: randomUUID(),
    user_id: userId,
    scope_id: scopeId,
    local_document_id: localDocumentId,
    document_type: "factura",
    document_kind: "standard",
    document_lifecycle: "draft",
    integrity_lock: "unlocked",
    status_legacy: "borrador",
    version: 1,
    payload: {},
    payload_hash: "hash:seed",
    ...overrides,
  };
  const { data, error } = await admin
    .from("server_documents")
    .insert(row)
    .select("id, local_document_id")
    .single();
  if (error) throw new Error(`Synthetic seed failed: ${error.message}`);
  return data as { id: string; local_document_id: string };
}

function makeAdapter() {
  const store = createSupabaseDocumentSyncStore(admin as never, {
    serverScope: { userId, scopeId },
    now: () => new Date().toISOString(),
    idFactory: () => randomUUID(),
  });
  return createSupabaseLocalStagingDocumentSyncAdapter(store, {
    serverScope: { userId, scopeId },
  });
}

describeLocal("Phase 2C.22 Supabase local sync acceptance", () => {
  beforeAll(async () => {
    assertLocalUrl(localUrl as string);
    admin = createClient(localUrl as string, adminKey as string, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const created = await admin.auth.admin.createUser({
      email: `phase2c22_${randomUUID()}@example.test`,
      password: `Phase2C22-${randomUUID()}!`,
      email_confirm: true,
    });
    if (created.error || !created.data.user) {
      throw new Error(`Could not create local synthetic user: ${created.error?.message}`);
    }
    userId = created.data.user.id;
    scopeId = `SYNTHETIC_ONLY_SCOPE_${randomUUID()}`;
  });

  afterAll(async () => {
    if (!admin || !userId) return;
    await admin.from("document_conflicts").delete().eq("user_id", userId);
    await admin.from("server_document_versions").delete().eq("user_id", userId);
    await admin.from("server_documents").delete().eq("user_id", userId);
    await admin.auth.admin.deleteUser(userId);
  });

  it("creates, updates, rejects unsafe mutations and reports safely", async () => {
    const adapter = makeAdapter();
    const localDocumentId = `SYNTHETIC_ONLY_ACCEPTANCE_${randomUUID()}`;
    const documentId = randomUUID();

    const created = await adapter.apply(
      candidate({ documentId, localDocumentId }),
    );
    expect(created.status).toBe("accepted");

    const updated = await adapter.apply(
      candidate({
        operationKind: "update_draft",
        documentId,
        localDocumentId,
        expectedVersion: 1,
        payloadHash: "hash:update",
      }),
    );
    expect(updated.status).toBe("accepted");

    const stale = await adapter.apply(
      candidate({
        operationKind: "update_draft",
        documentId,
        localDocumentId,
        expectedVersion: 1,
        payloadHash: "hash:stale",
      }),
    );
    expect(stale.status).toBe("conflict");

    for (const protectedSeed of [
      await seedDocument({
        document_lifecycle: "issued",
        integrity_lock: "locked",
        status_legacy: "enviado",
      }),
      await seedDocument({
        document_lifecycle: "draft",
        integrity_lock: "locked",
      }),
      await seedDocument({
        document_lifecycle: "canceled",
        integrity_lock: "locked",
        canceled_at: new Date().toISOString(),
      }),
      await seedDocument({
        status_legacy: "enviado",
      }),
    ]) {
      const result = await adapter.apply(
        candidate({
          operationKind: "update_draft",
          documentId: protectedSeed.id,
          localDocumentId: protectedSeed.local_document_id,
          expectedVersion: 1,
          payloadHash: "hash:protected-update",
        }),
      );
      expect(result.status).toBe("rejected");
    }

    const snapshotSeed = await seedDocument({ snapshot_hash: "hash:snapshot" });
    const snapshotResult = await adapter.apply(
      candidate({
        operationKind: "update_draft",
        documentId: snapshotSeed.id,
        localDocumentId: snapshotSeed.local_document_id,
        expectedVersion: 1,
        snapshotHash: "hash:snapshot-change",
      }),
    );
    expect(snapshotResult.status).toBe("rejected");

    const pdfSeed = await seedDocument({ pdf_content_hash: "hash:pdf" });
    const pdfResult = await adapter.apply(
      candidate({
        operationKind: "update_draft",
        documentId: pdfSeed.id,
        localDocumentId: pdfSeed.local_document_id,
        expectedVersion: 1,
        pdfSnapshotHash: "hash:pdf-change",
      }),
    );
    expect(pdfResult.status).toBe("rejected");

    const numberedSeed = await seedDocument({ numserie: "SYNTHETIC-1" });
    const numberResult = await adapter.apply(
      candidate({
        operationKind: "update_draft",
        documentId: numberedSeed.id,
        localDocumentId: numberedSeed.local_document_id,
        expectedVersion: 1,
        documentNumber: "SYNTHETIC-2",
      }),
    );
    expect(numberResult.status).toBe("rejected");

    const crossUser = await adapter.apply(
      candidate({
        operationKind: "update_draft",
        documentId,
        localDocumentId,
        expectedVersion: 2,
        payloadUserId: randomUUID(),
      }),
    );
    const crossScope = await adapter.apply(
      candidate({
        operationKind: "update_draft",
        documentId,
        localDocumentId,
        expectedVersion: 2,
        payloadScopeId: `SYNTHETIC_ONLY_OTHER_SCOPE_${randomUUID()}`,
      }),
    );
    expect(crossUser.status).toBe("rejected");
    expect(crossScope.status).toBe("rejected");

    const conflictReport = await adapter.getConflictReport({ userId, scopeId });
    const safeReport = await adapter.getSafeReport({ userId, scopeId });
    const serialized = JSON.stringify({ conflictReport, safeReport });

    expect(conflictReport.totalConflicts).toBeGreaterThanOrEqual(1);
    expect(safeReport.totalConflicts).toBeGreaterThanOrEqual(1);
    expect(serialized).not.toContain("document_snapshot");
    expect(serialized).not.toContain("pdf_snapshot");
    expect(serialized).not.toContain("payload\":{");
  });
});
