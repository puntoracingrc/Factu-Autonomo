import { buildDocumentPdfBlob } from "../pdf";
import { buildPaymentReminderEmail } from "./templates/payment-reminder";
import { MAX_PAYMENT_REMINDER_MESSAGE_LENGTH } from "./payment-reminder-request";
import { issuerDisplayName, resolveIssuerForDocument } from "../issuer-snapshot";
import { hasLegacyImportOrigin } from "../document-integrity/legacy-import-attestation";
import { isPendingInvoicePayment } from "../income";
import { hasClientEmail } from "../share";
import type { BusinessProfile, Document } from "../types";
import { sendEmail } from "./send";

function pdfFilename(doc: Document): string {
  const base = doc.number.replace(/[^\w.-]+/g, "_").trim() || "factura";
  return base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
}

async function documentPdfBase64(
  doc: Document,
  profile: BusinessProfile,
): Promise<string> {
  const blob = await buildDocumentPdfBlob(doc, profile);
  const buffer = Buffer.from(await blob.arrayBuffer());
  return buffer.toString("base64");
}

export interface SendPaymentReminderInput {
  doc: Document;
  profile: BusinessProfile;
  message: string;
  replyTo?: string;
}

export interface SendPaymentReminderResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
  emailId?: string;
}

export function validatePaymentReminderInput(
  input: SendPaymentReminderInput,
): string | null {
  if (hasLegacyImportOrigin(input.doc)) {
    return "Los recordatorios solo estan disponibles para facturas creadas en la aplicacion.";
  }
  if (!isPendingInvoicePayment(input.doc)) {
    return "Solo se pueden enviar recordatorios de facturas pendientes de cobro.";
  }
  if (!hasClientEmail(input.doc)) {
    return "El cliente no tiene email.";
  }
  if (input.doc.items.length > 200) {
    return "La factura tiene demasiadas líneas para enviarla por email.";
  }
  const message = input.message.trim();
  if (!message) return "Escribe un mensaje para el cliente.";
  if (message.length > MAX_PAYMENT_REMINDER_MESSAGE_LENGTH) {
    return `El mensaje es demasiado largo (máx. ${MAX_PAYMENT_REMINDER_MESSAGE_LENGTH} caracteres).`;
  }
  return null;
}

export async function sendPaymentReminderEmail(
  input: SendPaymentReminderInput,
): Promise<SendPaymentReminderResult> {
  const validationError = validatePaymentReminderInput(input);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const email = input.doc.client.email!.trim();
  const issuer = resolveIssuerForDocument(input.doc, input.profile);
  const content = buildPaymentReminderEmail({
    doc: input.doc,
    message: input.message.trim(),
    senderName: issuerDisplayName(issuer),
  });

  let pdfContent: string;
  try {
    pdfContent = await documentPdfBase64(input.doc, input.profile);
  } catch {
    return { ok: false, error: "No se pudo generar el PDF de la factura." };
  }

  const result = await sendEmail({
    to: email,
    subject: content.subject,
    html: content.html,
    text: content.text,
    replyTo: input.replyTo,
    attachments: [
      {
        filename: pdfFilename(input.doc),
        content: pdfContent,
      },
    ],
  });

  if (result.skipped) {
    return { ok: false, skipped: true, error: result.error };
  }

  if (!result.ok) {
    return { ok: false, error: result.error ?? "No se pudo enviar el email." };
  }

  return { ok: true, emailId: result.id };
}
