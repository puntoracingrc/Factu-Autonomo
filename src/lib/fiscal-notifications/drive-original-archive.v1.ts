import { assertBoundedId, assertBoundedOwnerScope } from "./input-contract";
import { projectFiscalNotificationStructuredHistoryV1 } from "./structured-review-history-view-model.v1";
import type {
  FiscalNotificationDriveArchiveRecordV1,
  FiscalNotificationsWorkspace,
} from "./types";
import { validateFiscalNotificationsWorkspaceIntegrity } from "./workspace-integrity";
import { parseFiscalNotificationsWorkspaceForPersistenceV1 } from "./workspace-persistence.v1";

const SHA256 = /^[0-9a-f]{64}$/u;
const DRIVE_ID = /^[A-Za-z0-9_-]{1,160}$/u;

export interface FiscalNotificationDriveArchiveCandidateV1 {
  readonly fileId: string;
  readonly documentIds: readonly string[];
  readonly sourceSha256: string;
  readonly documentDate: string | null;
  readonly documentTitle: string;
}

export type FiscalNotificationDriveArchiveInspectionV1 =
  | Readonly<{
      status: "READY_TO_ARCHIVE";
      candidate: FiscalNotificationDriveArchiveCandidateV1;
    }>
  | Readonly<{
      status: "ALREADY_ARCHIVED";
      candidate: FiscalNotificationDriveArchiveCandidateV1;
      archive: FiscalNotificationDriveArchiveRecordV1;
    }>
  | Readonly<{ status: "NOT_REGISTERED" }>
  | Readonly<{ status: "BLOCKED" }>;

export interface FiscalNotificationOriginalArchiveReceiptV1 {
  readonly sourceSha256: string;
  readonly driveFileId: string;
  readonly driveFolderId: string;
  readonly documentDate: string | null;
  readonly verification: "SHA256_READBACK_MATCH";
}

export type AppendFiscalNotificationDriveArchiveResultV1 =
  | Readonly<{
      status: "APPLIED";
      workspace: FiscalNotificationsWorkspace;
      archive: FiscalNotificationDriveArchiveRecordV1;
    }>
  | Readonly<{
      status: "EXISTING";
      workspace: FiscalNotificationsWorkspace;
      archive: FiscalNotificationDriveArchiveRecordV1;
    }>
  | Readonly<{ status: "BLOCKED" }>;

export function inspectFiscalNotificationDriveArchiveCandidateV1(
  value: unknown,
  ownerScope: string,
  sourceSha256: string,
): FiscalNotificationDriveArchiveInspectionV1 {
  try {
    assertBoundedOwnerScope(ownerScope, "ownerScope");
  } catch {
    return Object.freeze({ status: "BLOCKED" as const });
  }
  if (!SHA256.test(sourceSha256)) {
    return Object.freeze({ status: "BLOCKED" as const });
  }
  const workspace = parseFiscalNotificationsWorkspaceForPersistenceV1(
    value,
    ownerScope,
  );
  if (!workspace) return Object.freeze({ status: "BLOCKED" as const });
  const files = workspace.files.filter(
    (file) =>
      file.ownerScope === ownerScope && file.sha256 === sourceSha256,
  );
  if (files.length === 0) {
    return Object.freeze({ status: "NOT_REGISTERED" as const });
  }
  if (files.length !== 1) {
    return Object.freeze({ status: "BLOCKED" as const });
  }
  const file = files[0]!;
  const documents = workspace.documents
    .filter(
      (document) =>
        document.ownerScope === ownerScope && document.fileId === file.id,
    )
    .sort((left, right) => left.id.localeCompare(right.id));
  if (documents.length === 0) {
    return Object.freeze({ status: "BLOCKED" as const });
  }
  const history = projectFiscalNotificationStructuredHistoryV1(
    workspace,
    ownerScope,
  );
  if (history.status === "BLOCKED") {
    return Object.freeze({ status: "BLOCKED" as const });
  }
  const historyById = new Map(history.entries.map((entry) => [entry.key, entry]));
  const dates = new Set<string>();
  let hasUnknownDate = false;
  for (const document of documents) {
    const date = historyById.get(document.id)?.documentDate ?? null;
    if (date) dates.add(date);
    else hasUnknownDate = true;
  }
  const documentDate = !hasUnknownDate && dates.size === 1
    ? [...dates][0]!
    : null;
  const documentTitle =
    documents.length === 1
      ? (historyById.get(documents[0]!.id)?.title ?? documents[0]!.titleRaw)
      : "Expediente tributario";
  const candidate = Object.freeze({
    fileId: file.id,
    documentIds: Object.freeze(documents.map((document) => document.id)),
    sourceSha256,
    documentDate,
    documentTitle,
  });
  const archive = (workspace.driveArchives ?? []).find(
    (entry) =>
      entry.ownerScope === ownerScope &&
      entry.fileId === file.id &&
      entry.sourceSha256 === sourceSha256,
  );
  return archive
    ? Object.freeze({
        status: "ALREADY_ARCHIVED" as const,
        candidate,
        archive: Object.freeze(structuredClone(archive)),
      })
    : Object.freeze({ status: "READY_TO_ARCHIVE" as const, candidate });
}

