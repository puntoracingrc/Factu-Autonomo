import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const localAcceptanceEnabled =
  process.env.BILLING_QUOTA_LOCAL_POSTGRES_ENABLED === "true";
const describeLocal = localAcceptanceEnabled ? describe : describe.skip;
const localHosts = new Set(["127.0.0.1", "localhost", "::1"]);

let admin: SupabaseClient;
const createdUserIds = new Set<string>();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required local env var: ${name}`);
  return value;
}

function firstRow(value: unknown): Record<string, unknown> {
  if (!Array.isArray(value) || value.length !== 1) {
    throw new Error("Expected one RPC row.");
  }
  const row = value[0];
  if (!row || typeof row !== "object") throw new Error("Invalid RPC row.");
  return row as Record<string, unknown>;
}

async function createSyntheticUser(): Promise<string> {
  const created = await admin.auth.admin.createUser({
    email: `quota-${randomUUID()}@example.test`,
    password: `Quota-${randomUUID()}!`,
    email_confirm: true,
  });
  if (created.error || !created.data.user) {
    throw new Error(created.error?.message ?? "Could not create quota user.");
  }
  createdUserIds.add(created.data.user.id);
  return created.data.user.id;
}

async function reserve(input: {
  userId: string;
  operationKey: string;
  metric?: "documents" | "manual_expenses" | "customers";
  periodKey?: string;
  includedLimit?: number;
  subjectId?: string | null;
  now?: string;
  leaseSeconds?: number;
}) {
  const metric = input.metric ?? "documents";
  const { data, error } = await admin.rpc("reserve_billing_quota_claim", {
    p_user_id: input.userId,
    p_metric: metric,
    p_period_key:
      input.periodKey ?? (metric === "customers" ? "lifetime" : "2026-08"),
    p_operation_key: input.operationKey,
    p_subject_id: input.subjectId ?? null,
    p_plan: "free",
    p_included_limit: input.includedLimit ?? 15,
    p_reset_at:
      metric === "customers" ? null : "2026-08-31T22:00:00.000Z",
    p_source: "app",
    p_lease_seconds: input.leaseSeconds ?? 900,
    p_now: input.now ?? "2026-08-26T12:00:00.000Z",
  });
  if (error) throw error;
  return firstRow(data);
}

describeLocal.sequential(
  "billing quota local PostgreSQL acceptance",
  { timeout: 30_000 },
  () => {
    beforeAll(() => {
      const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
      if (!localHosts.has(new URL(url).hostname)) {
        throw new Error("Billing quota acceptance requires localhost.");
      }
      admin = createClient(url, requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    });

    afterAll(async () => {
      for (const userId of createdUserIds) {
        await admin.auth.admin.deleteUser(userId);
      }
    });

    it("serializa dos dispositivos y solo admite quince documentos", async () => {
      const userId = await createSyntheticUser();
      const attempts = await Promise.all(
        Array.from({ length: 20 }, (_, index) =>
          reserve({ userId, operationKey: `device-${index % 2}:doc-${index}` }),
        ),
      );

      expect(attempts.filter((row) => row.allowed === true)).toHaveLength(15);
      expect(attempts.filter((row) => row.allowed === false)).toHaveLength(5);

      const blocks = await admin
        .from("billing_quota_block_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("metric", "documents");
      expect(blocks.error).toBeNull();
      expect(blocks.count).toBe(5);
    });

    it("mantiene idempotencia y separa completamente las cuentas", async () => {
      const firstUser = await createSyntheticUser();
      const secondUser = await createSyntheticUser();

      const [first, replay, otherTenant] = await Promise.all([
        reserve({ userId: firstUser, operationKey: "same-operation" }),
        reserve({ userId: firstUser, operationKey: "same-operation" }),
        reserve({ userId: secondUser, operationKey: "same-operation" }),
      ]);

      expect(first.allowed).toBe(true);
      expect(replay.allowed).toBe(true);
      expect(replay.claim_id).toBe(first.claim_id);
      expect(otherTenant.allowed).toBe(true);
      expect(otherTenant.claim_id).not.toBe(first.claim_id);

      const firstClaims = await admin
        .from("billing_quota_claims")
        .select("id", { count: "exact", head: true })
        .eq("user_id", firstUser);
      const secondClaims = await admin
        .from("billing_quota_claims")
        .select("id", { count: "exact", head: true })
        .eq("user_id", secondUser);
      expect(firstClaims.count).toBe(1);
      expect(secondClaims.count).toBe(1);
    });

    it("rechaza una confirmación tardía y devuelve el crédito reservado", async () => {
      const userId = await createSyntheticUser();
      const entitlement = await admin.from("billing_quota_entitlements").insert({
        user_id: userId,
        metric: "documents",
        credit_balance: 1,
        capacity_bonus: 0,
      });
      if (entitlement.error) throw entitlement.error;

      const claim = await reserve({
        userId,
        operationKey: "expiring-credit",
        includedLimit: 0,
        leaseSeconds: 30,
        now: "2026-08-26T12:00:00.000Z",
      });
      expect(claim.allowed).toBe(true);
      expect(claim.credit_balance).toBe(0);

      const committed = await admin.rpc("commit_billing_quota_claim", {
        p_user_id: userId,
        p_claim_id: claim.claim_id,
        p_subject_id: "late-document",
        p_now: "2026-08-26T12:00:31.000Z",
      });
      if (committed.error) throw committed.error;
      expect(firstRow(committed.data).result_status).toBe("expired");

      const credits = await admin
        .from("billing_quota_entitlements")
        .select("credit_balance")
        .eq("user_id", userId)
        .eq("metric", "documents")
        .single();
      expect(credits.error).toBeNull();
      expect(credits.data?.credit_balance).toBe(1);
    });

    it("recupera en el mes nuevo un crédito cuya reserva venció tras el reinicio", async () => {
      const userId = await createSyntheticUser();
      const entitlement = await admin.from("billing_quota_entitlements").insert({
        user_id: userId,
        metric: "documents",
        credit_balance: 1,
        capacity_bonus: 0,
      });
      if (entitlement.error) throw entitlement.error;

      const august = await reserve({
        userId,
        operationKey: "august-expiring-credit",
        periodKey: "2026-08",
        includedLimit: 0,
        leaseSeconds: 30,
        now: "2026-08-31T21:59:40.000Z",
      });
      expect(august.allowed).toBe(true);

      const september = await reserve({
        userId,
        operationKey: "september-credit",
        periodKey: "2026-09",
        includedLimit: 0,
        now: "2026-08-31T22:00:11.000Z",
      });
      expect(september.allowed).toBe(true);
      expect(september.credit_balance).toBe(0);

      const augustClaim = await admin
        .from("billing_quota_claims")
        .select("state")
        .eq("id", august.claim_id)
        .single();
      expect(augustClaim.error).toBeNull();
      expect(augustClaim.data?.state).toBe("released");
    });

    it("concede un checkout una sola vez aunque Stripe envíe dos eventos", async () => {
      const userId = await createSyntheticUser();
      const checkoutSessionId = `cs_test_${randomUUID().replaceAll("-", "")}`;

      const completeEvent = async (eventId: string) => {
        const reservation = await admin.rpc("reserve_stripe_event_attempt", {
          p_event_id: eventId,
          p_event_type: "checkout.session.completed",
          p_lease_seconds: 300,
          p_claimed_at: "2026-08-26T12:00:00.000Z",
        });
        if (reservation.error) throw reservation.error;
        const lease = firstRow(reservation.data);
        const completion = await admin.rpc("complete_stripe_quota_pack_event", {
          p_event_id: eventId,
          p_attempt_token: lease.lease_token,
          p_user_id: userId,
          p_checkout_session_id: checkoutSessionId,
          p_pack_key: "contacts_5",
          p_quantity: 5,
          p_payment_status: "paid",
          p_fulfillment_contract: "quota_pack_atomic_v1",
          p_completed_at: "2026-08-26T12:01:00.000Z",
        });
        if (completion.error) throw completion.error;
        return firstRow(completion.data);
      };

      const first = await completeEvent(`evt_${randomUUID()}`);
      const replay = await completeEvent(`evt_${randomUUID()}`);
      expect(first).toMatchObject({
        result_status: "applied",
        granted_quantity: 5,
      });
      expect(replay).toMatchObject({
        result_status: "already_applied",
        granted_quantity: 0,
      });

      const entitlements = await admin
        .from("billing_quota_entitlements")
        .select("metric,capacity_bonus")
        .eq("user_id", userId)
        .in("metric", ["customers", "suppliers"]);
      expect(entitlements.error).toBeNull();
      expect(entitlements.data).toEqual(
        expect.arrayContaining([
          { metric: "customers", capacity_bonus: 5 },
          { metric: "suppliers", capacity_bonus: 5 },
        ]),
      );
    });
  },
);
