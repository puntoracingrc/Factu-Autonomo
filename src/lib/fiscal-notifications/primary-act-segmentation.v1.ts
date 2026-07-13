import type {
  FiscalNotificationAnchorId,
  FiscalNotificationSupportedFamilyId,
} from "./extraction-contract";
import { assertNotAborted } from "./input-contract";

export const FISCAL_NOTIFICATION_PRIMARY_ACT_SEGMENTATION_VERSION =
  "1.0.0" as const;
export const FISCAL_NOTIFICATION_PRIMARY_ACT_HEADER_LINE_LIMIT = 40 as const;

export type FiscalNotificationPrimaryActTitleAnchorId = Extract<
  FiscalNotificationAnchorId,
  "ENFORCEMENT_ORDER_TITLE" | "DEFERRAL_GRANT_TITLE"
>;

export interface FiscalNotificationRegisteredPrimaryTitleV1 {
  readonly familyId: FiscalNotificationSupportedFamilyId;
  readonly titleAnchorId: FiscalNotificationPrimaryActTitleAnchorId;
  readonly matchMode: "LINE_EXACT" | "LINE_PREFIX";
  /** Normalized, source-controlled literals only. */
  readonly literals: readonly string[];
}

export interface FiscalNotificationNormalizedPageV1 {
  readonly pageNumber: number;
  /** Ephemeral normalized lines. Never returned by this module. */
  readonly normalizedLines: readonly string[];
}

export interface FiscalNotificationPrimaryActSegmentV1 {
  readonly familyId: FiscalNotificationSupportedFamilyId;
  readonly titleAnchorId: FiscalNotificationPrimaryActTitleAnchorId;
  readonly origin: "DOCUMENT_PRIMARY" | "ATTACHED_ACT";
  readonly startPageNumber: number;
  readonly pageNumbers: readonly number[];
  readonly boundaryPageNumber: number | null;
}

export interface FiscalNotificationPrimaryActSegmentationV1 {
  readonly segmentationVersion: "1.0.0";
  readonly outcome:
    | "NO_REGISTERED_TITLE"
    | "PRIMARY_TITLE"
    | "AMBIGUOUS_PRIMARY_TITLES"
    | "ATTACHED_TITLE"
    | "AMBIGUOUS_ATTACHED_TITLES";
  readonly segments: readonly FiscalNotificationPrimaryActSegmentV1[];
  readonly retainedSourceContent: "NONE";
}

export const AEAT_ENFORCEMENT_PRIMARY_TITLE_V1 = Object.freeze({
  familyId: "AEAT_ENFORCEMENT_ORDER_CANDIDATE",
  titleAnchorId: "ENFORCEMENT_ORDER_TITLE",
  matchMode: "LINE_EXACT",
  literals: Object.freeze(["providencia de apremio"]),
} satisfies FiscalNotificationRegisteredPrimaryTitleV1);

export const AEAT_DEFERRAL_PRIMARY_TITLE_V1 = Object.freeze({
  familyId: "AEAT_DEFERRAL_GRANT_CANDIDATE",
  titleAnchorId: "DEFERRAL_GRANT_TITLE",
  matchMode: "LINE_PREFIX",
  literals: Object.freeze([
    "concesion de aplazamiento o fraccionamiento",
    "concesion de aplazamiento fraccionamiento",
    "concesion del aplazamiento o fraccionamiento",
    "concesion del aplazamiento fraccionamiento",
    "acuerdo de concesion de aplazamiento",
  ]),
} satisfies FiscalNotificationRegisteredPrimaryTitleV1);

export const FISCAL_NOTIFICATION_REGISTERED_PRIMARY_TITLES_V1 = Object.freeze([
  AEAT_ENFORCEMENT_PRIMARY_TITLE_V1,
  AEAT_DEFERRAL_PRIMARY_TITLE_V1,
] satisfies readonly FiscalNotificationRegisteredPrimaryTitleV1[]);

/**
 * Gives absolute priority to source-controlled titles in the first 40
 * normalized lines of page one. Only when page one has none, it starts at the
 * first later registered title as an attached act. Each segment stops before
 * the next registered title and source text never leaves this call.
 */
