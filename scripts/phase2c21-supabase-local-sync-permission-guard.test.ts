import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// PHASE2C21_SUPABASE_LOCAL_SYNC_PERMISSION_GUARD_V1

const enabled = process.env.PHASE2C21_SUPABASE_LOCAL_PERMISSION_GUARD === "true";
const localUrl = process.env.PHASE2C_SUPABASE_LOCAL_URL;
const anonKey = process.env.PHASE2C_SUPABASE_LOCAL_ANON_KEY;
const adminKey = process.env.PHASE2C_SUPABASE_LOCAL_ADMIN_KEY;
const describeLocal = enabled && localUrl && anonKey && adminKey ? describe : describe.skip;
const localHosts = new Set(["127.0.0.1", "localhost", "::1"]);

let admin: SupabaseClient;
let anon: SupabaseClient;
let authenticated: SupabaseClient;
let userId = "";
let email = "";

function assertLocalUrl(value: string): void {
  const parsed = new URL(value);
  if (!localHosts.has(parsed.hostname)) {
    throw new Error("Phase 2C.21 only runs against Supabase local.");
  }
}

function directInsertRow(targetUserId: string) {
  return {
    id: randomUUID(),
    user_id: targetUserId,
    scope_id: "SYNTHETIC_ONLY_SCOPE_PERMISSION",
    local_document_id: `SYNTHETIC_ONLY_PERMISSION_${randomUUID()}`,
    document_type: "factura",
    document_kind: "standard",
    document_lifecycle: "draft",
    integrity_lock: "unlocked",
    status_legacy: "borrador",
    version: 1,
    payload: {},
    payload_hash: "hash:permission",
  };
}

describeLocal("Phase 2C.21 Supabase local sync permission guard", () => {
  beforeAll(async () => {
    assertLocalUrl(localUrl as string);
    admin = createClient(localUrl as string, adminKey as string, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    anon = createClient(localUrl as string, anonKey as string, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    authenticated = createClient(localUrl as string, anonKey as string, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    email = `phase2c21_${randomUUID()}@example.test`;
    const password = `Phase2C21-${randomUUID()}!`;
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (created.error || !created.data.user) {
      throw new Error(`Could not create local synthetic user: ${created.error?.message}`);
    }
    userId = created.data.user.id;

    const signedIn = await authenticated.auth.signInWithPassword({
      email,
      password,
    });
    if (signedIn.error) {
      throw new Error(`Could not sign in local synthetic user: ${signedIn.error.message}`);
    }
  });

  afterAll(async () => {
    if (!admin || !userId) return;
    await admin.from("document_conflicts").delete().eq("user_id", userId);
    await admin.from("server_document_versions").delete().eq("user_id", userId);
    await admin.from("server_documents").delete().eq("user_id", userId);
    await admin.auth.admin.deleteUser(userId);
  });

  it("keeps direct anon and authenticated writes blocked", async () => {
    const anonAttempt = await anon
      .from("server_documents")
      .insert(directInsertRow(userId))
      .select("id")
      .maybeSingle();

    expect(anonAttempt.error).toBeTruthy();

    const authenticatedAttempt = await authenticated
      .from("server_documents")
      .insert(directInsertRow(userId))
      .select("id")
      .maybeSingle();

    expect(authenticatedAttempt.error).toBeTruthy();
  });
});
