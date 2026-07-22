import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  EXPENSE_AGGREGATE_CONTRIBUTION_MAX_METRICS_V1,
  getExpenseAggregateCanonicalCoordinatesV1,
} from "./aggregate-contribution.v1";

const migrationSource = readFileSync(
  new URL(
    "../../../supabase/migrations/20260722110000_expense_learning_ingestion_p3a.sql",
    import.meta.url,
  ),
  "utf8",
);
const rollbackSource = readFileSync(
  new URL(
    "../../../supabase/rollbacks/20260722110000_expense_learning_ingestion_p3a.down.sql",
    import.meta.url,
  ),
  "utf8",
);
const acceptanceSource = readFileSync(
  new URL("../../../scripts/phase1-acceptance/run.mjs", import.meta.url),
  "utf8",
);

function functionBody(schema: string, name: string) {
  const match = migrationSource.match(
    new RegExp(
      `create(?: or replace)? function ${schema}\\.${name}\\([\\s\\S]*?\\)\\nreturns [\\s\\S]*?\\nas \\$(?:\\$)\\n([\\s\\S]*?)\\n\\$(?:\\$);`,
      "iu",
    ),
  );
  expect(match, `${schema}.${name}`).not.toBeNull();
  return match?.[1] ?? "";
}

function occurrences(source: string, needle: string) {
  return source.split(needle).length - 1;
}

