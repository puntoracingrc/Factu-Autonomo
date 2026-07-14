import {
  FISCAL_NOTIFICATION_INPUT_LIMITS,
  FiscalNotificationInputError,
  assertBoundedId,
  assertBoundedOwnerScope,
  assertNotAborted,
} from "../input-contract";
import { FISCAL_NOTIFICATION_REGISTERED_PRIMARY_TITLES_V1 } from "../primary-act-segmentation.v1";
import {
  type DetectedAuthorityV1,
  type DocumentSegmentTypeV1,
  type DocumentSegmentV1,
  createDocumentSegmentV1,
} from "./document-segment.v1";
import {
  FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
  assertExactDataRecordV1,
} from "./shared.v1";

export const DOCUMENT_SEGMENTER_VERSION_V1 = "1.0.0" as const;
export const DOCUMENT_SEGMENTER_LIMITS_V1 = Object.freeze({
  maxLinesPerPage: 2_000,
  maxLinesTotal: 20_000,
  maxLineChars: 2_000,
  maxTextChars: FISCAL_NOTIFICATION_INPUT_LIMITS.maxTextChars,
} as const);

export interface SegmentableNormalizedPageV1 {
  readonly pageNumber: number;
  readonly normalizedLines: readonly string[];
  readonly isBlank: boolean;
}

export interface SegmentFiscalNotificationDocumentInputV1 {
  readonly ownerScope: string;
  readonly documentId: string;
  readonly pages: readonly SegmentableNormalizedPageV1[];
  readonly signal?: AbortSignal;
}

export interface DocumentSegmentationResultV1 {
  readonly contractVersion: typeof FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1;
  readonly segmenterVersion: typeof DOCUMENT_SEGMENTER_VERSION_V1;
  readonly status: "SEGMENTED_REVIEW_REQUIRED" | "UNKNOWN_REVIEW_REQUIRED";
  readonly documentId: string;
  readonly segments: readonly DocumentSegmentV1[];
  readonly warnings: readonly (
    | "NO_MAIN_ADMINISTRATIVE_ACT_DETECTED"
    | "UNKNOWN_LEADING_PAGES"
    | "BLANK_PAGES_RETAINED_IN_SEGMENT"
  )[];
  readonly retainedSourceContent: "NONE";
  readonly requiresHumanReview: true;
  readonly materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW";
}

type ExplicitPageClassificationV1 = Readonly<{
  segmentType: DocumentSegmentTypeV1;
  detectedTitle: string | null;
  detectedAuthority: DetectedAuthorityV1;
  confidence: number;
}>;

type ClassifiedPageV1 = ExplicitPageClassificationV1 & Readonly<{
  pageNumber: number;
  normalizedLines: readonly string[];
  inherited: boolean;
  blank: boolean;
}>;

const CLOSED_PAGE_MARKERS = Object.freeze([
  marker("DELIVERY_EVIDENCE", [
    "acuse de recibo",
    "certificacion de notificacion",
    "evidencia de entrega",
    "puesta a disposicion de la notificacion",
  ]),
  marker("NOTIFICATION_COVER", [
    "datos de la notificacion",
    "caratula de notificacion",
    "notificacion electronica",
    "aviso de puesta a disposicion",
  ]),
  marker("DEBT_LIST", [
    "relacion de deudas",
    "detalle de deudas",
    "anexo relacion de deudas",
  ]),
  marker("PAYMENT_DOCUMENT", [
    "carta de pago",
    "documento de ingreso",
    "instrucciones para efectuar el pago",
  ]),
  marker("RESPONSE_FORM", [
    "formulario de alegaciones",
    "modelo de alegaciones",
    "formulario de contestacion",
  ]),
  marker("APPEAL_INFORMATION", [
    "recursos y reclamaciones",
    "recursos que proceden",
    "pie de recursos",
  ]),
  marker("GENERIC_INSTRUCTIONS", [
    "instrucciones generales",
    "informacion general",
    "como contestar esta notificacion",
  ]),
  marker("ANNEX", ["anexo", "anexo i", "anexo ii", "documentacion anexa"]),
] as const);

function marker(
  segmentType: Exclude<DocumentSegmentTypeV1, "MAIN_ADMINISTRATIVE_ACT" | "UNKNOWN">,
  titles: readonly string[],
) {
  return Object.freeze({ segmentType, titles: Object.freeze(titles) });
}

