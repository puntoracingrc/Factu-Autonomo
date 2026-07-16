import { describe, expect, it } from "vitest";
import { commitAppDataDurably } from "@/lib/app-data-durability";
import { EMPTY_DATA, type AppData } from "@/lib/types";
import { analyzeFiscalNotificationDocumentInput } from "../document-input-analysis";
import type { BoundedDocumentInput } from "../input-contract";
import type { FiscalNotificationLocalAnalysisResult } from "../local-review-flow";
import { projectFiscalNotificationStructuredHistoryV1 } from "../structured-review-history-view-model.v1";
import {
  STRUCTURED_REVIEW_DOCUMENT_CHAIN_ALGORITHM_VERSION_V2,
} from "../structured-review-relation-suggestions.v1";
import { projectStructuredReviewRelationsV1 } from "../structured-review-relations-view-model.v1";
import { runSaveFiscalNotificationStructuredReviewCommandV1 } from "../structured-review-save-command.v1";

const OWNER_SCOPE = "user:00000000-0000-4000-8000-000000000621";
const EXACT_EXPEDIENT_REFERENCE = "EXP-SYN-CHAIN-621";
const PRIVATE_NAME = "PERSONA PRIVADA SINTETICA 621";
const PRIVATE_TAX_ID = "12345678Z";
const RAW_SOURCE_MARKER = "RAW-SOURCE-MUST-NEVER-BE-PERSISTED-621";

function documentInput(
  documentId: string,
  title: string,
  notificationDate: string,
): BoundedDocumentInput {
  return Object.freeze({
    ownerScope: OWNER_SCOPE,
    documentId,
    pages: Object.freeze([
      Object.freeze({
        pageNumber: 1,
        text: [
          "Agencia Estatal de Administración Tributaria",
          title,
          `Número de expediente: ${EXACT_EXPEDIENT_REFERENCE}`,
          `Fecha efectiva de notificación: ${notificationDate}`,
          `Nombre o razón social: ${PRIVATE_NAME}`,
          `NIF: ${PRIVATE_TAX_ID}`,
          RAW_SOURCE_MARKER,
        ].join("\n"),
        isBlank: false,
      }),
    ]),
  });
}

function localAnalysis(
  analyzed: Awaited<ReturnType<typeof analyzeFiscalNotificationDocumentInput>>,
  sha256: string,
): FiscalNotificationLocalAnalysisResult {
  return Object.freeze({
    schemaVersion: 6,
    analysisVersion: "6.0.0",
    technicalReview: Object.freeze({
      schemaVersion: 1,
      flowVersion: "1.0.0",
      status: "REVIEW_REQUIRED",
      reason: "NO_SUPPORTED_FAMILY_SIGNAL",
      engineId: null,
      engineVersion: null,
      pageCount: analyzed.pageCount,
      byteLength: 4_096,
      sha256,
      candidates: Object.freeze([]),
      selectedFamilyId: null,
      providerCalled: false,
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
      retainedSourceContent: "NONE",
    }),
    ephemeralEnforcementMoneyFacts: analyzed.enforcementMoneyFacts ?? null,
    ephemeralEnforcementExplicitFields:
      analyzed.enforcementExplicitFields ?? null,
    ephemeralEnforcementPartyFacts: analyzed.enforcementPartyFacts ?? null,
    ephemeralDeferralGrantFacts: analyzed.deferralGrantFacts ?? null,
    ephemeralOffsetAgreementFacts: analyzed.offsetAgreementFacts ?? null,
    ephemeralVerticalSliceReview: analyzed.verticalSliceReview,
    textAcquisition: Object.freeze({
      mode: "PDF_TEXT_LAYER",
      averageConfidence: null,
    }),
    sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
  });
}

function saveReview(input: {
  readonly expected: AppData;
  readonly reviewId: string;
  readonly createdAt: string;
  readonly analysis: FiscalNotificationLocalAnalysisResult;
}): AppData {
  const saved = runSaveFiscalNotificationStructuredReviewCommandV1({
    expected: input.expected,
    ownerScope: OWNER_SCOPE,
    reviewId: input.reviewId,
    createdAt: input.createdAt,
    analysis: input.analysis,
    commit: <T>(
      expected: AppData,
      build: (previous: AppData) => { data: AppData; value: T },
    ) =>
      commitAppDataDurably({
        expected,
        getCurrent: () => expected,
        build,
        persist: () => ({ status: "applied" as const }),
      }),
  });
  if (saved.status !== "applied") {
    throw new Error(`Synthetic review save failed: ${saved.status}`);
  }
  return saved.data;
}

