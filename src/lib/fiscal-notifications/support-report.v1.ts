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

export interface FiscalNotificationSupportReportV1 {
  readonly schemaVersion: 1;
  readonly caseId: string;
  readonly stage: FiscalNotificationSupportReportStageV1;
  readonly status: string;
  readonly message: string;
  readonly route: "/consultor-fiscal/notificaciones";
  readonly fileByteLength?: number;
  readonly mimeType?: "application/pdf";
  readonly pageCount?: number;
  readonly persistenceState?: string;
}

const MAX_SUPPORT_VALUE_LENGTH = 180;
const SUPPORT_CASE_ID =
  /^case:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const SUPPORT_REPORT_KEYS = new Set([
  "schemaVersion",
  "caseId",
  "stage",
  "status",
  "message",
  "route",
  "fileByteLength",
  "mimeType",
  "pageCount",
  "persistenceState",
]);

export function buildFiscalNotificationSupportReportV1(
  input: FiscalNotificationSupportReportInputV1,
  caseId: string,
): FiscalNotificationSupportReportV1 | null {
  return parseFiscalNotificationSupportReportV1({
    schemaVersion: 1,
    caseId,
    stage: input.stage,
    status: input.status,
    message: input.message,
    route: input.route,
    fileByteLength: input.fileByteLength,
    mimeType: input.mimeType,
    pageCount: input.pageCount,
    persistenceState: input.persistenceState,
  });
}

export function parseFiscalNotificationSupportReportV1(
  value: unknown,
): FiscalNotificationSupportReportV1 | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => !SUPPORT_REPORT_KEYS.has(key))) {
    return null;
  }
  if (
    record.schemaVersion !== 1 ||
    typeof record.caseId !== "string" ||
    !SUPPORT_CASE_ID.test(record.caseId) ||
    (record.stage !== "LOCAL_ANALYSIS" && record.stage !== "STRUCTURED_SAVE") ||
    typeof record.status !== "string" ||
    typeof record.message !== "string" ||
    record.route !== "/consultor-fiscal/notificaciones"
  ) {
    return null;
  }
  const fileByteLength = optionalSafeInteger(record.fileByteLength, 4 * 1024 * 1024);
  const pageCount = optionalSafeInteger(record.pageCount, 80);
  if (fileByteLength === null || pageCount === null) return null;
  if (
    record.mimeType !== undefined &&
    record.mimeType !== "application/pdf"
  ) {
    return null;
  }
  if (
    record.persistenceState !== undefined &&
    typeof record.persistenceState !== "string"
  ) {
    return null;
  }

  return Object.freeze({
    schemaVersion: 1,
    caseId: record.caseId,
    stage: record.stage,
    status: sanitizeSupportReportValue(record.status),
    message: sanitizeSupportReportValue(record.message),
    route: "/consultor-fiscal/notificaciones",
    ...(fileByteLength === undefined ? {} : { fileByteLength }),
    ...(record.mimeType === "application/pdf"
      ? { mimeType: "application/pdf" as const }
      : {}),
    ...(pageCount === undefined ? {} : { pageCount }),
    ...(record.persistenceState
      ? {
          persistenceState: sanitizeSupportReportValue(
            record.persistenceState,
          ),
        }
      : {}),
  });
}

export function formatFiscalNotificationSupportReportTextV1(
  report: FiscalNotificationSupportReportV1,
): string {
  return [
    "FACTU_FISCAL_NOTIFICATION_SUPPORT_CASE_V1",
    "privacy=no_pdf_no_text_no_filename_no_nif_no_amounts_no_references",
    `caseId=${report.caseId}`,
    `route=${report.route}`,
    `stage=${report.stage}`,
    `status=${report.status}`,
    `message=${report.message}`,
    report.persistenceState
      ? `persistenceState=${report.persistenceState}`
      : null,
    report.fileByteLength === undefined
      ? null
      : `fileByteLength=${report.fileByteLength}`,
    report.mimeType ? `mimeType=${report.mimeType}` : null,
    report.pageCount === undefined ? null : `pageCount=${report.pageCount}`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

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

function optionalSafeInteger(
  value: unknown,
  max: number,
): number | undefined | null {
  if (value === undefined) return undefined;
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= max
    ? Number(value)
    : null;
}
