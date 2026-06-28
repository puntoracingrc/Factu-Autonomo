import { todayISO } from "./calculations";
import type { BusinessProfile, Document } from "./types";

export const DEFAULT_QUOTE_VALIDITY_DAYS = 30;
export const MAX_QUOTE_VALIDITY_DAYS = 365;

export function normalizeQuoteValidityDays(value: unknown): number {
  if (value === null || value === undefined || value === "") {
    return DEFAULT_QUOTE_VALIDITY_DAYS;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_QUOTE_VALIDITY_DAYS;
  return Math.min(
    MAX_QUOTE_VALIDITY_DAYS,
    Math.max(0, Math.round(numeric)),
  );
}

export function quoteValidityDays(profile: BusinessProfile): number {
  return normalizeQuoteValidityDays(profile.quoteValidityDays);
}

export function quoteValidUntil(date: string, validityDays: number): string {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return "";
  const result = new Date(Date.UTC(year, month - 1, day));
  result.setUTCDate(result.getUTCDate() + normalizeQuoteValidityDays(validityDays));
  return result.toISOString().slice(0, 10);
}

export function defaultQuoteDueDate(
  date: string,
  profile: BusinessProfile,
): string {
  const days = quoteValidityDays(profile);
  if (days <= 0) return "";
  return quoteValidUntil(date, days);
}

export function isQuoteExpired(
  doc: Document,
  referenceDate = todayISO(),
): boolean {
  return (
    doc.type === "presupuesto" &&
    doc.status === "enviado" &&
    Boolean(doc.dueDate) &&
    doc.dueDate! < referenceDate
  );
}
