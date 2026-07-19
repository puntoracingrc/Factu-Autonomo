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
import { hasPublicVerifactuAccreditation } from "./verifactu/attestation";

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
  websiteFooter?: boolean;
}

function formatIssuerLocationLines(
  issuer: DocumentPdfViewModel["issuer"],
): string[] {
  const cityLine = [
    [issuer.postalCode, issuer.city].filter(Boolean).join(" "),
    issuer.province,
  ]
    .filter(Boolean)
    .join(", ");
  return [cityLine, issuer.country].filter(
    (line): line is string => Boolean(line),
  );
}

function compactPdfTextLine(parts: Array<string | undefined>): string | null {
  const line = parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" · ");
  return line || null;
}

function formatIssuerDetailLines(
  issuer: DocumentPdfViewModel["issuer"],
): string[] {
  return [
    compactPdfTextLine([
      hasDistinctFiscalName(issuer)
        ? `Titular fiscal: ${issuer.name.trim()}`
        : undefined,
      issuer.nif ? `NIF: ${issuer.nif}` : undefined,
      issuer.vatId && issuer.vatId !== issuer.nif
        ? `VAT/VIES: ${issuer.vatId}`
        : undefined,
    ]),
    compactPdfTextLine([issuer.address, ...formatIssuerLocationLines(issuer)]),
    compactPdfTextLine([
      issuer.phone ? `Tel: ${issuer.phone}` : undefined,
      issuer.email,
      issuer.website,
    ]),
  ].filter((line): line is string => Boolean(line));
}

const FREE_PLAN_BRANDING_TEXT =
  "Factura realizada con facturacion-autonomos.app";
const WEBSITE_FOOTER_TEXT = "facturacion-autonomos.app";

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

