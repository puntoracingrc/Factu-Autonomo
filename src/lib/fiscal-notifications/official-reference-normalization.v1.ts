export const OFFICIAL_REFERENCE_TYPES_V1 = Object.freeze([
  "LIQUIDATION_KEY",
  "DEBT_KEY",
  "SEIZURE_ORDER_ID",
  "DOCUMENT_REFERENCE",
  "PAYMENT_FORM_REFERENCE",
  "EXPEDIENTE_ID",
] as const);

export type OfficialReferenceTypeV1 =
  (typeof OFFICIAL_REFERENCE_TYPES_V1)[number];

export interface OfficialReferenceNormalizationV1 {
  readonly canonicalType: OfficialReferenceTypeV1;
  readonly normalizedValue: string;
  readonly originalLabel: string;
}

const LIQUIDATION_LABELS = new Set([
  "CLAVEDELIQUIDACION",
  "LIQUIDACION",
  "NLIQUIDACION",
  "NOLIQUIDACION",
  "NUMLIQUIDACION",
  "NUMEROLIQUIDACION",
  "NUMERODELIQUIDACION",
]);

const DEBT_LABELS = new Set([
  "CLAVEDEDEUDA",
  "DEUDA",
  "NUMERODEDEUDA",
  "NDEDEUDA",
]);

const SEIZURE_LABELS = new Set([
  "NUMERODEDILIGENCIA",
  "NUMERODELADILIGENCIA",
  "NDILIGENCIA",
  "NDEDILIGENCIA",
  "REFERENCIADELADILIGENCIA",
]);

const PAYMENT_FORM_LABELS = new Set([
  "REFERENCIADECARTAPAGO",
  "REFERENCIADELACARTADEPAGO",
  "NUMERODECARTAPAGO",
  "JUSTIFICANTEDEPAGO",
  "NUMERODEJUSTIFICANTE",
]);

const EXPEDIENTE_LABELS = new Set(["EXPEDIENTE", "NUMERODEEXPEDIENTE"]);

const DOCUMENT_LABELS = new Set([
  "REFERENCIA",
  "REFERENCIADELDOCUMENTO",
  "ACTOOREQUERIMIENTO",
  "REFERENCIADELAPROVIDENCIA",
]);

const CSV_OR_LONG_BARCODE = /^(?:[A-Z0-9]{24,}|[0-9]{18,})$/u;
const SPANISH_PRIVATE_ID =
  /^(?:\d{8}[A-Z]|[XYZ]\d{7}[A-Z]|[ABCDEFGHJKLMNPQRSUVW]\d{7}[0-9A-J])$/u;
const IBAN_OR_BANK = /^(?:ES\d{22}|\d{20,24})$/u;

export function normalizeOfficialReference(
  label: string,
  value: string,
): OfficialReferenceNormalizationV1 | null {
  const canonicalType = officialReferenceTypeFromLabel(label);
  if (!canonicalType) return null;
  const normalizedValue = normalizeOfficialReferenceValue(canonicalType, value);
  return normalizedValue
    ? Object.freeze({
        canonicalType,
        normalizedValue,
        originalLabel: label.trim(),
      })
    : null;
}

export function normalizeOfficialReferenceValue(
  canonicalType: OfficialReferenceTypeV1,
  value: string,
): string | null {
  const normalized = compactOfficialReferenceValue(value);
  if (
    normalized.length < 2 ||
    normalized.length > 80 ||
    !/\d/u.test(normalized) ||
    SPANISH_PRIVATE_ID.test(normalized) ||
    IBAN_OR_BANK.test(normalized)
  ) {
    return null;
  }
  if (
    (canonicalType === "LIQUIDATION_KEY" || canonicalType === "DEBT_KEY") &&
    CSV_OR_LONG_BARCODE.test(normalized) &&
    !/^[A-Z]\d{12,23}$/u.test(normalized)
  ) {
    return null;
  }
  if (canonicalType === "LIQUIDATION_KEY") {
    return /^[A-Z]\d{12,23}$/u.test(normalized) ||
      /^SYN[A-Z0-9]{4,48}$/u.test(normalized) ||
      /^LQ[A-Z0-9]{4,48}$/u.test(normalized)
      ? normalized
      : null;
  }
  if (canonicalType === "DEBT_KEY") {
    return /^[A-Z0-9]{4,60}$/u.test(normalized) ? normalized : null;
  }
  return /^[A-Z0-9][A-Z0-9]{1,79}$/u.test(normalized) ? normalized : null;
}

export function compactOfficialReferenceValue(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[‐‑‒–—−]/gu, "-")
    .toLocaleUpperCase("es-ES")
    .replace(/[\s\u00a0._\-/:\\|]+/gu, "")
    .trim();
}

export function officialReferenceTypeFromLabel(
  label: string,
): OfficialReferenceTypeV1 | null {
  const normalized = compactOfficialReferenceLabel(label);
  if (LIQUIDATION_LABELS.has(normalized)) return "LIQUIDATION_KEY";
  if (DEBT_LABELS.has(normalized)) return "DEBT_KEY";
  if (SEIZURE_LABELS.has(normalized)) return "SEIZURE_ORDER_ID";
  if (PAYMENT_FORM_LABELS.has(normalized)) return "PAYMENT_FORM_REFERENCE";
  if (EXPEDIENTE_LABELS.has(normalized)) return "EXPEDIENTE_ID";
  if (DOCUMENT_LABELS.has(normalized)) return "DOCUMENT_REFERENCE";
  return null;
}

function compactOfficialReferenceLabel(label: string): string {
  return label
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replace(/[º°ª]/gu, "")
    .toLocaleUpperCase("es-ES")
    .replace(/[^A-Z0-9]/gu, "");
}
