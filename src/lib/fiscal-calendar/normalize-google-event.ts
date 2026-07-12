import { createHash } from "node:crypto";
import { isDateOnly } from "./dates";
import type { FiscalCalendarEvent, FiscalCalendarEventStatus } from "./types";
import { getAeatCalendarSource } from "./catalog";
import type { FiscalCalendarCategory } from "./types";

const MAX_RAW_TEXT_LENGTH = 20_000;
const MAX_TITLE_LENGTH = 300;
const MAX_DESCRIPTION_LENGTH = 5_000;
const MAX_IDENTIFIER_LENGTH = 1_024;
const MAX_MULTILINE_TEXT_LINES = 100;
const STRUCTURAL_BREAK = "\uE000";

export interface GoogleCalendarEventDate {
  date?: unknown;
  dateTime?: unknown;
  timeZone?: unknown;
}

export interface GoogleCalendarEventPayload {
  id?: unknown;
  iCalUID?: unknown;
  status?: unknown;
  summary?: unknown;
  description?: unknown;
  start?: GoogleCalendarEventDate;
  end?: GoogleCalendarEventDate;
  updated?: unknown;
}

const HTML_ENTITIES: Readonly<Record<string, string>> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

function truncateCodePoints(value: string, maxLength: number): string {
  const characters: string[] = [];
  const limit = Math.max(0, maxLength);
  for (const character of value) {
    if (characters.length >= limit) break;
    characters.push(character);
  }
  return characters.join("");
}

function decodeHtmlEntities(value: string): string {
  return value.replace(
    /&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi,
    (entity, decimal: string, hexadecimal: string, named: string) => {
      if (decimal) {
        const codePoint = Number(decimal);
        return Number.isSafeInteger(codePoint) && codePoint <= 0x10ffff
          ? String.fromCodePoint(codePoint)
          : entity;
      }
      if (hexadecimal) {
        const codePoint = Number.parseInt(hexadecimal, 16);
        return Number.isSafeInteger(codePoint) && codePoint <= 0x10ffff
          ? String.fromCodePoint(codePoint)
          : entity;
      }
      return HTML_ENTITIES[named.toLowerCase()] ?? entity;
    },
  );
}

export function sanitizeFiscalCalendarText(
  value: unknown,
  options: { maxLength: number; multiline?: boolean },
): string {
  if (typeof value !== "string") return "";
  const decoded = decodeHtmlEntities(
    truncateCodePoints(value, MAX_RAW_TEXT_LENGTH),
  ).replaceAll(STRUCTURAL_BREAK, " ");
  const withoutActiveBlocks = decoded
    .replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<(?:script|style|noscript)\b[\s\S]*$/gi, " ")
    .replace(/<!--[^]*?-->/g, " ")
    .replace(/<!--[\s\S]*$/g, " ");
  const withStructuralBreaks = withoutActiveBlocks
    .replace(/<(?:br|hr)\b[^>]*\/?\s*>/gi, STRUCTURAL_BREAK)
    .replace(
      /<\/?(?:p|div|li|ul|ol|section|article|header|footer|h[1-6]|tr)\b[^>]*>/gi,
      STRUCTURAL_BREAK,
    );
  const withoutTags = withStructuralBreaks
    .replace(/<[^>]*>/g, " ")
    .replace(/<\/?[a-z][^>]*$/gi, " ");
  const withoutControls = withoutTags.replace(
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,
    " ",
  );
  const normalized = options.multiline
    ? withoutControls
        .split(STRUCTURAL_BREAK)
        .map((line) => line.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .slice(0, MAX_MULTILINE_TEXT_LINES)
        .join("\n")
    : withoutControls
        .replaceAll(STRUCTURAL_BREAK, " ")
        .replace(/\s+/g, " ")
        .trim();
  return truncateCodePoints(normalized, options.maxLength).trim();
}

function safeIdentifier(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const clean = value
    .trim()
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .slice(0, MAX_IDENTIFIER_LENGTH);
  return clean || null;
}

function normalizedTimestamp(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds)
    ? new Date(milliseconds).toISOString()
    : null;
}

function normalizeStatus(value: unknown): FiscalCalendarEventStatus {
  if (value === "confirmed" || value === "cancelled" || value === "tentative") {
    return value;
  }
  return "unknown";
}

function normalizeEventDates(
  start: GoogleCalendarEventDate | undefined,
  end: GoogleCalendarEventDate | undefined,
): Pick<
  FiscalCalendarEvent,
  "startDate" | "endDateExclusive" | "allDay"
> | null {
  if (
    typeof start?.date === "string" &&
    typeof end?.date === "string" &&
    isDateOnly(start.date) &&
    isDateOnly(end.date) &&
    end.date > start.date
  ) {
    return {
      startDate: start.date,
      endDateExclusive: end.date,
      allDay: true,
    };
  }

  const startDate = normalizedTimestamp(start?.dateTime);
  const endDateExclusive = normalizedTimestamp(end?.dateTime);
  if (
    startDate &&
    endDateExclusive &&
    Date.parse(endDateExclusive) > Date.parse(startDate)
  ) {
    return { startDate, endDateExclusive, allDay: false };
  }
  return null;
}

function internalEventId(
  category: FiscalCalendarCategory,
  externalEventId: string,
): string {
  const digest = createHash("sha256")
    .update(`AEAT\0${category}\0${externalEventId}`)
    .digest("hex");
  return `aeat_${digest.slice(0, 32)}`;
}

export function normalizeGoogleCalendarEvent(
  payload: GoogleCalendarEventPayload,
  category: FiscalCalendarCategory,
  fetchedAt: string,
): FiscalCalendarEvent | null {
  const source = getAeatCalendarSource(category);
  const externalEventId = safeIdentifier(payload.id);
  const dates = normalizeEventDates(payload.start, payload.end);
  if (!externalEventId || !dates) return null;

  const title = sanitizeFiscalCalendarText(payload.summary, {
    maxLength: MAX_TITLE_LENGTH,
  });
  const iCalUID = safeIdentifier(payload.iCalUID);

  return {
    id: internalEventId(category, externalEventId),
    source: "AEAT",
    sourceProvider: "google-calendar",
    sourceCalendarKey: category,
    sourceCalendarId: source.calendarId,
    externalEventId,
    iCalUID,
    title: title || "Vencimiento fiscal sin título",
    description: sanitizeFiscalCalendarText(payload.description, {
      maxLength: MAX_DESCRIPTION_LENGTH,
      multiline: true,
    }),
    category,
    deadlineKind: "unclassified",
    reviewStatus: "review-with-advisor",
    ...dates,
    status: normalizeStatus(payload.status),
    sourceUpdatedAt: normalizedTimestamp(payload.updated),
    fetchedAt,
  };
}

export function sortFiscalCalendarEvents(
  events: readonly FiscalCalendarEvent[],
): FiscalCalendarEvent[] {
  return [...events].sort(
    (left, right) =>
      left.startDate.localeCompare(right.startDate) ||
      left.endDateExclusive.localeCompare(right.endDateExclusive) ||
      left.id.localeCompare(right.id),
  );
}
