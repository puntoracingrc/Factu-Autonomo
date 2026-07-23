import { describe, expect, it } from "vitest";
import {
  CENTRAL_INVOICE_AUTHORITY_PHASE2_READINESS_GATES,
  evaluateCentralInvoiceAuthorityReadiness,
  summarizeCentralInvoiceAuthorityReadiness,
} from "./readiness";

const READY_INPUT = {
  baselineReconciledWithGit: true,
  restorableBackupVerified: true,
  isolatedRestoreDrillPassed: true,
  productionMigrationApproved: true,
  authorityMode: "off" as const,
  pitrRequiredByArchitecture: false,
  centralTablesPresent: false,
  issueRpcPresent: false,
};

describe("central invoice authority phase 2 readiness", () => {
  it("conserva el marcador contractual de fase 2", () => {
    expect(CENTRAL_INVOICE_AUTHORITY_PHASE2_READINESS_GATES).toBe(
      "CENTRAL_INVOICE_AUTHORITY_PHASE2_READINESS_GATES_V1",
    );
  });

  it("bloquea produccion sin baseline reconciliado, copia restaurable y ensayo aislado", () => {
    const result = evaluateCentralInvoiceAuthorityReadiness({
      ...READY_INPUT,
      baselineReconciledWithGit: false,
      restorableBackupVerified: false,
      isolatedRestoreDrillPassed: false,
      productionMigrationApproved: false,
    });

    expect(result).toMatchObject({
      status: "blocked",
      additiveSchemaAllowed: false,
      pitrBlocking: false,
    });
    expect(result.blockers).toEqual([
      "production_baseline_not_reconciled",
      "restorable_backup_not_verified",
      "isolated_restore_drill_missing",
      "production_migration_approval_missing",
    ]);
  });

  it("no convierte PITR en requisito de arquitectura", () => {
    const result = evaluateCentralInvoiceAuthorityReadiness(READY_INPUT);

    expect(result.pitrBlocking).toBe(false);
    expect(result.additiveSchemaAllowed).toBe(true);
  });

  it("bloquea si la autoridad central no esta apagada antes de la migracion", () => {
    const result = evaluateCentralInvoiceAuthorityReadiness({
      ...READY_INPUT,
      authorityMode: "shadow",
    });

    expect(result.blockers).toContain("authority_mode_not_off");
    expect(result.additiveSchemaAllowed).toBe(false);
  });

  it("bloquea si aparece esquema central antes de superar las puertas", () => {
    const result = evaluateCentralInvoiceAuthorityReadiness({
      ...READY_INPUT,
      baselineReconciledWithGit: false,
      centralTablesPresent: true,
    });

    expect(result.blockers).toContain("central_schema_already_present_before_gate");
  });

  it("resume el estado operativo sin datos sensibles", () => {
    const result = evaluateCentralInvoiceAuthorityReadiness({
      ...READY_INPUT,
      restorableBackupVerified: false,
    });

    expect(summarizeCentralInvoiceAuthorityReadiness(result)).toBe(
      "blocked:restorable_backup_not_verified",
    );
  });
});
