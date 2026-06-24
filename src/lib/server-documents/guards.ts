import { ServerDocumentError } from "./errors";
import type {
  JsonValue,
  ServerDocumentConflictReason,
  ServerDocumentMutationInput,
  ServerDocumentRecord,
} from "./types";

function hasOwn<T extends object, K extends PropertyKey>(
  value: T,
  key: K,
): value is T & Record<K, unknown> {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function stableStringify(value: JsonValue | undefined): string {
  if (value === undefined) return "undefined";
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(",")}}`;
}

function jsonEquals(a: JsonValue | undefined, b: JsonValue | undefined): boolean {
  return stableStringify(a) === stableStringify(b);
}

function nullableStringEquals(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  return (a ?? null) === (b ?? null);
}

function assertValidExpectedVersion(expectedVersion: number | undefined): void {
  if (!Number.isInteger(expectedVersion) || (expectedVersion ?? 0) < 1) {
    throw new ServerDocumentError("MISSING_EXPECTED_VERSION");
  }
}

export function isServerDocumentLocked(document: ServerDocumentRecord): boolean {
  return (
    document.integrityLock === "locked" ||
    document.documentLifecycle !== "draft"
  );
}

export function isServerDocumentDraft(document: ServerDocumentRecord): boolean {
  return document.documentLifecycle === "draft";
}

export function assertExpectedVersion(
  document: ServerDocumentRecord,
  expectedVersion: number | undefined,
): void {
  assertValidExpectedVersion(expectedVersion);
  if (document.version !== expectedVersion) {
    throw new ServerDocumentError("VERSION_MISMATCH");
  }
}

export function detectForbiddenLifecycleDowngrade(
  current: ServerDocumentRecord,
  incoming: ServerDocumentMutationInput,
): boolean {
  if (!incoming.documentLifecycle) return false;
  return current.documentLifecycle !== "draft" && incoming.documentLifecycle === "draft";
}

export function detectProtectedSnapshotMutation(
  current: ServerDocumentRecord,
  incoming: ServerDocumentMutationInput,
): boolean {
  if (!isServerDocumentLocked(current)) return false;

  if (
    hasOwn(incoming, "documentSnapshot") &&
    !jsonEquals(
      incoming.documentSnapshot ?? undefined,
      current.documentSnapshot ?? undefined,
    )
  ) {
    return true;
  }

  if (
    hasOwn(incoming, "pdfSnapshot") &&
    !jsonEquals(incoming.pdfSnapshot ?? undefined, current.pdfSnapshot ?? undefined)
  ) {
    return true;
  }

  if (
    hasOwn(incoming, "snapshotHash") &&
    !nullableStringEquals(incoming.snapshotHash, current.snapshotHash)
  ) {
    return true;
  }

  if (
    hasOwn(incoming, "pdfContentHash") &&
    !nullableStringEquals(incoming.pdfContentHash, current.pdfContentHash)
  ) {
    return true;
  }

  return false;
}

export function buildDocumentConflictReason(
  current: ServerDocumentRecord,
  incoming: ServerDocumentMutationInput,
): ServerDocumentConflictReason | null {
  if (detectProtectedSnapshotMutation(current, incoming)) {
    return "snapshot_mutation";
  }

  if (detectForbiddenLifecycleDowngrade(current, incoming)) {
    return "forbidden_lifecycle_transition";
  }

  if (
    hasOwn(incoming, "integrityLock") &&
    current.integrityLock === "locked" &&
    incoming.integrityLock === "unlocked"
  ) {
    return "locked_document";
  }

  if (isServerDocumentLocked(current)) {
    return "locked_document";
  }

  try {
    assertExpectedVersion(current, incoming.expectedVersion);
  } catch (error) {
    if (error instanceof ServerDocumentError) return error.reason;
    throw error;
  }

  return null;
}

export function shouldCreateDocumentConflict(
  current: ServerDocumentRecord,
  incoming: ServerDocumentMutationInput,
): boolean {
  const reason = buildDocumentConflictReason(current, incoming);
  return reason !== null && reason !== "missing_expected_version";
}

export function canMutateServerDocument(
  document: ServerDocumentRecord,
  expectedVersion: number | undefined,
): boolean {
  assertExpectedVersion(document, expectedVersion);
  if (isServerDocumentLocked(document)) {
    throw new ServerDocumentError("DOCUMENT_LOCKED");
  }
  return true;
}
