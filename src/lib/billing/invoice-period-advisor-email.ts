import { validateAdvisorContact } from "@/lib/advisor-contact";
import { buildGmailComposeUrl, buildMailtoUrl } from "@/lib/share";
import type { BusinessProfile } from "@/lib/types";

export interface InvoicePeriodAdvisorEmail {
  recipient: string;
  subject: string;
  body: string;
  gmailComposeUrl: string;
  mailtoUrl: string;
}

export function buildInvoicePeriodAdvisorEmail(
  profile: BusinessProfile,
  periodLabel: string,
  archiveFileName: string,
  summaryFileName: string,
  invoiceCount: number,
): InvoicePeriodAdvisorEmail | null {
  const advisor = validateAdvisorContact(profile.advisorContact);
  if (!advisor.valid || !advisor.value) return null;

  const senderName =
    profile.commercialName?.trim() || profile.name.trim() || "tu cliente";
  const subject = `Facturas emitidas · ${periodLabel} · ${senderName}`;
  const body = [
    `Hola ${advisor.value.advisorName},`,
    "",
    `Te envío las facturas emitidas correspondientes a ${periodLabel}.`,
    `El paquete ${archiveFileName} contiene ${invoiceCount} factura${invoiceCount === 1 ? "" : "s"} en PDF y el archivo ${summaryFileName} con su relación y totales.`,
    "",
    "Factu ha descargado el ZIP en este dispositivo. Adjunta ese archivo a este correo antes de enviarlo.",
    "",
    "Un saludo,",
    senderName,
  ].join("\n");

  return {
    recipient: advisor.value.email,
    subject,
    body,
    gmailComposeUrl: buildGmailComposeUrl(
      advisor.value.email,
      subject,
      body,
    ),
    mailtoUrl: buildMailtoUrl(advisor.value.email, subject, body),
  };
}
