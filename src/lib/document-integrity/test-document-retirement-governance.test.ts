import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readRepositoryFile(path: string): string {
  return readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8");
}

const ADR_PATH =
  "docs/architecture/ADR-0003-explicit-test-document-retirement.md";

describe("explicit discarded document retirement governance", () => {
  it("loads the narrow reversible exception for every repository agent", () => {
    const agents = readRepositoryFile("AGENTS.md");
    const adr = readRepositoryFile(ADR_PATH);

    expect(agents).toContain(ADR_PATH);
    expect(agents).toContain("nunca se vuelve borrable");
    expect(agents).toContain("prohibidos emails");
    expect(agents).toContain("copia JSON");
    expect(agents).toContain("receiptDocumentId");
    expect(agents).toContain("server_confirmed");
    expect(agents).toContain("no se\n  regeneran ni reinterpretan");
    expect(agents).toContain("No se suben tombstones");

    expect(adr).toContain("Versión: 2");
    expect(adr).toContain("documentos descartados");
    expect(adr).toContain("importaciones históricas");
    expect(adr).toContain("rectificativa superviviente");
    expect(adr).toContain("sesión propietaria confirmada");
    expect(adr).toContain("selección es explícita");
    expect(adr).toContain("commit es atómico y durable");
    expect(adr).toContain("eventos append-only");
    expect(adr).toContain("No se reducen contadores");
    expect(adr).toContain("rollback explícito");
    expect(adr).toContain("cliente antiguo puede");
    expect(adr).toContain("update\ncondicional");
    expect(adr).toContain("RPC transaccional");
    expect(adr).toContain("no puede convertirse en un borrado general");
  });

  it("keeps preview, apply and rollback behind one versioned policy", () => {
    const policy = readRepositoryFile(
      "src/lib/document-integrity/test-document-retirement.ts",
    );

    expect(policy).toContain("buildTestDocumentRetirementPreview");
    expect(policy).toContain("applyTestDocumentRetirement");
    expect(policy).toContain("buildTestDocumentRetirementRollbackPreview");
    expect(policy).toContain("rollbackTestDocumentRetirement");
    expect(policy).toContain("explicit_test_document_retirement_v1");
    expect(policy).toContain("verifactuPersistence");
    expect(policy).not.toContain("persianasalmar");
  });

  it("requires owner review for the ADR and central integrity policy", () => {
    const codeowners = readRepositoryFile(".github/CODEOWNERS");
    expect(codeowners).toContain(`/${ADR_PATH}`);
    expect(codeowners).toContain("/src/lib/document-integrity/**");
    expect(codeowners).toContain("/src/lib/storage.ts");
  });
});
