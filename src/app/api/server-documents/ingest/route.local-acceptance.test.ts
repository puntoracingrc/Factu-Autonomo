import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  SERVER_DOCUMENT_INGEST_ROUTE_FLAG,
  type SafeServerDocumentResponse,
} from "@/lib/server-documents";
import { handleServerDocumentIngestRoute } from "@/lib/server-documents/route-handler";

const localAcceptanceEnabled =
  process.env.PHASE2B3H_INGEST_LOCAL_ENABLED === "true";

const describeLocal = localAcceptanceEnabled ? describe : describe.skip;
const localHosts = new Set(["127.0.0.1", "localhost", "::1"]);

let admin: SupabaseClient;
let anon: SupabaseClient;
let userId: string;
let accessToken: string;
let email: string;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required local env var: ${name}`);
  return value;
}

function assertLocalUrl(value: string, label: string): void {
  const url = new URL(value);
  if (!localHosts.has(url.hostname)) {
    throw new Error(`${label} must point to localhost/127.0.0.1.`);
  }
}

function request(body: Record<string, unknown>) {
  return new Request("http://127.0.0.1/api/server-documents/ingest", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function postIngest(body: Record<string, unknown>) {
  const response = await handleServerDocumentIngestRoute(request(body));
  const payload = (await response.json()) as SafeServerDocumentResponse;
  return { response, payload };
}

function expectSafeResponse(payload: unknown) {
  const serialized = JSON.stringify(payload);
  expect(serialized).not.toContain("payload");
  expect(serialized).not.toContain("documentSnapshot");
  expect(serialized).not.toContain("pdfSnapshot");
  expect(serialized).not.toContain("document_snapshot");
  expect(serialized).not.toContain("pdf_snapshot");
  expect(serialized).not.toContain("xml_payload");
  expect(serialized).not.toContain("response_body");
  expect(serialized).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
}

async function countUserRows(table: string): Promise<number> {
  const { count, error } = await admin
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw new Error(`${table} count failed: ${error.message}`);
  return count ?? 0;
}

describeLocal("Phase 2B.3H local Supabase ingest acceptance", () => {
  beforeAll(async () => {
    const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

    assertLocalUrl(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL");
    expect(process.env[SERVER_DOCUMENT_INGEST_ROUTE_FLAG]).toBe("true");
    expect(process.env.NEXT_PUBLIC_SERVER_DOCUMENT_INGEST_ROUTE_ENABLED).toBeUndefined();

    admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    anon = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    email = `phase2b3h_${randomUUID()}@example.test`;
    const password = `Phase2B3H-${randomUUID()}!`;
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (created.error || !created.data.user) {
      throw new Error(`Could not create local auth user: ${created.error?.message}`);
    }
    userId = created.data.user.id;

    const signedIn = await anon.auth.signInWithPassword({ email, password });
    if (signedIn.error || !signedIn.data.session?.access_token) {
      throw new Error(`Could not sign in local auth user: ${signedIn.error?.message}`);
    }
    accessToken = signedIn.data.session.access_token;
  });

  afterAll(async () => {
    if (!admin || !userId) return;
    await admin.from("document_conflicts").delete().eq("user_id", userId);
    await admin.from("server_document_versions").delete().eq("user_id", userId);
    await admin.from("server_documents").delete().eq("user_id", userId);
    await admin.auth.admin.deleteUser(userId);
  });

  it("creates, updates and safely rejects stale updates against Supabase local", async () => {
    const localDocumentId = `phase2b3h-local-${randomUUID()}`;

    const created = await postIngest({
      action: "createDraft",
      authenticatedUserId: "body-user",
      documentKind: "standard",
      documentSnapshot: { should: "not-be-used" },
      documentType: "factura",
      entitlement: "pro",
      localDocumentId,
      payload: {
        documentNumber: "LOCAL-2B3H-1",
        total: 121,
      },
      pdfSnapshot: { should: "not-be-used" },
      plan: "pro",
      role: "admin",
      status: "active",
      statusLegacy: "borrador",
      user_id: "body-user",
      userId: "body-user",
    });

    expect(created.response.status).toBe(200);
    expect(created.payload).toMatchObject({
      status: "accepted",
      localDocumentId,
      version: 1,
      documentLifecycle: "draft",
      integrityLock: "unlocked",
    });
    expectSafeResponse(created.payload);

    if (created.payload.status !== "accepted") {
      throw new Error("Create draft was not accepted.");
    }
    const serverDocumentId = created.payload.serverDocumentId;

    const { data: documents, error: documentsError } = await admin
      .from("server_documents")
      .select(
        "id,user_id,local_document_id,version,document_lifecycle,integrity_lock,status_legacy",
      )
      .eq("user_id", userId)
      .eq("local_document_id", localDocumentId);
    expect(documentsError).toBeNull();
    expect(documents).toEqual([
      expect.objectContaining({
        id: serverDocumentId,
        user_id: userId,
        local_document_id: localDocumentId,
        version: 1,
        document_lifecycle: "draft",
        integrity_lock: "unlocked",
        status_legacy: "borrador",
      }),
    ]);

    const updated = await postIngest({
      action: "updateDraft",
      expectedVersion: 1,
      payload: {
        documentNumber: "LOCAL-2B3H-1",
        note: "updated locally",
        total: 242,
      },
      plan: "enterprise",
      role: "owner",
      serverDocumentId,
      statusLegacy: "borrador-editado",
      user_id: "malicious-body-user",
      userId: "malicious-body-user",
    });

    expect(updated.response.status).toBe(200);
    expect(updated.payload).toMatchObject({
      status: "accepted",
      serverDocumentId,
      localDocumentId,
      version: 2,
      documentLifecycle: "draft",
      integrityLock: "unlocked",
    });
    expectSafeResponse(updated.payload);

    const { data: versions, error: versionsError } = await admin
      .from("server_document_versions")
      .select("server_document_id,user_id,version,change_type,actor_type")
      .eq("user_id", userId)
      .eq("server_document_id", serverDocumentId)
      .order("version", { ascending: true });
    expect(versionsError).toBeNull();
    expect(versions).toEqual([
      expect.objectContaining({
        server_document_id: serverDocumentId,
        user_id: userId,
        version: 1,
        change_type: "create",
        actor_type: "server",
      }),
      expect.objectContaining({
        server_document_id: serverDocumentId,
        user_id: userId,
        version: 2,
        change_type: "update",
        actor_type: "server",
      }),
    ]);

    const stale = await postIngest({
      action: "updateDraft",
      expectedVersion: 1,
      payload: {
        documentNumber: "LOCAL-2B3H-1",
        total: 363,
      },
      serverDocumentId,
    });

    expect(stale.response.status).toBe(409);
    expect(stale.payload).toMatchObject({
      status: "conflict",
      reason: "version_mismatch",
      localDocumentId,
      serverDocumentId,
    });
    expectSafeResponse(stale.payload);

    const { data: conflicts, error: conflictsError } = await admin
      .from("document_conflicts")
      .select("user_id,server_document_id,local_document_id,conflict_type,resolution_status")
      .eq("user_id", userId)
      .eq("server_document_id", serverDocumentId);
    expect(conflictsError).toBeNull();
    expect(conflicts).toEqual([
      expect.objectContaining({
        user_id: userId,
        server_document_id: serverDocumentId,
        local_document_id: localDocumentId,
        conflict_type: "version",
        resolution_status: "open",
      }),
    ]);

    expect(await countUserRows("fiscal_records")).toBe(0);
    expect(await countUserRows("fiscal_chain_state")).toBe(0);
    expect(await countUserRows("fiscal_transport_attempts")).toBe(0);
  });

  it("allows only one concurrent update with the same expectedVersion", async () => {
    const localDocumentId = `phase2b3h-concurrent-${randomUUID()}`;

    const created = await postIngest({
      action: "createDraft",
      documentKind: "standard",
      documentType: "factura",
      localDocumentId,
      payload: {
        documentNumber: "LOCAL-2B3H-CONCURRENT",
        total: 121,
      },
      statusLegacy: "borrador",
    });

    expect(created.response.status).toBe(200);
    expect(created.payload.status).toBe("accepted");
    if (created.payload.status !== "accepted") {
      throw new Error("Concurrent test create draft was not accepted.");
    }

    const serverDocumentId = created.payload.serverDocumentId;
    const [first, second] = await Promise.all([
      postIngest({
        action: "updateDraft",
        expectedVersion: 1,
        payload: {
          documentNumber: "LOCAL-2B3H-CONCURRENT",
          total: 222,
        },
        serverDocumentId,
      }),
      postIngest({
        action: "updateDraft",
        expectedVersion: 1,
        payload: {
          documentNumber: "LOCAL-2B3H-CONCURRENT",
          total: 333,
        },
        serverDocumentId,
      }),
    ]);

    const statuses = [first, second].map((entry) => entry.payload.status).sort();
    expect(statuses).toEqual(["accepted", "conflict"]);
    for (const entry of [first, second]) expectSafeResponse(entry.payload);

    const { data: versions, error: versionsError } = await admin
      .from("server_document_versions")
      .select("server_document_id,user_id,version,change_type")
      .eq("user_id", userId)
      .eq("server_document_id", serverDocumentId)
      .order("version", { ascending: true });
    expect(versionsError).toBeNull();
    expect(versions).toHaveLength(2);
    expect(versions?.map((entry) => entry.version)).toEqual([1, 2]);

    const { data: conflicts, error: conflictsError } = await admin
      .from("document_conflicts")
      .select("user_id,server_document_id,local_document_id,conflict_type")
      .eq("user_id", userId)
      .eq("server_document_id", serverDocumentId);
    expect(conflictsError).toBeNull();
    expect(conflicts).toEqual([
      expect.objectContaining({
        user_id: userId,
        server_document_id: serverDocumentId,
        local_document_id: localDocumentId,
        conflict_type: "version",
      }),
    ]);

    expect(await countUserRows("fiscal_records")).toBe(0);
    expect(await countUserRows("fiscal_chain_state")).toBe(0);
    expect(await countUserRows("fiscal_transport_attempts")).toBe(0);
  });
});
