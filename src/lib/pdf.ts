import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { BusinessProfile, Document } from "./types";
import { formatMoney, formatShortDate, lineSubtotal } from "./calculations";
import { isRectificativa, rectificationTypeLabel } from "./rectificativas";
import { documentAmounts, isVatExempt } from "./vat-regime";

function documentLabel(doc: Document): string {
  if (isRectificativa(doc)) return "FACTURA RECTIFICATIVA";
  const labels: Record<Document["type"], string> = {
    factura: "FACTURA",
    presupuesto: "PRESUPUESTO",
    recibo: "RECIBO",
  };
  return labels[doc.type];
}

export function buildDocumentPdf(
  doc: Document,
  profile: BusinessProfile,
): jsPDF {
  const pdf = new jsPDF();
  const vatExempt = isVatExempt(profile);
  const { subtotal, iva, total } = documentAmounts(doc, vatExempt);
  const label = documentLabel(doc);
  const isRect = isRectificativa(doc);

  let contentStartY = 20;

  if (profile.logoUrl?.startsWith("data:image/")) {
    try {
      const format = profile.logoUrl.includes("image/png") ? "PNG" : "JPEG";
      pdf.addImage(profile.logoUrl, format, 14, 12, 36, 18);
      contentStartY = 36;
    } catch {
      // Logo opcional: si falla la decodificación, seguimos sin imagen
    }
  }

  pdf.setFontSize(20);
  pdf.setTextColor(isRect ? 180 : 37, isRect ? 83 : 99, isRect ? 9 : 235);
  pdf.text(label, 14, contentStartY);

  pdf.setFontSize(10);
  pdf.setTextColor(60, 60, 60);
  pdf.text(profile.name || "Tu negocio", 14, contentStartY + 10);
  const baseY = contentStartY + 10;
  if (profile.nif) pdf.text(`NIF: ${profile.nif}`, 14, baseY + 6);
  if (profile.address) pdf.text(profile.address, 14, baseY + 12);
  if (profile.city)
    pdf.text(`${profile.postalCode} ${profile.city}`, 14, baseY + 18);
  if (profile.phone) pdf.text(`Tel: ${profile.phone}`, 14, baseY + 24);
  if (profile.email) pdf.text(profile.email, 14, baseY + 30);

  pdf.setFontSize(11);
  pdf.setTextColor(0, 0, 0);
  pdf.text(`Nº ${doc.number}`, 140, 30);
  pdf.text(`Fecha: ${formatShortDate(doc.date)}`, 140, 36);
  if (doc.dueDate && doc.type === "factura" && !isRect) {
    pdf.text(`Vencimiento: ${formatShortDate(doc.dueDate)}`, 140, 42);
  }

  let clientBoxY = baseY + 38;
  if (isRect && doc.rectification) {
    pdf.setFontSize(9);
    pdf.setTextColor(120, 53, 15);
    pdf.text(
      `Rectifica factura: ${doc.rectification.originalNumber} (${formatShortDate(doc.rectification.originalDate)})`,
      14,
      68,
    );
    pdf.text(
      `Tipo: ${rectificationTypeLabel(doc.rectification.type)} · Motivo: ${doc.rectification.reason}`,
      14,
      74,
    );
    clientBoxY = 82;
  }

  const clientBoxHeight =
    28 + (doc.client.email ? 6 : 0) + (doc.client.phone ? 6 : 0);

  pdf.setFillColor(243, 244, 246);
  pdf.rect(14, clientBoxY, 182, clientBoxHeight, "F");
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);
  pdf.text("Cliente:", 18, clientBoxY + 8);
  pdf.setFontSize(11);
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
    body: doc.items.map((item) => {
      const lineTotal = vatExempt
        ? lineSubtotal(item)
        : item.quantity * item.unitPrice * (1 + item.ivaPercent / 100);
      return vatExempt
        ? [
            item.description,
            String(item.quantity),
            formatMoney(item.unitPrice),
            formatMoney(lineTotal),
          ]
        : [
            item.description,
            String(item.quantity),
            formatMoney(item.unitPrice),
            `${item.ivaPercent}%`,
            formatMoney(lineTotal),
          ];
    }),
    styles: { fontSize: 9 },
    headStyles: { fillColor: isRect ? [180, 83, 9] : [37, 99, 235] },
  });

  const finalY = (pdf as jsPDF & { lastAutoTable: { finalY: number } })
    .lastAutoTable.finalY + 10;

  if (vatExempt) {
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text(`TOTAL: ${formatMoney(total)}`, 120, finalY);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text("Operación exenta de IVA", 120, finalY + 8);
  } else {
    pdf.text(`Base imponible: ${formatMoney(subtotal)}`, 120, finalY);
    pdf.text(`IVA: ${formatMoney(iva)}`, 120, finalY + 6);
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text(`TOTAL: ${formatMoney(total)}`, 120, finalY + 14);
  }

  if (doc.notes) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(`Notas: ${doc.notes}`, 14, finalY + 24);
  }

  if (profile.iban && doc.type === "factura" && !isRect) {
    pdf.setFontSize(9);
    pdf.text(`IBAN: ${profile.iban}`, 14, finalY + 32);
  }

  return pdf;
}

export function buildDocumentPdfBlob(
  doc: Document,
  profile: BusinessProfile,
): Blob {
  return buildDocumentPdf(doc, profile).output("blob");
}

export function downloadDocumentPdf(
  doc: Document,
  profile: BusinessProfile,
): void {
  buildDocumentPdf(doc, profile).save(`${doc.number}.pdf`);
}
