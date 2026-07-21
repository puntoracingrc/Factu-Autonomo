"use client";

import {
  DocumentReadingErrorV1,
  parseDocumentReadingSourceV1,
  type DocumentReadingSourceV1,
} from "./contracts.v1";
import { DOCUMENT_READING_LIMITS_V1 } from "./limits.v1";

export interface BrowserPdfFileIntegrityRequestV1 {
  readonly file: File;
  readonly signal?: AbortSignal;
}

export interface BrowserPdfFileIntegrityResultV1 {
  readonly source: DocumentReadingSourceV1;
  /** Non-enumerable transferable bytes. Never persist or log this value. */
  readonly bytes: ArrayBuffer;
}

export interface BrowserPdfFileIntegrityDependenciesV1 {
  readonly digestSha256?: (
    bytes: Uint8Array<ArrayBuffer>,
  ) => Promise<ArrayBuffer>;
}

const REQUEST_KEYS = new Set(["file", "signal"]);

export async function readBrowserPdfFileIntegrityV1(
  value: unknown,
  dependencies: BrowserPdfFileIntegrityDependenciesV1 = {},
): Promise<BrowserPdfFileIntegrityResultV1> {
  const request = parseRequest(value);
  assertActive(request.signal);
  const declaredSize = readFileSize(request.file);
  if (declaredSize === 0) throw new DocumentReadingErrorV1("EMPTY_FILE");
  if (declaredSize > DOCUMENT_READING_LIMITS_V1.maxPdfBytes) {
    throw new DocumentReadingErrorV1("FILE_TOO_LARGE");
  }
  if (readFileType(request.file) !== "application/pdf") {
    throw new DocumentReadingErrorV1("UNSUPPORTED_MIME");
  }

  const bytes = await awaitAbortable(readFileBytes(request.file), request.signal);
  if (bytes.byteLength !== declaredSize) {
    throw new DocumentReadingErrorV1("INVALID_PDF");
  }
  if (bytes.byteLength > DOCUMENT_READING_LIMITS_V1.maxPdfBytes) {
    throw new DocumentReadingErrorV1("FILE_TOO_LARGE");
  }
  if (!hasStrictPdfMagicV1(new Uint8Array(bytes))) {
    throw new DocumentReadingErrorV1("INVALID_PDF");
  }

  const digest = await awaitAbortable(
    computeSha256(new Uint8Array(bytes), dependencies.digestSha256),
    request.signal,
  );
  const source = parseDocumentReadingSourceV1({
    mimeType: "application/pdf",
    byteLength: bytes.byteLength,
    sha256: digestToHex(digest),
  });
  assertActive(request.signal);

  const result = { source } as BrowserPdfFileIntegrityResultV1;
  Object.defineProperty(result, "bytes", {
    value: bytes,
    enumerable: false,
    writable: false,
    configurable: false,
  });
  return Object.freeze(result);
}

export function hasStrictPdfMagicV1(bytes: Uint8Array): boolean {
  return (
    bytes.byteLength >= 8 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d &&
    (bytes[5] === 0x31 || bytes[5] === 0x32) &&
    bytes[6] === 0x2e &&
    bytes[7] >= 0x30 &&
    bytes[7] <= 0x39
  );
}

function parseRequest(value: unknown): BrowserPdfFileIntegrityRequestV1 {
  const request = snapshotRecord(value);
  if (!request || !hasOnlyKeys(request, REQUEST_KEYS)) {
    throw new DocumentReadingErrorV1("INVALID_INPUT");
  }
  if (!isFile(request.file)) {
    throw new DocumentReadingErrorV1("UNSUPPORTED_MIME");
  }
  if (request.signal !== undefined && !isAbortSignal(request.signal)) {
    throw new DocumentReadingErrorV1("INVALID_INPUT");
  }
  return Object.freeze({
    file: request.file,
    ...(request.signal ? { signal: request.signal as AbortSignal } : {}),
  });
}

function readFileSize(file: File): number {
  try {
    const size = file.size;
    if (!Number.isSafeInteger(size) || size < 0) {
      throw new DocumentReadingErrorV1("INVALID_PDF");
    }
    return size;
  } catch (error) {
    if (error instanceof DocumentReadingErrorV1) throw error;
    throw new DocumentReadingErrorV1("INVALID_PDF");
  }
}

function readFileType(file: File): string {
  try {
    return file.type;
  } catch {
    throw new DocumentReadingErrorV1("INVALID_PDF");
  }
}

function readFileBytes(file: File): Promise<ArrayBuffer> {
  try {
    return file.arrayBuffer();
  } catch {
    return Promise.reject(new DocumentReadingErrorV1("INVALID_PDF"));
  }
}

async function computeSha256(
  bytes: Uint8Array<ArrayBuffer>,
  injected?: (bytes: Uint8Array<ArrayBuffer>) => Promise<ArrayBuffer>,
): Promise<ArrayBuffer> {
  try {
    if (injected) return await injected(bytes);
    if (!globalThis.crypto?.subtle) {
      throw new DocumentReadingErrorV1("HASH_UNAVAILABLE");
    }
    return await globalThis.crypto.subtle.digest("SHA-256", bytes);
  } catch (error) {
    if (error instanceof DocumentReadingErrorV1) throw error;
    throw new DocumentReadingErrorV1("HASH_UNAVAILABLE");
  }
}

function digestToHex(value: ArrayBuffer): string {
  if (!(value instanceof ArrayBuffer) || value.byteLength !== 32) {
    throw new DocumentReadingErrorV1("HASH_UNAVAILABLE");
  }
  return Array.from(new Uint8Array(value), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function assertActive(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DocumentReadingErrorV1("ABORTED");
}

function awaitAbortable<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  assertActive(signal);
  if (!signal) return promise;
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const finish = (action: () => void) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", onAbort);
      action();
    };
    const onAbort = () =>
      finish(() => reject(new DocumentReadingErrorV1("ABORTED")));
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (result) => finish(() => resolve(result)),
      (error) => finish(() => reject(error)),
    );
  });
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
