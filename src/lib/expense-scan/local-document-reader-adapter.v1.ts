"use client";

import {
  createAbstainedDocumentReadingOutcomeV1,
  createReadableDocumentReadingOutcomeV1,
  DocumentReadingErrorV1,
  DOCUMENT_READING_SCHEMA_VERSION_V1,
  parseDocumentReadingPagesV1,
  type DocumentReadingErrorCodeV1,
  type DocumentReadingOutcomeV1,
  type DocumentReadingSourceV1,
} from "@/lib/document-reading/contracts.v1";
import {
  readBrowserPdfFileIntegrityV1,
  type BrowserPdfFileIntegrityDependenciesV1,
} from "@/lib/document-reading/browser-file-integrity.v1";
import { DOCUMENT_READING_LIMITS_V1 } from "@/lib/document-reading/limits.v1";

export interface ExpenseLocalDocumentReaderRequestV1 {
  readonly ownerScope: string;
  readonly operationId: string;
  readonly documentId: string;
  readonly file: File;
  readonly signal?: AbortSignal;
}

export interface ExpenseLocalDocumentReaderWorkerLikeV1 {
  postMessage(message: unknown, transfer: Transferable[]): void;
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<unknown>) => void,
  ): void;
  addEventListener(type: "error", listener: (event: Event) => void): void;
  removeEventListener(
    type: "message",
    listener: (event: MessageEvent<unknown>) => void,
  ): void;
  removeEventListener(type: "error", listener: (event: Event) => void): void;
  terminate(): void;
}

export interface ExpenseLocalDocumentReaderDependenciesV1
  extends BrowserPdfFileIntegrityDependenciesV1 {
  readonly createWorker?: () => ExpenseLocalDocumentReaderWorkerLikeV1;
  readonly timeoutMs?: number;
}

const REQUEST_KEYS = new Set([
  "ownerScope",
  "operationId",
  "documentId",
  "file",
  "signal",
]);
const RESULT_KEYS = new Set([
  "type",
  "schemaVersion",
  "requestId",
  "documentId",
  "sourceSha256",
  "status",
  "pageCount",
  "pages",
]);
const ERROR_KEYS = new Set([
  "type",
  "schemaVersion",
  "requestId",
  "documentId",
  "sourceSha256",
  "code",
]);
const PDFJS_READY_KEYS = new Set([
  "sourceName",
  "targetName",
  "action",
  "data",
]);
const ERROR_CODES = new Set<DocumentReadingErrorCodeV1>([
  "INVALID_INPUT",
  "UNSUPPORTED_MIME",
  "EMPTY_FILE",
  "FILE_TOO_LARGE",
  "INVALID_PDF",
  "TOO_MANY_PAGES",
  "TOO_MANY_TEXT_ITEMS",
  "TEXT_ITEM_TOO_LARGE",
  "TEXT_TOO_LARGE",
  "TIMEOUT",
  "ABORTED",
  "WORKER_UNAVAILABLE",
  "INVALID_WORKER_RESPONSE",
  "HASH_UNAVAILABLE",
]);
const UNSUPPORTED_IDENTIFIER_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/u;

