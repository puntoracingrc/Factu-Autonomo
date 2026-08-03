import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/20260803144514_central_authority_legacy_sync_cutover.sql",
  ),
  "utf8",
);

const auxiliaryEntityTypes = [
  "document_retirement_batch",
  "expense_inbox_alias",
  "expense_inbox_alias_history",
  "expense_inbox_item",
  "fiscal_notifications_workspace",
];

describe("central authority legacy sync cutover schema", () => {
  it("creates an inert per-owner cutover registry with durable evidence", () => {
    expect(migration).toContain(
      "create table if not exists public.central_authority_cutovers",
    );
    expect(migration).toContain("legacy_sync_state in ('active', 'rolled_back')");
    expect(migration).toContain("backup_sha256 ~ '^[0-9a-f]{64}$'");
    expect(migration).toContain("source_revision ~ '^[0-9a-f]{40}$'");
    expect(migration).not.toMatch(
      /insert\s+into\s+public\.central_authority_cutovers/i,
    );
    expect(migration).not.toMatch(/[\w.+-]+@[\w.-]+/);
  });

  it("keeps the registry owner-readable and server-managed", () => {
    expect(migration).toContain(
      "alter table public.central_authority_cutovers enable row level security",
    );
    expect(migration).toContain(
      "grant select on table public.central_authority_cutovers to authenticated",
    );
    expect(migration).toContain(
      "grant all on table public.central_authority_cutovers to service_role",
    );
    expect(migration).toMatch(
      /create policy central_authority_cutovers_owner_select_v1[\s\S]*?to authenticated[\s\S]*?auth\.uid\(\)\) = user_id/i,
    );
  });

  it("rejects generic legacy writes without blocking auxiliary services", () => {
    expect(migration).toContain(
      "create or replace function public.guard_central_cutover_legacy_sync_write_v1()",
    );
    expect(migration).toContain("security invoker");
    expect(migration).not.toContain("security definer");
    expect(migration).toContain("errcode = 'P4201'");
    expect(migration).toMatch(
      /before insert or update on public\.sync_entities/i,
    );
    for (const entityType of auxiliaryEntityTypes) {
      expect(migration).toContain(`'${entityType}'`);
    }
  });

  it("hides retired generic rows from authenticated legacy clients", () => {
    expect(migration).toMatch(
      /create policy sync_entities_central_cutover_guard_v1[\s\S]*?as restrictive[\s\S]*?for all[\s\S]*?to authenticated/i,
    );
    expect(migration).toContain("cutover.legacy_sync_state = 'active'");
    expect(migration.match(/not exists \(/g)).toHaveLength(2);
  });
});
