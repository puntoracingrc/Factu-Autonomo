import type {
  FiscalNotificationLocalReviewCandidate,
  FiscalNotificationLocalReviewReason,
} from "./local-review-flow";

export const FISCAL_NOTIFICATION_SAFE_REVIEW_REPOSITORY_SCHEMA_VERSION =
  1 as const;

export const FISCAL_NOTIFICATION_SAFE_REVIEW_REPOSITORY_LIMITS = Object.freeze({
  maxStoredCharacters: 256 * 1024,
  maxReviews: 50,
  maxCandidates: 2,
  maxAnchorsPerCandidate: 15,
  maxPages: 80,
  maxByteLength: 4 * 1024 * 1024,
  maxIdCharacters: 160,
  maxOwnerScopeCharacters: 160,
} as const);

export interface FiscalNotificationReviewStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface FiscalNotificationReviewExclusiveLock {
  runExclusive<T>(name: string, task: () => Promise<T>): Promise<T>;
}

export interface PersistedFiscalNotificationReviewAnchor {
  readonly anchorId: FiscalNotificationLocalReviewCandidate["matchedAnchors"][number]["anchorId"];
  readonly pageNumbers: readonly number[];
}

export interface PersistedFiscalNotificationReviewCandidate {
  readonly familyId: FiscalNotificationLocalReviewCandidate["familyId"];
  readonly documentType: FiscalNotificationLocalReviewCandidate["documentType"];
  readonly authoritySignal: "AEAT_UNVERIFIED";
  readonly handlerId: FiscalNotificationLocalReviewCandidate["handlerId"];
  readonly handlerVersion: "1.0.0";
  readonly signalStatus: FiscalNotificationLocalReviewCandidate["signalStatus"];
  readonly matchedAnchors: readonly PersistedFiscalNotificationReviewAnchor[];
  readonly missingRequiredAnchorIds: readonly PersistedFiscalNotificationReviewAnchor["anchorId"][];
  readonly conflictingAnchorIds: readonly PersistedFiscalNotificationReviewAnchor["anchorId"][];
  readonly requiresHumanReview: true;
}

export interface PersistedFiscalNotificationReviewResult {
  readonly schemaVersion: 1;
  readonly flowVersion: "1.0.0";
  readonly status: "REVIEW_REQUIRED" | "INFORMATION_PENDING";
  readonly reason: FiscalNotificationLocalReviewReason;
  readonly engineId: "fiscal-notification-family-candidate-engine" | null;
  readonly engineVersion: "1.0.0" | null;
  readonly pageCount: number;
  readonly byteLength: number;
  readonly sha256: string;
  readonly candidates: readonly PersistedFiscalNotificationReviewCandidate[];
  readonly selectedFamilyId: null;
  readonly providerCalled: false;
  readonly requiresHumanReview: true;
  readonly materializationPolicy: "PROHIBITED_UNTIL_REVIEW";
  readonly retainedSourceContent: "NONE";
}

export interface PersistedFiscalNotificationReview {
  readonly reviewId: string;
  readonly ownerScope: string;
  readonly createdAt: string;
  readonly result: PersistedFiscalNotificationReviewResult;
}

export interface FiscalNotificationReviewSnapshot {
  readonly schemaVersion: 1;
  readonly ownerScope: string;
  readonly revision: number;
  readonly reviews: readonly PersistedFiscalNotificationReview[];
}

export type FiscalNotificationReviewLoadBlockedReason =
  | "INVALID_INPUT"
  | "STORAGE_UNAVAILABLE"
  | "STORED_DATA_TOO_LARGE"
  | "CORRUPT_STORED_DATA"
  | "UNSUPPORTED_SCHEMA"
  | "OWNER_SCOPE_MISMATCH";

export type FiscalNotificationReviewLoadResult =
  | {
      readonly status: "empty" | "loaded";
      readonly snapshot: FiscalNotificationReviewSnapshot;
    }
  | {
      readonly status: "blocked";
      readonly reason: FiscalNotificationReviewLoadBlockedReason;
    };

export type FiscalNotificationReviewWriteBlockedReason =
  | FiscalNotificationReviewLoadBlockedReason
  | "LOCK_UNAVAILABLE"
  | "STALE_REVISION"
  | "REVIEW_ID_COLLISION"
  | "COLLECTION_LIMIT_EXCEEDED"
  | "SERIALIZATION_FAILED"
  | "QUOTA_EXCEEDED"
  | "WRITE_FAILED"
  | "VERIFICATION_FAILED";

export type FiscalNotificationReviewWriteResult =
  | {
      readonly status: "applied" | "existing";
      readonly snapshot: FiscalNotificationReviewSnapshot;
    }
  | {
      readonly status: "blocked";
      readonly reason: FiscalNotificationReviewWriteBlockedReason;
    }
  | {
      readonly status: "indeterminate";
      readonly reason: "STORAGE_STATE_UNKNOWN";
    };

export interface FiscalNotificationLocalReviewRepository {
  load(): FiscalNotificationReviewLoadResult;
  append(input: unknown): Promise<FiscalNotificationReviewWriteResult>;
}

export interface FiscalNotificationLocalReviewRepositoryDependencies {
  readonly storage: FiscalNotificationReviewStorageLike | null;
  readonly lock: FiscalNotificationReviewExclusiveLock | null;
  readonly ownerScope: unknown;
}

export const FISCAL_NOTIFICATION_SAFE_REVIEW_STORAGE_KEY_PREFIX =
  "factu:fiscal-notifications:safe-reviews:v1:" as const;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/u;
