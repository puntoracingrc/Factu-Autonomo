"use client";

import {
  analyzeFiscalNotificationDocumentInput,
} from "./document-input-analysis";
import {
  FISCAL_NOTIFICATION_INPUT_LIMITS,
  assertBoundedId,
  assertBoundedOwnerScope,
  type BoundedDocumentInput,
} from "./input-contract";
import {
  FISCAL_NOTIFICATION_PDF_LIMITS,
  FiscalNotificationPdfError,
  hasStrictPdfMagic,
} from "./pdf-text-layer-parser";
import {
  parseFiscalNotificationPdfWorkerAnalysis,
  projectFiscalNotificationPdfWorkerAnalysis,
  type FiscalNotificationPdfWorkerAnalysis,
} from "./pdf-worker-analysis-contract";
import {
  parseFiscalNotificationVerticalSliceReviewV1,
  type FiscalNotificationVerticalSliceReviewV1,
} from "./vertical-slice-review.v1";

export const FISCAL_NOTIFICATION_LOCAL_OCR_SCHEMA_VERSION = 1 as const;
export const FISCAL_NOTIFICATION_LOCAL_OCR_VERSION = "1.0.0" as const;
export const FISCAL_NOTIFICATION_LOCAL_OCR_LIMITS = Object.freeze({
  dpi: 160,
  maxPixelsPerPage: 4_000_000,
  maxPixelsTotal: 180_000_000,
  timeoutMs: 180_000,
} as const);

export interface FiscalNotificationLocalOcrRequest {
  readonly ownerScope: string;
  readonly documentId: string;
  readonly file: File;
  readonly expectedByteLength: number;
  readonly expectedSha256: string;
  readonly expectedPageCount: number;
  readonly signal?: AbortSignal;
}

export interface FiscalNotificationLocalOcrResult {
  readonly schemaVersion: 1;
  readonly ocrVersion: "1.0.0";
  readonly status: "OCR_TEXT_AVAILABLE" | "NO_READABLE_TEXT";
  readonly pageCount: number;
  readonly averageConfidence: number | null;
  readonly analysis: FiscalNotificationLocalOcrAnalysis | null;
  readonly providerCalled: false;
  readonly executionBoundary: "LOCAL_TESSERACT_WORKER";
  readonly sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST";
  readonly retainedSourceContent: "NONE";
  readonly requiresHumanReview: true;
  readonly materializationPolicy: "PROHIBITED_UNTIL_REVIEW";
}

export interface FiscalNotificationLocalOcrAnalysis {
  readonly hasText: true;
  readonly pageCount: number;
  readonly familyAnalysis: FiscalNotificationPdfWorkerAnalysis["familyAnalysis"];
  readonly enforcementMoneyFacts: FiscalNotificationPdfWorkerAnalysis["enforcementMoneyFacts"];
  readonly enforcementExplicitFields: FiscalNotificationPdfWorkerAnalysis["enforcementExplicitFields"];
  readonly enforcementPartyFacts: FiscalNotificationPdfWorkerAnalysis["enforcementPartyFacts"];
  readonly deferralGrantFacts: FiscalNotificationPdfWorkerAnalysis["deferralGrantFacts"];
  readonly offsetAgreementFacts: FiscalNotificationPdfWorkerAnalysis["offsetAgreementFacts"];
  readonly verticalSliceReview: FiscalNotificationVerticalSliceReviewV1;
}

interface PdfLoadingTaskLike {
  readonly promise: Promise<PdfDocumentLike>;
  destroy?(): Promise<void> | void;
}

interface PdfDocumentLike {
  readonly numPages: number;
  getPage(pageNumber: number): Promise<PdfPageLike>;
  destroy?(): Promise<void> | void;
}

interface PdfPageLike {
  getViewport(input: { scale: number }): { width: number; height: number };
  render(input: {
    canvasContext: unknown;
    viewport: unknown;
  }): { readonly promise: Promise<void> };
  cleanup?(): void;
}

interface PdfJsLike {
  getDocument(input: { data: Uint8Array }): PdfLoadingTaskLike;
}

