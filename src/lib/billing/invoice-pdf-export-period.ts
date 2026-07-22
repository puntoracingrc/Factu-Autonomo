export const INVOICE_PDF_EXPORT_MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

export interface InvoicePdfExportPeriod {
  year: number;
  startMonth: number;
  endMonth: number;
}

export type InvoicePdfPeriodExportErrorCode =
  | "invalid_period"
  | "invalid_selection"
  | "no_invoices"
  | "blocked_documents"
  | "pdf_generation_failed";

export class InvoicePdfPeriodExportError extends Error {
  constructor(
    readonly code: InvoicePdfPeriodExportErrorCode,
    message: string,
    readonly documentReferences: string[] = [],
  ) {
    super(message);
    this.name = "InvoicePdfPeriodExportError";
  }
}

export function assertInvoicePdfExportPeriod(
  period: InvoicePdfExportPeriod,
): void {
  const validYear =
    Number.isInteger(period.year) && period.year >= 1000 && period.year <= 9999;
  const validMonths =
    Number.isInteger(period.startMonth) &&
    Number.isInteger(period.endMonth) &&
    period.startMonth >= 1 &&
    period.endMonth <= 12 &&
    period.startMonth <= period.endMonth;
  const monthCount = period.endMonth - period.startMonth + 1;

  if (!validYear || !validMonths || monthCount > 3) {
    throw new InvoicePdfPeriodExportError(
      "invalid_period",
      "Selecciona entre uno y tres meses consecutivos del mismo año.",
    );
  }
}

export function invoicePdfExportPeriodFromQuarter(
  year: number,
  quarter: 1 | 2 | 3 | 4,
): InvoicePdfExportPeriod {
  const startMonth = (quarter - 1) * 3 + 1;
  return { year, startMonth, endMonth: startMonth + 2 };
}

export function isDateInInvoicePdfExportPeriod(
  date: string,
  period: InvoicePdfExportPeriod,
): boolean {
  assertInvoicePdfExportPeriod(period);
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(date.trim());
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth
  ) {
    return false;
  }

  return (
    year === period.year &&
    month >= period.startMonth &&
    month <= period.endMonth
  );
}

function fiscalQuarterForPeriod(
  period: InvoicePdfExportPeriod,
): 1 | 2 | 3 | 4 | null {
  const monthCount = period.endMonth - period.startMonth + 1;
  if (monthCount !== 3 || ![1, 4, 7, 10].includes(period.startMonth)) {
    return null;
  }
  return (Math.floor((period.startMonth - 1) / 3) + 1) as 1 | 2 | 3 | 4;
}

export function invoicePdfExportPeriodLabel(
  period: InvoicePdfExportPeriod,
): string {
  assertInvoicePdfExportPeriod(period);
  const start = INVOICE_PDF_EXPORT_MONTH_NAMES[period.startMonth - 1];
  if (period.startMonth === period.endMonth) {
    return `${start} ${period.year}`;
  }
  const end = INVOICE_PDF_EXPORT_MONTH_NAMES[period.endMonth - 1];
  return `${start}-${end} ${period.year}`;
}

export function invoicePdfExportFolderName(
  period: InvoicePdfExportPeriod,
): string {
  return `Facturas ${invoicePdfExportPackagePeriodLabel(period)}`;
}

export function invoicePdfExportPackagePeriodLabel(
  period: InvoicePdfExportPeriod,
): string {
  assertInvoicePdfExportPeriod(period);
  const quarter = fiscalQuarterForPeriod(period);
  return quarter
    ? `Trimestre ${quarter} ${period.year}`
    : invoicePdfExportPeriodLabel(period);
}

export function invoicePdfSummaryFileName(
  period: InvoicePdfExportPeriod,
): string {
  return `Resumen Facturas ${invoicePdfExportPackagePeriodLabel(period)}.pdf`;
}