const CANONICAL_OWNER_SCOPE = /^user:[A-Za-z0-9_-]{1,128}$/u;
const CANONICAL_REVIEW_ID =
  /^review:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const SHA256 = /^[a-f0-9]{64}$/u;

const APPEND_KEYS = new Set([
  "expectedRevision",
  "reviewId",
  "createdAt",
  "result",
]);
const ENVELOPE_KEYS = new Set([
  "schemaVersion",
  "ownerScope",
  "revision",
  "reviews",
]);
const REVIEW_KEYS = new Set(["reviewId", "ownerScope", "createdAt", "result"]);
const RESULT_KEYS = new Set([
  "schemaVersion",
  "flowVersion",
  "status",
  "reason",
  "engineId",
  "engineVersion",
  "pageCount",
  "byteLength",
  "sha256",
  "candidates",
  "selectedFamilyId",
  "providerCalled",
  "requiresHumanReview",
  "materializationPolicy",
  "retainedSourceContent",
]);
const CANDIDATE_KEYS = new Set([
  "familyId",
  "documentType",
  "authoritySignal",
  "handlerId",
  "handlerVersion",
  "signalStatus",
  "matchedAnchors",
  "missingRequiredAnchorIds",
  "conflictingAnchorIds",
  "requiresHumanReview",
]);
const ANCHOR_KEYS = new Set(["anchorId", "pageNumbers"]);

const REASONS = new Set<FiscalNotificationLocalReviewReason>([
  "SUPPORTED_FAMILY_CANDIDATE",
  "PARTIAL_SUPPORTED_FAMILY_SIGNAL",
  "AMBIGUOUS_SUPPORTED_FAMILIES",
  "CONFLICTING_AUTHORITY_OR_TERRITORY",
  "CONFLICTING_DOCUMENT_SIGNAL",
  "NO_SUPPORTED_FAMILY_SIGNAL",
  "NO_EXTRACTABLE_TEXT",
  "INCONSISTENT_PAGE_STATE",
  "UNSUPPORTED_TEXT_CONTROLS",
  "NORMALIZED_TEXT_LIMIT_EXCEEDED",
  "TEXT_LINE_LIMIT_EXCEEDED",
  "OCR_DISABLED",
]);
const ANCHOR_IDS = new Set<PersistedFiscalNotificationReviewAnchor["anchorId"]>([
  "AEAT_AUTHORITY_LABEL",
  "AEAT_OFFICIAL_DOMAIN_LABEL",
  "STRUCTURAL_FIRST_PAGE_HEADER",
  "ENFORCEMENT_ORDER_TITLE",
  "ENFORCEMENT_DOCUMENT_IDENTIFICATION_SECTION",
  "ENFORCEMENT_DEBT_AMOUNT_SECTION",
  "DEFERRAL_GRANT_TITLE",
  "DEFERRAL_INSTALLMENT_ANNEX",
  "DEFERRAL_INTEREST_CALCULATION",
  "CONFLICTING_AUTHORITY_TGSS",
  "CONFLICTING_TERRITORY_CANARY",
  "CONFLICTING_TERRITORY_FORAL",
  "CONFLICTING_TERRITORY_REGIONAL",
  "CONFLICTING_TERRITORY_CEUTA_MELILLA",
  "CONFLICTING_NON_DOCUMENT_GUIDE",
]);
const CONFLICTING_ANCHOR_IDS = new Set<
  PersistedFiscalNotificationReviewAnchor["anchorId"]
>([
  "CONFLICTING_AUTHORITY_TGSS",
  "CONFLICTING_TERRITORY_CANARY",
  "CONFLICTING_TERRITORY_FORAL",
  "CONFLICTING_TERRITORY_REGIONAL",
  "CONFLICTING_TERRITORY_CEUTA_MELILLA",
  "CONFLICTING_NON_DOCUMENT_GUIDE",
]);
const ENFORCEMENT_REQUIRED_ANCHOR_IDS = Object.freeze([
  "AEAT_OFFICIAL_DOMAIN_LABEL",
  "ENFORCEMENT_ORDER_TITLE",
  "ENFORCEMENT_DOCUMENT_IDENTIFICATION_SECTION",
  "ENFORCEMENT_DEBT_AMOUNT_SECTION",
  "STRUCTURAL_FIRST_PAGE_HEADER",
] as const);
const DEFERRAL_REQUIRED_ANCHOR_IDS = Object.freeze([
  "AEAT_OFFICIAL_DOMAIN_LABEL",
  "DEFERRAL_GRANT_TITLE",
  "DEFERRAL_INSTALLMENT_ANNEX",
  "DEFERRAL_INTEREST_CALCULATION",
  "STRUCTURAL_FIRST_PAGE_HEADER",
] as const);
const SIGNAL_STATUSES = new Set<
  PersistedFiscalNotificationReviewCandidate["signalStatus"]
>([
  "COMPLETE_REQUIRED_ANCHORS",
  "INCOMPLETE_REQUIRED_ANCHORS",
  "CONFLICTING_AUTHORITY_OR_TERRITORY",
  "CONFLICTING_DOCUMENT_SIGNAL",
]);
const EMPTY_INFORMATION_REASONS = new Set<FiscalNotificationLocalReviewReason>([
  "NO_SUPPORTED_FAMILY_SIGNAL",
]);
const EMPTY_REVIEW_REASONS = new Set<FiscalNotificationLocalReviewReason>([
  "INCONSISTENT_PAGE_STATE",
  "UNSUPPORTED_TEXT_CONTROLS",
  "NORMALIZED_TEXT_LIMIT_EXCEEDED",
  "TEXT_LINE_LIMIT_EXCEEDED",
]);

