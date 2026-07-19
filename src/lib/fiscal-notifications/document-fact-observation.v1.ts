import type { FiscalNotificationVerticalSliceReviewFieldV1 } from "./vertical-slice-review.v1";

const INTERNAL_FIELD_ID_PATTERNS = Object.freeze([
  /^profile:recognition:/u,
  /^profile:effect:/u,
  /^profile:recognition:official-catalog-v9:/u,
  /^p0-v10:recognition:/u,
  /^real-corpus:recognized-family$/u,
  /^real-corpus:plain-explanation$/u,
  /^real-corpus-v[3-7]:recognized-family$/u,
  /^real-corpus-v[3-7]:explanation:/u,
  /^real-corpus-v[3-7]:payment-form-status$/u,
]);

const INTERNAL_VALUE_PATTERNS = Object.freeze([
  /^EXACT_/u,
  /^OFFICIAL_ONLY_/u,
  /^EXPLANATION:/u,
  /^EFFECT:/u,
  /^P0_V10(?::|_)/u,
  /^V[3-7]:EXACT/u,
  /^V[3-7]:EXPLANATION:/u,
  /^V[3-7]:(?:TEXT|INTEGER|BOOLEAN):/u,
  /^V[3-7]:INSTALLMENT:/u,
  /^V[3-7]:PAYMENT_FORM_/u,
  /^V[3-7]:SYNTHETIC_REFERENCE:/u,
  /^INTEGER:[A-Z0-9_]+:/u,
  /^BOOLEAN:[A-Z0-9_]+:/u,
  /^TEXT:[A-Z0-9_]+:/u,
  /^SIGNED_CENTS:/u,
  /^ROLE:/u,
  /^SEIZURE_RECIPIENT_ROLE:/u,
]);

const INTERNAL_CODE_PATTERN =
  /(?:^|[:|])(?:[A-Z0-9_]*(?:_DURATION|_CONTENT|SOURCE_PAGE_RANGE))(?:[:|]|$)/u;

const GENERIC_DISPLAY_VALUES = new Set([
  "Detectado en el documento",
  "Titulo y autoridad coinciden",
  "Titulo, autoridad y estructura coinciden",
  "Estructura oficial reconocida",
]);

export function containsInternalFiscalNotificationToken(
  value: string | null | undefined,
): boolean {
  if (!value) return false;
  return (
    INTERNAL_VALUE_PATTERNS.some((pattern) => pattern.test(value)) ||
    INTERNAL_CODE_PATTERN.test(value)
  );
}

export function isInternalFiscalNotificationFieldArtifact(input: {
  readonly fieldId?: string | null;
  readonly label?: string | null;
  readonly value?: string | null;
  readonly semantic?: string | null;
  readonly canonicalType?: string | null;
}): boolean {
  const fieldId = input.fieldId ?? null;
  if (
    fieldId &&
    (INTERNAL_FIELD_ID_PATTERNS.some((pattern) => pattern.test(fieldId)) ||
      containsInternalFiscalNotificationToken(fieldId))
  ) {
    return true;
  }
  if (containsInternalFiscalNotificationToken(input.value ?? null)) return true;
  if (containsInternalFiscalNotificationToken(input.label ?? null)) return true;
  if (containsInternalFiscalNotificationToken(input.canonicalType ?? null)) {
    return true;
  }
  if (
    input.semantic === "DETAIL" &&
    input.label === "Reconocimiento documental"
  ) {
    return true;
  }
  return false;
}

export function isUsefulObservedFiscalNotificationField(
  field: FiscalNotificationVerticalSliceReviewFieldV1,
): boolean {
  if (
    field.sourcePageNumbers.length === 0 ||
    isInternalFiscalNotificationFieldArtifact({
      fieldId: field.fieldId,
      label: field.label,
      value: field.displayValue,
      semantic: field.semantic,
      canonicalType: field.canonicalType,
    }) ||
    isInternalFiscalNotificationFieldArtifact({
      fieldId: field.fieldId,
      label: field.label,
      value: field.normalizedValue,
      semantic: field.semantic,
      canonicalType: field.canonicalType,
    })
  ) {
    return false;
  }

  switch (field.semantic) {
    case "REFERENCE":
    case "DATE":
      return field.normalizedValue !== null && field.normalizedValue.length > 0;
    case "MONEY":
      return (
        field.amountCents !== null &&
        field.currency === "EUR" &&
        Number.isSafeInteger(field.amountCents)
      );
    case "PARTY":
      return (
        field.canonicalType !== "ISSUING_AUTHORITY" &&
        field.normalizedValue !== null &&
        field.normalizedValue.length > 0
      );
    case "OBLIGATION":
      return (
        field.normalizedValue !== null &&
        field.normalizedValue.length > 0 &&
        !GENERIC_DISPLAY_VALUES.has(field.displayValue)
      );
    case "DETAIL":
      return (
        field.normalizedValue !== null &&
        field.normalizedValue.length > 0 &&
        !GENERIC_DISPLAY_VALUES.has(field.displayValue) &&
        field.normalizedValue !== field.canonicalType
      );
    case "STATUS":
    case "MASKED_VALUE":
      return false;
  }
}

export function shouldExposeFiscalNotificationField(
  field: FiscalNotificationVerticalSliceReviewFieldV1,
): boolean {
  if (field.semantic === "STATUS") return false;
  const common = {
    fieldId: field.fieldId,
    label: field.label,
    semantic: field.semantic,
    canonicalType: field.canonicalType,
  };
  return (
    !(
      (field.semantic === "DETAIL" || field.semantic === "OBLIGATION") &&
      GENERIC_DISPLAY_VALUES.has(field.displayValue)
    ) &&
    !isInternalFiscalNotificationFieldArtifact({
      ...common,
      value: field.displayValue,
    }) &&
    !isInternalFiscalNotificationFieldArtifact({
      ...common,
      value: field.normalizedValue,
    })
  );
}
