import { paymentReminderSubject } from "../../payment-reminder";
import type { Document } from "../../types";

export interface PaymentReminderEmailInput {
  doc: Document;
  message: string;
  senderName: string;
}

export interface PaymentReminderEmailContent {
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildPaymentReminderEmail(
  input: PaymentReminderEmailInput,
): PaymentReminderEmailContent {
  const subject = paymentReminderSubject(input.doc);
  const text = input.message.trim();
  const htmlBody = escapeHtml(text).replace(/\n/g, "<br />");

  const html = `<!DOCTYPE html>
<html lang="es">
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0f172a; line-height: 1.6;">
    <div style="max-width: 560px; margin: 0 auto; padding: 24px;">
      <p style="white-space: pre-wrap; margin: 0 0 24px;">${htmlBody}</p>
      <p style="margin: 0; font-size: 13px; color: #64748b;">
        Factura adjunta en PDF · Enviado desde ${escapeHtml(input.senderName || "Factu Autónomo")}
      </p>
    </div>
  </body>
</html>`;

  return { subject, html, text };
}
