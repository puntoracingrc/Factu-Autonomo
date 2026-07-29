import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260729233658_central_business_bootstrap_commit.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("central business bootstrap commit schema", () => {
  it("mantiene auditoria privada y una RPC exclusiva de service_role", () => {
    expect(migration).toContain(
      "create table if not exists public.central_business_bootstraps",
    );
    expect(migration).toContain(
      "alter table public.central_business_bootstraps enable row level security",
    );
    expect(migration).toContain(
      "revoke all on table public.central_business_bootstraps",
    );
    expect(migration).toContain(
      "create or replace function public.bootstrap_central_business_entities_v1",
    );
    expect(migration).toContain("auth.jwt() ->> 'role'");
    expect(migration).toContain(
      "revoke all on function public.bootstrap_central_business_entities_v1",
    );
  });

  it("serializa por propietario y aborta reducciones o conflictos", () => {
    expect(migration).toContain(
      "central_business_commands_owner_lock_bi_v1",
    );
    expect(migration).toContain(
      "'central-business-owner:' || p_user_id::text",
    );
    expect(migration).toContain(
      "central business bootstrap contains central-only entities",
    );
    expect(migration).toContain(
      "central business bootstrap entity conflict",
    );
    expect(migration).toContain("errcode = 'P4113'");
  });

  it("crea comandos, entidades y outbox dentro de la misma transaccion", () => {
    expect(migration).toContain(
      "insert into public.central_business_commands",
    );
    expect(migration).toContain(
      "insert into public.central_business_entities",
    );
    expect(migration).toContain("insert into public.central_business_outbox");
    expect(migration).toContain(
      "update public.central_business_bootstraps",
    );
  });
});
