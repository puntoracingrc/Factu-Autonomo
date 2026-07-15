import {
  addCivilDays,
  formatFiscalCalendarEventDate,
} from "./dates";
import type { FiscalCalendarEvent } from "./types";

export const FISCAL_CALENDAR_REMINDER_STORAGE_KEY =
  "factu:fiscal-calendar:reminder-draft:v1" as const;
export const FISCAL_CALENDAR_REMINDER_TARGET_HREF =
  "/avisos?origen=calendario#nuevo-recordatorio" as const;

const REMINDER_DRAFT_TTL_MS = 15 * 60_000;
const MAX_FUTURE_CLOCK_SKEW_MS = 60_000;
const MAX_SERIALIZED_BYTES = 2_048;
const MAX_TEXT_CODE_POINTS = 600;
const MAX_TITLE_CODE_POINTS = 360;
const EXACT_KEYS = ["createdAt", "origin", "schemaVersion", "text"] as const;

export interface FiscalCalendarReminderDraftV1 {
  schemaVersion: 1;
  origin: "fiscal-calendar";
  text: string;
  createdAt: string;
}

export interface FiscalCalendarReminderDraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type StoreFiscalCalendarReminderDraftResult =
  | { ok: true }
  | { ok: false; reason: "INVALID_DRAFT" | "STORAGE_UNAVAILABLE" };

export type ConsumeFiscalCalendarReminderDraftResult =
  | { ok: true; draft: FiscalCalendarReminderDraftV1 }
  | {
      ok: false;
      reason:
        | "MISSING"
        | "INVALID_DRAFT"
        | "EXPIRED"
        | "STORAGE_UNAVAILABLE";
    };

function truncateCodePoints(value: string, maximum: number): string {
  const codePoints = Array.from(value);
  if (codePoints.length <= maximum) return value;
  return `${codePoints.slice(0, Math.max(0, maximum - 1)).join("")}…`;
}

function normalizePlainText(value: string): string {
  return value
    .replace(/<[^>]{0,200}>/gu, " ")
    .replace(/[<>]/gu, " ")
    .replace(/[\u0000-\u001f\u007f-\u009f]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function serializedByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function parseDraft(
  value: unknown,
  nowMs: number,
): ConsumeFiscalCalendarReminderDraftResult {
  if (!isPlainRecord(value)) return { ok: false, reason: "INVALID_DRAFT" };
  const keys = Object.keys(value).sort();
  if (
    keys.length !== EXACT_KEYS.length ||
    !EXACT_KEYS.every((key, index) => keys[index] === key)
  ) {
    return { ok: false, reason: "INVALID_DRAFT" };
  }
  if (
    value.schemaVersion !== 1 ||
    value.origin !== "fiscal-calendar" ||
    typeof value.text !== "string" ||
    typeof value.createdAt !== "string"
  ) {
    return { ok: false, reason: "INVALID_DRAFT" };
  }

  const text = value.text;
  if (
    !text ||
    Array.from(text).length > MAX_TEXT_CODE_POINTS ||
    normalizePlainText(text) !== text
  ) {
    return { ok: false, reason: "INVALID_DRAFT" };
  }

  const createdAtMs = Date.parse(value.createdAt);
  if (
    !Number.isFinite(createdAtMs) ||
    new Date(createdAtMs).toISOString() !== value.createdAt
  ) {
    return { ok: false, reason: "INVALID_DRAFT" };
  }
  if (createdAtMs - nowMs > MAX_FUTURE_CLOCK_SKEW_MS) {
    return { ok: false, reason: "INVALID_DRAFT" };
  }
  if (nowMs - createdAtMs > REMINDER_DRAFT_TTL_MS) {
    return { ok: false, reason: "EXPIRED" };
  }

  return {
    ok: true,
    draft: {
      schemaVersion: 1,
      origin: "fiscal-calendar",
      text,
      createdAt: value.createdAt,
    },
  };
}

function reminderDateLabel(event: FiscalCalendarEvent): string {
  if (!event.allDay) return "Horario publicado por la AEAT";
  return event.endDateExclusive === addCivilDays(event.startDate, 1)
    ? "Fecha publicada por la AEAT"
    : "Periodo publicado por la AEAT";
}

export function createFiscalCalendarReminderDraft(
  event: FiscalCalendarEvent,
  now = new Date(),
): FiscalCalendarReminderDraftV1 {
  const normalizedTitle = normalizePlainText(event.title);
  const title = truncateCodePoints(
    normalizedTitle || "Evento del calendario fiscal",
    MAX_TITLE_CODE_POINTS,
  );
  const date = normalizePlainText(formatFiscalCalendarEventDate(event));
  const text = truncateCodePoints(
    normalizePlainText(
      `Revisar si me afecta: ${title} · ${reminderDateLabel(event)}: ${date}.`,
    ),
    MAX_TEXT_CODE_POINTS,
  );

  return {
    schemaVersion: 1,
    origin: "fiscal-calendar",
    text,
    createdAt: now.toISOString(),
  };
}

export function storeFiscalCalendarReminderDraft(
  storage: FiscalCalendarReminderDraftStorage,
  draft: FiscalCalendarReminderDraftV1,
): StoreFiscalCalendarReminderDraftResult {
  const parsed = parseDraft(draft, Date.parse(draft.createdAt));
  if (!parsed.ok) return { ok: false, reason: "INVALID_DRAFT" };

  const serialized = JSON.stringify(parsed.draft);
  if (serializedByteLength(serialized) > MAX_SERIALIZED_BYTES) {
    return { ok: false, reason: "INVALID_DRAFT" };
  }
  try {
    storage.setItem(FISCAL_CALENDAR_REMINDER_STORAGE_KEY, serialized);
    return { ok: true };
  } catch {
    return { ok: false, reason: "STORAGE_UNAVAILABLE" };
  }
}

export function consumeFiscalCalendarReminderDraft(
  storage: FiscalCalendarReminderDraftStorage,
  now = new Date(),
): ConsumeFiscalCalendarReminderDraftResult {
  let raw: string | null;
  try {
    raw = storage.getItem(FISCAL_CALENDAR_REMINDER_STORAGE_KEY);
    if (raw !== null) {
      storage.removeItem(FISCAL_CALENDAR_REMINDER_STORAGE_KEY);
    }
  } catch {
    return { ok: false, reason: "STORAGE_UNAVAILABLE" };
  }
  if (raw === null) return { ok: false, reason: "MISSING" };
  if (serializedByteLength(raw) > MAX_SERIALIZED_BYTES) {
    return { ok: false, reason: "INVALID_DRAFT" };
  }

  let value: unknown;
  try {
    value = JSON.parse(raw) as unknown;
  } catch {
    return { ok: false, reason: "INVALID_DRAFT" };
  }
  return parseDraft(value, now.getTime());
}
