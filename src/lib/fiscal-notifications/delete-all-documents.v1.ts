import { assertBoundedOwnerScope } from "./input-contract";
import type { FiscalNotificationsWorkspace } from "./types";
import { parseFiscalNotificationsWorkspaceForPersistenceV1 } from "./workspace-persistence.v1";

export const FISCAL_NOTIFICATION_DELETE_ALL_DOCUMENTS_VERSION_V1 =
  "1.0.0" as const;

export type DeleteAllFiscalNotificationDocumentsResultV1 =
  | Readonly<{
      status: "APPLIED";
      workspace: FiscalNotificationsWorkspace;
      removedDocumentIds: readonly string[];
      removedRelationCount: number;
      driveFileIdsPreserved: readonly string[];
      drivePolicy: "PRESERVE_USER_DRIVE_ORIGINALS";
    }>
  | Readonly<{
      status: "BLOCKED";
      reason: "INVALID_WORKSPACE" | "RESULT_INVALID";
    }>
  | Readonly<{ status: "NOT_FOUND" }>;

/**
 * Prepara el vaciado de todo el módulo como una sola reducción. El workspace
 * vacío se valida en memoria y ningún estado parcial llega al almacenamiento.
 */
export function deleteAllFiscalNotificationDocumentsV1(input: {
  readonly workspace: unknown;
  readonly ownerScope: string;
  readonly deletedAt: string;
}): DeleteAllFiscalNotificationDocumentsResultV1 {
  if (!isValidInput(input.ownerScope, input.deletedAt)) {
    return blocked("INVALID_WORKSPACE");
  }
  const original = parseFiscalNotificationsWorkspaceForPersistenceV1(
    input.workspace,
    input.ownerScope,
  );
  if (!original) return blocked("INVALID_WORKSPACE");
  if (original.documents.length === 0) {
    return Object.freeze({ status: "NOT_FOUND" as const });
  }

  const removedDocumentIds = original.documents.map((document) => document.id);
  const driveFileIdsPreserved = [
    ...new Set(
      (original.driveArchives ?? []).map((archive) => archive.driveFileId),
    ),
  ].sort();
  const workspace = parseFiscalNotificationsWorkspaceForPersistenceV1(
    {
      ...original,
      revision: original.revision + 1,
      updatedAt: input.deletedAt,
      packages: [],
      files: [],
      documents: [],
      parts: [],
      authorities: [],
      references: [],
      evidence: [],
      debts: [],
      debtObservations: [],
      cases: [],
      relations: [],
      analysisSnapshots: [],
      paymentOptions: [],
      paymentPlans: [],
      installments: [],
      interestCalculations: [],
      deadlineRules: [],
      obligations: [],
      timeline: [],
      accountingDrafts: [],
      auditEvents: [],
      driveArchives: [],
    },
    input.ownerScope,
  );
  if (!workspace || workspace.documents.length !== 0) {
    return blocked("RESULT_INVALID");
  }

  return Object.freeze({
    status: "APPLIED" as const,
    workspace,
    removedDocumentIds: Object.freeze([...removedDocumentIds]),
    removedRelationCount: original.relations.length,
    driveFileIdsPreserved: Object.freeze(driveFileIdsPreserved),
    drivePolicy: "PRESERVE_USER_DRIVE_ORIGINALS" as const,
  });
}

function isValidInput(ownerScope: string, deletedAt: string): boolean {
  try {
    assertBoundedOwnerScope(ownerScope, "ownerScope");
  } catch {
    return false;
  }
  const timestamp = Date.parse(deletedAt);
  return (
    Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString() === deletedAt
  );
}

function blocked(
  reason: Extract<
    DeleteAllFiscalNotificationDocumentsResultV1,
    { readonly status: "BLOCKED" }
  >["reason"],
): Readonly<{ status: "BLOCKED"; reason: typeof reason }> {
  return Object.freeze({ status: "BLOCKED" as const, reason });
}
