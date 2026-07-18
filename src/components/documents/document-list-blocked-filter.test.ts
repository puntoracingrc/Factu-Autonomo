import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("./DocumentList.tsx", import.meta.url),
  "utf8",
);

describe("invoice list blocked filter", () => {
  it("expone el estado Bloqueadas y usa la selección fiscal canónica", () => {
    expect(source).toContain('{ value: "blocked", label: "Bloqueadas" }');
    expect(source).toContain("selectCanonicalFiscalDocumentsForExport");
    expect(source).toContain("fiscalBlockedDocumentIds.has(document.id)");
  });

  it("abre el filtro desde el enlace del resumen fiscal", () => {
    expect(source).toContain('requestedStatus === "bloqueadas"');
    expect(source).toContain('setStatusFilter("blocked")');
  });
});
