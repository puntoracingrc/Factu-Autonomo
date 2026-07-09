import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationsDir = new URL("../../supabase/migrations/", import.meta.url);
const migrationSource = readFileSync(
  new URL(
    "../../supabase/migrations/20260709113000_rls_table_audit_hardening.sql",
    import.meta.url,
  ),
  "utf8",
);
const rateLimitMigrationSource = readFileSync(
  new URL(
    "../../supabase/migrations/20260709123000_server_rate_limit_buckets.sql",
    import.meta.url,
  ),
  "utf8",
);
const adminMfaRecoveryMigrationSource = readFileSync(
  new URL(
    "../../supabase/migrations/20260709222000_admin_mfa_recovery_challenges.sql",
    import.meta.url,
  ),
  "utf8",
);

const serviceOnlyTables = [
  "payment_receipts",
  "referral_codes",
  "referral_redemptions",
  "verifactu_records",
  "verifactu_chain_state",
  "expense_inbox_aliases",
  "expense_inbox_items",
  "expense_inbox_alias_history",
  "admin_user_controls",
  "app_error_events",
  "ai_learning_events",
  "admin_mfa_recovery_challenges",
  "admin_user_restore_points",
  "admin_user_restore_events",
  "stripe_events",
  "fiscal_evidence_packets",
];

const browserSyncTables = ["user_backups", "sync_entities"];
const browserReadOnlyTables = ["user_subscriptions", "user_usage"];
const serverDocumentTables = [
  "server_documents",
  "server_document_versions",
  "document_conflicts",
  "fiscal_operations",
  "fiscal_invoice_identities",
  "fiscal_records",
  "fiscal_chain_state",
  "fiscal_transport_attempts",
];
const rateLimitTables = ["server_rate_limit_buckets"];
const classifiedTables = new Set([
  ...serviceOnlyTables,
  ...browserSyncTables,
  ...browserReadOnlyTables,
  ...serverDocumentTables,
  ...rateLimitTables,
]);

function escapedTable(table: string) {
  return table.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function publicTablesFromMigrations() {
  const tables = new Set<string>();
  const files = readdirSync(migrationsDir).filter((file) =>
    file.endsWith(".sql"),
  );

  for (const file of files) {
    const source = readFileSync(new URL(file, migrationsDir), "utf8");
    for (const match of source.matchAll(
      /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-z0-9_]+)/gi,
    )) {
      tables.add(match[1]!);
    }
  }

  return Array.from(tables).sort();
}

describe("Supabase table-by-table RLS audit hardening", () => {
  it("classifies every public table created by migrations", () => {
    const unclassified = publicTablesFromMigrations().filter(
      (table) => !classifiedTables.has(table),
    );

    expect(unclassified).toEqual([]);
  });

  it("keeps internal tables unavailable to browser roles", () => {
    for (const table of serviceOnlyTables) {
      const source =
        table === "admin_mfa_recovery_challenges"
          ? adminMfaRecoveryMigrationSource
          : migrationSource;
      expect(source).toContain(
        `revoke all on table public.${table} from public, anon, authenticated`,
      );
      expect(source).toContain(
        `grant all on table public.${table} to service_role`,
      );
      expect(source).not.toMatch(
        new RegExp(
          `grant\\s+[^;]*on table public\\.${escapedTable(table)}\\s+to authenticated`,
          "i",
        ),
      );
    }
  });

  it("keeps distributed rate limit buckets service-only", () => {
    expect(rateLimitMigrationSource).toContain(
      "revoke all on table public.server_rate_limit_buckets from public",
    );
    expect(rateLimitMigrationSource).toContain(
      "revoke all on table public.server_rate_limit_buckets from anon",
    );
    expect(rateLimitMigrationSource).toContain(
      "revoke all on table public.server_rate_limit_buckets from authenticated",
    );
    expect(rateLimitMigrationSource).toContain(
      "grant all on table public.server_rate_limit_buckets to service_role",
    );
    expect(rateLimitMigrationSource).toContain(
      "grant execute on function public.claim_rate_limit_bucket(text, text, integer, integer) to service_role",
    );
    expect(rateLimitMigrationSource).not.toMatch(
      /grant\s+[^;]*server_rate_limit_buckets\s+to\s+(?:public|anon|authenticated)/i,
    );
  });

  it("allows browser sync writes only on owner-scoped sync tables", () => {
    for (const table of browserSyncTables) {
      expect(migrationSource).toContain(
        `revoke all on table public.${table} from public, anon, authenticated`,
      );
      expect(migrationSource).toContain(
        `grant select, insert, update on table public.${table} to authenticated`,
      );
      expect(migrationSource).not.toMatch(
        new RegExp(
          `grant\\s+(?:all|delete)[^;]*on table public\\.${escapedTable(table)}\\s+to authenticated`,
          "i",
        ),
      );
    }
  });

  it("keeps billing summary tables read-only for browser clients", () => {
    for (const table of browserReadOnlyTables) {
      expect(migrationSource).toContain(
        `revoke all on table public.${table} from public, anon, authenticated`,
      );
      expect(migrationSource).toContain(
        `grant select on table public.${table} to authenticated`,
      );
      expect(migrationSource).not.toMatch(
        new RegExp(
          `grant\\s+(?:all|insert|update|delete)[^;]*on table public\\.${escapedTable(table)}\\s+to authenticated`,
          "i",
        ),
      );
    }
  });

  it("uses init-plan-safe owner checks on user-scoped policies", () => {
    expect(migrationSource).not.toContain("auth.uid() = user_id");
    expect(migrationSource).toContain("using ((select auth.uid()) = user_id)");
    expect(migrationSource).toContain(
      "with check ((select auth.uid()) = user_id)",
    );
  });

  it("keeps document and fiscal read tables scoped to their owner", () => {
    for (const table of serverDocumentTables) {
      expect(migrationSource).toContain(
        `revoke all on table public.${table} from public`,
      );
    }
    expect(migrationSource.match(/using \(\(select auth\.uid\(\)\) = user_id\)/g))
      .toHaveLength(14);
  });
});
