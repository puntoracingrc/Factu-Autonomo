import type {
  PublicAeatModelReviewPageV1,
  PublicAeatModelReviewBlockReasonV1,
} from "./public-review-catalog.v1";

const MAX_QUERY_LENGTH = 80;
const MAX_QUERY_TOKENS = 12;
const MAX_ENTRY_TEXT_LENGTH = 20_000;
const MAX_ENTRY_WORDS = 2_000;
const UNSAFE_QUERY_CHARACTER = /[\p{Cc}\p{Cf}\p{Cs}]/u;
const OFFICIAL_MODEL_CODE = /^(?:\d{2,3}|\d{2}[A-Z]|[A-Z]\d{2})$/;
const INVALID_DATA_PROPERTY = Symbol("INVALID_DATA_PROPERTY");
const trustedSearchEntries = new WeakSet<PublicAeatModelSearchEntryV2>();

export interface PublicAeatModelSearchEntryV2 {
  readonly code: string;
  readonly catalogCardId: string;
  readonly normalizedText: string;
  readonly words: readonly string[];
}

export type PublicAeatModelReviewSearchMatchV2 =
  "ALL" | "EXACT_CODE" | "RESULTS" | "NO_MATCH";

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
  const active = focusedCardId !== null && currentHash === `#${focusedCardId}`;
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
  if (normalizedQuery.length === 0 || tokens.length > MAX_QUERY_TOKENS) {
    return null;
  }
  return Object.freeze({ query: value, normalizedQuery });
}

