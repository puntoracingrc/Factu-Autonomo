import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  EXPENSE_AGGREGATE_CONTRIBUTION_MAX_BODY_BYTES_V1,
  EXPENSE_AGGREGATE_CONTRIBUTION_MAX_METRICS_V1,
  EXPENSE_AGGREGATE_CONTRIBUTION_SCHEMA_VERSION_V1,
  getExpenseAggregateCanonicalCoordinatesV1,
} from "./aggregate-contribution.v1";
import {
  EXPENSE_ENGINE_OBSERVATION_SCHEMA_VERSION,
  EXPENSE_ENGINE_PRIVACY_POLICY_VERSION,
  EXPENSE_ENGINE_VERSION,
} from "./contracts";

const migrationSource = readFileSync(
  new URL(
    "../../../supabase/migrations/20260721223000_expense_learning_storage_p1b.sql",
    import.meta.url,
  ),
  "utf8",
);
const rollbackSource = readFileSync(
  new URL(
    "../../../supabase/rollbacks/20260721223000_expense_learning_storage_p1b.down.sql",
    import.meta.url,
  ),
  "utf8",
);
const aggregateContractSource = readFileSync(
  new URL("./aggregate-contribution.v1.ts", import.meta.url),
  "utf8",
);
const engineContractSource = readFileSync(
  new URL("./contracts.ts", import.meta.url),
  "utf8",
);

const privateTables = [
  "contribution_claims",
  "contributor_week_limits",
  "accumulator_memberships",
  "protected_accumulators",
  "closed_week_supported_metrics",
] as const;
const categoricalTables = [
  "accumulator_memberships",
  "protected_accumulators",
  "closed_week_supported_metrics",
] as const;
const publicStubs = [
  "submit_expense_learning_contribution_v1",
  "promote_expense_learning_closed_weeks_v1",
  "purge_expense_learning_retention_v1",
] as const;

function sqlFunctionBody(schema: string, name: string) {
  const match = migrationSource.match(
    new RegExp(
      `create function ${schema}\\.${name}\\([\\s\\S]*?\\)\\nreturns [\\s\\S]*?\\nas \\$(?:\\$)\\n([\\s\\S]*?)\\n\\$(?:\\$);`,
      "i",
    ),
  );
  expect(match, `${schema}.${name} body`).not.toBeNull();
  return match?.[1] ?? "";
}

function sqlFunctionDefinition(schema: string, name: string) {
  const match = migrationSource.match(
    new RegExp(
      `create function ${schema}\\.${name}\\([\\s\\S]*?\\n\\$(?:\\$);`,
      "i",
    ),
  );
  expect(match, `${schema}.${name} definition`).not.toBeNull();
  return match?.[0] ?? "";
}

function sourceArray(source: string, name: string) {
  const match = source.match(
    new RegExp(
      `(?:export\\s+)?const\\s+${name}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s+as const`,
    ),
  );
  expect(match, name).not.toBeNull();
  return Array.from(match?.[1].matchAll(/"([A-Z0-9_]+)"/gu) ?? [], (item) =>
    item[1]!,
  );
}

function tableDefinition(table: (typeof privateTables)[number]) {
  const match = migrationSource.match(
    new RegExp(
      `create table expense_learning_private\\.${table} \\(([\\s\\S]*?)\\n\\);`,
      "i",
    ),
  );
  expect(match, table).not.toBeNull();
  return match?.[1] ?? "";
}

