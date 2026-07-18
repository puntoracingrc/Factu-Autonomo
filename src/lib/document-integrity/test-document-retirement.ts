import type {
  AppData,
  Document,
  ReservedTestDocumentIdentityV1,
  RetiredTestDocumentV1,
  TestDocumentRetirementBacklinkChangeV1,
  TestDocumentRetirementBackupEvidenceV1,
  TestDocumentRetirementBatchV1,
  TestDocumentRetirementEventV1,
} from "@/lib/types";
export type {
  ReservedTestDocumentIdentityV1,
  RetiredTestDocumentV1,
  TestDocumentRetirementBacklinkChangeV1,
  TestDocumentRetirementBackupEvidenceV1,
  TestDocumentRetirementBatchV1,
  TestDocumentRetirementEventV1,
} from "@/lib/types";
import { sha256Hex } from "./snapshot-hash";
import { stableStringifySnapshot } from "./snapshots";

export const TEST_DOCUMENT_RETIREMENT_SCHEMA_VERSION = 1 as const;
export const TEST_DOCUMENT_RETIREMENT_KIND =
  "explicit_test_document_retirement_v1" as const;

const TENANT_FINGERPRINT_PATTERN = /^sha256:[a-f0-9]{64}$/;

export type TestDocumentRetirementBlockReason =
  | "no_selection"
  | "duplicate_selection"
  | "invalid_tenant_fingerprint"
  | "duplicate_document_id"
  | "unknown_document"
  | "unsupported_document_type"
  | "verifactu_protected"
  | "rectification_relationship"
  | "relationship_ambiguous"
  | "external_reference"
  | "identity_reserved"
  | "retirement_record_invalid";

export interface TestDocumentRetirementBlocker {
  reason: TestDocumentRetirementBlockReason;
  documentId?: string;
  relatedDocumentId?: string;
}

export interface TestDocumentRetirementRequest {
  selectedDocumentIds: readonly string[];
  /** Huella opaca del owner/tenant. Nunca debe contener email, NIF ni PII. */
  tenantFingerprint: string;
}

export type TestDocumentRetirementWorkspace = AppData;

export interface TestDocumentRetirementCandidate {
  batchId: string;
  tenantFingerprint: string;
  selectionFingerprint: string;
  planFingerprint: string;
  selectedDocumentIds: string[];
  retiredDocuments: RetiredTestDocumentV1[];
  backlinkChanges: TestDocumentRetirementBacklinkChangeV1[];
  reservedIdentities: ReservedTestDocumentIdentityV1[];
  beforeDocumentOrder: string[];
  afterDocumentOrder: string[];
  beforeFingerprint: string;
  afterFingerprint: string;
}

export interface TestDocumentRetirementPreview {
  schemaVersion: typeof TEST_DOCUMENT_RETIREMENT_SCHEMA_VERSION;
  precondition: string;
  selectionFingerprint: string;
  selectedDocumentIds: string[];
  affectedCount: number;
  candidate: TestDocumentRetirementCandidate | null;
  blockers: TestDocumentRetirementBlocker[];
}

export type TestDocumentRetirementApplyResult =
  | {
      status: "applied" | "already_applied";
      data: TestDocumentRetirementWorkspace;
      batchId: string;
    }
  | {
      status: "blocked";
      reason: "stale_preview" | "no_candidate" | "candidate_invalid";
    };

export interface TestDocumentRetirementRollbackCandidate {
  batchId: string;
  beforeFingerprint: string;
  afterFingerprint: string;
  restoredDocuments: Document[];
}

export interface TestDocumentRetirementRollbackPreview {
  schemaVersion: typeof TEST_DOCUMENT_RETIREMENT_SCHEMA_VERSION;
  precondition: string;
  batchId: string;
  affectedCount: number;
  candidate: TestDocumentRetirementRollbackCandidate | null;
  blockers: TestDocumentRetirementBlocker[];
  alreadyRolledBack: boolean;
}

export type TestDocumentRetirementRollbackResult =
  | {
      status: "applied" | "already_rolled_back";
      data: TestDocumentRetirementWorkspace;
      batchId: string;
    }
  | {
      status: "blocked";
      reason: "stale_preview" | "no_candidate" | "candidate_invalid";
    };

function hashStable(value: unknown): string {
  return `sha256:${sha256Hex(stableStringifySnapshot(value))}`;
}

function clone<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function isCanonicalTimestamp(value: string): boolean {
  if (!value || !Number.isFinite(Date.parse(value))) return false;
  return new Date(value).toISOString() === value;
}

function isValidBackupEvidence(
  backup: TestDocumentRetirementBackupEvidenceV1,
  expectedExportableDataFingerprint?: string,
): boolean {
  return Boolean(
    backup &&
    /^factu-autonomo-backup-antes-retirar-pruebas-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.json$/.test(
      backup.filename,
    ) &&
    !backup.filename.includes("/") &&
    !backup.filename.includes("\\") &&
    isCanonicalTimestamp(backup.createdAt) &&
    /^sha256:[a-f0-9]{64}$/.test(backup.exportableDataFingerprint) &&
    /^sha256:[a-f0-9]{64}$/.test(backup.contentSha256) &&
    Number.isSafeInteger(backup.byteLength) &&
    backup.byteLength > 0 &&
    backup.disposition === "browser_download_requested" &&
    (expectedExportableDataFingerprint === undefined ||
      backup.exportableDataFingerprint === expectedExportableDataFingerprint),
  );
}

/**
 * La huella excluye únicamente metadata volátil de sync y el log de la propia
 * operación. Perfil, documentos, contadores y el resto del negocio sí forman
 * parte de la precondición fail-closed.
 */
