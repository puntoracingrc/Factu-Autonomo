import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const localAcceptanceEnabled =
  process.env.CENTRAL_BUSINESS_AUTHORITY_LOCAL_ENABLED === "true";
const describeLocal = localAcceptanceEnabled ? describe : describe.skip;
const localHosts = new Set(["127.0.0.1", "localhost", "::1"]);

let admin: SupabaseClient;
let signedInUser: SupabaseClient;
let userId = "";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required local env var: ${name}`);
  return value;
}

function assertLocalUrl(value: string): void {
  if (!localHosts.has(new URL(value).hostname)) {
    throw new Error("Central business authority acceptance requires localhost.");
  }
}

function mutationArgs(input: {
  idempotencyKey: string;
  requestHash: string;
  operation?: "upsert" | "delete";
  expectedVersion: number;
  payload?: Record<string, unknown> | null;
  contentHash: string;
}) {
  const operation = input.operation ?? "upsert";
  return {
    p_user_id: userId,
    p_device_id: "synthetic-local-device",
    p_session_hash: "synthetic-local-session-hash",
    p_idempotency_key_hash: input.idempotencyKey,
    p_request_hash: input.requestHash,
    p_operation_kind: operation,
    p_entity_type: "customer",
    p_entity_id: "synthetic-customer",
    p_expected_version: input.expectedVersion,
    p_payload: operation === "delete" ? null : (input.payload ?? {}),
    p_content_hash: input.contentHash,
  };
}

async function mutate(args: ReturnType<typeof mutationArgs>) {
  return admin.rpc("mutate_central_business_entity_v1", args);
}

describeLocal("central business authority local PostgreSQL acceptance", () => {
  beforeAll(async () => {
    const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    assertLocalUrl(url);

    admin = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const anonymous = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const email = `central-business-${randomUUID()}@example.test`;
    const password = `CentralBusiness-${randomUUID()}!`;
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (created.error || !created.data.user) {
      throw new Error(created.error?.message ?? "Could not create local user.");
    }
    userId = created.data.user.id;

    const login = await anonymous.auth.signInWithPassword({ email, password });
    if (login.error || !login.data.session) {
      throw new Error(login.error?.message ?? "Could not sign in local user.");
    }
    signedInUser = anonymous;
  });

  afterAll(async () => {
    if (!admin || !userId) return;
    await admin.from("central_business_commands").delete().eq("user_id", userId);
    await admin.from("central_business_outbox").delete().eq("user_id", userId);
    await admin.from("central_business_entities").delete().eq("user_id", userId);
    await admin.auth.admin.deleteUser(userId);
  });

  it("allows exactly one concurrent create for the same entity", async () => {
    const [left, right] = await Promise.all([
      mutate(
        mutationArgs({
          idempotencyKey: "create-left",
          requestHash: "request-left",
          expectedVersion: 0,
          payload: { name: "Left" },
          contentHash: "hash-left",
        }),
      ),
      mutate(
        mutationArgs({
          idempotencyKey: "create-right",
          requestHash: "request-right",
          expectedVersion: 0,
          payload: { name: "Right" },
          contentHash: "hash-right",
        }),
      ),
    ]);

    const accepted = [left, right].filter((result) => !result.error);
    const rejected = [left, right].filter((result) => result.error);
    expect(accepted).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.error?.message).toContain("version mismatch");
    expect(accepted[0]?.data).toEqual([
      expect.objectContaining({
        result_status: "committed",
        entity_version: 1,
        deleted: false,
      }),
    ]);

    const winningArgs = left.error
      ? mutationArgs({
          idempotencyKey: "create-right",
          requestHash: "request-right",
          expectedVersion: 0,
          payload: { name: "Right" },
          contentHash: "hash-right",
        })
      : mutationArgs({
          idempotencyKey: "create-left",
          requestHash: "request-left",
          expectedVersion: 0,
          payload: { name: "Left" },
          contentHash: "hash-left",
        });
    const replay = await mutate(winningArgs);
    expect(replay.error).toBeNull();
    expect(replay.data).toEqual([
      expect.objectContaining({
        result_status: "replayed",
        entity_version: 1,
      }),
    ]);
  });

  it("rejects stale updates and commits the matching version", async () => {
    const updated = await mutate(
      mutationArgs({
        idempotencyKey: "update-v1",
        requestHash: "update-v1-request",
        expectedVersion: 1,
        payload: { name: "Canonical" },
        contentHash: "hash-canonical",
      }),
    );
    expect(updated.error).toBeNull();
    expect(updated.data).toEqual([
      expect.objectContaining({
        result_status: "committed",
        entity_version: 2,
        deleted: false,
      }),
    ]);

    const stale = await mutate(
      mutationArgs({
        idempotencyKey: "stale-v1",
        requestHash: "stale-v1-request",
        expectedVersion: 1,
        payload: { name: "Must not win" },
        contentHash: "hash-stale",
      }),
    );
    expect(stale.error?.message).toContain("version mismatch");

    const { data, error } = await admin
      .from("central_business_entities")
      .select("current_version,current_payload,content_hash,deleted")
      .eq("user_id", userId)
      .eq("entity_type", "customer")
      .eq("entity_id", "synthetic-customer")
      .single();
    expect(error).toBeNull();
    expect(data).toEqual({
      current_version: 2,
      current_payload: { name: "Canonical" },
      content_hash: "hash-canonical",
      deleted: false,
    });
  });

  it("records deletion as a versioned tombstone and ordered event", async () => {
    const deleted = await mutate(
      mutationArgs({
        idempotencyKey: "delete-v2",
        requestHash: "delete-v2-request",
        operation: "delete",
        expectedVersion: 2,
        contentHash: "hash-deleted",
      }),
    );
    expect(deleted.error).toBeNull();
    expect(deleted.data).toEqual([
      expect.objectContaining({
        result_status: "committed",
        entity_version: 3,
        deleted: true,
      }),
    ]);

    const { data: events, error } = await admin
      .from("central_business_outbox")
      .select("event_sequence,entity_version,operation_kind,payload")
      .eq("user_id", userId)
      .order("event_sequence", { ascending: true });
    expect(error).toBeNull();
    expect(events).toHaveLength(3);
    expect(events?.map((event) => event.entity_version)).toEqual([1, 2, 3]);
    expect(events?.[2]).toEqual(
      expect.objectContaining({
        entity_version: 3,
        operation_kind: "delete",
        payload: null,
      }),
    );

    const pulled = await admin.rpc("list_central_business_events_v1", {
      p_user_id: userId,
      p_device_id: "synthetic-reader",
      p_after_sequence: events?.[0]?.event_sequence ?? 0,
      p_limit: 10,
    });
    expect(pulled.error).toBeNull();
    expect(pulled.data).toEqual([
      expect.objectContaining({
        entity_version: 2,
        operation_kind: "upsert",
      }),
      expect.objectContaining({
        entity_version: 3,
        operation_kind: "delete",
        payload: null,
      }),
    ]);
  });

  it("denies direct browser-role reads", async () => {
    const { data, error } = await signedInUser
      .from("central_business_entities")
      .select("id")
      .limit(1);
    expect(data).toBeNull();
    expect(error).not.toBeNull();

    const browserPull = await signedInUser.rpc(
      "list_central_business_events_v1",
      {
        p_user_id: userId,
        p_device_id: "synthetic-reader",
        p_after_sequence: 0,
        p_limit: 10,
      },
    );
    expect(browserPull.data).toBeNull();
    expect(browserPull.error).not.toBeNull();
  });
});
