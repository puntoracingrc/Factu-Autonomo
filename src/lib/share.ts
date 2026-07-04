import type { BusinessProfile, Document } from "./types";
import { documentTotals, formatMoney, formatShortDate } from "./calculations";
import {
  buildPdfViewModelForDocument,
  documentPdfViewAmounts,
} from "./document-integrity/pdf-source";
import { isValidCustomerEmail } from "./customers";
import { isCollectedDocument } from "./income";
import { issuerDisplayName } from "./issuer-snapshot";
import { isRectificativa } from "./rectificativas";
import { buildDocumentPdfBlob, downloadDocumentPdf } from "./pdf";
import type { DocumentPdfOptions } from "./pdf";

function documentTypeLabel(doc: Document): string {
  if (isRectificativa(doc)) return "factura rectificativa";
  const labels: Record<Document["type"], string> = {
    factura: "factura",
    presupuesto: "presupuesto",
    recibo: "recibo",
  };
  return labels[doc.type];
}

export function buildShareMessage(doc: Document, profile: BusinessProfile): string {
  const viewModel = buildPdfViewModelForDocument(doc, profile);
  const renderDoc = viewModel.doc;
  const issuer = viewModel.issuer;
  const { total } = viewModel.taxSummary
    ? documentPdfViewAmounts(viewModel)
    : documentTotals(renderDoc);
  const typeLabel = documentTypeLabel(renderDoc);
  const business = issuerDisplayName(issuer);
  const lines = [
    `Hola${renderDoc.client.name ? ` ${renderDoc.client.name.split(" ")[0]}` : ""},`,
    "",
    `Te envío ${typeLabel === "factura" ? "la" : "el"} ${typeLabel} ${renderDoc.number} por importe de ${formatMoney(total)}.`,
    `Fecha: ${formatShortDate(renderDoc.date)}`,
  ];

  if (
    renderDoc.dueDate &&
    renderDoc.type === "factura" &&
    !isRectificativa(renderDoc)
  ) {
    lines.push(`Vencimiento: ${formatShortDate(renderDoc.dueDate)}`);
  }

  const pendingPayment =
    renderDoc.type === "factura" &&
    !isRectificativa(renderDoc) &&
    !isCollectedDocument(doc) &&
    doc.status !== "anulada";

  if (pendingPayment && issuer.iban) {
    lines.push(`IBAN: ${issuer.iban}`);
  }

  lines.push("", "Un saludo,", business);
  return lines.join("\n");
}

export function normalizePhoneForWhatsApp(
  phone: string,
  defaultCountryCode = "34",
): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 9) return null;
  if (digits.length >= 11 && digits.startsWith(defaultCountryCode)) return digits;
  if (digits.length === 9) return `${defaultCountryCode}${digits}`;
  if (digits.startsWith("00")) return digits.slice(2);
  return digits;
}

export function buildWhatsAppUrl(phone: string, message: string): string | null {
  const normalized = normalizePhoneForWhatsApp(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function buildMailtoUrl(
  email: string,
  subject: string,
  body: string,
): string {
  const params = new URLSearchParams({
    subject,
    body,
  });
  return `mailto:${email.trim()}?${params.toString()}`;
}

async function pdfFile(
  doc: Document,
  profile: BusinessProfile,
  pdfOptions?: DocumentPdfOptions,
): Promise<File> {
  const blob = await buildDocumentPdfBlob(doc, profile, pdfOptions);
  return new File([blob], `${doc.number}.pdf`, { type: "application/pdf" });
}

async function sharePdfNative(
  doc: Document,
  profile: BusinessProfile,
  text: string,
  pdfOptions?: DocumentPdfOptions,
): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.share) return false;

  const file = await pdfFile(doc, profile, pdfOptions);
  const payload = { files: [file], title: doc.number, text };

  if (navigator.canShare && !navigator.canShare(payload)) return false;

  try {
    await navigator.share(payload);
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return true;
    return false;
  }
}

export async function shareDocumentByEmail(
  doc: Document,
  profile: BusinessProfile,
  pdfOptions?: DocumentPdfOptions,
): Promise<void> {
  const email = doc.client.email?.trim();
  if (!email) return;

  const message = buildShareMessage(doc, profile);
  const subject = `${documentTypeLabel(doc).replace(/^./, (c) => c.toUpperCase())} ${doc.number}`;

  const shared = await sharePdfNative(doc, profile, message, pdfOptions);
  if (shared) return;

  const mailto = buildMailtoUrl(email, subject, `${message}\n\n(Adjunta el PDF descargado.)`);
  await downloadDocumentPdf(doc, profile, pdfOptions);
  window.location.href = mailto;
}

export async function shareDocumentByWhatsApp(
  doc: Document,
  profile: BusinessProfile,
  pdfOptions?: DocumentPdfOptions,
): Promise<void> {
  const phone = doc.client.phone?.trim();
  if (!phone) return;

  const message = `${buildShareMessage(doc, profile)}\n\n(Adjunto el PDF.)`;
  const url = buildWhatsAppUrl(phone, message);
  if (!url) return;

  const shared = await sharePdfNative(doc, profile, message, pdfOptions);
  if (shared) return;

  await downloadDocumentPdf(doc, profile, pdfOptions);
  window.open(url, "_blank", "noopener,noreferrer");
}

export function hasClientEmail(doc: Document): boolean {
  const email = doc.client.email?.trim();
  return Boolean(email && isValidCustomerEmail(email));
}

export function hasClientPhone(doc: Document): boolean {
  const phone = doc.client.phone?.trim();
  if (!phone) return false;
  return normalizePhoneForWhatsApp(phone) !== null;
}