export function testDocumentRetirementWorkspaceFingerprint(
  data: TestDocumentRetirementWorkspace,
): string {
  const {
    meta: _volatileSyncMetadata,
    testDocumentRetirementBatches: _auditLog,
    ...businessState
  } = data;
  void _volatileSyncMetadata;
  void _auditLog;
  return hashStable(businessState);
}

/** Huella del JSON exportable: excluye solo metadata volátil e incluye auditoría. */
export function testDocumentRetirementExportableDataFingerprint(
  data: TestDocumentRetirementWorkspace,
): string {
  const { meta: _volatileSyncMetadata, ...exportableData } = data;
  void _volatileSyncMetadata;
  return hashStable(exportableData);
}

function normalizedSelection(selectedDocumentIds: readonly string[]): {
  ids: string[];
  blockers: TestDocumentRetirementBlocker[];
} {
  const ids: string[] = [];
  const seen = new Set<string>();
  const blockers: TestDocumentRetirementBlocker[] = [];
  for (const rawId of selectedDocumentIds) {
    const id = typeof rawId === "string" ? rawId.trim() : "";
    if (!id) {
      blockers.push({ reason: "unknown_document" });
      continue;
    }
    if (seen.has(id)) {
      blockers.push({ reason: "duplicate_selection", documentId: id });
      continue;
    }
    seen.add(id);
    ids.push(id);
  }
  if (ids.length === 0) blockers.push({ reason: "no_selection" });
  return { ids, blockers };
}

function selectionFingerprint(
  ids: readonly string[],
  tenantFingerprint: string,
): string {
  return hashStable({
    schemaVersion: TEST_DOCUMENT_RETIREMENT_SCHEMA_VERSION,
    tenantFingerprint,
    selectedDocumentIds: [...ids].sort(),
  });
}

export function testDocumentRetirementPlanFingerprint(input: {
  tenantFingerprint: string;
  selectionFingerprint: string;
  selectedDocumentIds: readonly string[];
  retiredDocuments: readonly RetiredTestDocumentV1[];
  backlinkChanges: readonly TestDocumentRetirementBacklinkChangeV1[];
  reservedIdentities: readonly ReservedTestDocumentIdentityV1[];
  beforeDocumentOrder: readonly string[];
  afterDocumentOrder: readonly string[];
  beforeFingerprint: string;
  afterFingerprint: string;
}): string {
  return hashStable({
    tenantFingerprint: input.tenantFingerprint,
    selectionFingerprint: input.selectionFingerprint,
    selectedDocumentIds: input.selectedDocumentIds,
    retiredDocuments: input.retiredDocuments,
    backlinkChanges: input.backlinkChanges,
    reservedIdentities: input.reservedIdentities,
    beforeDocumentOrder: input.beforeDocumentOrder,
    afterDocumentOrder: input.afterDocumentOrder,
    beforeFingerprint: input.beforeFingerprint,
    afterFingerprint: input.afterFingerprint,
  });
}

function applyPrecondition(
  workspaceFingerprint: string,
  tenantFingerprint: string,
  selectedFingerprint: string,
): string {
  return hashStable({
    action: "apply_test_document_retirement",
    workspaceFingerprint,
    tenantFingerprint,
    selectionFingerprint: selectedFingerprint,
  });
}

function rollbackPrecondition(
  workspaceFingerprint: string,
  tenantFingerprint: string,
  batchId: string,
): string {
  return hashStable({
    action: "rollback_test_document_retirement",
    workspaceFingerprint,
    tenantFingerprint,
    batchId,
  });
}

function hasProtectedVerifactuEvidence(document: Document): boolean {
  const records = [document.verifactu, document.documentSnapshot?.verifactu];
  return Boolean(
    document.verifactuPersistence === "server_confirmed" ||
    records.some(
      (record) =>
        record?.environment === "production" || record?.status === "registered",
    ) ||
    document.documentSnapshot?.fiscalContext.verifactu?.environment ===
      "production",
  );
}

function addBlocker(
  blockers: TestDocumentRetirementBlocker[],
  blocker: TestDocumentRetirementBlocker,
): void {
  const key = `${blocker.reason}:${blocker.documentId ?? ""}:${blocker.relatedDocumentId ?? ""}`;
  if (
    blockers.some(
      (existing) =>
        `${existing.reason}:${existing.documentId ?? ""}:${existing.relatedDocumentId ?? ""}` ===
        key,
    )
  ) {
    return;
  }
  blockers.push(blocker);
}

function documentCounts(documents: readonly Document[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const document of documents) {
    counts.set(document.id, (counts.get(document.id) ?? 0) + 1);
  }
  return counts;
}

function receiptClaimsForInvoice(
  documents: readonly Document[],
  invoiceId: string,
): Document[] {
  return documents.filter(
    (document) =>
      document.type === "recibo" &&
      (document.sourceDocumentId === invoiceId ||
        document.documentSnapshot?.sourceDocumentId === invoiceId),
  );
}

function protectedRectificationReference(document: Document): string | undefined {
  return (
    document.rectifiedById ??
    document.rectification?.originalDocumentId ??
    document.documentSnapshot?.rectification?.originalDocumentId
  );
}

function isSurvivingRectificationReference(
  document: Document,
  referencedId: string,
): boolean {
  return Boolean(
    document.type === "factura" &&
      (document.rectification?.originalDocumentId === referencedId ||
        document.documentSnapshot?.rectification?.originalDocumentId ===
          referencedId),
  );
}