export async function segmentFiscalNotificationDocumentV1(
  rawInput: SegmentFiscalNotificationDocumentInputV1,
): Promise<DocumentSegmentationResultV1> {
  const input = snapshotInput(rawInput);
  const classifiedPages: ClassifiedPageV1[] = [];
  let previous: ClassifiedPageV1 | null = null;

  for (const page of input.pages) {
    assertNotAborted(input.signal);
    const explicit = classifyExplicitPage(page.normalizedLines);
    const classified: ClassifiedPageV1 = explicit.segmentType === "UNKNOWN" && previous !== null
      ? Object.freeze({
          ...previous,
          pageNumber: page.pageNumber,
          normalizedLines: page.normalizedLines,
          inherited: true,
          blank: page.isBlank,
          confidence: page.isBlank ? 0.55 : 0.7,
        })
      : Object.freeze({
          ...explicit,
          pageNumber: page.pageNumber,
          normalizedLines: page.normalizedLines,
          inherited: false,
          blank: page.isBlank,
        });
    classifiedPages.push(classified);
    previous = classified;
  }

  const groups = groupContiguousPages(classifiedPages);
  const segments: DocumentSegmentV1[] = [];
  for (let index = 0; index < groups.length; index += 1) {
    assertNotAborted(input.signal);
    const group = groups[index];
    const first = group[0];
    const pageFrom = first.pageNumber;
    const pageTo = group[group.length - 1].pageNumber;
    const contentHash = await hashSegment(input.documentId, first.segmentType, group);
    assertNotAborted(input.signal);
    segments.push(createDocumentSegmentV1({
      segmentId: `${input.documentId}:segment:${index + 1}:${pageFrom}-${pageTo}`,
      documentId: input.documentId,
      segmentType: first.segmentType,
      pageFrom,
      pageTo,
      detectedTitle: first.detectedTitle,
      detectedAuthority: first.detectedAuthority,
      classificationConfidence: Math.min(...group.map((page) => page.confidence)),
      extractionStatus: group.every((page) => page.blank)
        ? "UNREADABLE"
        : first.segmentType === "UNKNOWN"
          ? "PENDING"
          : "EXTRACTED_REVIEW_REQUIRED",
      contentHash,
      canGenerateAdministrativeFacts: [
        "MAIN_ADMINISTRATIVE_ACT",
        "DEBT_LIST",
        "PAYMENT_DOCUMENT",
      ].includes(first.segmentType),
    }));
  }

  const warnings = Object.freeze([
    ...(segments.some((segment) => segment.segmentType === "MAIN_ADMINISTRATIVE_ACT")
      ? []
      : ["NO_MAIN_ADMINISTRATIVE_ACT_DETECTED" as const]),
    ...(segments[0]?.segmentType === "UNKNOWN" ? ["UNKNOWN_LEADING_PAGES" as const] : []),
    ...(classifiedPages.some((page) => page.blank) ? ["BLANK_PAGES_RETAINED_IN_SEGMENT" as const] : []),
  ]);

  return Object.freeze({
    contractVersion: FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
    segmenterVersion: DOCUMENT_SEGMENTER_VERSION_V1,
    status: segments.some((segment) => segment.segmentType !== "UNKNOWN")
      ? "SEGMENTED_REVIEW_REQUIRED"
      : "UNKNOWN_REVIEW_REQUIRED",
    documentId: input.documentId,
    segments: Object.freeze(segments),
    warnings,
    retainedSourceContent: "NONE",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
  });
}