interface OcrWorkerLike {
  setParameters(parameters: Record<string, string | number>): Promise<unknown>;
  recognize(
    image: unknown,
    options: { rotateAuto: false },
    output: { text: true },
  ): Promise<{ readonly data: { readonly text: string; readonly confidence: number } }>;
  terminate(): Promise<unknown> | unknown;
}

interface CanvasResource {
  readonly canvas: unknown;
  readonly context: unknown;
  release(): void;
}

/** @internal Test seam. Production uses bundled pdf.js, Tesseract and OCR assets. */
export interface FiscalNotificationLocalOcrDependencies {
  readonly loadPdfJs?: () => Promise<PdfJsLike>;
  readonly createOcrWorker?: () => Promise<OcrWorkerLike>;
  readonly createCanvas?: (width: number, height: number) => CanvasResource;
  readonly digestSha256?: (bytes: Uint8Array<ArrayBuffer>) => Promise<ArrayBuffer>;
  readonly timeoutMs?: number;
}

const REQUEST_KEYS = new Set([
  "ownerScope",
  "documentId",
  "file",
  "expectedByteLength",
  "expectedSha256",
  "expectedPageCount",
  "signal",
]);
const RESULT_KEYS = new Set([
  "schemaVersion",
  "ocrVersion",
  "status",
  "pageCount",
  "averageConfidence",
  "analysis",
  "providerCalled",
  "executionBoundary",
  "sourceContentPolicy",
  "retainedSourceContent",
  "requiresHumanReview",
  "materializationPolicy",
]);
const ANALYSIS_KEYS = new Set([
  "hasText",
  "pageCount",
  "familyAnalysis",
  "enforcementMoneyFacts",
  "enforcementExplicitFields",
  "enforcementPartyFacts",
  "deferralGrantFacts",
  "offsetAgreementFacts",
  "verticalSliceReview",
]);
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const UNSUPPORTED_OCR_CONTROL_PATTERN =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/gu;

