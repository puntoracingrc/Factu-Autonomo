import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const cardSource = readFileSync(
  new URL("./AppIssuedDocumentRecoveryCard.tsx", import.meta.url),
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

describe("AppIssuedDocumentRecoveryCard wiring", () => {
  it("queda integrada en Cuenta → Copias después de la copia manual", () => {
    expect(accountSource).toContain("<AppIssuedDocumentRecoveryCard />");
    expect(accountSource.indexOf("<DataOwnershipCard />")).toBeLessThan(
      accountSource.indexOf("<AppIssuedDocumentRecoveryCard />"),
    );
  });
  it("construye la preview inicial y la reconstruye solo con metadatos PDF", () => {
    expect(cardSource).toContain("buildAppIssuedDocumentRecoveryPreview(data)");
    expect(cardSource).toContain("pdfEvidenceByDocumentId");
    expect(cardSource).toMatch(
      /buildAppIssuedDocumentRecoveryPreview\(data,\s*pdfEvidenceByDocumentId\)/,
    );
    expect(cardSource).toContain("preview.requiredPdfDocumentIds.map");
    expect(cardSource).toContain("readAppIssuedRecoveryPdfFile(file)");
    expect(cardSource).toContain("sha256: fileEvidence.sha256");
    expect(cardSource).toContain("mediaType: fileEvidence.mediaType");
    expect(cardSource).toContain(
      "confirmedFiscalContentHash: snapshot.snapshotHash",
    );
    expect(cardSource).toContain('preservation: "user_managed"');
    expect(cardSource).not.toContain("useState<File");
    expect(cardSource).not.toContain("file.name");
    expect(cardSource).not.toContain("console.");
  });

  it("solo aplica con candidato, copia y confirmación ligadas a la precondición", () => {
    expect(cardSource).toContain("preview.affectedCount > 0 &&");
    expect(cardSource).toContain('href="#datos-privacidad"');
    expect(cardSource).toContain("Descargar copia JSON antes");
    expect(cardSource).toContain(
      "confirmedApplyPrecondition === preview.precondition",
    );
    expect(cardSource).toContain(
      "applyAppIssuedDocumentRecovery(preview, data)",
    );
    expect(cardSource).toContain(
      "preview.requiredPdfDocumentIds.length === 0 &&",
    );
    expect(cardSource).toContain("preview.requiredPdfDocumentIds.length > 0");
    expect(cardSource).toContain('result.status === "blocked"');
    expect(cardSource).toContain('result.status === "indeterminate"');
    expect(cardSource).toMatch(/pero no el sello de\s+emisión perdido/);
    expect(cardSource).toContain("<ConfirmedFiscalContent");
    expect(cardSource).toContain("Emisor:");
    expect(cardSource).toContain("Cliente:");
    expect(cardSource).toContain("Línea {index + 1}:");
    expect(cardSource).toContain("todas");
    expect(cardSource).toContain("las líneas, base, IVA, total, notas");
  });

  it("ofrece rollback explícito y bloquea cambios posteriores", () => {
    expect(cardSource).toContain(
      "buildAppIssuedDocumentRecoveryRollbackPreview(data)",
    );
    expect(cardSource).toContain(
      "confirmedRollbackPrecondition === rollbackPreview.precondition",
    );
    expect(cardSource).toContain(
      "rollbackAppIssuedDocumentRecovery(rollbackPreview, data)",
    );
    expect(cardSource).toContain("Deshacer recuperación");
    expect(cardSource).toContain("rollbackPreview.blockedRepairIds.length > 0");
    expect(cardSource).toMatch(/No se\s+ha sobrescrito nada/);
  });

  it("publica memoria solo después del commit durable único", () => {
    expect(appStoreSource).toContain("runAppIssuedDocumentRecoveryCommand({");
    expect(appStoreSource).toContain(
      "runAppIssuedDocumentRecoveryRollbackCommand({",
    );
    expect(appStoreSource).toContain("commit: commitDurableAppData");
    expect(cardSource).not.toContain("replaceDataIfCurrent");
  });

  it("separa los casos ambiguos y no degrada integridad ni VeriFactu", () => {
    expect(cardSource).toContain("actionableReview.length > 0 &&");
    expect(cardSource).toContain("REVIEW_LABELS[reason]");
    expect(cardSource).toContain("no fabrica el sello perdido");
    expect(cardSource).toContain("no modifica ningún registro");
    expect(cardSource).toContain("Veri*Factu");
    expect(cardSource).toContain("No se repararán ni se");
    expect(cardSource).toContain("rebajará su protección automáticamente");
  });

  it("no autoaplica desde effects y mantiene controles seguros en móvil", () => {
    const effectBlock = cardSource.slice(
      cardSource.indexOf("useEffect(() =>"),
      cardSource.indexOf("const visible"),
    );
    expect(effectBlock).not.toContain("applyAppIssuedDocumentRecovery(");
    expect(effectBlock).not.toContain("rollbackAppIssuedDocumentRecovery(");
    expect(cardSource).toContain("overflow-hidden");
    expect(cardSource).toContain("w-full min-w-0 max-w-full");
    expect(cardSource).toContain("sm:grid-cols-2");
    expect(cardSource).toContain("break-all");
    expect(cardSource).toContain("fullWidth");
  });
});
