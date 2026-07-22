import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EXPENSE_ENGINE_PRIVACY_POLICY_VERSION } from "./contracts";
import {
  EXPENSE_LEARNING_CONSENT_DECISION_MAX_BODY_BYTES_V1,
  EXPENSE_LEARNING_CONSENT_NOTICE_VERSION_V1,
  EXPENSE_LEARNING_CONSENT_PURPOSE_V1,
  EXPENSE_LEARNING_CONSENT_SCHEMA_VERSION_V1,
} from "./learning-consent.v1";

const migrationSource = readFileSync(
  new URL(
    "../../../supabase/migrations/20260722050000_expense_learning_consent_p2a.sql",
    import.meta.url,
  ),
  "utf8",
);
const rollbackSource = readFileSync(
  new URL(
    "../../../supabase/rollbacks/20260722050000_expense_learning_consent_p2a.down.sql",
    import.meta.url,
  ),
  "utf8",
);

function functionBody(name: string) {
  const match = migrationSource.match(
    new RegExp(
      `create function public\\.${name}\\([\\s\\S]*?\\n\\)\\nreturns jsonb[\\s\\S]*?\\nas \\$(?:\\$)\\n([\\s\\S]*?)\\n\\$(?:\\$);`,
      "iu",
    ),
  );
  expect(match, name).not.toBeNull();
  return match?.[1] ?? "";
}

function tableDefinition() {
  const match = migrationSource.match(
    /create table expense_learning_private\.learning_consent_decisions \(([\s\S]*?)\n\);/iu,
  );
  expect(match).not.toBeNull();
  return match?.[1] ?? "";
}

