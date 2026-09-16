import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/20260916071037_central_invoice_event_targeted_recovery.sql",
  ),
  "utf8",
);

describe("central invoice targeted event recovery migration", () => {
  it("is service-role-only and tenant scoped", () => {
    expect(migration).toContain(
      "create or replace function public.get_central_invoice_event_v1",
    );
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain("auth.role() <> 'service_role'");
    expect(migration).toContain("o.id = p_event_id");
    expect(migration).toContain("o.user_id = p_user_id");
    expect(migration).toContain("d.user_id = p_user_id");
    expect(migration).toContain("i.user_id = p_user_id");
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
  });
});
