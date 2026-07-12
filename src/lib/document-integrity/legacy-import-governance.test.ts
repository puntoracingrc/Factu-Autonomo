import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readRepositoryFile(path: string): string {
  return readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8");
}

const ADR_PATH = "docs/architecture/ADR-0001-historical-imported-documents.md";

const importerContracts = [
  {
    path: "src/lib/importers/pcfacturacion.ts",
    provenance: "pcfacturacion",
  },
  { path: "src/lib/importers/holded.ts", provenance: "holded" },
  {
    path: "src/lib/importers/facturadirecta.ts",
    provenance: "facturadirecta",
  },
  {
    path: "src/lib/importers/generic-documents.ts",
    provenance: "generic_documents",
  },
] as const;

describe("historical imported document governance", () => {
  it("loads the permanent invariant and versioned ADR for every repository agent", () => {
    const agents = readRepositoryFile("AGENTS.md");
    const adr = readRepositoryFile(ADR_PATH);

    expect(agents).toContain(ADR_PATH);
    expect(agents).toContain("legacy_imported + user_attested");
    expect(agents).toContain("app_issued");
    expect(agents).toContain("nunca se degrada a legacy");
    expect(agents).toContain("ausencia de `issuedAt`");

    expect(adr).toContain("Estado: Aceptado");
    expect(adr).toContain("LegacyImportAttestationV1");
    expect(adr).toContain("attestNewImportedDocument");
    expect(adr).toContain("Una auditoría de seguridad");
    expect(adr).toContain("migración versionada");
  });

  it("keeps persistent provenance behind the central attestation policy", () => {
    const policy = readRepositoryFile(
      "src/lib/document-integrity/legacy-import-attestation.ts",
    );

    expect(policy).toContain("export function attestNewImportedDocument");
    expect(policy).toContain("legacyImportAttestation: attestation");
    expect(policy).toContain("legacyImportProvenance: provenance");

    importerContracts.forEach(({ path, provenance }) => {
      const importer = readRepositoryFile(path);
      expect(importer, path).toContain("attestNewImportedDocument");
      expect(importer, path).toContain(`"${provenance}"`);
    });
  });

  it("assigns review ownership to every fiscal consumer of the policy", () => {
    const codeowners = readRepositoryFile(".github/CODEOWNERS");
    [
      "/src/lib/storage.ts",
      "/src/lib/document-integrity/**",
      "/src/lib/importers/**",
      "/src/lib/taxes.ts",
      "/src/lib/income.ts",
      "/src/lib/billing/fiscal-export-documents.ts",
      "/src/lib/billing/export-quarterly.ts",
      "/src/lib/billing/export-annual-pdf.ts",
    ].forEach((path) => expect(codeowners).toContain(path));
  });
});
