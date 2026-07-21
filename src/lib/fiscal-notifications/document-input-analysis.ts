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
import { extractAeatOfficialCatalogDocumentV9 } from "./extractor-core/official-catalog-extractor.v9";
import { extractAeatP0DeepDocumentV10 } from "./extractor-core/p0-deep-extractor.v10";
import { segmentProfileDrivenDocumentV2 } from "./extractor-core/profile-driven-document-segments.v2";
import { extractAeatRealCorpusDocumentV2 } from "./extractor-core/real-corpus-extractor.v2";
import { extractAeatRealCorpusDocumentV3 } from "./extractor-core/real-corpus-extractor.v3";
import { extractAeatRealCorpusDocumentV4 } from "./extractor-core/real-corpus-extractor.v4";
import { extractAeatRealCorpusDocumentV5 } from "./extractor-core/real-corpus-extractor.v5";
import { extractAeatRealCorpusDocumentV6 } from "./extractor-core/real-corpus-extractor.v6";
import { extractAeatRealCorpusDocumentV7 } from "./extractor-core/real-corpus-extractor.v7";
import {
  adaptAeatDeferralGrantFactsV1,
  adaptAeatEnforcementFactsV1,
  adaptAeatOffsetAgreementFactsV1,
} from "./extractor-core/existing-extractor-adapters.v1";
import { resolveFamilyRuleV2 } from "./extractor-core/family-rule-registry.v2";
import { analyzeFiscalNotificationVerticalSliceV1 } from "./extractor-core/vertical-slice-orchestrator.v1";
import {
  haveConflictingExactDocumentIdentitiesV2,
  mergeProfileDrivenReviewsV2,
  projectProfileDrivenReviewV2,
} from "./profile-driven-review.v2";
import { projectRealCorpusReviewV2 } from "./real-corpus-review.v2";
import { projectRealCorpusReviewV3 } from "./real-corpus-review.v3";
import { projectRealCorpusReviewV4 } from "./real-corpus-review.v4";
import { projectRealCorpusReviewV5 } from "./real-corpus-review.v5";
import { projectRealCorpusReviewV6 } from "./real-corpus-review.v6";
import { projectRealCorpusReviewV7 } from "./real-corpus-review.v7";
import { projectAeatOfficialCatalogReviewV9 } from "./official-catalog-review.v9";
import { projectAeatP0DeepReviewV10 } from "./p0-deep-review.v10";
import {
  parseFiscalNotificationVerticalSliceReviewV1,
  projectFiscalNotificationExtractorOutputReviewV1,
  projectFiscalNotificationVerticalSliceReviewV1,
  type FiscalNotificationVerticalSliceReviewV1,
} from "./vertical-slice-review.v1";
import {
  isUsefulObservedFiscalNotificationField,
  shouldExposeFiscalNotificationField,
} from "./document-fact-observation.v1";
import { appendObservedDocumentChronologyV1 } from "./observed-document-chronology.v1";
import { reconcileFiscalNotificationReviewAmountsV1 } from "./amount-reconciliation-engine.v1";
import { validateFiscalNotificationMathematicalIntegrityV11 } from "./mathematical-integrity-engine.v11";

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
  const extractedDeferralGrantFacts = deferralCandidate
    ? extractAeatDeferralGrantFactsV1(documentInput)
    : null;
  const extractedEnforcementMoneyFacts = enforcementCandidate
    ? extractAeatEnforcementMoneyFacts(documentInput)
    : null;
  const enforcementExplicitFields = enforcementCandidate
    ? extractAeatEnforcementExplicitFieldsV2(documentInput)
    : null;
  const extractedEnforcementPartyFacts = enforcementCandidate
    ? extractAeatEnforcementPartyFactsV1(documentInput)
    : null;
  const [
    legacyAnalysis,
    profileDrivenOutcome,
    p0DeepOutcomeV10,
    officialCatalogOutcomeV9,
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
    hasText
      ? Promise.resolve(extractAeatP0DeepDocumentV10(documentInput))
      : Promise.resolve(null),
    hasText
      ? extractAeatOfficialCatalogDocumentV9({ document: documentInput })
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
  const adapterContext = {
    ownerScope: documentInput.ownerScope,
    documentId: documentInput.documentId,
    segments: legacyAnalysis.segmentation.segments,
    ...(documentInput.signal ? { signal: documentInput.signal } : {}),
  };
  const specializedReviews = [
    ...(extractedDeferralGrantFacts?.status === "REVIEW_REQUIRED"
      ? [
          projectFiscalNotificationExtractorOutputReviewV1(
            adaptAeatDeferralGrantFactsV1({
              ...adapterContext,
              facts: extractedDeferralGrantFacts,
              ...(realCorpusOutcomeV7?.status === "REVIEW_REQUIRED" &&
              realCorpusOutcomeV7.familyId ===
                "collection.deferral_modification"
                ? { familyId: "collection.deferral_modification" as const }
                : {}),
            }),
          ),
        ]
      : []),
    ...(extractedOffsetAgreementFacts?.status === "REVIEW_REQUIRED"
      ? [
          projectFiscalNotificationExtractorOutputReviewV1(
            adaptAeatOffsetAgreementFactsV1({
              ...adapterContext,
              facts: extractedOffsetAgreementFacts,
            }),
          ),
        ]
      : []),
    ...(extractedEnforcementMoneyFacts?.status === "REVIEW_REQUIRED" &&
    enforcementExplicitFields?.status === "REVIEW_REQUIRED" &&
    extractedEnforcementPartyFacts?.status === "REVIEW_REQUIRED"
      ? [
          projectFiscalNotificationExtractorOutputReviewV1(
            adaptAeatEnforcementFactsV1({
              ...adapterContext,
              explicitFields: enforcementExplicitFields,
              moneyFacts: extractedEnforcementMoneyFacts,
              partyFacts: extractedEnforcementPartyFacts,
              ...(realCorpusOutcomeV7?.status === "REVIEW_REQUIRED" &&
              realCorpusOutcomeV7.familyId === "collection.external_debt"
                ? { familyId: "collection.external_debt" as const }
                : {}),
            }),
          ),
        ]
      : []),
  ];
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
  const rawRealCorpusReviews = [
    ...(realCorpusOutcome?.status === "REVIEW_REQUIRED"
      ? [projectRealCorpusReviewV2(realCorpusOutcome)]
      : []),
    ...(realCorpusOutcomeV3?.status === "REVIEW_REQUIRED"
      ? [projectRealCorpusReviewV3(realCorpusOutcomeV3)]
      : []),
    ...(realCorpusOutcomeV4?.status === "REVIEW_REQUIRED"
      ? [projectRealCorpusReviewV4(realCorpusOutcomeV4)]
      : []),
    ...(realCorpusOutcomeV5?.status === "REVIEW_REQUIRED"
      ? [projectRealCorpusReviewV5(realCorpusOutcomeV5)]
      : []),
    ...(realCorpusOutcomeV6?.status === "REVIEW_REQUIRED"
      ? [projectRealCorpusReviewV6(realCorpusOutcomeV6)]
      : []),
    ...(realCorpusOutcomeV7?.status === "REVIEW_REQUIRED"
      ? [projectRealCorpusReviewV7(realCorpusOutcomeV7)]
      : []),
  ];
  const realCorpusReviews = rawRealCorpusReviews.map((review, index) =>
    filterPreferredMoneyFields(
      filterConflictingReviewDocuments(
        review,
        rawRealCorpusReviews
          .slice(index + 1)
          .flatMap((laterReview) => laterReview.documents),
      ),
      [...rawRealCorpusReviews.slice(index + 1), ...specializedReviews],
    ),
  );
  const authoritativeDocuments = [...specializedReviews, ...realCorpusReviews]
    .flatMap((review) => review.documents);
  const lowerPriorityReviews = [
    ...(p0DeepOutcomeV10?.status === "REVIEW_REQUIRED"
      ? [projectAeatP0DeepReviewV10(p0DeepOutcomeV10)]
      : []),
    ...(officialCatalogOutcomeV9?.status === "REVIEW_REQUIRED" &&
    officialCatalogOutcomeV9.familyId !== p0DeepOutcomeV10?.familyId
      ? [projectAeatOfficialCatalogReviewV9(officialCatalogOutcomeV9)]
      : []),
    ...profileReviews,
  ]
    .map((review) =>
      filterPreferredMoneyFields(review, [
        ...realCorpusReviews,
        ...specializedReviews,
      ]),
    )
    .map((review) =>
      filterConflictingReviewDocuments(review, authoritativeDocuments),
    );
  const mergedVerticalSliceReview = mergeProfileDrivenReviewsV2(
    filterConflictingReviewDocuments(
      filterPreferredMoneyFields(legacyReview, [
        ...realCorpusReviews,
        ...specializedReviews,
      ]),
      authoritativeDocuments,
    ),
    [
      ...lowerPriorityReviews,
      ...realCorpusReviews,
      ...specializedReviews,
    ],
  );
  const chronologyReview = appendObservedDocumentChronologyV1(
    mergedVerticalSliceReview,
    documentInput,
  );
  const reconciledReview = reconcileFiscalNotificationReviewAmountsV1(
    chronologyReview,
    documentInput,
  );
  const integrityReview = validateFiscalNotificationMathematicalIntegrityV11(
    reconciledReview,
    documentInput,
    legacyAnalysis.segmentation.segments,
  );
  const observedDocuments = filterRedundantSameFamilyDocuments(integrityReview.documents)
    .map((document) =>
      Object.freeze({
        ...document,
        fields: Object.freeze(
          document.fields.filter(shouldExposeFiscalNotificationField),
        ),
      }),
    )
    .filter((document) =>
      document.fields.some(isUsefulObservedFiscalNotificationField),
    );
  const verticalSliceReview = parseFiscalNotificationVerticalSliceReviewV1({
    ...integrityReview,
    status:
      observedDocuments.length > 0
        ? "REVIEW_REQUIRED"
        : integrityReview.status === "BLOCKED"
          ? "BLOCKED"
          : "INFORMATION_PENDING",
    documents: observedDocuments,
  });

  return Object.freeze({
    hasText,
    pageCount,
    verticalSliceReview,
    familyAnalysis,
    enforcementMoneyFacts: enforcementCandidate
      ? extractedEnforcementMoneyFacts
      : null,
    enforcementExplicitFields,
    enforcementPartyFacts: enforcementCandidate
      ? extractedEnforcementPartyFacts
      : null,
    deferralGrantFacts: deferralCandidate
      ? extractedDeferralGrantFacts
      : null,
    offsetAgreementFacts:
      extractedOffsetAgreementFacts?.documentType === "AEAT_OFFSET_AGREEMENT"
        ? extractedOffsetAgreementFacts
        : null,
  });
}

