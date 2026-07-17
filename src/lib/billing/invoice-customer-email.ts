import {
  getCustomerDisplayName,
  isValidCustomerEmail,
  migrateCustomer,
  normalizeCustomerEmail,
} from "@/lib/customers";
import { buildGmailComposeUrl, buildMailtoUrl } from "@/lib/share";
import type { BusinessProfile, Customer } from "@/lib/types";

export interface InvoiceCustomerEmail {
  recipient: string;
  subject: string;
  body: string;
  gmailComposeUrl: string;
  mailtoUrl: string;
}

export function buildInvoiceCustomerEmail(
  profile: BusinessProfile,
  customerInput: Customer,
  recipientEmail: string | undefined,
  selectionDescription: string,
  archiveFileName: string,
  summaryFileName: string,
  invoiceCount: number,
): InvoiceCustomerEmail | null {
  const customer = migrateCustomer(customerInput);
  const recipient =
    normalizeCustomerEmail(recipientEmail).toLocaleLowerCase("en-US");
  if (!recipient || !isValidCustomerEmail(recipient)) return null;

  const customerName = getCustomerDisplayName(customer).trim() || "Cliente";
  const greetingName = customer.contactName?.trim() || customerName;
  const senderName =
    profile.commercialName?.trim() || profile.name.trim() || "Tu proveedor";
  const subject = `Facturas emitidas · ${selectionDescription} · ${senderName}`;
  const body = [
    `Hola ${greetingName},`,
    "",
    `Te envío tus facturas emitidas correspondientes a ${selectionDescription}.`,
    `El paquete ${archiveFileName} contiene ${invoiceCount} factura${invoiceCount === 1 ? "" : "s"} en PDF y el archivo ${summaryFileName} con su relación y totales.`,
    "",
    "Un saludo,",
    senderName,
  ].join("\n");

  return {
    recipient,
    subject,
    body,
    gmailComposeUrl: buildGmailComposeUrl(recipient, subject, body),
    mailtoUrl: buildMailtoUrl(recipient, subject, body),
  };
}
