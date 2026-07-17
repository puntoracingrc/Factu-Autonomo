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
import { extractProfileDrivenFamilyV2 } from "./extractor-core/profile-driven-extractor.v2";
import { segmentProfileDrivenDocumentV2 } from "./extractor-core/profile-driven-document-segments.v2";
import { extractAeatRealCorpusDocumentV2 } from "./extractor-core/real-corpus-extractor.v2";
import { extractAeatRealCorpusDocumentV3 } from "./extractor-core/real-corpus-extractor.v3";
import { extractAeatRealCorpusDocumentV4 } from "./extractor-core/real-corpus-extractor.v4";
import { extractAeatRealCorpusDocumentV5 } from "./extractor-core/real-corpus-extractor.v5";
import { extractAeatRealCorpusDocumentV6 } from "./extractor-core/real-corpus-extractor.v6";
import { extractAeatRealCorpusDocumentV7 } from "./extractor-core/real-corpus-extractor.v7";
import { resolveFamilyRuleV2 } from "./extractor-core/family-rule-registry.v2";
import { analyzeFiscalNotificationVerticalSliceV1 } from "./extractor-core/vertical-slice-orchestrator.v1";
import {
  mergeProfileDrivenReviewsV2,
  projectProfileDrivenReviewV2,
} from "./profile-driven-review.v2";
import { projectRealCorpusReviewV2 } from "./real-corpus-review.v2";
import { projectRealCorpusReviewV3 } from "./real-corpus-review.v3";
import { projectRealCorpusReviewV4 } from "./real-corpus-review.v4";
import { projectRealCorpusReviewV5 } from "./real-corpus-review.v5";
import { projectRealCorpusReviewV6 } from "./real-corpus-review.v6";
import { projectRealCorpusReviewV7 } from "./real-corpus-review.v7";
import {
  projectFiscalNotificationVerticalSliceReviewV1,
  type FiscalNotificationVerticalSliceReviewV1,
} from "./vertical-slice-review.v1";

