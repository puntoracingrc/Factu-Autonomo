import { DOCUMENT_READING_LIMITS_V1 } from "./limits.v1";

export const DOCUMENT_READING_SCHEMA_VERSION_V1 = 1 as const;
export const DOCUMENT_READING_VERSION_V1 = "1.0.0" as const;
export const DOCUMENT_READING_SOURCE_CONTENT_POLICY_V1 =
  "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST" as const;

export type DocumentReadingErrorCodeV1 =
  | "INVALID_INPUT"
  | "UNSUPPORTED_MIME"
  | "EMPTY_FILE"
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

export type DocumentReadingAbstentionReasonV1 =
  | DocumentReadingErrorCodeV1
  | "OCR_REQUIRED";

export class DocumentReadingErrorV1 extends Error {
  constructor(readonly code: DocumentReadingErrorCodeV1) {
    super(`DOCUMENT_READING_ERROR:${code}`);
    this.name = "DocumentReadingErrorV1";
  }
}

export interface DocumentReadingSourceV1 {
  readonly mimeType: "application/pdf";
  readonly byteLength: number;
  readonly sha256: string;
}

export interface DocumentReadingLayoutCellV1 {
  readonly xMilli: number;
  readonly widthMilli: number;
  readonly text: string;
}

export interface DocumentReadingLayoutRowV1 {
  readonly yMilli: number;
  readonly cells: readonly DocumentReadingLayoutCellV1[];
}

export interface DocumentReadingPageV1 {
  readonly pageNumber: number;
  readonly text: string;
  readonly isBlank: boolean;
  readonly layoutRows?: readonly DocumentReadingLayoutRowV1[];
}

export interface EphemeralDocumentContentV1 {
  /** Non-enumerable. The source content must be consumed in memory only. */
  readonly pages: readonly DocumentReadingPageV1[];
  toJSON(): undefined;
}

interface DocumentReadingOutcomeBaseV1 {
  readonly schemaVersion: 1;
  readonly readerVersion: "1.0.0";
  readonly providerCalled: false;
  readonly executionBoundary: "LOCAL_BROWSER_ONLY";
  readonly sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST";
  readonly retainedSourceContent: "NONE";
  readonly source: DocumentReadingSourceV1 | null;
  readonly pageCount: number | null;
}

export interface ReadableDocumentReadingOutcomeV1
  extends DocumentReadingOutcomeBaseV1 {
  readonly status: "READABLE";
  readonly method: "PDF_TEXT_LAYER";
  /** Non-enumerable and explicitly non-JSON-serializable. */
  readonly ephemeralContent: EphemeralDocumentContentV1;
}

export interface AbstainedDocumentReadingOutcomeV1
  extends DocumentReadingOutcomeBaseV1 {
  readonly status: "ABSTAINED";
  readonly reason: DocumentReadingAbstentionReasonV1;
}

export type DocumentReadingOutcomeV1 =
  | ReadableDocumentReadingOutcomeV1
  | AbstainedDocumentReadingOutcomeV1;

const PAGE_KEYS = new Set(["pageNumber", "text", "isBlank", "layoutRows"]);
const ROW_KEYS = new Set(["yMilli", "cells"]);
const CELL_KEYS = new Set(["xMilli", "widthMilli", "text"]);
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

export function parseDocumentReadingSourceV1(
  value: unknown,
): DocumentReadingSourceV1 {
  const source = snapshotRecord(value);
  if (!source || !hasOnlyKeys(source, new Set(["mimeType", "byteLength", "sha256"]))) {
    invalid("INVALID_INPUT");
  }
  if (
    source.mimeType !== "application/pdf" ||
    !Number.isSafeInteger(source.byteLength) ||
    Number(source.byteLength) <= 0 ||
    Number(source.byteLength) > DOCUMENT_READING_LIMITS_V1.maxPdfBytes ||
    typeof source.sha256 !== "string" ||
    !SHA256_PATTERN.test(source.sha256)
  ) {
    invalid("INVALID_INPUT");
  }
  return Object.freeze({
    mimeType: "application/pdf",
    byteLength: Number(source.byteLength),
    sha256: source.sha256,
  });
}

