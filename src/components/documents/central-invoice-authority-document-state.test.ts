import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const stateComponent = readFileSync(
  new URL("./CentralInvoiceAuthorityDocumentState.tsx", import.meta.url),
  "utf8",
);
const documentList = readFileSync(
  new URL("./DocumentList.tsx", import.meta.url),
  "utf8",
);
const readOnlyActions = readFileSync(
  new URL("./DocumentReadOnlyActions.tsx", import.meta.url),
  "utf8",
);

describe("central invoice authority document state presentation", () => {
  it("centraliza la etiqueta visual usada en listado y detalle", () => {
    expect(stateComponent).toContain("CentralInvoiceAuthorityBadge");
    expect(stateComponent).toContain("CentralInvoiceAuthorityNotice");
    expect(documentList).toContain(
      'import { CentralInvoiceAuthorityBadge } from "@/components/documents/CentralInvoiceAuthorityDocumentState";',
    );
    expect(documentList).toContain(
      "<CentralInvoiceAuthorityBadge\n                          state={centralAuthorityState}",
    );
    expect(readOnlyActions).toContain(
      'import { CentralInvoiceAuthorityNotice } from "@/components/documents/CentralInvoiceAuthorityDocumentState";',
    );
    expect(readOnlyActions).toContain(
      "<CentralInvoiceAuthorityNotice state={centralAuthorityState} />",
    );
  });

  it("usa el mismo helper de estado sin convertir la vista en autoridad fiscal", () => {
    expect(readOnlyActions).toContain(
      "getCentralInvoiceAuthorityOperationState(doc)",
    );
    expect(readOnlyActions).toContain('doc.type === "factura"');

    for (const forbidden of [
      "fetch(",
      "localStorage",
      "getSupabaseClient",
      "getSupabaseAdmin",
      "issueCentralInvoiceAuthorityFromBrowser",
      "issueCentralInvoiceWithAuthority",
      "addDocumentWithCentralIdentity",
      "/api/central-invoice-authority/issue",
    ]) {
      expect(stateComponent).not.toContain(forbidden);
      expect(readOnlyActions).not.toContain(forbidden);
    }
  });

  it("hace visible la revisión central en el detalle sin cambiar acciones", () => {
    expect(stateComponent).toContain('role={state.requiresReview ? "alert" : "status"}');
    expect(stateComponent).toContain("state.statusHint");
    expect(stateComponent).toContain("text-amber-900");
    expect(stateComponent).toContain("text-blue-900");
    expect(readOnlyActions).toContain("<DocumentLinkBadges");
    expect(readOnlyActions).toContain("<DocumentPdfShareActions");
    expect(readOnlyActions).toContain("<MarkAsPaidButton");
  });
});
