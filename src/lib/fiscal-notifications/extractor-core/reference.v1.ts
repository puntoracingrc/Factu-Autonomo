import {
  FiscalNotificationInputError,
} from "../input-contract";
import {
  type SourceCoordinatesV1,
  assertBoundedRawTextV1,
  assertConfidenceV1,
  assertExactDataRecordV1,
  assertSourceLocationV1,
  freezeCoordinatesV1,
} from "./shared.v1";

export const REFERENCE_TYPES_V1 = Object.freeze([
  "PROCEDURE_ID",
  "EXPEDIENTE_ID",
  "ACT_ID",
  "NOTIFICATION_ID",
  "LIQUIDATION_KEY",
  "DEBT_KEY",
  "SEIZURE_ORDER_ID",
  "AGREEMENT_ID",
  "REGISTRY_ID",
  "FILING_RECEIPT_ID",
  "PAYMENT_RECEIPT_ID",
  "NRC",
  "CSV",
  "NIF",
  "MODEL",
  "FISCAL_YEAR",
  "TAX_PERIOD",
  "BANK_REFERENCE",
  "THIRD_PARTY_RESPONSE_ID",
  "VEHICLE_OR_FINE_REFERENCE",
  "OTHER_OFFICIAL_REFERENCE",
] as const);
export type ReferenceTypeV1 = (typeof REFERENCE_TYPES_V1)[number];

export type ReferenceNormalizationStatusV1 =
  | "NORMALIZED_EXACTLY"
  | "AMBIGUOUS_OCR_REVIEW_REQUIRED"
  | "INVALID_PATTERN_REVIEW_REQUIRED";

export interface ReferenceAmbiguityV1 {
  readonly position: number;
  readonly observed: "O" | "I" | "L" | "B" | "S";
  readonly possibleAlternative: "0" | "1" | "8" | "5";
}

export interface ReferenceV1 {
  readonly referenceType: ReferenceTypeV1;
  readonly rawValue: string;
  readonly normalizedValue: string;
  readonly checkDigitValid: boolean | null;
  readonly sourceDocumentId: string;
  readonly sourcePage: number;
  readonly sourceLabel: string | null;
  readonly sourceCoordinates: SourceCoordinatesV1 | null;
  readonly confidence: number;
  readonly normalizationStatus: ReferenceNormalizationStatusV1;
  readonly ambiguities: readonly ReferenceAmbiguityV1[];
  readonly requiresHumanReview: boolean;
}

export type NormalizeReferenceInputV1 = Omit<
  ReferenceV1,
  "normalizedValue" | "checkDigitValid" | "normalizationStatus" | "ambiguities" | "requiresHumanReview"
>;

const OCR_AMBIGUITIES = Object.freeze({
  O: "0",
  I: "1",
  L: "1",
  B: "8",
  S: "5",
} as const);

export function normalizeReferenceV1(input: NormalizeReferenceInputV1): ReferenceV1 {
  assertExactDataRecordV1(input, "reference", [
    "referenceType", "rawValue", "sourceDocumentId", "sourcePage", "sourceLabel",
    "sourceCoordinates", "confidence",
  ]);
  if (!REFERENCE_TYPES_V1.includes(input.referenceType)) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "reference.referenceType");
  }
  assertBoundedRawTextV1(input.rawValue, "reference.rawValue", 240);
  assertSourceLocationV1(input, "reference");
  assertConfidenceV1(input.confidence, "reference.confidence");
  const normalizedValue = input.rawValue
    .normalize("NFKC")
    .replace(/[‐‑‒–—−]/gu, "-")
    .replace(/\s+/gu, "")
    .toUpperCase();
  if (normalizedValue.length === 0 || normalizedValue.length > 200) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "reference.normalizedValue");
  }

  const checkDigitValid = input.referenceType === "NIF"
    ? validateSpanishTaxIdV1(normalizedValue)
    : null;
  const ambiguities = Object.freeze(
    Array.from(normalizedValue).flatMap((observed, position) => {
      const possibleAlternative = OCR_AMBIGUITIES[observed as keyof typeof OCR_AMBIGUITIES];
      return possibleAlternative && checkDigitValid !== true
        ? [Object.freeze({ position, observed: observed as ReferenceAmbiguityV1["observed"], possibleAlternative })]
        : [];
    }),
  );
  const patternValid = isKnownReferencePatternValidV1(input.referenceType, normalizedValue);
  const normalizationStatus: ReferenceNormalizationStatusV1 = !patternValid
    ? "INVALID_PATTERN_REVIEW_REQUIRED"
    : ambiguities.length > 0
      ? "AMBIGUOUS_OCR_REVIEW_REQUIRED"
      : "NORMALIZED_EXACTLY";

  return Object.freeze({
    ...input,
    normalizedValue,
    checkDigitValid,
    sourceCoordinates: freezeCoordinatesV1(input.sourceCoordinates),
    normalizationStatus,
    ambiguities,
    requiresHumanReview: normalizationStatus !== "NORMALIZED_EXACTLY" || checkDigitValid === false,
  });
}

function validateSpanishTaxIdV1(value: string): boolean {
  const personal = /^(\d{8})([A-Z])$/u.exec(value);
  if (personal) {
    return "TRWAGMYFPDXBNJZSQVHLCKE"[Number(personal[1]) % 23] === personal[2];
  }
  const foreigner = /^([XYZ])(\d{7})([A-Z])$/u.exec(value);
  if (foreigner) {
    const number = Number(`${({ X: "0", Y: "1", Z: "2" } as const)[foreigner[1] as "X" | "Y" | "Z"]}${foreigner[2]}`);
    return "TRWAGMYFPDXBNJZSQVHLCKE"[number % 23] === foreigner[3];
  }
  const entity = /^([ABCDEFGHJKLMNPQRSUVW])(\d{7})([0-9A-J])$/u.exec(value);
  if (!entity) return false;
  const digits = Array.from(entity[2], Number);
  const even = digits[1] + digits[3] + digits[5];
  const odd = [digits[0], digits[2], digits[4], digits[6]].reduce((sum, digit) => {
    const doubled = digit * 2;
    return sum + Math.floor(doubled / 10) + (doubled % 10);
  }, 0);
  const controlDigit = (10 - ((even + odd) % 10)) % 10;
  const expectedDigit = String(controlDigit);
  const expectedLetter = "JABCDEFGHI"[controlDigit];
  const prefix = entity[1];
  return /^[ABEH]$/u.test(prefix)
    ? entity[3] === expectedDigit
    : /^[KPQS]$/u.test(prefix)
      ? entity[3] === expectedLetter
      : entity[3] === expectedDigit || entity[3] === expectedLetter;
}

function isKnownReferencePatternValidV1(type: ReferenceTypeV1, value: string): boolean {
  switch (type) {
    case "MODEL":
      return /^\d{3}$/u.test(value);
    case "FISCAL_YEAR":
      return /^(?:19|20)\d{2}$/u.test(value);
    case "TAX_PERIOD":
      return /^(?:0A|[1-4]T|0[1-9]|1[0-2])$/u.test(value);
    case "NIF":
      return /^[A-Z0-9]{8,9}$/u.test(value);
    default:
      return /^[A-Z0-9][A-Z0-9./:_-]{1,199}$/u.test(value);
  }
}
