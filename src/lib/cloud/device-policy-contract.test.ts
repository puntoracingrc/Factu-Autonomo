import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260720133000_user_devices.sql",
    import.meta.url,
  ),
  "utf8",
);
const rollback = readFileSync(
  new URL(
    "../../../supabase/rollbacks/20260720133000_user_devices.down.sql",
    import.meta.url,
  ),
  "utf8",
);
const supabaseClient = readFileSync(
  new URL("../supabase/client.ts", import.meta.url),
  "utf8",
);

describe("cloud device policy contract", () => {
  it("keeps device tokens hashed and the registry service-only", () => {
    expect(migration).toContain("cloud_device_token_hash");
    expect(migration).toContain("extensions.digest");
    expect(migration).toContain(
      "revoke all on table public.user_devices from public, anon, authenticated",
    );
    expect(migration).toContain(
      "grant all on table public.user_devices to service_role",
    );
    expect(migration).not.toMatch(/\bip(?:_address)?\b/i);
    expect(migration).not.toMatch(/user_agent/i);
  });

  it("enforces plan and active-device access on every cloud storage policy", () => {
    expect(migration).toContain("cloud_device_limit_for_user");
    expect(migration).toContain("when subscription.plan = 'pro_plus' then 5");
    expect(migration).toContain("else 2");
    expect(migration).toContain("and (select public.cloud_device_access_allowed())");
    expect(
      migration.match(/and \(select public\.cloud_device_access_allowed\(\)\)/g),
    ).toHaveLength(8);
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("cloud_device_limit_reached");
  });

  it("sends the local token only to Supabase REST and restores owner policies", () => {
    expect(supabaseClient).toContain('pathname.startsWith("/rest/v1/")');
    expect(supabaseClient).toContain("CLOUD_DEVICE_TOKEN_HEADER");
    expect(supabaseClient).toContain("deviceAwareFetch");
    expect(rollback).toContain(
      "using ((select auth.uid()) = user_id)",
    );
    expect(rollback).toContain("drop table if exists public.user_devices");
  });
});
