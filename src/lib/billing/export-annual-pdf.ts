import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatMoney } from "../calculations";
import { isCollectedDocument } from "../income";
import { filterExpensesByYear, isDateInYear } from "../periods";
import { triggerPdfBlobDownload } from "../pdf";
import {
  assertTaxSummaryExportable,
  calculateTaxSummary,
  expenseIvaAmount,
  taxableSaleDocumentsForPeriod,
} from "../taxes";
import type { BusinessProfile, Document, Expense } from "../types";
import {
  collectedSalesTotal,
  documentAmounts,
  isVatExempt,
  totalExpensesAmount,
} from "../vat-regime";
import { selectCanonicalFiscalDocumentsForExport } from "./fiscal-export-documents";

export function buildAnnualSummaryPdf(
  documents: Document[],
  expenses: Expense[],
  profile: BusinessProfile,
  year: number,
): jsPDF {
  const vatExempt = isVatExempt(profile);
  const fiscalDocuments = selectCanonicalFiscalDocumentsForExport(
    documents,
    profile,
    (date) => isDateInYear(date, year),
  );
  const yearDocs = fiscalDocuments.documents;
  const yearExpenses = filterExpensesByYear(expenses, year);
  const taxes = calculateTaxSummary(documents, yearExpenses, {
    irpfPercent: profile.irpfPercent,
    vatExempt,
    profile,
    isDocumentDateInPeriod: (date) => isDateInYear(date, year),
  });
  assertTaxSummaryExportable(taxes);
  const periodIncome = collectedSalesTotal(
    yearDocs,
    vatExempt,
    isCollectedDocument,
  );
  const periodSpent = totalExpensesAmount(yearExpenses, vatExempt);
  const generated = new Date().toISOString().split("T")[0];

  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const business = profile.name || "Tu negocio";

  pdf.setFontSize(18);
  pdf.text("Resumen fiscal anual", 14, 18);
  pdf.setFontSize(11);
  pdf.setTextColor(80, 80, 80);
  pdf.text(`${business} · Año ${year}`, 14, 26);
  pdf.text(`Generado: ${generated}`, 14, 32);
  pdf.text("Cálculo orientativo — consulta con tu gestor.", 14, 38);
  pdf.setTextColor(0, 0, 0);

  const summaryStartY = 44;

  const summaryRows = vatExempt && taxes.salesIva === 0
    ? [
        ["Ingresos cobrados", formatMoney(periodIncome)],
        ["Gastos", formatMoney(periodSpent)],
        ["Beneficio antes del IRPF", formatMoney(taxes.grossProfit)],
        [`IRPF estimado (${taxes.irpfPercent}%)`, formatMoney(taxes.irpfEstimate)],
        [
          "Resultado tras reservar IRPF",
          formatMoney(taxes.profitAfterIrpfReserve),
        ],
      ]
    : [
        ["Cobrado en el año", formatMoney(periodIncome)],
        ["Gastado en el año", formatMoney(periodSpent)],
        ["Base ventas", formatMoney(taxes.salesBase)],
        ["IVA repercutido", formatMoney(taxes.salesIva)],
        ["Base gastos", formatMoney(taxes.expenseBase)],
        ["IVA deducible", formatMoney(taxes.expenseIva)],
        [
          taxes.ivaToPay > 0 ? "IVA neto a pagar" : "IVA a compensar",
          formatMoney(taxes.ivaToPay > 0 ? taxes.ivaToPay : taxes.ivaCredit),
        ],
        ["Beneficio antes del IRPF", formatMoney(taxes.grossProfit)],
        [`IRPF estimado (${taxes.irpfPercent}%)`, formatMoney(taxes.irpfEstimate)],
        [
          "Resultado tras reservar IRPF",
          formatMoney(taxes.profitAfterIrpfReserve),
        ],
      ];

  autoTable(pdf, {
    startY: summaryStartY,
    head: [["Concepto", "Importe"]],
    body: summaryRows,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [79, 70, 229] },
    columnStyles: { 1: { halign: "right" } },
  });

  let cursorY = (pdf as jsPDF & { lastAutoTable?: { finalY: number } })
    .lastAutoTable?.finalY ?? summaryStartY;

  const sales = taxableSaleDocumentsForPeriod(yearDocs).documents;
  if (sales.length > 0) {
    pdf.setFontSize(12);
    pdf.text("Ventas (facturas y recibos)", 14, cursorY + 10);
    autoTable(pdf, {
      startY: cursorY + 14,
      head: [["Fecha", "Número", "Cliente", "Base", "IVA", "Total"]],
      body: sales.map((doc) => {
        const totals = documentAmounts(doc, vatExempt);
        return [
          doc.date,
          doc.number,
          doc.client.name,
          formatMoney(totals.subtotal),
          formatMoney(totals.iva),
          formatMoney(totals.total),
        ];
      }),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
    });
    cursorY =
      (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
        ?.finalY ?? cursorY;
  }

  if (yearExpenses.length > 0) {
    pdf.setFontSize(12);
    pdf.text("Gastos", 14, cursorY + 10);
    autoTable(pdf, {
      startY: cursorY + 14,
      head: [["Fecha", "Proveedor", "Descripción", "Base", "Total"]],
      body: yearExpenses.map((expense) => {
        const iva = vatExempt ? 0 : expenseIvaAmount(expense);
        return [
          expense.date,
          expense.supplierName,
          expense.description,
          formatMoney(expense.amount),
          formatMoney(expense.amount + iva),
        ];
      }),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [220, 38, 38] },
    });
  }

  return pdf;
}

export function downloadAnnualSummaryPdf(
  documents: Document[],
  expenses: Expense[],
  profile: BusinessProfile,
  year: number,
): void {
  const pdf = buildAnnualSummaryPdf(documents, expenses, profile, year);
  const blob = pdf.output("blob");
  triggerPdfBlobDownload(blob, `resumen-fiscal-${year}.pdf`);
}
