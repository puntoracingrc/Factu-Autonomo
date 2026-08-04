import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("central invoice relationship wiring", () => {
  it("desvincula desde ambas vistas sin retirar la gestion de gastos", () => {
    const workspace = source(
      "../../components/documents/InvoiceRelationshipWorkspace.tsx",
    );
    const manager = source(
      "../../components/documents/DocumentLinkManagerButton.tsx",
    );

    expect(workspace).toContain("unlinkDocumentQuote");
    expect(workspace).toContain("Desvincular presupuesto");
    expect(manager).toContain("unlinkDocumentQuote");
    expect(manager).toContain("Desvincular");
    expect(workspace).toContain("async function linkExpense");
    expect(workspace).toContain("async function unlinkExpense");
    expect(workspace).toContain('["gastos", `Gastos (${linkedExpenses.length})`]');
  });

  it("confirma primero en central y solo despues elimina la relacion local", () => {
    const store = source("../../context/AppStore.tsx");
    const start = store.indexOf("const unlinkDocumentQuote = useCallback");
    const end = store.indexOf("const issueDocument = useCallback", start);
    const command = store.slice(start, end);

    expect(command).toContain("unlinkCentralInvoiceQuoteFromBrowser");
    expect(command).toContain("if (!result.ok)");
    expect(command.indexOf("if (!result.ok)")).toBeLessThan(
      command.indexOf("applyConfirmedCentralQuoteUnlink"),
    );
    expect(command).toContain("confirmedCentralState: true");
  });

  it("preserva evidencia fiscal y limita la RPC al propietario", () => {
    const migration = source(
      "../../../supabase/migrations/20260804155708_central_invoice_quote_unlink_events.sql",
    );

    expect(migration).toContain("unlink_central_invoice_quote_v1");
    expect(migration).toContain("document_row.user_id = p_user_id");
    expect(migration).toContain("identity_row.user_id = p_user_id");
    expect(migration).toContain("- 'sourceQuoteDocumentId' - 'sourceQuoteNumber'");
    expect(migration).toContain("invoice_relationship_updated");
    expect(migration).toContain("to service_role");
    expect(migration).not.toMatch(/set\s+emitted_(?:snapshot|hash)\s*=/i);
  });

  it("reanuncia rectificativas y protege su factura original en central", () => {
    const migration = source(
      "../../../supabase/migrations/20260804155708_central_invoice_quote_unlink_events.sql",
    );

    expect(migration).toContain(
      "apply_central_rectification_original_state_v1",
    );
    expect(migration).toContain("cross_device_original_reference");
    expect(migration).toContain("then 'voided'");
    expect(migration).toContain("'rectification_issued'");
  });
});