function validateReceiptRelationships(
  documents: readonly Document[],
  selectedIds: ReadonlySet<string>,
  selectedDocuments: readonly Document[],
  blockers: TestDocumentRetirementBlocker[],
): void {
  const byId = new Map(documents.map((document) => [document.id, document]));

  for (const document of selectedDocuments) {
    if (
      document.rectification ||
      document.documentSnapshot?.rectification
    ) {
      addBlocker(blockers, {
        reason: "rectification_relationship",
        documentId: document.id,
        relatedDocumentId:
          document.rectifiedById ??
          document.rectification?.originalDocumentId ??
          document.documentSnapshot?.rectification?.originalDocumentId,
      });
    }
    if (document.sourceQuoteDocumentId || document.sourceQuoteNumber) {
      addBlocker(blockers, {
        reason: "external_reference",
        documentId: document.id,
        relatedDocumentId: document.sourceQuoteDocumentId,
      });
    }

    if (document.type === "recibo") {
      const sourceId = document.sourceDocumentId;
      const snapshotSourceId = document.documentSnapshot?.sourceDocumentId;
      if (
        !sourceId ||
        (snapshotSourceId !== undefined && snapshotSourceId !== sourceId)
      ) {
        addBlocker(blockers, {
          reason: "relationship_ambiguous",
          documentId: document.id,
          relatedDocumentId: sourceId ?? snapshotSourceId,
        });
        continue;
      }
      const invoice = byId.get(sourceId);
      const claims = receiptClaimsForInvoice(documents, sourceId);
      if (
        !invoice ||
        invoice.type !== "factura" ||
        invoice.receiptDocumentId !== document.id ||
        claims.length !== 1 ||
        claims[0]?.id !== document.id
      ) {
        addBlocker(blockers, {
          reason: "relationship_ambiguous",
          documentId: document.id,
          relatedDocumentId: sourceId,
        });
      }
      if (
        invoice?.type === "factura" &&
        (invoice.rectifiedById ||
          invoice.rectification ||
          invoice.documentSnapshot?.rectification)
      ) {
        addBlocker(blockers, {
          reason: "rectification_relationship",
          documentId: document.id,
          relatedDocumentId:
            protectedRectificationReference(invoice) ?? invoice.id,
        });
      }
      continue;
    }

    if (document.receiptDocumentId) {
      const receipt = byId.get(document.receiptDocumentId);
      if (
        !receipt ||
        receipt.type !== "recibo" ||
        receipt.sourceDocumentId !== document.id ||
        !selectedIds.has(receipt.id) ||
        receiptClaimsForInvoice(documents, document.id).length !== 1
      ) {
        addBlocker(blockers, {
          reason: "relationship_ambiguous",
          documentId: document.id,
          relatedDocumentId: document.receiptDocumentId,
        });
      }
    } else if (receiptClaimsForInvoice(documents, document.id).length > 0) {
      addBlocker(blockers, {
        reason: "relationship_ambiguous",
        documentId: document.id,
      });
    }
  }

  for (const document of documents) {
    if (selectedIds.has(document.id)) continue;
    const references = [
      document.sourceQuoteDocumentId,
      document.rectifiedById,
      document.rectification?.originalDocumentId,
      document.documentSnapshot?.rectification?.originalDocumentId,
    ].filter((value): value is string => Boolean(value));
    for (const referencedId of references) {
      if (selectedIds.has(referencedId)) {
        if (isSurvivingRectificationReference(document, referencedId)) {
          continue;
        }
        addBlocker(blockers, {
          reason: "external_reference",
          documentId: referencedId,
          relatedDocumentId: document.id,
        });
      }
    }

    if (
      document.sourceDocumentId &&
      selectedIds.has(document.sourceDocumentId)
    ) {
      addBlocker(blockers, {
        reason: "external_reference",
        documentId: document.sourceDocumentId,
        relatedDocumentId: document.id,
      });
    }
    if (
      document.documentSnapshot?.sourceDocumentId &&
      selectedIds.has(document.documentSnapshot.sourceDocumentId)
    ) {
      addBlocker(blockers, {
        reason: "external_reference",
        documentId: document.documentSnapshot.sourceDocumentId,
        relatedDocumentId: document.id,
      });
    }

    if (
      document.receiptDocumentId &&
      selectedIds.has(document.receiptDocumentId)
    ) {
      const receipt = byId.get(document.receiptDocumentId);
      const isExactSurvivingInvoiceBacklink =
        document.type === "factura" &&
        receipt?.type === "recibo" &&
        receipt.sourceDocumentId === document.id &&
        receiptClaimsForInvoice(documents, document.id).length === 1;
      if (!isExactSurvivingInvoiceBacklink) {
        addBlocker(blockers, {
          reason: "relationship_ambiguous",
          documentId: document.receiptDocumentId,
          relatedDocumentId: document.id,
        });
      }
    }
  }
}

function validateExternalCollections(
  data: TestDocumentRetirementWorkspace,
  selectedIds: ReadonlySet<string>,
  blockers: TestDocumentRetirementBlocker[],
): void {
  for (const expense of data.expenses) {
    const referencedIds = [
      expense.workDocumentId,
      ...(expense.workAllocations?.map(
        (allocation) => allocation.workDocumentId,
      ) ?? []),
    ];
    for (const referencedId of referencedIds) {
      if (referencedId && selectedIds.has(referencedId)) {
        addBlocker(blockers, {
          reason: "external_reference",
          documentId: referencedId,
        });
      }
    }
  }
  for (const reminder of data.userReminders) {
    if (
      (reminder.link.kind === "document" || reminder.link.kind === "rectify") &&
      reminder.link.entityId &&
      selectedIds.has(reminder.link.entityId)
    ) {
      addBlocker(blockers, {
        reason: "external_reference",
        documentId: reminder.link.entityId,
      });
    }
  }
}

