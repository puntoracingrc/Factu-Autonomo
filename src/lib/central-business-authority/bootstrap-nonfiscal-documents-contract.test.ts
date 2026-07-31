import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260731012933_extend_central_business_bootstrap_to_quotes_receipts.sql",
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
const bootstrapClient = readFileSync(
  new URL("./bootstrap-client.ts", import.meta.url),
  "utf8",
);

describe("central business non-fiscal document bootstrap contract", () => {
  it.each(["quote", "receipt"])(
    "keeps %s in browser snapshot, preview, commit and the audited RPC",
    (entityType) => {
      expect(bootstrapClient).toContain(`entityType: "${entityType}" as const`);
      expect(previewRoute).toContain(`"${entityType}"`);
      expect(commitRoute).toContain(`"${entityType}"`);
      expect(migration).toContain(`'${entityType}'`);
    },
  );

  it("keeps fiscal invoices and fiscal metadata outside the bootstrap lane", () => {
    expect(bootstrapClient).toContain(
      'entity.type === "presupuesto"',
    );
    expect(bootstrapClient).toContain('entity.type === "recibo"');
    expect(bootstrapClient).not.toContain('entity.type === "factura"');
    expect(migration).not.toContain("'invoice'");
    expect(migration).toContain("<> 'presupuesto'");
    expect(migration).toContain("<> 'recibo'");
    expect(migration).toContain("? 'centralInvoiceAuthority'");
    expect(migration).toContain("? 'rectification'");
    expect(migration).toContain("? 'verifactu'");
  });

  it("keeps the privileged transaction private and all-or-nothing", () => {
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("central_business_commands");
    expect(migration).toContain("central_business_outbox");
    expect(migration).toContain(
      "revoke all on function public.bootstrap_central_business_entities_v1",
    );
    expect(migration).toContain("to service_role");
  });
});
