import type {
  PublicAeatModelReviewPageV1,
  PublicAeatModelReviewBlockReasonV1,
} from "./public-review-catalog.v1";

const MAX_QUERY_LENGTH = 80;
const MAX_QUERY_TOKENS = 12;
const UNSAFE_QUERY_CHARACTER = /[\p{Cc}\p{Cf}\p{Cs}]/u;

export interface PublicAeatModelSearchEntryV2 {
  readonly code: string;
  readonly catalogCardId: string;
  readonly normalizedText: string;
  readonly words: readonly string[];
}

export type PublicAeatModelReviewSearchMatchV2 =
  | "ALL"
  | "EXACT_CODE"
  | "RESULTS"
  | "NO_MATCH";

export type PublicAeatModelReviewSearchResultV2 =
  | Readonly<{
      status: "REVIEW_ONLY";
      data: readonly PublicAeatModelReviewPageV1[];
      query: string | null;
      normalizedQuery: string | null;
      match: PublicAeatModelReviewSearchMatchV2;
      total: number;
    }>
  | Readonly<{
      status: "BLOCKED";
      reason: Extract<
        PublicAeatModelReviewBlockReasonV1,
        "INVALID_INPUT" | "INCONSISTENT_CATALOG"
      >;
    }>;

export type PublicAeatModelSearchEntryResultV2 =
  | Readonly<{
      status: "REVIEW_ONLY";
      data: readonly PublicAeatModelSearchEntryV2[];
      query: string | null;
      normalizedQuery: string | null;
      match: PublicAeatModelReviewSearchMatchV2;
      total: number;
    }>
  | Readonly<{ status: "BLOCKED"; reason: "INVALID_INPUT" }>;

export function getFiscalModelCatalogFocusPresentationV1({
  focusedCardId,
  currentHash,
  reduceMotion,
}: {
  focusedCardId: string | null;
  currentHash: string;
  reduceMotion: boolean;
}) {
  const active =
    focusedCardId !== null && currentHash === `#${focusedCardId}`;
  return Object.freeze({
    active,
    ariaCurrent: active ? ("location" as const) : null,
    scrollBehavior: reduceMotion ? ("auto" as const) : ("smooth" as const),
  });
}

export function normalizePublicAeatModelSearchTextV2(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLocaleLowerCase("es")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function parseQuery(
  value: unknown,
): Readonly<{ query: string | null; normalizedQuery: string | null }> | null {
  if (value === null || value === undefined || value === "") {
    return Object.freeze({ query: null, normalizedQuery: null });
  }
  if (typeof value !== "string") return null;
  if (
    value !== value.trim() ||
    [...value].length > MAX_QUERY_LENGTH ||
    UNSAFE_QUERY_CHARACTER.test(value)
  ) {
    return null;
  }

  const normalizedQuery = normalizePublicAeatModelSearchTextV2(value);
  const tokens = normalizedQuery.split(" ");
  if (
    normalizedQuery.length === 0 ||
    tokens.length > MAX_QUERY_TOKENS
  ) {
    return null;
  }
  return Object.freeze({ query: value, normalizedQuery });
}

function buildPublicAeatModelSearchEntryV2(
  page: PublicAeatModelReviewPageV1,
  additionalTerms: readonly string[],
): PublicAeatModelSearchEntryV2 {
  const specificDescription =
    page.kind === "HISTORICAL_FOUNDATION"
      ? [page.summary, page.historicalNotice ?? ""].join(" ")
      : "";
  const normalizedText = normalizePublicAeatModelSearchTextV2(
    `Modelo ${page.code} ${page.canonicalName} ${specificDescription} ${additionalTerms.join(" ")}`,
  );
  return Object.freeze({
    code: page.code,
    catalogCardId: page.catalogCardId,
    normalizedText,
    words: Object.freeze(normalizedText.split(" ")),
  });
}

export function createPublicAeatModelSearchEntryV2(
  page: PublicAeatModelReviewPageV1,
): PublicAeatModelSearchEntryV2 {
  return buildPublicAeatModelSearchEntryV2(page, []);
}

export function createPublicAeatModelSearchEntryWithTermsV2(
  page: PublicAeatModelReviewPageV1,
  additionalTerms: readonly string[],
): PublicAeatModelSearchEntryV2 {
  return buildPublicAeatModelSearchEntryV2(page, additionalTerms);
}

function entryMatchesTokens(
  entry: PublicAeatModelSearchEntryV2,
  tokens: readonly string[],
): boolean {
  return tokens.every((token) =>
    entry.words.some((word) => word.startsWith(token)),
  );
}

export function filterPublicAeatModelSearchEntriesV2(
  entries: readonly PublicAeatModelSearchEntryV2[],
  query: unknown,
): PublicAeatModelSearchEntryResultV2 {
  const parsedQuery = parseQuery(query);
  if (!parsedQuery) {
    return Object.freeze({ status: "BLOCKED", reason: "INVALID_INPUT" });
  }
  if (parsedQuery.query === null || parsedQuery.normalizedQuery === null) {
    return Object.freeze({
      status: "REVIEW_ONLY",
      data: Object.freeze([...entries]),
      query: null,
      normalizedQuery: null,
      match: "ALL",
      total: entries.length,
    });
  }

  const exactCode = entries.find(
    (entry) =>
      entry.code.toLocaleLowerCase("es") === parsedQuery.normalizedQuery,
  );
  const matches = exactCode
    ? [exactCode]
    : entries.filter((entry) =>
        entryMatchesTokens(entry, parsedQuery.normalizedQuery!.split(" ")),
      );
  return Object.freeze({
    status: "REVIEW_ONLY",
    data: Object.freeze([...matches]),
    query: parsedQuery.query,
    normalizedQuery: parsedQuery.normalizedQuery,
    match: exactCode
      ? "EXACT_CODE"
      : matches.length > 0
        ? "RESULTS"
        : "NO_MATCH",
    total: matches.length,
  });
}

export function filterPublicAeatModelSearchEntriesInteractiveV2(
  entries: readonly PublicAeatModelSearchEntryV2[],
  query: unknown,
): PublicAeatModelSearchEntryResultV2 {
  if (typeof query !== "string") {
    return filterPublicAeatModelSearchEntriesV2(entries, query);
  }
  if (
    [...query].length > MAX_QUERY_LENGTH ||
    UNSAFE_QUERY_CHARACTER.test(query)
  ) {
    return Object.freeze({ status: "BLOCKED", reason: "INVALID_INPUT" });
  }
  return filterPublicAeatModelSearchEntriesV2(entries, query.trim());
}
