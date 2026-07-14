import { describe, expect, it, vi } from "vitest";
import { commitAppDataDurably } from "../app-data-durability";
import { EMPTY_DATA, type AppData } from "../types";
import type { FiscalNotificationLocalAnalysisResult } from "./local-review-flow";
import { runSaveFiscalNotificationStructuredReviewCommandV1 } from "./structured-review-save-command.v1";
import {
  FiscalNotificationVerticalSliceWorkspaceErrorV1,
  appendFiscalNotificationVerticalSliceReviewV1,
} from "./vertical-slice-review-workspace.v1";
import { validateFiscalNotificationsWorkspaceIntegrity } from "./workspace-integrity";

const OWNER = "user:00000000-0000-4000-8000-000000000101";
const OTHER_OWNER = "user:00000000-0000-4000-8000-000000000102";
const REVIEW_ID = "review:00000000-0000-4000-8000-000000000103";
const SECOND_REVIEW_ID = "review:00000000-0000-4000-8000-000000000104";
const CREATED_AT = "2026-07-14T20:00:00.000Z";
const HASH = "a".repeat(64);

function field(overrides: Record<string, unknown>) {
  return Object.freeze({
    fieldId: "status:document",
    semantic: "STATUS",
    canonicalType: "DOCUMENT_STATUS",
    label: "Estado del documento",
    displayValue: "Pendiente de revisión",
    normalizedValue: null,
    amountCents: null,
    currency: null,
    sourcePageNumbers: Object.freeze([1]),
    sourceLabel: "Estado extraído del documento",
    confidence: 1,
    reviewStatus: "REVIEW_REQUIRED",
    ...overrides,
  });
}

function analysis(sha256 = HASH): FiscalNotificationLocalAnalysisResult {
  return Object.freeze({
    schemaVersion: 6,
    analysisVersion: "6.0.0",
    technicalReview: Object.freeze({
      schemaVersion: 1,
      flowVersion: "1.0.0",
      status: "REVIEW_REQUIRED",
      reason: "SUPPORTED_FAMILY_CANDIDATE",
      engineId: "fiscal-notification-family-candidate-engine",
      engineVersion: "1.4.0",
      pageCount: 3,
      byteLength: 12_345,
      sha256,
      candidates: Object.freeze([]),
      selectedFamilyId: null,
      providerCalled: false,
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
      retainedSourceContent: "NONE",
    }),
    ephemeralEnforcementMoneyFacts: null,
    ephemeralEnforcementExplicitFields: null,
    ephemeralEnforcementPartyFacts: null,
    ephemeralDeferralGrantFacts: null,
    ephemeralOffsetAgreementFacts: null,
    ephemeralVerticalSliceReview: Object.freeze({
      schemaVersion: 1,
      reviewVersion: "1.0.0",
      status: "REVIEW_REQUIRED",
      documents: Object.freeze([
        Object.freeze({
          reviewDocumentId: "review-document:assessment",
          extractorId: "assessment",
          familyId: "assessment.final_provisional_assessment",
          title: "Liquidación provisional",
          subtitle: "Liquidación provisional emitida",
          pageFrom: 1,
          pageTo: 2,
          confidence: 1,
          fields: Object.freeze([
            field({}),
            field({
              fieldId: "reference:1:DEBT_KEY",
              semantic: "REFERENCE",
              canonicalType: "DEBT_KEY",
              label: "Clave de deuda",
              displayValue: "SYNTH-DEBT-101",
              normalizedValue: "SYNTH-DEBT-101",
              sourcePageNumbers: Object.freeze([1]),
              sourceLabel: "Clave de deuda",
            }),
            field({
              fieldId: "money:quota",
              semantic: "MONEY",
              canonicalType: "TAX_QUOTA",
              label: "Cuota",
              displayValue: "1.234,56 €",
              amountCents: 123_456,
              currency: "EUR",
              sourcePageNumbers: Object.freeze([2]),
              sourceLabel: "Cuota resultante",
            }),
            field({
              fieldId: "date:issue",
              semantic: "DATE",
              canonicalType: "ISSUE_DATE",
              label: "Fecha de emisión",
              displayValue: "14/07/2026",
              normalizedValue: "2026-07-14",
              sourcePageNumbers: Object.freeze([1]),
              sourceLabel: "Fecha de emisión",
            }),
            field({
              fieldId: "party:taxpayer",
              semantic: "PARTY",
              canonicalType: "TAXPAYER",
              label: "Obligado tributario",
              displayValue: "PERSONA SINTÉTICA",
              sourcePageNumbers: Object.freeze([1]),
              sourceLabel: "Obligado tributario",
            }),
          ]),
          warnings: Object.freeze([
            "SYNTHETIC_RAW_WARNING_SHOULD_NOT_PERSIST",
          ]),
          requiresHumanReview: true,
        }),
        Object.freeze({
          reviewDocumentId: "review-document:payment-evidence",
          extractorId: "payment-evidence",
          familyId: "payment.receipt",
          title: "Justificante de pago",
          subtitle: "Pago confirmado en el justificante",
          pageFrom: 3,
          pageTo: 3,
          confidence: 1,
          fields: Object.freeze([
            field({
              displayValue: "Pago confirmado en el justificante",
              sourcePageNumbers: Object.freeze([3]),
            }),
            field({
              fieldId: "reference:1:DEBT_KEY",
              semantic: "REFERENCE",
              canonicalType: "DEBT_KEY",
              label: "Clave de deuda",
              displayValue: "SYNTH-DEBT-101",
              normalizedValue: "SYNTH-DEBT-101",
              sourcePageNumbers: Object.freeze([3]),
              sourceLabel: "Clave de deuda",
            }),
            field({
              fieldId: "reference:2:NRC",
              semantic: "REFERENCE",
              canonicalType: "NRC",
              label: "NRC",
              displayValue: "SYNTH-NRC-101",
              normalizedValue: "SYNTH-NRC-101",
              sourcePageNumbers: Object.freeze([3]),
              sourceLabel: "NRC",
            }),
            field({
              fieldId: "money:paid",
              semantic: "MONEY",
              canonicalType: "TOTAL_PAID",
              label: "Total pagado",
              displayValue: "1.234,56 €",
              amountCents: 123_456,
              currency: "EUR",
              sourcePageNumbers: Object.freeze([3]),
              sourceLabel: "Importe pagado",
            }),
            field({
              fieldId: "masked-account",
              semantic: "MASKED_VALUE",
              canonicalType: "MASKED_ACCOUNT",
              label: "Cuenta enmascarada",
              displayValue: "****9012",
              sourcePageNumbers: Object.freeze([3]),
              sourceLabel: "Cuenta de cargo",
            }),
          ]),
          warnings: Object.freeze([]),
          requiresHumanReview: true,
        }),
      ]),
      sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
      retainedSourceContent: "NONE",
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
      permitsDebtCreation: false,
      permitsDeadlineCreation: false,
      permitsPaymentAction: false,
      permitsAccountingAction: false,
    }),
    textAcquisition: Object.freeze({
      mode: "PDF_TEXT_LAYER",
      averageConfidence: null,
    }),
    sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
  });
}