export function appendFiscalNotificationDriveArchiveV1(input: {
  readonly workspace: unknown;
  readonly ownerScope: string;
  readonly receipt: FiscalNotificationOriginalArchiveReceiptV1;
  readonly archivedAt: string;
}): AppendFiscalNotificationDriveArchiveResultV1 {
  if (!isIsoTimestamp(input.archivedAt) || !validReceipt(input.receipt)) {
    return Object.freeze({ status: "BLOCKED" as const });
  }
  const inspection = inspectFiscalNotificationDriveArchiveCandidateV1(
    input.workspace,
    input.ownerScope,
    input.receipt.sourceSha256,
  );
  if (inspection.status === "ALREADY_ARCHIVED") {
    return inspection.archive.driveFileId === input.receipt.driveFileId
      ? Object.freeze({
          status: "EXISTING" as const,
          workspace: parseFiscalNotificationsWorkspaceForPersistenceV1(
            input.workspace,
            input.ownerScope,
          )!,
          archive: inspection.archive,
        })
      : Object.freeze({ status: "BLOCKED" as const });
  }
  if (
    inspection.status !== "READY_TO_ARCHIVE" ||
    inspection.candidate.documentDate !== input.receipt.documentDate
  ) {
    return Object.freeze({ status: "BLOCKED" as const });
  }
  const workspace = parseFiscalNotificationsWorkspaceForPersistenceV1(
    input.workspace,
    input.ownerScope,
  );
  if (!workspace || workspace.revision >= Number.MAX_SAFE_INTEGER) {
    return Object.freeze({ status: "BLOCKED" as const });
  }
  const nextRevision = workspace.revision + 1;
  const archiveId = `drive-archive:${input.receipt.sourceSha256}`;
  const auditId = `audit-drive-archive:${input.receipt.sourceSha256}`;
  try {
    assertBoundedId(archiveId, "archiveId");
    assertBoundedId(auditId, "auditId");
  } catch {
    return Object.freeze({ status: "BLOCKED" as const });
  }
  if (workspace.auditEvents.some((event) => event.id === auditId)) {
    return Object.freeze({ status: "BLOCKED" as const });
  }
  const archive: FiscalNotificationDriveArchiveRecordV1 = Object.freeze({
    id: archiveId,
    ownerScope: input.ownerScope,
    fileId: inspection.candidate.fileId,
    documentIds: [...inspection.candidate.documentIds],
    sourceSha256: input.receipt.sourceSha256,
    driveFileId: input.receipt.driveFileId,
    driveFolderId: input.receipt.driveFolderId,
    documentDate: input.receipt.documentDate,
    archiveStatus: "ARCHIVED_VERIFIED",
    reviewStatus: "USER_CONFIRMED",
    verificationMethod: "SHA256_READBACK_MATCH",
    recordVersion: 1,
    workspaceRevision: nextRevision,
    archivedAt: input.archivedAt,
  });
  const next: FiscalNotificationsWorkspace = {
    ...workspace,
    revision: nextRevision,
    updatedAt: input.archivedAt,
    driveArchives: [...(workspace.driveArchives ?? []), archive],
    auditEvents: [
      ...workspace.auditEvents,
      {
        id: auditId,
        ownerScope: input.ownerScope,
        eventType: "ORIGINAL_ARCHIVED_IN_USER_GOOGLE_DRIVE",
        entityType: "DOCUMENT",
        entityId: inspection.candidate.documentIds[0]!,
        actorScope: "AUTHENTICATED_USER",
        occurredAt: input.archivedAt,
        safeMetadata: {
          archiveRecordVersion: 1,
          archivedDocumentCount: inspection.candidate.documentIds.length,
        },
      },
    ],
  };
  const validation = validateFiscalNotificationsWorkspaceIntegrity(
    next,
    input.ownerScope,
  );
  if (!validation.valid) {
    return Object.freeze({ status: "BLOCKED" as const });
  }
  const defensive = structuredClone(next);
  return Object.freeze({
    status: "APPLIED" as const,
    workspace: defensive,
    archive: Object.freeze(structuredClone(archive)),
  });
}

export function fiscalNotificationDriveFileHrefV1(
  driveFileId: string,
): string | null {
  return DRIVE_ID.test(driveFileId)
    ? `https://drive.google.com/file/d/${encodeURIComponent(driveFileId)}/view`
    : null;
}

function validReceipt(
  value: FiscalNotificationOriginalArchiveReceiptV1,
): boolean {
  return (
    SHA256.test(value.sourceSha256) &&
    DRIVE_ID.test(value.driveFileId) &&
    DRIVE_ID.test(value.driveFolderId) &&
    value.verification === "SHA256_READBACK_MATCH" &&
    (value.documentDate === null || isIsoDate(value.documentDate))
  );
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(parsed) &&
    new Date(parsed).toISOString() === `${value}T00:00:00.000Z`
  );
}

function isIsoTimestamp(value: string): boolean {
  if (!value || value !== value.trim()) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}
