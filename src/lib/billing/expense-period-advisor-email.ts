import { validateAdvisorContact } from "@/lib/advisor-contact";
import { buildGmailComposeUrl, buildMailtoUrl } from "@/lib/share";
import type { BusinessProfile } from "@/lib/types";

export interface ExpensePeriodAdvisorEmail {
  recipient: string;
  subject: string;
  body: string;
  gmailComposeUrl: string;
  mailtoUrl: string;
}

export function buildExpensePeriodAdvisorEmail(
  profile: BusinessProfile,
  periodLabel: string,
  archiveFileName: string,
  summaryFileName: string,
  expenseCount: number,
  originalCount: number,
): ExpensePeriodAdvisorEmail | null {
  const advisor = validateAdvisorContact(profile.advisorContact);
  if (!advisor.valid || !advisor.value) return null;

  const senderName =
    profile.commercialName?.trim() || profile.name.trim() || "tu cliente";
  const subject = `Gastos y compras · ${periodLabel} · ${senderName}`;
  const missingCount = expenseCount - originalCount;
  const body = [
    `Hola ${advisor.value.advisorName},`,
    "",
    `Te envío los gastos y facturas de compra correspondientes a ${periodLabel}.`,
    `El paquete ${archiveFileName} contiene ${originalCount} original${originalCount === 1 ? "" : "es"} archivado${originalCount === 1 ? "" : "s"} y el archivo ${summaryFileName} con la relación de ${expenseCount} gasto${expenseCount === 1 ? "" : "s"} y sus totales.`,
    ...(missingCount > 0
      ? [
          `El resumen identifica ${missingCount} gasto${missingCount === 1 ? "" : "s"} sin original archivado en Drive.`,
        ]
      : []),
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