class RepositoryDataError extends Error {
  constructor(
    readonly code:
      | "INVALID_INPUT"
      | "CORRUPT_STORED_DATA"
      | "UNSUPPORTED_SCHEMA"
      | "OWNER_SCOPE_MISMATCH",
  ) {
    super("FISCAL_NOTIFICATION_REVIEW_REPOSITORY_ERROR");
    this.name = "RepositoryDataError";
  }
}

interface ValidAppendInput {
  readonly ownerScope: string;
  readonly expectedRevision: number;
  readonly review: PersistedFiscalNotificationReview;
}

interface InternalLoadState {
  readonly status: "empty" | "loaded";
  readonly snapshot: FiscalNotificationReviewSnapshot;
  readonly raw: string | null;
}

export function createFiscalNotificationLocalReviewRepository(
  dependencies: FiscalNotificationLocalReviewRepositoryDependencies,
): FiscalNotificationLocalReviewRepository {
  let storage: FiscalNotificationReviewStorageLike | null = null;
  let lock: FiscalNotificationReviewExclusiveLock | null = null;
  try {
    storage = dependencies.storage;
    lock = dependencies.lock;
  } catch {
    storage = null;
    lock = null;
  }
  let boundOwnerScope: string | null = null;
  try {
    boundOwnerScope = validateOwnerScope(dependencies.ownerScope);
  } catch {
    boundOwnerScope = null;
  }

  const load = (): FiscalNotificationReviewLoadResult => {
    if (!boundOwnerScope) {
      return frozenBlockedLoad("INVALID_INPUT");
    }
    if (!storage) {
      return frozenBlockedLoad("STORAGE_UNAVAILABLE");
    }
    const loaded = loadInternal(storage, boundOwnerScope);
    if ("reason" in loaded) return frozenBlockedLoad(loaded.reason);
    return Object.freeze({ status: loaded.status, snapshot: loaded.snapshot });
  };

  const append = async (
    input: unknown,
  ): Promise<FiscalNotificationReviewWriteResult> => {
    if (!boundOwnerScope) return frozenBlockedWrite("INVALID_INPUT");
    let validated: ValidAppendInput;
    try {
      validated = validateAppendInput(input, boundOwnerScope);
    } catch {
      return frozenBlockedWrite("INVALID_INPUT");
    }
    if (!storage) {
      return frozenBlockedWrite("STORAGE_UNAVAILABLE");
    }
    if (!lock) {
      return frozenBlockedWrite("LOCK_UNAVAILABLE");
    }

    const key = storageKey(validated.ownerScope);
    let entered = false;
    let completed: FiscalNotificationReviewWriteResult | undefined;
    try {
      const lockResult = await lock.runExclusive(key, async () => {
        if (entered) return frozenIndeterminate();
        entered = true;
        completed = appendUnderLock(storage, validated, key);
        return completed;
      });
      if (!entered || lockResult !== completed) return frozenIndeterminate();
      return lockResult;
    } catch {
      return entered ? frozenIndeterminate() : frozenBlockedWrite("LOCK_UNAVAILABLE");
    }
  };

  return Object.freeze({ load, append });
}

function appendUnderLock(
  storage: FiscalNotificationReviewStorageLike,
  input: ValidAppendInput,
  key: string,
): FiscalNotificationReviewWriteResult {
  const loaded = loadInternal(storage, input.ownerScope);
  if ("reason" in loaded) return frozenBlockedWrite(loaded.reason);

  const existing = loaded.snapshot.reviews.find(
    (review) => review.reviewId === input.review.reviewId,
  );
  if (existing) {
    if (canonicalJson(existing) === canonicalJson(input.review)) {
      return Object.freeze({ status: "existing", snapshot: loaded.snapshot });
    }
    return frozenBlockedWrite("REVIEW_ID_COLLISION");
  }
  if (loaded.snapshot.revision !== input.expectedRevision) {
    return frozenBlockedWrite("STALE_REVISION");
  }
  if (
    loaded.snapshot.reviews.length >=
    FISCAL_NOTIFICATION_SAFE_REVIEW_REPOSITORY_LIMITS.maxReviews
  ) {
    return frozenBlockedWrite("COLLECTION_LIMIT_EXCEEDED");
  }
  if (loaded.snapshot.revision >= Number.MAX_SAFE_INTEGER) {
    return frozenBlockedWrite("COLLECTION_LIMIT_EXCEEDED");
  }

  const next = freezeSnapshot({
    schemaVersion: FISCAL_NOTIFICATION_SAFE_REVIEW_REPOSITORY_SCHEMA_VERSION,
    ownerScope: input.ownerScope,
    revision: loaded.snapshot.revision + 1,
    reviews: [...loaded.snapshot.reviews, input.review],
  });
  let serialized: string;
  try {
    serialized = canonicalJson(next);
  } catch {
    return frozenBlockedWrite("SERIALIZATION_FAILED");
  }
  if (
    serialized.length >
    FISCAL_NOTIFICATION_SAFE_REVIEW_REPOSITORY_LIMITS.maxStoredCharacters
  ) {
    return frozenBlockedWrite("COLLECTION_LIMIT_EXCEEDED");
  }

  let observedBeforeWrite: string | null;
  try {
    observedBeforeWrite = storage.getItem(key);
  } catch {
    return frozenBlockedWrite("STORAGE_UNAVAILABLE");
  }
  if (observedBeforeWrite !== loaded.raw) return frozenIndeterminate();

  let writeError: unknown;
  try {
    storage.setItem(key, serialized);
  } catch (error) {
    writeError = error;
  }

  let writtenRaw: string | null | undefined;
  try {
    writtenRaw = storage.getItem(key);
  } catch {
    writtenRaw = undefined;
  }

  if (writeError === undefined && writtenRaw === serialized) {
    return Object.freeze({ status: "applied", snapshot: next });
  }
  if (writtenRaw === loaded.raw) {
    return frozenBlockedWrite(
      writeError === undefined
        ? "VERIFICATION_FAILED"
        : storageWriteFailureReason(writeError),
    );
  }
  if (writtenRaw !== undefined && writtenRaw !== serialized) {
    return frozenIndeterminate();
  }
  if (!restoreRaw(storage, key, loaded.raw, serialized)) {
    return frozenIndeterminate();
  }
  return frozenBlockedWrite(
    writeError === undefined
      ? "VERIFICATION_FAILED"
      : storageWriteFailureReason(writeError),
  );
}

