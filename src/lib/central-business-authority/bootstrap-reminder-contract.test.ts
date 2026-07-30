import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260730035815_extend_central_business_bootstrap_to_reminders.sql",
    import.meta.url,
  ),
  "utf8",
);
const previewRoute = readFileSync(
  new URL(
    "../../app/api/central-business-authority/bootstrap-preview/route.ts",
    import.meta.url,
  ),
  "utf8",
);
const commitRoute = readFileSync(
  new URL(
    "../../app/api/central-business-authority/bootstrap-commit/route.ts",
    import.meta.url,
  ),
  "utf8",
);

describe("central business reminder bootstrap contract", () => {
  it("keeps preview, commit and the audited RPC on the same entity set", () => {
    expect(previewRoute).toContain('"user_reminder"');
    expect(commitRoute).toContain('"user_reminder"');
    expect(migration).toContain("'user_reminder'");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("central_business_commands");
    expect(migration).toContain("central_business_outbox");
  });

  it("keeps the privileged RPC private from browser roles", () => {
    expect(migration).toContain(
      "revoke all on function public.bootstrap_central_business_entities_v1",
    );
    expect(migration).toContain(
      "grant execute on function public.bootstrap_central_business_entities_v1",
    );
    expect(migration).toContain("to service_role");
  });
});
