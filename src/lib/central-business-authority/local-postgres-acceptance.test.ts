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
    await admin
      .from("central_business_bootstraps")
      .delete()
      .eq("user_id", userId);
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
    expect(rejected[0]?.error?.code).toBe("P4103");
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

    const reused = await mutate({
      ...winningArgs,
      p_request_hash: "different-request",
      p_payload: { name: "Different" },
      p_content_hash: "different-hash",
    });
    expect(reused.error?.code).toBe("P4102");
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
    expect(stale.error).toMatchObject({
      code: "P4103",
      message: expect.stringContaining("version mismatch"),
    });

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

  it("commits and replays an all-or-nothing legacy bootstrap", async () => {
    const args = {
      p_user_id: userId,
      p_device_id: "synthetic-bootstrap-device",
      p_session_hash: "b".repeat(64),
      p_idempotency_key_hash: "c".repeat(64),
      p_request_hash: "d".repeat(64),
      p_snapshot_digest: "e".repeat(64),
      p_central_state_digest: "f".repeat(64),
      p_preview_digest: "1".repeat(64),
      p_entities: [
        {
          entityType: "supplier",
          entityId: "synthetic-bootstrap-supplier",
          payload: {
            id: "synthetic-bootstrap-supplier",
            name: "Synthetic supplier",
          },
          contentHash: "2".repeat(64),
          idempotencyKeyHash: "3".repeat(64),
          requestHash: "4".repeat(64),
        },
        {
          entityType: "product",
          entityId: "synthetic-bootstrap-product",
          payload: {
            id: "synthetic-bootstrap-product",
            name: "Synthetic product",
          },
          contentHash: "5".repeat(64),
          idempotencyKeyHash: "6".repeat(64),
          requestHash: "7".repeat(64),
        },
      ],
    };

    const committed = await admin.rpc(
      "bootstrap_central_business_entities_v1",
      args,
    );
    expect(committed.error).toBeNull();
    expect(committed.data).toEqual([
      expect.objectContaining({
        result_status: "committed",
        created_count: 2,
        identical_count: 0,
      }),
    ]);

    const replayed = await admin.rpc(
      "bootstrap_central_business_entities_v1",
      args,
    );
    expect(replayed.error).toBeNull();
    expect(replayed.data).toEqual([
      expect.objectContaining({
        result_status: "replayed",
        created_count: 2,
      }),
    ]);

    const conflicting = await admin.rpc(
      "bootstrap_central_business_entities_v1",
      {
        ...args,
        p_idempotency_key_hash: "8".repeat(64),
        p_request_hash: "9".repeat(64),
        p_entities: [
          {
            ...args.p_entities[0],
            contentHash: "a".repeat(64),
            idempotencyKeyHash: "a".repeat(64),
            requestHash: "b".repeat(64),
          },
          {
            entityType: "product",
            entityId: "must-not-partially-commit",
            payload: {
              id: "must-not-partially-commit",
              name: "Must roll back",
            },
            contentHash: "c".repeat(64),
            idempotencyKeyHash: "d".repeat(64),
            requestHash: "e".repeat(64),
          },
        ],
      },
    );
    expect(conflicting.error?.code).toBe("P4113");

    const partial = await admin
      .from("central_business_entities")
      .select("id")
      .eq("user_id", userId)
      .eq("entity_id", "must-not-partially-commit");
    expect(partial.error).toBeNull();
    expect(partial.data).toEqual([]);
  });

  it("commits or rolls back every operation in an atomic mutation batch", async () => {
    const operations = [
      {
        operationIndex: 0,
        idempotencyKeyHash: "batch-supplier-create",
        requestHash: "batch-supplier-request",
        operationKind: "upsert",
        entityType: "supplier",
        entityId: "batch-supplier",
        expectedVersion: 0,
        payload: { id: "batch-supplier", name: "Synthetic batch supplier" },
        contentHash: "batch-supplier-hash",
      },
      {
        operationIndex: 1,
        idempotencyKeyHash: "batch-expense-create",
        requestHash: "batch-expense-request",
        operationKind: "upsert",
        entityType: "expense",
        entityId: "batch-expense",
        expectedVersion: 0,
        payload: {
          id: "batch-expense",
          supplierId: "batch-supplier",
          description: "Synthetic batch expense",
        },
        contentHash: "batch-expense-hash",
      },
    ];
    const committed = await admin.rpc("mutate_central_business_batch_v1", {
      p_user_id: userId,
      p_device_id: "synthetic-batch-device",
      p_session_hash: "synthetic-batch-session",
      p_operations: operations,
    });
    expect(committed.error).toBeNull();
    expect(committed.data).toEqual([
      expect.objectContaining({
        operation_index: 0,
        result_status: "committed",
        entity_version: 1,
      }),
      expect.objectContaining({
        operation_index: 1,
        result_status: "committed",
        entity_version: 1,
      }),
    ]);

    const replayed = await admin.rpc("mutate_central_business_batch_v1", {
      p_user_id: userId,
      p_device_id: "synthetic-batch-device",
      p_session_hash: "synthetic-batch-session",
      p_operations: operations,
    });
    expect(replayed.error).toBeNull();
    expect(replayed.data).toEqual([
      expect.objectContaining({ result_status: "replayed" }),
      expect.objectContaining({ result_status: "replayed" }),
    ]);

    const rejected = await admin.rpc("mutate_central_business_batch_v1", {
      p_user_id: userId,
      p_device_id: "synthetic-batch-device",
      p_session_hash: "synthetic-batch-session",
      p_operations: [
        {
          operationIndex: 0,
          idempotencyKeyHash: "batch-rollback-customer",
          requestHash: "batch-rollback-customer-request",
          operationKind: "upsert",
          entityType: "customer",
          entityId: "must-not-partially-commit-batch",
          expectedVersion: 0,
          payload: {
            id: "must-not-partially-commit-batch",
            name: "Must roll back",
          },
          contentHash: "batch-rollback-customer-hash",
        },
        {
          operationIndex: 1,
          idempotencyKeyHash: "batch-stale-expense",
          requestHash: "batch-stale-expense-request",
          operationKind: "upsert",
          entityType: "expense",
          entityId: "batch-expense",
          expectedVersion: 0,
          payload: {
            id: "batch-expense",
            description: "Must not overwrite",
          },
          contentHash: "batch-stale-expense-hash",
        },
      ],
    });
    expect(rejected.error?.code).toBe("P4103");

    const rolledBack = await admin
      .from("central_business_entities")
      .select("id")
      .eq("user_id", userId)
      .eq("entity_id", "must-not-partially-commit-batch");
    expect(rolledBack.error).toBeNull();
    expect(rolledBack.data).toEqual([]);
  });

  it("allows one recurring occurrence and rolls back a duplicate batch", async () => {
    const occurrenceKey = "synthetic-rule:2026-07-30";
    const recurringArgs = (side: "left" | "right") => ({
      p_user_id: userId,
      p_device_id: `synthetic-recurring-${side}`,
      p_session_hash: `synthetic-recurring-session-${side}`,
      p_idempotency_key_hash: `recurring-occurrence-${side}`,
      p_request_hash: `recurring-occurrence-request-${side}`,
      p_operation_kind: "upsert",
      p_entity_type: "expense",
      p_entity_id: `recurring-occurrence-${side}`,
      p_expected_version: 0,
      p_payload: {
        id: `recurring-occurrence-${side}`,
        description: "Synthetic recurring occurrence",
        recurringExpenseId: "synthetic-rule",
        recurringOccurrenceKey: occurrenceKey,
      },
      p_content_hash: `recurring-occurrence-hash-${side}`,
    });

    const [left, right] = await Promise.all([
      admin.rpc("mutate_central_business_entity_v1", recurringArgs("left")),
      admin.rpc("mutate_central_business_entity_v1", recurringArgs("right")),
    ]);
    const accepted = [left, right].filter((result) => !result.error);
    const rejected = [left, right].filter((result) => result.error);
    expect(accepted).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.error).toMatchObject({
      code: "P4105",
      message: expect.stringContaining(
        "central recurring occurrence already exists",
      ),
    });

    const active = await admin
      .from("central_business_entities")
      .select("entity_id")
      .eq("user_id", userId)
      .eq("entity_type", "expense")
      .eq("deleted", false)
      .eq("current_payload->>recurringOccurrenceKey", occurrenceKey);
    expect(active.error).toBeNull();
    expect(active.data).toHaveLength(1);

    const duplicateBatch = await admin.rpc(
      "mutate_central_business_batch_v1",
      {
        p_user_id: userId,
        p_device_id: "synthetic-recurring-batch",
        p_session_hash: "synthetic-recurring-batch-session",
        p_operations: [
          {
            operationIndex: 0,
            idempotencyKeyHash: "recurring-rollback-customer",
            requestHash: "recurring-rollback-customer-request",
            operationKind: "upsert",
            entityType: "customer",
            entityId: "must-roll-back-with-recurring-duplicate",
            expectedVersion: 0,
            payload: {
              id: "must-roll-back-with-recurring-duplicate",
              name: "Must roll back",
            },
            contentHash: "recurring-rollback-customer-hash",
          },
          {
            operationIndex: 1,
            idempotencyKeyHash: "recurring-duplicate-batch-expense",
            requestHash: "recurring-duplicate-batch-expense-request",
            operationKind: "upsert",
            entityType: "expense",
            entityId: "recurring-occurrence-batch-duplicate",
            expectedVersion: 0,
            payload: {
              id: "recurring-occurrence-batch-duplicate",
              description: "Must not duplicate",
              recurringExpenseId: "synthetic-rule",
              recurringOccurrenceKey: occurrenceKey,
            },
            contentHash: "recurring-duplicate-batch-expense-hash",
          },
        ],
      },
    );
    expect(duplicateBatch.error?.code).toBe("P4105");

    const rolledBack = await admin
      .from("central_business_entities")
      .select("id")
      .eq("user_id", userId)
      .eq("entity_id", "must-roll-back-with-recurring-duplicate");
    expect(rolledBack.error).toBeNull();
    expect(rolledBack.data).toEqual([]);
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

    const browserBootstrap = await signedInUser.rpc(
      "bootstrap_central_business_entities_v1",
      {
        p_user_id: userId,
        p_device_id: "synthetic-reader",
        p_session_hash: "b".repeat(64),
        p_idempotency_key_hash: "c".repeat(64),
        p_request_hash: "d".repeat(64),
        p_snapshot_digest: "e".repeat(64),
        p_central_state_digest: "f".repeat(64),
        p_preview_digest: "1".repeat(64),
        p_entities: [],
      },
    );
    expect(browserBootstrap.data).toBeNull();
    expect(browserBootstrap.error).not.toBeNull();

    const browserBatch = await signedInUser.rpc(
      "mutate_central_business_batch_v1",
      {
        p_user_id: userId,
        p_device_id: "synthetic-reader",
        p_session_hash: "synthetic-session",
        p_operations: [],
      },
    );
    expect(browserBatch.data).toBeNull();
    expect(browserBatch.error).not.toBeNull();
  });
});
