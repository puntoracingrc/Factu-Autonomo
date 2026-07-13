import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const cardSource = readFileSync(
  new URL("./AppIssuedDocumentRecoveryCard.tsx", import.meta.url),
  "utf8",
);
const gateSource = readFileSync(
  new URL("./app-issued-document-recovery-gate.ts", import.meta.url),
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
  it("construye preview completa y sella un único candidateKey seleccionado", () => {
    expect(cardSource).toContain("buildAppIssuedDocumentRecoveryPreview(data)");
    expect(cardSource).toContain("pdfEvidenceByDocumentId");
    expect(cardSource).toContain("selectedCandidateKeys: selectedCandidateKey");
    expect(cardSource).toContain("candidate.candidateKey");
    expect(cardSource).toContain("selectedPreview.requiredPdfDocumentIds.map");
    expect(cardSource).toContain("selectedPreview.unknownCandidateKeys.length");
    expect(cardSource).toContain("Elige un único grupo para revisar");
    expect(cardSource).toContain("No se aplican lotes generales");
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

  it("exige descarga, relectura y confirmación ligadas a identidad, precondición y grupo", () => {
    expect(cardSource).toContain("downloadBackup(expected)");
    expect(cardSource).toContain("readBackupFile(file)");
    expect(cardSource).toContain("verifyAppIssuedRecoveryBackup({");
    expect(cardSource).toContain(
      "isAppIssuedRecoveryBackupFileSizeAllowed(file.size)",
    );
    expect(cardSource).toContain("applyBackupVerified &&");
    expect(cardSource).toContain("checked={applyBackupConfirmed}");
    expect(cardSource).toMatch(/lo\s+conservaré junto con los PDF/);
    expect(gateSource).toContain("input.proof.data === input.currentData");
    expect(gateSource).toContain(
      "input.proof.precondition === input.precondition",
    );
    expect(gateSource).toContain(
      "input.proof.candidateKey === input.candidateKey",
    );
    expect(gateSource).toContain("verifiedBackupProofKey");
    expect(cardSource).toContain("BACKUP_SCOPE_NOTICE");
    expect(cardSource).toContain(
      "Descargar copia JSON completa para este grupo",
    );
    expect(cardSource).toContain("Descarga iniciada para esta vista");
    expect(cardSource).not.toContain('href="#datos-privacidad"');
  });

  it("invalida copia y confirmaciones al cambiar datos, scope o stale", () => {
    expect(gateSource).toContain("input.proof?.action === input.action");
    expect(cardSource).toContain("setVerifiedBackupProofKey(null)");
    expect(cardSource).toContain("setConfirmedBackupProofKey(null)");
    expect(cardSource).toMatch(
      /setSelectedCandidateKey\(null\);[\s\S]*setPdfEvidenceByDocumentId\(\{\}\);[\s\S]*setBackupProof\(null\);[\s\S]*\}, \[data\]\);/,
    );
    expect(cardSource).toMatch(
      /\[selectedCandidateKey, selectedPreview\.precondition\]/,
    );
    expect(cardSource).toMatch(
      /\[selectedRollbackCandidateKey, selectedRollbackPreview\.precondition\]/,
    );
    expect(cardSource).toContain('result.reason === "stale_preview"');
    expect(cardSource).toContain('result.reason === "stale_precondition"');
    expect(cardSource).toContain('result.reason === "candidate_invalid"');
  });

  it("confirma todos los documentos y la relación antes de aplicar el grupo", () => {
    expect(cardSource).toContain(
      "selectedGroup.members.map((member) => member.documentId)",
    );
    expect(cardSource).toContain("confirmedApplyDocumentIds.includes");
    expect(cardSource).toContain("toggleConfirmedDocument");
    expect(cardSource).toContain(
      "confirmedApplyPrecondition === selectedPreview.precondition",
    );
    expect(cardSource).toContain(
      "applyAppIssuedDocumentRecovery(selectedPreview, data)",
    );
    expect(cardSource).toContain(
      "selectedPreview.requiredPdfDocumentIds.length === 0 &&",
    );
    expect(cardSource).toContain(
      "selectedPreview.requiredPdfDocumentIds.length > 0",
    );
    expect(cardSource).toContain("Confirmo este grupo exacto");
    expect(cardSource).toContain("Confirmo este documento individual");
    expect(cardSource).toContain("su evidencia preservada");
    expect(cardSource).toContain("Aplicar solo este grupo");
    expect(cardSource).toContain('result.status === "blocked"');
    expect(cardSource).toContain('result.status === "indeterminate"');
    expect(cardSource).toContain("<ConfirmedFiscalContent");
    expect(cardSource).toContain("Emisor:");
    expect(cardSource).toContain("Cliente:");
    expect(cardSource).toContain("Línea {index + 1}:");
    expect(cardSource).toMatch(/todas\s+las líneas, base, IVA, total y notas/);
  });

  it("ofrece rollback seleccionado con una copia nueva y precondición propia", () => {
    expect(cardSource).toContain(
      "buildAppIssuedDocumentRecoveryRollbackPreview(data)",
    );
    expect(cardSource).toContain(
      "selectedCandidateKeys: selectedRollbackCandidateKey",
    );
    expect(cardSource).toContain("rollbackBackupVerified &&");
    expect(cardSource).toContain("checked={rollbackBackupConfirmed}");
    expect(cardSource).toMatch(
      /rollbackAppIssuedDocumentRecovery\(\s*selectedRollbackPreview,\s*data/,
    );
    expect(cardSource).toContain("Descargar copia JSON antes del rollback");
    expect(cardSource).toContain("Deshacer solo este grupo");
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
    expect(cardSource).toContain("preview.candidates.length > 0 &&");
    expect(cardSource).toContain("actionableReview.length > 0 &&");
    expect(cardSource).toContain("REVIEW_LABELS[reason]");
    expect(cardSource).toContain("no fabrica el sello perdido");
    expect(cardSource).toContain("no modifica ningún registro");
    expect(cardSource).toContain("Veri*Factu");
    expect(cardSource).toContain("No se repararán ni se");
    expect(cardSource).toContain("rebajará su protección automáticamente");
    expect(cardSource).toContain("TEST local no atestado");
    expect(cardSource).toContain("no acredita AEAT");
    expect(cardSource).toMatch(/Evidencia\s+server\/production/);
    expect(cardSource).toMatch(
      /member\.verifactuDisposition ===\s*"preserved_unattested_test_artifact"/,
    );
  });

  it("bloquea doble submit, estado indeterminado y cualquier autoaplicación", () => {
    expect(cardSource).toContain("applyLockRef.current");
    expect(cardSource).toContain("rollbackLockRef.current");
    expect(cardSource).toContain("storageStateUnknown");
    expect(cardSource).toContain("setStorageStateUnknown(true)");
    expect(cardSource).toContain("result.replayed");
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
