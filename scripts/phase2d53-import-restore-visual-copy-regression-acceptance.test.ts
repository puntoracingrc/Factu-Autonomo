import { describe, expect, it } from "vitest";
import {
  buildDisabledRecoverySnapshotDownloadPlaceholder,
  buildImportRestoreDataLossWarnings,
  buildImportRestoreUxLegalReviewPacket,
  getImportRestoreSyntheticUiFixture,
} from "../src/lib/local-data-safety";

// PHASE2D53_IMPORT_RESTORE_VISUAL_COPY_REGRESSION_ACCEPTANCE_V1

describe("phase 2D.53 import/restore visual copy regression acceptance", () => {
  it("keeps required safe copy and disabled reasons visible", () => {
    const fixture = getImportRestoreSyntheticUiFixture("SYNTHETIC_ONLY_PROTECTED_OVERWRITE_WARNING");
    const warnings = buildImportRestoreDataLossWarnings({
      fixture,
      generatedAt: "2026-06-27T00:00:00.000Z",
    });
    const placeholder = buildDisabledRecoverySnapshotDownloadPlaceholder({
      generatedAt: "2026-06-27T00:00:00.000Z",
    });
    const packet = buildImportRestoreUxLegalReviewPacket({
      fixture,
      warnings,
      recoverySnapshotPlaceholder: placeholder,
      generatedAt: "2026-06-27T00:00:00.000Z",
    });
    const copy = JSON.stringify({ warnings, placeholder, packet });

    expect(copy).toContain("preview sintetica");
    expect(copy).toContain("accion real sigue deshabilitada");
    expect(copy).toContain("Aplicar importacion o restauracion esta deshabilitado");
    expect(copy).toContain("revision externa");
    expect(copy).toContain("descarga de una copia de recuperacion queda deshabilitada");
  });

  it("does not use success, applied, product claim or absolute-safety language", () => {
    const fixture = getImportRestoreSyntheticUiFixture("SYNTHETIC_ONLY_SAFE_BACKUP_PREVIEW");
    const packet = buildImportRestoreUxLegalReviewPacket({
      fixture,
      generatedAt: "2026-06-27T00:00:00.000Z",
    });
    const copy = JSON.stringify(packet).toLowerCase();

    expect(copy).not.toMatch(/importacion completada|restauracion completada|aplicado correctamente/);
    expect(copy).not.toMatch(/producto listo|cumplimiento productivo|certificacion|homologacion/);
    expect(copy).not.toContain("seguro al 100%");
    expect(copy).not.toContain("restaurar ahora");
  });
});