function snapshotInput(rawInput: SegmentFiscalNotificationDocumentInputV1) {
  assertExactDataRecordV1(rawInput, "segmenter", ["ownerScope", "documentId", "pages", ...(rawInput.signal === undefined ? [] : ["signal"])]);
  assertBoundedOwnerScope(rawInput.ownerScope, "segmenter.ownerScope");
  assertBoundedId(rawInput.documentId, "segmenter.documentId");
  assertNotAborted(rawInput.signal);
  if (!Array.isArray(rawInput.pages) || rawInput.pages.length === 0 || rawInput.pages.length > FISCAL_NOTIFICATION_INPUT_LIMITS.maxPages) {
    throw new FiscalNotificationInputError("TOO_MANY_PAGES", "segmenter.pages");
  }
  let totalLines = 0;
  let totalChars = 0;
  const pages = rawInput.pages.map((page, index) => {
    assertNotAborted(rawInput.signal);
    assertExactDataRecordV1(page, `segmenter.pages[${index}]`, ["pageNumber", "normalizedLines", "isBlank"]);
    if (page.pageNumber !== index + 1 || !Number.isSafeInteger(page.pageNumber)) {
      throw new FiscalNotificationInputError("INVALID_INPUT", `segmenter.pages[${index}].pageNumber`);
    }
    if (!Array.isArray(page.normalizedLines) || page.normalizedLines.length > DOCUMENT_SEGMENTER_LIMITS_V1.maxLinesPerPage) {
      throw new FiscalNotificationInputError("COLLECTION_LIMIT_EXCEEDED", `segmenter.pages[${index}].normalizedLines`);
    }
    totalLines += page.normalizedLines.length;
    if (totalLines > DOCUMENT_SEGMENTER_LIMITS_V1.maxLinesTotal) {
      throw new FiscalNotificationInputError("COLLECTION_LIMIT_EXCEEDED", "segmenter.pages");
    }
    const normalizedLines = page.normalizedLines.map((line, lineIndex) => {
      if (
        typeof line !== "string" ||
        line.length > DOCUMENT_SEGMENTER_LIMITS_V1.maxLineChars ||
        /[\u0000-\u001f\u007f-\u009f]/u.test(line)
      ) {
        throw new FiscalNotificationInputError("INVALID_INPUT", `segmenter.pages[${index}].normalizedLines[${lineIndex}]`);
      }
      totalChars += line.length;
      if (totalChars > DOCUMENT_SEGMENTER_LIMITS_V1.maxTextChars) {
        throw new FiscalNotificationInputError("TEXT_TOO_LARGE", "segmenter.pages");
      }
      return line;
    });
    if (typeof page.isBlank !== "boolean" || page.isBlank !== normalizedLines.every((line) => line.length === 0)) {
      throw new FiscalNotificationInputError("INVALID_INPUT", `segmenter.pages[${index}].isBlank`);
    }
    return Object.freeze({ pageNumber: page.pageNumber, normalizedLines: Object.freeze(normalizedLines), isBlank: page.isBlank });
  });
  return Object.freeze({
    ownerScope: rawInput.ownerScope,
    documentId: rawInput.documentId,
    pages: Object.freeze(pages),
    ...(rawInput.signal ? { signal: rawInput.signal } : {}),
  });
}

function classifyExplicitPage(lines: readonly string[]): ExplicitPageClassificationV1 {
  const header = lines.slice(0, 40);
  const primary = FISCAL_NOTIFICATION_REGISTERED_PRIMARY_TITLES_V1.find((definition) =>
    header.some((line) => definition.literals.some((literal) =>
      definition.matchMode === "LINE_EXACT"
        ? line === literal
        : line === literal || line.startsWith(`${literal} `),
    )),
  );
  if (primary) {
    const title = header.find((line) => primary.literals.some((literal) => line === literal || line.startsWith(`${literal} `))) ?? null;
    return Object.freeze({
      segmentType: "MAIN_ADMINISTRATIVE_ACT",
      detectedTitle: title,
      detectedAuthority: detectAuthority(lines),
      confidence: 0.99,
    });
  }
  for (const definition of CLOSED_PAGE_MARKERS) {
    const title = header.find((line) => definition.titles.some((literal) => line === literal || line.startsWith(`${literal} `)));
    if (title !== undefined) {
      return Object.freeze({
        segmentType: definition.segmentType,
        detectedTitle: title,
        detectedAuthority: detectAuthority(lines),
        confidence: 0.95,
      });
    }
  }
  return Object.freeze({
    segmentType: "UNKNOWN",
    detectedTitle: null,
    detectedAuthority: detectAuthority(lines),
    confidence: 0,
  });
}

function detectAuthority(lines: readonly string[]): DetectedAuthorityV1 {
  const joined = lines.slice(0, 80).join(" ");
  if (/dehu|direccion electronica habilitada unica/u.test(joined)) return "DEHU";
  if (/agencia estatal de administracion tributaria|agencia tributaria|agenciatributaria/u.test(joined)) return "AEAT";
  if (/tribunal economico administrativo/u.test(joined)) return "TEAR";
  if (/tesoreria general de la seguridad social|tgss/u.test(joined)) return "TGSS";
  return "UNKNOWN";
}

function groupContiguousPages(pages: readonly ClassifiedPageV1[]): readonly ClassifiedPageV1[][] {
  const groups: ClassifiedPageV1[][] = [];
  for (const page of pages) {
    const current = groups[groups.length - 1];
    if (!current || current[0].segmentType !== page.segmentType || !page.inherited) {
      groups.push([page]);
    } else {
      current.push(page);
    }
  }
  return groups;
}

async function hashSegment(
  documentId: string,
  segmentType: DocumentSegmentTypeV1,
  pages: readonly ClassifiedPageV1[],
): Promise<`sha256:${string}`> {
  const canonical = [
    documentId,
    segmentType,
    ...pages.flatMap((page) => [String(page.pageNumber), ...page.normalizedLines]),
  ].join("\u0000");
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `sha256:${hex}`;
}
