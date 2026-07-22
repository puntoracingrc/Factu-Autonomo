import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260723010000_expense_learning_operations_p4c.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();

const rollback = readFileSync(
  new URL(
    "../../../supabase/rollbacks/20260723010000_expense_learning_operations_p4c.down.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();

function functionBody(source: string, schema: string, name: string) {
  const start = source.indexOf(`function ${schema}.${name}(`);
  expect(start).toBeGreaterThanOrEqual(0);
  const bodyStart = source.indexOf("as $$", start);
  const end = source.indexOf("$$;", bodyStart + 5);
  expect(bodyStart).toBeGreaterThan(start);
  expect(end).toBeGreaterThan(bodyStart);
  return source.slice(bodyStart, end);
}

describe("expense learning P4C operational primitives contract", () => {
  it("fails closed unless the exact dormant P4B prerequisites exist", () => {
    expect(migration).toContain("expense_learning_p4c_prerequisite_invalid");
    expect(migration).toContain(
      "expense_learning_private.stage_expense_learning_contribution_v1(uuid,jsonb,bytea,bytea)",
    );
    expect(migration).toContain(
      "expense_learning_private.run_expense_learning_retention_v1(timestamp with time zone)",
    );
    expect(migration).toContain(
      "expense_learning_private.closed_week_promotion_batches",
    );
    expect(migration).toContain("return ''disabled''");
    expect(migration).toContain("expense_learning_p4c_function_state_invalid");
  });

  it("keeps the retention lookahead private, fixed, and non-configurable", () => {
    const lookahead = functionBody(
      migration,
      "expense_learning_private",
      "expense_learning_retention_lookahead_v1",
    );
    expect(lookahead).toContain("interval '4 hours'");
    expect(migration).toContain("returns interval\nlanguage sql\nimmutable");
    expect(migration).toContain(
      "expense_learning_retention_lookahead_v1()\n  from public, anon, authenticated, service_role",
    );
    expect(migration).not.toMatch(
      /grant\s+execute\s+on\s+function\s+expense_learning_private\.expense_learning_retention_lookahead_v1/iu,
    );
  });

  it("opens only the service wrapper over the canonical private stage", () => {
    const submit = functionBody(
      migration,
      "public",
      "submit_expense_learning_contribution_v1",
    );
    const claimValidation = submit.indexOf(
      "p_claim_token_digest !~ '^[0-9a-f]{64}$'",
    );
    const decode = submit.indexOf(
      "pg_catalog.decode(p_claim_token_digest, 'hex')",
    );
    const stage = submit.indexOf(
      "expense_learning_private.stage_expense_learning_contribution_v1",
    );

    expect(submit).toContain("is_service_role_request_v1");
    expect(claimValidation).toBeGreaterThanOrEqual(0);
    expect(stage).toBeGreaterThan(claimValidation);
    expect(decode).toBeGreaterThan(claimValidation);
    for (const result of [
      "accepted",
      "replayed",
      "not_consented",
      "withdrawal_cooldown",
      "cap_reached",
    ]) {
      expect(submit).toContain(`'${result}'`);
    }
    expect(submit).toContain("expense_learning_rpc_invalid_result");
    expect(submit).not.toContain("raise notice");
    expect(submit).not.toContain("return p_");
  });

  it("runs retention four hours ahead without exposing a clock argument", () => {
    const purge = functionBody(
      migration,
      "public",
      "purge_expense_learning_retention_v1",
    );
    expect(purge).toContain("is_service_role_request_v1");
    expect(purge).toContain("pg_catalog.clock_timestamp()");
    expect(purge).toContain(
      "+ expense_learning_private.expense_learning_retention_lookahead_v1()",
    );
    expect(migration).toContain(
      "grant execute on function public.purge_expense_learning_retention_v1()\n  to service_role",
    );
    expect(migration).not.toMatch(
      /grant\s+execute[^;]*(?:anon|authenticated)/iu,
    );
  });

  it("does not add a scheduler, reader, Admin surface, or activation flag", () => {
    expect(migration).not.toMatch(/cron|scheduler|workflow|admin|next_public/iu);
    expect(migration).not.toContain("expense_learning_ingestion_enabled");
    expect(migration).not.toContain("expense_learning_wiring_enabled");
    expect(migration).not.toMatch(
      /create\s+(?:or\s+replace\s+)?function\s+public\.(?:get|read|list)_expense_learning/iu,
    );
  });

  it("rolls back by disabling intake and restoring the exact P4A clock", () => {
    const submit = functionBody(
      rollback,
      "public",
      "submit_expense_learning_contribution_v1",
    );
    const purge = functionBody(
      rollback,
      "public",
      "purge_expense_learning_retention_v1",
    );
    expect(submit).toContain("return 'disabled'");
    expect(submit).not.toContain("stage_expense_learning_contribution_v1");
    expect(purge).toContain(
      "expense_learning_private.run_expense_learning_retention_v1(\n    pg_catalog.clock_timestamp()\n  )",
    );
    expect(rollback).toContain(
      "drop function\n  expense_learning_private.expense_learning_retention_lookahead_v1()\n  restrict",
    );
    expect(rollback).not.toMatch(/drop\s+table|delete\s+from|truncate/iu);
    expect(rollback).not.toContain("cascade");
  });
});
