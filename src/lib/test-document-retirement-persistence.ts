import { parseDocumentNumberForKind, normalizeNumbering } from "./numbering";
import { sha256Hex } from "./document-integrity/snapshot-hash";
import { stableStringifySnapshot } from "./document-integrity/snapshots";
import { testDocumentRetirementPlanFingerprint } from "./document-integrity/test-document-retirement";
import type {
  AppData,
  Document,
  DocumentKind,
  ReservedTestDocumentIdentityV1,
  TestDocumentRetirementBatchV1,
  WorkspaceIntegrityQuarantineEntry,
} from "./types";

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const TENANT_FINGERPRINT_PATTERN = HASH_PATTERN;
const BATCH_PREFIX = "test-document-retirement:v1:";
const BACKUP_FILENAME_PATTERN =
  /^factu-autonomo-backup-antes-retirar-pruebas-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.json$/;

export function testDocumentRetirementTenantFingerprintForUserId(
  userId: string,
): string {
  const normalized = userId.trim();
  return normalized
    ? `sha256:${sha256Hex(`test-document-retirement-owner:v1:${normalized}`)}`
    : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCanonicalTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    return false;
  }
  return new Date(value).toISOString() === value;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * El lote llega de storage/cloud y por tanto no se puede confiar en el cast a
 * `Document`. Validamos expresamente los nodos que la política consulta para
 * que un snapshot parcial (por ejemplo `{}`) sea inválido, nunca una excepción.
 */
function isRecognizableDocumentSnapshot(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (
    !Number.isSafeInteger(value.schemaVersion) ||
    typeof value.capturedAt !== "string" ||
    typeof value.source !== "string" ||
    (value.documentType !== "factura" &&
      value.documentType !== "presupuesto" &&
      value.documentType !== "recibo") ||
    typeof value.documentKind !== "string" ||
    typeof value.number !== "string" ||
    typeof value.date !== "string" ||
    !isRecord(value.issuer) ||
    !isRecord(value.customer) ||
    !Array.isArray(value.items) ||
    !isRecord(value.taxSummary) ||
    value.currency !== "EUR" ||
    !isRecord(value.numbering) ||
    !isRecord(value.fiscalContext) ||
    typeof value.fiscalContext.vatExempt !== "boolean" ||
    !isRecord(value.fiscalContext.iva) ||
    typeof value.snapshotHash !== "string"
  ) {
    return false;
  }
  if (value.rectification !== undefined && !isRecord(value.rectification)) {
    return false;
  }
  if (value.verifactu !== undefined && !isRecord(value.verifactu)) {
    return false;
  }
  if (
    value.fiscalContext.verifactu !== undefined &&
    !isRecord(value.fiscalContext.verifactu)
  ) {
    return false;
  }
  return true;
}

function isRecognizableDocument(value: unknown): value is Document {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    value.id.length === 0 ||
    (value.type !== "factura" &&
      value.type !== "presupuesto" &&
      value.type !== "recibo") ||
    typeof value.number !== "string" ||
    typeof value.date !== "string" ||
    !isRecord(value.client) ||
    !Array.isArray(value.items) ||
    typeof value.status !== "string" ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    return false;
  }
  if (
    value.items.some(
      (item) =>
        !isRecord(item) ||
        typeof item.id !== "string" ||
        typeof item.description !== "string" ||
        !isFiniteNumber(item.quantity) ||
        !isFiniteNumber(item.unitPrice) ||
        !isFiniteNumber(item.ivaPercent),
    )
  ) {
    return false;
  }
  if (
    value.documentSnapshot !== undefined &&
    !isRecognizableDocumentSnapshot(value.documentSnapshot)
  ) {
    return false;
  }
  if (value.pdfSnapshot !== undefined && !isRecord(value.pdfSnapshot)) {
    return false;
  }
  if (value.snapshotSeal !== undefined && !isRecord(value.snapshotSeal)) {
    return false;
  }
  if (value.rectification !== undefined && !isRecord(value.rectification)) {
    return false;
  }
  if (value.verifactu !== undefined && !isRecord(value.verifactu)) {
    return false;
  }
  return true;
}

