import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationSource = readFileSync(
  new URL(
    "../../supabase/migrations/20260709100000_supabase_advisor_fixes.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("Supabase Advisor hardening migration", () => {
  it("keeps the admin health RPC executable only by the service role", () => {
    expect(migrationSource).toContain(
      "revoke all on function public.admin_health_snapshot() from public",
    );
    expect(migrationSource).toContain(
      "revoke all on function public.admin_health_snapshot() from anon",
    );
    expect(migrationSource).toContain(
      "revoke all on function public.admin_health_snapshot() from authenticated",
    );
    expect(migrationSource).toContain(
      "grant execute on function public.admin_health_snapshot() to service_role",
    );
  });

  it("adds covering indexes for admin restore foreign keys", () => {
    expect(migrationSource).toContain(
      "admin_user_restore_points_created_by_idx",
    );
    expect(migrationSource).toContain(
      "admin_user_restore_events_restore_point_idx",
    );
    expect(migrationSource).toContain(
      "admin_user_restore_events_safety_restore_point_idx",
    );
    expect(migrationSource).toContain(
      "admin_user_restore_events_restored_by_idx",
    );
  });
});
