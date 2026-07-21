import {
  DOCUMENT_READING_SCHEMA_VERSION_V1,
  DocumentReadingErrorV1,
  type DocumentReadingErrorCodeV1,
} from "@/lib/document-reading/contracts.v1";
import { DOCUMENT_READING_LIMITS_V1 } from "@/lib/document-reading/limits.v1";
import { readExpensePdfTextLayerThroughFiscalCompatV1 } from "./fiscal-text-layer-compat.v1";

interface ExpenseDocumentReaderWorkerScope {
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  postMessage(message: unknown): void;
}

const REQUEST_KEYS = new Set([
  "type",
  "schemaVersion",
  "requestId",
  "ownerScope",
  "documentId",
  "sourceSha256",
  "byteLength",
  "bytes",
]);
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const UNSUPPORTED_IDENTIFIER_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/u;
const workerScope = globalThis as unknown as ExpenseDocumentReaderWorkerScope;

workerScope.onmessage = (event: MessageEvent<unknown>) => {
  void processMessage(event.data);
};

async function processMessage(value: unknown): Promise<void> {
  let identity: Readonly<{
    requestId: string;
    documentId: string;
    sourceSha256: string;
  }> | null = null;
  try {
    const request = snapshotRecord(value);
    if (!request || !hasOnlyKeys(request, REQUEST_KEYS)) invalid();
    if (
      request.type !== "READ_PDF_TEXT_LAYER" ||
      request.schemaVersion !== DOCUMENT_READING_SCHEMA_VERSION_V1 ||
      !isBoundedIdentifier(request.requestId) ||
      !isBoundedIdentifier(request.ownerScope) ||
      !isBoundedIdentifier(request.documentId) ||
      typeof request.sourceSha256 !== "string" ||
      !SHA256_PATTERN.test(request.sourceSha256) ||
      !Number.isSafeInteger(request.byteLength) ||
      Number(request.byteLength) <= 0 ||
      Number(request.byteLength) > DOCUMENT_READING_LIMITS_V1.maxPdfBytes ||
      !(request.bytes instanceof ArrayBuffer) ||
      request.bytes.byteLength !== request.byteLength
    ) {
      invalid();
    }
    identity = Object.freeze({
      requestId: request.requestId,
      documentId: request.documentId,
      sourceSha256: request.sourceSha256,
    });
    const content = await readExpensePdfTextLayerThroughFiscalCompatV1({
      ownerScope: request.ownerScope,
      documentId: request.documentId,
      bytes: new Uint8Array(request.bytes),
    });
    const hasText = content.pages.some((page) => !page.isBlank);
    workerScope.postMessage({
      type: "RESULT",
      schemaVersion: DOCUMENT_READING_SCHEMA_VERSION_V1,
      requestId: identity.requestId,
      documentId: identity.documentId,
      sourceSha256: identity.sourceSha256,
      status: hasText ? "TEXT_LAYER_AVAILABLE" : "NO_EXTRACTABLE_TEXT",
      pageCount: content.pages.length,
      pages: content.pages,
    });
  } catch (error) {
    workerScope.postMessage({
      type: "ERROR",
      schemaVersion: DOCUMENT_READING_SCHEMA_VERSION_V1,
      requestId: identity?.requestId ?? null,
      documentId: identity?.documentId ?? null,
      sourceSha256: identity?.sourceSha256 ?? null,
      code: safeErrorCode(error),
    });
  }
}

function safeErrorCode(error: unknown): DocumentReadingErrorCodeV1 {
  return error instanceof DocumentReadingErrorV1 ? error.code : "INVALID_PDF";
}

function invalid(): never {
  throw new DocumentReadingErrorV1("INVALID_INPUT");
}

function isBoundedIdentifier(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= DOCUMENT_READING_LIMITS_V1.maxIdentifierChars &&
    !UNSUPPORTED_IDENTIFIER_CHARACTERS.test(value)
  );
}

function snapshotRecord(value: unknown): Record<string, unknown> | null {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const result: Record<string, unknown> = Object.create(null);
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") return null;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor)) return null;
      result[key] = descriptor.value;
    }
    return result;
  } catch {
    return null;
  }
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
): boolean {
  return Reflect.ownKeys(value).every(
    (key) => typeof key === "string" && allowed.has(key),
  );
}
