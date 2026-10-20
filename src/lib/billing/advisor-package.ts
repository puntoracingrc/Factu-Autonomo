import { zipSync } from "fflate";
import type { AppData, Expense } from "@/lib/types";
import { documentAmounts, isVatExempt } from "@/lib/vat-regime";
import { assertTaxSummaryExportable, calculateTaxSummary } from "@/lib/taxes";
import { csvRow, formatCsvAmount, withUtf8Bom } from "./csv-utils";
import {
  buildExpensesExportCsv,
  assertExpensesVatExportable,
} from "./export-expenses-csv";
import { buildExpensePeriodSummaryPdf } from "./expense-period-summary-pdf";
import { buildInvoicePeriodSummaryPdf } from "./invoice-period-summary-pdf";
import { buildFiscalPeriodExportCsv } from "./export-quarterly";
import { buildInvoicePdfPeriodEntries } from "./export-invoice-pdf-archive";
import {
  assertInvoicePdfExportPeriod,
  InvoicePdfPeriodExportError,
  invoicePdfExportPeriodLabel,
  isDateInInvoicePdfExportPeriod,
  type InvoicePdfExportPeriod,
} from "./invoice-pdf-export-period";

export const ADVISOR_PACKAGE_MAX_BYTES = 300 * 1024 * 1024;
export interface AdvisorOriginal {
  bytes: Uint8Array;
  extension: string;
  source: "Factu" | "Drive";
}
export interface AdvisorPackageInput {
  data: Pick<AppData, "documents" | "expenses" | "suppliers" | "profile">;
  period: InvoicePdfExportPeriod;
}
export interface AdvisorPackageDependencies {
  readOriginals(
    expenses: Expense[],
  ): Promise<ReadonlyMap<string, AdvisorOriginal>>;
  isCurrent?: () => boolean;
  maxBytes?: number;
}

