import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260826073420_central_invoice_quote_relationship_assignment.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("central invoice quote relationship assignment schema", () => {
  it("resuelve factura y presupuesto dentro del mismo propietario", () => {
    expect(migration).toContain(
      "create or replace function public.set_central_invoice_quote_relationship_v1",
    );
    expect(migration).toContain("document_row.user_id = p_user_id");
    expect(migration).toContain("identity_row.user_id = p_user_id");
    expect(migration).toContain("entity_row.user_id = p_user_id");
    expect(migration).toContain("entity_row.entity_type = 'quote'");
    expect(migration).toContain(
      "v_quote.current_payload->>'id' is distinct from p_quote_entity_id",
    );
    expect(migration).toContain(
      "v_quote.current_payload->>'type' is distinct from 'presupuesto'",
    );
  });

  it("impide que dos facturas centrales reclamen el mismo presupuesto", () => {
    expect(migration).toContain(
      "p_user_id::text || ':central-invoice-quote-relationship'",
    );
    expect(migration).toContain("candidate.user_id = p_user_id");
    expect(migration).toContain("candidate.id <> v_document.id");
    expect(migration).toContain(
      "central quote is already linked to another invoice",
    );
  });

  it("solo cambia el payload operativo y publica un evento versionado", () => {
    expect(migration).toContain("'quote_relationship_updated'");
    expect(migration).toContain("'invoice_relationship_updated'");
    expect(migration).toContain("'sourceQuoteDocumentId', p_quote_entity_id");
    expect(migration).toContain("'sourceQuoteNumber', v_quote_number");
    expect(migration).toContain("current_payload = v_next_payload");
    expect(migration).not.toMatch(/set\s+emitted_(?:snapshot|hash)\s*=/i);
  });

  it("queda cerrada a navegadores y conserva reintentos idempotentes", () => {
    expect(migration).toContain("requires service_role");
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
    expect(migration).toContain(
      "idempotency key reused with different relationship request",
    );
    expect(migration).toContain("'replayed'::text");
  });
});