describe("vertical slice structured workspace v1", () => {
  it("persiste varias fichas segmentadas con datos exactos y ningún efecto operativo", () => {
    const source = analysis();
    const before = structuredClone(source);
    const result = appendFiscalNotificationVerticalSliceReviewV1({
      ownerScope: OWNER,
      reviewId: REVIEW_ID,
      createdAt: CREATED_AT,
      workspace: null,
      analysis: source,
    });

    expect(result.status).toBe("APPLIED");
    expect(result.documentIds).toHaveLength(2);
    expect(result.workspace.packages).toHaveLength(1);
    expect(result.workspace.files).toEqual([
      expect.objectContaining({
        sourceContentRetention: "NOT_RETAINED",
        pageCount: 3,
        fileSize: 12_345,
        sha256: HASH,
      }),
    ]);
    expect(result.workspace.documents).toEqual([
      expect.objectContaining({
        documentType: "AEAT_ASSESSMENT",
        documentSubtype: "assessment.final_provisional_assessment",
        titleRaw: "Liquidación provisional",
        issueDate: "2026-07-14",
      }),
      expect.objectContaining({
        documentType: "GENERIC_ADMINISTRATIVE_NOTICE",
        documentSubtype: "payment.receipt",
        titleRaw: "Justificante de pago",
      }),
    ]);
    expect(result.workspace.references.map((item) => item.rawValue)).toEqual([
      "SYNTH-DEBT-101",
      "SYNTH-DEBT-101",
      "SYNTH-NRC-101",
    ]);
    expect(
      result.workspace.analysisSnapshots.flatMap(
        (item) => item.structuredData.administrativeDomain?.moneyFacts ?? [],
      ),
    ).toEqual([
      expect.objectContaining({
        kind: "FINAL_QUOTA",
        amountCents: 123_456,
        status: "PROPOSED",
      }),
      expect.objectContaining({
        kind: "PAYMENT_CONFIRMED",
        amountCents: 123_456,
        status: "PROPOSED",
      }),
    ]);
    expect(
      result.workspace.analysisSnapshots[1]?.structuredData.unknownFields,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          labelRaw: "VSR1|MASKED_VALUE|MASKED_ACCOUNT|Cuenta enmascarada",
          valueRaw: "****9012",
          page: 3,
        }),
      ]),
    );
    expect(result.workspace.debts).toEqual([]);
    expect(result.workspace.obligations).toEqual([]);
    expect(result.workspace.deadlineRules).toEqual([]);
    expect(result.workspace.paymentPlans).toEqual([]);
    expect(result.workspace.accountingDrafts).toEqual([]);
    expect(validateFiscalNotificationsWorkspaceIntegrity(result.workspace, OWNER)).toEqual({
      valid: true,
      issues: [],
    });
    expect(source).toEqual(before);
    expect(Object.isFrozen(result.workspace)).toBe(true);
    expect(Object.isFrozen(result.workspace.documents)).toBe(true);
    expect(JSON.stringify(result.workspace)).not.toMatch(
      /originalFilename|storageReference|texto ocr completo|private\.pdf|SYNTHETIC_RAW_WARNING_SHOULD_NOT_PERSIST/i,
    );
  });

  it("es idempotente por hash y familia aunque cambie el id de revisión", () => {
    const first = appendFiscalNotificationVerticalSliceReviewV1({
      ownerScope: OWNER,
      reviewId: REVIEW_ID,
      createdAt: CREATED_AT,
      workspace: null,
      analysis: analysis(),
    });
    const replay = appendFiscalNotificationVerticalSliceReviewV1({
      ownerScope: OWNER,
      reviewId: SECOND_REVIEW_ID,
      createdAt: "2026-07-14T20:01:00.000Z",
      workspace: first.workspace,
      analysis: analysis(),
    });

    expect(replay.status).toBe("EXISTING");
    expect(replay.documentIds).toEqual(first.documentIds);
    expect(replay.workspace.revision).toBe(first.workspace.revision);
    expect(replay.workspace.documents).toHaveLength(2);
  });

  it("guarda el paquete en una transición durable y sugiere la relación exacta", () => {
    const expected = structuredClone(EMPTY_DATA);
    const persist = vi.fn(() => ({ status: "applied" as const }));
    const result = runSaveFiscalNotificationStructuredReviewCommandV1({
      expected,
      ownerScope: OWNER,
      reviewId: REVIEW_ID,
      createdAt: CREATED_AT,
      analysis: analysis(),
      commit: <T>(
        baseline: AppData,
        build: (previous: AppData) => { data: AppData; value: T },
      ) =>
        commitAppDataDurably({
          expected: baseline,
          getCurrent: () => expected,
          build,
          persist,
        }),
    });

    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;
    expect(result.replayed).toBe(false);
    expect(result.data.fiscalNotificationsWorkspace?.documents).toHaveLength(2);
    expect(result.data.fiscalNotificationsWorkspace?.relations).toEqual([
      expect.objectContaining({
        relationType: "POSSIBLY_RELATED",
        status: "SUGGESTED",
        evidence: expect.objectContaining({
          matchingReferenceTypes: ["DEBT_KEY"],
        }),
      }),
    ]);
    expect(persist).toHaveBeenCalledTimes(1);
    expect(expected.fiscalNotificationsWorkspace).toBeUndefined();
  });

  it("rechaza ownerScope, claves desconocidas y revisiones vacías sin eco de datos", () => {
    const source = analysis();
    const existing = appendFiscalNotificationVerticalSliceReviewV1({
      ownerScope: OWNER,
      reviewId: REVIEW_ID,
      createdAt: CREATED_AT,
      workspace: null,
      analysis: source,
    });
    const cases: unknown[] = [
      {
        ownerScope: OTHER_OWNER,
        reviewId: SECOND_REVIEW_ID,
        createdAt: "2026-07-14T20:01:00.000Z",
        workspace: existing.workspace,
        analysis: source,
      },
      {
        ownerScope: OWNER,
        reviewId: REVIEW_ID,
        createdAt: CREATED_AT,
        workspace: null,
        analysis: { ...source, rawOcrText: "dato privado" },
      },
    ];
    for (const candidate of cases) {
      expect(() =>
        appendFiscalNotificationVerticalSliceReviewV1(
          candidate as Parameters<
            typeof appendFiscalNotificationVerticalSliceReviewV1
          >[0],
        ),
      ).toThrow(FiscalNotificationVerticalSliceWorkspaceErrorV1);
    }

    const empty = {
      ...source,
      ephemeralVerticalSliceReview: {
        ...source.ephemeralVerticalSliceReview,
        status: "INFORMATION_PENDING",
        documents: [],
      },
    } as FiscalNotificationLocalAnalysisResult;
    expect(() =>
      appendFiscalNotificationVerticalSliceReviewV1({
        ownerScope: OWNER,
        reviewId: REVIEW_ID,
        createdAt: CREATED_AT,
        workspace: null,
        analysis: empty,
      }),
    ).toThrowError(
      expect.objectContaining({ code: "NO_STRUCTURED_FACTS" }),
    );
  });
});
