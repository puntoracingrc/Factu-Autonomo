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
    throw new Error(
      "Central business authority acceptance requires localhost.",
    );
  }
}

function mutationArgs(input: {
  idempotencyKey: string;
  requestHash: string;
  operation?: "upsert" | "delete";
  expectedVersion: number;
  payload?: Record<string, unknown> | null;
  contentHash: string;
  entityType?: "customer" | "quote" | "receipt";
  entityId?: string;
}) {
  const operation = input.operation ?? "upsert";
  return {
    p_user_id: userId,
    p_device_id: "synthetic-local-device",
    p_session_hash: "synthetic-local-session-hash",
    p_idempotency_key_hash: input.idempotencyKey,
    p_request_hash: input.requestHash,
    p_operation_kind: operation,
    p_entity_type: input.entityType ?? "customer",
    p_entity_id: input.entityId ?? "synthetic-customer",
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
    await admin
      .from("central_business_commands")
      .delete()
      .eq("user_id", userId);
    await admin.from("central_business_outbox").delete().eq("user_id", userId);
    await admin
      .from("central_business_entities")
      .delete()
      .eq("user_id", userId);
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

    const identicalRetry = await mutate(
      mutationArgs({
        idempotencyKey: "same-state-new-command",
        requestHash: "same-state-new-command-request",
        expectedVersion: 1,
        payload: { name: "Canonical" },
        contentHash: "hash-canonical",
      }),
    );
    expect(identicalRetry.error).toBeNull();
    expect(identicalRetry.data).toEqual([
      expect.objectContaining({
        result_status: "replayed",
        entity_version: 2,
        deleted: false,
      }),
    ]);

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

    const { count: eventCount, error: eventCountError } = await admin
      .from("central_business_outbox")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("entity_type", "customer")
      .eq("entity_id", "synthetic-customer");
    expect(eventCountError).toBeNull();
    expect(eventCount).toBe(2);
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

  it.each([
    ["quote", "synthetic-quote", "presupuesto", "8".repeat(64)],
    ["receipt", "synthetic-receipt", "recibo", "9".repeat(64)],
  ] as const)(
    "commits a versioned %s without opening the fiscal invoice type",
    async (entityType, entityId, documentType, contentHash) => {
      const result = await mutate(
        mutationArgs({
          idempotencyKey: `create-${entityType}`,
          requestHash: `request-${entityType}`,
          expectedVersion: 0,
          entityType,
          entityId,
          payload: { id: entityId, type: documentType },
          contentHash,
        }),
      );

      expect(result.error).toBeNull();
      expect(result.data).toEqual([
        expect.objectContaining({
          result_status: "committed",
          entity_version: 1,
          deleted: false,
        }),
      ]);
    },
  );

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
        {
          entityType: "quote",
          entityId: "synthetic-quote",
          payload: {
            id: "synthetic-quote",
            type: "presupuesto",
          },
          contentHash: "8".repeat(64),
          idempotencyKeyHash: "a".repeat(64),
          requestHash: "b".repeat(64),
        },
        {
          entityType: "receipt",
          entityId: "synthetic-receipt",
          payload: {
            id: "synthetic-receipt",
            type: "recibo",
          },
          contentHash: "9".repeat(64),
          idempotencyKeyHash: "c".repeat(64),
          requestHash: "d".repeat(64),
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
        identical_count: 2,
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
        identical_count: 2,
      }),
    ]);

    const fiscalInvoice = await admin.rpc(
      "bootstrap_central_business_entities_v1",
      {
        ...args,
        p_idempotency_key_hash: "f".repeat(64),
        p_request_hash: "0".repeat(64),
        p_entities: [
          {
            entityType: "invoice",
            entityId: "forbidden-invoice",
            payload: { id: "forbidden-invoice", type: "factura" },
            contentHash: "1".repeat(64),
            idempotencyKeyHash: "2".repeat(64),
            requestHash: "3".repeat(64),
          },
        ],
      },
    );
    expect(fiscalInvoice.error?.code).toBe("P4110");

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

    const updateAndDelete = await admin.rpc(
      "mutate_central_business_batch_v1",
      {
        p_user_id: userId,
        p_device_id: "synthetic-batch-device",
        p_session_hash: "synthetic-batch-session",
        p_operations: [
          {
            operationIndex: 0,
            idempotencyKeyHash: "batch-supplier-update",
            requestHash: "batch-supplier-update-request",
            operationKind: "upsert",
            entityType: "supplier",
            entityId: "batch-supplier",
            expectedVersion: 1,
            payload: {
              id: "batch-supplier",
              name: "Synthetic batch supplier updated",
            },
            contentHash: "batch-supplier-updated-hash",
          },
          {
            operationIndex: 1,
            idempotencyKeyHash: "batch-expense-delete",
            requestHash: "batch-expense-delete-request",
            operationKind: "delete",
            entityType: "expense",
            entityId: "batch-expense",
            expectedVersion: 1,
            payload: null,
            contentHash: "batch-expense-deleted-hash",
          },
        ],
      },
    );
    expect(updateAndDelete.error).toBeNull();
    expect(updateAndDelete.data).toEqual([
      expect.objectContaining({
        operation_index: 0,
        result_status: "committed",
        entity_version: 2,
        deleted: false,
      }),
      expect.objectContaining({
        operation_index: 1,
        result_status: "committed",
        entity_version: 2,
        deleted: true,
      }),
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

  it("commits exactly 100 operations and rejects 101", async () => {
    const maximum = Array.from({ length: 100 }, (_, index) => ({
      operationIndex: index,
      idempotencyKeyHash: `capacity-idempotency-${index}`,
      requestHash: `capacity-request-${index}`,
      operationKind: "upsert",
      entityType: "customer",
      entityId: `capacity-customer-${index}`,
      expectedVersion: 0,
      payload: {
        id: `capacity-customer-${index}`,
        name: `Capacity customer ${index}`,
      },
      contentHash: `capacity-hash-${index}`,
    }));
    const committed = await admin.rpc("mutate_central_business_batch_v1", {
      p_user_id: userId,
      p_device_id: "synthetic-capacity-device",
      p_session_hash: "synthetic-capacity-session",
      p_operations: maximum,
    });
    expect(committed.error).toBeNull();
    expect(committed.data).toHaveLength(100);
    expect(committed.data?.at(-1)).toMatchObject({
      operation_index: 99,
      result_status: "committed",
      entity_version: 1,
    });

    const overflow = await admin.rpc("mutate_central_business_batch_v1", {
      p_user_id: userId,
      p_device_id: "synthetic-capacity-device",
      p_session_hash: "synthetic-capacity-session",
      p_operations: [
        ...maximum.map((operation, index) => ({
          ...operation,
          operationIndex: index,
          idempotencyKeyHash: `overflow-idempotency-${index}`,
          requestHash: `overflow-request-${index}`,
          entityId: `overflow-customer-${index}`,
          payload: {
            id: `overflow-customer-${index}`,
            name: `Overflow customer ${index}`,
          },
          contentHash: `overflow-hash-${index}`,
        })),
        {
          operationIndex: 100,
          idempotencyKeyHash: "overflow-idempotency-100",
          requestHash: "overflow-request-100",
          operationKind: "upsert",
          entityType: "customer",
          entityId: "overflow-customer-100",
          expectedVersion: 0,
          payload: {
            id: "overflow-customer-100",
            name: "Overflow customer 100",
          },
          contentHash: "overflow-hash-100",
        },
      ],
    });
    expect(overflow.error?.code).toBe("P4120");

    const partial = await admin
      .from("central_business_entities")
      .select("id")
      .eq("user_id", userId)
      .like("entity_id", "overflow-customer-%");
    expect(partial.error).toBeNull();
    expect(partial.data).toEqual([]);
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

    const duplicateBatch = await admin.rpc("mutate_central_business_batch_v1", {
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
    });
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