export async function readExpenseDocumentLocallyV1(
  value: unknown,
  dependencies: ExpenseLocalDocumentReaderDependenciesV1 = {},
): Promise<DocumentReadingOutcomeV1> {
  let source: DocumentReadingSourceV1 | null = null;
  let worker: ExpenseLocalDocumentReaderWorkerLikeV1 | null = null;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let timedOut = false;
  let callerAbortListenerRegistered = false;
  const operationController = new AbortController();
  const abortFromCaller = () => operationController.abort();

  try {
    const request = parseRequest(value);
    const timeoutMs = dependencies.timeoutMs ?? DOCUMENT_READING_LIMITS_V1.timeoutMs;
    if (
      !Number.isSafeInteger(timeoutMs) ||
      timeoutMs <= 0 ||
      timeoutMs > DOCUMENT_READING_LIMITS_V1.timeoutMs
    ) {
      throw new DocumentReadingErrorV1("TIMEOUT");
    }
    if (request.signal) {
      request.signal.addEventListener("abort", abortFromCaller, { once: true });
      callerAbortListenerRegistered = true;
      if (request.signal.aborted) operationController.abort();
    }
    timeout = setTimeout(() => {
      timedOut = true;
      operationController.abort();
    }, timeoutMs);

    const integrity = await readBrowserPdfFileIntegrityV1(
      { file: request.file, signal: operationController.signal },
      { digestSha256: dependencies.digestSha256 },
    );
    source = integrity.source;
    assertActive(operationController.signal);
    worker = createWorker(dependencies.createWorker);
    const workerResult = await awaitWorkerResult(
      worker,
      integrity.bytes,
      request,
      source,
      operationController.signal,
    );
    const pages = parseDocumentReadingPagesV1(workerResult.pages);
    if (
      workerResult.pageCount !== pages.length ||
      (workerResult.status === "TEXT_LAYER_AVAILABLE") !==
        pages.some((page) => !page.isBlank)
    ) {
      throw new DocumentReadingErrorV1("INVALID_WORKER_RESPONSE");
    }
    if (workerResult.status === "NO_EXTRACTABLE_TEXT") {
      return createAbstainedDocumentReadingOutcomeV1({
        reason: "OCR_REQUIRED",
        source,
        pageCount: pages.length,
      });
    }
    return createReadableDocumentReadingOutcomeV1({ source, pages });
  } catch (error) {
    const code =
      operationController.signal.aborted
        ? timedOut
          ? "TIMEOUT"
          : "ABORTED"
        : error instanceof DocumentReadingErrorV1
          ? error.code
          : "INVALID_PDF";
    return createAbstainedDocumentReadingOutcomeV1({
      reason: code,
      ...(source ? { source } : {}),
    });
  } finally {
    if (timeout !== null) clearTimeout(timeout);
    if (callerAbortListenerRegistered) {
      try {
        const requestSignal = readSignal(value);
        requestSignal?.removeEventListener("abort", abortFromCaller);
      } catch {
        // The operation is already closed; no source content is retained.
      }
    }
    try {
      worker?.terminate();
    } catch {
      // Worker termination is best-effort after the result has settled.
    }
  }
}

function parseRequest(value: unknown): ExpenseLocalDocumentReaderRequestV1 {
  const request = snapshotRecord(value);
  if (!request || !hasOnlyKeys(request, REQUEST_KEYS)) invalid("INVALID_INPUT");
  if (
    !isBoundedIdentifier(request.ownerScope) ||
    !isBoundedIdentifier(request.operationId) ||
    !isBoundedIdentifier(request.documentId) ||
    !isFile(request.file) ||
    (request.signal !== undefined && !isAbortSignal(request.signal))
  ) {
    invalid("INVALID_INPUT");
  }
  return Object.freeze({
    ownerScope: request.ownerScope,
    operationId: request.operationId,
    documentId: request.documentId,
    file: request.file,
    ...(request.signal ? { signal: request.signal as AbortSignal } : {}),
  });
}

function readSignal(value: unknown): AbortSignal | undefined {
  const request = snapshotRecord(value);
  return request && isAbortSignal(request.signal) ? request.signal : undefined;
}

function createWorker(
  injected?: () => ExpenseLocalDocumentReaderWorkerLikeV1,
): ExpenseLocalDocumentReaderWorkerLikeV1 {
  try {
    if (injected) return injected();
    if (typeof Worker === "undefined") invalid("WORKER_UNAVAILABLE");
    return new Worker(new URL("./local-document-reader.worker.ts", import.meta.url), {
      type: "module",
    });
  } catch (error) {
    if (error instanceof DocumentReadingErrorV1) throw error;
    invalid("WORKER_UNAVAILABLE");
  }
}

interface WorkerResultV1 {
  readonly status: "TEXT_LAYER_AVAILABLE" | "NO_EXTRACTABLE_TEXT";
  readonly pageCount: number;
  readonly pages: unknown;
}

