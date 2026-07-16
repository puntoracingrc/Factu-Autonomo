import { describe, expect, it } from "vitest";
import { commitAppDataDurably } from "@/lib/app-data-durability";
import { EMPTY_DATA, type AppData } from "@/lib/types";
import { analyzeFiscalNotificationDocumentInput } from "../document-input-analysis";
import type { BoundedDocumentInput } from "../input-contract";
import type { FiscalNotificationLocalAnalysisResult } from "../local-review-flow";
import { projectFiscalNotificationStructuredHistoryV1 } from "../structured-review-history-view-model.v1";
import { runSaveFiscalNotificationStructuredReviewCommandV1 } from "../structured-review-save-command.v1";

const OWNER_SCOPE = "user:00000000-0000-4000-8000-000000000614";
const REVIEW_ID = "review:00000000-0000-4000-8000-000000000615";
const CREATED_AT = "2026-07-16T12:00:00.000Z";
const SHA256 = "6".repeat(64);

function syntheticSanctionDocument(): BoundedDocumentInput {
  return Object.freeze({
    ownerScope: OWNER_SCOPE,
    documentId: "document:synthetic-sanction-e2e-v2",
    pages: Object.freeze([
      Object.freeze({
        pageNumber: 1,
        text: [
          "Agencia Estatal de Administración Tributaria",
          "Resolución sancionadora",
          "Número de expediente: EXP-SYN-E2E-001",
          "Fecha efectiva de notificación: 16/07/2026",
          "Importe inicial de la sanción: 300,00 €",
          "Importe reducido de la sanción: 225,00 €",
          "Constan vías de recurso",
        ].join("\n"),
        isBlank: false,
      }),
    ]),
  });
}

describe("AEAT document intelligence V2 end-to-end", () => {
  it("extracts, reviews, durably saves and reopens a specific explanation without retaining source text", async () => {
    const analyzed = await analyzeFiscalNotificationDocumentInput(
      syntheticSanctionDocument(),
    );
    const review = analyzed.verticalSliceReview;

    expect(review).toMatchObject({
      status: "REVIEW_REQUIRED",
      documents: [
        expect.objectContaining({
          familyId: "sanction.resolution",
          title: "Resolución sancionadora",
          fields: expect.arrayContaining([
            expect.objectContaining({
              fieldId: expect.stringContaining("EXPEDIENTE_ID"),
              normalizedValue: "EXP-SYN-E2E-001",
            }),
            expect.objectContaining({
              fieldId: expect.stringContaining(
                "EFFECTIVE_NOTIFICATION_DATE",
              ),
              normalizedValue: "2026-07-16",
            }),
            expect.objectContaining({
              fieldId: expect.stringContaining("SANCTION_INITIAL"),
              amountCents: 30_000,
              currency: "EUR",
            }),
            expect.objectContaining({
              fieldId: expect.stringContaining("SANCTION_REDUCED"),
              amountCents: 22_500,
              currency: "EUR",
            }),
          ]),
        }),
      ],
      retainedSourceContent: "NONE",
      materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
    });
    const localAnalysis: FiscalNotificationLocalAnalysisResult = Object.freeze({
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
        sha256: SHA256,
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
      ephemeralVerticalSliceReview: review,
      textAcquisition: Object.freeze({
        mode: "PDF_TEXT_LAYER",
        averageConfidence: null,
      }),
      sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    });
    const baseline = structuredClone(EMPTY_DATA);
    let persisted: AppData | null = null;
    const saved = runSaveFiscalNotificationStructuredReviewCommandV1({
      expected: baseline,
      ownerScope: OWNER_SCOPE,
      reviewId: REVIEW_ID,
      createdAt: CREATED_AT,
      analysis: localAnalysis,
      commit: <T>(
        expected: AppData,
        build: (previous: AppData) => { data: AppData; value: T },
      ) =>
        commitAppDataDurably({
          expected,
          getCurrent: () => baseline,
          build,
          persist: (candidate) => {
            persisted = candidate;
            return { status: "applied" as const };
          },
        }),
    });

    if (saved.status === "blocked") throw new Error(saved.reason);
    expect(saved).toMatchObject({ status: "applied" });
    if (saved.status !== "applied") return;
    expect(persisted).toBe(saved.data);
    const workspace = saved.data.fiscalNotificationsWorkspace;
    expect(workspace).toBeDefined();
    expect(workspace).toMatchObject({
      ownerScope: OWNER_SCOPE,
      documents: [
        expect.objectContaining({
          documentSubtype: "sanction.resolution",
          notificationDates: { effectiveAt: "2026-07-16T00:00:00.000Z" },
          status: "UNKNOWN",
          analysisStatus: "NEEDS_REVIEW",
        }),
      ],
      debts: [],
      obligations: [],
      deadlineRules: [],
      accountingDrafts: [],
    });

    const history = projectFiscalNotificationStructuredHistoryV1(
      workspace,
      OWNER_SCOPE,
    );
    expect(history.status).toBe("READY");
    if (history.status !== "READY") return;
    expect(history.entries).toHaveLength(1);
    expect(history.entries[0]).toMatchObject({
      title: "Resolución sancionadora",
      documentDate: "2026-07-16",
      documentDateBasis: "Fecha de notificacion",
      subjectName: null,
      subjectTaxId: null,
      explanation: {
        ruleId: "profile.sanction.resolution.explanation.v2",
        whatItIs:
          "Es la resolución que decide el expediente sancionador y fija, reduce, anula o no impone la sanción.",
        deadline: { status: "DOCUMENT_STATED" },
        materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
      },
    });
    expect(history.entries[0]?.money).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ amountCents: 30_000, currency: "EUR" }),
        expect.objectContaining({ amountCents: 22_500, currency: "EUR" }),
      ]),
    );
    expect(history.entries[0]?.explanation.keyFacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: expect.stringContaining("300,00") }),
        expect.objectContaining({ value: expect.stringContaining("225,00") }),
      ]),
    );

    const persistedJson = JSON.stringify(saved.data);
    expect(persistedJson).not.toContain(
      "Agencia Estatal de Administración Tributaria\nResolución sancionadora",
    );
    expect(persistedJson).not.toContain("Constan vías de recurso");
    expect(persistedJson).not.toMatch(/PDF_TEXT|sourceText|pageText/u);
  });
});
