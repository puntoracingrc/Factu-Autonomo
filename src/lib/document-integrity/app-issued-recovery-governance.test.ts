import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readRepositoryFile(path: string): string {
  return readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8");
}

const ADR_PATH = "docs/architecture/ADR-0002-app-issued-document-recovery.md";

describe("app-issued document recovery governance", () => {
  it("loads the recovery exception and its fail-closed limits for every agent", () => {
    const agents = readRepositoryFile("AGENTS.md");
    const adr = readRepositoryFile(ADR_PATH);

    expect(agents).toContain(ADR_PATH);
    expect(agents).toContain("nunca fabrica un sello de emisión");
    expect(agents).toContain("sourceDocumentId");
    expect(agents).toContain("VeriFactu existentes");

    expect(adr).toContain("pre_canonical_rectification_v1");
    expect(adr).toContain("receipt_source_snapshot_gap_v1");
    expect(adr).toContain("Nunca se infiere una recuperación por fecha");
    expect(adr).toContain("nunca ocupa");
    expect(adr).toContain("`documentSnapshot`");
    expect(adr).toContain("no puede reconstruir el sello original");
    expect(adr).toContain("Una auditoría de seguridad");
  });

  it("keeps detection, apply and rollback behind one versioned domain policy", () => {
    const policy = readRepositoryFile(
      "src/lib/document-integrity/app-issued-recovery.ts",
    );

    expect(policy).toContain("buildAppIssuedDocumentRecoveryPreview");
    expect(policy).toContain("applyAppIssuedDocumentRecovery");
    expect(policy).toContain("buildAppIssuedDocumentRecoveryRollbackPreview");
    expect(policy).toContain("rollbackAppIssuedDocumentRecovery");
    expect(policy).toContain("app_issued_document_recovery");
    expect(policy).toContain("verifactuPersistence");
  });

  it("requires owner review for the ADR and all document-integrity changes", () => {
    const codeowners = readRepositoryFile(".github/CODEOWNERS");
    expect(codeowners).toContain(`/${ADR_PATH}`);
    expect(codeowners).toContain("/src/lib/document-integrity/**");
  });
});
