import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { BusinessProfile, Document } from "./types";
import { formatMoney, formatShortDate, lineSubtotal } from "./calculations";
import {
  buildPdfViewModelForDocument,
  documentPdfViewAmounts,
  type DocumentPdfLineView,
  type DocumentPdfViewModel,
} from "./document-integrity/pdf-source";
import { ivaBreakdownByRate } from "./invoice-compliance";
import { isRectificativa, rectificationTypeLabel } from "./rectificativas";
import { formatQuantityWithUnit } from "./document-units";
import {
  pdfLogoDrawSize,
  prepareLogoForPdf,
} from "./pdf-logo";
import {
  documentTemplateAccentRgb,
  documentTemplateDensityPadding,
  documentTemplatePdfFont,
  documentTemplatePdfFontSize,
  normalizeDocumentTemplate,
} from "./document-templates";
import { hasVerifactuQr, prepareVerifactuQrForPdf } from "./verifactu/qr-image";

export interface PdfArtifacts {
  qrDataUrl?: string;
  logo?: {
    dataUrl: string;
    width: number;
    height: number;
  };
}

function documentLabel(doc: Document): string {
  if (isRectificativa(doc)) return "FACTURA RECTIFICATIVA";
  const labels: Record<Document["type"], string> = {
    factura: "FACTURA",
    presupuesto: "PRESUPUESTO",
    recibo: "RECIBO",
  };
  return labels[doc.type];
}

function pdfLineTotal(item: DocumentPdfLineView, vatExempt: boolean): number {
  if (typeof item.total === "number") return item.total;
  if (vatExempt) return lineSubtotal(item);
  return item.quantity * item.unitPrice * (1 + item.ivaPercent / 100);
}

function pdfVatBreakdown(viewModel: DocumentPdfViewModel) {
  if (viewModel.taxSummary) {
    return viewModel.taxSummary.byRate
      .map((row) => ({
        rate: row.ivaPercent,
        base: row.taxableBase,
        quota: row.ivaAmount,
      }));
  }

  return ivaBreakdownByRate(viewModel.items);
}

