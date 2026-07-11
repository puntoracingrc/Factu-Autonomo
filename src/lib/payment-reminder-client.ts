import { showFactuToast } from "./factu/occasional";
import { isPendingInvoicePayment } from "./income";
import { paymentReminderSubject } from "./payment-reminder";
import { MAX_PAYMENT_REMINDER_MESSAGE_LENGTH } from "./email/payment-reminder-request";
import { buildDocumentPdfBlob, downloadDocumentPdf } from "./pdf";
import type { DocumentPdfOptions } from "./pdf";
import {
  buildMailtoUrl,
  buildWhatsAppUrl,
  hasClientEmail,
  hasClientPhone,
} from "./share";
import { getSupabaseClientAsync } from "./supabase/client";
import type { BusinessProfile, Document } from "./types";

export type PaymentReminderChannel = "email" | "whatsapp";

export interface SendPaymentReminderInput {
  doc: Document;
  profile: BusinessProfile;
  message: string;
  pdfOptions?: DocumentPdfOptions;
}

export interface SendPaymentReminderResult {
  ok: boolean;
  via?: "api" | "mailto" | "whatsapp" | "native";
  error?: string;
}

async function getCurrentAccessToken(): Promise<string | null> {
  const supabase = await getSupabaseClientAsync();
  if (!supabase) return null;

  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function validatePaymentReminderMessage(
  doc: Document,
  message: string,
  channel: PaymentReminderChannel,
): string | null {
  if (!isPendingInvoicePayment(doc)) {
    return "La factura ya está cobrada o no admite recordatorio.";
  }

  if (channel === "email" && !hasClientEmail(doc)) {
    return "El cliente no tiene email.";
  }

  if (channel === "whatsapp" && !hasClientPhone(doc)) {
    return "El cliente no tiene teléfono válido para WhatsApp.";
  }

  if (!message.trim()) {
    return "Escribe un mensaje para el cliente.";
  }

  if (message.trim().length > MAX_PAYMENT_REMINDER_MESSAGE_LENGTH) {
    return `El mensaje es demasiado largo (máx. ${MAX_PAYMENT_REMINDER_MESSAGE_LENGTH} caracteres).`;
  }

  return null;
}

async function shareReminderPdfNative(
  doc: Document,
  profile: BusinessProfile,
  text: string,
  pdfOptions?: DocumentPdfOptions,
): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.share) return false;

  const blob = await buildDocumentPdfBlob(doc, profile, pdfOptions);
  const file = new File([blob], `${doc.number}.pdf`, {
    type: "application/pdf",
  });
  const payload = { files: [file], title: doc.number, text };

  if (navigator.canShare && !navigator.canShare(payload)) return false;

  try {
    await navigator.share(payload);
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      return true;
    return false;
  }
}

export async function sendPaymentReminderByEmail(
  input: SendPaymentReminderInput,
): Promise<SendPaymentReminderResult> {
  const validationError = validatePaymentReminderMessage(
    input.doc,
    input.message,
    "email",
  );
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const email = input.doc.client.email!.trim();
  const message = input.message.trim();

  try {
    const token = await getCurrentAccessToken();
    if (token) {
      const response = await fetch("/api/email/payment-reminder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          documentId: input.doc.id,
          message,
        }),
      });

      const body = (await response.json()) as {
        ok?: boolean;
        skipped?: boolean;
        error?: string;
      };

      if (response.ok && body.ok) {
        return { ok: true, via: "api" };
      }

      if (!body.skipped && body.error) {
        // Solo `skipped` autoriza continuar al mailto/native local de abajo.
        // Cualquier rechazo no marcado permanece cerrado y nunca reintenta Resend.
        return { ok: false, error: body.error };
      }
    }
  } catch {
    // Fallback a mailto si la API no responde.
  }

  const subject = paymentReminderSubject(input.doc);

  const sharedNative = await shareReminderPdfNative(
    input.doc,
    input.profile,
    message,
    input.pdfOptions,
  );
  if (sharedNative) {
    return { ok: true, via: "native" };
  }

  try {
    await downloadDocumentPdf(input.doc, input.profile, input.pdfOptions);
  } catch {
    return {
      ok: false,
      error: "No se pudo descargar el PDF. Inténtalo de nuevo.",
    };
  }

  window.location.href = buildMailtoUrl(email, subject, message);
  showFactuToast(
    "Se abrió tu correo con el mensaje. Adjunta el PDF descargado y envíalo.",
    5000,
  );
  return { ok: true, via: "mailto" };
}

export async function sendPaymentReminderByWhatsApp(
  input: SendPaymentReminderInput,
): Promise<SendPaymentReminderResult> {
  const validationError = validatePaymentReminderMessage(
    input.doc,
    input.message,
    "whatsapp",
  );
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const phone = input.doc.client.phone!.trim();
  const message = input.message.trim();
  const url = buildWhatsAppUrl(phone, message);
  if (!url) {
    return { ok: false, error: "Teléfono no válido para WhatsApp." };
  }

  const sharedNative = await shareReminderPdfNative(
    input.doc,
    input.profile,
    message,
    input.pdfOptions,
  );

  if (!sharedNative) {
    try {
      await downloadDocumentPdf(input.doc, input.profile, input.pdfOptions);
    } catch {
      return {
        ok: false,
        error: "No se pudo descargar el PDF. Inténtalo de nuevo.",
      };
    }
  }

  window.open(url, "_blank", "noopener,noreferrer");

  if (!sharedNative) {
    showFactuToast(
      "WhatsApp abierto con el mensaje. Adjunta el PDF descargado al chat.",
      5000,
    );
  }

  return { ok: true, via: "whatsapp" };
}

export function canSendPaymentReminder(
  doc: Document,
  channel: PaymentReminderChannel,
): boolean {
  if (!isPendingInvoicePayment(doc)) return false;
  return channel === "email" ? hasClientEmail(doc) : hasClientPhone(doc);
}

export function canShowPaymentReminder(doc: Document): boolean {
  return (
    isPendingInvoicePayment(doc) && (hasClientEmail(doc) || hasClientPhone(doc))
  );
}