export async function recognizeFiscalNotificationPdfLocally(
  value: unknown,
  dependencies: FiscalNotificationLocalOcrDependencies = {},
): Promise<FiscalNotificationLocalOcrResult> {
  const request = assertRequest(value);
  const timeoutMs =
    dependencies.timeoutMs ?? FISCAL_NOTIFICATION_LOCAL_OCR_LIMITS.timeoutMs;
  if (
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs <= 0 ||
    timeoutMs > FISCAL_NOTIFICATION_LOCAL_OCR_LIMITS.timeoutMs
  ) {
    throw new FiscalNotificationPdfError("TIMEOUT");
  }

  const deadline = Date.now() + timeoutMs;
  let loadingTask: PdfLoadingTaskLike | null = null;
  let pdfDocument: PdfDocumentLike | null = null;
  let ocrWorker: OcrWorkerLike | null = null;
  try {
    assertActive(request.signal, deadline);
    const buffer = await withinDeadline(
      request.file.arrayBuffer(),
      request.signal,
      deadline,
    );
    if (
      !(buffer instanceof ArrayBuffer) ||
      buffer.byteLength !== request.expectedByteLength ||
      buffer.byteLength > FISCAL_NOTIFICATION_PDF_LIMITS.maxBytes
    ) {
      throw new FiscalNotificationPdfError("INVALID_PDF");
    }
    const bytes = new Uint8Array(buffer);
    if (!hasStrictPdfMagic(bytes)) {
      throw new FiscalNotificationPdfError("INVALID_PDF");
    }
    const digest = await withinDeadline(
      computeSha256(bytes, dependencies.digestSha256),
      request.signal,
      deadline,
    );
    if (digestToHex(digest) !== request.expectedSha256) {
      throw new FiscalNotificationPdfError("INVALID_PDF");
    }

    const pdfJs = await withinDeadline(
      (dependencies.loadPdfJs ?? loadPdfJs)(),
      request.signal,
      deadline,
    );
    loadingTask = pdfJs.getDocument({ data: bytes });
    pdfDocument = await withinDeadline(
      loadingTask.promise,
      request.signal,
      deadline,
    );
    if (
      !Number.isSafeInteger(pdfDocument.numPages) ||
      pdfDocument.numPages <= 0 ||
      pdfDocument.numPages !== request.expectedPageCount ||
      pdfDocument.numPages > FISCAL_NOTIFICATION_INPUT_LIMITS.maxPages
    ) {
      throw new FiscalNotificationPdfError("TOO_MANY_PAGES");
    }

    ocrWorker = await withinDeadline(
      (dependencies.createOcrWorker ?? createOcrWorker)(),
      request.signal,
      deadline,
    );
    await withinDeadline(
      ocrWorker.setParameters({
        tessedit_pageseg_mode: 3,
        preserve_interword_spaces: "1",
        user_defined_dpi: String(FISCAL_NOTIFICATION_LOCAL_OCR_LIMITS.dpi),
      }),
      request.signal,
      deadline,
    );

    const pages: Array<{
      readonly pageNumber: number;
      readonly text: string;
      readonly isBlank: boolean;
    }> = [];
    const confidences: number[] = [];
    let totalChars = 0;
    let totalPixels = 0;
    const scale = FISCAL_NOTIFICATION_LOCAL_OCR_LIMITS.dpi / 72;

    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
      assertActive(request.signal, deadline);
      const page = await withinDeadline(
        pdfDocument.getPage(pageNumber),
        request.signal,
        deadline,
      );
      let canvasResource: CanvasResource | null = null;
      try {
        const viewport = page.getViewport({ scale });
        const width = Math.ceil(viewport.width);
        const height = Math.ceil(viewport.height);
        const pixels = width * height;
        if (
          !Number.isSafeInteger(width) ||
          !Number.isSafeInteger(height) ||
          width <= 0 ||
          height <= 0 ||
          !Number.isSafeInteger(pixels) ||
          pixels > FISCAL_NOTIFICATION_LOCAL_OCR_LIMITS.maxPixelsPerPage
        ) {
          throw new FiscalNotificationPdfError("INVALID_PDF");
        }
        totalPixels += pixels;
        if (totalPixels > FISCAL_NOTIFICATION_LOCAL_OCR_LIMITS.maxPixelsTotal) {
          throw new FiscalNotificationPdfError("TOO_MANY_PAGES");
        }
        canvasResource = (dependencies.createCanvas ?? createCanvas)(width, height);
        await withinDeadline(
          page.render({
            canvasContext: canvasResource.context,
            viewport,
          }).promise,
          request.signal,
          deadline,
        );
        const recognized = await withinDeadline(
          ocrWorker.recognize(
            canvasResource.canvas,
            { rotateAuto: false },
            { text: true },
          ),
          request.signal,
          deadline,
        );
        const text = sanitizeOcrText(recognized.data.text);
        totalChars += text.length;
        if (totalChars > FISCAL_NOTIFICATION_INPUT_LIMITS.maxTextChars) {
          throw new FiscalNotificationPdfError("TEXT_TOO_LARGE");
        }
        const confidence = normalizeConfidence(recognized.data.confidence);
        if (text.length > 0 && confidence !== null) confidences.push(confidence);
        pages.push(Object.freeze({
          pageNumber,
          text,
          isBlank: text.length === 0,
        }));
      } finally {
        try {
          canvasResource?.release();
        } finally {
          page.cleanup?.();
        }
      }
    }

    const hasText = pages.some((page) => !page.isBlank);
    if (!hasText) {
      return freezeResult({
        status: "NO_READABLE_TEXT",
        pageCount: pages.length,
        averageConfidence: null,
        analysis: null,
      });
    }
    const documentInput = Object.freeze({
      ownerScope: request.ownerScope,
      documentId: request.documentId,
      pages: Object.freeze(pages),
      ...(request.signal ? { signal: request.signal } : {}),
    }) satisfies BoundedDocumentInput;
    const analyzed = await analyzeFiscalNotificationDocumentInput(documentInput);
    const projected = projectFiscalNotificationPdfWorkerAnalysis({
      textLayerStatus: "TEXT_LAYER_AVAILABLE",
      pageCount: analyzed.pageCount,
      familyAnalysis: analyzed.familyAnalysis,
      enforcementMoneyFacts: analyzed.enforcementMoneyFacts,
      enforcementExplicitFields: analyzed.enforcementExplicitFields,
      enforcementPartyFacts: analyzed.enforcementPartyFacts,
      deferralGrantFacts: analyzed.deferralGrantFacts,
      offsetAgreementFacts: analyzed.offsetAgreementFacts,
    });
    const analysis = freezeAnalysis(projected, analyzed.verticalSliceReview);
    return freezeResult({
      status: "OCR_TEXT_AVAILABLE",
      pageCount: pages.length,
      averageConfidence:
        confidences.length === 0
          ? null
          : confidences.reduce((sum, value) => sum + value, 0) /
            confidences.length,
      analysis,
    });
  } catch (error) {
    if (error instanceof FiscalNotificationPdfError) throw error;
    throw new FiscalNotificationPdfError("INVALID_PDF");
  } finally {
    await safeCleanup(() => ocrWorker?.terminate());
    await safeCleanup(() => pdfDocument?.destroy?.());
    await safeCleanup(() => loadingTask?.destroy?.());
  }
}

