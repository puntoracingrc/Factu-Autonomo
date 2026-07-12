export const FISCAL_CALENDAR_CATEGORIES = [
  "renta",
  "renta_sociedades",
  "sociedades",
  "iva",
  "declaraciones_informativas",
] as const;

export type FiscalCalendarCategory =
  (typeof FISCAL_CALENDAR_CATEGORIES)[number];

export type FiscalCalendarEventStatus =
  | "confirmed"
  | "tentative"
  | "cancelled"
  | "unknown";

export type FiscalCalendarDeadlineKind =
  | "general-filing"
  | "direct-debit"
  | "exception"
  | "unclassified";

export type FiscalCalendarReviewStatus =
  | "source-classified"
  | "review-with-advisor";

export interface FiscalCalendarDateRange {
  /** Fecha civil inicial, inclusiva, en Europe/Madrid. */
  startDate: string;
  /** Fecha civil final, exclusiva, en Europe/Madrid. */
  endDateExclusive: string;
  /** Límite RFC3339 obligatorio para Google Calendar. */
  timeMin: string;
  /** Límite RFC3339 obligatorio para Google Calendar. */
  timeMax: string;
}

export interface FiscalCalendarEvent {
  id: string;
  source: "AEAT";
  sourceProvider: "google-calendar";
  sourceCalendarKey: FiscalCalendarCategory;
  sourceCalendarId: string;
  externalEventId: string;
  iCalUID: string | null;
  title: string;
  description: string;
  category: FiscalCalendarCategory;
  /** No se infiere del título: sin respaldo estructurado queda sin clasificar. */
  deadlineKind: FiscalCalendarDeadlineKind;
  /** La aplicabilidad individual nunca se deduce del estado técnico de Google. */
  reviewStatus: FiscalCalendarReviewStatus;
  /** YYYY-MM-DD para all-day; RFC3339 normalizado para eventos con hora. */
  startDate: string;
  /** Exclusiva. YYYY-MM-DD para all-day; RFC3339 para eventos con hora. */
  endDateExclusive: string;
  allDay: boolean;
  status: FiscalCalendarEventStatus;
  sourceUpdatedAt: string | null;
  fetchedAt: string;
}

export type FiscalCalendarProviderMode =
  | "fixture"
  | "google-calendar"
  | "review-only";

export interface FiscalCalendarProviderResult {
  events: readonly FiscalCalendarEvent[];
  fetchedAt: string;
  providerMode: FiscalCalendarProviderMode;
  truncated: boolean;
}

export interface FiscalCalendarProvider {
  listEvents(
    dateRange: FiscalCalendarDateRange,
    categories: readonly FiscalCalendarCategory[],
  ): Promise<FiscalCalendarProviderResult>;
}

export interface FiscalCalendarCategoryOption {
  key: FiscalCalendarCategory;
  label: string;
}

export interface FiscalCalendarOfficialSource {
  id: string;
  authority: "AEAT";
  title: string;
  officialUrl: string;
  retrievedAt: string;
  verificationStatus: "VERIFIED";
  scope: "GENERAL_INFORMATION";
  catalogVersion: string;
  catalogContentSha256: string;
}

export interface FiscalCalendarModelPageLink {
  code: string;
  href: string;
  historical: boolean;
}

export interface FiscalCalendarResponseData extends FiscalCalendarProviderResult {
  categories: readonly FiscalCalendarCategoryOption[];
  officialSource: FiscalCalendarOfficialSource;
  timeZone: "Europe/Madrid";
  generalInformationOnly: true;
  modelPageLinks: readonly FiscalCalendarModelPageLink[];
}
