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
    expect(cardSource).toContain("downloadBackup(data)");
    expect(cardSource).toContain("backupPrecondition === preview.precondition");
    expect(cardSource).toContain("!confirmed ||");
    expect(cardSource).toContain("Descargar copia JSON completa antes");
    expect(cardSource).toContain("He guardado la copia JSON completa");
    expect(cardSource).toContain("restauración durable");
    expect(cardSource).toContain("BACKUP_SCOPE_NOTICE");
    expect(cardSource).toContain('result.status === "indeterminate"');
    expect(cardSource).toContain('result.status === "blocked"');
    expect(cardSource).toContain("storageStateUnknown");
    expect(cardSource).toContain('result.reason === "stale_precondition"');
    expect(cardSource).toContain("setBackupPrecondition(null)");
    expect(cardSource).toContain("applyLockRef.current");
    expect(cardSource).toContain("visibleCandidates");
    expect(cardSource).toContain("CANDIDATE_PAGE_SIZE");
    expect(cardSource).not.toContain("replaceDataIfCurrent");
    expect(cardSource).toContain("visibleCandidates.map");
    expect(cardSource).toContain("preview.relationshipGroups.map");
    expect(cardSource).toContain("group.groupFingerprint");
    expect(cardSource).toContain("RELATION_LABELS[group.relation]");
    expect(cardSource).toContain("RELATION_ROLE_LABELS[member.role]");
    expect(cardSource).toContain("una sola relación atómica");
    expect(cardSource).toContain("candidate.documentNumber");
    expect(cardSource).toContain("candidate.amounts.subtotal");
    expect(cardSource).toContain("candidate.amounts.iva");
    expect(cardSource).toContain("candidate.amounts.total");
    expect(cardSource).toContain("candidate.completenessExceptions");
    expect(cardSource).toContain(
      'candidate.evidenceBasis === "verified_importer_rollout_bundle"',
    );
    expect(cardSource).toContain(
      "paquetes técnicos de importación verificados",
    );
    expect(cardSource).toContain(
      "Paquete técnico coherente generado por el rollout antiguo",
    );
    expect(cardSource).toContain("no acreditan emisión por Factu");
    expect(cardSource).toContain(
      "ISSUER_ORIGIN_LABELS[candidate.issuerOrigin]",
    );
    expect(cardSource).toContain("perfil activo durante la importación");
    expect(cardSource).toContain("antiguos incompletos");
    expect(cardSource).toContain("sus miembros y vínculos son correctos");
    expect(cardSource).toContain(
      "result.value.appliedRelationshipGroupFingerprints.length",
    );
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
