import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatMoney } from "../calculations";
import { isCollectedDocument } from "../income";
import { filterExpensesByYear, isDateInYear } from "../periods";
import { triggerPdfBlobDownload } from "../pdf";
import {
  calculateTaxSummary,
  expenseIvaAmount,
  isTaxableSaleDocument,
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
  const taxes = calculateTaxSummary(yearDocs, yearExpenses, {
    irpfPercent: profile.irpfPercent,
    vatExempt,
  });
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

  let summaryStartY = 44;
  if (fiscalDocuments.blockedDocuments.length > 0) {
    pdf.setFontSize(11);
    pdf.setTextColor(185, 28, 28);
    pdf.text("ALERTA DE INTEGRIDAD FISCAL", 14, summaryStartY);
    pdf.setFontSize(9);
    const warning = pdf.splitTextToSize(
      `Se han excluido ${fiscalDocuments.blockedDocuments.length} documento(s) bloqueado(s). Sus importes NO se incluyen en este resumen. Revise las incidencias antes de presentar impuestos.`,
      182,
    );
    pdf.text(warning, 14, summaryStartY + 6);
    pdf.setTextColor(0, 0, 0);

    autoTable(pdf, {
      startY: summaryStartY + 8 + warning.length * 4,
      head: [["ID interno", "Fecha ref.", "Número ref.", "Incidencias"]],
      body: fiscalDocuments.blockedDocuments.map((document) => [
        document.id,
        document.referenceDate,
        document.referenceNumber,
        document.issues.join(", "),
      ]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [185, 28, 28] },
    });
    summaryStartY =
      ((pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
        ?.finalY ?? summaryStartY + 16) + 8;
  }

  const summaryRows = vatExempt && taxes.salesIva === 0
    ? [
        ["Ingresos cobrados", formatMoney(periodIncome)],
        ["Gastos", formatMoney(periodSpent)],
        ["Beneficio antes del IRPF", formatMoney(taxes.grossProfit)],
        [`IRPF estimado (${taxes.irpfPercent}%)`, formatMoney(taxes.irpfEstimate)],
        ["Beneficio neto aproximado", formatMoney(taxes.estimatedNetProfit)],
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
        ["Beneficio neto aproximado", formatMoney(taxes.estimatedNetProfit)],
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

  const sales = yearDocs.filter(isTaxableSaleDocument);
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