function recognizableReservedIdentities(
  batches: readonly TestDocumentRetirementBatchV1[] | undefined,
): Array<ReservedTestDocumentIdentityV1 & { batchId: string }> {
  const result: Array<ReservedTestDocumentIdentityV1 & { batchId: string }> =
    [];
  for (const batch of batches ?? []) {
    if (
      batch?.schemaVersion !== TEST_DOCUMENT_RETIREMENT_SCHEMA_VERSION ||
      batch.kind !== TEST_DOCUMENT_RETIREMENT_KIND ||
      typeof batch.batchId !== "string" ||
      !Array.isArray(batch.reservedIdentities)
    ) {
      continue;
    }
    for (const identity of batch.reservedIdentities) {
      if (
        identity &&
        typeof identity.documentId === "string" &&
        typeof identity.number === "string" &&
        (identity.documentType === "factura" ||
          identity.documentType === "presupuesto" ||
          identity.documentType === "recibo")
      ) {
        result.push({ ...identity, batchId: batch.batchId });
      }
    }
  }
  return result;
}

/** Reservas permanentes: ni rollback ni un log dañado liberan numeración. */
export function getReservedTestDocumentIdentities(
  data: TestDocumentRetirementWorkspace,
): ReservedTestDocumentIdentityV1[] {
  const seen = new Set<string>();
  const identities: ReservedTestDocumentIdentityV1[] = [];
  for (const identity of recognizableReservedIdentities(
    data.testDocumentRetirementBatches,
  )) {
    const key = `${identity.documentId}:${identity.documentType}:${identity.number}`;
    if (seen.has(key)) continue;
    seen.add(key);
    identities.push({
      documentId: identity.documentId,
      documentType: identity.documentType,
      number: identity.number,
    });
  }
  return identities;
}

function clearReceiptBacklink(document: Document): Document {
  const next = clone(document);
  delete next.receiptDocumentId;
  return next;
}

function buildCandidate(
  data: TestDocumentRetirementWorkspace,
  request: TestDocumentRetirementRequest,
  ids: readonly string[],
  blockers: TestDocumentRetirementBlocker[],
): TestDocumentRetirementCandidate | null {
  const selectedIds = new Set(ids);
  const counts = documentCounts(data.documents);
  const selectedDocuments: Document[] = [];

  for (const id of ids) {
    const count = counts.get(id) ?? 0;
    if (count === 0) {
      addBlocker(blockers, { reason: "unknown_document", documentId: id });
      continue;
    }
    if (count !== 1) {
      addBlocker(blockers, {
        reason: "duplicate_document_id",
        documentId: id,
      });
      continue;
    }
    const document = data.documents.find((entry) => entry.id === id)!;
    selectedDocuments.push(document);
    if (document.type !== "factura" && document.type !== "recibo") {
      addBlocker(blockers, {
        reason: "unsupported_document_type",
        documentId: id,
      });
    }
    if (hasProtectedVerifactuEvidence(document)) {
      addBlocker(blockers, {
        reason: "verifactu_protected",
        documentId: id,
      });
    }
  }

  validateReceiptRelationships(
    data.documents,
    selectedIds,
    selectedDocuments,
    blockers,
  );
  validateExternalCollections(data, selectedIds, blockers);
  if (blockers.length > 0) return null;

  const retiredDocuments = data.documents
    .map((document, originalIndex) => ({ document, originalIndex }))
    .filter(({ document }) => selectedIds.has(document.id))
    .map((entry) => clone(entry));
  const backlinkChanges: TestDocumentRetirementBacklinkChangeV1[] = [];
  for (const retired of retiredDocuments) {
    const receipt = retired.document;
    if (receipt.type !== "recibo" || !receipt.sourceDocumentId) continue;
    if (selectedIds.has(receipt.sourceDocumentId)) continue;
    const invoice = data.documents.find(
      (document) => document.id === receipt.sourceDocumentId,
    )!;
    backlinkChanges.push({
      documentId: invoice.id,
      before: clone(invoice),
      after: clearReceiptBacklink(invoice),
    });
  }
  backlinkChanges.sort(
    (left, right) =>
      data.documents.findIndex((document) => document.id === left.documentId) -
      data.documents.findIndex((document) => document.id === right.documentId),
  );

  const afterById = new Map(
    backlinkChanges.map((change) => [change.documentId, change.after]),
  );
  const afterDocuments = data.documents
    .filter((document) => !selectedIds.has(document.id))
    .map((document) => clone(afterById.get(document.id) ?? document));
  const beforeFingerprint = testDocumentRetirementWorkspaceFingerprint(data);
  const afterFingerprint = testDocumentRetirementWorkspaceFingerprint({
    ...data,
    documents: afterDocuments,
  });
  const selectedDocumentIds = retiredDocuments.map(
    ({ document }) => document.id,
  );
  const selectedFingerprint = selectionFingerprint(
    selectedDocumentIds,
    request.tenantFingerprint,
  );
  const reservedIdentities = retiredDocuments.map(({ document }) => ({
    documentId: document.id,
    documentType: document.type,
    number: document.number,
  }));
  const beforeDocumentOrder = data.documents.map((document) => document.id);
  const afterDocumentOrder = afterDocuments.map((document) => document.id);
  const planFingerprint = testDocumentRetirementPlanFingerprint({
    tenantFingerprint: request.tenantFingerprint,
    selectionFingerprint: selectedFingerprint,
    selectedDocumentIds,
    retiredDocuments,
    backlinkChanges,
    reservedIdentities,
    beforeDocumentOrder,
    afterDocumentOrder,
    beforeFingerprint,
    afterFingerprint,
  });
  const batchId = `test-document-retirement:v1:${sha256Hex(
    stableStringifySnapshot({
      tenantFingerprint: request.tenantFingerprint,
      planFingerprint,
    }),
  )}`;

  for (const reserved of recognizableReservedIdentities(
    data.testDocumentRetirementBatches,
  )) {
    if (reserved.batchId === batchId) continue;
    if (
      reservedIdentities.some(
        (identity) =>
          identity.documentId === reserved.documentId ||
          (identity.documentType === reserved.documentType &&
            identity.number === reserved.number),
      )
    ) {
      addBlocker(blockers, {
        reason: "identity_reserved",
        documentId: reserved.documentId,
      });
    }
  }
  if (blockers.length > 0) return null;

  return {
    batchId,
    tenantFingerprint: request.tenantFingerprint,
    selectionFingerprint: selectedFingerprint,
    planFingerprint,
    selectedDocumentIds,
    retiredDocuments,
    backlinkChanges,
    reservedIdentities,
    beforeDocumentOrder,
    afterDocumentOrder,
    beforeFingerprint,
    afterFingerprint,
  };
}

