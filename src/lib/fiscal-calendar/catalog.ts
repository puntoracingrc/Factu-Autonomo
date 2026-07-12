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
  "aeat-public-calendars-2026-07-12.v1" as const;
export const AEAT_CALENDAR_CATALOG_CONTENT_SHA256 =
  "162d9d10580f0cbaa1bb0af8b7226020de2bbfce72aa0b655912fcfc66dd7e43" as const;

interface AeatCalendarSource {
  key: FiscalCalendarCategory;
  label: string;
  calendarId: string;
}

/** Única allowlist de calendarios consultables por el proveedor. */
export const AEAT_CALENDAR_SOURCES = {
  renta: {
    key: "renta",
    label: "Renta",
    calendarId: "invitado2aeat@gmail.com",
  },
  renta_sociedades: {
    key: "renta_sociedades",
    label: "Renta y Sociedades",
    calendarId:
      "aio2b0s64q65r7v87j5ma8fvog@group.calendar.google.com",
  },
  sociedades: {
    key: "sociedades",
    label: "Sociedades",
    calendarId:
      "b7g1j3bod3gdjbka03uo6kr988@group.calendar.google.com",
  },
  iva: {
    key: "iva",
    label: "IVA",
    calendarId:
      "517mcuhcis0lldnp9b7c0nk2q8@group.calendar.google.com",
  },
  declaraciones_informativas: {
    key: "declaraciones_informativas",
    label: "Declaraciones informativas",
    calendarId:
      "hqp9h5ft4snag42aea96791g28@group.calendar.google.com",
  },
} as const satisfies Record<FiscalCalendarCategory, AeatCalendarSource>;

export const AEAT_FISCAL_CALENDAR_OFFICIAL_SOURCE = {
  id: "aeat-calendario-contribuyente-icalendar",
  authority: "AEAT",
  title: "Calendario del contribuyente — integración iCalendar",
  officialUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/icalendar/instrucciones-integrar-calendario.html",
  retrievedAt: "2026-07-12",
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
  ]);
  return createHash("sha256")
    .update(JSON.stringify(canonicalEntries))
    .digest("hex");
}