export function parseFiscalNotificationLocalOcrResult(
  value: unknown,
): FiscalNotificationLocalOcrResult {
  const result = snapshotRecord(value);
  if (!result || !hasOnlyKeys(result, RESULT_KEYS)) invalidWorkerResponse();
  if (
    result.schemaVersion !== FISCAL_NOTIFICATION_LOCAL_OCR_SCHEMA_VERSION ||
    result.ocrVersion !== FISCAL_NOTIFICATION_LOCAL_OCR_VERSION ||
    (result.status !== "OCR_TEXT_AVAILABLE" &&
      result.status !== "NO_READABLE_TEXT") ||
    !Number.isSafeInteger(result.pageCount) ||
    Number(result.pageCount) <= 0 ||
    Number(result.pageCount) > FISCAL_NOTIFICATION_INPUT_LIMITS.maxPages ||
    result.providerCalled !== false ||
    result.executionBoundary !== "LOCAL_TESSERACT_WORKER" ||
    result.sourceContentPolicy !== "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST" ||
    result.retainedSourceContent !== "NONE" ||
    result.requiresHumanReview !== true ||
    result.materializationPolicy !== "PROHIBITED_UNTIL_REVIEW"
  ) {
    invalidWorkerResponse();
  }
  const confidence = result.averageConfidence;
  if (
    confidence !== null &&
    (typeof confidence !== "number" ||
      !Number.isFinite(confidence) ||
      confidence < 0 ||
      confidence > 1)
  ) {
    invalidWorkerResponse();
  }
  if (result.status === "NO_READABLE_TEXT") {
    if (result.analysis !== null || confidence !== null) invalidWorkerResponse();
    return freezeResult({
      status: "NO_READABLE_TEXT",
      pageCount: Number(result.pageCount),
      averageConfidence: null,
      analysis: null,
    });
  }
  const analysis = snapshotRecord(result.analysis);
  if (
    !analysis ||
    !hasOnlyKeys(analysis, ANALYSIS_KEYS) ||
    analysis.hasText !== true ||
    analysis.pageCount !== result.pageCount
  ) {
    invalidWorkerResponse();
  }
  const parsed = parseFiscalNotificationPdfWorkerAnalysis({
    schemaVersion: 6,
    analysisVersion: "6.0.0",
    textLayerStatus: "TEXT_LAYER_AVAILABLE",
    pageCount: analysis.pageCount,
    familyAnalysis: analysis.familyAnalysis,
    enforcementMoneyFacts: analysis.enforcementMoneyFacts,
    enforcementExplicitFields: analysis.enforcementExplicitFields,
    enforcementPartyFacts: analysis.enforcementPartyFacts,
    deferralGrantFacts: analysis.deferralGrantFacts,
    offsetAgreementFacts: analysis.offsetAgreementFacts,
    sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    retainedSourceContent: "NONE",
  });
  const verticalSliceReview = parseFiscalNotificationVerticalSliceReviewV1(
    analysis.verticalSliceReview,
  );
  const parsedAnalysis = Object.freeze({
    hasText: true,
    pageCount: parsed.pageCount,
    familyAnalysis: parsed.familyAnalysis,
    enforcementMoneyFacts: parsed.enforcementMoneyFacts,
    enforcementExplicitFields: parsed.enforcementExplicitFields,
    enforcementPartyFacts: parsed.enforcementPartyFacts,
    deferralGrantFacts: parsed.deferralGrantFacts,
    offsetAgreementFacts: parsed.offsetAgreementFacts,
    verticalSliceReview,
  });
  return freezeResult({
    status: "OCR_TEXT_AVAILABLE",
    pageCount: Number(result.pageCount),
    averageConfidence: confidence as number | null,
    analysis: parsedAnalysis,
  });
}

