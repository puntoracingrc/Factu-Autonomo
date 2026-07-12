import { createHash } from "node:crypto";
import {
  FISCAL_CALENDAR_CATEGORIES,
  type FiscalCalendarCategory,
  type FiscalCalendarCategoryOption,
  type FiscalCalendarOfficialSource,
} from "./types";
import { FiscalCalendarValidationError } from "./errors";

export const FISCAL_CALENDAR_TIME_ZONE = "Europe/Madrid" as const;
export const AEAT_CALENDAR_CATALOG_VERSION =
  "aeat-public-calendars-2026-07-13.v2" as const;
export const AEAT_CALENDAR_CATALOG_CONTENT_SHA256 =
  "06bc4f95059c421d790d18ddc6d38218484ddb7a1ef6e351abf12aefa7973ee4" as const;

interface AeatCalendarSource {
  key: FiscalCalendarCategory;
  label: string;
  calendarId: string;
  icalUrl: string;
}

/** Única allowlist de calendarios consultables por el proveedor. */
export const AEAT_CALENDAR_SOURCES = {
  renta: {
    key: "renta",
    label: "Renta",
    calendarId: "invitado2aeat@gmail.com",
    icalUrl:
      "https://calendar.google.com/calendar/ical/invitado2aeat%40gmail.com/public/basic.ics",
  },
  renta_sociedades: {
    key: "renta_sociedades",
    label: "Renta y Sociedades",
    calendarId:
      "aio2b0s64q65r7v87j5ma8fvog@group.calendar.google.com",
    icalUrl:
      "https://calendar.google.com/calendar/ical/aio2b0s64q65r7v87j5ma8fvog%40group.calendar.google.com/public/basic.ics",
  },
  sociedades: {
    key: "sociedades",
    label: "Sociedades",
    calendarId:
      "b7g1j3bod3gdjbka03uo6kr988@group.calendar.google.com",
    icalUrl:
      "https://calendar.google.com/calendar/ical/b7g1j3bod3gdjbka03uo6kr988%40group.calendar.google.com/public/basic.ics",
  },
  iva: {
    key: "iva",
    label: "IVA",
    calendarId:
      "517mcuhcis0lldnp9b7c0nk2q8@group.calendar.google.com",
    icalUrl:
      "https://calendar.google.com/calendar/ical/517mcuhcis0lldnp9b7c0nk2q8%40group.calendar.google.com/public/basic.ics",
  },
  declaraciones_informativas: {
    key: "declaraciones_informativas",
    label: "Declaraciones informativas",
    calendarId:
      "hqp9h5ft4snag42aea96791g28@group.calendar.google.com",
    icalUrl:
      "https://calendar.google.com/calendar/ical/hqp9h5ft4snag42aea96791g28%40group.calendar.google.com/public/basic.ics",
  },
} as const satisfies Record<FiscalCalendarCategory, AeatCalendarSource>;

export const AEAT_FISCAL_CALENDAR_OFFICIAL_SOURCE = {
  id: "aeat-calendario-contribuyente-icalendar",
  authority: "AEAT",
  title: "Calendario del contribuyente — integración iCalendar",
  officialUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/icalendar/instrucciones-integrar-calendario.html",
  retrievedAt: "2026-07-13",
  verificationStatus: "VERIFIED",
  scope: "GENERAL_INFORMATION",
  catalogVersion: AEAT_CALENDAR_CATALOG_VERSION,
  catalogContentSha256: AEAT_CALENDAR_CATALOG_CONTENT_SHA256,
} as const satisfies FiscalCalendarOfficialSource;

export function fiscalCalendarCategoryOptions(): readonly FiscalCalendarCategoryOption[] {
  return FISCAL_CALENDAR_CATEGORIES.map((key) => ({
    key,
    label: AEAT_CALENDAR_SOURCES[key].label,
  }));
}

export function getAeatCalendarSource(
  key: FiscalCalendarCategory,
): AeatCalendarSource {
  const source = AEAT_CALENDAR_SOURCES[key];
  if (!source) {
    throw new FiscalCalendarValidationError(
      "La categoría de calendario no está permitida.",
    );
  }
  return source;
}

export function parseFiscalCalendarCategories(
  values: readonly string[],
): FiscalCalendarCategory[] {
  const requested = values.length > 0 ? values : FISCAL_CALENDAR_CATEGORIES;
  const unique = new Set<FiscalCalendarCategory>();

  for (const value of requested) {
    if (
      !FISCAL_CALENDAR_CATEGORIES.includes(
        value as FiscalCalendarCategory,
      )
    ) {
      throw new FiscalCalendarValidationError(
        "Una de las categorías solicitadas no está permitida.",
      );
    }
    unique.add(value as FiscalCalendarCategory);
  }

  if (unique.size === 0) {
    throw new FiscalCalendarValidationError(
      "Selecciona al menos una categoría.",
    );
  }

  return FISCAL_CALENDAR_CATEGORIES.filter((key) => unique.has(key));
}

export function calculateAeatCalendarCatalogHash(): string {
  const canonicalEntries = FISCAL_CALENDAR_CATEGORIES.map((key) => [
    key,
    AEAT_CALENDAR_SOURCES[key].calendarId,
    AEAT_CALENDAR_SOURCES[key].icalUrl,
  ]);
  return createHash("sha256")
    .update(JSON.stringify(canonicalEntries))
    .digest("hex");
}