function filterRedundantSameFamilyDocuments(
  documents: readonly FiscalNotificationVerticalSliceReviewV1["documents"][number][],
): readonly FiscalNotificationVerticalSliceReviewV1["documents"][number][] {
  const strongReferenceTypes = new Set([
    "ACT_ID", "DEBT_KEY", "EXPEDIENTE_ID", "LIQUIDATION_KEY", "PROCEDURE_ID",
  ]);
  const usefulFields = documents.map((document) =>
    document.fields.filter(isUsefulObservedFiscalNotificationField),
  );
  const valueKey = (
    field: FiscalNotificationVerticalSliceReviewV1["documents"][number]["fields"][number],
  ) => field.semantic === "MONEY" && field.amountCents !== null
    ? `${field.semantic}:${field.canonicalType}:${field.amountCents}:${field.currency ?? ""}`
    : `${field.semantic}:${field.canonicalType}:${field.normalizedValue ?? field.displayValue}`;

  return documents.filter((document, index) => {
    const currentFields = usefulFields[index]!;
    const currentKeys = new Set(currentFields.map(valueKey));
    return !documents.some((candidate, candidateIndex) => {
      if (candidateIndex === index || candidate.familyId !== document.familyId ||
        candidate.pageFrom !== document.pageFrom || candidate.pageTo !== document.pageTo ||
        usefulFields[candidateIndex]!.length <= currentFields.length) return false;
      const currentStrongValues = new Set(currentFields.flatMap((field) =>
        field.semantic === "REFERENCE" && strongReferenceTypes.has(field.canonicalType) &&
        field.normalizedValue
          ? [`${field.canonicalType}:${field.normalizedValue}`]
          : [],
      ));
      const sharesStrongReference = usefulFields[candidateIndex]!.some((field) =>
        field.semantic === "REFERENCE" && strongReferenceTypes.has(field.canonicalType) &&
        field.normalizedValue !== null &&
        currentStrongValues.has(`${field.canonicalType}:${field.normalizedValue}`),
      );
      if (!sharesStrongReference) return false;
      const candidateKeys = new Set(usefulFields[candidateIndex]!.map(valueKey));
      return [...currentKeys].every((key) => candidateKeys.has(key));
    });
  });
}

