import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260731040000_central_nonfiscal_document_numbering.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("central non-fiscal document numbering schema", () => {
  it("keeps historical bootstrap rows valid while identifying new documents", () => {
    expect(migration).toContain("add column if not exists authority_number");
    expect(migration).toContain("authority_number is null");
    expect(migration).toContain("entity_type in ('quote', 'receipt')");
    expect(migration).toContain(
      "central_business_entities_authority_number_uidx",
    );
    expect(migration).toContain("where authority_number is not null");
  });

  it("requires an immutable historical baseline before allocating", () => {
    expect(migration).toContain(
      "create table if not exists\n  public.central_business_document_series_reconciliations",
    );
    expect(migration).toContain(
      "central_business_document_reconciliations_immutable_bud_v1",
    );
    expect(migration).toContain(
      "central business document series baseline not reconciled",
    );
    expect(migration).toContain(
      "reconcile_central_business_document_series_v1",
    );
    expect(migration).toContain(
      "v_resulting_sequence := greatest(",
    );
  });

  it("serializes owner, entity and series work in one database transaction", () => {
    expect(migration).toContain(
      "'central-business-owner:' || new.user_id::text",
    );
    expect(migration).toContain(
      "central_business_commands_owner_lock_biu_v1",
    );
    expect(migration).toContain(
      "new central document requires server numbering",
    );
    expect(migration).toContain(
      "central_business_bootstraps_mark_transaction_bi_v1",
    );
    expect(migration).toContain(
      "'factu.central_business_bootstrap'",
    );
    expect(migration).toContain("for update");
    expect(migration).toContain("operation_kind,\n    payload,");
    expect(migration).toContain("result_event_id = v_event.id");
    expect(migration.trimEnd()).toMatch(/commit;$/u);
  });

  it("allocates unique monotonic identities without reusing tombstones", () => {
    expect(migration).toContain(
      "central_business_entities_authority_sequence_uidx",
    );
    expect(migration).toContain(
      "v_sequence := v_series.last_sequence + 1",
    );
    expect(migration).toContain(
      "and authority_number = v_full_number",
    );
    expect(migration).toContain("last_sequence = v_sequence");
    expect(migration).not.toContain(
      "where authority_number is not null\n    and deleted = false",
    );
  });

  it("uses one non-resetting scope when a template omits the year", () => {
    expect(migration).toContain(
      "when pg_catalog.strpos(p_number_template, '{year}') > 0",
    );
    expect(migration).toContain("then p_fiscal_year\n    else 0");
  });

  it("hashes the exact numbered payload and excludes fiscal invoices", () => {
    expect(migration).toContain(
      "central_business_stable_json_text_v1(v_payload)",
    );
    expect(migration).toContain("extensions.digest(");
    expect(migration).toContain("? 'centralInvoiceAuthority'");
    expect(migration).toContain("? 'rectification'");
    expect(migration).toContain("? 'verifactu'");
    expect(migration).not.toContain("'invoice'");
  });

  it("keeps tables and RPCs private to the server role", () => {
    expect(migration).toContain(
      "alter table public.central_business_document_series enable row level security",
    );
    expect(migration).toContain(
      "central_business_document_series_deny_clients_v1",
    );
    expect(migration).toContain(
      "revoke all on function public.create_central_business_document_v1",
    );
    expect(migration).toContain(
      "revoke all on function public.reconcile_central_business_document_series_v1",
    );
    expect(migration).toContain("to service_role");
  });
});
