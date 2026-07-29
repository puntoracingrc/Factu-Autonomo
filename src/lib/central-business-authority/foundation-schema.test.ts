import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260729142156_central_business_authority_foundation.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("central business authority foundation", () => {
  it("keeps the new operational ledger additive and private", () => {
    expect(migration).toContain("CENTRAL_BUSINESS_AUTHORITY_FOUNDATION_V1");
    expect(migration).toContain(
      "create table if not exists public.central_business_entities",
    );
    expect(migration).toContain(
      "create table if not exists public.central_business_commands",
    );
    expect(migration).toContain(
      "create table if not exists public.central_business_outbox",
    );
    expect(migration).toContain(
      "alter table public.central_business_entities enable row level security",
    );
    expect(migration).toContain(
      "revoke all on table public.central_business_entities",
    );
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).not.toContain("sync_entities");
    expect(migration).not.toMatch(/\b(update|delete from)\s+public\.sync_entities\b/i);
  });

  it("requires server-only transactional writes", () => {
    expect(migration).toContain(
      "create or replace function public.mutate_central_business_entity_v1",
    );
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain(
      "if (select auth.role()) <> 'service_role' then",
    );
    expect(migration).toContain(
      "revoke all on function public.mutate_central_business_entity_v1",
    );
    expect(migration).toContain("grant execute on function");
    expect(migration).toContain("to service_role");
  });

  it("serializes entity versions and makes retries idempotent", () => {
    expect(migration).toContain(
      "central_business_commands_idempotency_uidx",
    );
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("for update");
    expect(migration).toContain(
      "central business entity version mismatch",
    );
    expect(migration).toContain(
      "idempotency key reused with different request",
    );
    expect(migration).toContain("'replayed'::text");
    expect(migration).toContain("'committed'::text");
  });

  it("commits canonical state, command result and outbox in one transaction", () => {
    expect(migration.trimStart()).toMatch(
      /^-- CENTRAL_BUSINESS_AUTHORITY_FOUNDATION_V1/,
    );
    expect(migration).toMatch(/\nbegin;\n/);
    expect(migration.trimEnd()).toMatch(/commit;$/);
    expect(migration).toContain(
      "insert into public.central_business_entities",
    );
    expect(migration).toContain(
      "insert into public.central_business_outbox",
    );
    expect(migration).toContain(
      "update public.central_business_commands",
    );
    expect(migration).toContain(
      "central_business_outbox_owner_entity_version_uidx",
    );
  });
});
