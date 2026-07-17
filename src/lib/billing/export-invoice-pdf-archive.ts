import { zipSync } from "fflate";
import { buildPdfViewModelForDocument } from "@/lib/document-integrity/pdf-source";
import {
  buildDocumentPdfBlob,
  documentPdfFilename,
} from "@/lib/pdf";
import type { BusinessProfile, Document } from "@/lib/types";
import { buildInvoicePeriodSummaryPdf } from "./invoice-period-summary-pdf";
import { selectCanonicalFiscalDocumentsForExport } from "./fiscal-export-documents";

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

export interface InvoicePdfPeriodArchive {
  blob: Blob;
  fileName: string;
  folderName: string;
  summaryFileName: string;
  invoiceCount: number;
}

interface InvoiceArchiveRecord {
  stored: Document;
  canonical: Document;
}

function assertInvoicePdfExportPeriod(
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

function isPotentialInvoice(document: Document | undefined): boolean {
  return Boolean(
    document &&
      (document.type === "factura" ||
        document.documentSnapshot?.documentType === "factura"),
  );
}

function isBlockedInvoiceInPeriod(
  referenceDate: string,
  stored: Document | undefined,
  period: InvoicePdfExportPeriod,
): boolean {
  if (!isPotentialInvoice(stored)) return false;
  return [referenceDate, stored?.documentSnapshot?.date, stored?.date].some(
    (date) =>
      typeof date === "string" &&
      isDateInInvoicePdfExportPeriod(date, period),
  );
}

function compareArchiveRecords(
  left: InvoiceArchiveRecord,
  right: InvoiceArchiveRecord,
): number {
  const byDate = left.canonical.date.localeCompare(right.canonical.date);
  if (byDate !== 0) return byDate;
  return left.canonical.number.localeCompare(right.canonical.number, "es", {
    numeric: true,
    sensitivity: "base",
  });
}

function uniquePdfFilename(
  requested: string,
  usedNames: Map<string, number>,
): string {
  const normalized = requested.toLocaleLowerCase("es");
  const previous = usedNames.get(normalized) ?? 0;
  usedNames.set(normalized, previous + 1);
  if (previous === 0) return requested;

  const base = requested.toLowerCase().endsWith(".pdf")
    ? requested.slice(0, -4)
    : requested;
  return `${base}-${previous + 1}.pdf`;
}

function selectInvoiceArchiveRecords(
  documents: Document[],
  profile: BusinessProfile,
  period: InvoicePdfExportPeriod,
): InvoiceArchiveRecord[] {
  assertInvoicePdfExportPeriod(period);
  const storedById = new Map(
    documents.map((document) => [document.id, document]),
  );
  const selection = selectCanonicalFiscalDocumentsForExport(
    documents,
    profile,
    (date) => isDateInInvoicePdfExportPeriod(date, period),
  );
  const blockedReferences = selection.blockedDocuments
    .filter((blocked) =>
      isBlockedInvoiceInPeriod(
        blocked.referenceDate,
        storedById.get(blocked.id),
        period,
      ),
    )
    .map((blocked) => blocked.referenceNumber);

  if (blockedReferences.length > 0) {
    throw new InvoicePdfPeriodExportError(
      "blocked_documents",
      "Hay facturas del periodo con integridad pendiente. Revísalas antes de crear el paquete PDF.",
      [...new Set(blockedReferences)],
    );
  }

  const records = selection.documents
    .filter((document) => document.type === "factura")
    .map((canonical) => ({
      canonical,
      stored: storedById.get(canonical.id) ?? canonical,
    }))
    .sort(compareArchiveRecords);

  const renderBlocked: string[] = [];
  for (const record of records) {
    try {
      buildPdfViewModelForDocument(record.stored, profile);
    } catch {
      renderBlocked.push(record.canonical.number);
    }
  }

  if (renderBlocked.length > 0) {
    throw new InvoicePdfPeriodExportError(
      "blocked_documents",
      "Hay facturas cuyo PDF original no puede reconstruirse de forma segura. Revísalas antes de exportar.",
      [...new Set(renderBlocked)],
    );
  }

  if (records.length === 0) {
    throw new InvoicePdfPeriodExportError(
      "no_invoices",
      "No hay facturas emitidas en el periodo seleccionado.",
    );
  }

  return records;
}

async function renderPdfBytes(
  records: InvoiceArchiveRecord[],
  profile: BusinessProfile,
): Promise<Uint8Array[]> {
  const rendered = new Array<Uint8Array>(records.length);
  let nextIndex = 0;
  const workerCount = Math.min(4, records.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < records.length) {
        const index = nextIndex;
        nextIndex += 1;
        const record = records[index];
        try {
          const blob = await buildDocumentPdfBlob(record.stored, profile, {
            websiteFooter: true,
          });
          rendered[index] = new Uint8Array(await blob.arrayBuffer());
        } catch {
          throw new InvoicePdfPeriodExportError(
            "pdf_generation_failed",
            `No se pudo preparar el PDF de ${record.canonical.number}. No se ha descargado un paquete incompleto.`,
            [record.canonical.number],
          );
        }
      }
    }),
  );

  return rendered;
}

export async function buildInvoicePdfPeriodArchive(
  documents: Document[],
  profile: BusinessProfile,
  period: InvoicePdfExportPeriod,
): Promise<InvoicePdfPeriodArchive> {
  const records = selectInvoiceArchiveRecords(documents, profile, period);
  const pdfBytes = await renderPdfBytes(records, profile);
  const folderName = invoicePdfExportFolderName(period);
  const summaryFileName = invoicePdfSummaryFileName(period);
  const files: Record<string, Uint8Array> = {};
  const usedNames = new Map<string, number>();

  records.forEach((record, index) => {
    const filename = uniquePdfFilename(
      documentPdfFilename(record.canonical),
      usedNames,
    );
    files[`${folderName}/${filename}`] = pdfBytes[index];
  });

  try {
    const summaryPdf = buildInvoicePeriodSummaryPdf(
      records.map((record) => record.canonical),
      profile,
      invoicePdfExportPackagePeriodLabel(period),
    );
    files[`${folderName}/${summaryFileName}`] = new Uint8Array(
      summaryPdf.output("arraybuffer"),
    );
  } catch {
    throw new InvoicePdfPeriodExportError(
      "pdf_generation_failed",
      "No se pudo preparar el resumen de facturas. No se ha descargado un paquete incompleto.",
    );
  }

  const archive = zipSync(files, { level: 0 });
  return {
    blob: new Blob([archive], { type: "application/zip" }),
    fileName: `${folderName}.zip`,
    folderName,
    summaryFileName,
    invoiceCount: records.length,
  };
}

function triggerArchiveDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function downloadInvoicePdfPeriodArchive(
  documents: Document[],
  profile: BusinessProfile,
  period: InvoicePdfExportPeriod,
): Promise<InvoicePdfPeriodArchive> {
  const archive = await buildInvoicePdfPeriodArchive(
    documents,
    profile,
    period,
  );
  triggerArchiveDownload(archive.blob, archive.fileName);
  return archive;
}
