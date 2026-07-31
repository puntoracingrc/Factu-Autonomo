import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/20260731004958_extend_central_business_mutations_to_quotes_receipts.sql",
  ),
  "utf8",
);

describe("central business non-fiscal document mutation schema", () => {
  it("admits quotes and receipts without admitting fiscal invoices", () => {
    expect(migration).toContain(
      "CENTRAL_BUSINESS_NON_FISCAL_DOCUMENT_MUTATIONS_V1",
    );
    expect(migration).toContain("'quote'");
    expect(migration).toContain("'receipt'");
    expect(migration).not.toContain("'invoice'");
    expect(migration).not.toContain("'rectification'");
    expect(migration).toContain(
      "drop constraint central_business_entities_type_v1",
    );
    expect(migration).toContain(
      "drop constraint central_business_commands_type_v1",
    );
    expect(migration).toContain(
      "drop constraint central_business_outbox_type_v1",
    );
  });

  it("preserves version, idempotency, replay and server-only guarantees", () => {
    expect(migration).toContain("p_expected_version");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("v_entity.current_payload = p_payload");
    expect(migration).toContain("'replayed'::text");
    expect(migration).toContain("security definer");
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
    expect(migration.trimEnd()).toMatch(/commit;$/);
  });
});
