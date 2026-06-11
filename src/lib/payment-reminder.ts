import { documentTotals, formatMoney, formatShortDate } from "./calculations";
import { resolveIssuerForDocument } from "./issuer-snapshot";
import type { BusinessProfile, Document } from "./types";

function clientFirstName(doc: Document): string {
  const name = doc.client.name?.trim();
  if (!name) return "";
  return name.split(/\s+/)[0] ?? "";
}

export function buildDefaultPaymentReminderMessage(
  doc: Document,
  profile: BusinessProfile,
): string {
  const issuer = resolveIssuerForDocument(doc, profile);
  const { total } = documentTotals(doc);
  const business = issuer.name || "Tu negocio";
  const greeting = clientFirstName(doc);
  const lines = [
    `Hola${greeting ? ` ${greeting}` : ""},`,
    "",
    "Espero que estés bien. Te escribo para recordarte, con toda tranquilidad, el pago de la factura que te envié:",
    "",
    `Factura: ${doc.number}`,
    `Importe: ${formatMoney(total)}`,
    `Fecha: ${formatShortDate(doc.date)}`,
  ];

  if (doc.dueDate) {
    const due = new Date(doc.dueDate);
    const overdue = due.getTime() < Date.now();
    lines.push(
      overdue
        ? `Vencimiento: ${formatShortDate(doc.dueDate)} (ya pasó)`
        : `Vencimiento: ${formatShortDate(doc.dueDate)}`,
    );
  }

  if (issuer.iban) {
    lines.push(`IBAN: ${issuer.iban}`);
  }

  lines.push(
    "",
    "Si ya lo has tramitado, puedes ignorar este mensaje. Si necesitas cualquier aclaración, respóndeme sin problema.",
    "",
    "Un saludo,",
    business,
  );

  return lines.join("\n");
}

export function paymentReminderSubject(doc: Document): string {
  return `Recordatorio amable — Factura ${doc.number}`;
}