function freezeResult(input: {
  status: FiscalNotificationLocalOcrResult["status"];
  pageCount: number;
  averageConfidence: number | null;
  analysis: FiscalNotificationLocalOcrAnalysis | null;
}): FiscalNotificationLocalOcrResult {
  return Object.freeze({
    schemaVersion: FISCAL_NOTIFICATION_LOCAL_OCR_SCHEMA_VERSION,
    ocrVersion: FISCAL_NOTIFICATION_LOCAL_OCR_VERSION,
    ...input,
    providerCalled: false,
    executionBoundary: "LOCAL_TESSERACT_WORKER",
    sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
    retainedSourceContent: "NONE",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
  });
}

function freezeAnalysis(
  value: FiscalNotificationPdfWorkerAnalysis,
  verticalSliceReview: FiscalNotificationVerticalSliceReviewV1,
): FiscalNotificationLocalOcrAnalysis {
  return Object.freeze({
    hasText: true,
    pageCount: value.pageCount,
    familyAnalysis: value.familyAnalysis,
    enforcementMoneyFacts: value.enforcementMoneyFacts ?? null,
    enforcementExplicitFields: value.enforcementExplicitFields ?? null,
    enforcementPartyFacts: value.enforcementPartyFacts ?? null,
    deferralGrantFacts: value.deferralGrantFacts ?? null,
    offsetAgreementFacts: value.offsetAgreementFacts ?? null,
    verticalSliceReview,
  });
}

function assertRequest(value: unknown): FiscalNotificationLocalOcrRequest {
  const record = snapshotRecord(value);
  if (!record) throw new FiscalNotificationPdfError("INVALID_PDF");
  for (const key of Reflect.ownKeys(record)) {
    if (typeof key !== "string" || !REQUEST_KEYS.has(key)) {
      throw new FiscalNotificationPdfError("INVALID_PDF");
    }
  }
  try {
    assertBoundedOwnerScope(record.ownerScope, "ownerScope");
    assertBoundedId(record.documentId, "documentId");
  } catch {
    throw new FiscalNotificationPdfError("INVALID_PDF");
  }
  if (!isFile(record.file) || record.file.type !== "application/pdf") {
    throw new FiscalNotificationPdfError("UNSUPPORTED_FILE");
  }
  if (
    !Number.isSafeInteger(record.expectedByteLength) ||
    Number(record.expectedByteLength) <= 0 ||
    Number(record.expectedByteLength) > FISCAL_NOTIFICATION_PDF_LIMITS.maxBytes ||
    record.file.size !== record.expectedByteLength
  ) {
    throw new FiscalNotificationPdfError("INVALID_PDF");
  }
  if (
    typeof record.expectedSha256 !== "string" ||
    !SHA256_PATTERN.test(record.expectedSha256)
  ) {
    throw new FiscalNotificationPdfError("INVALID_PDF");
  }
  if (
    !Number.isSafeInteger(record.expectedPageCount) ||
    Number(record.expectedPageCount) <= 0 ||
    Number(record.expectedPageCount) > FISCAL_NOTIFICATION_INPUT_LIMITS.maxPages
  ) {
    throw new FiscalNotificationPdfError("TOO_MANY_PAGES");
  }
  if (record.signal !== undefined && !isAbortSignal(record.signal)) {
    throw new FiscalNotificationPdfError("INVALID_PDF");
  }
  if ((record.signal as AbortSignal | undefined)?.aborted) {
    throw new FiscalNotificationPdfError("ABORTED");
  }
  return {
    ownerScope: record.ownerScope as string,
    documentId: record.documentId as string,
    file: record.file,
    expectedByteLength: record.expectedByteLength as number,
    expectedSha256: record.expectedSha256 as string,
    expectedPageCount: record.expectedPageCount as number,
    ...(record.signal ? { signal: record.signal as AbortSignal } : {}),
  };
}

