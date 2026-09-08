import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260908143000_central_workspace_historical_archive.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("central workspace historical archive schema", () => {
  it("stores one tenant-scoped archive without exposing it to clients", () => {
    expect(migration).toContain("CENTRAL_WORKSPACE_HISTORICAL_ARCHIVE_V1");
    expect(migration).toContain(
      "create table if not exists public.central_workspace_historical_archives",
    );
    expect(migration).toContain(
      "create table if not exists public.central_workspace_historical_documents",
    );
    expect(migration).toContain("user_id uuid primary key");
    expect(migration).toContain("primary key (user_id, archive_id, local_document_id)");
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("to anon, authenticated");
    expect(migration).toContain("using (false)");
    expect(migration).toContain("with check (false)");
    expect(migration).toContain("to service_role");
    expect(migration).not.toContain("create policy central_workspace_historical_archives_select");
  });

  it("bounds uploads and keeps ready archives immutable", () => {
    expect(migration).toContain("expected_document_count between 1 and 10000");
    expect(migration).toContain("jsonb_array_length(p_documents) > 100");
    expect(migration).toContain("pg_catalog.octet_length(payload::text) between 2 and 524288");
    expect(migration).toContain("stored_payload_bytes between 0 and 67108864");
    expect(migration).toContain("archive exceeds storage limit");
    expect(migration).toContain("ready central workspace historical archive is immutable");
    expect(migration).toContain("central workspace historical document changed during upload");
    expect(migration).toContain("for update");
    expect(migration).toContain("pg_catalog.pg_advisory_xact_lock");
  });

  it("finalizes only a complete archive with the ordered manifest hash", () => {
    expect(migration).toContain(
      "create or replace function public.finalize_central_workspace_historical_archive_v1",
    );
    expect(migration).toContain("extensions.digest(");
    expect(migration).toContain(
      "document.local_document_id || ':' || document.content_hash",
    );
    expect(migration).toContain(
      'order by document.local_document_id collate "C"',
    );
    expect(migration).toContain("v_count <> v_archive.expected_document_count");
    expect(migration).toContain("v_manifest_hash <> v_archive.manifest_hash");
    expect(migration).toContain("status = 'ready'");
  });

  it("requires service-role RPC calls and remains additive", () => {
    expect(migration.match(/auth\.role\(\) <> 'service_role'/g)).toHaveLength(3);
    expect(migration.match(/security definer/g)).toHaveLength(3);
    expect(migration.match(/set search_path = ''/g)).toHaveLength(3);
    expect(migration.trimStart()).toMatch(/^-- CENTRAL_WORKSPACE_HISTORICAL_ARCHIVE_V1/);
    expect(migration).toMatch(/\nbegin;\n/);
    expect(migration.trimEnd()).toMatch(/commit;$/);
    expect(migration).not.toMatch(/\b(update|delete from)\s+public\.central_invoice_/i);
    expect(migration).not.toMatch(/\b(update|delete from)\s+public\.central_business_/i);
  });
});