function safePart(value: string) {
  return (
    value
      .normalize("NFC")
      .replace(/[<>:"/\\|?*\u0000-\u001f]/gu, " ")
      .replace(/\s+/gu, " ")
      .trim()
      .slice(0, 100) || "Documento"
  );
}

/** Explicit, read-only export of one company's captured period. No business writes. */
export async function buildAdvisorPackage(
  { data, period }: AdvisorPackageInput,
  dependencies: AdvisorPackageDependencies,
) {
  assertInvoicePdfExportPeriod(period);
  const assertCurrent = () => {
    if (dependencies.isCurrent && !dependencies.isCurrent())
      throw new Error(
        "La empresa cambió. No se ha descargado ni enviado el paquete.",
      );
  };
  assertCurrent();
  const inPeriod = (date: string) =>
    isDateInInvoicePdfExportPeriod(date, period);
  const expenses = data.expenses.filter((expense) => inPeriod(expense.date));
  const vatExempt = isVatExempt(data.profile);
  assertExpensesVatExportable(expenses, vatExempt);
  const taxes = calculateTaxSummary(data.documents, expenses, {
    irpfPercent: data.profile.irpfPercent,
    vatExempt,
    profile: data.profile,
    isDocumentDateInPeriod: inPeriod,
  });
  assertTaxSummaryExportable(taxes);
  let invoices: Awaited<ReturnType<typeof buildInvoicePdfPeriodEntries>> = [];
  try {
    invoices = await buildInvoicePdfPeriodEntries(
      data.documents,
      data.profile,
      period,
    );
  } catch (error) {
    if (
      !(error instanceof InvoicePdfPeriodExportError) ||
      error.code !== "no_invoices"
    )
      throw error;
  }
  assertCurrent();
  if (!invoices.length && !expenses.length)
    throw new Error("No hay facturas ni gastos en este periodo.");
  const originals = expenses.length
    ? await dependencies.readOriginals(expenses)
    : new Map<string, AdvisorOriginal>();
  assertCurrent();
  const periodLabel = invoicePdfExportPeriodLabel(period);
  const folderName = `Gestoria - ${safePart(data.profile.name || "Empresa")} - ${periodLabel}`;
  const files: Record<string, Uint8Array> = {};
  const names = new Set<string>();
  let totalBytes = 0;
  function add(path: string, bytes: Uint8Array) {
    totalBytes += bytes.byteLength;
    if (totalBytes > (dependencies.maxBytes ?? ADVISOR_PACKAGE_MAX_BYTES))
      throw new Error("El paquete supera 300 MB. Exporta un mes cada vez.");
    const dot = path.lastIndexOf(".");
    let unique = path,
      suffix = 2;
    while (names.has(unique.toLocaleLowerCase("es"))) {
      unique = `${path.slice(0, dot)} (${suffix++})${path.slice(dot)}`;
    }
    names.add(unique.toLocaleLowerCase("es"));
    files[`${folderName}/${unique}`] = bytes;
    return unique;
  }
  const csv = (path: string, value: string) =>
    add(path, new TextEncoder().encode(withUtf8Bom(value)));
  const index = [
    csvRow([
      "Mes",
      "Tipo",
      "Fecha",
      "Referencia",
      "Cliente o proveedor",
      "Archivo",
      "Origen",
    ]),
  ];
  const sales = [
    csvRow([
      "Fecha",
      "Numero",
      "Tipo",
      "Cliente",
      "NIF",
      "Base",
      "IVA",
      "Total",
    ]),
  ];
  const factuIds = new Set<string>();
  let originalCount = 0;
  for (const entry of invoices) {
    assertCurrent();
    const doc = entry.document,
      month = doc.date.slice(0, 7);
    const path = add(
      `${month}/Facturas emitidas/${safePart(entry.fileName.replace(/\.pdf$/iu, ""))}.pdf`,
      entry.bytes,
    );
    const totals = documentAmounts(doc, vatExempt);
    sales.push(
      csvRow([
        doc.date,
        doc.number,
        doc.rectification ? "Rectificativa" : "Factura",
        doc.client.name,
        doc.client.nif ?? "",
        formatCsvAmount(totals.subtotal),
        formatCsvAmount(totals.iva),
        formatCsvAmount(totals.total),
      ]),
    );
    index.push(
      csvRow([
        month,
        "Factura emitida",
        doc.date,
        doc.number,
        doc.client.name,
        path,
        "PDF de Factu",
      ]),
    );
  }
  for (const expense of [...expenses].sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
  )) {
    const month = expense.date.slice(0, 7),
      original = originals.get(expense.id);
    const reference =
      expense.purchaseDocument?.invoiceNumber || expense.description || "Gasto";
    let path = "SIN ORIGINAL ADJUNTO";
    if (original) {
      if (
        !/^\.(pdf|png|jpe?g|webp|gif|docx?|xlsx?)$/iu.test(
          original.extension,
        ) ||
        !original.bytes.length
      )
        throw new Error(
          "El original no tiene un formato válido. No se ha creado un paquete incompleto.",
        );
      path = add(
        `${month}/Gastos/${safePart(`${expense.date} - ${expense.supplierName} - ${reference}`)}${original.extension}`,
        original.bytes,
      );
      originalCount++;
      if (original.source === "Factu") factuIds.add(expense.id);
    } else if (expense.originalArchive || expense.sourceInboxItemId) {
      // A known original must not silently become a missing-file entry.
      throw new Error(
        "Falta recuperar un original conocido. No se ha creado un paquete incompleto.",
      );
    }
    index.push(
      csvRow([
        month,
        "Gasto",
        expense.date,
        reference,
        expense.supplierName,
        path,
        original?.source ?? "Sin archivo",
      ]),
    );
  }
  const summaryFileName = "Resumen de gastos.pdf";
  const periodInvoices = invoices.map((entry) => entry.document);
  add(
    "Listados/Resumen de facturas.pdf",
    new Uint8Array(
      buildInvoicePeriodSummaryPdf(
        periodInvoices,
        data.profile,
        periodLabel,
      ).output("arraybuffer"),
    ),
  );
  add(
    `Listados/${summaryFileName}`,
    new Uint8Array(
      buildExpensePeriodSummaryPdf(
        expenses,
        data.suppliers,
        data.profile,
        periodLabel,
        new Date(),
        factuIds,
      ).output("arraybuffer"),
    ),
  );
  csv("Listados/Facturas emitidas.csv", `${sales.join("\n")}\n`);
  csv(
    "Listados/Gastos.csv",
    buildExpensesExportCsv(expenses, data.suppliers, {
      profile: data.profile,
      periodLabel,
    }),
  );
  csv("Listados/Indice de documentos.csv", `${index.join("\n")}\n`);
  csv(
    "Listados/Resumen fiscal.csv",
    buildFiscalPeriodExportCsv(
      data.documents,
      expenses,
      data.profile,
      periodLabel,
      inPeriod,
      data.suppliers,
    ),
  );
  add(
    "LEEME.txt",
    new TextEncoder().encode(
      [
        `Empresa: ${data.profile.name} | NIF: ${data.profile.nif}`,
        periodLabel,
        `${invoices.length} facturas emitidas; ${expenses.length} gastos; ${originalCount} justificantes.`,
        "Cada mes contiene Facturas emitidas y Gastos. Listados contiene los resumenes PDF y CSV.",
        `${expenses.length - originalCount} gastos sin archivo: identificados en Indice de documentos.csv. No se han fabricado justificantes.`,
        "Las facturas de Factu se generan desde su contenido fiscal conservado; un historico importado no se presenta como PDF original externo.",
        "Los originales de gastos conservan sus bytes y formato. No se han modificado facturas, gastos ni cobros.",
      ].join("\n"),
    ),
  );
  assertCurrent();
  const zipped = zipSync(files, { level: 0 });
  return {
    blob: new Blob([zipped], { type: "application/zip" }),
    fileName: `${folderName}.zip`,
    folderName,
    summaryFileName,
    invoiceCount: invoices.length,
    expenseCount: expenses.length,
    originalCount,
    missingOriginalCount: expenses.length - originalCount,
  };
}
