import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260826134002_central_free_plan_quotas.sql",
    import.meta.url,
  ),
  "utf8",
);
const rollback = readFileSync(
  new URL(
    "../../../supabase/rollbacks/20260826134002_central_free_plan_quotas.down.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("central quota schema contract", () => {
  it("mantiene cuotas, bloqueos y compras privadas para service_role", () => {
    for (const table of [
      "billing_quota_entitlements",
      "billing_quota_claims",
      "billing_quota_block_events",
      "billing_quota_pack_purchases",
    ]) {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
      expect(migration).toContain(`grant all on table public.${table} to service_role`);
    }
    expect(migration).toContain(
      "revoke all on table public.billing_quota_block_events",
    );
  });

  it("serializa reservas y acredita cada checkout una sola vez", () => {
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("billing_quota_claims_operation_unique");
    expect(migration).toContain("stripe_checkout_session_id text not null unique");
    expect(migration).toContain("complete_stripe_quota_pack_event");
    expect(migration).toContain("quota_pack_atomic_v1");
  });

  it("impide confirmar una reserva caducada y devuelve su crédito", () => {
    expect(migration).toContain("if v_claim.lease_expires_at <= v_now then");
    expect(migration).toContain(
      "return query select 'expired'::text, v_claim.id, 'released'::text",
    );
    expect(migration).toContain(
      "credit_balance = public.billing_quota_entitlements.credit_balance + 1",
    );
  });

  it("registra bloqueos sin guardar ids de fichas de negocio", () => {
    const blockTable = migration.slice(
      migration.indexOf("create table if not exists public.billing_quota_block_events"),
      migration.indexOf("create table if not exists public.billing_quota_pack_purchases"),
    );
    expect(blockTable).toContain("user_id uuid");
    expect(blockTable).toContain("metric text");
    expect(blockTable).not.toContain("subject_id");
    expect(blockTable).not.toContain("operation_key");
  });

  it("incluye una retirada reversible completa", () => {
    expect(rollback).toContain("drop function if exists public.release_billing_quota_subject");
    expect(rollback).toContain("drop table if exists public.billing_quota_block_events");
    expect(rollback.trim().endsWith("commit;")).toBe(true);
  });
});