function filterConflictingReviewDocuments(
  review: FiscalNotificationVerticalSliceReviewV1,
  authoritativeDocuments: readonly FiscalNotificationVerticalSliceReviewV1["documents"][number][],
): FiscalNotificationVerticalSliceReviewV1 {
  const documents = review.documents.filter(
    (document) =>
      !authoritativeDocuments.some(
        (authoritative) =>
          document.pageFrom <= authoritative.pageTo &&
          authoritative.pageFrom <= document.pageTo &&
          document.familyId !== authoritative.familyId &&
          !haveConflictingExactDocumentIdentitiesV2(
            document,
            authoritative,
          ),
      ),
  );
  if (documents.length === review.documents.length) return review;
  return parseFiscalNotificationVerticalSliceReviewV1({
    ...review,
    status:
      documents.length > 0
        ? "REVIEW_REQUIRED"
        : review.status === "BLOCKED"
          ? "BLOCKED"
          : "INFORMATION_PENDING",
    documents,
  });
}

function filterPreferredMoneyFields(
  review: FiscalNotificationVerticalSliceReviewV1,
  preferredReviews: readonly FiscalNotificationVerticalSliceReviewV1[],
): FiscalNotificationVerticalSliceReviewV1 {
  const preferredDocuments = preferredReviews.flatMap(
    (preferred) => preferred.documents,
  );
  const documents = review.documents
    .map((document) => {
      const preferredMoney = new Set(
        preferredDocuments
          .filter(
            (preferred) =>
              preferred.familyId === document.familyId &&
              document.pageFrom <= preferred.pageTo &&
              preferred.pageFrom <= document.pageTo &&
              !haveConflictingExactDocumentIdentitiesV2(
                preferred,
                document,
              ),
          )
          .flatMap((preferred) =>
            preferred.fields.flatMap((field) =>
              field.semantic === "MONEY" && field.amountCents !== null
                ? [
                    `${field.canonicalType}:${field.amountCents}:${field.currency ?? ""}`,
                  ]
                : [],
            ),
          ),
      );
      if (preferredMoney.size === 0) return document;
      return Object.freeze({
        ...document,
        fields: Object.freeze(
          document.fields.filter(
            (field) =>
              field.semantic !== "MONEY" ||
              field.amountCents === null ||
              !preferredMoney.has(
                `${field.canonicalType}:${field.amountCents}:${field.currency ?? ""}`,
              ),
          ),
        ),
      });
    })
    .filter((document) => document.fields.length > 0);
  if (
    documents.length === review.documents.length &&
    documents.every(
      (document, index) => document === review.documents[index],
    )
  ) {
    return review;
  }
  return parseFiscalNotificationVerticalSliceReviewV1({
    ...review,
    status: documents.length > 0 ? "REVIEW_REQUIRED" : "INFORMATION_PENDING",
    documents,
  });
}