function hasProtectedRetirementEvidence(document: Document): boolean {
  const snapshot = isRecord(document.documentSnapshot)
    ? document.documentSnapshot
    : undefined;
  const fiscalContext = isRecord(snapshot?.fiscalContext)
    ? snapshot.fiscalContext
    : undefined;
  const snapshotVerifactu = isRecord(snapshot?.verifactu)
    ? snapshot.verifactu
    : undefined;
  const fiscalVerifactu = isRecord(fiscalContext?.verifactu)
    ? fiscalContext.verifactu
    : undefined;
  const documentVerifactu = isRecord(document.verifactu)
    ? document.verifactu
    : undefined;
  return Boolean(
    document.rectification ||
    snapshot?.rectification ||
    document.rectifiedById ||
    document.verifactuPersistence === "server_confirmed" ||
    documentVerifactu?.status === "registered" ||
    documentVerifactu?.environment === "production" ||
    snapshotVerifactu?.status === "registered" ||
    snapshotVerifactu?.environment === "production" ||
    fiscalVerifactu?.environment === "production",
  );
}

function hashStable(value: unknown): string {
  return `sha256:${sha256Hex(stableStringifySnapshot(value))}`;
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

function immutableBatchPlan(batch: TestDocumentRetirementBatchV1): unknown {
  const { status: _status, events: _events, ...plan } = batch;
  void _status;
  void _events;
  return plan;
}

function eventsArePrefix(
  prefix: TestDocumentRetirementBatchV1["events"],
  full: TestDocumentRetirementBatchV1["events"],
): boolean {
  if (prefix.length > full.length) return false;
  return prefix.every(
    (event, index) =>
      stableStringifySnapshot(event) === stableStringifySnapshot(full[index]),
  );
}

/** Valida el contrato persistente completo; un sobre parcial nunca se aplica. */
function isValidTestDocumentRetirementBatchUnchecked(
  value: unknown,
): value is TestDocumentRetirementBatchV1 {
  if (!isRecord(value)) return false;
  const batch = value as unknown as TestDocumentRetirementBatchV1;
  if (
    batch.schemaVersion !== 1 ||
    batch.kind !== "explicit_test_document_retirement_v1" ||
    typeof batch.batchId !== "string" ||
    !batch.batchId.startsWith(BATCH_PREFIX) ||
    batch.reason !== "explicit_test_cleanup" ||
    (batch.status !== "applied" && batch.status !== "rolled_back") ||
    !TENANT_FINGERPRINT_PATTERN.test(batch.tenantFingerprint) ||
    !HASH_PATTERN.test(batch.selectionFingerprint) ||
    !HASH_PATTERN.test(batch.planFingerprint) ||
    !HASH_PATTERN.test(batch.beforeFingerprint) ||
    !HASH_PATTERN.test(batch.afterFingerprint) ||
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

  if (
    batch.selectedDocumentIds.some((id) => typeof id !== "string" || !id) ||
    batch.beforeDocumentOrder.some((id) => typeof id !== "string" || !id) ||
    batch.afterDocumentOrder.some((id) => typeof id !== "string" || !id)
  ) {
    return false;
  }

  const selected = new Set(batch.selectedDocumentIds);
  const expectedAfterOrder = batch.beforeDocumentOrder.filter(
    (documentId) => !selected.has(documentId),
  );
  if (
    selected.size !== batch.selectedDocumentIds.length ||
    new Set(batch.beforeDocumentOrder).size !==
      batch.beforeDocumentOrder.length ||
    new Set(batch.afterDocumentOrder).size !==
      batch.afterDocumentOrder.length ||
    batch.selectionFingerprint !==
      hashStable({
        schemaVersion: 1,
        tenantFingerprint: batch.tenantFingerprint,
        selectedDocumentIds: [...batch.selectedDocumentIds].sort(),
      }) ||
    stableStringifySnapshot(batch.afterDocumentOrder) !==
      stableStringifySnapshot(expectedAfterOrder) ||
    batch.retiredDocuments.length !== selected.size ||
    batch.reservedIdentities.length !== selected.size
  ) {
    return false;
  }

  const retiredDocuments = batch.retiredDocuments;
  if (
    retiredDocuments.some(
      (entry) =>
        !isRecord(entry) ||
        !Number.isInteger(entry.originalIndex) ||
        entry.originalIndex < 0 ||
        !isRecognizableDocument(entry.document) ||
        (entry.document.type !== "factura" &&
          entry.document.type !== "recibo") ||
        hasProtectedRetirementEvidence(entry.document) ||
        !selected.has(entry.document.id) ||
        batch.beforeDocumentOrder[entry.originalIndex] !== entry.document.id,
    ) ||
    stableStringifySnapshot(batch.selectedDocumentIds) !==
      stableStringifySnapshot(
        retiredDocuments.map((entry) => entry.document.id),
      )
  ) {
    return false;
  }

  const expectedReserved = retiredDocuments.map(({ document }) => ({
    documentId: document.id,
    documentType: document.type,
    number: document.number,
  }));
  if (
    stableStringifySnapshot(batch.reservedIdentities) !==
    stableStringifySnapshot(expectedReserved)
  ) {
    return false;
  }

  if (
    batch.backlinkChanges.some(
      (change) =>
        !isRecord(change) ||
        typeof change.documentId !== "string" ||
        !isRecognizableDocument(change.before) ||
        !isRecognizableDocument(change.after) ||
        change.documentId !== change.before.id ||
        change.documentId !== change.after.id ||
        selected.has(change.documentId) ||
        !batch.beforeDocumentOrder.includes(change.documentId) ||
        !batch.afterDocumentOrder.includes(change.documentId) ||
        !onlyReceiptBacklinkChanged(change.before, change.after),
    ) ||
    new Set(batch.backlinkChanges.map((change) => change.documentId)).size !==
      batch.backlinkChanges.length
  ) {
    return false;
  }

  const expectedBatchId = `${BATCH_PREFIX}${sha256Hex(
    stableStringifySnapshot({
      tenantFingerprint: batch.tenantFingerprint,
      planFingerprint: batch.planFingerprint,
    }),
  )}`;
  if (
    batch.planFingerprint !== testDocumentRetirementPlanFingerprint(batch) ||
    batch.batchId !== expectedBatchId
  ) {
    return false;
  }

  if (
    batch.events.some((event, index) => {
      if (!isRecord(event)) return true;
      const expectedAction = index % 2 === 0 ? "applied" : "rolled_back";
      const backup = event.backup;
      const previous = index > 0 ? batch.events[index - 1] : undefined;
      return (
        event.action !== expectedAction ||
        !isCanonicalTimestamp(event.at) ||
        (previous !== undefined &&
          (!isCanonicalTimestamp(previous.at) ||
            Date.parse(event.at) <= Date.parse(previous.at))) ||
        event.beforeFingerprint !== batch.beforeFingerprint ||
        event.afterFingerprint !== batch.afterFingerprint ||
        event.workspaceFingerprint !==
          (event.action === "applied"
            ? batch.beforeFingerprint
            : batch.afterFingerprint) ||
        !isRecord(backup) ||
        typeof backup.filename !== "string" ||
        !BACKUP_FILENAME_PATTERN.test(backup.filename) ||
        backup.filename.includes("/") ||
        backup.filename.includes("\\") ||
        !isCanonicalTimestamp(backup.createdAt) ||
        backup.createdAt !== event.at ||
        typeof backup.exportableDataFingerprint !== "string" ||
        !HASH_PATTERN.test(backup.exportableDataFingerprint) ||
        typeof backup.contentSha256 !== "string" ||
        !HASH_PATTERN.test(backup.contentSha256) ||
        !Number.isSafeInteger(backup.byteLength) ||
        backup.byteLength <= 0 ||
        backup.disposition !== "browser_download_requested"
      );
    }) ||
    batch.events.at(-1)?.action !==
      (batch.status === "applied" ? "applied" : "rolled_back")
  ) {
    return false;
  }

  return true;
}

/** Un payload no confiable siempre produce `false`; jamás propaga excepciones. */
export function isValidTestDocumentRetirementBatch(
  value: unknown,
): value is TestDocumentRetirementBatchV1 {
  try {
    return isValidTestDocumentRetirementBatchUnchecked(value);
  } catch {
    return false;
  }
}

export interface NormalizedTestDocumentRetirementBatches {
  batches: TestDocumentRetirementBatchV1[];
  invalidEntries: Array<{ index: number; rawValue: unknown }>;
}

/** Normaliza sin reinterpretar ni reparar el contenido fiscal archivado. */
export function normalizeTestDocumentRetirementBatches(
  rawValue: unknown,
): NormalizedTestDocumentRetirementBatches {
  if (rawValue === undefined) return { batches: [], invalidEntries: [] };
  if (!Array.isArray(rawValue)) {
    return { batches: [], invalidEntries: [{ index: -1, rawValue }] };
  }

  const validGroups = new Map<
    string,
    Array<{ index: number; batch: TestDocumentRetirementBatchV1 }>
  >();
  const invalidEntries: Array<{ index: number; rawValue: unknown }> = [];
  rawValue.forEach((rawBatch, index) => {
    if (!isValidTestDocumentRetirementBatch(rawBatch)) {
      invalidEntries.push({ index, rawValue: rawBatch });
      return;
    }
    const group = validGroups.get(rawBatch.batchId) ?? [];
    group.push({ index, batch: rawBatch });
    validGroups.set(rawBatch.batchId, group);
  });
  const batches: TestDocumentRetirementBatchV1[] = [];
  for (const group of [...validGroups.values()].sort(
    (left, right) => left[0]!.index - right[0]!.index,
  )) {
    let merged = group[0]!.batch;
    let divergent = false;
    for (const entry of group.slice(1)) {
      const next = mergeTestDocumentRetirementBatch(merged, entry.batch);
      if (!next) {
        divergent = true;
        break;
      }
      merged = next;
    }
    if (divergent) {
      invalidEntries.push(
        ...group.map(({ index }) => ({ index, rawValue: rawValue[index] })),
      );
    } else {
      batches.push(merged);
    }
  }
  return { batches, invalidEntries };
}

export function mergeTestDocumentRetirementBatch(
  current: TestDocumentRetirementBatchV1,
  incoming: TestDocumentRetirementBatchV1,
): TestDocumentRetirementBatchV1 | null {
  if (
    !isValidTestDocumentRetirementBatch(current) ||
    !isValidTestDocumentRetirementBatch(incoming) ||
    current.batchId !== incoming.batchId ||
    stableStringifySnapshot(immutableBatchPlan(current)) !==
      stableStringifySnapshot(immutableBatchPlan(incoming))
  ) {
    return null;
  }
  if (eventsArePrefix(current.events, incoming.events)) return incoming;
  if (eventsArePrefix(incoming.events, current.events)) return current;
  return null;
}

export function mergeTestDocumentRetirementBatches(
  current: readonly TestDocumentRetirementBatchV1[] | undefined,
  incoming: readonly TestDocumentRetirementBatchV1[] | undefined,
): { batches: TestDocumentRetirementBatchV1[]; conflicts: string[] } {
  const result = normalizeTestDocumentRetirementBatches(current).batches;
  const byId = new Map(result.map((batch, index) => [batch.batchId, index]));
  const conflicts: string[] = [];
  for (const batch of incoming ?? []) {
    const candidate: unknown = batch;
    if (!isValidTestDocumentRetirementBatch(candidate)) {
      conflicts.push(
        isRecord(candidate) && typeof candidate.batchId === "string"
          ? candidate.batchId
          : "invalid",
      );
      continue;
    }
    const existingIndex = byId.get(batch.batchId);
    if (existingIndex === undefined) {
      byId.set(batch.batchId, result.length);
      result.push(batch);
      continue;
    }
    const merged = mergeTestDocumentRetirementBatch(
      result[existingIndex]!,
      batch,
    );
    if (!merged) {
      conflicts.push(batch.batchId);
      continue;
    }
    result[existingIndex] = merged;
  }
  return { batches: result, conflicts };
}

export function testDocumentRetirementBatchUpdatedAt(
  batch: TestDocumentRetirementBatchV1,
): string {
  return batch.events.at(-1)?.at ?? "1970-01-01T00:00:00.000Z";
}

function recognizableReservationsFromQuarantine(
  quarantine: readonly WorkspaceIntegrityQuarantineEntry[] | undefined,
): ReservedTestDocumentIdentityV1[] {
  const reservations: ReservedTestDocumentIdentityV1[] = [];
  for (const entry of quarantine ?? []) {
    if (entry.collection !== "testDocumentRetirementBatches") continue;
    const raw = entry.rawValue;
    if (!isRecord(raw) || !Array.isArray(raw.reservedIdentities)) continue;
    for (const identity of raw.reservedIdentities) {
      if (
        isRecord(identity) &&
        typeof identity.documentId === "string" &&
        typeof identity.number === "string" &&
        (identity.documentType === "factura" ||
          identity.documentType === "presupuesto" ||
          identity.documentType === "recibo")
      ) {
        reservations.push(
          identity as unknown as ReservedTestDocumentIdentityV1,
        );
      }
    }
  }
  return reservations;
}

export function getPersistedRetirementReservations(
  data: Pick<
    AppData,
    "testDocumentRetirementBatches" | "workspaceIntegrityQuarantine"
  >,
): ReservedTestDocumentIdentityV1[] {
  const all = [
    ...(data.testDocumentRetirementBatches ?? []).flatMap((batch) =>
      Array.isArray(batch?.reservedIdentities)
        ? batch.reservedIdentities.filter(
            (identity) =>
              identity &&
              typeof identity.documentId === "string" &&
              typeof identity.number === "string" &&
              (identity.documentType === "factura" ||
                identity.documentType === "presupuesto" ||
                identity.documentType === "recibo"),
          )
        : [],
    ),
    ...recognizableReservationsFromQuarantine(
      data.workspaceIntegrityQuarantine,
    ),
  ];
  const seen = new Set<string>();
  return all.filter((identity) => {
    const key = `${identity.documentId}:${identity.documentType}:${identity.number}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function documentsIncludingRetiredForNumbering(
  data: AppData,
): Document[] {
  const byId = new Map(
    data.documents.map((document) => [document.id, document]),
  );
  for (const batch of data.testDocumentRetirementBatches ?? []) {
    if (!isValidTestDocumentRetirementBatch(batch)) continue;
    for (const retired of batch.retiredDocuments) {
      if (!byId.has(retired.document.id)) {
        byId.set(retired.document.id, retired.document);
      }
    }
  }
  return [...byId.values()];
}

function kindForIdentity(
  identity: ReservedTestDocumentIdentityV1,
  data: AppData,
): DocumentKind {
  if (identity.documentType !== "factura") return identity.documentType;
  const retired = (data.testDocumentRetirementBatches ?? [])
    .filter(isValidTestDocumentRetirementBatch)
    .flatMap((batch) => batch.retiredDocuments)
    .find((entry) => entry.document.id === identity.documentId)?.document;
  return retired?.rectification ? "factura_rectificativa" : "factura";
}

function clone<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function retirementQuarantineKey(
  entry: WorkspaceIntegrityQuarantineEntry,
): string {
  return hashStable({
    collection: entry.collection,
    index: entry.index,
    reason: entry.reason,
    rawValue: entry.rawValue,
  });
}

function isRetirementQuarantineEntry(
  entry: WorkspaceIntegrityQuarantineEntry,
): boolean {
  return (
    entry.collection === "testDocumentRetirementBatches" ||
    entry.collection === "documents.reservedTestDocumentIdentity" ||
    entry.collection === "documents.retiredTestDocumentDivergence"
  );
}

/** Conserva monotónicamente la evidencia local inválida sin subir raw a cloud. */
export function mergeRetirementQuarantine(
  current: readonly WorkspaceIntegrityQuarantineEntry[] | undefined,
  incoming: readonly WorkspaceIntegrityQuarantineEntry[] | undefined,
): WorkspaceIntegrityQuarantineEntry[] | undefined {
  const result = [...(incoming ?? [])];
  const seen = new Set(result.map(retirementQuarantineKey));
  for (const entry of current ?? []) {
    if (!isRetirementQuarantineEntry(entry)) continue;
    const key = retirementQuarantineKey(entry);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(entry);
  }
  return result.length > 0 ? result : undefined;
}

export function quarantineTestDocumentRetirementPayload(
  data: AppData,
  rawValue: unknown,
): AppData {
  const entry: WorkspaceIntegrityQuarantineEntry = {
    collection: "testDocumentRetirementBatches",
    reason: "malformed_record",
    rawValue: clone(rawValue),
  };
  return {
    ...data,
    workspaceIntegrityQuarantine: mergeRetirementQuarantine(
      data.workspaceIntegrityQuarantine,
      [entry],
    ),
  };
}

function retirementBatchesInProjectionOrder(
  batches: readonly TestDocumentRetirementBatchV1[],
): TestDocumentRetirementBatchV1[] {
  return [...batches].sort((left, right) => {
    const timestamp = testDocumentRetirementBatchUpdatedAt(left).localeCompare(
      testDocumentRetirementBatchUpdatedAt(right),
    );
    return timestamp !== 0
      ? timestamp
      : left.batchId.localeCompare(right.batchId);
  });
}

/**
 * Restablece el orden conocido por el plan y conserva al final, en su orden
 * actual, cualquier documento creado después. Si falta un superviviente del
 * plan o hay IDs duplicados, el orden no puede demostrarse y se bloquea.
 */
function reorderDocumentsByCanonicalOrder(
  documents: readonly Document[],
  canonicalOrder: readonly string[],
): Document[] | null {
  const byId = new Map<string, Document>();
  for (const document of documents) {
    if (byId.has(document.id)) return null;
    byId.set(document.id, document);
  }
  if (canonicalOrder.some((id) => !byId.has(id))) return null;
  const canonicalIds = new Set(canonicalOrder);
  return [
    ...canonicalOrder.map((id) => byId.get(id)!),
    ...documents.filter((document) => !canonicalIds.has(document.id)),
  ];
}

type BatchProjectionStep =
  { status: "applied"; data: AppData } | { status: "blocked"; data: AppData };

function projectAppliedBatch(
  data: AppData,
  batch: TestDocumentRetirementBatchV1,
): BatchProjectionStep {
  const archivedById = new Map(
    batch.retiredDocuments.map((entry) => [entry.document.id, entry.document]),
  );
  const divergent: Document[] = [];
  let documents = data.documents.filter((document) => {
    const archived = archivedById.get(document.id);
    if (!archived) return true;
    if (
      stableStringifySnapshot(document) !== stableStringifySnapshot(archived)
    ) {
      divergent.push(document);
    }
    return false;
  });

  for (const change of batch.backlinkChanges) {
    const index = documents.findIndex(
      (document) => document.id === change.documentId,
    );
    if (index < 0) return { status: "blocked", data };
    const current = documents[index]!;
    if (current.receiptDocumentId === undefined) continue;
    if (current.receiptDocumentId !== change.before.receiptDocumentId) {
      return { status: "blocked", data };
    }
    const next = { ...current };
    delete next.receiptDocumentId;
    documents = [...documents];
    documents[index] = next;
  }

  const ordered = reorderDocumentsByCanonicalOrder(
    documents,
    batch.afterDocumentOrder,
  );
  if (!ordered) return { status: "blocked", data };

  let projected: AppData = { ...data, documents: ordered };
  for (const document of divergent) {
    const entry: WorkspaceIntegrityQuarantineEntry = {
      collection: "documents.retiredTestDocumentDivergence",
      reason: "malformed_record",
      rawValue: clone(document),
    };
    projected = {
      ...projected,
      workspaceIntegrityQuarantine: mergeRetirementQuarantine(
        projected.workspaceIntegrityQuarantine,
        [entry],
      ),
    };
  }
  return { status: "applied", data: projected };
}

function projectAppliedBatches(data: AppData): AppData {
  let projected = data;
  const batches = retirementBatchesInProjectionOrder(
    (data.testDocumentRetirementBatches ?? []).filter(
      (batch) =>
        isValidTestDocumentRetirementBatch(batch) && batch.status === "applied",
    ),
  );
  for (const batch of batches) {
    const result = projectAppliedBatch(projected, batch);
    if (result.status === "blocked") {
      return quarantineTestDocumentRetirementPayload(projected, {
        reason: "state_conflict",
        batchId: batch.batchId,
      });
    }
    projected = result.data;
  }
  return projected;
}

function batchHasRetiredDocumentDivergence(
  data: AppData,
  batch: TestDocumentRetirementBatchV1,
): boolean {
  const selected = new Set(batch.selectedDocumentIds);
  return (data.workspaceIntegrityQuarantine ?? []).some((entry) => {
    if (entry.collection !== "documents.retiredTestDocumentDivergence") {
      return false;
    }
    return isRecord(entry.rawValue) && selected.has(String(entry.rawValue.id));
  });
}

function batchHasReservedIdentityCollision(
  data: AppData,
  batch: TestDocumentRetirementBatchV1,
): boolean {
  return batch.reservedIdentities.some((identity) =>
    data.documents.some(
      (document) =>
        document.id !== identity.documentId &&
        document.type === identity.documentType &&
        document.number === identity.number,
    ),
  );
}

function reconstructRolledBackDocuments(
  data: AppData,
  batch: TestDocumentRetirementBatchV1,
): Document[] | null {
  const byId = new Map<string, Document>();
  for (const document of data.documents) {
    if (byId.has(document.id)) return null;
    byId.set(document.id, document);
  }
  for (const change of batch.backlinkChanges) {
    const current = byId.get(change.documentId);
    if (!current) return null;
    if (current.receiptDocumentId === change.before.receiptDocumentId) continue;
    if (current.receiptDocumentId !== undefined) return null;
    byId.set(change.documentId, {
      ...current,
      receiptDocumentId: change.before.receiptDocumentId,
    });
  }
  for (const retired of batch.retiredDocuments) {
    const current = byId.get(retired.document.id);
    if (
      current &&
      stableStringifySnapshot(current) !==
        stableStringifySnapshot(retired.document)
    ) {
      return null;
    }
    if (!current) byId.set(retired.document.id, clone(retired.document));
  }
  const currentOrder = data.documents.map((document) => document.id);
  const canonicalIds = new Set(batch.beforeDocumentOrder);
  const extras = currentOrder.filter((id) => !canonicalIds.has(id));
  if (batch.beforeDocumentOrder.some((id) => !byId.has(id))) return null;
  return [...batch.beforeDocumentOrder, ...extras].map((id) =>
    clone(byId.get(id)!),
  );
}

function rolledBackBatchIsCoherent(
  data: AppData,
  batch: TestDocumentRetirementBatchV1,
): boolean {
  const byId = new Map(
    data.documents.map((document) => [document.id, document]),
  );
  return (
    batch.retiredDocuments.every((retired) => {
      const active = byId.get(retired.document.id);
      return (
        active &&
        stableStringifySnapshot(active) ===
          stableStringifySnapshot(retired.document)
      );
    }) &&
    batch.backlinkChanges.every((change) => {
      const active = byId.get(change.documentId);
      return active?.receiptDocumentId === change.before.receiptDocumentId;
    })
  );
}

function enforceReservedIdentityCollisions(data: AppData): AppData {
  const allowedIdsByIdentity = new Map<string, Set<string>>();
  for (const identity of getPersistedRetirementReservations(data)) {
    const key = `${identity.documentType}:${identity.number}`;
    const ids = allowedIdsByIdentity.get(key) ?? new Set<string>();
    ids.add(identity.documentId);
    allowedIdsByIdentity.set(key, ids);
  }
  const collisions: Document[] = [];
  const documents = data.documents.filter((document) => {
    const allowedIds = allowedIdsByIdentity.get(
      `${document.type}:${document.number}`,
    );
    if (!allowedIds || allowedIds.has(document.id)) return true;
    collisions.push(document);
    return false;
  });
  if (collisions.length === 0) return { ...data, documents };
  const quarantine = [...(data.workspaceIntegrityQuarantine ?? [])];
  const seen = new Set(quarantine.map(retirementQuarantineKey));
  for (const document of collisions) {
    const entry: WorkspaceIntegrityQuarantineEntry = {
      collection: "documents.reservedTestDocumentIdentity",
      reason: "malformed_record",
      rawValue: clone(document),
    };
    const key = retirementQuarantineKey(entry);
    if (seen.has(key)) continue;
    seen.add(key);
    quarantine.push(entry);
  }
  return { ...data, documents, workspaceIntegrityQuarantine: quarantine };
}

export type ProjectTestDocumentRetirementHistoryResult =
  | { status: "applied"; data: AppData }
  | {
      status: "blocked";
      reason: "tenant_mismatch" | "state_conflict" | "invalid_batch";
      batchId?: string;
    };

/** Proyecta apply/rollback solo cuando el estado puede demostrarse coherente. */
export function projectTestDocumentRetirementHistory(
  input: AppData,
  expectedTenantFingerprint?: string,
): ProjectTestDocumentRetirementHistoryResult {
  const batches = input.testDocumentRetirementBatches ?? [];
  for (const batch of batches) {
    if (!isValidTestDocumentRetirementBatch(batch)) {
      return { status: "blocked", reason: "invalid_batch" };
    }
    if (
      expectedTenantFingerprint &&
      batch.tenantFingerprint !== expectedTenantFingerprint
    ) {
      return {
        status: "blocked",
        reason: "tenant_mismatch",
        batchId: batch.batchId,
      };
    }
  }

  let data = input;
  for (const batch of retirementBatchesInProjectionOrder(batches)) {
    if (batch.status === "applied") {
      const projected = projectAppliedBatch(data, batch);
      if (projected.status === "blocked") {
        return {
          status: "blocked",
          reason: "state_conflict",
          batchId: batch.batchId,
        };
      }
      data = projected.data;
      continue;
    }
    if (
      batchHasRetiredDocumentDivergence(data, batch) ||
      batchHasReservedIdentityCollision(data, batch)
    ) {
      return {
        status: "blocked",
        reason: "state_conflict",
        batchId: batch.batchId,
      };
    }
    const documents = reconstructRolledBackDocuments(data, batch);
    if (!documents) {
      return {
        status: "blocked",
        reason: "state_conflict",
        batchId: batch.batchId,
      };
    }
    data = { ...data, documents };
    if (!rolledBackBatchIsCoherent(data, batch)) {
      return {
        status: "blocked",
        reason: "state_conflict",
        batchId: batch.batchId,
      };
    }
  }
  return {
    status: "applied",
    data: clampRetiredDocumentNumbering(
      enforceReservedIdentityCollisions(data),
    ),
  };
}

/** Eleva contadores y numbering; nunca reduce una reserva ya persistida. */
export function clampRetiredDocumentNumbering(data: AppData): AppData {
  const numbering = normalizeNumbering(data.profile.numbering);
  const floors = { ...numbering.lastSequence };
  for (const identity of getPersistedRetirementReservations(data)) {
    const kind = kindForIdentity(identity, data);
    const parsed = parseDocumentNumberForKind(identity.number, kind, numbering);
    if (!parsed) continue;
    const identityYear = parsed.year ?? numbering.year;
    if (identityYear !== numbering.year) continue;
    floors[kind] = Math.max(floors[kind], parsed.sequence);
  }

  const nextCounters = {
    factura: Math.max(data.counters.factura, floors.factura),
    factura_rectificativa: Math.max(
      data.counters.factura_rectificativa,
      floors.factura_rectificativa,
    ),
    presupuesto: Math.max(data.counters.presupuesto, floors.presupuesto),
    recibo: Math.max(data.counters.recibo, floors.recibo),
  };
  return {
    ...data,
    profile: {
      ...data.profile,
      numbering: { ...numbering, lastSequence: floors },
    },
    counters: nextCounters,
  };
}

/**
 * Política post-merge: un upsert viejo no puede resucitar ni el documento
 * retirado ni el backlink de recibo que el lote aplicado eliminó.
 */
export function enforceAppliedTestDocumentRetirements(data: AppData): AppData {
  return clampRetiredDocumentNumbering(
    enforceReservedIdentityCollisions(projectAppliedBatches(data)),
  );
}

/** Restore/backup solo puede conservar o extender el historial append-only. */
export function retirementHistoryContains(
  candidate: readonly TestDocumentRetirementBatchV1[] | undefined,
  required: readonly TestDocumentRetirementBatchV1[] | undefined,
): boolean {
  const candidateById = new Map(
    normalizeTestDocumentRetirementBatches(candidate).batches.map((batch) => [
      batch.batchId,
      batch,
    ]),
  );
  return normalizeTestDocumentRetirementBatches(required).batches.every(
    (requiredBatch) => {
      const candidateBatch = candidateById.get(requiredBatch.batchId);
      return Boolean(
        candidateBatch &&
        stableStringifySnapshot(immutableBatchPlan(candidateBatch)) ===
          stableStringifySnapshot(immutableBatchPlan(requiredBatch)) &&
        eventsArePrefix(requiredBatch.events, candidateBatch.events),
      );
    },
  );
}
