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
import { AEAT_DOCUMENT_PROFILE_IDS_V1 } from "./knowledge/aeat-document-knowledge.v1";

const PROFILE_IDS = new Set<string>(AEAT_DOCUMENT_PROFILE_IDS_V1);
const PROFILE_FIELD_ID =
  /^profile:(reference|date|money|fact|participant_role):([A-Z0-9_]+):\d+$/u;
const PROFILE_EFFECT_FIELD_ID =
  /^profile:effect:([A-Z0-9_]+):\d+$/u;
const SENSITIVE_REFERENCE_TYPES = new Set(["CSV", "NRC", "BANK_REFERENCE"]);

export function projectProfileDrivenExplanationInputV2(
  document: FiscalNotificationVerticalSliceReviewDocumentV1,
): FiscalNotificationDocumentExplanationInputV2 | null {
  if (!PROFILE_IDS.has(document.familyId)) return null;

  const documentEvidence: FiscalNotificationDocumentEvidenceInputV2[] = [];
  const references: FiscalNotificationExplanationReferenceInputV2[] = [];
  const dates: FiscalNotificationExplanationDateInputV2[] = [];
  const money: FiscalNotificationExplanationMoneyInputV2[] = [];
  const factCodes: FiscalNotificationExplanationFactInputV2[] = [];
  const roleCodes: FiscalNotificationExplanationRoleInputV2[] = [];
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
    const match = PROFILE_FIELD_ID.exec(field.fieldId);
    const effectMatch = PROFILE_EFFECT_FIELD_ID.exec(field.fieldId);
    if (!match && !effectMatch) continue;
    const evidenceId = `profile-review-evidence-${index + 1}`;
    const pageNumber = field.sourcePageNumbers[0];
    if (!pageNumber) continue;
    documentEvidence.push({
      evidenceId,
      pageNumber,
      extractionMethod: "RULE",
      confidence: field.confidence,
      assertionType: "EXPLICIT_IN_DOCUMENT",
      ruleId: "profile-driven-family-v2",
      ruleVersion: "2026-07-16.v2",
    });
    if (effectMatch) {
      const effectCode = effectMatch[1] as FiscalNotificationPrintedEffectCodeV2;
      if (
        allowedPrintedEffects.has(effectCode) &&
        field.normalizedValue === `EFFECT:${effectCode}` &&
        !observedPrintedEffects.has(effectCode)
      ) {
        printedEffects.push({ effectCode, evidenceId });
        observedPrintedEffects.add(effectCode);
      }
      continue;
    }
    if (!match) continue;
    const kind = match[1];
    const fieldCode = match[2];
    if (
      kind === "reference" &&
      field.normalizedValue !== null &&
      !SENSITIVE_REFERENCE_TYPES.has(fieldCode)
    ) {
      references.push({
        referenceType:
          fieldCode as FiscalNotificationExplanationReferenceInputV2["referenceType"],
        value: field.normalizedValue,
        evidenceId,
      });
    } else if (kind === "date" && field.normalizedValue !== null) {
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
      money.push({
        moneyType:
          fieldCode as FiscalNotificationExplanationMoneyInputV2["moneyType"],
        amountCents: field.amountCents,
        currency: "EUR",
        evidenceId,
      });
    } else if (kind === "fact") {
      factCodes.push({
        factCode: fieldCode as FiscalNotificationExplanationFactInputV2["factCode"],
        evidenceId,
      });
    } else if (kind === "participant_role") {
      roleCodes.push({
        roleCode: fieldCode as FiscalNotificationExplanationRoleInputV2["roleCode"],
        evidenceId,
      });
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
