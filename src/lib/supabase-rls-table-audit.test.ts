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
const taxProductInsightsMigrationSource = readFileSync(
  new URL(
    "../../supabase/migrations/20260716160000_tax_product_insights.sql",
    import.meta.url,
  ),
  "utf8",
);
const partnerProgramMigrationSource = readFileSync(
  new URL(
    "../../supabase/migrations/20260717090000_partner_program_foundation.sql",
    import.meta.url,
  ),
  "utf8",
);
const promotionMigrationSource = readFileSync(
  new URL(
    "../../supabase/migrations/20260718120000_promotion_codes.sql",
    import.meta.url,
  ),
  "utf8",
);
const affiliateRewardMigrationSource = readFileSync(
  new URL(
    "../../supabase/migrations/20260718143000_affiliate_paid_rewards.sql",
    import.meta.url,
  ),
  "utf8",
);
const appErrorEventsRepairMigrationSource = readFileSync(
  new URL(
    "../../supabase/migrations/20260720084500_repair_app_error_events.sql",
    import.meta.url,
  ),
  "utf8",
);
const userDevicesMigrationSource = readFileSync(
  new URL(
    "../../supabase/migrations/20260720133000_user_devices.sql",
    import.meta.url,
  ),
  "utf8",
);
const expenseLearningStorageMigrationSource = readFileSync(
  new URL(
    "../../supabase/migrations/20260721223000_expense_learning_storage_p1b.sql",
    import.meta.url,
  ),
  "utf8",
);
const expenseLearningConsentMigrationSource = readFileSync(
  new URL(
    "../../supabase/migrations/20260722050000_expense_learning_consent_p2a.sql",
    import.meta.url,
  ),
  "utf8",
);
const expenseLearningIngestionMigrationSource = readFileSync(
  new URL(
    "../../supabase/migrations/20260722110000_expense_learning_ingestion_p3a.sql",
    import.meta.url,
  ),
  "utf8",
);
const expenseLearningRetentionMigrationSource = readFileSync(
  new URL(
    "../../supabase/migrations/20260722190000_expense_learning_retention_p4a.sql",
    import.meta.url,
  ),
  "utf8",
);
const expenseLearningPromotionMigrationSource = readFileSync(
  new URL(
    "../../supabase/migrations/20260722230000_expense_learning_promotion_p4b.sql",
    import.meta.url,
  ),
  "utf8",
);
const expenseLearningAdminReaderMigrationSource = readFileSync(
  new URL(
    "../../supabase/migrations/20260723070000_expense_learning_admin_reader_p5.sql",
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
  "tax_product_events",
  "tax_product_weekly_reports",
  "partner_accounts",
  "partner_commission_entries",
  "partner_payouts",
  "promo_campaigns",
  "promo_redemptions",
  "promo_module_entitlements",
  "affiliate_reward_entries",
  "user_devices",
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
const privateExpenseLearningTables = [
  "contribution_claims",
  "contributor_week_limits",
  "accumulator_memberships",
  "protected_accumulators",
  "closed_week_supported_metrics",
] as const;
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

  it("keeps expense learning storage in a separately denied private schema", () => {
    expect(expenseLearningStorageMigrationSource).toContain(
      "create schema expense_learning_private",
    );
    expect(expenseLearningStorageMigrationSource).toContain(
      "revoke all on schema expense_learning_private\n  from public, anon, authenticated, service_role",
    );
    expect(expenseLearningStorageMigrationSource).toContain(
      "revoke all on all tables in schema expense_learning_private\n  from public, anon, authenticated, service_role",
    );
    expect(expenseLearningStorageMigrationSource).toContain(
      "revoke all on all functions in schema expense_learning_private\n  from public, anon, authenticated, service_role",
    );
    expect(expenseLearningStorageMigrationSource).not.toMatch(
      /grant\s+(?:all|usage|create|select|insert|update|delete|execute)[^;]*expense_learning_private/iu,
    );
    expect(expenseLearningStorageMigrationSource).not.toMatch(
      /create\s+policy/iu,
    );

    for (const table of privateExpenseLearningTables) {
      expect(expenseLearningStorageMigrationSource).toContain(
        `create table expense_learning_private.${table}`,
      );
      expect(expenseLearningStorageMigrationSource).toContain(
        `alter table expense_learning_private.${table}\n  enable row level security`,
      );
      expect(expenseLearningStorageMigrationSource).toContain(
        `alter table expense_learning_private.${table}\n  force row level security`,
      );
      expect(expenseLearningStorageMigrationSource).toContain(
        `alter table expense_learning_private.${table}\n  owner to expense_learning_storage_owner`,
      );
    }
  });

  it("keeps the identity-linked consent ledger private and owner-policy minimal", () => {
    const table = "expense_learning_private.learning_consent_decisions";
    expect(expenseLearningConsentMigrationSource).toContain(
      `create table ${table}`,
    );
    expect(expenseLearningConsentMigrationSource).toContain(
      `alter table ${table}\n  owner to expense_learning_storage_owner`,
    );
    expect(expenseLearningConsentMigrationSource).toContain(
      `alter table ${table}\n  enable row level security`,
    );
    expect(expenseLearningConsentMigrationSource).toContain(
      `alter table ${table}\n  force row level security`,
    );
    expect(
      expenseLearningConsentMigrationSource.match(/create policy/giu),
    ).toHaveLength(2);
    expect(expenseLearningConsentMigrationSource).toContain(
      `create policy expense_learning_consent_owner_select_v1\n  on ${table}\n  for select\n  to expense_learning_storage_owner\n  using (true)`,
    );
    expect(expenseLearningConsentMigrationSource).toContain(
      `create policy expense_learning_consent_owner_insert_v1\n  on ${table}\n  for insert\n  to expense_learning_storage_owner\n  with check (true)`,
    );
    expect(expenseLearningConsentMigrationSource).not.toMatch(
      /create policy[\s\S]*?for\s+(?:all|update|delete)/iu,
    );
    expect(expenseLearningConsentMigrationSource).toContain(
      `revoke all on table ${table}\n  from public, anon, authenticated, service_role`,
    );
    expect(expenseLearningConsentMigrationSource).not.toMatch(
      /grant\s+(?:all|usage|select|insert|update|delete)[^;]*expense_learning_private/iu,
    );
    for (const signature of [
      "get_expense_learning_consent_v1(uuid)",
      "set_expense_learning_consent_v1(uuid, jsonb)",
    ]) {
      expect(expenseLearningConsentMigrationSource).toContain(
        `revoke all on function public.${signature}\n  from public, anon, authenticated, service_role`,
      );
      expect(expenseLearningConsentMigrationSource).toContain(
        `grant execute on function public.${signature}\n  to service_role`,
      );
    }
  });

  it("keeps P3A raw ingestion owner-only behind the private schema ACL", () => {
    const rawTables = [
      "contribution_claims",
      "contributor_week_limits",
      "accumulator_memberships",
      "protected_accumulators",
      "contributor_revocation_links",
    ] as const;

    expect(expenseLearningIngestionMigrationSource).toContain(
      "create table expense_learning_private.contributor_revocation_links",
    );
    expect(expenseLearningIngestionMigrationSource).toContain(
      "alter table expense_learning_private.contributor_revocation_links\n  enable row level security",
    );
    expect(expenseLearningIngestionMigrationSource).toContain(
      "alter table expense_learning_private.contributor_revocation_links\n  force row level security",
    );
    expect(expenseLearningIngestionMigrationSource).toContain(
      "revoke all on table\n  expense_learning_private.contributor_revocation_links\n  from public, anon, authenticated, service_role",
    );
    expect(expenseLearningIngestionMigrationSource).toContain(
      "revoke all on all functions in schema expense_learning_private\n  from public, anon, authenticated, service_role",
    );
    expect(expenseLearningIngestionMigrationSource).not.toMatch(
      /grant\s+(?:all|usage|select|insert|update|delete|execute)[^;]*expense_learning_private/iu,
    );

    for (const table of rawTables) {
      const policies = Array.from(
        expenseLearningIngestionMigrationSource.matchAll(
          new RegExp(
            `create policy [a-z0-9_]+\\n  on expense_learning_private\\.${table}\\n  for (select|insert|update|delete) to expense_learning_storage_owner`,
            "giu",
          ),
        ),
        (match) => match[1],
      );

      expect(policies.length, table).toBeGreaterThan(0);
      expect(new Set(policies).size, table).toBe(policies.length);
    }

    expect(expenseLearningIngestionMigrationSource).not.toMatch(
      /create policy[\s\S]*?\n\s+for\s+all/iu,
    );
    expect(expenseLearningIngestionMigrationSource).not.toMatch(
      /create policy[^;]*?to\s+(?:public|anon|authenticated|service_role)[^;]*;/iu,
    );
  });

  it("keeps P4A retention owner-only and promotion write-disabled", () => {
    const table =
      "expense_learning_private.closed_week_supported_metrics";
    expect(expenseLearningRetentionMigrationSource).toContain(
      `create policy expense_learning_closed_metrics_owner_select_v1\n  on ${table}\n  for select to expense_learning_storage_owner using (true)`,
    );
    expect(expenseLearningRetentionMigrationSource).toContain(
      `create policy expense_learning_closed_metrics_owner_delete_v1\n  on ${table}\n  for delete to expense_learning_storage_owner using (true)`,
    );
    expect(expenseLearningRetentionMigrationSource).toContain(
      "create policy expense_learning_revocation_links_owner_lock_v1\n  on expense_learning_private.contributor_revocation_links\n  for update to expense_learning_storage_owner\n  using (true)\n  with check (false)",
    );
    expect(expenseLearningRetentionMigrationSource).not.toContain(
      "expense_learning_closed_metrics_owner_insert_v1",
    );
    expect(expenseLearningRetentionMigrationSource).not.toContain(
      "expense_learning_closed_metrics_owner_update_v1",
    );
    expect(expenseLearningRetentionMigrationSource).not.toMatch(
      /grant\s+(?:all|usage|create|select|insert|update|delete|execute)[^;]*expense_learning_private/iu,
    );
    expect(expenseLearningRetentionMigrationSource).toContain(
      "revoke all on all functions in schema expense_learning_private\n  from public, anon, authenticated, service_role",
    );
    expect(expenseLearningRetentionMigrationSource).toContain(
      "grant execute on function public.purge_expense_learning_retention_v1()\n  to service_role",
    );
    expect(expenseLearningRetentionMigrationSource).not.toMatch(
      /insert\s+into\s+expense_learning_private\.closed_week_supported_metrics/iu,
    );
  });

  it("keeps P4B promotion private, immutable, and unreadable by API roles", () => {
    const marker =
      "expense_learning_private.closed_week_promotion_batches";
    const metrics =
      "expense_learning_private.closed_week_supported_metrics";

    expect(expenseLearningPromotionMigrationSource).toContain(
      `create table ${marker}`,
    );
    expect(expenseLearningPromotionMigrationSource).toContain(
      `alter table ${marker}\n  owner to expense_learning_storage_owner`,
    );
    expect(expenseLearningPromotionMigrationSource).toContain(
      `alter table ${marker}\n  enable row level security`,
    );
    expect(expenseLearningPromotionMigrationSource).toContain(
      `alter table ${marker}\n  force row level security`,
    );
    expect(expenseLearningPromotionMigrationSource).toContain(
      `revoke all on table ${marker}\n  from public, anon, authenticated, service_role`,
    );
    expect(expenseLearningPromotionMigrationSource).toContain(
      `create policy expense_learning_closed_metrics_owner_insert_v1\n  on ${metrics}\n  for insert to expense_learning_storage_owner with check (true)`,
    );
    expect(expenseLearningPromotionMigrationSource).not.toContain(
      "expense_learning_promotion_batches_owner_update_v1",
    );
    expect(expenseLearningPromotionMigrationSource).not.toContain(
      "expense_learning_closed_metrics_owner_update_v1",
    );
    expect(expenseLearningPromotionMigrationSource).not.toMatch(
      /create policy[^;]*?to\s+(?:public|anon|authenticated|service_role)[^;]*;/iu,
    );
    expect(expenseLearningPromotionMigrationSource).not.toMatch(
      /grant\s+(?:all|usage|create|select|insert|update|delete|execute)[^;]*expense_learning_private/iu,
    );
    expect(expenseLearningPromotionMigrationSource).toContain(
      "revoke all on all functions in schema expense_learning_private\n  from public, anon, authenticated, service_role",
    );
    expect(expenseLearningPromotionMigrationSource).toContain(
      "grant execute on function public.promote_expense_learning_closed_weeks_v1()\n  to service_role",
    );
  });

  it("exposes P5 through one promoted-only service-role reader", () => {
    const signature = "read_expense_learning_closed_week_metrics_v1()";
    expect(expenseLearningAdminReaderMigrationSource).toContain(
      "from expense_learning_private.closed_week_supported_metrics as metric",
    );
    expect(expenseLearningAdminReaderMigrationSource).not.toContain(
      "supporting_contributors",
    );
    expect(expenseLearningAdminReaderMigrationSource).not.toMatch(
      /grant\s+(?:all|usage|create|select|insert|update|delete)[^;]*expense_learning_private/iu,
    );
    expect(expenseLearningAdminReaderMigrationSource).toContain(
      `revoke all on function public.${signature}\n  from public, anon, authenticated, service_role`,
    );
    expect(expenseLearningAdminReaderMigrationSource).toContain(
      `grant execute on function public.${signature}\n  to service_role`,
    );
    expect(expenseLearningAdminReaderMigrationSource).not.toMatch(
      /grant\s+execute[^;]*to\s+(?:public|anon|authenticated)/iu,
    );
  });

  it("keeps internal tables unavailable to browser roles", () => {
    for (const table of serviceOnlyTables) {
      const source =
        table === "user_devices"
          ? userDevicesMigrationSource
          : table === "affiliate_reward_entries"
            ? affiliateRewardMigrationSource
            : table.startsWith("promo_")
              ? promotionMigrationSource
              : table.startsWith("partner_")
                ? partnerProgramMigrationSource
                : table === "admin_mfa_recovery_challenges"
                  ? adminMfaRecoveryMigrationSource
                  : table === "tax_product_events" ||
                      table === "tax_product_weekly_reports"
                    ? taxProductInsightsMigrationSource
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

  it("repairs the sanitized error sink without browser access", () => {
    expect(appErrorEventsRepairMigrationSource).toContain(
      "create table if not exists public.app_error_events",
    );
    expect(appErrorEventsRepairMigrationSource).toContain(
      "alter table public.app_error_events enable row level security",
    );
    expect(appErrorEventsRepairMigrationSource).toContain(
      "revoke all on table public.app_error_events from public, anon, authenticated",
    );
    expect(appErrorEventsRepairMigrationSource).toContain(
      "grant all on table public.app_error_events to service_role",
    );
    expect(appErrorEventsRepairMigrationSource).not.toMatch(
      /grant\s+[^;]*on table public\.app_error_events\s+to authenticated/iu,
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
    expect(
      migrationSource.match(/using \(\(select auth\.uid\(\)\) = user_id\)/g),
    ).toHaveLength(14);
  });
});
