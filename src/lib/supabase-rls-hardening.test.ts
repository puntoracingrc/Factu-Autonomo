import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationSource = readFileSync(
  new URL(
    "../../supabase/migrations/20260709060000_phase7_rls_auth_uid_init_plan.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("Supabase RLS hardening migration", () => {
  it("uses the init-plan-safe auth.uid pattern for user-owned rows", () => {
    expect(migrationSource).toContain("using ((select auth.uid()) = user_id)");
    expect(migrationSource).toContain(
      "with check ((select auth.uid()) = user_id)",
    );
    expect(migrationSource).not.toContain("using (auth.uid() = user_id)");
    expect(migrationSource).not.toContain("with check (auth.uid() = user_id)");
  });

  it("keeps billing tables read-only for browser clients", () => {
    expect(migrationSource).toContain(
      "revoke all on table public.user_subscriptions from anon, authenticated",
    );
    expect(migrationSource).toContain(
      "revoke all on table public.user_usage from anon, authenticated",
    );
    expect(migrationSource).toContain(
      "grant select on table public.user_subscriptions to authenticated",
    );
    expect(migrationSource).toContain(
      "grant select on table public.user_usage to authenticated",
    );
    expect(migrationSource).not.toMatch(
      /grant\s+(insert|update|delete|all)\s+on table public\.user_(subscriptions|usage)\s+to authenticated/i,
    );
  });
});
