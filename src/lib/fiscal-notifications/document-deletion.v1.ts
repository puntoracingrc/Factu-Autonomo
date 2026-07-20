import {
  assertBoundedId,
  assertBoundedOwnerScope,
} from "./input-contract";
import type { FiscalNotificationsWorkspace } from "./types";
import { parseFiscalNotificationsWorkspaceForPersistenceV1 } from "./workspace-persistence.v1";
import { retainReferencedFiscalNotificationSourcesV1 } from "./workspace-source-graph.v1";

export const FISCAL_NOTIFICATION_DOCUMENT_DELETION_VERSION_V1 =
  "1.0.0" as const;

export type FiscalNotificationDocumentDeletionAnalysisV1 =
  | Readonly<{
      status: "READY";
      documentId: string;
      relationCount: number;
      originalArchivedInDrive: boolean;
      driveFileIdsPreserved: readonly string[];
    }>
  | Readonly<{
      status: "BLOCKED";
      reason: "INVALID_WORKSPACE" | "OPERATIONAL_DEPENDENCIES";
    }>
  | Readonly<{ status: "NOT_FOUND" }>;

export type DeleteFiscalNotificationDocumentResultV1 =
  | Readonly<{
      status: "APPLIED";
      workspace: FiscalNotificationsWorkspace;
      removedDocumentId: string;
      removedRelationCount: number;
      driveFileIdsPreserved: readonly string[];
      drivePolicy: "PRESERVE_USER_DRIVE_ORIGINAL";
    }>
  | Readonly<{
      status: "BLOCKED";
      reason:
        | "INVALID_WORKSPACE"
        | "OPERATIONAL_DEPENDENCIES"
        | "RESULT_INVALID";
    }>
  | Readonly<{ status: "NOT_FOUND" }>;

export function analyzeFiscalNotificationDocumentDeletionV1(input: {
  readonly workspace: unknown;
  readonly ownerScope: string;
  readonly documentId: string;
}): FiscalNotificationDocumentDeletionAnalysisV1 {
  try {
    assertBoundedOwnerScope(input.ownerScope, "ownerScope");
    assertBoundedId(input.documentId, "documentId");
  } catch {
    return Object.freeze({ status: "BLOCKED", reason: "INVALID_WORKSPACE" });
  }
  const workspace = parseFiscalNotificationsWorkspaceForPersistenceV1(
    input.workspace,
    input.ownerScope,
  );
  if (!workspace) {
    return Object.freeze({ status: "BLOCKED", reason: "INVALID_WORKSPACE" });
  }
  const document = workspace.documents.find(
    (item) => item.id === input.documentId,
  );
  if (!document) return Object.freeze({ status: "NOT_FOUND" });
  if (hasOperationalDependencies(workspace, input.documentId)) {
    return Object.freeze({
      status: "BLOCKED",
      reason: "OPERATIONAL_DEPENDENCIES",
    });
  }
  const driveFileIdsPreserved = Object.freeze(
    (workspace.driveArchives ?? [])
      .filter((archive) => archive.documentIds.includes(input.documentId))
      .map((archive) => archive.driveFileId)
      .sort(),
  );
  return Object.freeze({
    status: "READY",
    documentId: input.documentId,
    relationCount: workspace.relations.filter(
      (relation) =>
        relation.sourceDocumentId === input.documentId ||
        relation.targetDocumentId === input.documentId,
    ).length,
    originalArchivedInDrive: driveFileIdsPreserved.length > 0,
    driveFileIdsPreserved,
  });
}

/**
 * Elimina únicamente la ficha y su proyección local. Los originales archivados
 * en Google Drive nunca se modifican ni se envían a la papelera desde aquí.
 */
