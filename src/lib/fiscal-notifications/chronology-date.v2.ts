export const FISCAL_NOTIFICATION_CHRONOLOGY_SCHEMA_VERSION_V2 = 2 as const;

export const FISCAL_NOTIFICATION_CHRONOLOGY_DATE_BASES_V2 = Object.freeze([
  "ISSUE_DATE",
  "SIGNING_DATE",
  "ACTION_DATE",
  "EFFECTIVE_NOTIFICATION_DATE",
] as const);

export type FiscalNotificationChronologyDateBasisV2 =
  (typeof FISCAL_NOTIFICATION_CHRONOLOGY_DATE_BASES_V2)[number];

export interface FiscalNotificationChronologyInputV2 {
  readonly issueDate?: string | null;
  readonly signingDate?: string | null;
  readonly actionDate?: string | null;
  readonly effectiveNotificationDate?: string | null;
}

export interface FiscalNotificationChronologyV2 {
  readonly schemaVersion: typeof FISCAL_NOTIFICATION_CHRONOLOGY_SCHEMA_VERSION_V2;
  readonly chronologyDate: string | null;
  readonly chronologyDateBasis: FiscalNotificationChronologyDateBasisV2 | null;
}

export interface FiscalNotificationChronologySortableV2 {
  readonly id: string;
  readonly chronologyDate: string | null;
}

const ISO_CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/u;

function isExactIsoCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || value.length !== 10) return false;
  const match = ISO_CALENDAR_DATE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day
  );
}

/**
 * Obtiene exclusivamente la fecha documental usada para ordenar. La fecha de
 * subida, análisis, escaneo o creación no forma parte del contrato de entrada,
 * por lo que no puede convertirse accidentalmente en fecha del documento.
 */
export function resolveFiscalNotificationChronologyV2(
  input: FiscalNotificationChronologyInputV2,
): FiscalNotificationChronologyV2 {
  const candidates = [
    [input.issueDate, "ISSUE_DATE"],
    [input.signingDate, "SIGNING_DATE"],
    [input.actionDate, "ACTION_DATE"],
    [input.effectiveNotificationDate, "EFFECTIVE_NOTIFICATION_DATE"],
  ] as const;

  for (const [date, basis] of candidates) {
    if (isExactIsoCalendarDate(date)) {
      return Object.freeze({
        schemaVersion: FISCAL_NOTIFICATION_CHRONOLOGY_SCHEMA_VERSION_V2,
        chronologyDate: date,
        chronologyDateBasis: basis,
      });
    }
  }

  return Object.freeze({
    schemaVersion: FISCAL_NOTIFICATION_CHRONOLOGY_SCHEMA_VERSION_V2,
    chronologyDate: null,
    chronologyDateBasis: null,
  });
}

function compareId(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/** Orden de biblioteca: documento más reciente primero; sin fecha al final. */
export function compareFiscalNotificationChronologyDescendingV2(
  left: FiscalNotificationChronologySortableV2,
  right: FiscalNotificationChronologySortableV2,
): number {
  if (left.chronologyDate === null && right.chronologyDate === null) {
    return compareId(left.id, right.id);
  }
  if (left.chronologyDate === null) return 1;
  if (right.chronologyDate === null) return -1;
  return (
    right.chronologyDate.localeCompare(left.chronologyDate) ||
    compareId(left.id, right.id)
  );
}

/** Orden dentro del expediente: documento más antiguo primero; sin fecha al final. */
export function compareFiscalNotificationChronologyAscendingV2(
  left: FiscalNotificationChronologySortableV2,
  right: FiscalNotificationChronologySortableV2,
): number {
  if (left.chronologyDate === null && right.chronologyDate === null) {
    return compareId(left.id, right.id);
  }
  if (left.chronologyDate === null) return 1;
  if (right.chronologyDate === null) return -1;
  return (
    left.chronologyDate.localeCompare(right.chronologyDate) ||
    compareId(left.id, right.id)
  );
}
