import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatMoney, roundMoneySymmetric } from "@/lib/calculations";
import { expenseFiscalAmounts } from "@/lib/expenses";
import type { BusinessProfile, Expense, Supplier } from "@/lib/types";
import { isVatExempt } from "@/lib/vat-regime";

export interface ExpensePeriodSummaryRow {
  date: string;
  invoiceNumber: string;
  supplierName: string;
  supplierTaxId: string;
  category: string;
  registeredBase: number;
  registeredIva: number;
  registeredTotal: number;
  originalStatus: "Archivado en Drive" | "Sin original archivado";
}

export interface ExpensePeriodSummaryModel {
  businessName: string;
  businessTaxId: string;
  periodLabel: string;
  expenseCount: number;
  archivedOriginalCount: number;
  missingOriginalCount: number;
  registeredBase: number;
  registeredIva: number;
  registeredTotal: number;
  rows: ExpensePeriodSummaryRow[];
}

export function buildExpensePeriodSummaryModel(
  expenses: Expense[],
  suppliers: Supplier[],
  profile: BusinessProfile,
  periodLabel: string,
): ExpensePeriodSummaryModel {
  const vatExempt = isVatExempt(profile);
  const supplierNifs = new Map(
    suppliers
      .filter((supplier) => supplier.nif?.trim())
      .map((supplier) => [supplier.id, supplier.nif!.trim()]),
  );
  const rows = [...expenses]
    .sort((left, right) => {
      const byDate = left.date.localeCompare(right.date);
      if (byDate !== 0) return byDate;
      return (
        left.purchaseDocument?.invoiceNumber ?? left.description
      ).localeCompare(
        right.purchaseDocument?.invoiceNumber ?? right.description,
        "es",
        { numeric: true, sensitivity: "base" },
      );
    })
    .map((expense) => {
      const fiscal = expenseFiscalAmounts(expense, vatExempt);
      return {
        date: expense.date,
        invoiceNumber: expense.purchaseDocument?.invoiceNumber?.trim() || "—",
        supplierName: expense.supplierName.trim() || "Proveedor sin identificar",
        supplierTaxId:
          expense.purchaseDocument?.supplierNif?.trim() ||
          (expense.supplierId
            ? supplierNifs.get(expense.supplierId)
            : undefined) ||
          "—",
        category: expense.category,
        registeredBase: fiscal.registeredBase,
        registeredIva: fiscal.registeredIva,
        registeredTotal: fiscal.registeredTotal,
        originalStatus: expense.originalArchive
          ? ("Archivado en Drive" as const)
          : ("Sin original archivado" as const),
      };
    });
  const archivedOriginalCount = rows.filter(
    (row) => row.originalStatus === "Archivado en Drive",
  ).length;

  return {
    businessName:
      profile.commercialName?.trim() || profile.name.trim() || "Tu negocio",
    businessTaxId: profile.nif.trim(),
    periodLabel,
    expenseCount: rows.length,
    archivedOriginalCount,
    missingOriginalCount: rows.length - archivedOriginalCount,
    registeredBase: roundMoneySymmetric(
      rows.reduce((sum, row) => sum + row.registeredBase, 0),
    ),
    registeredIva: roundMoneySymmetric(
      rows.reduce((sum, row) => sum + row.registeredIva, 0),
    ),
    registeredTotal: roundMoneySymmetric(
      rows.reduce((sum, row) => sum + row.registeredTotal, 0),
    ),
    rows,
  };
}

export function buildExpensePeriodSummaryPdf(
  expenses: Expense[],
  suppliers: Supplier[],
  profile: BusinessProfile,
  periodLabel: string,
  generatedAt = new Date(),
): jsPDF {
  const model = buildExpensePeriodSummaryModel(
    expenses,
    suppliers,
    profile,
    periodLabel,
  );
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  pdf.setProperties({
    title: `Resumen de gastos y compras · ${periodLabel}`,
    subject: "Relación de gastos y originales incluidos en el paquete",
    author: model.businessName,
  });

  pdf.setFillColor(4, 120, 87);
  pdf.rect(0, 0, 210, 34, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(19);
  pdf.text("Resumen de gastos y compras", 14, 15);
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
        `GASTOS\n${model.expenseCount}`,
        `ORIGINALES\n${model.archivedOriginalCount}`,
        `BASE\n${formatMoney(model.registeredBase)}`,
        `IVA\n${formatMoney(model.registeredIva)}`,
        `TOTAL\n${formatMoney(model.registeredTotal)}`,
      ],
    ],
    styles: {
      fillColor: [236, 253, 245],
      textColor: [4, 120, 87],
      fontStyle: "bold",
      fontSize: 8.5,
      cellPadding: 3.2,
      lineColor: [167, 243, 208],
      lineWidth: 0.2,
      valign: "middle",
    },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 31 },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
    },
  });

  const summaryEndY =
    (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? 70;
  autoTable(pdf, {
    startY: summaryEndY + 8,
    head: [
      [
        "Fecha",
        "Factura",
        "Proveedor / NIF",
        "Categoría",
        "Base",
        "IVA",
        "Total",
        "Original",
      ],
    ],
    body: model.rows.map((row) => [
      formatIsoDate(row.date),
      row.invoiceNumber,
      `${row.supplierName}\n${row.supplierTaxId}`,
      row.category,
      formatMoney(row.registeredBase),
      formatMoney(row.registeredIva),
      formatMoney(row.registeredTotal),
      row.originalStatus,
    ]),
    theme: "grid",
    rowPageBreak: "avoid",
    margin: { left: 8, right: 8, bottom: 18 },
    styles: {
      fontSize: 6.4,
      cellPadding: 1.7,
      lineColor: [226, 232, 240],
      lineWidth: 0.12,
      textColor: [30, 41, 59],
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: [4, 120, 87],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 22 },
      2: { cellWidth: 43 },
      3: { cellWidth: 24 },
      4: { cellWidth: 20, halign: "right" },
      5: { cellWidth: 18, halign: "right" },
      6: { cellWidth: 21, halign: "right" },
      7: { cellWidth: 28 },
    },
  });

  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(209, 250, 229);
    pdf.line(8, 282, 202, 282);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.2);
    pdf.setTextColor(100, 116, 139);
    pdf.text(
      "Relación informativa. Los originales del ZIP se han verificado contra su huella de Drive.",
      8,
      287,
    );
    pdf.text(`${page}/${pageCount}`, 202, 287, { align: "right" });
    pdf.text("facturacion-autonomos.app", 105, 292, { align: "center" });
  }

  return pdf;
}

function formatIsoDate(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/u.exec(date);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : date;
}
