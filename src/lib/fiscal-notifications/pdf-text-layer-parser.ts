import {
  FISCAL_NOTIFICATION_INPUT_LIMITS,
  assertBoundedDocumentInput,
  assertBoundedId,
  assertBoundedOwnerScope,
  assertNotAborted,
  type BoundedDocumentInput,
} from "./input-contract";

export const FISCAL_NOTIFICATION_PDF_LIMITS = Object.freeze({
  maxBytes: 4 * 1024 * 1024,
  maxPages: FISCAL_NOTIFICATION_INPUT_LIMITS.maxPages,
  maxTextItemsPerPage: 5_000,
  maxTextItemsTotal: 50_000,
  maxTextItemChars: 32_768,
  maxTextChars: FISCAL_NOTIFICATION_INPUT_LIMITS.maxTextChars,
  timeoutMs: 15_000,
} as const);

export type FiscalNotificationPdfErrorCode =
  | "UNSUPPORTED_FILE"
  | "FILE_TOO_LARGE"
  | "INVALID_PDF"
  | "TOO_MANY_PAGES"
  | "TOO_MANY_TEXT_ITEMS"
  | "TEXT_ITEM_TOO_LARGE"
  | "TEXT_TOO_LARGE"
  | "TIMEOUT"
  | "ABORTED"
  | "WORKER_UNAVAILABLE"
  | "INVALID_WORKER_RESPONSE"
  | "HASH_UNAVAILABLE";

export class FiscalNotificationPdfError extends Error {
  constructor(readonly code: FiscalNotificationPdfErrorCode) {
    super(`FISCAL_NOTIFICATION_PDF_ERROR:${code}`);
    this.name = "FiscalNotificationPdfError";
  }
}

interface PdfTextContent {
  readonly items: readonly unknown[];
}

interface PdfPageLike {
  getTextContent(options?: Record<string, unknown>): Promise<PdfTextContent>;
  cleanup(): void;
}

interface PdfDocumentLike {
  readonly numPages: number;
  getPage(pageNumber: number): Promise<PdfPageLike>;
  destroy(): Promise<void>;
}

interface PdfLoadingTaskLike {
  readonly promise: Promise<PdfDocumentLike>;
  destroy(): Promise<void>;
}

/** @internal Test seam. Production loads the pinned local PDF.js dependency. */
export interface FiscalNotificationPdfJsAdapter {
  getDocument(options: Record<string, unknown>): PdfLoadingTaskLike;
}

/** @internal Worker contract. UI callers use the browser-only adapter. */
export interface ParseFiscalNotificationPdfTextLayerInput {
  readonly ownerScope: string;
  readonly documentId: string;
  readonly bytes: Uint8Array;
  readonly signal?: AbortSignal;
  readonly pdfjs?: FiscalNotificationPdfJsAdapter;
}

type PdfjsWorkerGlobal = typeof globalThis & { pdfjsWorker?: unknown };