function loadInternal(
  storage: FiscalNotificationReviewStorageLike,
  ownerScope: string,
): InternalLoadState | { readonly reason: FiscalNotificationReviewLoadBlockedReason } {
  const key = storageKey(ownerScope);
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch {
    return { reason: "STORAGE_UNAVAILABLE" };
  }
  if (raw === null) {
    return {
      status: "empty",
      snapshot: freezeSnapshot({
        schemaVersion: FISCAL_NOTIFICATION_SAFE_REVIEW_REPOSITORY_SCHEMA_VERSION,
        ownerScope,
        revision: 0,
        reviews: [],
      }),
      raw,
    };
  }
  if (typeof raw !== "string") return { reason: "CORRUPT_STORED_DATA" };
  if (
    raw.length >
    FISCAL_NOTIFICATION_SAFE_REVIEW_REPOSITORY_LIMITS.maxStoredCharacters
  ) {
    return { reason: "STORED_DATA_TOO_LARGE" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { reason: "CORRUPT_STORED_DATA" };
  }
  try {
    const snapshot = validateSnapshot(parsed, ownerScope, "stored");
    return { status: "loaded", snapshot, raw };
  } catch (error) {
    if (error instanceof RepositoryDataError) {
      if (error.code === "UNSUPPORTED_SCHEMA") {
        return { reason: "UNSUPPORTED_SCHEMA" };
      }
      if (error.code === "OWNER_SCOPE_MISMATCH") {
        return { reason: "OWNER_SCOPE_MISMATCH" };
      }
    }
    return { reason: "CORRUPT_STORED_DATA" };
  }
}

function validateAppendInput(
  value: unknown,
  ownerScope: string,
): ValidAppendInput {
  const input = snapshotRecord(value, "input", "INVALID_INPUT");
  assertKnownKeys(input, APPEND_KEYS, "INVALID_INPUT");
  if (!Number.isSafeInteger(input.expectedRevision) || Number(input.expectedRevision) < 0) {
    throw new RepositoryDataError("INVALID_INPUT");
  }
  const reviewId = validateReviewId(input.reviewId);
  const createdAt = validateTimestamp(input.createdAt);
  const result = validateResult(input.result, "input");
  return Object.freeze({
    ownerScope,
    expectedRevision: input.expectedRevision as number,
    review: freezeReview({ reviewId, ownerScope, createdAt, result }),
  });
}

function validateSnapshot(
  value: unknown,
  expectedOwnerScope: string,
  origin: "input" | "stored",
): FiscalNotificationReviewSnapshot {
  const errorCode = origin === "stored" ? "CORRUPT_STORED_DATA" : "INVALID_INPUT";
  const envelope = snapshotRecord(value, "snapshot", errorCode);
  assertKnownKeys(envelope, ENVELOPE_KEYS, errorCode);
  if (envelope.schemaVersion !== 1) {
    throw new RepositoryDataError(
      origin === "stored" ? "UNSUPPORTED_SCHEMA" : "INVALID_INPUT",
    );
  }
  const ownerScope = validateOwnerScope(envelope.ownerScope);
  if (ownerScope !== expectedOwnerScope) {
    throw new RepositoryDataError("OWNER_SCOPE_MISMATCH");
  }
  if (!Number.isSafeInteger(envelope.revision) || Number(envelope.revision) < 0) {
    throw new RepositoryDataError(errorCode);
  }
  const revision = envelope.revision as number;
  const reviews = snapshotArray(
    envelope.reviews,
    FISCAL_NOTIFICATION_SAFE_REVIEW_REPOSITORY_LIMITS.maxReviews,
    errorCode,
  );
  const seen = new Set<string>();
  const projected = reviews.map((reviewValue) => {
    const reviewRecord = snapshotRecord(reviewValue, "review", errorCode);
    assertKnownKeys(reviewRecord, REVIEW_KEYS, errorCode);
    const reviewOwner = validateOwnerScope(reviewRecord.ownerScope);
    if (reviewOwner !== ownerScope) {
      throw new RepositoryDataError("OWNER_SCOPE_MISMATCH");
    }
    const reviewId = validateReviewId(reviewRecord.reviewId);
    if (seen.has(reviewId)) throw new RepositoryDataError(errorCode);
    seen.add(reviewId);
    return freezeReview({
      reviewId,
      ownerScope: reviewOwner,
      createdAt: validateTimestamp(reviewRecord.createdAt),
      result: validateResult(reviewRecord.result, origin),
    });
  });
  if (revision !== projected.length) {
    throw new RepositoryDataError(errorCode);
  }
  return freezeSnapshot({
    schemaVersion: 1,
    ownerScope,
    revision,
    reviews: projected,
  });
}

function validateResult(
  value: unknown,
  origin: "input" | "stored",
): PersistedFiscalNotificationReviewResult {
  const errorCode = origin === "stored" ? "CORRUPT_STORED_DATA" : "INVALID_INPUT";
  const result = snapshotRecord(value, "result", errorCode);
  assertKnownKeys(result, RESULT_KEYS, errorCode);
  if (result.schemaVersion !== 1 || result.flowVersion !== "1.0.0") {
    throw new RepositoryDataError(
      origin === "stored" ? "UNSUPPORTED_SCHEMA" : "INVALID_INPUT",
    );
  }
  if (
    (result.status !== "REVIEW_REQUIRED" &&
      result.status !== "INFORMATION_PENDING") ||
    !REASONS.has(result.reason as FiscalNotificationLocalReviewReason) ||
    !Number.isSafeInteger(result.pageCount) ||
    Number(result.pageCount) < 1 ||
    Number(result.pageCount) >
      FISCAL_NOTIFICATION_SAFE_REVIEW_REPOSITORY_LIMITS.maxPages ||
    !Number.isSafeInteger(result.byteLength) ||
    Number(result.byteLength) < 1 ||
    Number(result.byteLength) >
      FISCAL_NOTIFICATION_SAFE_REVIEW_REPOSITORY_LIMITS.maxByteLength ||
    typeof result.sha256 !== "string" ||
    !SHA256.test(result.sha256) ||
    result.selectedFamilyId !== null ||
    result.providerCalled !== false ||
    result.requiresHumanReview !== true ||
    result.materializationPolicy !== "PROHIBITED_UNTIL_REVIEW" ||
    result.retainedSourceContent !== "NONE"
  ) {
    throw new RepositoryDataError(errorCode);
  }

  const candidates = snapshotArray(
    result.candidates,
    FISCAL_NOTIFICATION_SAFE_REVIEW_REPOSITORY_LIMITS.maxCandidates,
    errorCode,
  );
  const seenFamilies = new Set<string>();
  const projectedCandidates = candidates.map((candidateValue) => {
    const candidate = validateCandidate(
      candidateValue,
      result.pageCount as number,
      errorCode,
    );
    if (seenFamilies.has(candidate.familyId)) {
      throw new RepositoryDataError(errorCode);
    }
    seenFamilies.add(candidate.familyId);
    return candidate;
  });

  const ocrDisabled = result.reason === "OCR_DISABLED";
  if (
    ocrDisabled
      ? result.status !== "INFORMATION_PENDING" ||
        result.engineId !== null ||
        result.engineVersion !== null ||
        projectedCandidates.length !== 0
      : result.engineId !== "fiscal-notification-family-candidate-engine" ||
        result.engineVersion !== "1.0.0"
  ) {
    throw new RepositoryDataError(errorCode);
  }
  assertResultSemantics(
    result.status as PersistedFiscalNotificationReviewResult["status"],
    result.reason as FiscalNotificationLocalReviewReason,
    projectedCandidates,
    errorCode,
  );

  return freezeResult({
    schemaVersion: 1,
    flowVersion: "1.0.0",
    status: result.status,
    reason: result.reason as FiscalNotificationLocalReviewReason,
    engineId: result.engineId as PersistedFiscalNotificationReviewResult["engineId"],
    engineVersion:
      result.engineVersion as PersistedFiscalNotificationReviewResult["engineVersion"],
    pageCount: result.pageCount as number,
    byteLength: result.byteLength as number,
    sha256: result.sha256,
    candidates: projectedCandidates,
    selectedFamilyId: null,
    providerCalled: false,
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    retainedSourceContent: "NONE",
  });
}

function validateCandidate(
  value: unknown,
  pageCount: number,
  errorCode: "INVALID_INPUT" | "CORRUPT_STORED_DATA",
): PersistedFiscalNotificationReviewCandidate {
  const candidate = snapshotRecord(value, "candidate", errorCode);
  assertKnownKeys(candidate, CANDIDATE_KEYS, errorCode);
  const familyId = candidate.familyId;
  const enforcement = familyId === "AEAT_ENFORCEMENT_ORDER_CANDIDATE";
  const deferral = familyId === "AEAT_DEFERRAL_GRANT_CANDIDATE";
  if (
    (!enforcement && !deferral) ||
    candidate.documentType !==
      (enforcement
        ? "AEAT_ENFORCEMENT_ORDER"
        : "AEAT_INSTALLMENT_OR_DEFERRAL_GRANT") ||
    candidate.authoritySignal !== "AEAT_UNVERIFIED" ||
    candidate.handlerId !==
      (enforcement
        ? "aeat-enforcement-order-candidate"
        : "aeat-deferral-grant-candidate") ||
    candidate.handlerVersion !== "1.0.0" ||
    !SIGNAL_STATUSES.has(
      candidate.signalStatus as PersistedFiscalNotificationReviewCandidate["signalStatus"],
    ) ||
    candidate.requiresHumanReview !== true
  ) {
    throw new RepositoryDataError(errorCode);
  }

  const matchedValues = snapshotArray(
    candidate.matchedAnchors,
    FISCAL_NOTIFICATION_SAFE_REVIEW_REPOSITORY_LIMITS.maxAnchorsPerCandidate,
    errorCode,
  );
  const seenMatched = new Set<string>();
  const matchedAnchors = matchedValues.map((anchorValue) => {
    const anchor = snapshotRecord(anchorValue, "anchor", errorCode);
    assertKnownKeys(anchor, ANCHOR_KEYS, errorCode);
    const anchorId = validateAnchorId(anchor.anchorId, errorCode);
    if (seenMatched.has(anchorId)) throw new RepositoryDataError(errorCode);
    seenMatched.add(anchorId);
    const pageNumbers = validatePageNumbers(anchor.pageNumbers, pageCount, errorCode);
    if (pageNumbers.length === 0) throw new RepositoryDataError(errorCode);
    return Object.freeze({ anchorId, pageNumbers });
  });
  const missingRequiredAnchorIds = validateAnchorIdList(
    candidate.missingRequiredAnchorIds,
    errorCode,
  );
  const conflictingAnchorIds = validateAnchorIdList(
    candidate.conflictingAnchorIds,
    errorCode,
  );
  assertCandidateTrace(
    familyId as PersistedFiscalNotificationReviewCandidate["familyId"],
    candidate.signalStatus as PersistedFiscalNotificationReviewCandidate["signalStatus"],
    matchedAnchors,
    missingRequiredAnchorIds,
    conflictingAnchorIds,
    errorCode,
  );

  return Object.freeze({
    familyId: familyId as PersistedFiscalNotificationReviewCandidate["familyId"],
    documentType:
      candidate.documentType as PersistedFiscalNotificationReviewCandidate["documentType"],
    authoritySignal: "AEAT_UNVERIFIED",
    handlerId:
      candidate.handlerId as PersistedFiscalNotificationReviewCandidate["handlerId"],
    handlerVersion: "1.0.0",
    signalStatus:
      candidate.signalStatus as PersistedFiscalNotificationReviewCandidate["signalStatus"],
    matchedAnchors: Object.freeze(matchedAnchors),
    missingRequiredAnchorIds,
    conflictingAnchorIds,
    requiresHumanReview: true,
  });
}

function assertCandidateTrace(
  familyId: PersistedFiscalNotificationReviewCandidate["familyId"],
  signalStatus: PersistedFiscalNotificationReviewCandidate["signalStatus"],
  matchedAnchors: readonly PersistedFiscalNotificationReviewAnchor[],
  missingRequiredAnchorIds: readonly PersistedFiscalNotificationReviewAnchor["anchorId"][],
  conflictingAnchorIds: readonly PersistedFiscalNotificationReviewAnchor["anchorId"][],
  errorCode: "INVALID_INPUT" | "CORRUPT_STORED_DATA",
): void {
  const required =
    familyId === "AEAT_ENFORCEMENT_ORDER_CANDIDATE"
      ? ENFORCEMENT_REQUIRED_ANCHOR_IDS
      : DEFERRAL_REQUIRED_ANCHOR_IDS;
  const allowedMatched = new Set<PersistedFiscalNotificationReviewAnchor["anchorId"]>([
    ...required,
    "AEAT_AUTHORITY_LABEL",
    ...CONFLICTING_ANCHOR_IDS,
  ]);
  const matchedIds = new Set(matchedAnchors.map((anchor) => anchor.anchorId));
  const pagesByAnchor = new Map(
    matchedAnchors.map((anchor) => [anchor.anchorId, anchor.pageNumbers] as const),
  );
  const titleAnchor =
    familyId === "AEAT_ENFORCEMENT_ORDER_CANDIDATE"
      ? "ENFORCEMENT_ORDER_TITLE"
      : "DEFERRAL_GRANT_TITLE";
  if (!matchedIds.has(titleAnchor)) throw new RepositoryDataError(errorCode);
  const domainPages = pagesByAnchor.get("AEAT_OFFICIAL_DOMAIN_LABEL");
  if (domainPages && !sameNumberList(domainPages, [1])) {
    throw new RepositoryDataError(errorCode);
  }
  const structuralPages = pagesByAnchor.get("STRUCTURAL_FIRST_PAGE_HEADER");
  if (
    structuralPages &&
    (!sameNumberList(structuralPages, [1]) ||
      !domainPages?.includes(1) ||
      !pagesByAnchor.get(titleAnchor)?.includes(1))
  ) {
    throw new RepositoryDataError(errorCode);
  }
  if (matchedAnchors.some((anchor) => !allowedMatched.has(anchor.anchorId))) {
    throw new RepositoryDataError(errorCode);
  }
  const expectedMissing = required.filter((anchorId) => !matchedIds.has(anchorId));
  if (!sameStringSet(expectedMissing, missingRequiredAnchorIds)) {
    throw new RepositoryDataError(errorCode);
  }
  const expectedConflicts = [...matchedIds].filter((anchorId) =>
    CONFLICTING_ANCHOR_IDS.has(anchorId),
  );
  if (!sameStringSet(expectedConflicts, conflictingAnchorIds)) {
    throw new RepositoryDataError(errorCode);
  }
  const expectedSignal = conflictingAnchorIds.includes(
    "CONFLICTING_NON_DOCUMENT_GUIDE",
  )
    ? "CONFLICTING_DOCUMENT_SIGNAL"
    : conflictingAnchorIds.length > 0
      ? "CONFLICTING_AUTHORITY_OR_TERRITORY"
      : missingRequiredAnchorIds.length === 0
        ? "COMPLETE_REQUIRED_ANCHORS"
        : "INCOMPLETE_REQUIRED_ANCHORS";
  if (signalStatus !== expectedSignal) {
    throw new RepositoryDataError(errorCode);
  }
}

function sameStringSet(
  left: readonly string[],
  right: readonly string[],
): boolean {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((value) => rightSet.has(value));
}

function sameNumberList(left: readonly number[], right: readonly number[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function assertResultSemantics(
  status: PersistedFiscalNotificationReviewResult["status"],
  reason: FiscalNotificationLocalReviewReason,
  candidates: readonly PersistedFiscalNotificationReviewCandidate[],
  errorCode: "INVALID_INPUT" | "CORRUPT_STORED_DATA",
): void {
  if (reason === "OCR_DISABLED") {
    if (status !== "INFORMATION_PENDING" || candidates.length !== 0) {
      throw new RepositoryDataError(errorCode);
    }
    return;
  }
  if (reason === "SUPPORTED_FAMILY_CANDIDATE") {
    if (
      status !== "REVIEW_REQUIRED" ||
      candidates.length !== 1 ||
      candidates[0]?.signalStatus !== "COMPLETE_REQUIRED_ANCHORS"
    ) {
      throw new RepositoryDataError(errorCode);
    }
    return;
  }
  if (reason === "PARTIAL_SUPPORTED_FAMILY_SIGNAL") {
    if (
      status !== "INFORMATION_PENDING" ||
      candidates.length !== 1 ||
      candidates[0]?.signalStatus !== "INCOMPLETE_REQUIRED_ANCHORS"
    ) {
      throw new RepositoryDataError(errorCode);
    }
    return;
  }
  if (reason === "AMBIGUOUS_SUPPORTED_FAMILIES") {
    if (
      status !== "REVIEW_REQUIRED" ||
      candidates.length !== 2 ||
      candidates.some((candidate) =>
        candidate.signalStatus.startsWith("CONFLICTING_"),
      )
    ) {
      throw new RepositoryDataError(errorCode);
    }
    return;
  }
  if (
    reason === "CONFLICTING_AUTHORITY_OR_TERRITORY" ||
    reason === "CONFLICTING_DOCUMENT_SIGNAL"
  ) {
    const expectedSignal =
      reason === "CONFLICTING_DOCUMENT_SIGNAL"
        ? "CONFLICTING_DOCUMENT_SIGNAL"
        : "CONFLICTING_AUTHORITY_OR_TERRITORY";
    if (
      status !== "REVIEW_REQUIRED" ||
      candidates.length === 0 ||
      !candidates.every((candidate) => candidate.signalStatus === expectedSignal)
    ) {
      throw new RepositoryDataError(errorCode);
    }
    return;
  }
  if (EMPTY_INFORMATION_REASONS.has(reason)) {
    if (status !== "INFORMATION_PENDING" || candidates.length !== 0) {
      throw new RepositoryDataError(errorCode);
    }
    return;
  }
  if (EMPTY_REVIEW_REASONS.has(reason)) {
    if (status !== "REVIEW_REQUIRED" || candidates.length !== 0) {
      throw new RepositoryDataError(errorCode);
    }
    return;
  }
  throw new RepositoryDataError(errorCode);
}

function validateAnchorIdList(
  value: unknown,
  errorCode: "INVALID_INPUT" | "CORRUPT_STORED_DATA",
): readonly PersistedFiscalNotificationReviewAnchor["anchorId"][] {
  const items = snapshotArray(
    value,
    FISCAL_NOTIFICATION_SAFE_REVIEW_REPOSITORY_LIMITS.maxAnchorsPerCandidate,
    errorCode,
  );
  const seen = new Set<string>();
  const output = items.map((item) => {
    const anchorId = validateAnchorId(item, errorCode);
    if (seen.has(anchorId)) throw new RepositoryDataError(errorCode);
    seen.add(anchorId);
    return anchorId;
  });
  return Object.freeze(output);
}

function validateAnchorId(
  value: unknown,
  errorCode: "INVALID_INPUT" | "CORRUPT_STORED_DATA",
): PersistedFiscalNotificationReviewAnchor["anchorId"] {
  if (!ANCHOR_IDS.has(value as PersistedFiscalNotificationReviewAnchor["anchorId"])) {
    throw new RepositoryDataError(errorCode);
  }
  return value as PersistedFiscalNotificationReviewAnchor["anchorId"];
}

function validatePageNumbers(
  value: unknown,
  pageCount: number,
  errorCode: "INVALID_INPUT" | "CORRUPT_STORED_DATA",
): readonly number[] {
  const values = snapshotArray(value, pageCount, errorCode);
  let previous = 0;
  const pages = values.map((page) => {
    if (
      !Number.isSafeInteger(page) ||
      Number(page) < 1 ||
      Number(page) > pageCount ||
      Number(page) <= previous
    ) {
      throw new RepositoryDataError(errorCode);
    }
    previous = Number(page);
    return Number(page);
  });
  return Object.freeze(pages);
}

function validateOwnerScope(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length >
      FISCAL_NOTIFICATION_SAFE_REVIEW_REPOSITORY_LIMITS.maxOwnerScopeCharacters ||
    !CANONICAL_OWNER_SCOPE.test(value) ||
    CONTROL_CHARACTERS.test(value)
  ) {
    throw new RepositoryDataError("INVALID_INPUT");
  }
  return value;
}

function validateId(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length >
      FISCAL_NOTIFICATION_SAFE_REVIEW_REPOSITORY_LIMITS.maxIdCharacters ||
    value.trim() !== value ||
    CONTROL_CHARACTERS.test(value)
  ) {
    throw new RepositoryDataError("INVALID_INPUT");
  }
  return value;
}

function validateReviewId(value: unknown): string {
  const id = validateId(value);
  if (!CANONICAL_REVIEW_ID.test(id)) {
    throw new RepositoryDataError("INVALID_INPUT");
  }
  return id;
}

function validateTimestamp(value: unknown): string {
  if (
    typeof value !== "string" ||
    !ISO_TIMESTAMP.test(value) ||
    new Date(value).toISOString() !== value
  ) {
    throw new RepositoryDataError("INVALID_INPUT");
  }
  return value;
}

function snapshotRecord(
  value: unknown,
  _path: string,
  errorCode: "INVALID_INPUT" | "CORRUPT_STORED_DATA",
): Record<string, unknown> {
  try {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      (Object.getPrototypeOf(value) !== Object.prototype &&
        Object.getPrototypeOf(value) !== null)
    ) {
      throw new RepositoryDataError(errorCode);
    }
    const output: Record<string, unknown> = Object.create(null);
    const keys = Reflect.ownKeys(value);
    if (keys.length > 32) throw new RepositoryDataError(errorCode);
    for (const key of keys) {
      if (typeof key !== "string") throw new RepositoryDataError(errorCode);
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor)) {
        throw new RepositoryDataError(errorCode);
      }
      output[key] = descriptor.value;
    }
    return output;
  } catch (error) {
    if (error instanceof RepositoryDataError) throw error;
    throw new RepositoryDataError(errorCode);
  }
}

