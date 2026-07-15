import type { FiscalNotificationGuideEntryV1 } from "@/lib/fiscal-notifications/guide/catalog.v1";

export const FISCAL_NOTIFICATION_GUIDE_SEARCH_MAX_LENGTH_V1 = 80 as const;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;
const COMBINING_MARK_PATTERN = /[\u0300-\u036f]/gu;
const SEPARATOR_PATTERN = /[^a-z0-9]+/gu;

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(COMBINING_MARK_PATTERN, "")
    .toLocaleLowerCase("es")
    .replace(SEPARATOR_PATTERN, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function searchableText(entry: FiscalNotificationGuideEntryV1): string {
  return normalizeSearchText(
    [
      entry.familyId,
      entry.nameEs,
      entry.categoryLabel,
      ...entry.aliases,
      ...(entry.plainLanguage
        ? [
            entry.plainLanguage.inShort,
            entry.plainLanguage.whyItUsuallyArrives,
            entry.plainLanguage.usualNextStep,
            entry.plainLanguage.deadline.title,
            ...entry.plainLanguage.searchTerms,
          ]
        : []),
      ...entry.sources.map((source) => source.title),
    ].join(" "),
  );
}

export type FiscalNotificationGuideSearchResultV1 =
  | Readonly<{
      status: "READY";
      query: string;
      entries: readonly FiscalNotificationGuideEntryV1[];
      total: number;
    }>
  | Readonly<{
      status: "BLOCKED";
      query: "";
      entries: readonly FiscalNotificationGuideEntryV1[];
      total: 0;
      reason: "INVALID_QUERY";
    }>;

export function searchFiscalNotificationGuideV1(
  entries: readonly FiscalNotificationGuideEntryV1[],
  rawQuery: unknown,
): FiscalNotificationGuideSearchResultV1 {
  if (
    typeof rawQuery !== "string" ||
    rawQuery.length > FISCAL_NOTIFICATION_GUIDE_SEARCH_MAX_LENGTH_V1 ||
    CONTROL_CHARACTER_PATTERN.test(rawQuery)
  ) {
    return Object.freeze({
      status: "BLOCKED",
      query: "",
      entries: Object.freeze([]),
      total: 0,
      reason: "INVALID_QUERY",
    });
  }

  const query = rawQuery.trim();
  const normalizedQuery = normalizeSearchText(query);
  const tokens = normalizedQuery ? normalizedQuery.split(" ") : [];
  const matches = entries.filter((entry) => {
    if (tokens.length === 0) return true;
    const haystack = searchableText(entry);
    return tokens.every((token) => haystack.includes(token));
  });

  return Object.freeze({
    status: "READY",
    query,
    entries: Object.freeze([...matches]),
    total: matches.length,
  });
}