export async function parseFiscalNotificationPdfTextLayerBytes(
  input: ParseFiscalNotificationPdfTextLayerInput,
): Promise<BoundedDocumentInput> {
  const deadline = Date.now() + FISCAL_NOTIFICATION_PDF_LIMITS.timeoutMs;
  const snapshot = snapshotParseInput(input);
  let pdfjs: FiscalNotificationPdfJsAdapter;
  try {
    pdfjs =
      snapshot.pdfjs ??
      (await awaitWithinDeadline(loadPdfJs(), snapshot.signal, deadline));
  } catch (error) {
    if (error instanceof FiscalNotificationPdfError) throw error;
    throw new FiscalNotificationPdfError("INVALID_PDF");
  }
  if (snapshot.signal?.aborted) {
    throw new FiscalNotificationPdfError("ABORTED");
  }
  let loadingTask: PdfLoadingTaskLike | null = null;
  let document: PdfDocumentLike | null = null;
  try {
    loadingTask = pdfjs.getDocument({
      data: snapshot.bytes,
      isEvalSupported: false,
      stopAtErrors: true,
      enableXfa: false,
      useWorkerFetch: false,
      useSystemFonts: false,
      disableFontFace: true,
      disableAutoFetch: true,
      disableStream: true,
      verbosity: 0,
    });
    document = await awaitWithinDeadline(
      loadingTask.promise,
      snapshot.signal,
      deadline,
    );
    const numPages = document.numPages;
    if (!Number.isSafeInteger(numPages) || numPages <= 0) {
      throw new FiscalNotificationPdfError("INVALID_PDF");
    }
    if (numPages > FISCAL_NOTIFICATION_PDF_LIMITS.maxPages) {
      throw new FiscalNotificationPdfError("TOO_MANY_PAGES");
    }

    const pages: Array<{
      pageNumber: number;
      text: string;
      isBlank: boolean;
      layoutRows?: readonly Readonly<{
        yMilli: number;
        cells: readonly Readonly<{
          xMilli: number;
          widthMilli: number;
          text: string;
        }>[];
      }>[];
    }> = [];
    let totalItems = 0;
    let totalChars = 0;
    for (let pageNumber = 1; pageNumber <= numPages; pageNumber += 1) {
      assertNotAborted(snapshot.signal);
      const page = await awaitWithinDeadline(
        document.getPage(pageNumber),
        snapshot.signal,
        deadline,
      );
      try {
        const content = await awaitWithinDeadline(
          page.getTextContent({ includeMarkedContent: false }),
          snapshot.signal,
          deadline,
        );
        const items = snapshotTextItems(content);
        totalItems += items.length;
        if (totalItems > FISCAL_NOTIFICATION_PDF_LIMITS.maxTextItemsTotal) {
          throw new FiscalNotificationPdfError("TOO_MANY_TEXT_ITEMS");
        }

        const chunks: string[] = [];
        const layoutCells: PositionedTextItem[] = [];
        for (const item of items) {
          assertNotAborted(snapshot.signal);
          const extracted = readTextItem(item);
          if (!extracted) continue;
          if (
            extracted.text.length >
            FISCAL_NOTIFICATION_PDF_LIMITS.maxTextItemChars
          ) {
            throw new FiscalNotificationPdfError("TEXT_ITEM_TOO_LARGE");
          }
          if (extracted.position !== null && extracted.text.trim().length > 0) {
            layoutCells.push(
              Object.freeze({
                ...extracted.position,
                text: extracted.text.trim(),
              }),
            );
          }
          const separator = extracted.hasEol ? "\n" : " ";
          totalChars += extracted.text.length + separator.length;
          if (totalChars > FISCAL_NOTIFICATION_PDF_LIMITS.maxTextChars) {
            throw new FiscalNotificationPdfError("TEXT_TOO_LARGE");
          }
          chunks.push(extracted.text, separator);
        }
        const text = chunks.join("").trim();
        const layoutRows = buildLayoutRows(layoutCells);
        pages.push({
          pageNumber,
          text,
          isBlank: text.length === 0,
          ...(layoutRows.length > 0 ? { layoutRows } : {}),
        });
      } finally {
        safePageCleanup(page);
      }
    }
    assertNotAborted(snapshot.signal);

    const output = Object.freeze({
      ownerScope: snapshot.ownerScope,
      documentId: snapshot.documentId,
      pages: Object.freeze(pages.map((page) => Object.freeze(page))),
    });
    assertBoundedDocumentInput(output);
    return output;
  } catch (error) {
    if (isAbortError(error) || snapshot.signal?.aborted) {
      throw new FiscalNotificationPdfError("ABORTED");
    }
    if (error instanceof FiscalNotificationPdfError) throw error;
    throw new FiscalNotificationPdfError("INVALID_PDF");
  } finally {
    if (document) await safeDestroy(document);
    else if (loadingTask) await safeDestroy(loadingTask);
  }
}

export function hasStrictPdfMagic(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 8) return false;
  return (
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

async function loadPdfJs(): Promise<FiscalNotificationPdfJsAdapter> {
  const [pdfjs, pdfjsWorker] = await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("pdfjs-dist/legacy/build/pdf.worker.mjs"),
  ]);
  (globalThis as PdfjsWorkerGlobal).pdfjsWorker ??= pdfjsWorker;
  return pdfjs as unknown as FiscalNotificationPdfJsAdapter;
}

function snapshotParseInput(
  value: unknown,
): Readonly<{
  ownerScope: string;
  documentId: string;
  bytes: Uint8Array;
  signal?: AbortSignal;
  pdfjs?: FiscalNotificationPdfJsAdapter;
}> {
  const input = snapshotRecord(value);
  if (!input) throw new FiscalNotificationPdfError("INVALID_PDF");
  const keys = new Set(["ownerScope", "documentId", "bytes", "signal", "pdfjs"]);
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== "string" || !keys.has(key)) {
      throw new FiscalNotificationPdfError("INVALID_PDF");
    }
  }
  try {
    assertBoundedOwnerScope(input.ownerScope, "ownerScope");
    assertBoundedId(input.documentId, "documentId");
  } catch {
    throw new FiscalNotificationPdfError("INVALID_PDF");
  }
  const bytes = copyBoundedBytes(input.bytes);
  if (!hasStrictPdfMagic(bytes)) {
    throw new FiscalNotificationPdfError("INVALID_PDF");
  }
  if (input.signal !== undefined && !isAbortSignalValue(input.signal)) {
    throw new FiscalNotificationPdfError("INVALID_PDF");
  }
  const signal = input.signal as AbortSignal | undefined;
  if (signal?.aborted) throw new FiscalNotificationPdfError("ABORTED");
  return Object.freeze({
    ownerScope: input.ownerScope as string,
    documentId: input.documentId as string,
    bytes,
    ...(signal ? { signal } : {}),
    ...(input.pdfjs !== undefined
      ? { pdfjs: input.pdfjs as FiscalNotificationPdfJsAdapter }
      : {}),
  });
}

