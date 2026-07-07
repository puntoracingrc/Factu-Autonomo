import type {
  BusinessProfile,
  Document,
  DocumentEmailSendPreference,
  DocumentWhatsAppSendPreference,
} from "./types";
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

export function greetingForDate(date = new Date()): string {
  const hour = date.getHours();
  if (hour >= 6 && hour < 14) return "Buenos días";
  if (hour >= 14 && hour < 21) return "Buenas tardes";
  return "Buenas noches";
}

function firstClientName(name?: string): string {
  return name?.trim().split(/\s+/)[0] ?? "";
}

function issuerSignatureLines(
  issuer: ReturnType<typeof buildPdfViewModelForDocument>["issuer"],
): string[] {
  const displayName = issuerDisplayName(issuer);
  const fiscalName =
    issuer.name && issuer.name.trim() !== displayName ? issuer.name.trim() : "";
  const location = [issuer.postalCode, issuer.city].filter(Boolean).join(" ");
  const address = [issuer.address, location].filter(Boolean).join(", ");

  return [
    displayName,
    fiscalName,
    issuer.nif ? `NIF: ${issuer.nif}` : "",
    address,
    issuer.phone ? `Tel.: ${issuer.phone}` : "",
    issuer.email ?? "",
    issuer.website ?? "",
  ].filter(Boolean);
}

export function buildShareMessage(
  doc: Document,
  profile: BusinessProfile,
  date = new Date(),
): string {
  const viewModel = buildPdfViewModelForDocument(doc, profile);
  const renderDoc = viewModel.doc;
  const issuer = viewModel.issuer;
  const { total } = viewModel.taxSummary
    ? documentPdfViewAmounts(viewModel)
    : documentTotals(renderDoc);
  const typeLabel = documentTypeLabel(renderDoc);
  const clientName = firstClientName(renderDoc.client.name);
  const article = typeLabel === "factura" ? "la" : "el";
  const lines = [
    `${greetingForDate(date)}${clientName ? `, ${clientName}` : ""}:`,
    "",
    `Le adjuntamos ${article} ${typeLabel} ${renderDoc.number} por importe de ${formatMoney(total)}.`,
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

  lines.push("", "Un saludo,", ...issuerSignatureLines(issuer));
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

export function buildGmailComposeUrl(
  email: string,
  subject: string,
  body: string,
): string {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: email.trim(),
    su: subject,
    body,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
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

function shareSubject(doc: Document): string {
  return `${documentTypeLabel(doc).replace(/^./, (c) => c.toUpperCase())} ${doc.number}`;
}

async function downloadPdfBeforeExternalClient(
  doc: Document,
  profile: BusinessProfile,
  pdfOptions?: DocumentPdfOptions,
): Promise<void> {
  await downloadDocumentPdf(doc, profile, pdfOptions);
}

function openExternalUrl(url: string): void {
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) window.location.href = url;
}

function externalAttachmentBody(message: string): string {
  return `${message}\n\n(Adjunta el PDF.)`;
}

export function openDocumentEmailMessage(
  doc: Document,
  profile: BusinessProfile,
  method: Extract<DocumentEmailSendPreference, "gmail" | "mailto">,
): boolean {
  const email = doc.client.email?.trim();
  if (!email) return false;

  const message = buildShareMessage(doc, profile);
  const subject = shareSubject(doc);
  const body = externalAttachmentBody(message);

  if (method === "gmail") {
    openExternalUrl(buildGmailComposeUrl(email, subject, body));
    return true;
  }

  window.location.href = buildMailtoUrl(email, subject, body);
  return true;
}

export function openWhatsAppDocumentMessage(
  doc: Document,
  profile: BusinessProfile,
): boolean {
  const phone = doc.client.phone?.trim();
  if (!phone) return false;

  const message = `${buildShareMessage(doc, profile)}\n\n(Adjunto el PDF.)`;
  const url = buildWhatsAppUrl(phone, message);
  if (!url) return false;

  openExternalUrl(url);
  return true;
}

export async function shareDocumentByEmail(
  doc: Document,
  profile: BusinessProfile,
  pdfOptions?: DocumentPdfOptions,
  method: Exclude<DocumentEmailSendPreference, "ask"> = "native",
): Promise<void> {
  const email = doc.client.email?.trim();
  if (!email) return;

  const message = buildShareMessage(doc, profile);
  const subject = shareSubject(doc);

  if (method === "native") {
    const shared = await sharePdfNative(doc, profile, message, pdfOptions);
    if (shared) return;
  }

  const body = externalAttachmentBody(message);

  if (method === "gmail") {
    openExternalUrl(buildGmailComposeUrl(email, subject, body));
    await downloadPdfBeforeExternalClient(doc, profile, pdfOptions);
    return;
  }

  await downloadPdfBeforeExternalClient(doc, profile, pdfOptions);
  window.location.href = buildMailtoUrl(email, subject, body);
}

export async function shareDocumentByWhatsApp(
  doc: Document,
  profile: BusinessProfile,
  pdfOptions?: DocumentPdfOptions,
  method: Exclude<DocumentWhatsAppSendPreference, "ask"> = "native",
): Promise<void> {
  const phone = doc.client.phone?.trim();
  if (!phone) return;

  const message = `${buildShareMessage(doc, profile)}\n\n(Adjunto el PDF.)`;

  if (method === "native") {
    const shared = await sharePdfNative(doc, profile, message, pdfOptions);
    if (shared) return;
  }

  if (!openWhatsAppDocumentMessage(doc, profile)) return;
  await downloadPdfBeforeExternalClient(doc, profile, pdfOptions);
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