function drawWebsiteFooter(
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
    pdf.setTextColor(100, 116, 139);
    pdf.text(WEBSITE_FOOTER_TEXT, 105, 292, { align: "center" });
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

export function pdfVatTotalLines(input: {
  breakdown: Array<{ rate: number; base: number; quota: number }>;
  subtotal: number;
  iva: number;
}): string[] {
  if (input.breakdown.length <= 1) {
    const rate = input.breakdown[0]?.rate;
    const ivaLabel =
      typeof rate === "number" ? `IVA ${rate}%` : "IVA";
    return [
      `Base imponible: ${formatMoney(input.subtotal)}`,
      `${ivaLabel}: ${formatMoney(input.iva)}`,
    ];
  }

  return [
    ...input.breakdown.map(
      (row) =>
        `IVA ${row.rate}% — Base: ${formatMoney(row.base)} · Cuota: ${formatMoney(row.quota)}`,
    ),
    `Base imponible: ${formatMoney(input.subtotal)}`,
    `IVA total: ${formatMoney(input.iva)}`,
  ];
}

function drawVerifactuQrBlock(
  pdf: jsPDF,
  doc: Document,
  artifacts: PdfArtifacts,
  startY: number,
  options: { font: "helvetica" | "times" | "courier"; textSize: number },
): number {
  if (
    !artifacts.qrDataUrl ||
    !doc.verifactu ||
    !hasPublicVerifactuAccreditation(doc)
  ) {
    return startY;
  }

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
  const renderArtifacts = hasPublicVerifactuAccreditation(doc)
    ? artifacts
    : { ...artifacts, qrDataUrl: undefined };
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
  if (template.style === "futuro" && !renderArtifacts.qrDataUrl) {
    pdf.setFillColor(accent[0], accent[1], accent[2]);
    pdf.rect(0, 0, 210, 10, "F");
    pdf.setFillColor(248, 250, 252);
    pdf.rect(0, 10, 210, 12, "F");
    y = Math.max(y, 24);
  }

  if (renderArtifacts.qrDataUrl && doc.verifactu) {
    y = drawVerifactuQrBlock(pdf, doc, renderArtifacts, y, {
      font: pdfFont,
      textSize: bodyFontSize,
    });
  }

  let logoBottomY = 14;
  if (renderArtifacts.logo && template.showLogo) {
    const { width: logoW, height: logoH } = pdfLogoDrawSize(renderArtifacts.logo);
    const logoX = 196 - logoW;
    try {
      pdf.addImage(renderArtifacts.logo.dataUrl, "PNG", logoX, 14, logoW, logoH);
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
  const issuerDetailLines = formatIssuerDetailLines(issuer).flatMap((line) =>
    pdf.splitTextToSize(line, issuerMaxWidth),
  );
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
    const rectificationLines = [
      `Rectifica factura: ${doc.rectification.originalNumber} (${formatShortDate(doc.rectification.originalDate)})`,
      `Tipo: ${rectificationTypeLabel(doc.rectification.type)} · Motivo: ${doc.rectification.reason}`,
    ].flatMap((line) => pdf.splitTextToSize(line, 180));
    for (const line of rectificationLines) {
      pdf.text(line, 14, clientBoxY);
      clientBoxY += 5.5;
    }
    clientBoxY += 3;
  }

  const clientLeftLines = [
    doc.client.name,
    doc.client.nif ? `NIF: ${doc.client.nif}` : "",
    doc.client.customerType === "company" && doc.client.contactName
      ? `Contacto: ${doc.client.contactName}`
      : "",
  ]
    .filter(Boolean)
    .flatMap((line) => pdf.splitTextToSize(line, 76));
  const clientRightLines = [
    doc.client.address ?? "",
    doc.client.email ?? "",
    doc.client.phone ? `Tel: ${doc.client.phone}` : "",
  ]
    .filter(Boolean)
    .flatMap((line) => pdf.splitTextToSize(line, 86));
  const clientLineHeight = Math.max(5.5, bodyFontSize * 0.5);
  const clientBoxHeight = Math.max(
    28,
    14 + Math.max(clientLeftLines.length, clientRightLines.length) * clientLineHeight,
  );

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
  let clientLeftY = clientBoxY + 16;
  clientLeftLines.forEach((line, index) => {
    pdf.text(line, 18, clientLeftY);
    if (index === 0) pdf.setFontSize(bodyFontSize);
    clientLeftY += clientLineHeight;
  });
  pdf.setFontSize(bodyFontSize);
  let clientRightY = clientBoxY + 16;
  clientRightLines.forEach((line) => {
    pdf.text(line, 106, clientRightY);
    clientRightY += clientLineHeight;
  });

  autoTable(pdf, {
    startY: clientBoxY + clientBoxHeight + 8,
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
      bottom: options.freePlanBranding || options.websiteFooter ? 16 : 10,
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
    for (const line of pdfVatTotalLines({
      breakdown: pdfVatBreakdown(viewModel),
      subtotal,
      iva,
    })) {
      pdf.text(line, 120, totalsY);
      totalsY += 6;
    }
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
    const paymentLines = pdf.splitTextToSize(
      `Forma de pago: ${doc.paymentTerms}`,
      88,
    );
    if (template.style !== "clasico") {
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(
        12,
        footerY - 3,
        90,
        4 + paymentLines.length * 5.5,
        2,
        2,
        "F",
      );
    }
    for (const line of paymentLines) {
      pdf.text(line, 14, footerY);
      footerY += 5.5;
    }
    footerY += 3;
  }

  if (doc.salesTerms) {
    pdf.setFont(pdfFont, "normal");
    pdf.setFontSize(bodyFontSize);
    const salesTermLines = pdf.splitTextToSize(
      `Condiciones de venta: ${doc.salesTerms}`,
      180,
    );
    for (const line of salesTermLines) {
      pdf.text(line, 14, footerY + 4);
      footerY += 5.5;
    }
    footerY += 5;
  }

  if (doc.notes) {
    pdf.setFont(pdfFont, "normal");
    pdf.setFontSize(bodyFontSize);
    const noteLines = pdf.splitTextToSize(`Notas: ${doc.notes}`, 180);
    for (const line of noteLines) {
      pdf.text(line, 14, footerY + 4);
      footerY += 5.5;
    }
    footerY += 5;
  }

  if (issuer.iban && doc.type === "factura" && !isRect) {
    pdf.setFontSize(bodyFontSize);
    pdf.text(`IBAN: ${issuer.iban}`, 14, footerY + 4);
  }

  if (options.freePlanBranding) {
    drawFreePlanBranding(pdf, { font: pdfFont });
  } else if (options.websiteFooter) {
    drawWebsiteFooter(pdf, { font: pdfFont });
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

export function documentPdfFilename(doc: Document): string {
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
      const printButton = document.getElementById("print-button");
      let attempted = false;
      function printPdf(force) {
        if (attempted && !force) return;
        attempted = true;
        try {
          frame.contentWindow.focus();
          frame.contentWindow.print();
          status.textContent = "Impresión preparada. Si no aparece el diálogo, pulsa Imprimir ahora.";
          printButton.hidden = false;
        } catch (error) {
          status.textContent = "Tu navegador ha bloqueado la impresión automática. Pulsa Imprimir ahora.";
          printButton.hidden = false;
        }
      }
      printButton.addEventListener("click", () => printPdf(true));
      frame.addEventListener("load", () => window.setTimeout(() => printPdf(false), 350));
      window.setTimeout(() => printPdf(false), 1800);
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
      .actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: .5rem; }
      button, a { border: 0; border-radius: .75rem; background: #2563eb; color: #fff; padding: .55rem .85rem; text-decoration: none; font: inherit; font-size: .85rem; font-weight: 700; cursor: pointer; }
      a { display: inline-flex; align-items: center; }
      button { background: #0f172a; }
      button[hidden] { display: none; }
      iframe { flex: 1; width: 100%; min-height: 0; border: 0; background: #fff; }
      .fallback { margin: 0; padding: .5rem 1rem; background: #fef3c7; color: #78350f; font-size: .85rem; }
    </style>
  </head>
  <body>
    <header>
      <h1>${title}</h1>
      <div class="actions">
        ${options.print ? '<button id="print-button" type="button" hidden>Imprimir ahora</button>' : ""}
        <a href="${src}" download="${title}">Descargar PDF</a>
      </div>
    </header>
    <p id="print-status" class="fallback">${options.print ? "Preparando impresión del PDF seleccionado..." : "Vista previa del PDF seleccionado."}</p>
    <iframe id="pdf-frame" src="${src}" title="${title}"></iframe>
    ${printScript}
  </body>
</html>`);
  opened.document.close();
  try {
    opened.opener = null;
  } catch {
    // Algunos navegadores no permiten modificar opener después de renderizar.
  }
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
  triggerPdfBlobDownload(blob, documentPdfFilename(doc));
}

export async function openDocumentPdfPreview(
  doc: Document,
  profile: BusinessProfile,
  options: DocumentPdfOptions = {},
): Promise<void> {
  const filename = documentPdfFilename(doc);
  const opened = openPdfWindow(filename);

  try {
    const blob = await buildDocumentPdfBlob(doc, profile, options);
    const file = new File([blob], filename, {
      type: blob.type || "application/pdf",
    });
    const url = URL.createObjectURL(file);
    try {
      opened.opener = null;
    } catch {
      // Algunos navegadores no permiten modificar opener.
    }
    if (typeof opened.location.replace === "function") {
      opened.location.replace(url);
    } else {
      opened.location.href = url;
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 10 * 60_000);
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
  const opened = openPdfWindow(`Imprimir ${documentPdfFilename(doc)}`);

  try {
    const blob = await buildDocumentPdfBlob(doc, profile, options);
    const url = URL.createObjectURL(blob);
    renderPdfWindow(opened, url, documentPdfFilename(doc), { print: true });
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    opened.close();
    throw error;
  }
}