export function parseDocumentReadingPagesV1(
  value: unknown,
): readonly DocumentReadingPageV1[] {
  const sourcePages = snapshotArray(value);
  if (
    !sourcePages ||
    sourcePages.length === 0 ||
    sourcePages.length > DOCUMENT_READING_LIMITS_V1.maxPdfPages
  ) {
    invalid(sourcePages ? "TOO_MANY_PAGES" : "INVALID_WORKER_RESPONSE");
  }

  let totalTextChars = 0;
  let totalLayoutCells = 0;
  let totalLayoutTextChars = 0;
  const pages: DocumentReadingPageV1[] = [];
  for (let pageIndex = 0; pageIndex < sourcePages.length; pageIndex += 1) {
    const page = snapshotRecord(sourcePages[pageIndex]);
    if (!page || !hasOnlyKeys(page, PAGE_KEYS)) invalid("INVALID_WORKER_RESPONSE");
    if (
      page.pageNumber !== pageIndex + 1 ||
      typeof page.text !== "string" ||
      typeof page.isBlank !== "boolean" ||
      page.isBlank !== (page.text.length === 0)
    ) {
      invalid("INVALID_WORKER_RESPONSE");
    }
    totalTextChars += page.text.length;
    if (totalTextChars > DOCUMENT_READING_LIMITS_V1.maxTextChars) {
      invalid("TEXT_TOO_LARGE");
    }

    const nextPage: {
      pageNumber: number;
      text: string;
      isBlank: boolean;
      layoutRows?: readonly DocumentReadingLayoutRowV1[];
    } = {
      pageNumber: pageIndex + 1,
      text: page.text,
      isBlank: page.isBlank,
    };
    if (page.layoutRows !== undefined) {
      const sourceRows = snapshotArray(page.layoutRows);
      if (
        !sourceRows ||
        sourceRows.length > DOCUMENT_READING_LIMITS_V1.maxLayoutRowsPerPage
      ) {
        invalid("INVALID_WORKER_RESPONSE");
      }
      const rows: DocumentReadingLayoutRowV1[] = [];
      for (const sourceRow of sourceRows) {
        const row = snapshotRecord(sourceRow);
        if (!row || !hasOnlyKeys(row, ROW_KEYS)) invalid("INVALID_WORKER_RESPONSE");
        assertCoordinate(row.yMilli);
        const sourceCells = snapshotArray(row.cells);
        if (!sourceCells || sourceCells.length === 0) {
          invalid("INVALID_WORKER_RESPONSE");
        }
        totalLayoutCells += sourceCells.length;
        if (totalLayoutCells > DOCUMENT_READING_LIMITS_V1.maxLayoutCellsTotal) {
          invalid("INVALID_WORKER_RESPONSE");
        }
        const cells: DocumentReadingLayoutCellV1[] = [];
        for (const sourceCell of sourceCells) {
          const cell = snapshotRecord(sourceCell);
          if (!cell || !hasOnlyKeys(cell, CELL_KEYS)) {
            invalid("INVALID_WORKER_RESPONSE");
          }
          assertCoordinate(cell.xMilli);
          assertCoordinate(cell.widthMilli);
          if (
            typeof cell.text !== "string" ||
            cell.text.length === 0 ||
            cell.text.length > DOCUMENT_READING_LIMITS_V1.maxTextItemChars
          ) {
            invalid("INVALID_WORKER_RESPONSE");
          }
          totalLayoutTextChars += cell.text.length;
          if (
            totalLayoutTextChars > DOCUMENT_READING_LIMITS_V1.maxLayoutTextChars
          ) {
            invalid("TEXT_TOO_LARGE");
          }
          cells.push(Object.freeze({
            xMilli: Number(cell.xMilli),
            widthMilli: Number(cell.widthMilli),
            text: cell.text,
          }));
        }
        rows.push(Object.freeze({
          yMilli: Number(row.yMilli),
          cells: Object.freeze(cells),
        }));
      }
      nextPage.layoutRows = Object.freeze(rows);
    }
    pages.push(Object.freeze(nextPage));
  }
  return Object.freeze(pages);
}

