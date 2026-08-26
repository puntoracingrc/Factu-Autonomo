import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260826110100_admin_user_recovery_tools.sql",
    import.meta.url,
  ),
  "utf8",
);
const rollback = readFileSync(
  new URL(
    "../../../supabase/rollbacks/20260826110100_admin_user_recovery_tools.down.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("admin recovery grants migration", () => {
  it("mantiene la tabla privada y limitada al service role", () => {
    expect(migration).toContain(
      "alter table public.admin_user_recovery_grants enable row level security",
    );
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
    expect(migration).not.toContain("grant select, insert, update, delete");
    expect(migration).not.toContain("create policy");
  });

  it("audita concesión, caducidad y revocación", () => {
    expect(migration).toContain("granted_by uuid");
    expect(migration).toContain("expires_at timestamptz not null");
    expect(migration).toContain("revoked_at timestamptz");
    expect(migration).toContain("revocation_reason text");
    expect(migration).toContain("admin_user_recovery_grants_granted_by_idx");
    expect(migration).toContain("admin_user_recovery_grants_revoked_by_idx");
    expect(migration).not.toContain("discarded_document_retirement");
  });

  it("incluye rollback explícito", () => {
    expect(rollback.trim()).toBe(
      "drop table if exists public.admin_user_recovery_grants;",
    );
  });
});
