import { isDateOnly } from "./dates";
import { isCanonicalFiscalCalendarModelPageLink } from "./model-reference-links";
import {
  FISCAL_CALENDAR_CATEGORIES,
  type FiscalCalendarCategory,
  type FiscalCalendarCategoryOption,
  type FiscalCalendarEvent,
  type FiscalCalendarModelPageLink,
  type FiscalCalendarOfficialSource,
  type FiscalCalendarResponseData,
} from "./types";

const MAX_EVENTS = 1_000;
const MAX_MODEL_PAGE_LINKS = 1_000;
const MAX_IDENTIFIER_LENGTH = 1_024;
const MAX_TITLE_LENGTH = 300;
const MAX_DESCRIPTION_LENGTH = 5_000;
const MAX_DESCRIPTION_LINES = 100;
const MAX_CATEGORY_LABEL_LENGTH = 100;
const MAX_SOURCE_ID_LENGTH = 200;
const MAX_SOURCE_TITLE_LENGTH = 300;
const MAX_SOURCE_URL_LENGTH = 2_048;
const MAX_CATALOG_VERSION_LENGTH = 200;

const EVENT_STATUSES = new Set([
  "confirmed",
  "tentative",
  "cancelled",
  "unknown",
]);
const DEADLINE_KINDS = new Set([
  "general-filing",
  "direct-debit",
  "exception",
  "unclassified",
]);
const REVIEW_STATUSES = new Set([
  "source-classified",
  "source-published",
  "review-with-advisor",
]);
const PROVIDER_MODES = new Set([
  "aeat-icalendar",
  "fixture",
  "google-calendar",
  "review-only",
]);
const CATEGORY_SET = new Set<string>(FISCAL_CALENDAR_CATEGORIES);
const SHA256 = /^[0-9a-f]{64}$/;
const RFC3339 =
  /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(Z|([+-])(\d{2}):(\d{2}))$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isBoundedString(
  value: unknown,
  maximumCodePoints: number,
  allowEmpty = false,
): value is string {
  if (typeof value !== "string") return false;
  if (!allowEmpty && value.length === 0) return false;
  if (value.length > maximumCodePoints * 2) return false;
  return Array.from(value).length <= maximumCodePoints;
}

function isRfc3339(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = RFC3339.exec(value);
  if (!match || !isDateOnly(match[1])) return false;
  const hour = Number(match[2]);
  const minute = Number(match[3]);
  const second = Number(match[4]);
  if (hour > 23 || minute > 59 || second > 59) return false;
  if (match[5] !== "Z") {
    const offsetHour = Number(match[7]);
    const offsetMinute = Number(match[8]);
    if (
      offsetHour > 14 ||
      offsetMinute > 59 ||
      (offsetHour === 14 && offsetMinute !== 0)
    ) {
      return false;
    }
  }
  return Number.isFinite(Date.parse(value));
}

function isCategory(value: unknown): value is FiscalCalendarCategory {
  return typeof value === "string" && CATEGORY_SET.has(value);
}

