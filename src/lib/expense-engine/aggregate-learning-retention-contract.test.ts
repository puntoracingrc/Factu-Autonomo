import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260722190000_expense_learning_retention_p4a.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();

const rollback = readFileSync(
  new URL(
    "../../../supabase/rollbacks/20260722190000_expense_learning_retention_p4a.down.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();

function functionBody(schema: string, name: string) {
  const start = migration.indexOf(`function ${schema}.${name}(`);
  expect(start).toBeGreaterThanOrEqual(0);
  const bodyStart = migration.indexOf("as $$", start);
  const end = migration.indexOf("$$;", bodyStart + 5);
  expect(bodyStart).toBeGreaterThan(start);
  expect(end).toBeGreaterThan(bodyStart);
  return migration.slice(bodyStart, end);
}

describe("expense learning P4A retention contract", () => {
  it("keeps submit and promotion dormant while making only purge operational", () => {
    expect(migration).not.toContain(
      "create or replace function public.submit_expense_learning_contribution_v1",
    );
    expect(migration).not.toContain(
      "create or replace function public.promote_expense_learning_closed_weeks_v1",
    );
    expect(functionBody("public", "purge_expense_learning_retention_v1")).toContain(
      "run_expense_learning_retention_v1",
    );
    expect(migration).not.toMatch(/insert\s+into\s+expense_learning_private\.closed_week_supported_metrics/iu);
  });

  it("uses owner-only maintenance with no raw Data API grants", () => {
    expect(migration).toContain(
      "revoke all on all functions in schema expense_learning_private\n  from public, anon, authenticated, service_role",
    );
    expect(migration).toContain(
      "grant execute on function public.purge_expense_learning_retention_v1()\n  to service_role",
    );
    expect(migration).not.toMatch(
      /grant\s+(?:all|usage|select|insert|update|delete)[^;]*expense_learning_private/iu,
    );
    expect(migration).toContain(
      "create policy expense_learning_revocation_links_owner_lock_v1",
    );
    expect(migration).toContain(
      "for update to expense_learning_storage_owner\n  using (true)\n  with check (false)",
    );
  });

  it("allows the owner to read and delete only expired promoted metrics", () => {
    expect(migration).toContain(
      "create policy expense_learning_closed_metrics_owner_select_v1",
    );
    expect(migration).toContain(
      "create policy expense_learning_closed_metrics_owner_delete_v1",
    );
    expect(migration).not.toContain(
      "expense_learning_closed_metrics_owner_insert_v1",
    );
    expect(migration).not.toContain(
      "expense_learning_closed_metrics_owner_update_v1",
    );
    expect(functionBody("expense_learning_private", "run_expense_learning_retention_v1")).toContain(
      "delete from expense_learning_private.closed_week_supported_metrics",
    );
  });

  it("requires complete 67-coordinate groups and unique linkability", () => {
    const validator = functionBody(
      "expense_learning_private",
      "is_expense_learning_week_source_canonical_v1",
    );
    expect(validator).toContain("v_membership_count < v_link_count * 67");
    expect(validator).toContain("v_membership_count > v_link_count * 268");
    expect(validator).toContain("pg_catalog.mod");
    expect(validator).toContain("group_source.coordinate_count <> 67");
    expect(validator).toContain("is_canonical_contribution_v1");
    expect(validator).toContain("is_canonical_metric_bucket_v1");
    expect(validator).toContain("expense_learning_coordinate_hmac_v1");
    expect(validator).toContain(") <> 1");
  });

  it("repairs only derived accumulators from canonical memberships", () => {
    const repair = functionBody(
      "expense_learning_private",
      "reconcile_expense_learning_week_v1",
    );
    expect(repair).toContain("expense-learning-accumulator-mutation-v1");
    expect(repair).toContain("lock_expense_learning_week_cells_v1");
    expect(repair).toContain("is_expense_learning_week_source_canonical_v1");
    expect(repair).toContain(
      "insert into expense_learning_private.protected_accumulators",
    );
    expect(repair).not.toContain(
      "insert into expense_learning_private.accumulator_memberships",
    );
    expect(repair).not.toContain(
      "delete from expense_learning_private.accumulator_memberships",
    );
  });

  it("keeps the delete trigger strict for irreparable source", () => {
    const linkValidator = functionBody(
      "expense_learning_private",
      "is_expense_learning_link_source_canonical_v1",
    );
    const trigger = functionBody(
      "expense_learning_private",
      "purge_expense_learning_link_v1",
    );
    expect(linkValidator).toContain("v_membership_count not between 67 and 268");
    expect(linkValidator).toContain("pg_catalog.mod(v_membership_count, 67)");
    expect(linkValidator).toContain("group_source.coordinate_count <> 67");
    expect(linkValidator).toContain("is_canonical_contribution_v1");
    expect(linkValidator).toContain("expense_learning_coordinate_hmac_v1");
    expect(linkValidator).toContain(") <> 1");
    expect(trigger).toContain("is_expense_learning_link_source_canonical_v1");
    expect(trigger).toContain(
      "is_expense_learning_week_accumulator_consistent_v1",
    );
    expect(trigger).toContain("reconcile_expense_learning_week_v1");
    expect(trigger).toContain("expense_learning_link_source_corrupt");
    expect(trigger).toContain("expense_learning_link_purge_incomplete");
    expect(trigger).toContain(
      "delete from expense_learning_private.accumulator_memberships",
    );
  });

  it("selects historical revocation debt without hiding it after regrant", () => {
    const eligible = functionBody(
      "expense_learning_private",
      "is_expense_learning_link_cleanup_eligible_v1",
    );
    expect(eligible).toContain("decision.granted = false");
    expect(eligible).toContain(
      "decision.decided_at >=\n              (link.week_start::timestamp at time zone 'utc')",
    );
    expect(eligible).not.toContain("order by decision.decision_id desc");
  });

  it("persists REVOKED outside the contained cleanup attempt", () => {
    const setter = functionBody(
      "public",
      "set_expense_learning_consent_v1",
    );
    const insertIndex = setter.indexOf(
      "insert into expense_learning_private.learning_consent_decisions",
    );
    const cleanupBlockIndex = setter.indexOf("if v_granted is false then");
    expect(insertIndex).toBeGreaterThanOrEqual(0);
    expect(cleanupBlockIndex).toBeGreaterThan(insertIndex);
    expect(setter).toContain("attempt_expense_learning_link_cleanup_v1");
    expect(setter).toContain(
      "is_expense_learning_week_accumulator_consistent_v1",
    );
    expect(setter).toContain("when others then\n        null");
    expect(setter).not.toContain("purged");
    expect(setter).not.toContain("retry_required");
  });

  it("locks all candidate users before the global accumulator mutex", () => {
    const purge = functionBody(
      "expense_learning_private",
      "run_expense_learning_retention_v1",
    );
    const userLoop = purge.indexOf("for v_user_id in");
    const userLock = purge.indexOf("expense-learning-consent-v1:");
    const globalLock = purge.indexOf(
      "expense-learning-accumulator-mutation-v1",
    );
    const rowLocks = purge.indexOf("for update of link skip locked");
    expect(userLoop).toBeGreaterThanOrEqual(0);
    expect(userLock).toBeGreaterThan(userLoop);
    expect(globalLock).toBeGreaterThan(userLock);
    expect(rowLocks).toBeGreaterThan(globalLock);
    expect(purge).toContain("order by candidate.user_id::text");
    expect(purge).toContain("v_locked_link_user_ids");
    expect(purge).toContain("v_locked_link_week_starts");
  });

  it("returns only bounded generic maintenance states", () => {
    const purge = functionBody(
      "expense_learning_private",
      "run_expense_learning_retention_v1",
    );
    expect(purge).toContain("return 'retry_required'");
    expect(purge).toContain("return 'purged'");
    expect(purge).not.toContain("jsonb_build_object");
    expect(purge).not.toContain("raise notice");
  });

  it("deletes only rows that are already eligible by expires_at", () => {
    const purge = functionBody(
      "expense_learning_private",
      "run_expense_learning_retention_v1",
    );
    expect(purge).toContain("claim.expires_at <= p_now");
    expect(purge).toContain("link.expires_at <= p_now");
    expect(purge).toContain("membership.expires_at <= p_now");
    expect(purge).toContain("accumulator.expires_at <= p_now");
    expect(purge).toContain("metric.expires_at <= p_now");
  });

  it("restores P3A setter and disabled purge on a guarded rollback", () => {
    expect(rollback).toContain(
      "expense learning p4a storage is not empty; rollback is unsafe",
    );
    expect(rollback).toContain(
      "create or replace function public.set_expense_learning_consent_v1",
    );
    expect(rollback).toContain("return 'disabled'");
    expect(rollback).toContain(
      "drop policy expense_learning_closed_metrics_owner_delete_v1",
    );
    expect(rollback).toContain(
      "drop policy expense_learning_revocation_links_owner_lock_v1",
    );
    expect(rollback).not.toContain("cascade");
  });
});
