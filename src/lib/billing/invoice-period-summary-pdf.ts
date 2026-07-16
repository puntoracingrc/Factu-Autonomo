import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatMoney, roundMoneySymmetric } from "@/lib/calculations";
import type { BusinessProfile, Document } from "@/lib/types";
import { documentAmounts, isVatExempt } from "@/lib/vat-regime";

export interface InvoicePeriodSummaryRow {
  date: string;
  number: string;
  customerName: string;
  customerTaxId: string;
  subtotal: number;
  iva: number;
  total: number;
}

export interface InvoicePeriodSummaryModel {
  businessName: string;
  businessTaxId: string;
  periodLabel: string;
  invoiceCount: number;
  subtotal: number;
  iva: number;
  total: number;
  rows: InvoicePeriodSummaryRow[];
}

function formatIsoDate(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : date;
}

export function buildInvoicePeriodSummaryModel(
  documents: Document[],
  profile: BusinessProfile,
  periodLabel: string,
): InvoicePeriodSummaryModel {
  const vatExempt = isVatExempt(profile);
  const rows = documents.map((document) => {
    const amounts = documentAmounts(document, vatExempt);
    return {
      date: document.date,
      number: document.number,
      customerName: document.client.name || "Cliente sin identificar",
      customerTaxId: document.client.nif?.trim() || "—",
      subtotal: amounts.subtotal,
      iva: amounts.iva,
      total: amounts.total,
    };
  });

  return {
    businessName:
      profile.commercialName?.trim() || profile.name.trim() || "Tu negocio",
    businessTaxId: profile.nif.trim(),
    periodLabel,
    invoiceCount: rows.length,
    subtotal: roundMoneySymmetric(
      rows.reduce((sum, row) => sum + row.subtotal, 0),
    ),
    iva: roundMoneySymmetric(rows.reduce((sum, row) => sum + row.iva, 0)),
    total: roundMoneySymmetric(rows.reduce((sum, row) => sum + row.total, 0)),
    rows,
  };
}

export function buildInvoicePeriodSummaryPdf(
  documents: Document[],
  profile: BusinessProfile,
  periodLabel: string,
  generatedAt = new Date(),
): jsPDF {
  const model = buildInvoicePeriodSummaryModel(documents, profile, periodLabel);
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  pdf.setProperties({
    title: `Resumen de facturas emitidas · ${periodLabel}`,
    subject: "Relación de facturas emitidas incluidas en el paquete PDF",
    author: model.businessName,
  });

  pdf.setFillColor(30, 64, 175);
  pdf.rect(0, 0, 210, 34, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(19);
  pdf.text("Resumen de facturas emitidas", 14, 15);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(model.periodLabel, 14, 23);
  pdf.text(`Generado: ${generatedAt.toLocaleDateString("es-ES")}`, 196, 23, {
    align: "right",
  });

  pdf.setTextColor(15, 23, 42);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text(model.businessName, 14, 43);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(71, 85, 105);
  pdf.text(`NIF: ${model.businessTaxId || "—"}`, 14, 49);

  autoTable(pdf, {
    startY: 56,
    theme: "plain",
    body: [
      [
        `FACTURAS\n${model.invoiceCount}`,
        `BASE IMPONIBLE\n${formatMoney(model.subtotal)}`,
        `IVA\n${formatMoney(model.iva)}`,
        `TOTAL\n${formatMoney(model.total)}`,
      ],
    ],
    styles: {
      fillColor: [239, 246, 255],
      textColor: [30, 64, 175],
      fontStyle: "bold",
      fontSize: 9,
      cellPadding: 4,
      lineColor: [191, 219, 254],
      lineWidth: 0.2,
      valign: "middle",
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
    },
  });

  const summaryEndY =
    (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? 70;

  autoTable(pdf, {
    startY: summaryEndY + 8,
    head: [["Fecha", "Factura", "Cliente / NIF", "Base", "IVA", "Total"]],
    body: model.rows.map((row) => [
      formatIsoDate(row.date),
      row.number,
      `${row.customerName}\n${row.customerTaxId}`,
      formatMoney(row.subtotal),
      formatMoney(row.iva),
      formatMoney(row.total),
    ]),
    theme: "grid",
    margin: { left: 14, right: 14, bottom: 18 },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
      textColor: [30, 41, 59],
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "left",
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 21 },
      1: { cellWidth: 29 },
      2: { cellWidth: 59 },
      3: { cellWidth: 25, halign: "right" },
      4: { cellWidth: 22, halign: "right" },
      5: { cellWidth: 26, halign: "right" },
    },
  });

  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(226, 232, 240);
    pdf.line(14, 282, 196, 282);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text(
      "Relación informativa del contenido del ZIP. Conserva las facturas PDF como documentos originales.",
      14,
      287,
    );
    pdf.text(`${page}/${pageCount}`, 196, 287, { align: "right" });
  }

  return pdf;
}
