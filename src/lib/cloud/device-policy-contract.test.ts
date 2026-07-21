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
const sessionMigration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260721190000_cloud_device_session_leases.sql",
    import.meta.url,
  ),
  "utf8",
);
const enforcementMigration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260721190100_cloud_device_session_enforcement.sql",
    import.meta.url,
  ),
  "utf8",
);
const sessionRollback = readFileSync(
  new URL(
    "../../../supabase/rollbacks/20260721190000_cloud_device_session_leases.down.sql",
    import.meta.url,
  ),
  "utf8",
);
const supabaseClient = readFileSync(
  new URL("../supabase/client.ts", import.meta.url),
  "utf8",
);
const cloudSyncIndicator = readFileSync(
  new URL("../../components/cloud/CloudSyncIndicator.tsx", import.meta.url),
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
    expect(sessionMigration).toContain("cloud_device_session_hash");
    expect(sessionMigration).toContain("factu-cloud-session-v1:");
    expect(sessionMigration).not.toMatch(/\bip(?:_address)?\b/i);
    expect(sessionMigration).not.toMatch(/user_agent/i);
  });

  it("binds each device token to one verified live Supabase session", () => {
    expect(sessionMigration).toContain("auth.jwt() ->> 'session_id'");
    expect(sessionMigration).toContain("claim_cloud_device_session");
    expect(sessionMigration).toContain("release_cloud_device_session");
    expect(sessionMigration).toContain("return 'session_conflict'");
    expect(sessionMigration).toContain("interval '2 minutes'");
    expect(sessionMigration).toContain(
      "grant execute on function public.claim_cloud_device_session(uuid, text, text)",
    );
    expect(sessionMigration).not.toMatch(
      /grant execute on function public\.claim_cloud_device_session[^;]*to authenticated/i,
    );
    expect(enforcementMigration).toContain(
      "set session_binding_required_at = statement_timestamp()",
    );
    expect(sessionRollback).toContain(
      "drop function if exists public.claim_cloud_device_session",
    );
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

  it("hides every cloud upload indicator when the plan has no cloud access", () => {
    expect(cloudSyncIndicator).toContain(
      'import { useBilling } from "@/context/BillingContext"',
    );
    expect(cloudSyncIndicator).toContain(
      "return !loading && limits.cloudSync",
    );
    expect(
      cloudSyncIndicator.match(/useCloudIndicatorAvailability\(\)/g),
    ).toHaveLength(4);
    expect(cloudSyncIndicator).toContain(
      "!cloudEnabled || !cloudAvailable || !user",
    );
    expect(cloudSyncIndicator).toContain(
      "if (!cloudEnabled || !cloudAvailable || !user)",
    );
    expect(cloudSyncIndicator).toContain(
      "if (pendingChangeCount === 0) return null",
    );
  });
});