function hasSafeIdentifier(value: unknown): value is string {
  return (
    isBoundedString(value, MAX_IDENTIFIER_LENGTH) &&
    value.trim() === value &&
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}

function isEvent(value: unknown): value is FiscalCalendarEvent {
  if (!isRecord(value)) return false;
  if (
    !hasSafeIdentifier(value.id) ||
    value.source !== "AEAT" ||
    value.sourceProvider !== "google-calendar" ||
    !isCategory(value.category) ||
    value.sourceCalendarKey !== value.category ||
    !hasSafeIdentifier(value.sourceCalendarId) ||
    !hasSafeIdentifier(value.externalEventId) ||
    (value.iCalUID !== null && !hasSafeIdentifier(value.iCalUID)) ||
    !isBoundedString(value.title, MAX_TITLE_LENGTH) ||
    !isBoundedString(value.description, MAX_DESCRIPTION_LENGTH, true) ||
    value.description.split("\n").length > MAX_DESCRIPTION_LINES ||
    typeof value.deadlineKind !== "string" ||
    !DEADLINE_KINDS.has(value.deadlineKind) ||
    typeof value.reviewStatus !== "string" ||
    !REVIEW_STATUSES.has(value.reviewStatus) ||
    typeof value.allDay !== "boolean" ||
    typeof value.status !== "string" ||
    !EVENT_STATUSES.has(value.status) ||
    (value.sourceUpdatedAt !== null && !isRfc3339(value.sourceUpdatedAt)) ||
    !isRfc3339(value.fetchedAt)
  ) {
    return false;
  }

  if (value.allDay) {
    return (
      typeof value.startDate === "string" &&
      typeof value.endDateExclusive === "string" &&
      isDateOnly(value.startDate) &&
      isDateOnly(value.endDateExclusive) &&
      value.endDateExclusive > value.startDate
    );
  }

  return (
    isRfc3339(value.startDate) &&
    isRfc3339(value.endDateExclusive) &&
    Date.parse(value.endDateExclusive) > Date.parse(value.startDate)
  );
}

function areEvents(value: unknown): value is readonly FiscalCalendarEvent[] {
  if (!Array.isArray(value) || value.length > MAX_EVENTS) return false;
  const identifiers = new Set<string>();
  for (const event of value) {
    if (!isEvent(event) || identifiers.has(event.id)) return false;
    identifiers.add(event.id);
  }
  return true;
}

function isCategoryOption(
  value: unknown,
): value is FiscalCalendarCategoryOption {
  return (
    isRecord(value) &&
    isCategory(value.key) &&
    isBoundedString(value.label, MAX_CATEGORY_LABEL_LENGTH)
  );
}

function areCategoryOptions(
  value: unknown,
): value is readonly FiscalCalendarCategoryOption[] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > FISCAL_CALENDAR_CATEGORIES.length
  ) {
    return false;
  }
  const keys = new Set<string>();
  for (const option of value) {
    if (!isCategoryOption(option) || keys.has(option.key)) return false;
    keys.add(option.key);
  }
  return true;
}

function isOfficialSource(
  value: unknown,
): value is FiscalCalendarOfficialSource {
  if (
    !isRecord(value) ||
    !isBoundedString(value.id, MAX_SOURCE_ID_LENGTH) ||
    value.authority !== "AEAT" ||
    !isBoundedString(value.title, MAX_SOURCE_TITLE_LENGTH) ||
    !isBoundedString(value.officialUrl, MAX_SOURCE_URL_LENGTH) ||
    typeof value.retrievedAt !== "string" ||
    !isDateOnly(value.retrievedAt) ||
    value.verificationStatus !== "VERIFIED" ||
    value.scope !== "GENERAL_INFORMATION" ||
    !isBoundedString(value.catalogVersion, MAX_CATALOG_VERSION_LENGTH) ||
    typeof value.catalogContentSha256 !== "string" ||
    !SHA256.test(value.catalogContentSha256)
  ) {
    return false;
  }
  try {
    const url = new URL(value.officialUrl);
    return (
      url.protocol === "https:" &&
      url.port === "" &&
      url.hostname === "sede.agenciatributaria.gob.es" &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

function areModelPageLinks(
  value: unknown,
): value is readonly FiscalCalendarModelPageLink[] {
  if (!Array.isArray(value) || value.length > MAX_MODEL_PAGE_LINKS)
    return false;
  const codes = new Set<string>();
  for (const link of value) {
    if (!isCanonicalFiscalCalendarModelPageLink(link) || codes.has(link.code)) {
      return false;
    }
    codes.add(link.code);
  }
  return true;
}

function parseResponseData(value: unknown): FiscalCalendarResponseData | null {
  if (!isRecord(value) || !isRecord(value.data)) return null;
  const data = value.data;
  if (
    !areEvents(data.events) ||
    !isRfc3339(data.fetchedAt) ||
    typeof data.providerMode !== "string" ||
    !PROVIDER_MODES.has(data.providerMode) ||
    typeof data.truncated !== "boolean" ||
    !areCategoryOptions(data.categories) ||
    !isOfficialSource(data.officialSource) ||
    data.timeZone !== "Europe/Madrid" ||
    data.generalInformationOnly !== true ||
    !areModelPageLinks(data.modelPageLinks)
  ) {
    return null;
  }
  return data as unknown as FiscalCalendarResponseData;
}

/** Valida por completo la frontera JSON antes de entregar datos al render. */
export function parseFiscalCalendarResponseData(
  value: unknown,
): FiscalCalendarResponseData | null {
  try {
    return parseResponseData(value);
  } catch {
    return null;
  }
}
