import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260722230000_expense_learning_promotion_p4b.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();

const rollback = readFileSync(
  new URL(
    "../../../supabase/rollbacks/20260722230000_expense_learning_promotion_p4b.down.sql",
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

describe("expense learning P4B promotion contract", () => {
  it("uses one canonical HUMAN_REVIEW marginal and no other coordinate", () => {
    expect(migration).toContain(
      "metric_family = 'human_review'\n      and comparison_scope = 'none'\n      and metric_key = 'value'",
    );
    expect(migration).not.toContain("'status'");
    expect(migration).not.toMatch(
      /insert\s+into\s+expense_learning_private\.closed_week_supported_metrics[\s\S]*?'credit_sign_corrected'/iu,
    );
    expect(migration).toContain(
      "closed_week_supported_metrics_p4b_allowlist_v1",
    );
  });

  it("removes exact promoted counts and keeps only closed support bands", () => {
    expect(migration).toContain("drop column supporting_contributors");
    expect(migration).toContain("add column support_band text not null");
    for (const band of ["k10_19", "k20_49", "k50_99", "k100_plus"]) {
      expect(migration).toContain(`'${band}'`);
    }
    expect(migration).not.toMatch(
      /insert\s+into\s+expense_learning_private\.closed_week_supported_metrics\s*\([^)]*supporting_contributors/iu,
    );
  });

  it("keys the tombstone only by the irreversible batch identity", () => {
    const tableStart = migration.indexOf(
      "create table expense_learning_private.closed_week_promotion_batches",
    );
    const tableEnd = migration.indexOf(");", tableStart);
    const table = migration.slice(tableStart, tableEnd);
    const primaryKeyStart = table.indexOf("primary key (");
    const primaryKeyEnd = table.indexOf(")", primaryKeyStart);
    const primaryKey = table.slice(primaryKeyStart, primaryKeyEnd);

    expect(primaryKey).toContain("week_start");
    expect(primaryKey).toContain("structural_archetype_group");
    expect(primaryKey).not.toContain("privacy_evaluation_version");
    expect(table).toContain("expense-learning-human-review-coarsening.v1");
    expect(table).not.toContain("expires_at");
    expect(table).not.toContain("support");
  });

  it("keeps marker and metrics immutable behind owner-only RLS", () => {
    expect(migration).toContain(
      "alter table expense_learning_private.closed_week_promotion_batches\n  force row level security",
    );
    expect(migration).toContain(
      "create policy expense_learning_promotion_batches_owner_insert_v1",
    );
    expect(migration).toContain(
      "create policy expense_learning_promotion_batches_owner_delete_v1",
    );
    expect(migration).not.toContain(
      "expense_learning_promotion_batches_owner_update_v1",
    );
    expect(migration).not.toContain(
      "expense_learning_closed_metrics_owner_update_v1",
    );
  });

  it("turns the stage mutex into a DB week and marker fence", () => {
    const fence = functionBody(
      "expense_learning_private",
      "lock_expense_learning_cells_v1",
    );
    const globalMutex = fence.indexOf(
      "expense-learning-accumulator-mutation-v1",
    );
    const weekCheck = fence.indexOf(
      "v_current_week_start is distinct from p_week_start",
    );
    const markerCheck = fence.indexOf(
      "closed_week_promotion_batches",
    );
    const cellLoop = fence.indexOf("for v_metric in");

    expect(globalMutex).toBeGreaterThanOrEqual(0);
    expect(weekCheck).toBeGreaterThan(globalMutex);
    expect(markerCheck).toBeGreaterThan(weekCheck);
    expect(cellLoop).toBeGreaterThan(markerCheck);
    expect(fence).toContain("raise exception 'expense_learning_ingestion_week_changed'");
    expect(fence).toContain("raise exception 'expense_learning_ingestion_batch_closed'");
    expect(fence).not.toContain("return 'replayed'");
  });

  it("validates the complete 67-coordinate source before projecting", () => {
    const gate = functionBody(
      "expense_learning_private",
      "is_expense_learning_promotion_source_safe_v1",
    );
    expect(gate).toContain("is_expense_learning_week_source_canonical_v1");
    expect(gate).toContain(
      "is_expense_learning_week_accumulator_consistent_v1",
    );
    expect(gate).toContain("count(\n      distinct membership.contributor_coordinate_hmac");
    expect(gate).toContain("v_membership_count = v_distinct_contributors");
    expect(gate).toContain("v_membership_count = v_linked_contributors");
  });

  it("locks users before the global mutex and rows before cell locks", () => {
    const promotion = functionBody(
      "expense_learning_private",
      "run_expense_learning_promotion_v1",
    );
    const userLock = promotion.indexOf("expense-learning-consent-v1:");
    const globalLock = promotion.indexOf(
      "expense-learning-accumulator-mutation-v1",
    );
    const rowLock = promotion.indexOf("for update of link skip locked");
    const cellLock = promotion.indexOf(
      "lock_expense_learning_week_cells_v1",
    );

    expect(userLock).toBeGreaterThanOrEqual(0);
    expect(globalLock).toBeGreaterThan(userLock);
    expect(rowLock).toBeGreaterThan(globalLock);
    expect(cellLock).toBeGreaterThan(rowLock);
    expect(promotion).toContain("v_expected_links <> v_locked_links");
    expect(promotion).not.toMatch(
      /expense-learning-accumulator-mutation-v1[\s\S]*expense-learning-consent-v1:/iu,
    );
  });

  it("rejects withdrawal debt, corruption, late users, and occupied rows", () => {
    const promotion = functionBody(
      "expense_learning_private",
      "run_expense_learning_promotion_v1",
    );
    expect(promotion).toContain("is_expense_learning_link_cleanup_eligible_v1");
    expect(promotion).toContain("v_link.user_id = any(v_candidate_user_ids)");
    expect(promotion).toContain("v_expected_links <> v_locked_links");
    expect(promotion).toContain("return 'retry_required'");
  });

  it("distinguishes marker-less closed source debt from no work", () => {
    const promotion = functionBody(
      "expense_learning_private",
      "run_expense_learning_promotion_v1",
    );
    const noCandidates = promotion.indexOf(
      "if v_candidate_user_ids is null then",
    );
    const memberships = promotion.indexOf(
      "from expense_learning_private.accumulator_memberships as membership",
      noCandidates,
    );
    const accumulators = promotion.indexOf(
      "from expense_learning_private.protected_accumulators as accumulator",
      memberships,
    );
    const retry = promotion.indexOf("return 'retry_required'", accumulators);
    const nothing = promotion.indexOf("return 'nothing'", retry);

    expect(noCandidates).toBeGreaterThanOrEqual(0);
    expect(memberships).toBeGreaterThan(noCandidates);
    expect(accumulators).toBeGreaterThan(memberships);
    expect(retry).toBeGreaterThan(accumulators);
    expect(nothing).toBeGreaterThan(retry);
  });

  it("keeps mixed marker-less debt visible after healthy batch progress", () => {
    const promotion = functionBody(
      "expense_learning_private",
      "run_expense_learning_promotion_v1",
    );
    const finalMembershipDebt = promotion.lastIndexOf(
      "from expense_learning_private.accumulator_memberships as membership",
    );
    const finalAccumulatorDebt = promotion.lastIndexOf(
      "from expense_learning_private.protected_accumulators as accumulator",
    );
    const markRetry = promotion.indexOf(
      "v_retry_required := true",
      finalAccumulatorDebt,
    );
    const returnRetry = promotion.lastIndexOf("if v_retry_required then");

    expect(finalMembershipDebt).toBeGreaterThanOrEqual(0);
    expect(finalAccumulatorDebt).toBeGreaterThan(finalMembershipDebt);
    expect(markRetry).toBeGreaterThan(finalAccumulatorDebt);
    expect(returnRetry).toBeGreaterThan(markRetry);
  });

  it("uses mutually exclusive full-coordinate output shapes", () => {
    const promotion = functionBody(
      "expense_learning_private",
      "run_expense_learning_promotion_v1",
    );
    const rareBranch = promotion.indexOf("if v_rare_buckets > 0 then");
    const otherInsert = promotion.indexOf("'coarsened_other'", rareBranch);
    const exactBranch = promotion.indexOf("else", otherInsert);
    const exactInsert = promotion.indexOf("'exact'", exactBranch);

    expect(rareBranch).toBeGreaterThanOrEqual(0);
    expect(otherInsert).toBeGreaterThan(rareBranch);
    expect(exactBranch).toBeGreaterThan(otherInsert);
    expect(exactInsert).toBeGreaterThan(exactBranch);
    expect(promotion).toContain("if v_contributors < 10 then");
    expect(promotion).toContain("'discarded'");
    expect(promotion).toContain("having pg_catalog.count(*) >= 10");
  });

  it("stores only the cohort band and deterministic closed-week times", () => {
    const promotion = functionBody(
      "expense_learning_private",
      "run_expense_learning_promotion_v1",
    );
    expect(promotion).toContain("expense_learning_support_band_v1");
    expect(promotion).toContain("interval '7 days'");
    expect(promotion).toContain("interval '13 months'");
    expect(migration).toContain(
      "closed_week_supported_metrics_fixed_promotion_v1",
    );
    expect(migration).toContain("closed_week_supported_metrics_fixed_expiry_v1");
  });

  it("writes marker and metrics one-shot without conflict masking", () => {
    const promotion = functionBody(
      "expense_learning_private",
      "run_expense_learning_promotion_v1",
    );
    expect(promotion).toContain(
      "insert into expense_learning_private.closed_week_promotion_batches",
    );
    expect(promotion).toContain(
      "insert into expense_learning_private.closed_week_supported_metrics",
    );
    expect(promotion).not.toContain("on conflict");
    expect(promotion).not.toContain("update expense_learning_private.closed_week");
  });

  it("keeps promotion private, generic, and separate from submit and readers", () => {
    const wrapper = functionBody(
      "public",
      "promote_expense_learning_closed_weeks_v1",
    );
    expect(wrapper).toContain("is_service_role_request_v1");
    expect(wrapper).toContain("run_expense_learning_promotion_v1");
    expect(migration).not.toContain("create or replace function public.submit_");
    expect(migration).not.toMatch(/create\s+(?:or\s+replace\s+)?function\s+public\.(?:get|read|list)_expense_learning/iu);
    expect(migration).not.toMatch(
      /grant\s+(?:select|insert|update|delete)[^;]*expense_learning_private/iu,
    );
  });

  it("does not add a scheduler, workflow, Admin surface, or activation flag", () => {
    expect(migration).not.toMatch(/cron|scheduler|workflow|admin|next_public|feature_flag/iu);
    expect(migration).not.toContain("expense_learning_ingestion_enabled");
    expect(migration).not.toContain("expense_learning_wiring_enabled");
  });

  it("rolls back only when promoted storage is empty and restores P4A", () => {
    expect(rollback).toContain(
      "expense learning p4b storage is not empty; rollback is unsafe",
    );
    expect(rollback).toContain("return 'disabled'");
    expect(rollback).toContain("add column supporting_contributors smallint not null");
    expect(rollback).toContain("closed_week_supported_metrics_support_v1");
    expect(rollback).toContain(
      "drop table expense_learning_private.closed_week_promotion_batches restrict",
    );
    expect(rollback).not.toContain("cascade");
  });
});