describe("expense learning P3A ingestion contract", () => {
  it("keeps the public ingestion wrapper dormant and the core private", () => {
    const publicSubmit = functionBody(
      "public",
      "submit_expense_learning_contribution_v1",
    );

    expect(publicSubmit).toContain("return 'DISABLED'");
    expect(publicSubmit).not.toMatch(
      /\b(?:insert|update|delete|merge|truncate|execute)\b/iu,
    );
    expect(migrationSource).toContain(
      "stage_expense_learning_contribution_v1(\n  uuid,\n  jsonb,\n  bytea,\n  bytea\n) owner to expense_learning_storage_owner",
    );
    expect(migrationSource).toContain(
      "revoke all on all functions in schema expense_learning_private\n  from public, anon, authenticated, service_role",
    );
    expect(migrationSource).not.toMatch(
      /grant\s+execute[^;]*expense_learning_private/iu,
    );
    expect(migrationSource).not.toMatch(
      /create function public\.(?:get|read|list)_?expense_learning_(?:raw|link|claim|membership)/iu,
    );
  });

  it("validates the exact canonical 67-coordinate contribution", () => {
    const validator = functionBody(
      "expense_learning_private",
      "is_canonical_contribution_v1",
    );

    expect(getExpenseAggregateCanonicalCoordinatesV1()).toHaveLength(
      EXPENSE_AGGREGATE_CONTRIBUTION_MAX_METRICS_V1,
    );
    expect(validator).toContain(
      `pg_catalog.jsonb_array_length(p_contribution -> 'metrics') <> ${EXPENSE_AGGREGATE_CONTRIBUTION_MAX_METRICS_V1}`,
    );
    expect(validator).toContain("pg_catalog.count(*) = 67");
    expect(validator).toContain(
      "pg_catalog.count(distinct (\n      metric ->> 'family',\n      metric ->> 'comparisonScope',\n      metric ->> 'key'\n    )) = 67",
    );
    expect(validator).toContain(
      "expense_learning_private.is_canonical_metric_bucket_v1(",
    );
    expect(validator).toContain(
      "p_contribution -> 'learningHints' <> 'null'::jsonb",
    );
    expect(validator).toContain(
      "from pg_catalog.jsonb_object_keys(p_contribution)",
    );
    expect(validator).toContain("from pg_catalog.jsonb_object_keys(metric)");
    expect(validator).not.toContain("jsonb_object_length");
    expect(validator).toContain(") is distinct from true");
    expect(validator).toContain(") is true");
    expect(validator).toContain("v_abstention_reason");
    expect(validator).toContain("v_ai_fallback_reason");
    expect(validator).toContain("v_field_triple");
    expect(validator).toContain("ABSTAINED:EXTRA:MISSING");
    expect(validator).toContain("v_ai_was_corrected");
    expect(validator).toContain("v_math.verdict = 'MISMATCH'");
    expect(validator).toContain("v_tax_was_corrected");
    expect(validator).toContain("v_credit_sign_flag = 'PRESENT'");
    expect(acceptanceSource).toContain(
      "await testExpenseLearningP3SemanticRejection(admin, users)",
    );
    for (const semanticCase of [
      "null schema version",
      "null structural group",
      "null non-cross metric bucket",
      "candidate with abstention",
      "local route with AI usage",
      "unreadable candidate",
      "impossible field triple",
      "corrected review without correction",
      "incoherent math pair",
      "fabricated critical flag",
    ]) {
      expect(acceptanceSource).toContain(semanticCase);
    }
  });

  it("stores only a protected weekly revocation link with fixed retention", () => {
    const table = "expense_learning_private.contributor_revocation_links";

    expect(migrationSource).toContain(`create table ${table}`);
    expect(migrationSource).toContain(
      "user_id uuid not null references auth.users (id) on delete cascade",
    );
    expect(migrationSource).toContain("primary key (user_id, week_start)");
    expect(migrationSource).toContain(
      "unique (week_start, contributor_week_hmac)",
    );
    expect(migrationSource).toContain(
      "expires_at =\n        (week_start::timestamp at time zone 'UTC') + interval '35 days'",
    );
    expect(migrationSource).toContain(
      `revoke all on table\n  ${table}\n  from public, anon, authenticated, service_role`,
    );
    expect(migrationSource).not.toMatch(
      /\b(?:tenant_id|owner_id|document_id|filename|supplier|nif|iban|ocr|amount|percentage|payload|updated_at|linked_at)\b/iu,
    );
  });

  it("links claims and limits to the revocable weekly pseudonym", () => {
    expect(migrationSource).toContain(
      "add constraint contribution_claims_revocation_link_v1\n    foreign key (week_start, contributor_week_hmac)",
    );
    expect(migrationSource).toContain(
      "add constraint contributor_week_limits_revocation_link_v1\n    foreign key (week_start, contributor_week_hmac)",
    );
    expect(migrationSource).toContain("on delete cascade");
    expect(migrationSource).toContain(
      "pg_catalog.octet_length(contributor_week_hmac) = 32",
    );
    expect(migrationSource).toContain(
      "pg_catalog.octet_length(p_claim_token_digest) <> 32",
    );
  });

  it("removes contribution timestamps from linkable staging", () => {
    expect(migrationSource).toContain("drop column first_accepted_at");
    expect(migrationSource).toContain("drop column accepted_at");
    expect(migrationSource).toContain("drop column opened_at");
    expect(migrationSource).not.toContain("linked_at");
    expect(migrationSource).toContain(
      "add constraint accumulator_memberships_fixed_expiry_v1",
    );
    expect(migrationSource).toContain(
      "add constraint protected_accumulators_fixed_expiry_v1",
    );
    expect(rollbackSource).toContain(
      "add column accepted_at timestamptz not null",
    );
    expect(rollbackSource).toContain(
      "add column opened_at timestamptz not null",
    );
  });

  it("derives unlinkable coordinate HMACs with a closed domain", () => {
    const coordinateHmac = functionBody(
      "expense_learning_private",
      "expense_learning_coordinate_hmac_v1",
    );

    expect(coordinateHmac).toContain("extensions.hmac(");
    expect(coordinateHmac).toContain("'expense-learning-coordinate-v1'");
    for (const part of [
      "p_contribution_schema_version",
      "p_observation_schema_version",
      "p_engine_version",
      "p_privacy_policy_version",
      "p_week_start::text",
      "p_structural_archetype_group",
      "p_metric_family",
      "p_comparison_scope",
      "p_metric_key",
    ]) {
      expect(coordinateHmac).toContain(part);
    }
    expect(coordinateHmac).not.toMatch(/bucket|user|document|claim/iu);
    expect(migrationSource).toContain(
      "grant usage on schema extensions to expense_learning_storage_owner",
    );
    expect(migrationSource).not.toContain(
      "grant create on schema extensions to expense_learning_storage_owner",
    );
    expect(rollbackSource).toContain(
      "revoke usage on schema extensions from expense_learning_storage_owner",
    );
  });

  it("uses one global mutation mutex and canonical cell locks", () => {
    const core = functionBody(
      "expense_learning_private",
      "stage_expense_learning_contribution_v1",
    );
    const purge = functionBody(
      "expense_learning_private",
      "purge_expense_learning_link_v1",
    );
    const mutex = "'expense-learning-accumulator-mutation-v1',\n      0";

    expect(core).toContain(mutex);
    expect(purge).toContain(mutex);
    expect(core.indexOf(mutex)).toBeLessThan(
      core.indexOf("lock_expense_learning_cells_v1("),
    );
    expect(purge.indexOf(mutex)).toBeLessThan(
      purge.indexOf("for v_membership in"),
    );
    expect(core).toContain("'expense-learning-consent-v1:'");
    expect(purge).not.toContain("'expense-learning-consent-v1:'");
    expect(purge).toContain("expense_learning_cell_lock_key_v1(");
    expect(core).toContain("lock_expense_learning_cells_v1(");
  });

  it("creates or verifies the weekly link before claiming a contribution", () => {
    const core = functionBody(
      "expense_learning_private",
      "stage_expense_learning_contribution_v1",
    );
    const insertLink = core.indexOf(
      "insert into expense_learning_private.contributor_revocation_links",
    );
    const verifyLink = core.indexOf(
      "from expense_learning_private.contributor_revocation_links as link",
      insertLink,
    );
    const insertClaim = core.indexOf(
      "insert into expense_learning_private.contribution_claims",
    );
    const insertMembership = core.indexOf(
      "insert into expense_learning_private.accumulator_memberships",
    );

    expect(insertLink).toBeGreaterThan(-1);
    expect(verifyLink).toBeGreaterThan(insertLink);
    expect(insertClaim).toBeGreaterThan(verifyLink);
    expect(insertMembership).toBeGreaterThan(insertClaim);
    expect(core).toContain(
      "where link.user_id = p_user_id\n    and link.week_start = v_week_start;",
    );
    expect(core).not.toContain(
      "where link.user_id = p_user_id\n    and link.week_start = v_week_start\n  for update",
    );
  });

  it("claims one-shot tokens through the link before the global mutex", () => {
    const core = functionBody(
      "expense_learning_private",
      "stage_expense_learning_contribution_v1",
    );
    const claimLookup = "where claim.claim_token_digest = p_claim_token_digest";
    const mutexIndex = core.indexOf(
      "'expense-learning-accumulator-mutation-v1'",
    );
    const claimInsert = core.indexOf(
      "insert into expense_learning_private.contribution_claims",
    );

    expect(occurrences(core, claimLookup)).toBe(2);
    expect(claimInsert).toBeLessThan(mutexIndex);
    expect(core).toContain("on conflict (claim_token_digest) do nothing");
    expect(core).toContain("get diagnostics v_claim_inserted = row_count");
    expect(core).toContain("return 'REPLAYED'");
    expect(core).toContain("expense_learning_ingestion_claim_conflict");
  });

  it("serializes consent, stages only under the current grant and cools down revocation", () => {
    const core = functionBody(
      "expense_learning_private",
      "stage_expense_learning_contribution_v1",
    );
    const setter = functionBody("public", "set_expense_learning_consent_v1");
    const advisory = "'expense-learning-consent-v1:' || p_user_id::text";

    expect(core).toContain(advisory);
    expect(setter).toContain(advisory);
    expect(core).toContain("return 'NOT_CONSENTED'");
    expect(core).toContain("return 'WITHDRAWAL_COOLDOWN'");
    expect(core).toContain("decision.granted = false");
    expect(core).toContain("return 'CAP_REACHED'");
    expect(setter).toContain(
      "delete from expense_learning_private.contributor_revocation_links",
    );
  });

  it("purges exact memberships and fails closed on support corruption", () => {
    const purge = functionBody(
      "expense_learning_private",
      "purge_expense_learning_link_v1",
    );

    expect(purge).toContain(
      "delete from expense_learning_private.contribution_claims",
    );
    expect(purge).toContain(
      "delete from expense_learning_private.accumulator_memberships",
    );
    expect(purge).toContain(
      "delete from expense_learning_private.contributor_week_limits",
    );
    expect(purge).toContain("expense_learning_accumulator_corrupt");
    expect(purge).toContain("v_support <> v_membership_count");
    expect(purge).toContain(
      "set supporting_contributors = v_membership_count - 1",
    );
    expect(purge).toContain("expense_learning_link_purge_incomplete");
    expect(migrationSource).toContain(
      "before delete on expense_learning_private.contributor_revocation_links",
    );
  });

  it("keeps rollback transactional, fail-closed and P1B/P2A compatible", () => {
    expect(rollbackSource.startsWith("begin;\n")).toBe(true);
    expect(rollbackSource.trimEnd().endsWith("commit;")).toBe(true);
    expect(rollbackSource).toContain(
      "Expense learning P3A storage is not empty; rollback is unsafe",
    );
    expect(rollbackSource).not.toMatch(/\bcascade\b/iu);
    expect(rollbackSource).toContain(
      "drop table expense_learning_private.contributor_revocation_links",
    );
    expect(rollbackSource).toContain(
      "create function public.submit_expense_learning_contribution_v1(\n  p_contribution jsonb",
    );
    expect(rollbackSource).toContain(
      "create or replace function public.set_expense_learning_consent_v1(",
    );
  });
});
