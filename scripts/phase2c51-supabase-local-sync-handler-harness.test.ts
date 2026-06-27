import { describe, expect, it } from "vitest";
import {
  createDocumentSyncSupabaseLocalHandlerHarness,
} from "../src/lib/document-sync-integrity/route-supabase-local-harness";
import type {
  DocumentSyncSupabaseClientLike,
} from "../src/lib/document-sync-integrity/supabase-contract";

// PHASE2C51_SUPABASE_LOCAL_SYNC_HANDLER_HARNESS_OPT_IN_V1

const enabled =
  process.env.PHASE2C51_SUPABASE_LOCAL_HANDLER_HARNESS === "true";
const localUrl = process.env.PHASE2C51_SUPABASE_LOCAL_URL;
const localAccessKey = process.env.PHASE2C51_SUPABASE_LOCAL_ACCESS_KEY;
const localReady = enabled && Boolean(localUrl && localAccessKey);
const describeLocal = localReady ? describe : describe.skip;
const localHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

const scope = {
  userId: "SYNTHETIC_ONLY_PHASE2C51_USER",
  scopeId: "SYNTHETIC_ONLY_PHASE2C51_SCOPE",
};

function assertLocalUrl(value: string): void {
  const parsed = new URL(value);
  if (!localHosts.has(parsed.hostname)) {
    throw new Error("PHASE2C51_SUPABASE_LOCAL_URL debe apuntar a localhost.");
  }
}

function headers(requestId: string) {
  return {
    "content-type": "application/json",
    "x-request-id": requestId,
    "x-document-sync-source": "SYNTHETIC_ONLY_PHASE2C51_SOURCE",
  };
}

function payload(
  operationKind: "create_draft" | "update_draft",
  suffix: string,
  expectedVersion?: number,
) {
  return {
    operationKind,
    documentId: "SYNTHETIC_ONLY_PHASE2C51_DOC",
    localDocumentId: "SYNTHETIC_ONLY_PHASE2C51_LOCAL",
    expectedVersion,
    payloadHash: `hash:phase2c51:${suffix}`,
  };
}

function body(value: unknown) {
  return JSON.stringify(value);
}

describe("Phase 2C.51 Supabase local sync handler harness opt-in default", () => {
  it("queda skipped salvo flag local explicita", () => {
    expect(enabled || !localReady).toBe(true);
  });
});

describeLocal("Phase 2C.51 Supabase local sync handler harness opt-in", () => {
  it("ejecuta create/update/conflict/safe report con datos sinteticos", async () => {
    if (!localUrl || !localAccessKey) throw new Error("Supabase local no configurado.");
    assertLocalUrl(localUrl);
    const supabaseModule = await import("@supabase/supabase-js") as {
      createClient: (url: string, key: string, options: unknown) => unknown;
    };
    const client = supabaseModule.createClient(localUrl, localAccessKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }) as DocumentSyncSupabaseClientLike;

    await client.from("document_conflicts").delete().eq("user_id", scope.userId);
    await client.from("server_document_versions").delete().eq("user_id", scope.userId);
    await client.from("server_documents").delete().eq("user_id", scope.userId);

    const harness = createDocumentSyncSupabaseLocalHandlerHarness({
      serverScope: scope,
      client,
      metadata: {
        mode: "local_staging_only",
        databaseTarget: "local",
        remote: false,
        databaseUrl: localUrl,
      },
      now: () => "2026-06-27T00:00:00.000Z",
      idFactory: (prefix) => `SYNTHETIC_ONLY_PHASE2C51_${prefix}`,
    });

    const create = await harness.handler.handleDocumentSyncRouteRequest({
      method: "POST",
      headers: headers("SYNTHETIC_ONLY_PHASE2C51_CREATE"),
      readBody: () =>
        body({ kind: "apply_single", payload: payload("create_draft", "create") }),
    });
    const update = await harness.handler.handleDocumentSyncRouteRequest({
      method: "POST",
      headers: headers("SYNTHETIC_ONLY_PHASE2C51_UPDATE"),
      readBody: () =>
        body({
          kind: "apply_single",
          payload: payload("update_draft", "update", 1),
        }),
    });
    const conflict = await harness.handler.handleDocumentSyncRouteRequest({
      method: "POST",
      headers: headers("SYNTHETIC_ONLY_PHASE2C51_CONFLICT"),
      readBody: () =>
        body({
          kind: "apply_single",
          payload: payload("update_draft", "stale", 1),
        }),
    });
    const report = await harness.handler.handleDocumentSyncRouteRequest({
      method: "POST",
      headers: headers("SYNTHETIC_ONLY_PHASE2C51_REPORT"),
      readBody: () => body({ kind: "get_safe_report" }),
    });

    const serialized = JSON.stringify({ create, update, conflict, report });
    expect(create.status).toBe(200);
    expect(update.status).toBe(200);
    expect(conflict.status).toBe(200);
    expect(report.status).toBe(200);
    expect(serialized).toContain("route_supabase_local_harness_completed");
    expect(serialized).not.toContain("documentSnapshot");
    expect(serialized).not.toContain("SHOULD_NOT_LEAK");

    await client.from("document_conflicts").delete().eq("user_id", scope.userId);
    await client.from("server_document_versions").delete().eq("user_id", scope.userId);
    await client.from("server_documents").delete().eq("user_id", scope.userId);
  });
});
