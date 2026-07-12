import { FiscalCalendarValidationError } from "./errors";
import type { FiscalCalendarDateRange, FiscalCalendarEvent } from "./types";

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MAX_RANGE_DAYS = 366;
const MADRID_TIME_ZONE = "Europe/Madrid";

interface DateParts {
  year: number;
  month: number;
  day: number;
}

function parseDateOnlyParts(value: string): DateParts | null {
  const match = DATE_ONLY.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

export function isDateOnly(value: string): boolean {
  return parseDateOnlyParts(value) !== null;
}

function civilDayNumber(value: string): number {
  const parts = parseDateOnlyParts(value);
  if (!parts) {
    throw new FiscalCalendarValidationError("La fecha indicada no es válida.");
  }
  return Math.floor(
    Date.UTC(parts.year, parts.month - 1, parts.day) / 86_400_000,
  );
}

export function addCivilDays(value: string, days: number): string {
  const parts = parseDateOnlyParts(value);
  if (!parts || !Number.isInteger(days)) {
    throw new FiscalCalendarValidationError("La fecha indicada no es válida.");
  }
  const result = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day + days),
  );
  return [
    result.getUTCFullYear().toString().padStart(4, "0"),
    (result.getUTCMonth() + 1).toString().padStart(2, "0"),
    result.getUTCDate().toString().padStart(2, "0"),
  ].join("-");
}

function zonedParts(date: Date): Required<DateParts> & {
  hour: number;
  minute: number;
  second: number;
} {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: MADRID_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((item) => item.type === type)?.value);
  return {
    year: part("year"),
    month: part("month"),
    day: part("day"),
    hour: part("hour"),
    minute: part("minute"),
    second: part("second"),
  };
}

function madridMidnightIso(value: string): string {
  const parts = parseDateOnlyParts(value);
  if (!parts) {
    throw new FiscalCalendarValidationError("La fecha indicada no es válida.");
  }

  const intendedUtc = Date.UTC(parts.year, parts.month - 1, parts.day);
  let candidate = intendedUtc;
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const actual = zonedParts(new Date(candidate));
    const actualAsUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
    );
    candidate += intendedUtc - actualAsUtc;
  }
  return new Date(candidate).toISOString();
}

export function createFiscalCalendarDateRange(
  startDate: string,
  endDateInclusive: string,
): FiscalCalendarDateRange {
  const firstDay = civilDayNumber(startDate);
  const lastDay = civilDayNumber(endDateInclusive);
  if (lastDay < firstDay) {
    throw new FiscalCalendarValidationError(
      "La fecha final debe ser igual o posterior a la inicial.",
    );
  }
  if (lastDay - firstDay + 1 > MAX_RANGE_DAYS) {
    throw new FiscalCalendarValidationError(
      "El rango máximo del calendario es de 366 días.",
    );
  }

  const endDateExclusive = addCivilDays(endDateInclusive, 1);
  return {
    startDate,
    endDateExclusive,
    timeMin: madridMidnightIso(startDate),
    timeMax: madridMidnightIso(endDateExclusive),
  };
}

export function todayInMadrid(now = new Date()): string {
  const parts = zonedParts(now);
  return [
    parts.year.toString().padStart(4, "0"),
    parts.month.toString().padStart(2, "0"),
    parts.day.toString().padStart(2, "0"),
  ].join("-");
}

export function defaultFiscalCalendarRange(now = new Date()): {
  startDate: string;
  endDateInclusive: string;
} {
  const startDate = todayInMadrid(now);
  return { startDate, endDateInclusive: addCivilDays(startDate, 120) };
}

export function eventOverlapsRange(
  event: FiscalCalendarEvent,
  range: FiscalCalendarDateRange,
): boolean {
  if (event.allDay) {
    return (
      event.endDateExclusive > range.startDate &&
      event.startDate < range.endDateExclusive
    );
  }
  const start = Date.parse(event.startDate);
  const end = Date.parse(event.endDateExclusive);
  return end > Date.parse(range.timeMin) && start < Date.parse(range.timeMax);
}

export function formatFiscalCalendarEventDate(
  event: Pick<
    FiscalCalendarEvent,
    "allDay" | "startDate" | "endDateExclusive"
  >,
): string {
  if (event.allDay) {
    const start = dateOnlyForFormatting(event.startDate);
    const inclusiveEnd = addCivilDays(event.endDateExclusive, -1);
    const format = new Intl.DateTimeFormat("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
    if (inclusiveEnd === event.startDate) return format.format(start);
    return `${format.format(start)} – ${format.format(
      dateOnlyForFormatting(inclusiveEnd),
    )}`;
  }

  const format = new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: MADRID_TIME_ZONE,
  });
  return `${format.format(new Date(event.startDate))} – ${format.format(
    new Date(event.endDateExclusive),
  )}`;
}

export function formatFiscalCalendarFetchedAt(value: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: MADRID_TIME_ZONE,
  }).format(new Date(value));
}

function dateOnlyForFormatting(value: string): Date {
  const parts = parseDateOnlyParts(value);
  if (!parts) {
    throw new FiscalCalendarValidationError("La fecha indicada no es válida.");
  }
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12));
}