export function buildTestDocumentRetirementPreview(
  data: TestDocumentRetirementWorkspace,
  request: TestDocumentRetirementRequest,
): TestDocumentRetirementPreview {
  const workspaceFingerprint = testDocumentRetirementWorkspaceFingerprint(data);
  const normalized = normalizedSelection(request.selectedDocumentIds);
  const blockers = [...normalized.blockers];
  if (!TENANT_FINGERPRINT_PATTERN.test(request.tenantFingerprint)) {
    addBlocker(blockers, { reason: "invalid_tenant_fingerprint" });
  }
  const selectedFingerprint = selectionFingerprint(
    normalized.ids,
    request.tenantFingerprint,
  );
  const precondition = applyPrecondition(
    workspaceFingerprint,
    request.tenantFingerprint,
    selectedFingerprint,
  );
  const candidate =
    blockers.length === 0
      ? buildCandidate(data, request, normalized.ids, blockers)
      : null;
  return {
    schemaVersion: TEST_DOCUMENT_RETIREMENT_SCHEMA_VERSION,
    precondition,
    selectionFingerprint: selectedFingerprint,
    selectedDocumentIds: normalized.ids,
    affectedCount: candidate?.retiredDocuments.length ?? 0,
    candidate,
    blockers,
  };
}

function candidatePlan(candidate: TestDocumentRetirementCandidate): unknown {
  return {
    batchId: candidate.batchId,
    tenantFingerprint: candidate.tenantFingerprint,
    selectionFingerprint: candidate.selectionFingerprint,
    planFingerprint: candidate.planFingerprint,
    selectedDocumentIds: candidate.selectedDocumentIds,
    retiredDocuments: candidate.retiredDocuments,
    backlinkChanges: candidate.backlinkChanges,
    reservedIdentities: candidate.reservedIdentities,
    beforeDocumentOrder: candidate.beforeDocumentOrder,
    afterDocumentOrder: candidate.afterDocumentOrder,
    beforeFingerprint: candidate.beforeFingerprint,
    afterFingerprint: candidate.afterFingerprint,
  };
}

function batchPlan(batch: TestDocumentRetirementBatchV1): unknown {
  return {
    batchId: batch.batchId,
    tenantFingerprint: batch.tenantFingerprint,
    selectionFingerprint: batch.selectionFingerprint,
    planFingerprint: batch.planFingerprint,
    selectedDocumentIds: batch.selectedDocumentIds,
    retiredDocuments: batch.retiredDocuments,
    backlinkChanges: batch.backlinkChanges,
    reservedIdentities: batch.reservedIdentities,
    beforeDocumentOrder: batch.beforeDocumentOrder,
    afterDocumentOrder: batch.afterDocumentOrder,
    beforeFingerprint: batch.beforeFingerprint,
    afterFingerprint: batch.afterFingerprint,
  };
}

function onlyReceiptBacklinkChanged(
  before: Document,
  after: Document,
): boolean {
  if (!before.receiptDocumentId || after.receiptDocumentId !== undefined) {
    return false;
  }
  const { receiptDocumentId: _beforeReceipt, ...beforeRest } = before;
  const { receiptDocumentId: _afterReceipt, ...afterRest } = after;
  void _beforeReceipt;
  void _afterReceipt;
  return (
    stableStringifySnapshot(beforeRest) === stableStringifySnapshot(afterRest)
  );
}