export interface FiscalNotificationDocumentInputAnalysis extends Omit<
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
    familyAnalysis.candidates[0].signalStatus === "COMPLETE_REQUIRED_ANCHORS" &&
    familyAnalysis.candidates[0].conflictingAnchorIds.length === 0;
  const deferralCandidate =
    familyAnalysis?.reason === "SUPPORTED_FAMILY_CANDIDATE" &&
    familyAnalysis.candidates.length === 1 &&
    familyAnalysis.candidates[0]?.familyId ===
      "AEAT_DEFERRAL_GRANT_CANDIDATE" &&
    familyAnalysis.candidates[0].signalStatus === "COMPLETE_REQUIRED_ANCHORS" &&
    familyAnalysis.candidates[0].conflictingAnchorIds.length === 0;
  const offsetCandidate =
    familyAnalysis?.reason === "SUPPORTED_FAMILY_CANDIDATE" &&
    familyAnalysis.candidates.length === 1 &&
    familyAnalysis.candidates[0]?.familyId ===
      "AEAT_OFFSET_AGREEMENT_CANDIDATE" &&
    familyAnalysis.candidates[0].signalStatus === "COMPLETE_REQUIRED_ANCHORS" &&
    familyAnalysis.candidates[0].conflictingAnchorIds.length === 0;

  const extractedOffsetAgreementFacts = offsetCandidate
    ? extractAeatOffsetAgreementFactsV1(documentInput)
    : null;
  const enforcementExplicitFields = enforcementCandidate
    ? extractAeatEnforcementExplicitFieldsV2(documentInput)
    : null;
  const [
    legacyAnalysis,
    profileDrivenOutcome,
    profileDrivenSegments,
    realCorpusOutcome,
    realCorpusOutcomeV3,
    realCorpusOutcomeV4,
    realCorpusOutcomeV5,
    realCorpusOutcomeV6,
    realCorpusOutcomeV7,
  ] = await Promise.all([
    analyzeFiscalNotificationVerticalSliceV1(documentInput),
    hasText
      ? extractProfileDrivenFamilyV2({ document: documentInput })
      : Promise.resolve(null),
    hasText && pageCount > 1
      ? segmentProfileDrivenDocumentV2({ document: documentInput })
      : Promise.resolve(null),
    hasText
      ? extractAeatRealCorpusDocumentV2(documentInput)
      : Promise.resolve(null),
    hasText
      ? extractAeatRealCorpusDocumentV3(documentInput)
      : Promise.resolve(null),
    hasText
      ? extractAeatRealCorpusDocumentV4(documentInput)
      : Promise.resolve(null),
    hasText
      ? extractAeatRealCorpusDocumentV5(documentInput)
      : Promise.resolve(null),
    hasText
      ? extractAeatRealCorpusDocumentV6(documentInput)
      : Promise.resolve(null),
    hasText
      ? extractAeatRealCorpusDocumentV7(documentInput)
      : Promise.resolve(null),
  ]);
  const legacyReview =
    projectFiscalNotificationVerticalSliceReviewV1(legacyAnalysis);
  const segmentedOutcomes =
    profileDrivenSegments?.status === "SEGMENTED_REVIEW_REQUIRED"
      ? profileDrivenSegments.segments.map((segment) => ({
          outcome: segment.outcome,
          documentInstanceId: segment.segmentId,
        }))
      : profileDrivenOutcome?.status === "REVIEW_REQUIRED"
        ? [{ outcome: profileDrivenOutcome, documentInstanceId: null }]
        : [];
  const profileReviews = segmentedOutcomes.flatMap(
    ({ outcome, documentInstanceId }) => {
      const profileRule = resolveFamilyRuleV2(outcome.familyId);
      const selectedProfileCandidate = outcome.familyCandidates.find(
        (candidate) => candidate.familyId === outcome.familyId,
      );
      return outcome.adaptedFields !== null &&
        profileRule !== null &&
        selectedProfileCandidate !== undefined
        ? [
            projectProfileDrivenReviewV2({
              outcome: outcome.adaptedFields,
              extractorId: profileRule.extractorId,
              canonicalTitle: profileRule.canonicalTitle,
              titlePageNumbers: selectedProfileCandidate.matchedPageNumbers,
              pageCount,
              ...(documentInstanceId ? { documentInstanceId } : {}),
            }),
          ]
        : [];
    },
  );
  const v3FamilyId =
    realCorpusOutcomeV3?.status === "REVIEW_REQUIRED"
      ? realCorpusOutcomeV3.familyId
      : null;
  const v4FamilyId =
    realCorpusOutcomeV4?.status === "REVIEW_REQUIRED"
      ? realCorpusOutcomeV4.familyId
      : null;
  const v5FamilyId =
    realCorpusOutcomeV5?.status === "REVIEW_REQUIRED"
      ? realCorpusOutcomeV5.familyId
      : null;
  const v6FamilyId =
    realCorpusOutcomeV6?.status === "REVIEW_REQUIRED"
      ? realCorpusOutcomeV6.familyId
      : null;
  const v7FamilyId =
    realCorpusOutcomeV7?.status === "REVIEW_REQUIRED"
      ? realCorpusOutcomeV7.familyId
      : null;
  const reviewsOutsideLatestFamily = profileReviews.filter(
    (review) =>
      (v3FamilyId === null ||
        review.documents.every((document) => document.familyId !== v3FamilyId)) &&
      (v4FamilyId === null ||
        review.documents.every((document) => document.familyId !== v4FamilyId)) &&
      (v5FamilyId === null ||
        review.documents.every((document) => document.familyId !== v5FamilyId)) &&
      (v6FamilyId === null ||
        review.documents.every((document) => document.familyId !== v6FamilyId)) &&
      (v7FamilyId === null ||
        review.documents.every((document) => document.familyId !== v7FamilyId)),
  );
  const verticalSliceReview = mergeProfileDrivenReviewsV2(legacyReview, [
    ...reviewsOutsideLatestFamily,
    ...(realCorpusOutcome &&
    realCorpusOutcome.familyId !== v3FamilyId &&
    realCorpusOutcome.familyId !== v4FamilyId &&
    realCorpusOutcome.familyId !== v5FamilyId &&
    realCorpusOutcome.familyId !== v6FamilyId &&
    realCorpusOutcome.familyId !== v7FamilyId
      ? [projectRealCorpusReviewV2(realCorpusOutcome)]
      : []),
    ...(realCorpusOutcomeV3 &&
    realCorpusOutcomeV3.familyId !== v4FamilyId &&
    realCorpusOutcomeV3.familyId !== v5FamilyId &&
    realCorpusOutcomeV3.familyId !== v6FamilyId &&
    realCorpusOutcomeV3.familyId !== v7FamilyId
      ? [projectRealCorpusReviewV3(realCorpusOutcomeV3)]
      : []),
    ...(realCorpusOutcomeV4 &&
    realCorpusOutcomeV4.familyId !== v5FamilyId &&
    realCorpusOutcomeV4.familyId !== v6FamilyId &&
    realCorpusOutcomeV4.familyId !== v7FamilyId
      ? [projectRealCorpusReviewV4(realCorpusOutcomeV4)]
      : []),
    ...(realCorpusOutcomeV5 &&
    realCorpusOutcomeV5.familyId !== v6FamilyId &&
    realCorpusOutcomeV5.familyId !== v7FamilyId
      ? [projectRealCorpusReviewV5(realCorpusOutcomeV5)]
      : []),
    ...(realCorpusOutcomeV6 && realCorpusOutcomeV6.familyId !== v7FamilyId
      ? [projectRealCorpusReviewV6(realCorpusOutcomeV6)]
      : []),
    ...(realCorpusOutcomeV7
      ? [projectRealCorpusReviewV7(realCorpusOutcomeV7)]
      : []),
  ]);

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
