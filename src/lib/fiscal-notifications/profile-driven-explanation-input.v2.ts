import type { FiscalNotificationVerticalSliceReviewDocumentV1 } from "./vertical-slice-review.v1";
import type {
  FiscalNotificationDocumentEvidenceInputV2,
  FiscalNotificationDocumentExplanationInputV2,
  FiscalNotificationExplanationDateInputV2,
  FiscalNotificationExplanationFactInputV2,
  FiscalNotificationExplanationMoneyInputV2,
  FiscalNotificationExplanationReferenceInputV2,
  FiscalNotificationExplanationRoleInputV2,
  FiscalNotificationDocumentFamilyIdV2,
  FiscalNotificationPrintedEffectCodeV2,
} from "./structured-document-explanation.v2";
import {
  resolveAllowedPrintedEffectCodesV2,
  resolveIntrinsicPrintedEffectCodeV2,
} from "./structured-document-explanation.v2";
import {
  AEAT_DOCUMENT_PROFILE_IDS_V1,
  resolveAeatDocumentProfileV1,
} from "./knowledge/aeat-document-knowledge.v1";
import { isUsefulObservedFiscalNotificationField } from "./document-fact-observation.v1";

const PROFILE_IDS = new Set<string>(AEAT_DOCUMENT_PROFILE_IDS_V1);
const PROFILE_FIELD_ID =
  /^profile:(reference|date|money|fact|participant_role):([A-Z0-9_]+):\d+$/u;
const PROFILE_EFFECT_FIELD_ID =
  /^profile:effect:([A-Z0-9_]+):\d+$/u;
const SENSITIVE_REFERENCE_TYPES = new Set(["CSV", "NRC", "BANK_REFERENCE"]);
type ExplanationFieldKind =
  | "reference"
  | "date"
  | "money"
  | "fact"
  | "participant_role";

const SPECIALIZED_FIELD_CODE_ALIASES: Readonly<
  Record<ExplanationFieldKind, Readonly<Record<string, readonly string[]>>>
> = Object.freeze({
  reference: Object.freeze({
    PROCEDURE_NUMBER: Object.freeze(["PROCEDURE_ID"]),
    EXPEDIENT_NUMBER: Object.freeze(["EXPEDIENTE_ID"]),
  }),
  date: Object.freeze({
    SIGNATURE_DATE: Object.freeze(["SIGNING_DATE"]),
  }),
  money: Object.freeze({
    PRINCIPAL: Object.freeze([
      "OUTSTANDING_PRINCIPAL",
      "ORIGINAL_TAX_PRINCIPAL",
    ]),
    EXECUTIVE_SURCHARGE: Object.freeze(["EXECUTIVE_SURCHARGE_PRINTED"]),
    LATE_INTEREST: Object.freeze(["LATE_PAYMENT_INTEREST"]),
  }),
  fact: Object.freeze({}),
  participant_role: Object.freeze({}),
});
interface SupportedExplanationFieldV2 {
  readonly kind: ExplanationFieldKind;
  readonly fieldCode: string;
}

