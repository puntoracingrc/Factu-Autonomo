import type { BusinessProfile, Document } from "./types";
import { documentTotals, formatMoney, formatShortDate } from "./calculations";
import { resolveIssuerForDocument } from "./issuer-snapshot";
import { isRectificativa } from "./rectificativas";
import { buildDocumentPdfBlob, downloadDocumentPdf } from "./pdf";

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
  const issuer = resolveIssuerForDocument(doc, profile);
  const { total } = documentTotals(doc);
  const typeLabel = documentTypeLabel(doc);
  const business = issuer.name || "Tu negocio";
  const lines = [
    `Hola${doc.client.name ? ` ${doc.client.name.split(" ")[0]}` : ""},`,
    "",
    `Te envío ${typeLabel === "factura" ? "la" : "el"} ${typeLabel} ${doc.number} por importe de ${formatMoney(total)}.`,
    `Fecha: ${formatShortDate(doc.date)}`,
  ];

  if (doc.dueDate && doc.type === "factura" && !isRectificativa(doc)) {
    lines.push(`Vencimiento: ${formatShortDate(doc.dueDate)}`);
  }

  if (issuer.iban && doc.type === "factura" && !isRectificativa(doc)) {
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

async function pdfFile(doc: Document, profile: BusinessProfile): Promise<File> {
  const blob = await buildDocumentPdfBlob(doc, profile);
  return new File([blob], `${doc.number}.pdf`, { type: "application/pdf" });
}

async function sharePdfNative(
  doc: Document,
  profile: BusinessProfile,
  text: string,
): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.share) return false;

  const file = await pdfFile(doc, profile);
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
): Promise<void> {
  const email = doc.client.email?.trim();
  if (!email) return;

  const message = buildShareMessage(doc, profile);
  const subject = `${documentTypeLabel(doc).replace(/^./, (c) => c.toUpperCase())} ${doc.number}`;

  const shared = await sharePdfNative(doc, profile, message);
  if (shared) return;

  const mailto = buildMailtoUrl(email, subject, `${message}\n\n(Adjunta el PDF descargado.)`);
  await downloadDocumentPdf(doc, profile);
  window.location.href = mailto;
}

export async function shareDocumentByWhatsApp(
  doc: Document,
  profile: BusinessProfile,
): Promise<void> {
  const phone = doc.client.phone?.trim();
  if (!phone) return;

  const message = `${buildShareMessage(doc, profile)}\n\n(Adjunto el PDF.)`;
  const url = buildWhatsAppUrl(phone, message);
  if (!url) return;

  const shared = await sharePdfNative(doc, profile, message);
  if (!shared) await downloadDocumentPdf(doc, profile);

  window.open(url, "_blank", "noopener,noreferrer");
}

export function hasClientEmail(doc: Document): boolean {
  return Boolean(doc.client.email?.trim());
}

export function hasClientPhone(doc: Document): boolean {
  const phone = doc.client.phone?.trim();
  if (!phone) return false;
  return normalizePhoneForWhatsApp(phone) !== null;
}
