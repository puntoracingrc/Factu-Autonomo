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
import { livePdfIssuerWarning } from "./business-profile";
import { hasDistinctFiscalName, issuerDisplayName } from "./issuer-snapshot";
import { isDraftInvoiceNumber } from "./documents";
import { hasVerifactuQr, prepareVerifactuQrForPdf } from "./verifactu/qr-image";

export interface PdfArtifacts {
  qrDataUrl?: string;
  logo?: {
    dataUrl: string;
    width: number;
    height: number;
  };
}

export interface DocumentPdfOptions {
  freePlanBranding?: boolean;
}

const FREE_PLAN_BRANDING_TEXT =
  "Factura realizada con facturacion-autonomos.app";

function documentLabel(doc: Document): string {
  if (isRectificativa(doc)) return "FACTURA RECTIFICATIVA";
  if (isDraftInvoiceNumber(doc)) return "BORRADOR DE FACTURA";
  const labels: Record<Document["type"], string> = {
    factura: "FACTURA",
    presupuesto: "PRESUPUESTO",
    recibo: "RECIBO",
  };
  return labels[doc.type];
}

function drawFreePlanBranding(
  pdf: jsPDF,
  options: {
    font: "helvetica" | "times" | "courier";
  },
): void {
  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setFont(options.font, "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(150, 150, 150);
    pdf.text(FREE_PLAN_BRANDING_TEXT, 105, 292, { align: "center" });
  }
  pdf.setTextColor(0, 0, 0);
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
    "Factura verificable en la sede electrónica de la AEAT";
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
  options: DocumentPdfOptions = {},
): jsPDF {
  return buildDocumentPdfFromViewModel(
    buildPdfViewModelForDocument(doc, profile),
    artifacts,
    options,
  );
}

