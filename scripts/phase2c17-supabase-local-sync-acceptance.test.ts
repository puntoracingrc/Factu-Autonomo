import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

// PHASE2C17_SUPABASE_LOCAL_SYNC_ACCEPTANCE_OPT_IN_V1

const localAcceptanceEnabled =
  process.env.PHASE2C17_SUPABASE_LOCAL_SYNC_ACCEPTANCE === "true";
const describeLocal = localAcceptanceEnabled ? describe : describe.skip;
const localHosts = new Set(["127.0.0.1", "localhost", "::1"]);
const BLOCKED_SCHEMA = "BLOCKED_SCHEMA_NOT_COMPATIBLE_WITH_2C_SYNC_ACCEPTANCE";

function assertLocalDatabaseUrl(value: string): void {
  const url = new URL(value);
  if (!localHosts.has(url.hostname)) {
    throw new Error("PHASE2C17_SUPABASE_LOCAL_DB_URL debe apuntar a localhost.");
  }
}

function query(databaseUrl: string, sql: string): string {
  const result = spawnSync("psql", [
    databaseUrl,
    "-v",
    "ON_ERROR_STOP=1",
    "-Atc",
    sql,
  ], {
    encoding: "utf8",
    stdio: "pipe",
  });

  if (result.error || result.status !== 0) {
    return BLOCKED_SCHEMA;
  }

  return result.stdout.trim();
}

function missingCompatibilityColumns(databaseUrl: string): string[] {
  const sql = `
    with expected(table_name, column_name) as (
      values
        ('server_documents', 'id'),
        ('server_documents', 'user_id'),
        ('server_documents', 'scope_id'),
        ('server_documents', 'local_document_id'),
        ('server_documents', 'version'),
        ('server_documents', 'document_lifecycle'),
        ('server_documents', 'integrity_lock'),
        ('server_documents', 'status_legacy'),
        ('server_documents', 'payload_hash'),
        ('server_documents', 'snapshot_hash'),
        ('server_documents', 'pdf_content_hash'),
        ('server_documents', 'numserie'),
        ('server_documents', 'document_series'),
        ('server_document_versions', 'scope_id'),
        ('document_conflicts', 'scope_id'),
        ('document_conflicts', 'local_version'),
        ('document_conflicts', 'remote_version'),
        ('document_conflicts', 'expected_version')
    )
    select coalesce(string_agg(expected.table_name || '.' || expected.column_name, ',' order by expected.table_name, expected.column_name), '')
    from expected
    left join information_schema.columns columns
      on columns.table_schema = 'public'
     and columns.table_name = expected.table_name
     and columns.column_name = expected.column_name
    where columns.column_name is null;
  `;

  const missing = query(databaseUrl, sql);
  if (!missing || missing === BLOCKED_SCHEMA) return missing ? [missing] : [];
  return missing.split(",").filter(Boolean);
}

describeLocal("Phase 2C.17 Supabase local sync acceptance opt-in", () => {
  it("reports schema compatibility before any synthetic mutation", () => {
    const databaseUrl = process.env.PHASE2C17_SUPABASE_LOCAL_DB_URL;
    if (!databaseUrl) {
      expect(BLOCKED_SCHEMA).toBe("BLOCKED_SCHEMA_NOT_COMPATIBLE_WITH_2C_SYNC_ACCEPTANCE");
      return;
    }

    assertLocalDatabaseUrl(databaseUrl);
    const missing = missingCompatibilityColumns(databaseUrl);
    if (missing.length > 0) {
      expect(BLOCKED_SCHEMA).toBe("BLOCKED_SCHEMA_NOT_COMPATIBLE_WITH_2C_SYNC_ACCEPTANCE");
      return;
    }

    expect(missing).toEqual([]);
  });
});