async function loadPdfJs(): Promise<PdfJsLike> {
  const [pdfJs, pdfJsWorker] = await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("pdfjs-dist/legacy/build/pdf.worker.mjs"),
  ]);
  const target = globalThis as typeof globalThis & { pdfjsWorker?: unknown };
  target.pdfjsWorker ??= pdfJsWorker;
  return pdfJs as unknown as PdfJsLike;
}

async function createOcrWorker(): Promise<OcrWorkerLike> {
  const { createWorker, OEM } = await import("tesseract.js");
  return (await createWorker("spa", OEM.LSTM_ONLY, {
    workerPath: "/ocr/tesseract-worker.min.js",
    corePath: "/ocr/tesseract-core-lstm.wasm.js",
    langPath: "/ocr/lang",
  })) as unknown as OcrWorkerLike;
}

function createCanvas(width: number, height: number): CanvasResource {
  if (typeof document === "undefined") {
    throw new FiscalNotificationPdfError("WORKER_UNAVAILABLE");
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new FiscalNotificationPdfError("WORKER_UNAVAILABLE");
  return {
    canvas,
    context,
    release() {
      canvas.width = 1;
      canvas.height = 1;
    },
  };
}

function sanitizeOcrText(value: unknown): string {
  if (typeof value !== "string") {
    throw new FiscalNotificationPdfError("INVALID_WORKER_RESPONSE");
  }
  return value
    .replace(/\r\n?/gu, "\n")
    .replace(UNSUPPORTED_OCR_CONTROL_PATTERN, " ")
    .trim();
}

function normalizeConfidence(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(1, value / 100));
}

function assertActive(signal: AbortSignal | undefined, deadline: number): void {
  if (signal?.aborted) throw new FiscalNotificationPdfError("ABORTED");
  if (Date.now() >= deadline) throw new FiscalNotificationPdfError("TIMEOUT");
}

function withinDeadline<T>(
  promise: Promise<T>,
  signal: AbortSignal | undefined,
  deadline: number,
): Promise<T> {
  assertActive(signal, deadline);
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const remaining = Math.max(1, deadline - Date.now());
    const finish = (action: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
      action();
    };
    const onAbort = () =>
      finish(() => reject(new FiscalNotificationPdfError("ABORTED")));
    const timeout = setTimeout(
      () => finish(() => reject(new FiscalNotificationPdfError("TIMEOUT"))),
      remaining,
    );
    signal?.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (result) => finish(() => resolve(result)),
      () => finish(() => reject(new FiscalNotificationPdfError("INVALID_PDF"))),
    );
  });
}

async function computeSha256(
  bytes: Uint8Array<ArrayBuffer>,
  injected?: (bytes: Uint8Array<ArrayBuffer>) => Promise<ArrayBuffer>,
): Promise<ArrayBuffer> {
  if (injected) return injected(bytes);
  if (!globalThis.crypto?.subtle) {
    throw new FiscalNotificationPdfError("HASH_UNAVAILABLE");
  }
  return globalThis.crypto.subtle.digest("SHA-256", bytes);
}

function digestToHex(value: ArrayBuffer): string {
  if (!(value instanceof ArrayBuffer) || value.byteLength !== 32) {
    throw new FiscalNotificationPdfError("HASH_UNAVAILABLE");
  }
  return Array.from(new Uint8Array(value), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
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

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
): boolean {
  try {
    return Reflect.ownKeys(value).every(
      (key) => typeof key === "string" && allowed.has(key),
    );
  } catch {
    return false;
  }
}

function invalidWorkerResponse(): never {
  throw new FiscalNotificationPdfError("INVALID_WORKER_RESPONSE");
}

async function safeCleanup(action: () => unknown): Promise<void> {
  try {
    await action();
  } catch {
    // Cleanup cannot replace the primary outcome.
  }
}
