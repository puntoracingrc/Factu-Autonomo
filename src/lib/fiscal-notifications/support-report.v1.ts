export const FISCAL_NOTIFICATION_SUPPORT_EMAIL_V1 =
  "soporte-tecnico@facturacion-autonomos.app";

export type FiscalNotificationSupportReportStageV1 =
  | "LOCAL_ANALYSIS"
  | "STRUCTURED_SAVE";

export interface FiscalNotificationSupportReportInputV1 {
  readonly stage: FiscalNotificationSupportReportStageV1;
  readonly status: string;
  readonly message: string;
  readonly route: string;
  readonly fileByteLength?: number;
  readonly mimeType?: string;
  readonly pageCount?: number;
  readonly recognizedTitle?: string;
  readonly persistenceState?: string;
}

const MAX_SUPPORT_VALUE_LENGTH = 180;

export function buildFiscalNotificationSupportMailtoHrefV1(
  input: FiscalNotificationSupportReportInputV1,
): string {
  const subject = `Caso lector AEAT · ${input.stage}`;
  const body = [
    "FACTU_FISCAL_NOTIFICATION_SUPPORT_CASE_V1",
    "privacy=no_pdf_no_text_no_filename_no_nif_no_amounts_no_references",
    `route=${sanitizeSupportReportValue(input.route)}`,
    `stage=${input.stage}`,
    `status=${sanitizeSupportReportValue(input.status)}`,
    `message=${sanitizeSupportReportValue(input.message)}`,
    input.persistenceState
      ? `persistenceState=${sanitizeSupportReportValue(input.persistenceState)}`
      : null,
    Number.isSafeInteger(input.fileByteLength)
      ? `fileByteLength=${input.fileByteLength}`
      : null,
    input.mimeType ? `mimeType=${sanitizeSupportReportValue(input.mimeType)}` : null,
    Number.isSafeInteger(input.pageCount) ? `pageCount=${input.pageCount}` : null,
    input.recognizedTitle
      ? `recognizedTitle=${sanitizeSupportReportValue(input.recognizedTitle)}`
      : null,
    "",
    "Describe aquí, si quieres, qué estabas intentando hacer:",
  ].filter((line): line is string => line !== null);

  return `mailto:${FISCAL_NOTIFICATION_SUPPORT_EMAIL_V1}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body.join("\n"))}`;
}

function sanitizeSupportReportValue(value: string): string {
  const collapsed = value.replace(/\s+/g, " ").trim();
  const redacted = collapsed
    .replace(/\b[0-9XYZKLM][0-9A-Z][0-9]{7}[A-Z]\b/giu, "[dato oculto]")
    .replace(/\b[A-Z][0-9]{8}\b/gu, "[dato oculto]")
    .replace(/\b\d{1,3}(?:[.,]\d{3})*[.,]\d{2}\s*€?\b/gu, "[dato oculto]")
    .replace(/\b[A-Z0-9]{12,}\b/gu, "[identificador oculto]");
  return redacted.slice(0, MAX_SUPPORT_VALUE_LENGTH);
}