function buildPublicAeatModelSearchEntryV2(
  page: PublicAeatModelReviewPageV1,
  additionalTerms: readonly string[],
): PublicAeatModelSearchEntryV2 {
  if (
    page === null ||
    typeof page !== "object" ||
    Array.isArray(page) ||
    !Array.isArray(additionalTerms) ||
    additionalTerms.length > MAX_ENTRY_WORDS
  ) {
    throw new TypeError("Invalid AEAT model search entry input");
  }

  let code: unknown;
  let catalogCardId: unknown;
  let kind: unknown;
  let canonicalName: unknown;
  let summary: unknown;
  let historicalNotice: unknown;
  let termsLength = 0;
  const terms: string[] = [];
  try {
    code = readOwnDataProperty(page, "code");
    catalogCardId = readOwnDataProperty(page, "catalogCardId");
    kind = readOwnDataProperty(page, "kind");
    canonicalName = readOwnDataProperty(page, "canonicalName");
    summary = readOwnDataProperty(page, "summary");
    historicalNotice = readOwnDataProperty(page, "historicalNotice");
    for (let index = 0; index < additionalTerms.length; index += 1) {
      const term = readOwnDataProperty(additionalTerms, String(index));
      if (typeof term !== "string") {
        throw new TypeError("Invalid AEAT model search term");
      }
      termsLength += term.length;
      if (termsLength > MAX_ENTRY_TEXT_LENGTH) {
        throw new TypeError("AEAT model search terms are too long");
      }
      terms.push(term);
    }
  } catch {
    throw new TypeError("Invalid AEAT model search entry input");
  }

  if (
    typeof code !== "string" ||
    !OFFICIAL_MODEL_CODE.test(code) ||
    typeof catalogCardId !== "string" ||
    catalogCardId !== `modelo-${code}` ||
    (kind !== "OFFICIAL_INDEX" && kind !== "HISTORICAL_FOUNDATION") ||
    typeof canonicalName !== "string" ||
    canonicalName.length === 0 ||
    canonicalName.length > MAX_ENTRY_TEXT_LENGTH ||
    typeof summary !== "string" ||
    summary.length > MAX_ENTRY_TEXT_LENGTH ||
    (typeof historicalNotice === "string" &&
      historicalNotice.length > MAX_ENTRY_TEXT_LENGTH) ||
    (historicalNotice !== null && typeof historicalNotice !== "string")
  ) {
    throw new TypeError("Invalid AEAT model search entry input");
  }

  const specificDescription =
    kind === "HISTORICAL_FOUNDATION"
      ? [summary, historicalNotice ?? ""].join(" ")
      : "";
  const normalizedText = normalizePublicAeatModelSearchTextV2(
    `Modelo ${code} ${canonicalName} ${specificDescription} ${terms.join(" ")}`,
  );
  const words = normalizedText.split(" ");
  if (
    normalizedText.length === 0 ||
    normalizedText.length > MAX_ENTRY_TEXT_LENGTH ||
    words.length === 0 ||
    words.length > MAX_ENTRY_WORDS
  ) {
    throw new TypeError("Invalid AEAT model search entry input");
  }
  const entry = Object.freeze({
    code,
    catalogCardId,
    normalizedText,
    words: Object.freeze(words),
  });
  trustedSearchEntries.add(entry);
  return entry;
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

function readOwnDataProperty(
  value: object,
  key: string,
): unknown | typeof INVALID_DATA_PROPERTY {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor && "value" in descriptor
    ? descriptor.value
    : INVALID_DATA_PROPERTY;
}

function copyValidSearchEntries(
  entries: readonly PublicAeatModelSearchEntryV2[],
): readonly PublicAeatModelSearchEntryV2[] | null {
  if (!Array.isArray(entries)) return null;

  const codes = new Set<string>();
  const cardIds = new Set<string>();
  const copy: PublicAeatModelSearchEntryV2[] = [];

  for (const candidate of entries as readonly unknown[]) {
    if (
      candidate === null ||
      typeof candidate !== "object" ||
      Array.isArray(candidate)
    ) {
      return null;
    }

    if (trustedSearchEntries.has(candidate as PublicAeatModelSearchEntryV2)) {
      const trusted = candidate as PublicAeatModelSearchEntryV2;
      if (codes.has(trusted.code) || cardIds.has(trusted.catalogCardId)) {
        return null;
      }
      codes.add(trusted.code);
      cardIds.add(trusted.catalogCardId);
      copy.push(trusted);
      continue;
    }

    const code = readOwnDataProperty(candidate, "code");
    const catalogCardId = readOwnDataProperty(candidate, "catalogCardId");
    const normalizedText = readOwnDataProperty(candidate, "normalizedText");
    const wordsCandidate = readOwnDataProperty(candidate, "words");
    if (
      typeof code !== "string" ||
      !OFFICIAL_MODEL_CODE.test(code) ||
      typeof catalogCardId !== "string" ||
      catalogCardId.length === 0 ||
      catalogCardId.length > 200 ||
      catalogCardId !== `modelo-${code}` ||
      typeof normalizedText !== "string" ||
      normalizedText.length === 0 ||
      normalizedText.length > MAX_ENTRY_TEXT_LENGTH ||
      normalizePublicAeatModelSearchTextV2(normalizedText) !== normalizedText ||
      !Array.isArray(wordsCandidate) ||
      wordsCandidate.length === 0 ||
      wordsCandidate.length > MAX_ENTRY_WORDS ||
      codes.has(code) ||
      cardIds.has(catalogCardId)
    ) {
      return null;
    }

    const words: string[] = [];
    for (let index = 0; index < wordsCandidate.length; index += 1) {
      const word = readOwnDataProperty(wordsCandidate, String(index));
      if (typeof word !== "string" || word.length === 0) return null;
      words.push(word);
    }
    if (words.join(" ") !== normalizedText) return null;

    codes.add(code);
    cardIds.add(catalogCardId);
    copy.push(
      Object.freeze({
        code,
        catalogCardId,
        normalizedText,
        words: Object.freeze(words),
      }),
    );
  }

  return Object.freeze(copy);
}

export function filterPublicAeatModelSearchEntriesV2(
  entries: readonly PublicAeatModelSearchEntryV2[],
  query: unknown,
): PublicAeatModelSearchEntryResultV2 {
  let safeEntries: readonly PublicAeatModelSearchEntryV2[] | null;
  try {
    safeEntries = copyValidSearchEntries(entries);
  } catch {
    safeEntries = null;
  }
  if (!safeEntries) {
    return Object.freeze({ status: "BLOCKED", reason: "INVALID_INPUT" });
  }
  const parsedQuery = parseQuery(query);
  if (!parsedQuery) {
    return Object.freeze({ status: "BLOCKED", reason: "INVALID_INPUT" });
  }
  if (parsedQuery.query === null || parsedQuery.normalizedQuery === null) {
    return Object.freeze({
      status: "REVIEW_ONLY",
      data: safeEntries,
      query: null,
      normalizedQuery: null,
      match: "ALL",
      total: safeEntries.length,
    });
  }

  const queryTokens = parsedQuery.normalizedQuery.split(" ");
  const exactEntry = safeEntries.find((entry) => {
    const normalizedCode = entry.code.toLocaleLowerCase("es");
    return (
      normalizedCode === parsedQuery.normalizedQuery ||
      `modelo ${normalizedCode}` === parsedQuery.normalizedQuery
    );
  });
  const codeTokenEntries = safeEntries.filter((entry) =>
    queryTokens.includes(entry.code.toLocaleLowerCase("es")),
  );
  if (codeTokenEntries.length > 1) {
    return Object.freeze({ status: "BLOCKED", reason: "INVALID_INPUT" });
  }
  const codeConstrainedEntry =
    codeTokenEntries.length === 1 ? codeTokenEntries[0] : undefined;
  const matches = exactEntry
    ? [exactEntry]
    : codeConstrainedEntry
      ? entryMatchesTokens(codeConstrainedEntry, queryTokens)
        ? [codeConstrainedEntry]
        : []
      : safeEntries.filter((entry) => entryMatchesTokens(entry, queryTokens));
  return Object.freeze({
    status: "REVIEW_ONLY",
    data: Object.freeze([...matches]),
    query: parsedQuery.query,
    normalizedQuery: parsedQuery.normalizedQuery,
    match: exactEntry
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
