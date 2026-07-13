"use client";

import {
  FiscalNotificationInputError,
  assertBoundedDocumentInput,
  assertBoundedId,
  assertBoundedOwnerScope,
  type BoundedDocumentInput,
} from "./input-contract";
import {
  FISCAL_NOTIFICATION_PDF_LIMITS,
  FiscalNotificationPdfError,
  hasStrictPdfMagic,
  type FiscalNotificationPdfErrorCode,
} from "./pdf-text-layer-parser";

export const FISCAL_NOTIFICATION_PDF_ADAPTER_SCHEMA_VERSION = 1 as const;
export const FISCAL_NOTIFICATION_PDF_ADAPTER_VERSION = "1.0.0" as const;

export interface FiscalNotificationPdfTextLayerRequest {
  readonly ownerScope: string;
  readonly documentId: string;
  readonly file: File;
  readonly signal?: AbortSignal;
}

export interface FiscalNotificationPdfFileIntegrity {
  readonly mimeType: "application/pdf";
  readonly byteLength: number;
  readonly sha256: string;
}

export interface FiscalNotificationPdfTextLayerResult {
  readonly schemaVersion: 1;
  readonly adapterVersion: "1.0.0";
  readonly status: "TEXT_LAYER_AVAILABLE" | "NO_EXTRACTABLE_TEXT";
  readonly sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST";
  readonly fileIntegrity: FiscalNotificationPdfFileIntegrity;
  readonly documentInput: BoundedDocumentInput;
  readonly requiresHumanReview: true;
  readonly materializationPolicy: "PROHIBITED_UNTIL_REVIEW";
}