function awaitWorkerResult(
  worker: ExpenseLocalDocumentReaderWorkerLikeV1,
  bytes: ArrayBuffer,
  request: ExpenseLocalDocumentReaderRequestV1,
  source: DocumentReadingSourceV1,
  signal: AbortSignal,
): Promise<WorkerResultV1> {
  assertActive(signal);
  return new Promise<WorkerResultV1>((resolve, reject) => {
    let settled = false;
    let pdfJsReadySeen = false;
    const finish = (action: () => void) => {
      if (settled) return;
      settled = true;
      safeRemoveWorkerListener(worker, "message", onMessage);
      safeRemoveWorkerListener(worker, "error", onError);
      signal.removeEventListener("abort", onAbort);
      action();
    };
    const onMessage = (event: MessageEvent<unknown>) => {
      try {
        const message = snapshotRecord(event.data);
        if (message && isExactPdfJsReadyEnvelope(message)) {
          if (pdfJsReadySeen) invalid("INVALID_WORKER_RESPONSE");
          pdfJsReadySeen = true;
          return;
        }
        if (
          !message ||
          message.schemaVersion !== DOCUMENT_READING_SCHEMA_VERSION_V1 ||
          message.requestId !== request.operationId ||
          message.documentId !== request.documentId ||
          message.sourceSha256 !== source.sha256
        ) {
          invalid("INVALID_WORKER_RESPONSE");
        }
        if (message.type === "RESULT") {
          if (
            !hasOnlyKeys(message, RESULT_KEYS) ||
            (message.status !== "TEXT_LAYER_AVAILABLE" &&
              message.status !== "NO_EXTRACTABLE_TEXT") ||
            !Number.isSafeInteger(message.pageCount)
          ) {
            invalid("INVALID_WORKER_RESPONSE");
          }
          finish(() =>
            resolve({
              status: message.status as WorkerResultV1["status"],
              pageCount: Number(message.pageCount),
              pages: message.pages,
            }),
          );
          return;
        }
        if (message.type === "ERROR") {
          if (
            !hasOnlyKeys(message, ERROR_KEYS) ||
            !ERROR_CODES.has(message.code as DocumentReadingErrorCodeV1)
          ) {
            invalid("INVALID_WORKER_RESPONSE");
          }
          finish(() =>
            reject(
              new DocumentReadingErrorV1(
                message.code as DocumentReadingErrorCodeV1,
              ),
            ),
          );
          return;
        }
        invalid("INVALID_WORKER_RESPONSE");
      } catch (error) {
        finish(() =>
          reject(
            error instanceof DocumentReadingErrorV1
              ? error
              : new DocumentReadingErrorV1("INVALID_WORKER_RESPONSE"),
          ),
        );
      }
    };
    const onError = () =>
      finish(() => reject(new DocumentReadingErrorV1("INVALID_PDF")));
    const onAbort = () =>
      finish(() => reject(new DocumentReadingErrorV1("ABORTED")));
    try {
      worker.addEventListener("message", onMessage);
      worker.addEventListener("error", onError);
      signal.addEventListener("abort", onAbort, { once: true });
      worker.postMessage(
        {
          type: "READ_PDF_TEXT_LAYER",
          schemaVersion: DOCUMENT_READING_SCHEMA_VERSION_V1,
          requestId: request.operationId,
          ownerScope: request.ownerScope,
          documentId: request.documentId,
          sourceSha256: source.sha256,
          byteLength: source.byteLength,
          bytes,
        },
        [bytes],
      );
    } catch {
      finish(() => reject(new DocumentReadingErrorV1("WORKER_UNAVAILABLE")));
    }
  });
}

function isExactPdfJsReadyEnvelope(message: Record<string, unknown>): boolean {
  return (
    hasOnlyKeys(message, PDFJS_READY_KEYS) &&
    Reflect.ownKeys(message).length === PDFJS_READY_KEYS.size &&
    message.sourceName === "worker" &&
    message.targetName === "main" &&
    message.action === "ready" &&
    message.data === null
  );
}

function safeRemoveWorkerListener(
  worker: ExpenseLocalDocumentReaderWorkerLikeV1,
  type: "message",
  listener: (event: MessageEvent<unknown>) => void,
): void;
function safeRemoveWorkerListener(
  worker: ExpenseLocalDocumentReaderWorkerLikeV1,
  type: "error",
  listener: (event: Event) => void,
): void;
function safeRemoveWorkerListener(
  worker: ExpenseLocalDocumentReaderWorkerLikeV1,
  type: "message" | "error",
  listener: ((event: MessageEvent<unknown>) => void) | ((event: Event) => void),
): void {
  try {
    if (type === "message") {
      worker.removeEventListener(type, listener as (event: MessageEvent<unknown>) => void);
    } else {
      worker.removeEventListener(type, listener as (event: Event) => void);
    }
  } catch {
    // Listener cleanup must not replace the settled outcome.
  }
}

function assertActive(signal: AbortSignal): void {
  if (signal.aborted) invalid("ABORTED");
}

function invalid(code: DocumentReadingErrorCodeV1): never {
  throw new DocumentReadingErrorV1(code);
}

function isBoundedIdentifier(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= DOCUMENT_READING_LIMITS_V1.maxIdentifierChars &&
    !UNSUPPORTED_IDENTIFIER_CHARACTERS.test(value)
  );
}

function isFile(value: unknown): value is File {
  try {
    return typeof File !== "undefined" && value instanceof File;
  } catch {
    return false;
  }
}

function isAbortSignal(value: unknown): value is AbortSignal {
  try {
    return typeof AbortSignal !== "undefined" && value instanceof AbortSignal;
  } catch {
    return false;
  }
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
