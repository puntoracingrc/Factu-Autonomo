import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260730062000_extend_central_business_bootstrap_to_expenses_profile.sql",
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

describe("central business expense and profile bootstrap contract", () => {
  it.each(["expense", "recurring_expense", "profile"])(
    "keeps %s in preview, commit and the audited RPC",
    (entityType) => {
      expect(previewRoute).toContain(`"${entityType}"`);
      expect(commitRoute).toContain(`"${entityType}"`);
      expect(migration).toContain(`'${entityType}'`);
    },
  );

  it("keeps the profile singleton and owner bootstrap transaction fail closed", () => {
    expect(migration).toContain(
      "item.value ->> 'entityId' <> 'profile'",
    );
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
