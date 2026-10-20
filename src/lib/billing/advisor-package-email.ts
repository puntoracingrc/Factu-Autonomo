import { validateAdvisorContact } from "@/lib/advisor-contact";
import { buildGmailComposeUrl, buildMailtoUrl } from "@/lib/share";
import type { BusinessProfile } from "@/lib/types";

export function buildAdvisorPackageEmail(
  profile: BusinessProfile,
  periodLabel: string,
  archive: {
    fileName: string;
    invoiceCount: number;
    expenseCount: number;
    originalCount: number;
    missingOriginalCount: number;
  },
) {
  const advisor = validateAdvisorContact(profile.advisorContact);
  if (!advisor.valid || !advisor.value) return null;
  const sender =
    profile.commercialName?.trim() || profile.name.trim() || "tu cliente";
  const subject = `Documentación para gestoría · ${periodLabel} · ${sender}`;
  const body = [
    `Hola ${advisor.value.advisorName},`,
    "",
    `Te envío la documentación de ${sender} correspondiente a ${periodLabel}.`,
    `El paquete ${archive.fileName} contiene ${archive.invoiceCount} facturas emitidas en PDF y ${archive.originalCount} justificantes de ${archive.expenseCount} gastos, organizados por meses.`,
    "Incluye también los listados de ventas y gastos, resúmenes PDF, resumen fiscal e índice de documentos en CSV.",
    ...(archive.missingOriginalCount
      ? [
          `El índice identifica ${archive.missingOriginalCount} gastos sin archivo adjunto.`,
        ]
      : []),
    "",
    "Un saludo,",
    sender,
  ].join("\n");
  return {
    subject,
    body,
    recipient: advisor.value.email,
    gmailComposeUrl: buildGmailComposeUrl(advisor.value.email, subject, body),
    mailtoUrl: buildMailtoUrl(advisor.value.email, subject, body),
  };
}