function copyBoundedBytes(value: unknown): Uint8Array {
  try {
    if (!(value instanceof Uint8Array)) {
      throw new FiscalNotificationPdfError("INVALID_PDF");
    }
    const copy = Uint8Array.prototype.slice.call(
      value,
      0,
      FISCAL_NOTIFICATION_PDF_LIMITS.maxBytes + 1,
    ) as Uint8Array;
    if (copy.byteLength === 0) {
      throw new FiscalNotificationPdfError("INVALID_PDF");
    }
    if (copy.byteLength > FISCAL_NOTIFICATION_PDF_LIMITS.maxBytes) {
      throw new FiscalNotificationPdfError("FILE_TOO_LARGE");
    }
    return copy;
  } catch (error) {
    if (error instanceof FiscalNotificationPdfError) throw error;
    throw new FiscalNotificationPdfError("INVALID_PDF");
  }
}

function snapshotTextItems(content: unknown): readonly unknown[] {
  const record = snapshotRecord(content);
  if (!record) throw new FiscalNotificationPdfError("INVALID_PDF");
  const descriptor = Object.getOwnPropertyDescriptor(record, "items");
  if (!descriptor || !("value" in descriptor)) {
    throw new FiscalNotificationPdfError("INVALID_PDF");
  }
  return snapshotArray(
    descriptor.value,
    FISCAL_NOTIFICATION_PDF_LIMITS.maxTextItemsPerPage,
  );
}