export function projectProfileDrivenExplanationInputV2(
  document: FiscalNotificationVerticalSliceReviewDocumentV1,
): FiscalNotificationDocumentExplanationInputV2 | null {
  if (!PROFILE_IDS.has(document.familyId)) return null;
  const profile = resolveAeatDocumentProfileV1(document.familyId);
  if (!profile) return null;
  const allowedFieldCodes: Readonly<
    Record<ExplanationFieldKind, ReadonlySet<string>>
  > = Object.freeze({
    reference: new Set(profile.mustExtract.references),
    date: new Set(profile.mustExtract.dates),
    money: new Set(profile.mustExtract.money),
    fact: new Set(profile.mustExtract.facts),
    participant_role: new Set(profile.mustExtract.participantRoles),
  });

  const documentEvidence: FiscalNotificationDocumentEvidenceInputV2[] = [];
  const references: FiscalNotificationExplanationReferenceInputV2[] = [];
  const dates: FiscalNotificationExplanationDateInputV2[] = [];
  const money: FiscalNotificationExplanationMoneyInputV2[] = [];
  const factCodes: FiscalNotificationExplanationFactInputV2[] = [];
  const roleCodes: FiscalNotificationExplanationRoleInputV2[] = [];
  const observedFactCodes = new Set<string>();
  const observedRoleCodes = new Set<string>();
  const printedEffects: NonNullable<
    FiscalNotificationDocumentExplanationInputV2["printedEffects"]
  >[number][] = [];
  const observedPrintedEffects = new Set<FiscalNotificationPrintedEffectCodeV2>();
  const allowedPrintedEffects = new Set(
    resolveAllowedPrintedEffectCodesV2(
      document.familyId as FiscalNotificationDocumentFamilyIdV2,
    ),
  );

  const intrinsicEffect = resolveIntrinsicPrintedEffectCodeV2(
    document.familyId as FiscalNotificationDocumentFamilyIdV2,
  );
  const recognitionField = document.fields.find(
    (field) => field.fieldId === "profile:recognition:document-type:0",
  );
  const recognitionPage = recognitionField?.sourcePageNumbers[0];
  if (intrinsicEffect && recognitionField && recognitionPage) {
    const evidenceId = "profile-review-evidence-recognition";
    documentEvidence.push({
      evidenceId,
      pageNumber: recognitionPage,
      extractionMethod: "RULE",
      confidence: recognitionField.confidence,
      assertionType: "EXPLICIT_IN_DOCUMENT",
      ruleId: "profile-driven-family-v2",
      ruleVersion: "2026-07-16.v2",
    });
    printedEffects.push({ effectCode: intrinsicEffect, evidenceId });
    observedPrintedEffects.add(intrinsicEffect);
  }

  for (const [index, field] of document.fields.entries()) {
    const effectMatch = PROFILE_EFFECT_FIELD_ID.exec(field.fieldId);
    const pageNumber = field.sourcePageNumbers[0];
    if (!pageNumber) continue;
    if (effectMatch) {
      const evidenceId = `profile-review-evidence-${index + 1}`;
      const effectCode = effectMatch[1] as FiscalNotificationPrintedEffectCodeV2;
      if (
        allowedPrintedEffects.has(effectCode) &&
        field.normalizedValue === `EFFECT:${effectCode}` &&
        !observedPrintedEffects.has(effectCode)
      ) {
        documentEvidence.push(
          explanationEvidence(evidenceId, pageNumber, field.confidence),
        );
        printedEffects.push({ effectCode, evidenceId });
        observedPrintedEffects.add(effectCode);
      }
      continue;
    }
    const supported = supportedExplanationField(field, allowedFieldCodes);
    if (!supported) continue;
    const { kind, fieldCode } = supported;
    const evidenceId = `profile-review-evidence-${index + 1}`;
    if (
      kind === "reference" &&
      field.normalizedValue !== null &&
      !SENSITIVE_REFERENCE_TYPES.has(fieldCode)
    ) {
      documentEvidence.push(
        explanationEvidence(evidenceId, pageNumber, field.confidence),
      );
      references.push({
        referenceType:
          fieldCode as FiscalNotificationExplanationReferenceInputV2["referenceType"],
        value: field.normalizedValue,
        evidenceId,
      });
    } else if (kind === "date" && field.normalizedValue !== null) {
      documentEvidence.push(
        explanationEvidence(evidenceId, pageNumber, field.confidence),
      );
      dates.push({
        dateType: fieldCode as FiscalNotificationExplanationDateInputV2["dateType"],
        value: field.normalizedValue,
        evidenceId,
      });
    } else if (
      kind === "money" &&
      field.amountCents !== null &&
      field.currency === "EUR"
    ) {
      documentEvidence.push(
        explanationEvidence(evidenceId, pageNumber, field.confidence),
      );
      money.push({
        moneyType:
          fieldCode as FiscalNotificationExplanationMoneyInputV2["moneyType"],
        amountCents: field.amountCents,
        currency: "EUR",
        evidenceId,
      });
    } else if (kind === "fact" && !observedFactCodes.has(fieldCode)) {
      documentEvidence.push(
        explanationEvidence(evidenceId, pageNumber, field.confidence),
      );
      factCodes.push({
        factCode: fieldCode as FiscalNotificationExplanationFactInputV2["factCode"],
        evidenceId,
      });
      observedFactCodes.add(fieldCode);
    } else if (
      kind === "participant_role" &&
      !observedRoleCodes.has(fieldCode)
    ) {
      documentEvidence.push(
        explanationEvidence(evidenceId, pageNumber, field.confidence),
      );
      roleCodes.push({
        roleCode: fieldCode as FiscalNotificationExplanationRoleInputV2["roleCode"],
        evidenceId,
      });
      observedRoleCodes.add(fieldCode);
    }
  }

  return Object.freeze({
    familyId: document.familyId as FiscalNotificationDocumentFamilyIdV2,
    documentEvidence: Object.freeze(documentEvidence),
    references: Object.freeze(references),
    dates: Object.freeze(dates),
    money: Object.freeze(money),
    factCodes: Object.freeze(factCodes),
    roleCodes: Object.freeze(roleCodes),
    printedEffects: Object.freeze(printedEffects),
  });
}

function supportedExplanationField(
  field: FiscalNotificationVerticalSliceReviewDocumentV1["fields"][number],
  allowedFieldCodes: Readonly<
    Record<ExplanationFieldKind, ReadonlySet<string>>
  >,
): SupportedExplanationFieldV2 | null {
  if (!isUsefulObservedFiscalNotificationField(field)) return null;
  const profileMatch = PROFILE_FIELD_ID.exec(field.fieldId);
  if (profileMatch) {
    const kind = profileMatch[1] as ExplanationFieldKind;
    const fieldCode = profileMatch[2]!;
    return allowedFieldCodes[kind].has(fieldCode)
      ? Object.freeze({ kind, fieldCode })
      : null;
  }
  const kind = explanationKindForSemantic(field.semantic);
  if (!kind) return null;
  const candidates = [
    field.canonicalType,
    ...(SPECIALIZED_FIELD_CODE_ALIASES[kind][field.canonicalType] ?? []),
  ].filter((candidate) => allowedFieldCodes[kind].has(candidate));
  const unique = [...new Set(candidates)];
  return unique.length === 1
    ? Object.freeze({ kind, fieldCode: unique[0]! })
    : null;
}

function explanationKindForSemantic(
  semantic: FiscalNotificationVerticalSliceReviewDocumentV1["fields"][number]["semantic"],
): ExplanationFieldKind | null {
  switch (semantic) {
    case "REFERENCE":
      return "reference";
    case "DATE":
      return "date";
    case "MONEY":
      return "money";
    case "DETAIL":
    case "OBLIGATION":
      return "fact";
    case "PARTY":
      return "participant_role";
    case "STATUS":
    case "MASKED_VALUE":
      return null;
  }
}

function explanationEvidence(
  evidenceId: string,
  pageNumber: number,
  confidence: number,
): FiscalNotificationDocumentEvidenceInputV2 {
  return Object.freeze({
    evidenceId,
    pageNumber,
    extractionMethod: "RULE",
    confidence,
    assertionType: "EXPLICIT_IN_DOCUMENT",
    ruleId: "profile-driven-family-v2",
    ruleVersion: "2026-07-20.v3",
  });
}
