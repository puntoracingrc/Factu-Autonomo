import { formatShortDate } from "../calculations";
import { isTaxableSaleDocument } from "../taxes";
import type { BusinessProfile, Document, Expense, Supplier } from "../types";
import { documentAmounts, isVatExempt } from "../vat-regime";
import { isDateInQuarter, quarterLabel, type Quarter } from "../periods";
import { filterExpensesByQuarter } from "../periods";
import { calculateTaxSummary } from "../taxes";
import { csvRow, formatCsvAmount, formatCsvExportDate, downloadCsvFile } from "./csv-utils";
import { buildExpensesTableSection } from "./export-expenses-csv";
import {
  selectCanonicalFiscalDocumentsForExport,
  type FiscalExportBlockedDocument,
} from "./fiscal-export-documents";

const DOCUMENT_TYPE_LABELS: Record<Document["type"], string> = {
  factura: "Factura",
  presupuesto: "Presupuesto",
  recibo: "Recibo",
};

function documentTypeLabel(doc: Document): string {
  if (doc.rectification) return "Factura rectificativa";
  return DOCUMENT_TYPE_LABELS[doc.type];
}

function buildIntegrityAuditSection(
  blockedDocuments: FiscalExportBlockedDocument[],
): string[] {
  if (blockedDocuments.length === 0) return [];

  return [
    "",
    csvRow(["ALERTA DE INTEGRIDAD FISCAL"]),
    csvRow(["Documentos excluidos", blockedDocuments.length]),
    csvRow([
      "Advertencia",
      "Los importes de estos documentos NO se incluyen en el resumen ni en el libro de ventas. Revise las incidencias antes de presentar impuestos.",
    ]),
    "",
    csvRow(["DOCUMENTOS EXCLUIDOS POR INTEGRIDAD"]),
    csvRow([
      "ID interno",
      "Fecha de referencia no verificada",
      "Número de referencia no verificado",
      "Incidencias",
    ]),
    ...blockedDocuments.map((document) =>
      csvRow([
        document.id,
        document.referenceDate,
        document.referenceNumber,
        document.issues.join(", "),
      ]),
    ),
  ];
}

export function buildQuarterlyExportCsv(
  documents: Document[],
  expenses: Expense[],
  profile: BusinessProfile,
  year: number,
  quarter: Quarter,
  suppliers: Supplier[] = [],
): string {
  const vatExempt = isVatExempt(profile);
  const period = quarterLabel(year, quarter);
  const fiscalDocuments = selectCanonicalFiscalDocumentsForExport(
    documents,
    profile,
    (date) => isDateInQuarter(date, year, quarter),
  );
  const quarterDocs = fiscalDocuments.documents;
  const quarterExpenses = filterExpensesByQuarter(expenses, year, quarter);
  const taxes = calculateTaxSummary(quarterDocs, quarterExpenses, {
    irpfPercent: profile.irpfPercent,
    vatExempt,
  });

  const taxableDocs = quarterDocs.filter(isTaxableSaleDocument);

  let salesBase = 0;
  let salesIva = 0;
  let salesTotal = 0;

  const lines: string[] = [
    csvRow(["EXPORTACIÓN TRIMESTRAL FISCAL"]),
    csvRow([
      "Generado por Factu Autónomo",
      "https://facturacion-autonomos.app",
    ]),
    "",
    csvRow(["Empresa", profile.name || "—"]),
    csvRow(["NIF/CIF", profile.nif || "—"]),
    csvRow(["Periodo", period]),
    csvRow(["Fecha de exportación", formatCsvExportDate()]),
    csvRow([
      "Nota",
      "Importes en EUR. Separador ; y decimales con coma (compatible con Excel en español).",
    ]),
    ...buildIntegrityAuditSection(fiscalDocuments.blockedDocuments),
    "",
    csvRow(["RESUMEN DEL PERIODO"]),
    csvRow(["Concepto", "Importe (EUR)"]),
    csvRow(["Base imponible ventas", formatCsvAmount(taxes.salesBase)]),
    csvRow(["IVA repercutido", formatCsvAmount(taxes.salesIva)]),
    csvRow(["Base imponible gastos", formatCsvAmount(taxes.expenseBase)]),
    csvRow(["IVA deducible", formatCsvAmount(taxes.expenseIva)]),
    csvRow(["IVA neto a ingresar", formatCsvAmount(taxes.netIva)]),
    csvRow(["Beneficio bruto estimado", formatCsvAmount(taxes.grossProfit)]),
    csvRow(["IRPF estimado (orientativo)", formatCsvAmount(taxes.irpfEstimate)]),
    "",
    csvRow(["LIBRO DE VENTAS"]),
    "",
    csvRow([
      "Fecha",
      "Nº documento",
      "Tipo",
      "Cliente",
      "NIF/CIF cliente",
      "Base imponible (EUR)",
      "Cuota IVA (EUR)",
      "Total (EUR)",
      "Estado",
    ]),
  ];

  for (const doc of taxableDocs) {
    const totals = documentAmounts(doc, vatExempt);
    salesBase += totals.subtotal;
    salesIva += totals.iva;
    salesTotal += totals.total;

    lines.push(
      csvRow([
        formatShortDate(doc.date),
        doc.number,
        documentTypeLabel(doc),
        doc.client.name,
        doc.client.nif ?? "",
        formatCsvAmount(totals.subtotal),
        formatCsvAmount(totals.iva),
        formatCsvAmount(totals.total),
        doc.status,
      ]),
    );
  }

  lines.push(
    csvRow([
      "TOTAL VENTAS",
      "",
      "",
      `${taxableDocs.length} documento${taxableDocs.length === 1 ? "" : "s"}`,
      "",
      formatCsvAmount(salesBase),
      formatCsvAmount(salesIva),
      formatCsvAmount(salesTotal),
      "",
    ]),
  );

  lines.push("");
  lines.push(
    ...buildExpensesTableSection(quarterExpenses, suppliers, profile, {
      sectionTitle: "LIBRO DE GASTOS Y COMPRAS",
    }),
  );

  return `${lines.join("\n")}\n`;
}

export function downloadQuarterlyCsv(
  csv: string,
  year: number,
  quarter: Quarter,
): void {
  downloadCsvFile(csv, `factura-autonomo-T${quarter}-${year}.csv`);
}