/** @internal Test seam. Production callers use the local Worker factory. */
export interface FiscalNotificationPdfWorkerLike {
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

/** @internal Test seam. This module is intentionally not re-exported by a barrel. */
export interface FiscalNotificationPdfAdapterDependencies {
  readonly createWorker?: () => FiscalNotificationPdfWorkerLike;
  readonly digestSha256?: (bytes: Uint8Array<ArrayBuffer>) => Promise<ArrayBuffer>;
  readonly timeoutMs?: number;
}

const REQUEST_KEYS = new Set(["ownerScope", "documentId", "file", "signal"]);
const RESULT_KEYS = new Set(["type", "requestId", "documentInput"]);
const ERROR_KEYS = new Set(["type", "requestId", "code"]);
const DOCUMENT_KEYS = new Set(["ownerScope", "documentId", "pages"]);
const PAGE_KEYS = new Set(["pageNumber", "text", "isBlank"]);
const REQUEST_ID = "parse" as const;
const ERROR_CODES = new Set<FiscalNotificationPdfErrorCode>([
  "UNSUPPORTED_FILE",
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

export async function readFiscalNotificationPdfTextLayer(
  value: unknown,
  dependencies: FiscalNotificationPdfAdapterDependencies = {},
): Promise<FiscalNotificationPdfTextLayerResult> {
  const request = assertRequest(value);
  const timeoutMs = dependencies.timeoutMs ?? FISCAL_NOTIFICATION_PDF_LIMITS.timeoutMs;
  if (
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs <= 0 ||
    timeoutMs > FISCAL_NOTIFICATION_PDF_LIMITS.timeoutMs
  ) {
    throw new FiscalNotificationPdfError("TIMEOUT");
  }

  let timedOut = false;
  let worker: FiscalNotificationPdfWorkerLike | null = null;
  const operationController = new AbortController();
  const abortFromCaller = () => operationController.abort();
  request.signal?.addEventListener("abort", abortFromCaller, { once: true });
  const timeout = setTimeout(() => {
    timedOut = true;
    operationController.abort();
  }, timeoutMs);

  try {
    assertOperationActive(operationController.signal);
    const declaredSize = readFileSize(request.file);
    if (declaredSize <= 0) throw new FiscalNotificationPdfError("INVALID_PDF");
    if (declaredSize > FISCAL_NOTIFICATION_PDF_LIMITS.maxBytes) {
      throw new FiscalNotificationPdfError("FILE_TOO_LARGE");
    }
    if (readFileType(request.file) !== "application/pdf") {
      throw new FiscalNotificationPdfError("UNSUPPORTED_FILE");
    }

    const buffer = await awaitAbortable(
      readFileArrayBuffer(request.file),
      operationController.signal,
    );
    if (!(buffer instanceof ArrayBuffer) || buffer.byteLength !== declaredSize) {
      throw new FiscalNotificationPdfError("INVALID_PDF");
    }
    if (buffer.byteLength > FISCAL_NOTIFICATION_PDF_LIMITS.maxBytes) {
      throw new FiscalNotificationPdfError("FILE_TOO_LARGE");
    }
    const bytes = new Uint8Array(buffer);
    if (!hasStrictPdfMagic(bytes)) {
      throw new FiscalNotificationPdfError("INVALID_PDF");
    }

    const digest = await awaitAbortable(
      computeSha256(bytes, dependencies.digestSha256),
      operationController.signal,
    );
    const sha256 = digestToHex(digest);
    assertOperationActive(operationController.signal);

    worker = createWorker(dependencies.createWorker);
    const workerResult = await awaitWorkerResult(
      worker,
      request.ownerScope,
      request.documentId,
      buffer,
      operationController.signal,
    );
    const documentInput = snapshotDocumentInput(
      workerResult,
      request.ownerScope,
      request.documentId,
    );
    const hasText = documentInput.pages.some(
      (page) => page.text.trim().length > 0,
    );
    return Object.freeze({
      schemaVersion: FISCAL_NOTIFICATION_PDF_ADAPTER_SCHEMA_VERSION,
      adapterVersion: FISCAL_NOTIFICATION_PDF_ADAPTER_VERSION,
      status: hasText ? "TEXT_LAYER_AVAILABLE" : "NO_EXTRACTABLE_TEXT",
      sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
      fileIntegrity: Object.freeze({
        mimeType: "application/pdf",
        byteLength: declaredSize,
        sha256,
      }),
      documentInput,
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    });
  } catch (error) {
    if (operationController.signal.aborted) {
      throw new FiscalNotificationPdfError(timedOut ? "TIMEOUT" : "ABORTED");
    }
    if (error instanceof FiscalNotificationPdfError) throw error;
    if (error instanceof FiscalNotificationInputError) {
      throw new FiscalNotificationPdfError("INVALID_WORKER_RESPONSE");
    }
    throw new FiscalNotificationPdfError("INVALID_PDF");
  } finally {
    clearTimeout(timeout);
    request.signal?.removeEventListener("abort", abortFromCaller);
    if (worker) terminateWorker(worker);
  }
}

function assertRequest(value: unknown): FiscalNotificationPdfTextLayerRequest {
  const request = snapshotRecord(value);
  if (!request) throw new FiscalNotificationPdfError("INVALID_PDF");
  assertKnownKeys(request, REQUEST_KEYS, "INVALID_PDF");
  try {
    assertBoundedOwnerScope(request.ownerScope, "ownerScope");
    assertBoundedId(request.documentId, "documentId");
  } catch {
    throw new FiscalNotificationPdfError("INVALID_PDF");
  }
  if (!isFile(request.file)) throw new FiscalNotificationPdfError("UNSUPPORTED_FILE");
  if (request.signal !== undefined && !isAbortSignal(request.signal)) {
    throw new FiscalNotificationPdfError("INVALID_PDF");
  }
  if ((request.signal as AbortSignal | undefined)?.aborted) {
    throw new FiscalNotificationPdfError("ABORTED");
  }
  return {
    ownerScope: request.ownerScope as string,
    documentId: request.documentId as string,
    file: request.file,
    ...(request.signal ? { signal: request.signal as AbortSignal } : {}),
  };
}

function isFile(value: unknown): value is File {
  try {
    return typeof File !== "undefined" && value instanceof File;
  } catch {
    return false;
  }
}

function readFileSize(file: File): number {
  try {
    const size = file.size;
    if (!Number.isSafeInteger(size) || size < 0) {
      throw new FiscalNotificationPdfError("INVALID_PDF");
    }
    return size;
  } catch (error) {
    if (error instanceof FiscalNotificationPdfError) throw error;
    throw new FiscalNotificationPdfError("INVALID_PDF");
  }
}

function readFileType(file: File): string {
  try {
    return file.type;
  } catch {
    throw new FiscalNotificationPdfError("INVALID_PDF");
  }
}

function readFileArrayBuffer(file: File): Promise<ArrayBuffer> {
  try {
    return file.arrayBuffer();
  } catch {
    return Promise.reject(new FiscalNotificationPdfError("INVALID_PDF"));
  }
}

async function computeSha256(
  bytes: Uint8Array<ArrayBuffer>,
  injected?: (bytes: Uint8Array<ArrayBuffer>) => Promise<ArrayBuffer>,
): Promise<ArrayBuffer> {
  try {
    if (injected) return await injected(bytes);
    if (!globalThis.crypto?.subtle) {
      throw new FiscalNotificationPdfError("HASH_UNAVAILABLE");
    }
    return await globalThis.crypto.subtle.digest("SHA-256", bytes);
  } catch (error) {
    if (error instanceof FiscalNotificationPdfError) throw error;
    throw new FiscalNotificationPdfError("HASH_UNAVAILABLE");
  }
}

function digestToHex(value: ArrayBuffer): string {
  if (!(value instanceof ArrayBuffer) || value.byteLength !== 32) {
    throw new FiscalNotificationPdfError("HASH_UNAVAILABLE");
  }
  return Array.from(new Uint8Array(value), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function createWorker(
  injected?: () => FiscalNotificationPdfWorkerLike,
): FiscalNotificationPdfWorkerLike {
  try {
    if (injected) return injected();
    if (typeof Worker === "undefined") {
      throw new FiscalNotificationPdfError("WORKER_UNAVAILABLE");
    }
    return new Worker(new URL("./pdf-text-layer.worker.ts", import.meta.url), {
      type: "module",
    });
  } catch (error) {
    if (error instanceof FiscalNotificationPdfError) throw error;
    throw new FiscalNotificationPdfError("WORKER_UNAVAILABLE");
  }
}

function awaitWorkerResult(
  worker: FiscalNotificationPdfWorkerLike,
  ownerScope: string,
  documentId: string,
  bytes: ArrayBuffer,
  signal: AbortSignal,
): Promise<unknown> {
  assertOperationActive(signal);
  return new Promise<unknown>((resolve, reject) => {
    let settled = false;
    const finish = (action: () => void) => {
      if (settled) return;
      settled = true;
      safeRemoveWorkerListener(worker, "message", onMessage);
      safeRemoveWorkerListener(worker, "error", onError);
      safeRemoveAbortListener(signal, onAbort);
      action();
    };
    const onMessage = (event: MessageEvent<unknown>) => {
      try {
        const message = snapshotRecord(event.data);
        if (!message || message.requestId !== REQUEST_ID) {
          throw new FiscalNotificationPdfError("INVALID_WORKER_RESPONSE");
        }
        if (message.type === "RESULT") {
          assertKnownKeys(message, RESULT_KEYS, "INVALID_WORKER_RESPONSE");
          finish(() => resolve(message.documentInput));
          return;
        }
        if (message.type === "ERROR") {
          assertKnownKeys(message, ERROR_KEYS, "INVALID_WORKER_RESPONSE");
          if (!ERROR_CODES.has(message.code as FiscalNotificationPdfErrorCode)) {
            throw new FiscalNotificationPdfError("INVALID_WORKER_RESPONSE");
          }
          finish(() =>
            reject(
              new FiscalNotificationPdfError(
                message.code as FiscalNotificationPdfErrorCode,
              ),
            ),
          );
          return;
        }
        throw new FiscalNotificationPdfError("INVALID_WORKER_RESPONSE");
      } catch (error) {
        finish(() =>
          reject(
            error instanceof FiscalNotificationPdfError
              ? error
              : new FiscalNotificationPdfError("INVALID_WORKER_RESPONSE"),
          ),
        );
      }
    };
    const onError = () =>
      finish(() => reject(new FiscalNotificationPdfError("INVALID_PDF")));
    const onAbort = () =>
      finish(() => reject(new FiscalNotificationPdfError("ABORTED")));
    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
    signal.addEventListener("abort", onAbort, { once: true });
    try {
      worker.postMessage(
        {
          type: "PARSE",
          requestId: REQUEST_ID,
          ownerScope,
          documentId,
          bytes,
        },
        [bytes],
      );
    } catch {
      finish(() => reject(new FiscalNotificationPdfError("WORKER_UNAVAILABLE")));
    }
  });
}

function snapshotDocumentInput(
  value: unknown,
  expectedOwnerScope: string,
  expectedDocumentId: string,
): BoundedDocumentInput {
  const input = snapshotRecord(value);
  if (!input) throw new FiscalNotificationPdfError("INVALID_WORKER_RESPONSE");
  assertKnownKeys(input, DOCUMENT_KEYS, "INVALID_WORKER_RESPONSE");
  if (
    input.ownerScope !== expectedOwnerScope ||
    input.documentId !== expectedDocumentId ||
    !Array.isArray(input.pages)
  ) {
    throw new FiscalNotificationPdfError("INVALID_WORKER_RESPONSE");
  }
  const pageValues = snapshotArray(input.pages);
  const pages = pageValues.map((pageValue, index) => {
    const page = snapshotRecord(pageValue);
    if (!page) throw new FiscalNotificationPdfError("INVALID_WORKER_RESPONSE");
    assertKnownKeys(page, PAGE_KEYS, "INVALID_WORKER_RESPONSE");
    if (
      !Number.isSafeInteger(page.pageNumber) ||
      page.pageNumber !== index + 1 ||
      typeof page.text !== "string" ||
      typeof page.isBlank !== "boolean" ||
      page.isBlank !== (page.text.trim().length === 0)
    ) {
      throw new FiscalNotificationPdfError("INVALID_WORKER_RESPONSE");
    }
    return Object.freeze({
      pageNumber: page.pageNumber as number,
      text: page.text,
      isBlank: page.isBlank,
    });
  });
  const documentInput = Object.freeze({
    ownerScope: expectedOwnerScope,
    documentId: expectedDocumentId,
    pages: Object.freeze(pages),
  });
  try {
    assertBoundedDocumentInput(documentInput);
  } catch {
    throw new FiscalNotificationPdfError("INVALID_WORKER_RESPONSE");
  }
  return documentInput;
}

function snapshotArray(value: unknown): readonly unknown[] {
  try {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
      throw new FiscalNotificationPdfError("INVALID_WORKER_RESPONSE");
    }
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
    if (!lengthDescriptor || !("value" in lengthDescriptor)) {
      throw new FiscalNotificationPdfError("INVALID_WORKER_RESPONSE");
    }
    const length = Number(lengthDescriptor.value);
    if (
      !Number.isSafeInteger(length) ||
      length <= 0 ||
      length > FISCAL_NOTIFICATION_PDF_LIMITS.maxPages
    ) {
      throw new FiscalNotificationPdfError("INVALID_WORKER_RESPONSE");
    }
    for (const key of Reflect.ownKeys(value)) {
      if (key === "length") continue;
      if (typeof key !== "string" || !/^(?:0|[1-9]\d*)$/u.test(key)) {
        throw new FiscalNotificationPdfError("INVALID_WORKER_RESPONSE");
      }
      const index = Number(key);
      if (!Number.isSafeInteger(index) || index < 0 || index >= length) {
        throw new FiscalNotificationPdfError("INVALID_WORKER_RESPONSE");
      }
    }
    const snapshot = new Array<unknown>(length);
    for (let index = 0; index < length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !("value" in descriptor)) {
        throw new FiscalNotificationPdfError("INVALID_WORKER_RESPONSE");
      }
      snapshot[index] = descriptor.value;
    }
    return Object.freeze(snapshot);
  } catch (error) {
    if (error instanceof FiscalNotificationPdfError) throw error;
    throw new FiscalNotificationPdfError("INVALID_WORKER_RESPONSE");
  }
}

function assertKnownKeys(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  code: "INVALID_PDF" | "INVALID_WORKER_RESPONSE",
): void {
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string" || !allowed.has(key)) {
      throw new FiscalNotificationPdfError(code);
    }
  }
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

function awaitAbortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  assertOperationActive(signal);
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(new FiscalNotificationPdfError("ABORTED"));
    signal.addEventListener("abort", abort, { once: true });
    promise.then(
      (result) => {
        signal.removeEventListener("abort", abort);
        resolve(result);
      },
      (error) => {
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
  });
}

function assertOperationActive(signal: AbortSignal): void {
  if (signal.aborted) throw new FiscalNotificationPdfError("ABORTED");
}

function safeRemoveWorkerListener(
  worker: FiscalNotificationPdfWorkerLike,
  type: "message",
  listener: (event: MessageEvent<unknown>) => void,
): void;
function safeRemoveWorkerListener(
  worker: FiscalNotificationPdfWorkerLike,
  type: "error",
  listener: (event: Event) => void,
): void;
function safeRemoveWorkerListener(
  worker: FiscalNotificationPdfWorkerLike,
  type: "message" | "error",
  listener: ((event: MessageEvent<unknown>) => void) | ((event: Event) => void),
): void {
  try {
    if (type === "message") {
      worker.removeEventListener(
        type,
        listener as (event: MessageEvent<unknown>) => void,
      );
    } else {
      worker.removeEventListener(type, listener as (event: Event) => void);
    }
  } catch {
    // The Worker is terminated by the outer boundary even if listener cleanup fails.
  }
}

function safeRemoveAbortListener(
  signal: AbortSignal,
  listener: () => void,
): void {
  try {
    signal.removeEventListener("abort", listener);
  } catch {
    // A real AbortSignal should not throw; Worker termination remains authoritative.
  }
}

function terminateWorker(worker: FiscalNotificationPdfWorkerLike): void {
  try {
    worker.terminate();
  } catch {
    throw new FiscalNotificationPdfError("WORKER_UNAVAILABLE");
  }
}