export function deleteFiscalNotificationDocumentV1(input: {
  readonly workspace: unknown;
  readonly ownerScope: string;
  readonly documentId: string;
  readonly deletedAt: string;
}): DeleteFiscalNotificationDocumentResultV1 {
  const analysis = analyzeFiscalNotificationDocumentDeletionV1(input);
  if (analysis.status !== "READY") return analysis;
  if (!isIsoTimestamp(input.deletedAt)) {
    return Object.freeze({ status: "BLOCKED", reason: "RESULT_INVALID" });
  }
  const workspace = parseFiscalNotificationsWorkspaceForPersistenceV1(
    input.workspace,
    input.ownerScope,
  );
  if (!workspace) {
    return Object.freeze({ status: "BLOCKED", reason: "INVALID_WORKSPACE" });
  }
  const document = workspace.documents.find(
    (item) => item.id === input.documentId,
  );
  if (!document) return Object.freeze({ status: "NOT_FOUND" });

  const removedRelationIds = new Set(
    workspace.relations
      .filter(
        (relation) =>
          relation.sourceDocumentId === input.documentId ||
          relation.targetDocumentId === input.documentId,
      )
      .map((relation) => relation.id),
  );
  const removedTimelineIds = new Set(
    workspace.timeline
      .filter(
        (event) =>
          event.relationId !== undefined &&
          removedRelationIds.has(event.relationId),
      )
      .map((event) => event.id),
  );
  const remainingDocuments = workspace.documents.filter(
    (item) => item.id !== input.documentId,
  );
  const {
    packages,
    files: remainingFiles,
    auditEvents: retainedSourceAuditEvents,
  } =
    retainReferencedFiscalNotificationSourcesV1({
      ...workspace,
      documents: remainingDocuments,
    });
  const remainingAuthorityIds = new Set(
    [
      ...remainingDocuments.map((item) => item.authorityId),
      ...workspace.debts.map((item) => item.authorityId),
      ...workspace.cases.map((item) => item.authorityId),
      ...workspace.paymentPlans.map((item) => item.authorityId),
    ],
  );
  const driveArchives = (workspace.driveArchives ?? []).flatMap((archive) => {
    if (!archive.documentIds.includes(input.documentId)) return [archive];
    const documentIds = archive.documentIds.filter(
      (documentId) => documentId !== input.documentId,
    );
    return documentIds.length > 0 ? [{ ...archive, documentIds }] : [];
  });

  const candidate: FiscalNotificationsWorkspace = {
    ...workspace,
    revision: workspace.revision + 1,
    updatedAt: input.deletedAt,
    packages,
    files: remainingFiles,
    documents: remainingDocuments,
    parts: workspace.parts.filter(
      (part) => part.documentId !== input.documentId,
    ),
    authorities: workspace.authorities.filter((authority) =>
      remainingAuthorityIds.has(authority.id),
    ),
    references: workspace.references.filter(
      (reference) => reference.documentId !== input.documentId,
    ),
    evidence: workspace.evidence.filter(
      (item) => item.documentId !== input.documentId,
    ),
    relations: workspace.relations.filter(
      (relation) => !removedRelationIds.has(relation.id),
    ),
    analysisSnapshots: workspace.analysisSnapshots.filter(
      (snapshot) => snapshot.documentId !== input.documentId,
    ),
    paymentOptions: workspace.paymentOptions.filter(
      (option) => option.documentId !== input.documentId,
    ),
    cases: workspace.cases.map((item) => ({
      ...item,
      timelineEventIds: item.timelineEventIds.filter(
        (eventId) => !removedTimelineIds.has(eventId),
      ),
    })),
    timeline: workspace.timeline.filter(
      (event) => !removedTimelineIds.has(event.id),
    ),
    auditEvents: retainedSourceAuditEvents.filter(
      (event) =>
        !(
          (event.entityType === "DOCUMENT" &&
            event.entityId === input.documentId) ||
          (event.entityType === "RELATION" &&
            removedRelationIds.has(event.entityId))
        ),
    ),
    driveArchives,
  };
  const result = parseFiscalNotificationsWorkspaceForPersistenceV1(
    candidate,
    input.ownerScope,
  );
  if (!result) {
    return Object.freeze({ status: "BLOCKED", reason: "RESULT_INVALID" });
  }
  return Object.freeze({
    status: "APPLIED",
    workspace: result,
    removedDocumentId: input.documentId,
    removedRelationCount: analysis.relationCount,
    driveFileIdsPreserved: analysis.driveFileIdsPreserved,
    drivePolicy: "PRESERVE_USER_DRIVE_ORIGINAL",
  });
}

function hasOperationalDependencies(
  workspace: FiscalNotificationsWorkspace,
  documentId: string,
): boolean {
  const document = workspace.documents.find((item) => item.id === documentId);
  if (!document) return false;
  return (
    document.debtIds.length > 0 ||
    document.caseIds.length > 0 ||
    workspace.debts.some((debt) => debt.documentIds.includes(documentId)) ||
    workspace.debtObservations.some((item) => item.documentId === documentId) ||
    workspace.cases.some((item) => item.documentIds.includes(documentId)) ||
    workspace.paymentPlans.some((item) => item.sourceDocumentId === documentId) ||
    workspace.deadlineRules.some((item) => item.documentId === documentId) ||
    workspace.obligations.some((item) => item.sourceDocumentId === documentId) ||
    workspace.timeline.some((item) => item.documentId === documentId) ||
    workspace.accountingDrafts.some((item) => item.documentId === documentId)
  );
}

function isIsoTimestamp(value: string): boolean {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}