export function buildDocumentPdfFromViewModel(
  viewModel: DocumentPdfViewModel,
  artifacts: PdfArtifacts = {},
  options: DocumentPdfOptions = {},
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
  const issuerWarning =
    viewModel.source === "live" ? livePdfIssuerWarning(issuer) : null;
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
  const issuerBoxY = contentStartY + 4;
  const issuerTextX = 14;
  const issuerMaxWidth = 70;
  pdf.setFont(pdfFont, "bold");
  pdf.setFontSize(issuerFontSize);
  const issuerTitleLines = pdf.splitTextToSize(
    issuerDisplayName(issuer),
    issuerMaxWidth,
  );
  pdf.setFont(pdfFont, "normal");
  pdf.setFontSize(bodyFontSize);
  const issuerDetailLines = [
    ...(hasDistinctFiscalName(issuer)
      ? [`Titular fiscal: ${issuer.name.trim()}`]
      : []),
    ...(issuer.nif ? [`NIF: ${issuer.nif}`] : []),
    ...(issuer.address ? [issuer.address] : []),
    ...(issuer.city ? [`${issuer.postalCode} ${issuer.city}`.trim()] : []),
    ...(issuer.phone ? [`Tel: ${issuer.phone}`] : []),
    ...(issuer.email ? [issuer.email] : []),
  ].flatMap((line) => pdf.splitTextToSize(line, issuerMaxWidth));
  const issuerWarningLines = issuerWarning
    ? pdf.splitTextToSize(issuerWarning, issuerMaxWidth)
    : [];
  const issuerTitleLineHeight = Math.max(6, issuerFontSize * 0.42);
  const issuerDetailLineHeight = Math.max(5.5, bodyFontSize * 0.5);
  const issuerWarningLineHeight = Math.max(4.5, (bodyFontSize - 1) * 0.5);
  const issuerBoxHeight = Math.max(
    39,
    10 +
      issuerTitleLines.length * issuerTitleLineHeight +
      issuerDetailLines.length * issuerDetailLineHeight +
      (issuerWarningLines.length
        ? 2 + issuerWarningLines.length * issuerWarningLineHeight
        : 0),
  );

  if (template.showIssuerBox) {
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(12, issuerBoxY, 76, issuerBoxHeight, 2, 2, "F");
  }
  pdf.setFont(pdfFont, "bold");
  pdf.setFontSize(issuerFontSize);
  let issuerCursorY = issuerBoxY + 6;
  for (const line of issuerTitleLines) {
    pdf.text(line, issuerTextX, issuerCursorY);
    issuerCursorY += issuerTitleLineHeight;
  }
  pdf.setFont(pdfFont, "normal");
  pdf.setFontSize(bodyFontSize);
  pdf.setTextColor(60, 60, 60);
  for (const line of issuerDetailLines) {
    pdf.text(line, issuerTextX, issuerCursorY);
    issuerCursorY += issuerDetailLineHeight;
  }
  if (issuerWarningLines.length > 0) {
    issuerCursorY += 2;
    pdf.setFontSize(Math.max(7, bodyFontSize - 1));
    pdf.setTextColor(180, 83, 9);
    for (const line of issuerWarningLines) {
      pdf.text(line, issuerTextX, issuerCursorY);
      issuerCursorY += issuerWarningLineHeight;
    }
    pdf.setTextColor(60, 60, 60);
    pdf.setFontSize(bodyFontSize);
  }

  pdf.setFontSize(bodyFontSize + 1);
  pdf.setTextColor(0, 0, 0);
  pdf.text(`Nº ${doc.number}`, 140, contentStartY + 4);
  pdf.text(`Fecha: ${formatShortDate(doc.date)}`, 140, contentStartY + 10);
  let documentMetaY = contentStartY + 16;
  if (isDraftInvoiceNumber(doc)) {
    pdf.setTextColor(180, 83, 9);
    pdf.text("No emitida", 140, documentMetaY);
    pdf.setTextColor(0, 0, 0);
    documentMetaY += 6;
  }
  if (doc.dueDate && doc.type === "factura" && !isRect) {
    pdf.text(`Vencimiento: ${formatShortDate(doc.dueDate)}`, 140, documentMetaY);
  }
  if (doc.dueDate && doc.type === "presupuesto") {
    pdf.text(`Válido hasta: ${formatShortDate(doc.dueDate)}`, 140, contentStartY + 16);
  }

  let clientBoxY = issuerBoxY + issuerBoxHeight + 5;
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
    margin: {
      bottom: options.freePlanBranding ? 16 : 10,
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

  if (options.freePlanBranding) {
    drawFreePlanBranding(pdf, { font: pdfFont });
  }

  return pdf;
}

export async function buildDocumentPdfBlob(
  doc: Document,
  profile: BusinessProfile,
  options: DocumentPdfOptions = {},
): Promise<Blob> {
  const viewModel = buildPdfViewModelForDocument(doc, profile);
  const artifacts = await preparePdfArtifactsForViewModel(viewModel);
  return buildDocumentPdfFromViewModel(viewModel, artifacts, options).output(
    "blob",
  );
}

function pdfFilename(doc: Document): string {
  if (isDraftInvoiceNumber(doc)) {
    const suffix = doc.id.replace(/[^\w.-]+/g, "_").slice(0, 8) || "nuevo";
    return `factura-borrador-${suffix}.pdf`;
  }
  const base = doc.number.replace(/[^\w.-]+/g, "_").trim() || "documento";
  return base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function openPdfWindow(title: string): Window {
  const opened = window.open("", "_blank");
  if (!opened) {
    throw new Error("popup_blocked");
  }

  opened.opener = null;
  opened.document.open();
  opened.document.write(`<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      html, body { height: 100%; margin: 0; background: #f8fafc; color: #0f172a; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      .loading { display: grid; min-height: 100%; place-items: center; padding: 2rem; text-align: center; }
      .loading p { margin: 0; font-size: 1rem; font-weight: 700; }
    </style>
  </head>
  <body>
    <main class="loading"><p>Generando PDF...</p></main>
  </body>
</html>`);
  opened.document.close();
  return opened;
}

function renderPdfWindow(
  opened: Window,
  blobUrl: string,
  filename: string,
  options: { print?: boolean } = {},
): void {
  const title = escapeHtml(filename);
  const src = escapeHtml(blobUrl);
  const printScript = options.print
    ? `
    <script>
      const frame = document.getElementById("pdf-frame");
      const status = document.getElementById("print-status");
      let attempted = false;
      function printPdf() {
        if (attempted) return;
        attempted = true;
        try {
          frame.contentWindow.focus();
          frame.contentWindow.print();
          status.textContent = "Impresión preparada. Si no aparece el diálogo, usa el botón de imprimir del visor.";
        } catch (error) {
          status.textContent = "No se pudo abrir el diálogo automáticamente. Usa el botón de imprimir del visor.";
        }
      }
      frame.addEventListener("load", () => window.setTimeout(printPdf, 350));
      window.setTimeout(printPdf, 1800);
    </script>`
    : "";

  opened.document.open();
  opened.document.write(`<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      html, body { height: 100%; margin: 0; background: #111827; color: #0f172a; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      body { display: flex; flex-direction: column; }
      header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: .75rem 1rem; background: #fff; border-bottom: 1px solid #e2e8f0; }
      h1 { margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .95rem; }
      a { border-radius: .75rem; background: #2563eb; color: #fff; padding: .55rem .85rem; text-decoration: none; font-size: .85rem; font-weight: 700; }
      iframe { flex: 1; width: 100%; min-height: 0; border: 0; background: #fff; }
      .fallback { margin: 0; padding: .5rem 1rem; background: #fef3c7; color: #78350f; font-size: .85rem; }
    </style>
  </head>
  <body>
    <header>
      <h1>${title}</h1>
      <a href="${src}" download="${title}">Descargar PDF</a>
    </header>
    <p id="print-status" class="fallback">${options.print ? "Preparando impresión del PDF seleccionado..." : "Vista previa del PDF seleccionado."}</p>
    <iframe id="pdf-frame" src="${src}" title="${title}"></iframe>
    ${printScript}
  </body>
</html>`);
  opened.document.close();
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
  options: DocumentPdfOptions = {},
): Promise<void> {
  const blob = await buildDocumentPdfBlob(doc, profile, options);
  triggerPdfBlobDownload(blob, pdfFilename(doc));
}

export async function openDocumentPdfPreview(
  doc: Document,
  profile: BusinessProfile,
  options: DocumentPdfOptions = {},
): Promise<void> {
  const opened = openPdfWindow(pdfFilename(doc));

  try {
    const blob = await buildDocumentPdfBlob(doc, profile, options);
    const url = URL.createObjectURL(blob);
    renderPdfWindow(opened, url, pdfFilename(doc));
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    opened.close();
    throw error;
  }
}

export async function printDocumentPdf(
  doc: Document,
  profile: BusinessProfile,
  options: DocumentPdfOptions = {},
): Promise<void> {
  const opened = openPdfWindow(`Imprimir ${pdfFilename(doc)}`);

  try {
    const blob = await buildDocumentPdfBlob(doc, profile, options);
    const url = URL.createObjectURL(blob);
    renderPdfWindow(opened, url, pdfFilename(doc), { print: true });
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    opened.close();
    throw error;
  }
}