function snapshotArray(value: unknown, max: number): readonly unknown[] {
  try {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
      throw new FiscalNotificationPdfError("INVALID_PDF");
    }
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
    if (!lengthDescriptor || !("value" in lengthDescriptor)) {
      throw new FiscalNotificationPdfError("INVALID_PDF");
    }
    const length = Number(lengthDescriptor.value);
    if (!Number.isSafeInteger(length) || length < 0) {
      throw new FiscalNotificationPdfError("INVALID_PDF");
    }
    if (length > max) {
      throw new FiscalNotificationPdfError("TOO_MANY_TEXT_ITEMS");
    }
    for (const key of Reflect.ownKeys(value)) {
      if (key === "length") continue;
      if (typeof key !== "string" || !/^(?:0|[1-9]\d*)$/u.test(key)) {
        throw new FiscalNotificationPdfError("INVALID_PDF");
      }
      const index = Number(key);
      if (!Number.isSafeInteger(index) || index < 0 || index >= length) {
        throw new FiscalNotificationPdfError("INVALID_PDF");
      }
    }
    const snapshot = new Array<unknown>(length);
    for (let index = 0; index < length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !("value" in descriptor)) {
        throw new FiscalNotificationPdfError("INVALID_PDF");
      }
      snapshot[index] = descriptor.value;
    }
    return Object.freeze(snapshot);
  } catch (error) {
    if (error instanceof FiscalNotificationPdfError) throw error;
    throw new FiscalNotificationPdfError("INVALID_PDF");
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

function isAbortSignalValue(value: unknown): value is AbortSignal {
  try {
    return typeof AbortSignal !== "undefined" && value instanceof AbortSignal;
  } catch {
    return false;
  }
}

interface PositionedTextItem {
  readonly xMilli: number;
  readonly yMilli: number;
  readonly widthMilli: number;
  readonly text: string;
}

function readTextItem(
  value: unknown,
): {
  readonly text: string;
  readonly hasEol: boolean;
  readonly position: Omit<PositionedTextItem, "text"> | null;
} | null {
  try {
    if (value === null || typeof value !== "object") return null;
    const textDescriptor = Object.getOwnPropertyDescriptor(value, "str");
    if (!textDescriptor) return null;
    if (!("value" in textDescriptor) || typeof textDescriptor.value !== "string") {
      throw new FiscalNotificationPdfError("INVALID_PDF");
    }
    const eolDescriptor = Object.getOwnPropertyDescriptor(value, "hasEOL");
    if (eolDescriptor && !("value" in eolDescriptor)) {
      throw new FiscalNotificationPdfError("INVALID_PDF");
    }
    if (
      eolDescriptor &&
      typeof eolDescriptor.value !== "boolean" &&
      eolDescriptor.value !== undefined
    ) {
      throw new FiscalNotificationPdfError("INVALID_PDF");
    }
    const transformDescriptor = Object.getOwnPropertyDescriptor(value, "transform");
    const widthDescriptor = Object.getOwnPropertyDescriptor(value, "width");
    const position = transformDescriptor
      ? readTextPosition(transformDescriptor, widthDescriptor)
      : null;
    return {
      text: textDescriptor.value,
      hasEol: eolDescriptor?.value === true,
      position,
    };
  } catch (error) {
    if (error instanceof FiscalNotificationPdfError) throw error;
    throw new FiscalNotificationPdfError("INVALID_PDF");
  }
}

function readTextPosition(
  transformDescriptor: PropertyDescriptor,
  widthDescriptor: PropertyDescriptor | undefined,
): Omit<PositionedTextItem, "text"> | null {
  if (!("value" in transformDescriptor) || !Array.isArray(transformDescriptor.value)) {
    throw new FiscalNotificationPdfError("INVALID_PDF");
  }
  const transform = transformDescriptor.value as unknown[];
  if (transform.length < 6) throw new FiscalNotificationPdfError("INVALID_PDF");
  const x = transform[4];
  const y = transform[5];
  const width = widthDescriptor && "value" in widthDescriptor
    ? widthDescriptor.value
    : 0;
  if (
    typeof x !== "number" ||
    !Number.isFinite(x) ||
    typeof y !== "number" ||
    !Number.isFinite(y) ||
    typeof width !== "number" ||
    !Number.isFinite(width) ||
    width < 0
  ) {
    throw new FiscalNotificationPdfError("INVALID_PDF");
  }
  const xMilli = Math.round(x * 1_000);
  const yMilli = Math.round(y * 2) * 500;
  const widthMilli = Math.round(width * 1_000);
  if (
    !Number.isSafeInteger(xMilli) ||
    !Number.isSafeInteger(yMilli) ||
    !Number.isSafeInteger(widthMilli)
  ) {
    throw new FiscalNotificationPdfError("INVALID_PDF");
  }
  return Object.freeze({ xMilli, yMilli, widthMilli });
}

function buildLayoutRows(
  items: readonly PositionedTextItem[],
): readonly Readonly<{
  yMilli: number;
  cells: readonly Readonly<{
    xMilli: number;
    widthMilli: number;
    text: string;
  }>[];
}>[] {
  const rows = new Map<number, PositionedTextItem[]>();
  for (const item of items) {
    const row = rows.get(item.yMilli) ?? [];
    row.push(item);
    rows.set(item.yMilli, row);
  }
  return Object.freeze(
    [...rows.entries()]
      .sort(([left], [right]) => right - left)
      .map(([yMilli, cells]) =>
        Object.freeze({
          yMilli,
          cells: Object.freeze(
            cells
              .sort((left, right) => left.xMilli - right.xMilli)
              .map(({ xMilli, widthMilli, text }) =>
                Object.freeze({ xMilli, widthMilli, text }),
              ),
          ),
        }),
      ),
  );
}

function awaitWithinDeadline<T>(
  promise: Promise<T>,
  signal: AbortSignal | undefined,
  deadline: number,
): Promise<T> {
  const remaining = Math.max(0, deadline - Date.now());
  if (remaining === 0) {
    return Promise.reject(new FiscalNotificationPdfError("TIMEOUT"));
  }
  if (signal) assertNotAborted(signal);
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const finish = (action: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      action();
    };
    const abort = () =>
      finish(() => reject(new FiscalNotificationPdfError("ABORTED")));
    const timer = setTimeout(
      () => finish(() => reject(new FiscalNotificationPdfError("TIMEOUT"))),
      remaining,
    );
    signal?.addEventListener("abort", abort, { once: true });
    promise.then(
      (value) => {
        finish(() => resolve(value));
      },
      (error) => {
        finish(() => reject(error));
      },
    );
  });
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof FiscalNotificationPdfError && error.code === "ABORTED"
  );
}

function safePageCleanup(page: PdfPageLike): void {
  try {
    page.cleanup();
  } catch {
    // Cleanup must never expose parser details or mask the primary result.
  }
}

async function safeDestroy(value: { destroy(): Promise<void> }): Promise<void> {
  try {
    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(finish, 250);
      value.destroy().then(finish, finish);
    });
  } catch {
    // Destruction is best-effort and intentionally silent to avoid content leaks.
  }
}