export function segmentFiscalNotificationPrimaryActsV1(
  pages: readonly FiscalNotificationNormalizedPageV1[],
  signal?: AbortSignal,
): FiscalNotificationPrimaryActSegmentationV1 {
  assertNotAborted(signal);
  const firstPage = pages.find((page) => page.pageNumber === 1);
  const primaryTitles = firstPage
    ? matchingTitles(firstPage, signal)
    : Object.freeze([]);
  if (primaryTitles.length > 0) {
    return buildSegmentation(pages, primaryTitles, 1, "DOCUMENT_PRIMARY", signal);
  }

  const attachedStart = pages.find(
    (page) => page.pageNumber > 1 && matchingTitles(page, signal).length > 0,
  );
  if (!attachedStart) return freezeSegmentation([]);
  return buildSegmentation(
    pages,
    matchingTitles(attachedStart, signal),
    attachedStart.pageNumber,
    "ATTACHED_ACT",
    signal,
  );
}

function buildSegmentation(
  pages: readonly FiscalNotificationNormalizedPageV1[],
  titles: readonly FiscalNotificationRegisteredPrimaryTitleV1[],
  startPageNumber: number,
  origin: FiscalNotificationPrimaryActSegmentV1["origin"],
  signal?: AbortSignal,
): FiscalNotificationPrimaryActSegmentationV1 {
  const laterBoundary = pages.find(
    (page) =>
      page.pageNumber > startPageNumber &&
      matchingTitles(page, signal).length > 0,
  );
  const boundaryPageNumber = laterBoundary?.pageNumber ?? null;
  const pageNumbers = Object.freeze(
    pages
      .filter(
        (page) =>
          page.pageNumber >= startPageNumber &&
          (boundaryPageNumber === null || page.pageNumber < boundaryPageNumber),
      )
      .map((page) => page.pageNumber),
  );

  return freezeSegmentation(
    titles.map((definition) =>
      Object.freeze({
        familyId: definition.familyId,
        titleAnchorId: definition.titleAnchorId,
        origin,
        startPageNumber,
        pageNumbers,
        boundaryPageNumber,
      }),
    ),
  );
}

function matchingTitles(
  page: FiscalNotificationNormalizedPageV1,
  signal?: AbortSignal,
): readonly FiscalNotificationRegisteredPrimaryTitleV1[] {
  return FISCAL_NOTIFICATION_REGISTERED_PRIMARY_TITLES_V1.filter(
    (definition) => titleMatchesHeader(page, definition, signal),
  );
}

function titleMatchesHeader(
  page: FiscalNotificationNormalizedPageV1,
  definition: FiscalNotificationRegisteredPrimaryTitleV1,
  signal?: AbortSignal,
): boolean {
  const header = page.normalizedLines.slice(
    0,
    FISCAL_NOTIFICATION_PRIMARY_ACT_HEADER_LINE_LIMIT,
  );
  for (const line of header) {
    assertNotAborted(signal);
    for (const literal of definition.literals) {
      if (
        (definition.matchMode === "LINE_EXACT" && line === literal) ||
        (definition.matchMode === "LINE_PREFIX" &&
          (line === literal || line.startsWith(`${literal} `)))
      ) {
        return true;
      }
    }
  }
  return false;
}

function freezeSegmentation(
  segments: readonly FiscalNotificationPrimaryActSegmentV1[],
): FiscalNotificationPrimaryActSegmentationV1 {
  return Object.freeze({
    segmentationVersion: FISCAL_NOTIFICATION_PRIMARY_ACT_SEGMENTATION_VERSION,
    outcome:
      segments.length === 0
        ? "NO_REGISTERED_TITLE"
        : segments[0]?.origin === "ATTACHED_ACT"
          ? segments.length === 1
            ? "ATTACHED_TITLE"
            : "AMBIGUOUS_ATTACHED_TITLES"
          : segments.length === 1
            ? "PRIMARY_TITLE"
            : "AMBIGUOUS_PRIMARY_TITLES",
    segments: Object.freeze(
      segments.map((segment) =>
        Object.freeze({
          ...segment,
          pageNumbers: Object.freeze([...segment.pageNumbers]),
        }),
      ),
    ),
    retainedSourceContent: "NONE",
  });
}
