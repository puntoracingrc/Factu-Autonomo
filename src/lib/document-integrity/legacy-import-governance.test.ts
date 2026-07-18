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
    expect(agents).toContain("base, IVA y total");
    expect(agents).toContain("Rentabilidad Real");
    expect(agents).toContain("importedAt: null");
    expect(agents).toContain("issuerOrigin");
    expect(agents).toContain("documentStateAtImport");
    expect(agents).toContain(
      "V3 cubre únicamente relaciones históricas inequívocas",
    );
    expect(agents).toContain("bundle completo `legacy_backfill`");
    expect(agents).toContain(
      "contexto VeriFactu copiado del perfil no es un registro",
    );
    expect(agents).toContain("hash/sello inválido");
    expect(agents).toContain("`collectionStatusOverride`");

    expect(adr).toContain("Estado: Aceptado");
    expect(adr).toContain("LegacyImportAttestationV1");
    expect(adr).toContain("LegacyImportAttestationV2");
    expect(adr).toContain("LegacyImportAttestationV3");
    expect(adr).toContain("`importProvenance`");
    expect(adr).toContain("`importedAt: null`");
    expect(adr).toContain("`issuerOrigin: current_profile_at_import`");
    expect(adr).toContain("`documentStateAtImport`");
    expect(adr).toContain("sourceRecord");
    expect(adr).toContain("base, IVA, total");
    expect(adr).toContain("`acceptedState`");
    expect(adr).toContain("Cambiar después los campos de estado");
    expect(adr).toContain("fingerprint de grupo común");
    expect(adr).toContain("La confirmación V3 es atómica");
    expect(adr).toContain("attestNewImportedDocument");
    expect(adr).toContain("Una auditoría de seguridad");
    expect(adr).toContain("migración versionada");
    expect(adr).toContain("Versión de la decisión: 5");
    expect(adr).toContain("`collectionStatusOverride` V1");
    expect(adr).toContain("no modifica `status`, `paymentStatus`");
    expect(adr).toContain("`verified_importer_rollout_bundle`");
    expect(adr).toContain("snapshot + PDF técnico + sello");
    expect(adr).toContain("La copia JSON");
    expect(adr).toContain("flujo durable revisado");
  });

  it("keeps persistent provenance behind the central attestation policy", () => {
    const policy = readRepositoryFile(
      "src/lib/document-integrity/legacy-import-attestation.ts",
    );

    expect(policy).toContain("export function attestNewImportedDocument");
    expect(policy).toContain("legacyImportAttestation: attestation");
    expect(policy).toContain("legacyImportProvenance: provenance");
    expect(policy).toContain("importedAt: null");
    expect(policy).toContain(
      "export function inspectVerifiedImporterRolloutBundle",
    );
    expect(policy).toContain("sanitizeVerifiedRolloutSnapshot");
    expect(policy).toContain("verified_importer_rollout_bundle");

    importerContracts.forEach(({ path, provenance }) => {
      const importer = readRepositoryFile(path);
      expect(importer, path).toContain("attestNewImportedDocument");
      expect(importer, path).toContain(`"${provenance}"`);
      expect(importer, path).toContain("issuerOrigin");
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