export function createEphemeralDocumentContentV1(
  value: unknown,
): EphemeralDocumentContentV1 {
  const pages = parseDocumentReadingPagesV1(value);
  const content = Object.create(null) as EphemeralDocumentContentV1;
  Object.defineProperties(content, {
    pages: {
      value: pages,
      enumerable: false,
      writable: false,
      configurable: false,
    },
    toJSON: {
      value: () => undefined,
      enumerable: false,
      writable: false,
      configurable: false,
    },
  });
  return Object.freeze(content);
}

export function createReadableDocumentReadingOutcomeV1(input: Readonly<{
  source: unknown;
  pages: unknown;
}>): ReadableDocumentReadingOutcomeV1 {
  const source = parseDocumentReadingSourceV1(input.source);
  const ephemeralContent = createEphemeralDocumentContentV1(input.pages);
  const outcome = {
    ...baseOutcome(source, ephemeralContent.pages.length),
    status: "READABLE" as const,
    method: "PDF_TEXT_LAYER" as const,
  } as ReadableDocumentReadingOutcomeV1;
  Object.defineProperty(outcome, "ephemeralContent", {
    value: ephemeralContent,
    enumerable: false,
    writable: false,
    configurable: false,
  });
  return Object.freeze(outcome);
}

export function createAbstainedDocumentReadingOutcomeV1(input: Readonly<{
  reason: DocumentReadingAbstentionReasonV1;
  source?: unknown;
  pageCount?: number | null;
}>): AbstainedDocumentReadingOutcomeV1 {
  const source = input.source === undefined ? null : parseDocumentReadingSourceV1(input.source);
  const pageCount = input.pageCount ?? null;
  if (
    pageCount !== null &&
    (!Number.isSafeInteger(pageCount) ||
      pageCount <= 0 ||
      pageCount > DOCUMENT_READING_LIMITS_V1.maxPdfPages)
  ) {
    invalid("INVALID_INPUT");
  }
  return Object.freeze({
    ...baseOutcome(source, pageCount),
    status: "ABSTAINED",
    reason: input.reason,
  });
}

function baseOutcome(
  source: DocumentReadingSourceV1 | null,
  pageCount: number | null,
): DocumentReadingOutcomeBaseV1 {
  return {
    schemaVersion: DOCUMENT_READING_SCHEMA_VERSION_V1,
    readerVersion: DOCUMENT_READING_VERSION_V1,
    providerCalled: false,
    executionBoundary: "LOCAL_BROWSER_ONLY",
    sourceContentPolicy: DOCUMENT_READING_SOURCE_CONTENT_POLICY_V1,
    retainedSourceContent: "NONE",
    source,
    pageCount,
  };
}

function assertCoordinate(value: unknown): void {
  if (
    !Number.isSafeInteger(value) ||
    Math.abs(Number(value)) > DOCUMENT_READING_LIMITS_V1.maxLayoutCoordinateMilli
  ) {
    invalid("INVALID_WORKER_RESPONSE");
  }
}

function invalid(code: DocumentReadingErrorCodeV1): never {
  throw new DocumentReadingErrorV1(code);
}

function snapshotArray(value: unknown): readonly unknown[] | null {
  try {
    if (!Array.isArray(value)) return null;
    const length = value.length;
    if (!Number.isSafeInteger(length)) return null;
    const result: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !("value" in descriptor)) return null;
      result.push(descriptor.value);
    }
    return result;
  } catch {
    return null;
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