function isValidBatch(batch: TestDocumentRetirementBatchV1): boolean {
  if (
    batch?.schemaVersion !== TEST_DOCUMENT_RETIREMENT_SCHEMA_VERSION ||
    batch.kind !== TEST_DOCUMENT_RETIREMENT_KIND ||
    !batch.batchId?.startsWith("test-document-retirement:v1:") ||
    batch.reason !== "explicit_test_cleanup" ||
    (batch.status !== "applied" && batch.status !== "rolled_back") ||
    !TENANT_FINGERPRINT_PATTERN.test(batch.tenantFingerprint) ||
    !Array.isArray(batch.selectedDocumentIds) ||
    !Array.isArray(batch.retiredDocuments) ||
    !Array.isArray(batch.backlinkChanges) ||
    !Array.isArray(batch.reservedIdentities) ||
    !Array.isArray(batch.beforeDocumentOrder) ||
    !Array.isArray(batch.afterDocumentOrder) ||
    !Array.isArray(batch.events) ||
    batch.events.length === 0
  ) {
    return false;
  }
  const selected = new Set(batch.selectedDocumentIds);
  const expectedAfterOrder = batch.beforeDocumentOrder.filter(
    (documentId) => !selected.has(documentId),
  );
  const expectedReserved = batch.retiredDocuments.map(({ document }) => ({
    documentId: document.id,
    documentType: document.type,
    number: document.number,
  }));
  const expectedPlanFingerprint = testDocumentRetirementPlanFingerprint({
    tenantFingerprint: batch.tenantFingerprint,
    selectionFingerprint: batch.selectionFingerprint,
    selectedDocumentIds: batch.selectedDocumentIds,
    retiredDocuments: batch.retiredDocuments,
    backlinkChanges: batch.backlinkChanges,
    reservedIdentities: batch.reservedIdentities,
    beforeDocumentOrder: batch.beforeDocumentOrder,
    afterDocumentOrder: batch.afterDocumentOrder,
    beforeFingerprint: batch.beforeFingerprint,
    afterFingerprint: batch.afterFingerprint,
  });
  const expectedBatchId = `test-document-retirement:v1:${sha256Hex(
    stableStringifySnapshot({
      tenantFingerprint: batch.tenantFingerprint,
      planFingerprint: batch.planFingerprint,
    }),
  )}`;
  if (
    selected.size !== batch.selectedDocumentIds.length ||
    batch.selectionFingerprint !==
      selectionFingerprint(
        batch.selectedDocumentIds,
        batch.tenantFingerprint,
      ) ||
    batch.planFingerprint !== expectedPlanFingerprint ||
    batch.batchId !== expectedBatchId ||
    batch.retiredDocuments.length !== selected.size ||
    batch.reservedIdentities.length !== selected.size ||
    new Set(batch.beforeDocumentOrder).size !==
      batch.beforeDocumentOrder.length ||
    new Set(batch.afterDocumentOrder).size !==
      batch.afterDocumentOrder.length ||
    stableStringifySnapshot(batch.afterDocumentOrder) !==
      stableStringifySnapshot(expectedAfterOrder) ||
    batch.retiredDocuments.some(
      (entry) =>
        !Number.isInteger(entry.originalIndex) ||
        entry.originalIndex < 0 ||
        !selected.has(entry.document.id) ||
        batch.beforeDocumentOrder[entry.originalIndex] !== entry.document.id,
    ) ||
    stableStringifySnapshot(batch.reservedIdentities) !==
      stableStringifySnapshot(expectedReserved) ||
    stableStringifySnapshot(batch.selectedDocumentIds) !==
      stableStringifySnapshot(
        batch.retiredDocuments.map(({ document }) => document.id),
      ) ||
    batch.backlinkChanges.some(
      (change) =>
        change.documentId !== change.before.id ||
        change.documentId !== change.after.id ||
        selected.has(change.documentId) ||
        !batch.beforeDocumentOrder.includes(change.documentId) ||
        !batch.afterDocumentOrder.includes(change.documentId) ||
        !onlyReceiptBacklinkChanged(change.before, change.after),
    ) ||
    new Set(batch.backlinkChanges.map((change) => change.documentId)).size !==
      batch.backlinkChanges.length ||
    batch.events.some(
      (event, index) =>
        !isCanonicalTimestamp(event.at) ||
        event.action !== (index % 2 === 0 ? "applied" : "rolled_back") ||
        event.beforeFingerprint !== batch.beforeFingerprint ||
        event.afterFingerprint !== batch.afterFingerprint ||
        event.workspaceFingerprint !==
          (event.action === "applied"
            ? batch.beforeFingerprint
            : batch.afterFingerprint) ||
        !isValidBackupEvidence(event.backup),
    ) ||
    batch.events.at(-1)?.action !==
      (batch.status === "applied" ? "applied" : "rolled_back")
  ) {
    return false;
  }
  return true;
}

function applyCandidateDocuments(
  data: TestDocumentRetirementWorkspace,
  candidate: TestDocumentRetirementCandidate,
): Document[] {
  const selected = new Set(candidate.selectedDocumentIds);
  const afterById = new Map(
    candidate.backlinkChanges.map((change) => [
      change.documentId,
      change.after,
    ]),
  );
  return data.documents
    .filter((document) => !selected.has(document.id))
    .map((document) => clone(afterById.get(document.id) ?? document));
}

function candidateMatchesBatch(
  candidate: TestDocumentRetirementCandidate,
  batch: TestDocumentRetirementBatchV1,
): boolean {
  return (
    isValidBatch(batch) &&
    stableStringifySnapshot(candidatePlan(candidate)) ===
      stableStringifySnapshot(batchPlan(batch))
  );
}

