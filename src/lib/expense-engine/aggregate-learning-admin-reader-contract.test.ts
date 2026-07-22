import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260723070000_expense_learning_admin_reader_p5.sql",
    import.meta.url,
  ),
  "utf8",
);
const rollback = readFileSync(
  new URL(
    "../../../supabase/rollbacks/20260723070000_expense_learning_admin_reader_p5.down.sql",
    import.meta.url,
  ),
  "utf8",
);
const route = readFileSync(
  new URL(
    "../../app/api/admin/expense-learning-insights/route.ts",
    import.meta.url,
  ),
  "utf8",
);
const panel = readFileSync(
  new URL(
    "../../components/admin/ExpenseLearningInsightsPanel.tsx",
    import.meta.url,
  ),
  "utf8",
);
const adminPage = readFileSync(
  new URL("../../app/admin/page.tsx", import.meta.url),
  "utf8",
);

describe("expense learning P5 promoted-only reader contract", () => {
  it("reads only the fixed promoted marginal without exact support counts", () => {
    expect(migration).toContain(
      "from expense_learning_private.closed_week_supported_metrics as metric",
    );
    expect(migration).toContain(
      "join expense_learning_private.closed_week_promotion_batches as batch",
    );
    expect(migration).toContain("where batch.batch_state = 'PROMOTED'");
    for (const coordinate of [
      "metric.metric_family = 'HUMAN_REVIEW'",
      "metric.comparison_scope = 'NONE'",
      "metric.metric_key = 'VALUE'",
    ]) {
      expect(migration).toContain(coordinate);
    }
    expect(migration).toContain("metric.support_band");
    expect(migration).toContain("limit 1024");
    expect(migration).not.toContain("supporting_contributors");
    for (const forbiddenTable of [
      "contribution_claims",
      "contributor_week_limits",
      "accumulator_memberships",
      "protected_accumulators",
      "contributor_revocation_links",
      "learning_consent_decisions",
    ]) {
      expect(migration).not.toContain(forbiddenTable);
    }
  });

  it("filters open and expired rows inside the owner-executed query", () => {
    expect(migration).toContain(
      "metric.week_start < (\n      pg_catalog.date_trunc(",
    );
    expect(migration).toContain(
      "metric.promoted_at <= pg_catalog.clock_timestamp()",
    );
    expect(migration).toContain(
      "metric.expires_at > pg_catalog.clock_timestamp()",
    );
    expect(migration).toContain("security definer\nset search_path = ''");
    expect(migration).toContain(
      "expense_learning_private.is_service_role_request_v1()\n    is distinct from true",
    );
  });

  it("keeps the private schema denied and exposes only one service-role RPC", () => {
    const signature = "read_expense_learning_closed_week_metrics_v1()";
    expect(migration).toContain(
      `revoke all on function public.${signature}\n  from public, anon, authenticated, service_role`,
    );
    expect(migration).toContain(
      `grant execute on function public.${signature}\n  to service_role`,
    );
    expect(migration).toContain(
      "grant create on schema public to expense_learning_storage_owner",
    );
    expect(migration).toContain(
      "revoke create on schema public from expense_learning_storage_owner",
    );
    expect(migration).not.toMatch(
      /grant\s+(?:all|usage|create|select|insert|update|delete)[^;]*expense_learning_private/iu,
    );
    expect(migration).not.toMatch(
      /grant\s+execute[^;]*to\s+(?:public|anon|authenticated)/iu,
    );
  });

  it("rolls back only the reader and never storage", () => {
    expect(rollback).toContain(
      "drop function public.read_expense_learning_closed_week_metrics_v1() restrict",
    );
    expect(rollback).not.toMatch(/drop\s+(?:schema|table|role)/iu);
    expect(rollback).not.toContain("cascade");
  });

  it("keeps the HTTP boundary admin-only and reconstructs a closed response", () => {
    expect(route).toContain("getAdminAccessFromRequest(request)");
    expect(route).toContain("checkRateLimit(");
    expect(route).toContain(
      'admin.rpc(\n      "read_expense_learning_closed_week_metrics_v1"',
    );
    expect(route).not.toContain(".from(");
    expect(route).not.toContain("supporting_contributors");
    expect(route).not.toContain("contributor_week_hmac");
    expect(route).toContain('Vary: "Authorization"');
    expect(route).toContain(
      'schemaVersion: "expense-learning-admin-insights.v1"',
    );
  });

  it("adds a focused Admin view without wiring learning into production", () => {
    expect(adminPage).toContain(
      'href="/admin/expense-learning-insights"',
    );
    expect(panel).toContain(
      'fetch("/api/admin/expense-learning-insights"',
    );
    expect(panel).toContain("Sin documentos, proveedores, usuarios ni recuentos exactos.");
    expect(panel).toContain("Estas señales no cambian extractores, reglas ni resultados visibles.");
    expect(panel).not.toContain("NEXT_PUBLIC_EXPENSE_LEARNING_WIRING_ENABLED");
    expect(panel).not.toContain("EXPENSE_LEARNING_INGESTION_ENABLED");
  });
});
