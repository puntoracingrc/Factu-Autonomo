import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260722234500_admin_error_recovery.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();
const rollback = readFileSync(
  new URL(
    "../../../supabase/rollbacks/20260722234500_admin_error_recovery.down.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();

describe("admin error recovery storage contract", () => {
  it("separates confirmed recovery from archival and preserves legacy rows", () => {
    expect(migration).toContain("add column if not exists resolution_source text");
    expect(migration).toContain("add column if not exists archived_at timestamptz");
    expect(migration).toContain("add column if not exists device_scope_hash text");
    expect(migration).toContain("'admin_manual_legacy'");
    expect(migration).toContain("archived_at = coalesce(archived_at, resolved_at)");
    expect(migration).toContain(
      "(resolution_source is null and resolved_at is null)",
    );
    expect(migration).toContain(
      "(resolution_source is not null and resolved_at is not null)",
    );
    expect(migration).toContain("archived_at is null or resolved_at is not null");
  });

  it("allows only the closed recovery sources", () => {
    expect(migration).toContain("'sync_push_verified'");
    expect(migration).toContain("'sync_cycle_verified'");
    expect(migration).toContain("'cloud_repair_verified'");
    expect(migration).not.toContain("user_agent =");
    expect(migration).not.toContain("metadata =");
  });

  it("stores only a server-side device hash for sync correlation", () => {
    expect(migration).toContain("app_error_events_device_scope_hash_v1");
    expect(migration).toContain("device_scope_hash ~ '^[0-9a-f]{64}$'");
    expect(migration).toContain("user_id,\n    device_scope_hash,");
    expect(migration).not.toContain("device_token");
  });

  it("preserves the service-only boundary", () => {
    expect(migration).toContain(
      "revoke all on table public.app_error_events from public, anon, authenticated",
    );
    expect(migration).toContain(
      "grant all on table public.app_error_events to service_role",
    );
    expect(migration).not.toMatch(
      /grant\s+[^;]*on table public\.app_error_events\s+to authenticated/u,
    );
    expect(migration).toContain(
      "revoke all on function public.archive_resolved_app_error_events_v1(uuid[])",
    );
    expect(migration).toContain("if auth.role() <> 'service_role'");
  });

  it("archives the complete solved selection atomically or does nothing", () => {
    expect(migration).toContain(
      "create or replace function public.archive_resolved_app_error_events_v1",
    );
    expect(migration).toContain("for update");
    expect(migration).toContain(
      "v_eligible_count <> cardinality(p_event_ids)",
    );
    expect(migration.indexOf("v_eligible_count <> cardinality(p_event_ids)")).toBeLessThan(
      migration.indexOf("update public.app_error_events as event"),
    );
    expect(migration).toContain("event.resolved_at is not null");
    expect(migration).toContain("event.archived_at is null");
    expect(migration).not.toContain("delete from public.app_error_events");
  });

  it("blocks rollback once automatic recovery or separate archival exists", () => {
    expect(rollback).toContain("admin_error_recovery_has_runtime_data");
    expect(rollback).toContain("resolution_source <> 'admin_manual_legacy'");
    expect(rollback).toContain("archived_at is distinct from resolved_at");
    expect(rollback).toContain("device_scope_hash is not null");
    expect(rollback).toContain(
      "drop function if exists public.archive_resolved_app_error_events_v1(uuid[])",
    );
    expect(rollback.indexOf("raise exception")).toBeLessThan(
      rollback.indexOf("drop column if exists archived_at"),
    );
  });
});
