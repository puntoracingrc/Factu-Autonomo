import { extractAeatDeferralGrantFactsV1 } from "./aeat-deferral-grant-facts.v1";
import { extractAeatEnforcementExplicitFieldsV2 } from "./aeat-enforcement-explicit-fields.v2";
import { extractAeatEnforcementMoneyFacts } from "./aeat-enforcement-money-facts";
import { extractAeatEnforcementPartyFactsV1 } from "./aeat-enforcement-party-facts.v1";
import { extractAeatOffsetAgreementFactsV1 } from "./aeat-offset-agreement-facts.v1";
import { extractFiscalNotificationCandidates } from "./extraction-dispatcher";
import {
  assertBoundedDocumentInput,
  type BoundedDocumentInput,
} from "./input-contract";
import type { ProjectFiscalNotificationPdfWorkerAnalysisInput } from "./pdf-worker-analysis-contract";
import { analyzeFiscalNotificationVerticalSliceV1 } from "./extractor-core/vertical-slice-orchestrator.v1";
import {
  projectFiscalNotificationVerticalSliceReviewV1,
  type FiscalNotificationVerticalSliceReviewV1,
} from "./vertical-slice-review.v1";

export interface FiscalNotificationDocumentInputAnalysis
  extends Omit<
    ProjectFiscalNotificationPdfWorkerAnalysisInput,
    "textLayerStatus"
  > {
  readonly hasText: boolean;
  readonly verticalSliceReview: FiscalNotificationVerticalSliceReviewV1;
}

/**
 * Pure deterministic projection shared by the PDF text-layer Worker and the
 * local OCR boundary. Raw page text never leaves this call.
 */
export async function analyzeFiscalNotificationDocumentInput(
  documentInput: BoundedDocumentInput,
): Promise<FiscalNotificationDocumentInputAnalysis> {
  assertBoundedDocumentInput(documentInput);
  const pageCount = documentInput.pages.length;
  const hasText = documentInput.pages.some(
    (page) => page.text.trim().length > 0,
  );
  const familyAnalysis = hasText
    ? extractFiscalNotificationCandidates(documentInput)
    : null;
  const enforcementCandidate =
    familyAnalysis?.reason === "SUPPORTED_FAMILY_CANDIDATE" &&
    familyAnalysis.candidates.length === 1 &&
    familyAnalysis.candidates[0]?.familyId ===
      "AEAT_ENFORCEMENT_ORDER_CANDIDATE" &&
    familyAnalysis.candidates[0].signalStatus ===
      "COMPLETE_REQUIRED_ANCHORS" &&
    familyAnalysis.candidates[0].conflictingAnchorIds.length === 0;
  const deferralCandidate =
    familyAnalysis?.reason === "SUPPORTED_FAMILY_CANDIDATE" &&
    familyAnalysis.candidates.length === 1 &&
    familyAnalysis.candidates[0]?.familyId ===
      "AEAT_DEFERRAL_GRANT_CANDIDATE" &&
    familyAnalysis.candidates[0].signalStatus ===
      "COMPLETE_REQUIRED_ANCHORS" &&
    familyAnalysis.candidates[0].conflictingAnchorIds.length === 0;
  const offsetCandidate =
    familyAnalysis?.reason === "SUPPORTED_FAMILY_CANDIDATE" &&
    familyAnalysis.candidates.length === 1 &&
    familyAnalysis.candidates[0]?.familyId ===
      "AEAT_OFFSET_AGREEMENT_CANDIDATE" &&
    familyAnalysis.candidates[0].signalStatus ===
      "COMPLETE_REQUIRED_ANCHORS" &&
    familyAnalysis.candidates[0].conflictingAnchorIds.length === 0;

  const extractedOffsetAgreementFacts = offsetCandidate
    ? extractAeatOffsetAgreementFactsV1(documentInput)
    : null;
  const enforcementExplicitFields = enforcementCandidate
    ? extractAeatEnforcementExplicitFieldsV2(documentInput)
    : null;
  const verticalSliceReview = projectFiscalNotificationVerticalSliceReviewV1(
    await analyzeFiscalNotificationVerticalSliceV1(documentInput),
  );

  return Object.freeze({
    hasText,
    pageCount,
    verticalSliceReview,
    familyAnalysis,
    enforcementMoneyFacts: enforcementCandidate
      ? extractAeatEnforcementMoneyFacts(documentInput)
      : null,
    enforcementExplicitFields,
    enforcementPartyFacts: enforcementCandidate
      ? extractAeatEnforcementPartyFactsV1(documentInput)
      : null,
    deferralGrantFacts: deferralCandidate
      ? extractAeatDeferralGrantFactsV1(documentInput)
      : null,
    offsetAgreementFacts:
      extractedOffsetAgreementFacts?.documentType === "AEAT_OFFSET_AGREEMENT"
        ? extractedOffsetAgreementFacts
        : null,
  });
}
