export const CENTRAL_INVOICE_AUTHORITY_PHASE2_READINESS_GATES =
  "CENTRAL_INVOICE_AUTHORITY_PHASE2_READINESS_GATES_V1";

export type CentralInvoiceAuthorityReadinessStatus =
  | "blocked"
  | "ready_for_additive_schema";

export type CentralInvoiceAuthorityReadinessBlocker =
  | "production_baseline_not_reconciled"
  | "restorable_backup_not_verified"
  | "isolated_restore_drill_missing"
  | "authority_mode_not_off"
  | "production_migration_approval_missing"
  | "unexpected_pitr_requirement"
  | "central_schema_already_present_before_gate";

export type CentralInvoiceAuthorityReadinessMode =
  | "off"
  | "shadow"
  | "canary"
  | "required";

export interface CentralInvoiceAuthorityReadinessInput {
  baselineReconciledWithGit: boolean;
  restorableBackupVerified: boolean;
  isolatedRestoreDrillPassed: boolean;
  productionMigrationApproved: boolean;
  authorityMode: CentralInvoiceAuthorityReadinessMode;
  pitrRequiredByArchitecture: boolean;
  centralTablesPresent: boolean;
  issueRpcPresent: boolean;
}

export interface CentralInvoiceAuthorityReadinessResult {
  status: CentralInvoiceAuthorityReadinessStatus;
  additiveSchemaAllowed: boolean;
  pitrBlocking: boolean;
  blockers: CentralInvoiceAuthorityReadinessBlocker[];
}

export function evaluateCentralInvoiceAuthorityReadiness(
  input: CentralInvoiceAuthorityReadinessInput,
): CentralInvoiceAuthorityReadinessResult {
  const blockers: CentralInvoiceAuthorityReadinessBlocker[] = [];

  if (!input.baselineReconciledWithGit) {
    blockers.push("production_baseline_not_reconciled");
  }
  if (!input.restorableBackupVerified) {
    blockers.push("restorable_backup_not_verified");
  }
  if (!input.isolatedRestoreDrillPassed) {
    blockers.push("isolated_restore_drill_missing");
  }
  if (input.authorityMode !== "off") {
    blockers.push("authority_mode_not_off");
  }
  if (!input.productionMigrationApproved) {
    blockers.push("production_migration_approval_missing");
  }
  if (input.pitrRequiredByArchitecture) {
    blockers.push("unexpected_pitr_requirement");
  }
  if (
    (input.centralTablesPresent || input.issueRpcPresent) &&
    (!input.baselineReconciledWithGit ||
      !input.restorableBackupVerified ||
      !input.isolatedRestoreDrillPassed)
  ) {
    blockers.push("central_schema_already_present_before_gate");
  }

  return {
    status: blockers.length === 0 ? "ready_for_additive_schema" : "blocked",
    additiveSchemaAllowed: blockers.length === 0,
    pitrBlocking: input.pitrRequiredByArchitecture,
    blockers,
  };
}

export function summarizeCentralInvoiceAuthorityReadiness(
  result: CentralInvoiceAuthorityReadinessResult,
): string {
  if (result.additiveSchemaAllowed) {
    return "ready_for_additive_schema";
  }
  return `blocked:${result.blockers.join(",")}`;
}
