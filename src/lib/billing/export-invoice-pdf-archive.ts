import { zipSync } from "fflate";
import { buildPdfViewModelForDocument } from "@/lib/document-integrity/pdf-source";
import { buildDocumentPdfBlob, documentPdfFilename } from "@/lib/pdf";
import type { BusinessProfile, Document } from "@/lib/types";
import { buildInvoicePeriodSummaryPdf } from "./invoice-period-summary-pdf";
import { selectCanonicalFiscalDocumentsForExport } from "./fiscal-export-documents";
import {
  InvoicePdfPeriodExportError,
  assertInvoicePdfExportPeriod,
  invoicePdfExportFolderName,
  invoicePdfExportPackagePeriodLabel,
  invoicePdfSummaryFileName,
  isDateInInvoicePdfExportPeriod,
} from "./invoice-pdf-export-period";
import type { InvoicePdfExportPeriod } from "./invoice-pdf-export-period";

export {
  INVOICE_PDF_EXPORT_MONTH_NAMES,
  InvoicePdfPeriodExportError,
  invoicePdfExportFolderName,
  invoicePdfExportPackagePeriodLabel,
  invoicePdfExportPeriodFromQuarter,
  invoicePdfExportPeriodLabel,
  invoicePdfSummaryFileName,
  isDateInInvoicePdfExportPeriod,
} from "./invoice-pdf-export-period";
export type {
  InvoicePdfExportPeriod,
  InvoicePdfPeriodExportErrorCode,
} from "./invoice-pdf-export-period";

export interface InvoicePdfPeriodArchive {
  blob: Blob;
  fileName: string;
  folderName: string;
  summaryFileName: string;
  invoiceCount: number;
}

export interface InvoicePdfDocumentSelection {
  documentIds: string[];
  fileLabel: string;
  summaryLabel: string;
}

interface InvoiceArchiveRecord {
  stored: Document;
  canonical: Document;
}

export function normalizeInvoicePdfSelectionLabel(value: string): string {
  return (
    value
      .normalize("NFC")
      .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 90) || "Selección"
  );
}

export function invoicePdfSelectionFolderName(fileLabel: string): string {
  return `Facturas ${normalizeInvoicePdfSelectionLabel(fileLabel)}`;
}

export function invoicePdfSelectionSummaryFileName(fileLabel: string): string {
  return `Resumen Facturas ${normalizeInvoicePdfSelectionLabel(fileLabel)}.pdf`;
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
      typeof date === "string" && isDateInInvoicePdfExportPeriod(date, period),
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

  return validateRenderableInvoiceArchiveRecords(records, profile);
}

function validateRenderableInvoiceArchiveRecords(
  records: InvoiceArchiveRecord[],
  profile: BusinessProfile,
): InvoiceArchiveRecord[] {
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

function selectInvoiceArchiveRecordsByDocumentIds(
  documents: Document[],
  profile: BusinessProfile,
  documentIds: string[],
): InvoiceArchiveRecord[] {
  const selectedIds = new Set(documentIds.filter(Boolean));
  if (selectedIds.size === 0) {
    throw new InvoicePdfPeriodExportError(
      "invalid_selection",
      "La búsqueda no contiene facturas para exportar.",
    );
  }

  const storedById = new Map(
    documents.map((document) => [document.id, document]),
  );
  const selection = selectCanonicalFiscalDocumentsForExport(
    documents,
    profile,
    () => true,
  );
  const blockedReferences = selection.blockedDocuments
    .filter((blocked) => selectedIds.has(blocked.id))
    .map((blocked) => blocked.referenceNumber);

  if (blockedReferences.length > 0) {
    throw new InvoicePdfPeriodExportError(
      "blocked_documents",
      "Hay facturas de la selección con integridad pendiente. Revísalas antes de crear el paquete PDF.",
      [...new Set(blockedReferences)],
    );
  }

  const resolvedIds = new Set(
    selection.documents.map((document) => document.id),
  );
  const unresolvedReferences = [...selectedIds]
    .filter((id) => !resolvedIds.has(id))
    .map((id) => storedById.get(id)?.number ?? id);
  if (unresolvedReferences.length > 0) {
    throw new InvoicePdfPeriodExportError(
      "invalid_selection",
      "La selección contiene documentos que no son facturas emitidas exportables.",
      unresolvedReferences,
    );
  }

  const records = selection.documents
    .filter(
      (document) => document.type === "factura" && selectedIds.has(document.id),
    )
    .map((canonical) => ({
      canonical,
      stored: storedById.get(canonical.id) ?? canonical,
    }))
    .sort(compareArchiveRecords);

  return validateRenderableInvoiceArchiveRecords(records, profile);
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
  const folderName = invoicePdfExportFolderName(period);
  const summaryFileName = invoicePdfSummaryFileName(period);
  return buildInvoicePdfArchiveFromRecords(
    records,
    profile,
    folderName,
    summaryFileName,
    invoicePdfExportPackagePeriodLabel(period),
  );
}

export async function buildInvoicePdfSelectionArchive(
  documents: Document[],
  profile: BusinessProfile,
  selection: InvoicePdfDocumentSelection,
): Promise<InvoicePdfPeriodArchive> {
  const records = selectInvoiceArchiveRecordsByDocumentIds(
    documents,
    profile,
    selection.documentIds,
  );
  const folderName = invoicePdfSelectionFolderName(selection.fileLabel);
  const summaryFileName = invoicePdfSelectionSummaryFileName(
    selection.fileLabel,
  );
  return buildInvoicePdfArchiveFromRecords(
    records,
    profile,
    folderName,
    summaryFileName,
    selection.summaryLabel.trim() ||
      normalizeInvoicePdfSelectionLabel(selection.fileLabel),
  );
}

async function buildInvoicePdfArchiveFromRecords(
  records: InvoiceArchiveRecord[],
  profile: BusinessProfile,
  folderName: string,
  summaryFileName: string,
  summaryLabel: string,
): Promise<InvoicePdfPeriodArchive> {
  const pdfBytes = await renderPdfBytes(records, profile);
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
      summaryLabel,
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

export async function downloadInvoicePdfSelectionArchive(
  documents: Document[],
  profile: BusinessProfile,
  selection: InvoicePdfDocumentSelection,
): Promise<InvoicePdfPeriodArchive> {
  const archive = await buildInvoicePdfSelectionArchive(
    documents,
    profile,
    selection,
  );
  triggerArchiveDownload(archive.blob, archive.fileName);
  return archive;
}