describe("expense learning P1B storage contract", () => {
  it("pins the SQL registry to the exact 67 P1A coordinates", () => {
    const body = sqlFunctionBody(
      "expense_learning_private",
      "is_canonical_metric_coordinate_v1",
    );
    const sqlCoordinates = Array.from(
      body.matchAll(/\('([A-Z0-9_]+)', '([A-Z0-9_]+)', '([A-Z0-9_]+)'\)/gu),
      (match) => ({
        family: match[1]!,
        comparisonScope: match[2]!,
        key: match[3]!,
      }),
    );
    const canonicalCoordinates = getExpenseAggregateCanonicalCoordinatesV1();

    expect(canonicalCoordinates).toHaveLength(
      EXPENSE_AGGREGATE_CONTRIBUTION_MAX_METRICS_V1,
    );
    expect(sqlCoordinates).toHaveLength(
      EXPENSE_AGGREGATE_CONTRIBUTION_MAX_METRICS_V1,
    );
    expect(sqlCoordinates).toEqual(canonicalCoordinates);
    expect(
      new Set(sqlCoordinates.map((coordinate) => JSON.stringify(coordinate)))
        .size,
    ).toBe(67);
  });

  it("keeps the SQL bucket vocabulary equal to the canonical TypeScript enums", () => {
    const body = sqlFunctionBody(
      "expense_learning_private",
      "is_canonical_metric_bucket_v1",
    );
    const sqlLiterals = new Set(
      Array.from(body.matchAll(/'([A-Z0-9_]+)'/gu), (match) => match[1]!),
    );
    const metricFamilies = getExpenseAggregateCanonicalCoordinatesV1().map(
      (coordinate) => coordinate.family,
    );
    const canonicalValues = [
      ...sourceArray(aggregateContractSource, "SOURCE_QUALITY_VALUES"),
      ...sourceArray(aggregateContractSource, "ROUTE_MODE_VALUES"),
      ...sourceArray(aggregateContractSource, "LOCAL_OUTCOME_VALUES"),
      ...sourceArray(aggregateContractSource, "CONFIDENCE_VALUES"),
      ...sourceArray(aggregateContractSource, "ABSTENTION_VALUES"),
      ...sourceArray(aggregateContractSource, "AI_USAGE_VALUES"),
      ...sourceArray(aggregateContractSource, "DURATION_VALUES"),
      ...sourceArray(aggregateContractSource, "REVIEW_VALUES"),
      ...sourceArray(aggregateContractSource, "FIELD_VERDICT_VALUES"),
      ...sourceArray(engineContractSource, "EXPENSE_MATH_VERDICTS"),
      ...sourceArray(engineContractSource, "EXPENSE_MATH_RESIDUAL_BUCKETS"),
      "PRESENT",
      "NOT_OBSERVED",
    ];
    const expectedLiterals = new Set([
      ...metricFamilies,
      ...canonicalValues,
      "EXACT",
      "COARSENED_OTHER",
      "OTHER",
      "CREDIT_SIGN_CORRECTED",
    ]);

    expect(Array.from(sqlLiterals).sort()).toEqual(
      Array.from(expectedLiterals).sort(),
    );
    const reservedCreditSignGuard =
      "when p_family = 'CRITICAL_FLAG'\n        and p_metric_key = 'CREDIT_SIGN_CORRECTED' then\n        p_bucket_kind = 'EXACT'\n        and p_bucket_value = 'NOT_OBSERVED'";
    expect(body).toContain(reservedCreditSignGuard);
    expect(body.indexOf(reservedCreditSignGuard)).toBeLessThan(
      body.indexOf("when p_bucket_kind = 'COARSENED_OTHER'"),
    );

    for (const table of categoricalTables) {
      expect(tableDefinition(table)).toContain(
        "expense_learning_private.is_canonical_metric_bucket_v1(",
      );
    }
  });

  it("creates only bounded categorical private storage", () => {
    expect(migrationSource).toContain(
      "create schema expense_learning_private\n  authorization expense_learning_storage_owner",
    );
    expect(migrationSource).toContain(
      "create role expense_learning_storage_owner",
    );
    expect(migrationSource).toMatch(
      /nologin[\s\S]*nobypassrls/iu,
    );

    for (const table of privateTables) {
      const definition = tableDefinition(table);
      expect(migrationSource).toContain(
        `alter table expense_learning_private.${table}\n  enable row level security`,
      );
      expect(migrationSource).toContain(
        `alter table expense_learning_private.${table}\n  force row level security`,
      );
      expect(definition).not.toMatch(
        /\b(?:user_id|owner_id|tenant_id|document_id|document_hash|payload|filename|supplier|email|nif|iban|ocr|amount|percentage|updated_at)\b/iu,
      );
    }

    expect(migrationSource).not.toMatch(/create\s+policy/iu);
    expect(migrationSource).not.toMatch(
      /grant\s+(?:all|select|insert|update|delete)[^;]*expense_learning_private/iu,
    );
    expect(migrationSource).toContain(
      "revoke all on schema expense_learning_private\n  from public, anon, authenticated, service_role",
    );
    expect(migrationSource).toContain(
      "grant expense_learning_storage_owner to postgres",
    );
    expect(migrationSource).toContain(
      "grant create on schema public to expense_learning_storage_owner",
    );
    expect(migrationSource).toContain(
      "revoke create on schema public from expense_learning_storage_owner",
    );
    expect(rollbackSource).toContain(
      "revoke expense_learning_storage_owner from postgres",
    );
    expect(migrationSource).not.toContain("auth.role()");
    expect(migrationSource).not.toMatch(/grant\s+usage\s+on\s+schema\s+auth/iu);
    expect(migrationSource).not.toMatch(
      /grant\s+(?:all|select|insert|update|delete)[^;]*\bauth\./iu,
    );
  });

  it("pins digest lengths, future learning cap and retention ceilings", () => {
    expect(migrationSource).toContain(
      "pg_catalog.octet_length(claim_token_digest) = 32",
    );
    expect(migrationSource).toContain(
      "pg_catalog.octet_length(contributor_week_hmac) = 32",
    );
    expect(migrationSource).toContain(
      "pg_catalog.octet_length(contributor_coordinate_hmac) = 32",
    );
    expect(migrationSource).toContain("interval '24 hours'");
    expect(migrationSource.match(/interval '35 days'/gu)).toHaveLength(3);
    expect(migrationSource).toContain("interval '13 months'");
    expect(migrationSource).toContain(
      "accepted_learning_contributions <= 20",
    );
    expect(migrationSource).toContain("supporting_contributors >= 10");
    expect(migrationSource).not.toContain("sample_count");
  });

  it("pins all versions to the canonical P1A constants", () => {
    for (const version of [
      EXPENSE_AGGREGATE_CONTRIBUTION_SCHEMA_VERSION_V1,
      EXPENSE_ENGINE_OBSERVATION_SCHEMA_VERSION,
      EXPENSE_ENGINE_VERSION,
      EXPENSE_ENGINE_PRIVACY_POLICY_VERSION,
    ]) {
      expect(migrationSource).toContain(`'${version}'`);
    }
  });

  it("keeps every public RPC service-only, bounded, disabled and without DML", () => {
    const roleGuard = sqlFunctionBody(
      "expense_learning_private",
      "is_service_role_request_v1",
    );
    expect(roleGuard).toContain(
      "pg_catalog.current_setting(\n    'request.jwt.claim.role',\n    true\n  )",
    );
    expect(roleGuard).toContain(
      "pg_catalog.current_setting(\n      'request.jwt.claims',\n      true\n    )",
    );
    expect(roleGuard).toContain("pg_catalog.jsonb_extract_path_text(");
    expect(roleGuard.match(/exception when others then/gu)).toHaveLength(2);
    expect(roleGuard).toContain(
      "return v_request_role is not distinct from 'service_role'",
    );
    expect(roleGuard).not.toMatch(
      /\b(?:insert|update|delete|merge|truncate|execute)\b/iu,
    );

    for (const stub of publicStubs) {
      const definition = sqlFunctionDefinition("public", stub);
      const body = sqlFunctionBody("public", stub);

      expect(definition).toContain("security definer");
      expect(definition).toContain("set search_path = ''");
      expect(body).toContain(
        "expense_learning_private.is_service_role_request_v1()\n    is distinct from true",
      );
      expect(body).toContain("return 'DISABLED'");
      expect(body).not.toMatch(
        /\b(?:insert|update|delete|merge|truncate|execute)\b/iu,
      );
      for (const table of privateTables) {
        expect(body).not.toContain(`expense_learning_private.${table}`);
      }
      expect(body).not.toMatch(/raise\s+(?:notice|log|info|warning)/iu);
      expect(migrationSource).toContain(
        `alter function public.${stub}`,
      );
      expect(migrationSource).toContain(
        `grant execute on function public.${stub}`,
      );
    }

    const submit = sqlFunctionDefinition(
      "public",
      "submit_expense_learning_contribution_v1",
    );
    expect(submit).toContain(
      `pg_catalog.octet_length(p_contribution::text) > ${EXPENSE_AGGREGATE_CONTRIBUTION_MAX_BODY_BYTES_V1}`,
    );
    expect(submit.match(/pg_catalog\.length\([^)]*\) <> 64/gu)).toHaveLength(2);
    expect(migrationSource).not.toMatch(
      /create function public\.(?:get|read|list|select)_?expense_learning/iu,
    );
  });

  it("makes rollback transactional, explicit and fail-closed on runtime rows", () => {
    expect(rollbackSource.trimStart()).toMatch(/^begin;/iu);
    expect(rollbackSource.trimEnd()).toMatch(/commit;$/iu);
    expect(rollbackSource).toContain(
      "Expense learning runtime storage is not empty; rollback is unsafe",
    );
    expect(rollbackSource).toContain(
      "drop schema if exists expense_learning_private restrict",
    );
    expect(rollbackSource).not.toContain("cascade");
    for (const table of privateTables) {
      expect(rollbackSource).toContain(`'${table}'`);
      expect(rollbackSource).toContain(
        `drop table if exists expense_learning_private.${table}`,
      );
    }
    for (const stub of publicStubs) {
      expect(rollbackSource).toContain(`drop function if exists public.${stub}`);
    }
  });
});
