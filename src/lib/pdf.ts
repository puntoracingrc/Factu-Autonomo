import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { BusinessProfile, Document } from "./types";
import { documentTotals, formatMoney, formatShortDate } from "./calculations";

const TYPE_LABELS: Record<Document["type"], string> = {
  factura: "FACTURA",
  presupuesto: "PRESUPUESTO",
  recibo: "RECIBO",
};

export function downloadDocumentPdf(
  doc: Document,
  profile: BusinessProfile,
): void {
  const pdf = new jsPDF();
  const { subtotal, iva, total } = documentTotals(doc);
  const label = TYPE_LABELS[doc.type];

  pdf.setFontSize(20);
  pdf.setTextColor(37, 99, 235);
  pdf.text(label, 14, 20);

  pdf.setFontSize(10);
  pdf.setTextColor(60, 60, 60);
  pdf.text(profile.name || "Tu negocio", 14, 30);
  if (profile.nif) pdf.text(`NIF: ${profile.nif}`, 14, 36);
  if (profile.address) pdf.text(profile.address, 14, 42);
  if (profile.city)
    pdf.text(`${profile.postalCode} ${profile.city}`, 14, 48);
  if (profile.phone) pdf.text(`Tel: ${profile.phone}`, 14, 54);
  if (profile.email) pdf.text(profile.email, 14, 60);

  pdf.setFontSize(11);
  pdf.setTextColor(0, 0, 0);
  pdf.text(`Nº ${doc.number}`, 140, 30);
  pdf.text(`Fecha: ${formatShortDate(doc.date)}`, 140, 36);
  if (doc.dueDate && doc.type === "factura") {
    pdf.text(`Vencimiento: ${formatShortDate(doc.dueDate)}`, 140, 42);
  }

  pdf.setFillColor(243, 244, 246);
  pdf.rect(14, 68, 182, 28, "F");
  pdf.setFontSize(10);
  pdf.text("Cliente:", 18, 76);
  pdf.setFontSize(11);
  pdf.text(doc.client.name, 18, 84);
  if (doc.client.nif) pdf.text(`NIF: ${doc.client.nif}`, 18, 90);
  if (doc.client.address) pdf.text(doc.client.address, 100, 84);

  autoTable(pdf, {
    startY: 102,
    head: [["Concepto", "Cant.", "Precio", "IVA", "Total"]],
    body: doc.items.map((item) => [
      item.description,
      String(item.quantity),
      formatMoney(item.unitPrice),
      `${item.ivaPercent}%`,
      formatMoney(item.quantity * item.unitPrice * (1 + item.ivaPercent / 100)),
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [37, 99, 235] },
  });

  const finalY = (pdf as jsPDF & { lastAutoTable: { finalY: number } })
    .lastAutoTable.finalY + 10;

  pdf.text(`Base imponible: ${formatMoney(subtotal)}`, 120, finalY);
  pdf.text(`IVA: ${formatMoney(iva)}`, 120, finalY + 6);
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text(`TOTAL: ${formatMoney(total)}`, 120, finalY + 14);

  if (doc.notes) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(`Notas: ${doc.notes}`, 14, finalY + 24);
  }

  if (profile.iban && doc.type === "factura") {
    pdf.setFontSize(9);
    pdf.text(`IBAN: ${profile.iban}`, 14, finalY + 32);
  }

  pdf.save(`${doc.number}.pdf`);
}