function snapshotArray(
  value: unknown,
  max: number,
  errorCode: "INVALID_INPUT" | "CORRUPT_STORED_DATA",
): readonly unknown[] {
  try {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
      throw new RepositoryDataError(errorCode);
    }
    const length = value.length;
    if (!Number.isSafeInteger(length) || length < 0 || length > max) {
      throw new RepositoryDataError(errorCode);
    }
    const keys = Reflect.ownKeys(value);
    if (keys.length !== length + 1 || !keys.includes("length")) {
      throw new RepositoryDataError(errorCode);
    }
    const output: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      const key = String(index);
      if (!keys.includes(key)) throw new RepositoryDataError(errorCode);
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor)) {
        throw new RepositoryDataError(errorCode);
      }
      output.push(descriptor.value);
    }
    return output;
  } catch (error) {
    if (error instanceof RepositoryDataError) throw error;
    throw new RepositoryDataError(errorCode);
  }
}

function assertKnownKeys(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  errorCode: "INVALID_INPUT" | "CORRUPT_STORED_DATA",
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new RepositoryDataError(errorCode);
  }
  if (Object.keys(value).length !== allowed.size) {
    throw new RepositoryDataError(errorCode);
  }
}

function freezeResult(
  value: PersistedFiscalNotificationReviewResult,
): PersistedFiscalNotificationReviewResult {
  return Object.freeze({ ...value, candidates: Object.freeze([...value.candidates]) });
}