export function applyTestDocumentRetirement(
  data: TestDocumentRetirementWorkspace,
  preview: TestDocumentRetirementPreview,
  at: string,
  tenantFingerprint: string,
  backup: TestDocumentRetirementBackupEvidenceV1,
): TestDocumentRetirementApplyResult {
  const candidate = preview.candidate;
  if (!candidate || preview.blockers.length > 0) {
    return { status: "blocked", reason: "no_candidate" };
  }
  if (!isCanonicalTimestamp(at)) {
    return { status: "blocked", reason: "candidate_invalid" };
  }
  if (
    !TENANT_FINGERPRINT_PATTERN.test(tenantFingerprint) ||
    candidate.tenantFingerprint !== tenantFingerprint
  ) {
    return { status: "blocked", reason: "candidate_invalid" };
  }

  const currentFingerprint = testDocumentRetirementWorkspaceFingerprint(data);
  const existingBatches = data.testDocumentRetirementBatches ?? [];
  const matchingBatches = existingBatches.filter(
    (batch) => batch.batchId === candidate.batchId,
  );
  if (matchingBatches.length > 1) {
    return { status: "blocked", reason: "candidate_invalid" };
  }
  const existing = matchingBatches[0];
  if (existing?.status === "applied") {
    if (
      currentFingerprint === candidate.afterFingerprint &&
      candidateMatchesBatch(candidate, existing)
    ) {
      return {
        status: "already_applied",
        data,
        batchId: candidate.batchId,
      };
    }
    return { status: "blocked", reason: "stale_preview" };
  }

  if (
    preview.schemaVersion !== TEST_DOCUMENT_RETIREMENT_SCHEMA_VERSION ||
    preview.precondition !==
      applyPrecondition(
        currentFingerprint,
        candidate.tenantFingerprint,
        candidate.selectionFingerprint,
      ) ||
    candidate.beforeFingerprint !== currentFingerprint
  ) {
    return { status: "blocked", reason: "stale_preview" };
  }
  if (
    !isValidBackupEvidence(
      backup,
      testDocumentRetirementExportableDataFingerprint(data),
    )
  ) {
    return { status: "blocked", reason: "candidate_invalid" };
  }
  const freshPreview = buildTestDocumentRetirementPreview(data, {
    selectedDocumentIds: candidate.selectedDocumentIds,
    tenantFingerprint: candidate.tenantFingerprint,
  });
  if (
    !freshPreview.candidate ||
    freshPreview.blockers.length > 0 ||
    stableStringifySnapshot(candidatePlan(freshPreview.candidate)) !==
      stableStringifySnapshot(candidatePlan(candidate))
  ) {
    return { status: "blocked", reason: "candidate_invalid" };
  }
  if (existing && !candidateMatchesBatch(candidate, existing)) {
    return { status: "blocked", reason: "candidate_invalid" };
  }

  const nextDocuments = applyCandidateDocuments(data, candidate);
  const nextWithoutBatch: TestDocumentRetirementWorkspace = {
    ...data,
    documents: nextDocuments,
  };
  if (
    testDocumentRetirementWorkspaceFingerprint(nextWithoutBatch) !==
    candidate.afterFingerprint
  ) {
    return { status: "blocked", reason: "candidate_invalid" };
  }
  const event: TestDocumentRetirementEventV1 = {
    action: "applied",
    at,
    beforeFingerprint: candidate.beforeFingerprint,
    afterFingerprint: candidate.afterFingerprint,
    workspaceFingerprint: candidate.beforeFingerprint,
    backup: clone(backup),
  };
  const nextBatch: TestDocumentRetirementBatchV1 = existing
    ? {
        ...clone(existing),
        status: "applied",
        events: [...existing.events, event],
      }
    : {
        schemaVersion: TEST_DOCUMENT_RETIREMENT_SCHEMA_VERSION,
        kind: TEST_DOCUMENT_RETIREMENT_KIND,
        batchId: candidate.batchId,
        reason: "explicit_test_cleanup",
        status: "applied",
        tenantFingerprint: candidate.tenantFingerprint,
        selectionFingerprint: candidate.selectionFingerprint,
        planFingerprint: candidate.planFingerprint,
        selectedDocumentIds: clone(candidate.selectedDocumentIds),
        retiredDocuments: clone(candidate.retiredDocuments),
        backlinkChanges: clone(candidate.backlinkChanges),
        reservedIdentities: clone(candidate.reservedIdentities),
        beforeDocumentOrder: clone(candidate.beforeDocumentOrder),
        afterDocumentOrder: clone(candidate.afterDocumentOrder),
        beforeFingerprint: candidate.beforeFingerprint,
        afterFingerprint: candidate.afterFingerprint,
        events: [event],
      };
  if (!isValidBatch(nextBatch)) {
    return { status: "blocked", reason: "candidate_invalid" };
  }
  const nextBatches = existing
    ? existingBatches.map((batch) =>
        batch.batchId === existing.batchId ? nextBatch : batch,
      )
    : [...existingBatches, nextBatch];
  return {
    status: "applied",
    data: {
      ...nextWithoutBatch,
      testDocumentRetirementBatches: nextBatches,
    },
    batchId: candidate.batchId,
  };
}

function reconstructBeforeDocuments(
  data: TestDocumentRetirementWorkspace,
  batch: TestDocumentRetirementBatchV1,
): Document[] | null {
  if (
    stableStringifySnapshot(data.documents.map((document) => document.id)) !==
    stableStringifySnapshot(batch.afterDocumentOrder)
  ) {
    return null;
  }
  const byId = new Map(
    data.documents.map((document) => [document.id, document]),
  );
  for (const change of batch.backlinkChanges) {
    const current = byId.get(change.documentId);
    if (
      !current ||
      stableStringifySnapshot(current) !== stableStringifySnapshot(change.after)
    ) {
      return null;
    }
    byId.set(change.documentId, clone(change.before));
  }
  for (const retired of batch.retiredDocuments) {
    if (byId.has(retired.document.id)) return null;
    byId.set(retired.document.id, clone(retired.document));
  }
  const restored = batch.beforeDocumentOrder.map((id) => byId.get(id));
  if (restored.some((document) => !document) || restored.length !== byId.size) {
    return null;
  }
  return restored.map((document) => clone(document!));
}