describe("AEAT declared-chain persistence end-to-end", () => {
  it("saves two exact-reference acts as a review-only timeline and reopens them without operational effects or source PII", async () => {
    const initiation = await analyzeFiscalNotificationDocumentInput(
      documentInput(
        "document:synthetic-sanction-initiation-621",
        "Inicio de expediente sancionador y audiencia",
        "10/07/2026",
      ),
    );
    const resolution = await analyzeFiscalNotificationDocumentInput(
      documentInput(
        "document:synthetic-sanction-resolution-621",
        "Resolución sancionadora",
        "16/07/2026",
      ),
    );

    expect(initiation.verticalSliceReview.documents).toEqual([
      expect.objectContaining({
        familyId: "sanction.initiation_and_hearing",
        fields: expect.arrayContaining([
          expect.objectContaining({
            canonicalType: "EXPEDIENTE_ID",
            normalizedValue: EXACT_EXPEDIENT_REFERENCE,
          }),
        ]),
      }),
    ]);
    expect(resolution.verticalSliceReview.documents).toEqual([
      expect.objectContaining({
        familyId: "sanction.resolution",
        fields: expect.arrayContaining([
          expect.objectContaining({
            canonicalType: "EXPEDIENTE_ID",
            normalizedValue: EXACT_EXPEDIENT_REFERENCE,
          }),
        ]),
      }),
    ]);

    const firstSave = saveReview({
      expected: structuredClone(EMPTY_DATA),
      reviewId: "review:00000000-0000-4000-8000-000000000622",
      createdAt: "2026-07-16T08:00:00.000Z",
      analysis: localAnalysis(initiation, "a".repeat(64)),
    });
    const secondSave = saveReview({
      expected: firstSave,
      reviewId: "review:00000000-0000-4000-8000-000000000623",
      createdAt: "2026-07-16T09:00:00.000Z",
      analysis: localAnalysis(resolution, "b".repeat(64)),
    });
    const workspace = secondSave.fiscalNotificationsWorkspace;
    expect(workspace).toBeDefined();
    if (!workspace) return;

    const initiationDocument = workspace.documents.find(
      ({ documentSubtype }) =>
        documentSubtype === "sanction.initiation_and_hearing",
    );
    const resolutionDocument = workspace.documents.find(
      ({ documentSubtype }) => documentSubtype === "sanction.resolution",
    );
    expect(initiationDocument).toBeDefined();
    expect(resolutionDocument).toBeDefined();
    if (!initiationDocument || !resolutionDocument) return;

    expect(workspace.relations).toEqual([
      expect.objectContaining({
        sourceDocumentId: resolutionDocument.id,
        targetDocumentId: initiationDocument.id,
        relationType: "RESOLVES",
        confidenceBand: "EXACT",
        algorithmVersion:
          STRUCTURED_REVIEW_DOCUMENT_CHAIN_ALGORITHM_VERSION_V2,
        status: "SYSTEM_CONFIRMED_EXACT",
        evidence: expect.objectContaining({
          chainId: "missing_return_to_sanction",
          matchingReferenceTypes: ["EXPEDIENT_NUMBER"],
        }),
      }),
    ]);

    const reopenedWorkspace = structuredClone(workspace);
    const relationView = projectStructuredReviewRelationsV1(
      reopenedWorkspace,
      OWNER_SCOPE,
    );
    expect(relationView.status).toBe("READY");
    if (relationView.status !== "READY") return;
    expect(relationView.entries).toEqual([
      expect.objectContaining({
        chainId: "missing_return_to_sanction",
        relationType: "RESOLVES",
        relationStatus: "SYSTEM_CONFIRMED_EXACT",
        algorithmVersion:
          STRUCTURED_REVIEW_DOCUMENT_CHAIN_ALGORITHM_VERSION_V2,
        matches: [
          expect.objectContaining({
            label: "Número de expediente",
            value: EXACT_EXPEDIENT_REFERENCE,
            matchMode: "EXACT_PRINTED",
          }),
        ],
      }),
    ]);
    expect(relationView.timelines).toEqual([
      expect.objectContaining({
        statusLabel: "Referencias exactas · efectos por revisar",
        steps: [
          expect.objectContaining({
            id: initiationDocument.id,
            title: "Inicio de expediente sancionador y audiencia",
            position: 1,
          }),
          expect.objectContaining({
            id: resolutionDocument.id,
            title: "Resolución sancionadora",
            position: 2,
          }),
        ],
        links: [
          expect.objectContaining({
            earlierDocumentId: initiationDocument.id,
            laterDocumentId: resolutionDocument.id,
          }),
        ],
        requiresHumanReview: true,
      }),
    ]);

    const reopenedHistory = projectFiscalNotificationStructuredHistoryV1(
      reopenedWorkspace,
      OWNER_SCOPE,
    );
    expect(reopenedHistory.status).toBe("READY");
    if (reopenedHistory.status !== "READY") return;
    expect(reopenedHistory.entries).toHaveLength(2);
    expect(reopenedHistory.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Inicio de expediente sancionador y audiencia",
          documentDate: "2026-07-10",
          subjectName: null,
          subjectTaxId: null,
        }),
        expect.objectContaining({
          title: "Resolución sancionadora",
          documentDate: "2026-07-16",
          subjectName: null,
          subjectTaxId: null,
        }),
      ]),
    );

    expect(workspace.debts).toEqual([]);
    expect(workspace.debtObservations).toEqual([]);
    expect(workspace.obligations).toEqual([]);
    expect(workspace.deadlineRules).toEqual([]);
    expect(workspace.paymentOptions).toEqual([]);
    expect(workspace.paymentPlans).toEqual([]);
    expect(workspace.installments).toEqual([]);
    expect(workspace.accountingDrafts).toEqual([]);
    expect(workspace.timeline).toEqual([]);
    expect(
      workspace.analysisSnapshots.every(
        ({ requiresHumanReview }) => requiresHumanReview,
      ),
    ).toBe(true);

    const persistedJson = JSON.stringify(secondSave);
    expect(persistedJson).not.toContain(PRIVATE_NAME);
    expect(persistedJson).not.toContain(PRIVATE_TAX_ID);
    expect(persistedJson).not.toContain(RAW_SOURCE_MARKER);
    expect(persistedJson).not.toMatch(/sourceText|pageText|PDF_TEXT_LAYER/u);
  });
});