function freezeReview(
  value: PersistedFiscalNotificationReview,
): PersistedFiscalNotificationReview {
  return Object.freeze({ ...value, result: freezeResult(value.result) });
}

function freezeSnapshot(
  value: FiscalNotificationReviewSnapshot,
): FiscalNotificationReviewSnapshot {
  return Object.freeze({
    ...value,
    reviews: Object.freeze(value.reviews.map((review) => freezeReview(review))),
  });
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(value);
}

function storageKey(ownerScope: string): string {
  return `${FISCAL_NOTIFICATION_SAFE_REVIEW_STORAGE_KEY_PREFIX}${ownerScope}`;
}

function storageWriteFailureReason(
  error: unknown,
): "QUOTA_EXCEEDED" | "STORAGE_UNAVAILABLE" | "WRITE_FAILED" {
  try {
    const candidate = error as { name?: unknown; code?: unknown } | null;
    const name = candidate ? String(candidate.name ?? "") : "";
    const code = candidate ? Number(candidate.code) : Number.NaN;
    if (
      name === "QuotaExceededError" ||
      name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      code === 22 ||
      code === 1014
    ) {
      return "QUOTA_EXCEEDED";
    }
    if (name === "SecurityError" || code === 18) {
      return "STORAGE_UNAVAILABLE";
    }
  } catch {
    return "WRITE_FAILED";
  }
  return "WRITE_FAILED";
}

function restoreRaw(
  storage: FiscalNotificationReviewStorageLike,
  key: string,
  beforeRaw: string | null,
  attemptedRaw: string,
): boolean {
  try {
    const current = storage.getItem(key);
    if (current === beforeRaw) return true;
    if (current !== attemptedRaw) return false;
    if (beforeRaw === null) storage.removeItem(key);
    else storage.setItem(key, beforeRaw);
    return storage.getItem(key) === beforeRaw;
  } catch {
    return false;
  }
}

function frozenBlockedLoad(
  reason: FiscalNotificationReviewLoadBlockedReason,
): FiscalNotificationReviewLoadResult {
  return Object.freeze({ status: "blocked", reason });
}

function frozenBlockedWrite(
  reason: FiscalNotificationReviewWriteBlockedReason,
): FiscalNotificationReviewWriteResult {
  return Object.freeze({ status: "blocked", reason });
}

function frozenIndeterminate(): FiscalNotificationReviewWriteResult {
  return Object.freeze({
    status: "indeterminate",
    reason: "STORAGE_STATE_UNKNOWN",
  });
}
