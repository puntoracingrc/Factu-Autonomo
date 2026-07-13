import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const cardSource = readFileSync(
  new URL("./ImportedLegacyDocumentRepairCard.tsx", import.meta.url),
  "utf8",
);
const accountSource = readFileSync(
  new URL("../../app/cuenta/page.tsx", import.meta.url),
  "utf8",
);
const appStoreSource = readFileSync(
  new URL("../../context/AppStore.tsx", import.meta.url),
  "utf8",
);

describe("ImportedLegacyDocumentRepairCard wiring", () => {
  it("ofrece preview explícita y persiste por el comando durable", () => {
    expect(cardSource).toContain("buildLegacyImportRepairPreview(data)");
    expect(cardSource).toContain(
      "applyImportedLegacyDocumentRepair(preview, data)",
    );
    expect(cardSource).toContain("preview.affectedCount > 0 &&");
    expect(cardSource).toContain("disabled={!confirmed}");
    expect(cardSource).toContain("Descargar copia antes");
    expect(cardSource).toContain("He descargado y guardado una copia JSON");
    expect(cardSource).toContain("deshacer de forma exacta");
    expect(cardSource).toContain('result.status === "indeterminate"');
    expect(cardSource).toContain('result.status === "blocked"');
    expect(cardSource).not.toContain("replaceDataIfCurrent");
    expect(cardSource).toContain("preview.candidates.map");
    expect(cardSource).toContain("candidate.documentNumber");
    expect(cardSource).toContain("candidate.amounts.subtotal");
    expect(cardSource).toContain("candidate.amounts.iva");
    expect(cardSource).toContain("candidate.amounts.total");
    expect(cardSource).toContain("candidate.completenessExceptions");
    expect(cardSource).toContain(
      "ISSUER_ORIGIN_LABELS[candidate.issuerOrigin]",
    );
    expect(cardSource).toContain("perfil activo durante la importación");
    expect(cardSource).toContain("campos antiguos incompletos");
    expect(cardSource).toContain("cuentas generales");
    expect(cardSource).toContain("ID interno:");
  });

  it("no tiene CTA cuando no hay candidatos y separa revisión manual", () => {
    expect(cardSource).toContain("preview.manualReview.length > 0 &&");
    expect(cardSource).toContain("Requieren revisión manual");
    expect(cardSource).toContain("preview.affectedCount === 0");
    expect(cardSource).toContain("No hay cambios seguros pendientes");
  });

  it("vive antes del importador en Cuenta > Importación", () => {
    const repair = accountSource.indexOf(
      "<ImportedLegacyDocumentRepairCard />",
    );
    const importer = accountSource.indexOf("Abrir importador");
    expect(repair).toBeGreaterThan(0);
    expect(importer).toBeGreaterThan(repair);
    expect(accountSource).toContain('id="importar-datos"');
  });

  it("AppStore publica memoria solo mediante commitDurableAppData", () => {
    expect(appStoreSource).toContain("runLegacyImportRepairCommand({");
    expect(appStoreSource).toContain("commit: commitDurableAppData");
  });
});
