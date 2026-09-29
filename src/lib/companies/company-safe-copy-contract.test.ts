import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath =
  "supabase/migrations/20260929154242_copy_safe_company_catalog.sql";

describe("safe company copy contract", () => {
  it("creates the company and reusable catalog in one audited transaction", () => {
    const migration = readFileSync(migrationPath, "utf8");

    expect(migration).toMatch(/^begin;/);
    expect(migration.trimEnd()).toMatch(/commit;$/);
    expect(migration).toContain(
      "create or replace function public.create_app_company_from_source_v1",
    );
    expect(migration).toContain(
      "entity.entity_type in ('customer', 'supplier', 'product')",
    );
    expect(migration).toContain("public.mutate_central_business_entity_v1");
    expect(migration).toContain("'company_cloned'");
    expect(migration).toContain("source_company_id");
  });

  it("does not copy accounting, fiscal or document entities", () => {
    const migration = readFileSync(migrationPath, "utf8");
    const copiedCatalogFilter = migration.match(
      /entity\.entity_type in \(([^)]+)\)/,
    )?.[1];

    expect(copiedCatalogFilter).toBe("'customer', 'supplier', 'product'");
    expect(migration).not.toContain("central_invoice_documents");
    expect(migration).not.toContain("central_verifactu_records");
    expect(migration).not.toContain("central_business_document_series");
    expect(migration).not.toContain("workspace_auxiliary_entities");
    expect(migration).not.toContain("expense_inbox_items");
  });

  it("keeps the RPC private to the service role", () => {
    const migration = readFileSync(migrationPath, "utf8");

    expect(migration).toContain(
      "create_app_company_from_source_v1 requires service_role",
    );
    expect(migration).toContain(") from public, anon, authenticated;");
    expect(migration).toContain(") to service_role;");
  });
});