function drawVerifactuQrBlock(
  pdf: jsPDF,
  doc: Document,
  artifacts: PdfArtifacts,
  startY: number,
  options: { font: "helvetica" | "times" | "courier"; textSize: number },
): number {
  if (!artifacts.qrDataUrl || !doc.verifactu) return startY;

  const qrSize = 35;
  const qrX = 14;
  const qrY = startY + 8;
  const centerX = qrX + qrSize / 2;
  const textSize = Math.max(9, options.textSize);
  const noteX = qrX + qrSize + 10;

  pdf.setFont(options.font, "normal");
  pdf.setFontSize(textSize);
  pdf.setTextColor(0, 0, 0);
  pdf.text("QR tributario:", centerX, startY + 4, { align: "center" });
  pdf.setFillColor(255, 255, 255);
  pdf.rect(qrX - 2, qrY - 2, qrSize + 4, qrSize + 4, "F");
  pdf.addImage(artifacts.qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

  const verifactuText =
    doc.verifactu.environment === "test"
      ? "QR Veri*Factu en entorno de pruebas"
      : "QR Veri*Factu generado para verificación tributaria";
  const verifactuLines = pdf.splitTextToSize(verifactuText, 52);
  const phraseY = qrY + qrSize + 6;
  pdf.text(verifactuLines, centerX, phraseY, {
    align: "center",
    maxWidth: 52,
  });
  const bottomY = phraseY + verifactuLines.length * 5;

  pdf.setFontSize(Math.max(8, textSize - 1));

  if (doc.verifactu.csv) {
    pdf.text(`CSV: ${doc.verifactu.csv}`, noteX, qrY + 8, {
      maxWidth: 126,
    });
  }

  if (doc.verifactu.environment === "test") {
    pdf.setTextColor(180, 83, 9);
    pdf.text("*** MODO PRUEBAS VERI*FACTU ***", noteX, qrY + 16, {
      maxWidth: 126,
    });
    pdf.setTextColor(0, 0, 0);
  }

  return bottomY + 6;
}

export async function preparePdfArtifacts(
  doc: Document,
  profile: BusinessProfile,
): Promise<PdfArtifacts> {
  return preparePdfArtifactsForViewModel(buildPdfViewModelForDocument(doc, profile));
}

export async function preparePdfArtifactsForViewModel(
  viewModel: DocumentPdfViewModel,
): Promise<PdfArtifacts> {
  const artifacts: PdfArtifacts = {};

  if (hasVerifactuQr(viewModel.doc)) {
    artifacts.qrDataUrl = await prepareVerifactuQrForPdf(viewModel.doc);
  }

  if (viewModel.logoUrl) {
    const logo = await prepareLogoForPdf(viewModel.logoUrl);
    if (logo) artifacts.logo = logo;
  }

  return artifacts;
}

export function buildDocumentPdf(
  doc: Document,
  profile: BusinessProfile,
  artifacts: PdfArtifacts = {},
): jsPDF {
  return buildDocumentPdfFromViewModel(
    buildPdfViewModelForDocument(doc, profile),
    artifacts,
  );
}

export function buildDocumentPdfFromViewModel(
  viewModel: DocumentPdfViewModel,
  artifacts: PdfArtifacts = {},
): jsPDF {
  const pdf = new jsPDF();
  const doc = viewModel.doc;
  const issuer = viewModel.issuer;
  const template = normalizeDocumentTemplate(viewModel.template);
  const pdfFont = documentTemplatePdfFont(template.font);
  const bodyFontSize = documentTemplatePdfFontSize(template.bodyFontSize, "body");
  const titleFontSize = documentTemplatePdfFontSize(
    template.titleFontSize,
    "title",
  );
  const issuerFontSize = documentTemplatePdfFontSize(
    template.issuerFontSize,
    "issuer",
  );
  const totalFontSize = documentTemplatePdfFontSize(
    template.totalFontSize,
    "total",
  );
  const vatExempt = viewModel.vatExempt;
  const { subtotal, iva, total } = documentPdfViewAmounts(viewModel);
  const label = documentLabel(doc);
  const isRect = isRectificativa(doc);
  const accent: [number, number, number] = isRect
    ? [180, 83, 9]
    : documentTemplateAccentRgb(template.accent);
  const softAccent: [number, number, number] = accent.map((value) =>
    Math.min(248, Math.round(value + (255 - value) * 0.88)),
  ) as [number, number, number];

  pdf.setFont(pdfFont, "normal");

  let y = 14;
  if (template.style === "futuro" && !artifacts.qrDataUrl) {
    pdf.setFillColor(accent[0], accent[1], accent[2]);
    pdf.rect(0, 0, 210, 10, "F");
    pdf.setFillColor(248, 250, 252);
    pdf.rect(0, 10, 210, 12, "F");
    y = Math.max(y, 24);
  }

  if (artifacts.qrDataUrl && doc.verifactu) {
    y = drawVerifactuQrBlock(pdf, doc, artifacts, y, {
      font: pdfFont,
      textSize: bodyFontSize,
    });
  }

  let logoBottomY = 14;
  if (artifacts.logo && template.showLogo) {
    const { width: logoW, height: logoH } = pdfLogoDrawSize(artifacts.logo);
    const logoX = 196 - logoW;
    try {
      pdf.addImage(artifacts.logo.dataUrl, "PNG", logoX, 14, logoW, logoH);
      logoBottomY = 14 + logoH;
    } catch {
      // Logo opcional: si falla la decodificación, seguimos sin imagen
    }
  }

  const contentStartY = Math.max(y, logoBottomY) + 6;

  pdf.setFont(pdfFont, "bold");
  pdf.setFontSize(titleFontSize);
  pdf.setTextColor(accent[0], accent[1], accent[2]);
  pdf.text(label, 14, contentStartY);

  pdf.setFont(pdfFont, "normal");
  pdf.setFontSize(bodyFontSize);
  pdf.setTextColor(60, 60, 60);
  if (template.showIssuerBox) {
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(12, contentStartY + 4, 76, 39, 2, 2, "F");
  }
  pdf.setFont(pdfFont, "bold");
  pdf.setFontSize(issuerFontSize);
  pdf.text(issuer.name || "Tu negocio", 14, contentStartY + 10);
  pdf.setFont(pdfFont, "normal");
  pdf.setFontSize(bodyFontSize);
  const baseY = contentStartY + 10;
  if (issuer.nif) pdf.text(`NIF: ${issuer.nif}`, 14, baseY + 6);
  if (issuer.address) pdf.text(issuer.address, 14, baseY + 12);
  if (issuer.city)
    pdf.text(`${issuer.postalCode} ${issuer.city}`, 14, baseY + 18);
  if (issuer.phone) pdf.text(`Tel: ${issuer.phone}`, 14, baseY + 24);
  if (issuer.email) pdf.text(issuer.email, 14, baseY + 30);

  pdf.setFontSize(bodyFontSize + 1);
  pdf.setTextColor(0, 0, 0);
  pdf.text(`Nº ${doc.number}`, 140, contentStartY + 4);
  pdf.text(`Fecha: ${formatShortDate(doc.date)}`, 140, contentStartY + 10);
  if (doc.dueDate && doc.type === "factura" && !isRect) {
    pdf.text(`Vencimiento: ${formatShortDate(doc.dueDate)}`, 140, contentStartY + 16);
  }

  let clientBoxY = baseY + 38;
  if (isRect && doc.rectification) {
    pdf.setFontSize(Math.max(8, bodyFontSize - 0.2));
    pdf.setTextColor(120, 53, 15);
    pdf.text(
      `Rectifica factura: ${doc.rectification.originalNumber} (${formatShortDate(doc.rectification.originalDate)})`,
      14,
      clientBoxY,
    );
    pdf.text(
      `Tipo: ${rectificationTypeLabel(doc.rectification.type)} · Motivo: ${doc.rectification.reason}`,
      14,
      clientBoxY + 6,
    );
    clientBoxY += 14;
  }

  const clientBoxHeight =
    28 + (doc.client.email ? 6 : 0) + (doc.client.phone ? 6 : 0);

  pdf.setFillColor(
    template.style === "clasico" ? 243 : softAccent[0],
    template.style === "clasico" ? 244 : softAccent[1],
    template.style === "clasico" ? 246 : softAccent[2],
  );
  if (template.style === "clasico") {
    pdf.rect(14, clientBoxY, 182, clientBoxHeight, "F");
  } else {
    pdf.roundedRect(14, clientBoxY, 182, clientBoxHeight, 2, 2, "F");
  }
  pdf.setFontSize(bodyFontSize);
  pdf.setTextColor(0, 0, 0);
  pdf.text("Cliente:", 18, clientBoxY + 8);
  pdf.setFontSize(bodyFontSize + 1);
  pdf.text(doc.client.name, 18, clientBoxY + 16);
  if (doc.client.nif) pdf.text(`NIF: ${doc.client.nif}`, 18, clientBoxY + 22);
  if (doc.client.address) pdf.text(doc.client.address, 100, clientBoxY + 16);
  if (doc.client.email) pdf.text(doc.client.email, 100, clientBoxY + 22);
  if (doc.client.phone) pdf.text(`Tel: ${doc.client.phone}`, 100, clientBoxY + 28);

  autoTable(pdf, {
    startY: clientBoxY + 34,
    head: vatExempt
      ? [["Concepto", "Cant.", "Precio", "Total"]]
      : [["Concepto", "Cant.", "Precio", "IVA", "Total"]],
    body: viewModel.items.map((item) => {
      const lineTotal = pdfLineTotal(item, vatExempt);
      const quantityLabel = formatQuantityWithUnit(
        item.quantity,
        item.unit ?? "ud",
      );
      return vatExempt
        ? [
            item.description,
            quantityLabel,
            formatMoney(item.unitPrice),
            formatMoney(lineTotal),
          ]
        : [
            item.description,
            quantityLabel,
            formatMoney(item.unitPrice),
            `${item.ivaPercent}%`,
            formatMoney(lineTotal),
          ];
    }),
    styles: {
      font: pdfFont,
      fontSize: template.style === "futuro" ? bodyFontSize - 0.4 : bodyFontSize,
      cellPadding: documentTemplateDensityPadding(template.density),
      lineColor: template.style === "clasico" ? [230, 230, 230] : softAccent,
    },
    headStyles: {
      fillColor: accent,
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles:
      template.style === "clasico"
        ? undefined
        : {
            fillColor: [248, 250, 252],
          },
  });

  const finalY = (pdf as jsPDF & { lastAutoTable: { finalY: number } })
    .lastAutoTable.finalY + 10;

  let totalsY = finalY;

  if (vatExempt) {
    pdf.setFontSize(totalFontSize);
    pdf.setFont(pdfFont, "bold");
    pdf.text(`TOTAL: ${formatMoney(total)}`, 120, totalsY);
    pdf.setFont(pdfFont, "normal");
    pdf.setFontSize(Math.max(8, bodyFontSize - 1));
    pdf.text("Operación exenta de IVA", 120, totalsY + 8);
    totalsY += 8;
  } else {
    pdf.setFontSize(bodyFontSize);
    pdf.setFont(pdfFont, "normal");
    const breakdown = pdfVatBreakdown(viewModel);
    for (const row of breakdown) {
      pdf.text(
        `IVA ${row.rate}% — Base: ${formatMoney(row.base)} · Cuota: ${formatMoney(row.quota)}`,
        120,
        totalsY,
      );
      totalsY += 6;
    }
    pdf.text(`Base imponible: ${formatMoney(subtotal)}`, 120, totalsY);
    totalsY += 6;
    pdf.text(`IVA total: ${formatMoney(iva)}`, 120, totalsY);
    totalsY += 6;
    pdf.setFontSize(totalFontSize);
    pdf.setFont(pdfFont, "bold");
    if (template.style !== "clasico") {
      pdf.setFillColor(accent[0], accent[1], accent[2]);
      pdf.roundedRect(118, totalsY - 2, 78, 10, 2, 2, "F");
      pdf.setTextColor(255, 255, 255);
    }
    pdf.text(`TOTAL: ${formatMoney(total)}`, 120, totalsY + 4);
    pdf.setTextColor(0, 0, 0);
    totalsY += 10;
  }

  let footerY = totalsY + 10;

  if (doc.paymentTerms && template.showPaymentBox) {
    pdf.setFont(pdfFont, "normal");
    pdf.setFontSize(bodyFontSize);
    if (template.style !== "clasico") {
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(12, footerY - 3, 90, 9, 2, 2, "F");
    }
    pdf.text(`Forma de pago: ${doc.paymentTerms}`, 14, footerY);
    footerY += 8;
  }

  if (doc.notes) {
    pdf.setFont(pdfFont, "normal");
    pdf.setFontSize(bodyFontSize);
    pdf.text(`Notas: ${doc.notes}`, 14, footerY + 4);
    footerY += 10;
  }

  if (issuer.iban && doc.type === "factura" && !isRect) {
    pdf.setFontSize(bodyFontSize);
    pdf.text(`IBAN: ${issuer.iban}`, 14, footerY + 4);
  }

  return pdf;
}

export async function buildDocumentPdfBlob(
  doc: Document,
  profile: BusinessProfile,
): Promise<Blob> {
  const viewModel = buildPdfViewModelForDocument(doc, profile);
  const artifacts = await preparePdfArtifactsForViewModel(viewModel);
  return buildDocumentPdfFromViewModel(viewModel, artifacts).output("blob");
}

function pdfFilename(doc: Document): string {
  const base = doc.number.replace(/[^\w.-]+/g, "_").trim() || "documento";
  return base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
}

/** Descarga fiable en móvil (Safari bloquea jsPDF.save tras async largos). */
export function triggerPdfBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // En iOS/PWA a veces solo abre en pestaña nueva.
  const isMobile =
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && window.innerWidth < 1024);
  if (isMobile) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function downloadDocumentPdf(
  doc: Document,
  profile: BusinessProfile,
): Promise<void> {
  const viewModel = buildPdfViewModelForDocument(doc, profile);
  const artifacts = await preparePdfArtifactsForViewModel(viewModel);
  const blob = buildDocumentPdfFromViewModel(viewModel, artifacts).output("blob");
  triggerPdfBlobDownload(blob, pdfFilename(doc));
}

export async function openDocumentPdfPreview(
  doc: Document,
  profile: BusinessProfile,
): Promise<void> {
  const viewModel = buildPdfViewModelForDocument(doc, profile);
  const artifacts = await preparePdfArtifactsForViewModel(viewModel);
  const blob = buildDocumentPdfFromViewModel(viewModel, artifacts).output("blob");
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    URL.revokeObjectURL(url);
    throw new Error("popup_blocked");
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