export function buildTestDocumentRetirementRollbackPreview(
  data: TestDocumentRetirementWorkspace,
  batchId: string,
  tenantFingerprint: string,
): TestDocumentRetirementRollbackPreview {
  const workspaceFingerprint = testDocumentRetirementWorkspaceFingerprint(data);
  const precondition = rollbackPrecondition(
    workspaceFingerprint,
    tenantFingerprint,
    batchId,
  );
  const batches = (data.testDocumentRetirementBatches ?? []).filter(
    (batch) => batch.batchId === batchId,
  );
  const blockers: TestDocumentRetirementBlocker[] = [];
  if (batches.length !== 1 || !isValidBatch(batches[0]!)) {
    blockers.push({ reason: "retirement_record_invalid" });
    return {
      schemaVersion: TEST_DOCUMENT_RETIREMENT_SCHEMA_VERSION,
      precondition,
      batchId,
      affectedCount: 0,
      candidate: null,
      blockers,
      alreadyRolledBack: false,
    };
  }
  const batch = batches[0]!;
  if (
    !TENANT_FINGERPRINT_PATTERN.test(tenantFingerprint) ||
    batch.tenantFingerprint !== tenantFingerprint
  ) {
    blockers.push({ reason: "retirement_record_invalid" });
    return {
      schemaVersion: TEST_DOCUMENT_RETIREMENT_SCHEMA_VERSION,
      precondition,
      batchId,
      affectedCount: 0,
      candidate: null,
      blockers,
      alreadyRolledBack: false,
    };
  }
  if (batch.status === "rolled_back") {
    const alreadyRolledBack = workspaceFingerprint === batch.beforeFingerprint;
    if (!alreadyRolledBack)
      blockers.push({ reason: "retirement_record_invalid" });
    return {
      schemaVersion: TEST_DOCUMENT_RETIREMENT_SCHEMA_VERSION,
      precondition,
      batchId,
      affectedCount: 0,
      candidate: null,
      blockers,
      alreadyRolledBack,
    };
  }
  if (workspaceFingerprint !== batch.afterFingerprint) {
    blockers.push({ reason: "retirement_record_invalid" });
  }
  const restoredDocuments =
    blockers.length === 0 ? reconstructBeforeDocuments(data, batch) : null;
  if (!restoredDocuments) {
    blockers.push({ reason: "retirement_record_invalid" });
  }
  const candidate = restoredDocuments
    ? {
        batchId,
        beforeFingerprint: batch.beforeFingerprint,
        afterFingerprint: batch.afterFingerprint,
        restoredDocuments,
      }
    : null;
  return {
    schemaVersion: TEST_DOCUMENT_RETIREMENT_SCHEMA_VERSION,
    precondition,
    batchId,
    affectedCount: candidate ? batch.retiredDocuments.length : 0,
    candidate,
    blockers,
    alreadyRolledBack: false,
  };
}

export function rollbackTestDocumentRetirement(
  data: TestDocumentRetirementWorkspace,
  preview: TestDocumentRetirementRollbackPreview,
  at: string,
  tenantFingerprint: string,
  backup: TestDocumentRetirementBackupEvidenceV1,
): TestDocumentRetirementRollbackResult {
  const batches = data.testDocumentRetirementBatches ?? [];
  const matching = batches.filter((batch) => batch.batchId === preview.batchId);
  if (matching.length !== 1 || !isValidBatch(matching[0]!)) {
    return { status: "blocked", reason: "candidate_invalid" };
  }
  const batch = matching[0]!;
  if (
    !TENANT_FINGERPRINT_PATTERN.test(tenantFingerprint) ||
    batch.tenantFingerprint !== tenantFingerprint
  ) {
    return { status: "blocked", reason: "candidate_invalid" };
  }
  const currentFingerprint = testDocumentRetirementWorkspaceFingerprint(data);
  if (batch.status === "rolled_back") {
    if (currentFingerprint === batch.beforeFingerprint) {
      return {
        status: "already_rolled_back",
        data,
        batchId: batch.batchId,
      };
    }
    return { status: "blocked", reason: "stale_preview" };
  }
  if (
    !isCanonicalTimestamp(at) ||
    preview.schemaVersion !== TEST_DOCUMENT_RETIREMENT_SCHEMA_VERSION ||
    !preview.candidate ||
    preview.blockers.length > 0
  ) {
    return { status: "blocked", reason: "no_candidate" };
  }
  if (
    preview.precondition !==
      rollbackPrecondition(
        currentFingerprint,
        tenantFingerprint,
        batch.batchId,
      ) ||
    currentFingerprint !== batch.afterFingerprint
  ) {
    return { status: "blocked", reason: "stale_preview" };
  }
  if (
    !isValidBackupEvidence(
      backup,
      testDocumentRetirementExportableDataFingerprint(data),
    )
  ) {
    return { status: "blocked", reason: "candidate_invalid" };
  }
  const fresh = buildTestDocumentRetirementRollbackPreview(
    data,
    batch.batchId,
    tenantFingerprint,
  );
  if (
    !fresh.candidate ||
    fresh.blockers.length > 0 ||
    stableStringifySnapshot(fresh.candidate) !==
      stableStringifySnapshot(preview.candidate)
  ) {
    return { status: "blocked", reason: "candidate_invalid" };
  }

  const nextWithoutBatch: TestDocumentRetirementWorkspace = {
    ...data,
    documents: clone(preview.candidate.restoredDocuments),
  };
  if (
    testDocumentRetirementWorkspaceFingerprint(nextWithoutBatch) !==
    batch.beforeFingerprint
  ) {
    return { status: "blocked", reason: "candidate_invalid" };
  }
  const nextBatch: TestDocumentRetirementBatchV1 = {
    ...clone(batch),
    status: "rolled_back",
    events: [
      ...batch.events,
      {
        action: "rolled_back",
        at,
        beforeFingerprint: batch.beforeFingerprint,
        afterFingerprint: batch.afterFingerprint,
        workspaceFingerprint: batch.afterFingerprint,
        backup: clone(backup),
      },
    ],
  };
  if (!isValidBatch(nextBatch)) {
    return { status: "blocked", reason: "candidate_invalid" };
  }
  return {
    status: "applied",
    data: {
      ...nextWithoutBatch,
      testDocumentRetirementBatches: batches.map((entry) =>
        entry.batchId === batch.batchId ? nextBatch : entry,
      ),
    },
    batchId: batch.batchId,
  };
}
