import {
  FiscalNotificationInputError,
  assertBoundedId,
  assertBoundedOwnerScope,
  assertNotAborted,
} from "./input-contract";

export const FISCAL_NOTIFICATION_OCR_SCHEMA_VERSION = 1 as const;
export const FISCAL_NOTIFICATION_OCR_PORT_VERSION = "1.0.0" as const;
export const MAX_FISCAL_NOTIFICATION_OCR_METADATA_BYTES = 4 * 1024 * 1024;

export type FiscalNotificationOcrMimeType =
  | "application/pdf"
  | "image/png"
  | "image/jpeg";

export interface FiscalNotificationOcrRequestMetadata {
  readonly schemaVersion: 1;
  readonly ownerScope: string;
  readonly documentId: string;
  readonly mimeType: FiscalNotificationOcrMimeType;
  readonly byteLength: number;
  readonly sha256: string;
  readonly signal?: AbortSignal;
}

export interface FiscalNotificationOcrUnavailableOutcome {
  readonly schemaVersion: 1;
  readonly portVersion: "1.0.0";
  readonly status: "INFORMATION_PENDING";
  readonly reason: "OCR_DISABLED";
  readonly documentInput: null;
  readonly providerCalled: false;
  readonly executionBoundary: "NONE";
  readonly retainedSourceContent: "NONE";
  readonly requiresHumanReview: true;
  readonly materializationPolicy: "PROHIBITED_UNTIL_REVIEW";
}

export interface FiscalNotificationOcrPort {
  recognize(
    metadata: unknown,
  ): Promise<FiscalNotificationOcrUnavailableOutcome>;
}

const REQUEST_KEYS = new Set([
  "schemaVersion",
  "ownerScope",
  "documentId",
  "mimeType",
  "byteLength",
  "sha256",
  "signal",
]);
const MIME_TYPES = new Set<FiscalNotificationOcrMimeType>([
  "application/pdf",
  "image/png",
  "image/jpeg",
]);
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

const DISABLED_OUTCOME: FiscalNotificationOcrUnavailableOutcome = Object.freeze({
  schemaVersion: FISCAL_NOTIFICATION_OCR_SCHEMA_VERSION,
  portVersion: FISCAL_NOTIFICATION_OCR_PORT_VERSION,
  status: "INFORMATION_PENDING",
  reason: "OCR_DISABLED",
  documentInput: null,
  providerCalled: false,
  executionBoundary: "NONE",
  retainedSourceContent: "NONE",
  requiresHumanReview: true,
  materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
});

export const DISABLED_FISCAL_NOTIFICATION_OCR_PORT: FiscalNotificationOcrPort =
  Object.freeze({
    async recognize(
      value: unknown,
    ): Promise<FiscalNotificationOcrUnavailableOutcome> {
      const metadata = snapshotRecord(value);
      if (!metadata) invalid("$");
      for (const key of Reflect.ownKeys(metadata)) {
        if (typeof key !== "string" || !REQUEST_KEYS.has(key)) invalid("$.$unknown");
      }
      if (metadata.schemaVersion !== FISCAL_NOTIFICATION_OCR_SCHEMA_VERSION) {
        invalid("schemaVersion");
      }
      assertBoundedOwnerScope(metadata.ownerScope, "ownerScope");
      assertBoundedId(metadata.documentId, "documentId");
      if (!MIME_TYPES.has(metadata.mimeType as FiscalNotificationOcrMimeType)) {
        invalid("mimeType");
      }
      if (
        !Number.isSafeInteger(metadata.byteLength) ||
        Number(metadata.byteLength) <= 0 ||
        Number(metadata.byteLength) > MAX_FISCAL_NOTIFICATION_OCR_METADATA_BYTES
      ) {
        invalid("byteLength");
      }
      if (
        typeof metadata.sha256 !== "string" ||
        !SHA256_PATTERN.test(metadata.sha256)
      ) {
        invalid("sha256");
      }
      if (metadata.signal !== undefined && !isAbortSignal(metadata.signal)) {
        invalid("signal");
      }
      assertNotAborted(metadata.signal as AbortSignal | undefined);
      return DISABLED_OUTCOME;
    },
  });

function invalid(path: string): never {
  throw new FiscalNotificationInputError("INVALID_INPUT", path);
}

function snapshotRecord(value: unknown): Record<string, unknown> | null {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const snapshot: Record<string, unknown> = Object.create(null);
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") return null;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor)) return null;
      snapshot[key] = descriptor.value;
    }
    return snapshot;
  } catch {
    return null;
  }
}

function isAbortSignal(value: unknown): value is AbortSignal {
  try {
    return typeof AbortSignal !== "undefined" && value instanceof AbortSignal;
  } catch {
    return false;
  }
}
