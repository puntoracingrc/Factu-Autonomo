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
    expect(documentList).toContain(
      "workDocumentIds: canonicalDocumentChain",
    );
    expect(documentList).not.toContain("workDocumentIds: relationshipItems");
    expect(documentList).toContain("relationshipItems.length > 0");
    expect(documentList).toContain("items={relationshipItems}");
    expect(documentList).toContain("!canonicalDocumentChain.some(");
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

    expect(workspace).toContain(
      "const canonicalChainItems = useMemo(",
    );
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
});