describe("expense learning consent P2A storage contract", () => {
  it("fails closed unless the constrained P1B owner and vault exist", () => {
    expect(migrationSource).toContain(
      "role.rolcanlogin = false\n    and role.rolinherit = false",
    );
    expect(migrationSource).toContain("and role.rolbypassrls = false");
    expect(migrationSource).toContain(
      "namespace.nspname = 'expense_learning_private'\n      and namespace.nspowner = v_owner_oid",
    );
    expect(migrationSource).toContain(
      "relation.relowner = v_owner_oid\n      and relation.relrowsecurity\n      and relation.relforcerowsecurity",
    );
    expect(migrationSource).toContain(
      "expense_learning_private.is_service_role_request_v1()",
    );
    expect(migrationSource).toContain(
      "'service_role',\n    'expense_learning_private',\n    'USAGE'",
    );
    expect(migrationSource.match(/<> 5/gu)).toHaveLength(1);
    expect(migrationSource).toContain(
      "expense_learning_p1b_prerequisite_invalid",
    );
  });

  it("stores only the identity-linked versioned decision and server time", () => {
    const definition = tableDefinition();
    const columns = Array.from(
      definition.matchAll(/^\s{2}([a-z][a-z0-9_]*)\s+/gmu),
      (match) => match[1]!,
    ).filter((column) => column !== "constraint");

    expect(columns).toEqual([
      "decision_id",
      "user_id",
      "schema_version",
      "notice_version",
      "purpose",
      "privacy_policy_version",
      "granted",
      "decided_at",
    ]);
    expect(definition).toContain(
      "user_id uuid not null references auth.users (id) on delete cascade",
    );
    expect(definition).toContain(
      "decision_id bigint generated always as identity primary key",
    );
    expect(definition).not.toMatch(
      /\b(?:ip|user_agent|session|tenant|owner|document|ocr|provider|supplier|nif|iban|filename|payload|amount|percentage|observation)\b/iu,
    );

    for (const version of [
      EXPENSE_LEARNING_CONSENT_SCHEMA_VERSION_V1,
      EXPENSE_LEARNING_CONSENT_NOTICE_VERSION_V1,
      EXPENSE_LEARNING_CONSENT_PURPOSE_V1,
      EXPENSE_ENGINE_PRIVACY_POLICY_VERSION,
    ]) {
      expect(definition).toContain(`'${version}'`);
    }
  });

  it("keeps ACL as the primary boundary and only two owner policies", () => {
    expect(migrationSource).toContain(
      "alter table expense_learning_private.learning_consent_decisions\n  enable row level security",
    );
    expect(migrationSource).toContain(
      "alter table expense_learning_private.learning_consent_decisions\n  force row level security",
    );
    expect(migrationSource).toContain(
      "create policy expense_learning_consent_owner_select_v1\n  on expense_learning_private.learning_consent_decisions\n  for select\n  to expense_learning_storage_owner\n  using (true)",
    );
    expect(migrationSource).toContain(
      "create policy expense_learning_consent_owner_insert_v1\n  on expense_learning_private.learning_consent_decisions\n  for insert\n  to expense_learning_storage_owner\n  with check (true)",
    );
    expect(migrationSource.match(/create policy/giu)).toHaveLength(2);
    expect(migrationSource).not.toMatch(
      /create policy[\s\S]*?for\s+(?:all|update|delete)/iu,
    );
    expect(migrationSource).toContain(
      "revoke all on table expense_learning_private.learning_consent_decisions\n  from public, anon, authenticated, service_role",
    );
    expect(migrationSource).toContain(
      "revoke all on sequence\n  expense_learning_private.learning_consent_decisions_decision_id_seq\n  from public, anon, authenticated, service_role",
    );
    expect(migrationSource).not.toMatch(
      /grant\s+(?:all|usage|select|insert|update|delete)[^;]*expense_learning_private/iu,
    );
  });

  it("keeps wrappers service-only, strict, versioned and identity-free on output", () => {
    const getter = functionBody("get_expense_learning_consent_v1");
    const setter = functionBody("set_expense_learning_consent_v1");
    const wrappers = [
      "get_expense_learning_consent_v1(uuid)",
      "set_expense_learning_consent_v1(uuid, jsonb)",
    ];

    for (const body of [getter, setter]) {
      expect(body).toContain(
        "expense_learning_private.is_service_role_request_v1()\n    is distinct from true",
      );
      expect(body).toContain("expense_learning_consent_rpc_forbidden");
      expect(body).not.toMatch(/raise\s+(?:notice|log|info|warning)/iu);
      expect(body).not.toContain("'userId'");
      expect(body).not.toContain("'user_id'");
    }
    for (const wrapper of wrappers) {
      expect(migrationSource).toContain(
        `revoke all on function public.${wrapper}\n  from public, anon, authenticated, service_role`,
      );
      expect(migrationSource).toContain(
        `grant execute on function public.${wrapper}\n  to service_role`,
      );
    }

    expect(setter).toContain(
      `pg_catalog.octet_length(p_decision::text) > ${EXPENSE_LEARNING_CONSENT_DECISION_MAX_BODY_BYTES_V1}`,
    );
    expect(setter).toContain("pg_catalog.count(*) = 5");
    expect(setter).toContain("pg_catalog.jsonb_object_keys(p_decision)");
    expect(setter).toContain("pg_catalog.pg_advisory_xact_lock(");
    expect(setter).toContain(
      "'expense-learning-consent-v1:' || p_user_id::text",
    );
    expect(setter).toContain("order by decision.decision_id desc");
    expect(setter).toContain("if found and v_current_granted = v_granted then");
    expect(setter).toContain("pg_catalog.clock_timestamp()");
    expect(getter).toContain("order by decision.decision_id desc");
    for (const state of ["UNDECIDED", "GRANTED", "REVOKED"]) {
      expect(migrationSource).toContain(`'${state}'`);
    }
  });

  it("does not activate contribution, promotion, UI or browser access", () => {
    expect(migrationSource).not.toContain(
      "submit_expense_learning_contribution_v1(",
    );
    expect(migrationSource).not.toContain(
      "promote_expense_learning_closed_weeks_v1(",
    );
    expect(migrationSource).not.toContain(
      "purge_expense_learning_retention_v1(",
    );
    expect(migrationSource).not.toMatch(
      /\b(?:learningHints|fetch|sendBeacon|WebSocket|localStorage|indexedDB)\b/u,
    );
  });

  it("rolls back only an empty P2A ledger and preserves the P1B vault", () => {
    expect(rollbackSource.trimStart()).toMatch(/^begin;/iu);
    expect(rollbackSource.trimEnd()).toMatch(/commit;$/iu);
    expect(rollbackSource).toContain(
      "Expense learning consent ledger is not empty; rollback is unsafe",
    );
    expect(rollbackSource).toContain(
      "drop policy expense_learning_consent_owner_insert_v1",
    );
    expect(rollbackSource).toContain(
      "drop policy expense_learning_consent_owner_select_v1",
    );
    expect(rollbackSource).toContain(
      "drop table expense_learning_private.learning_consent_decisions",
    );
    expect(rollbackSource).not.toMatch(/\b(?:cascade|drop schema|drop role)\b/iu);
    expect(rollbackSource).not.toMatch(
      /drop table expense_learning_private\.(?:contribution_claims|contributor_week_limits|accumulator_memberships|protected_accumulators|closed_week_supported_metrics)/iu,
    );
  });
});
