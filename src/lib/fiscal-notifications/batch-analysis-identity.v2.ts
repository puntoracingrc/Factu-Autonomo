export const FISCAL_NOTIFICATION_BATCH_ANALYSIS_IDENTITY_VERSION_V2 =
  "2.0.0" as const;

export interface FiscalNotificationBatchAnalysisIdentityV2 {
  readonly fileId: string;
  readonly documentId: string;
  readonly sourceSha256: string;
}

export interface FiscalNotificationBatchAnalysisRecordV2<T> {
  readonly identity: FiscalNotificationBatchAnalysisIdentityV2;
  readonly value: T;
}

export class FiscalNotificationBatchAnalysisIdentityErrorV2 extends Error {
  constructor() {
    super("FISCAL_NOTIFICATION_BATCH_ANALYSIS_IDENTITY_MISMATCH");
    this.name = "FiscalNotificationBatchAnalysisIdentityErrorV2";
  }
}

const SHA256 = /^[a-f0-9]{64}$/u;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/u;

export function freezeFiscalNotificationBatchAnalysisIdentityV2(
  value: FiscalNotificationBatchAnalysisIdentityV2,
): FiscalNotificationBatchAnalysisIdentityV2 {
  assertIdentifier(value.fileId);
  assertIdentifier(value.documentId);
  if (!SHA256.test(value.sourceSha256)) invalid();
  return Object.freeze({
    fileId: value.fileId,
    documentId: value.documentId,
    sourceSha256: value.sourceSha256,
  });
}

export function assertFiscalNotificationBatchAnalysisIdentityV2(
  expected: FiscalNotificationBatchAnalysisIdentityV2,
  actual: FiscalNotificationBatchAnalysisIdentityV2 | null | undefined,
): void {
  const safeExpected = freezeFiscalNotificationBatchAnalysisIdentityV2(expected);
  if (!actual) invalid();
  const safeActual = freezeFiscalNotificationBatchAnalysisIdentityV2(actual);
  if (
    safeActual.fileId !== safeExpected.fileId ||
    safeActual.documentId !== safeExpected.documentId ||
    safeActual.sourceSha256 !== safeExpected.sourceSha256
  ) {
    invalid();
  }
}

/**
 * Commits an asynchronous result only into the queue record whose complete
 * identity matches. Completion order cannot move a result to another file.
 */
export function reduceFiscalNotificationBatchAnalysisV2<T>(input: {
  readonly queue: readonly FiscalNotificationBatchAnalysisIdentityV2[];
  readonly current: readonly FiscalNotificationBatchAnalysisRecordV2<T>[];
  readonly completed: FiscalNotificationBatchAnalysisRecordV2<T>;
}): readonly FiscalNotificationBatchAnalysisRecordV2<T>[] {
  const queue = input.queue.map(freezeFiscalNotificationBatchAnalysisIdentityV2);
  const completedIdentity = freezeFiscalNotificationBatchAnalysisIdentityV2(
    input.completed.identity,
  );
  const expected = queue.find(
    (candidate) => candidate.fileId === completedIdentity.fileId,
  );
  if (!expected) invalid();
  assertFiscalNotificationBatchAnalysisIdentityV2(expected, completedIdentity);

  const seenFiles = new Set<string>();
  const records = input.current.map((record) => {
    const identity = freezeFiscalNotificationBatchAnalysisIdentityV2(
      record.identity,
    );
    if (seenFiles.has(identity.fileId)) invalid();
    seenFiles.add(identity.fileId);
    const queued = queue.find((candidate) => candidate.fileId === identity.fileId);
    if (!queued) invalid();
    assertFiscalNotificationBatchAnalysisIdentityV2(queued, identity);
    return Object.freeze({ identity, value: record.value });
  });
  const replacement = Object.freeze({
    identity: completedIdentity,
    value: input.completed.value,
  });
  const index = records.findIndex(
    (record) => record.identity.fileId === completedIdentity.fileId,
  );
  const next = [...records];
  if (index === -1) next.push(replacement);
  else next[index] = replacement;
  return Object.freeze(next);
}

export function selectFiscalNotificationBatchAnalysisByDocumentIdV2<T>(
  records: readonly FiscalNotificationBatchAnalysisRecordV2<T>[],
  activeDocumentId: string | null,
): FiscalNotificationBatchAnalysisRecordV2<T> | null {
  if (activeDocumentId === null) return null;
  assertIdentifier(activeDocumentId);
  return (
    records.find(
      (record) => record.identity.documentId === activeDocumentId,
    ) ?? null
  );
}

function assertIdentifier(value: string): void {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 160 ||
    value.trim() !== value ||
    CONTROL_CHARACTERS.test(value)
  ) {
    invalid();
  }
}

function invalid(): never {
  throw new FiscalNotificationBatchAnalysisIdentityErrorV2();
}
