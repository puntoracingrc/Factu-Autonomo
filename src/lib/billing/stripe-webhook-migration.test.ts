import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260713001000_stripe_webhook_idempotency.sql",
    import.meta.url,
  ),
  "utf8",
);
const rollback = readFileSync(
  new URL(
    "../../../supabase/rollbacks/20260713001000_stripe_webhook_idempotency.down.sql",
    import.meta.url,
  ),
  "utf8",
);

const rpcSignatures = [
  "reserve_stripe_event_attempt",
  "complete_stripe_event_attempt",
  "fail_stripe_event_attempt",
  "complete_stripe_scan_pack_event",
] as const;

describe("Stripe webhook idempotency migration", () => {
  it("persiste lease, intento y efecto único por checkout", () => {
    expect(migration).toContain("add column if not exists attempt_token uuid");
    expect(migration).toContain("add column if not exists lease_expires_at");
    expect(migration).toContain("add column if not exists attempt_count");
    expect(migration).toContain("legacy_review_required boolean");
    expect(migration).toContain("effect_fulfillment_contract text");
    expect(migration).toContain("stripe_events_effect_key_unique_idx");
    expect(migration).toContain("'scan_pack:' || p_checkout_session_id");
    expect(migration).toContain("pg_advisory_xact_lock");
  });

  it("aparca sin reclamar los intentos ambiguos anteriores al contrato", () => {
    expect(migration).toMatch(
      /set status = 'failed',[\s\S]*legacy_review_required = true[\s\S]*where status in \('processing', 'failed'\)/,
    );
    expect(migration).toContain("if v_event.legacy_review_required then");
    expect(migration).toContain("'manual_review'::text");
    expect(migration).not.toContain("already-expired lease");
  });

  it("exige procedencia versionada y no acepta NULL como efecto válido", () => {
    expect(migration).toContain(
      "p_fulfillment_contract is distinct from 'scan_pack_atomic_v1'",
    );
    expect(migration).toContain(
      "effect_fulfillment_contract is not distinct from 'scan_pack_atomic_v1'",
    );
    expect(migration).toContain("effect_scan_credits is not null");
    expect(migration).toContain("effect_ai_credit_units is not null");
    expect(migration).toContain("p_scan_credits is distinct from 10");
    expect(migration).toContain("p_units_per_scan is distinct from 10");
    expect(migration).toContain(
      "v_effect.effect_kind is distinct from 'scan_pack'",
    );
    expect(migration).toContain(
      "effect_payment_status is not distinct from 'paid'",
    );
  });

  it("hace indivisibles el crédito y el cierre del evento", () => {
    const functionBody = migration.slice(
      migration.indexOf(
        "create or replace function public.complete_stripe_scan_pack_event",
      ),
      migration.indexOf(
        "revoke all on function public.reserve_stripe_event_attempt",
      ),
    );
    expect(functionBody).toContain("update public.user_subscriptions");
    expect(functionBody).toContain(
      "scan_credits = scan_credits + p_scan_credits",
    );
    expect(functionBody).toContain("status = 'processed'");
    expect(functionBody).toContain("effect_payment_status = 'paid'");
    expect(functionBody).toContain(
      "raise exception 'Stripe scan pack subscription missing'",
    );
  });

  it("limita todas las RPC al service role", () => {
    expect(migration.match(/set search_path = ''/g)).toHaveLength(
      rpcSignatures.length,
    );
    for (const name of rpcSignatures) {
      expect(migration).toContain(`auth.role() <> 'service_role'`);
      expect(migration).toContain(`revoke all on function public.${name}`);
      expect(migration).toMatch(
        new RegExp(
          `grant execute on function public\\.${name}\\([\\s\\S]*?\\) to service_role;`,
        ),
      );
      expect(migration).not.toMatch(
        new RegExp(
          `grant execute on function public\\.${name}\\([\\s\\S]*?\\) to (?:public|anon|authenticated);`,
        ),
      );
    }
  });

  it("mantiene un rollback explícito del contrato", () => {
    for (const name of rpcSignatures) {
      expect(rollback).toContain(`drop function if exists public.${name}`);
    }
    expect(rollback).toContain(
      "drop index if exists public.stripe_events_effect_key_unique_idx",
    );
    expect(rollback).toContain("drop column if exists attempt_token");
    expect(rollback).toContain("drop column if exists effect_key");
    expect(rollback).toContain("rollback is unsafe, use a forward fix");
    expect(rollback).toContain("where effect_key is not null");
  });
});
