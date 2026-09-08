import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("wiring de la proyección visual de relaciones", () => {
  it("mantiene la cadena canónica para rentabilidad y usa la proyección solo al pintar el listado", () => {
    const documentList = source("./DocumentList.tsx");

    expect(documentList).toContain(
      "const canonicalDocumentChain = getDocumentChainItems(",
    );
    expect(documentList).toContain(
      "selectDocumentRelationshipPresentationItems(\n                canonicalDocumentChain,",
    );
    expect(documentList).toContain("workDocumentIds: canonicalDocumentChain");
    expect(documentList).not.toContain("workDocumentIds: relationshipItems");
    expect(documentList).toContain("relationshipItems.length > 0");
    expect(documentList).toContain("items={relationshipItems}");
    expect(documentList).toContain("quoteLinkEditable={editable}");
  });

  it("mantiene recibo e IDs de trabajo canónicos dentro del workspace", () => {
    const workspace = source("./InvoiceRelationshipWorkspace.tsx");
    const relatedIdsStart = workspace.indexOf(
      "function relatedWorkDocumentIds(",
    );
    const componentStart = workspace.indexOf(
      "export function InvoiceRelationshipWorkspace",
    );
    const relatedIdsBlock = workspace.slice(relatedIdsStart, componentStart);

    expect(workspace).toContain("const canonicalChainItems = useMemo(");
    expect(workspace).toContain(
      "selectDocumentRelationshipPresentationItems(canonicalChainItems, doc)",
    );
    expect(workspace).toContain(
      "const receiptItem = canonicalChainItems.find(",
    );
    expect(workspace).toContain("items={relationshipItems}");
    expect(relatedIdsBlock).toContain("getDocumentChainItems(");
    expect(relatedIdsBlock).not.toContain(
      "selectDocumentRelationshipPresentationItems",
    );
  });

  it("solo ofrece facturas libres desde un presupuesto y espera vínculos aún no sincronizados", () => {
    const manager = source("./DocumentLinkManagerButton.tsx");
    const workspace = source("./InvoiceRelationshipWorkspace.tsx");

    expect(manager).toContain("!invoice.sourceQuoteDocumentId");
    expect(manager).toContain("!invoice.sourceQuoteNumber");
    expect(manager).toContain("const unresolvedQuoteLink = Boolean(");
    expect(workspace).toContain("const unresolvedQuoteLink = Boolean(");
  });

  it("no prepara todos los candidatos hasta que el usuario abre vínculos", () => {
    const manager = source("./DocumentLinkManagerButton.tsx");

    expect(manager).toContain("if (!open || !relationshipInvoice) return [];");
    expect(manager).toContain(
      'if (!open || doc.type !== "presupuesto") return [];',
    );
  });
});
