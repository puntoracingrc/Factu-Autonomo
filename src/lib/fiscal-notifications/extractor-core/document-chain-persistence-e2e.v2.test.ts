import { describe, expect, it } from "vitest";
import { commitAppDataDurably } from "@/lib/app-data-durability";
import { EMPTY_DATA, type AppData } from "@/lib/types";
import { analyzeFiscalNotificationDocumentInput } from "../document-input-analysis";
import { deleteFiscalNotificationDocumentV1 } from "../document-deletion.v1";
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

function stackedDocumentInput(
  documentId: string,
  lines: readonly string[],
): BoundedDocumentInput {
  return Object.freeze({
    ownerScope: OWNER_SCOPE,
    documentId,
    pages: Object.freeze([
      Object.freeze({
        pageNumber: 1,
        text: lines.join("\n"),
        isBlank: false,
        layoutRows: Object.freeze(
          lines.map((text, index) =>
            Object.freeze({
              yMilli: 950_000 - index * 18_000,
              cells: Object.freeze([
                Object.freeze({
                  xMilli: 90_000,
                  widthMilli: 600_000,
                  text,
                }),
              ]),
            }),
          ),
        ),
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

  it("saves and reopens an enforcement-seizure pair, then deletes exactly one document", async () => {
    const enforcement = await analyzeFiscalNotificationDocumentInput(
      stackedDocumentInput("document:synthetic-enforcement-e2e", [
        "DOCUMENTO SINTÉTICO DE QA - SIN VALIDEZ",
        "AGENCIA TRIBUTARIA",
        "sede.agenciatributaria.gob.es",
        "PROVIDENCIA DE APREMIO",
        "Clave de liquidación",
        "LQ-SYNTH-CHAIN-2026-001",
        "Referencia del documento",
        "APR-SYNTH-CHAIN-2026-001",
        "Número de expediente",
        "EXP-SYNTH-CHAIN-2026-001",
        "Fecha de emisión",
        "05/02/2026",
        "Fecha de firma",
        "06/02/2026",
        "Fecha de finalización del período voluntario",
        "28/02/2026",
        "Principal pendiente 100,00 EUR",
        "Recargo de apremio ordinario (20 %) 20,00 EUR",
        "Ingreso a cuenta 0,00 EUR",
        "Importe total 120,00 EUR",
      ]),
    );
    const seizure = await analyzeFiscalNotificationDocumentInput(
      stackedDocumentInput("document:synthetic-seizure-e2e", [
        "DOCUMENTO SINTÉTICO DE QA - SIN VALIDEZ",
        "AGENCIA TRIBUTARIA",
        "sede.agenciatributaria.gob.es",
        "DILIGENCIA DE EMBARGO DE CUENTAS BANCARIAS",
        "Número de diligencia EMB-SYNTH-CHAIN-2026-002",
        "Número de expediente EXP-SYNTH-CHAIN-2026-001",
        "Clave de deuda DEBT-SYNTH-CHAIN-2026-001",
        "Clave de liquidación LQ-SYNTH-CHAIN-2026-001",
        "Referencia de la providencia APR-SYNTH-CHAIN-2026-001",
        "Fecha de emisión 03/03/2026",
        "Fecha del embargo 04/03/2026",
        "Plazo de contestación 12/03/2026",
        "Principal 100,00 EUR",
        "Recargo de apremio 20,00 EUR",
        "Intereses de demora 3,00 EUR",
        "Costas 1,00 EUR",
        "Total pendiente 124,00 EUR",
        "Importe a embargar 124,00 EUR",
        "Instrucciones Contestar por la sede electrónica",
      ]),
    );

    const firstSave = saveReview({
      expected: structuredClone(EMPTY_DATA),
      reviewId: "review:00000000-0000-4000-8000-000000000624",
      createdAt: "2026-07-16T10:00:00.000Z",
      analysis: localAnalysis(enforcement, "c".repeat(64)),
    });
    const secondSave = saveReview({
      expected: firstSave,
      reviewId: "review:00000000-0000-4000-8000-000000000625",
      createdAt: "2026-07-16T10:05:00.000Z",
      analysis: localAnalysis(seizure, "d".repeat(64)),
    });
    const workspace = secondSave.fiscalNotificationsWorkspace;
    expect(workspace).toBeDefined();
    if (!workspace) return;
    expect(workspace.ownerScope).toBe(OWNER_SCOPE);
    expect(workspace.documents).toHaveLength(2);
    expect(workspace.relations.length).toBeGreaterThan(0);
    expect(
      workspace.relations.every(
        (relation) =>
          relation.evidence.matchingReferenceTypes.length > 0 &&
          relation.evidence.matchingAmountTypes.length === 0,
      ),
    ).toBe(true);

    const history = projectFiscalNotificationStructuredHistoryV1(
      structuredClone(workspace),
      OWNER_SCOPE,
    );
    expect(history.status).toBe("READY");
    if (history.status !== "READY") return;
    expect(
      history.entries
        .map(({ title, documentDate }) => [title, documentDate] as const)
        .sort((left, right) => (left[1] ?? "").localeCompare(right[1] ?? "")),
    )
      .toEqual([
        ["Providencia de apremio", "2026-02-05"],
        ["Diligencia de embargo de cuenta bancaria", "2026-03-03"],
      ]);
    const visibleExplanation = history.entries
      .flatMap((entry) => entry.explanation.keyFacts)
      .map((fact) => fact.value)
      .join("\n");
    expect(visibleExplanation).not.toMatch(
      /LIQUIDATION_KEY|EXPEDIENTE_ID|ISSUE_DATE|OUTSTANDING_PRINCIPAL|EXECUTIVE_SURCHARGE|SUM_OF_PRINTED_AMOUNTS/u,
    );
    const visibleOrderedFacts = history.entries
      .flatMap((entry) => entry.orderedFacts)
      .map(({ value }) => value)
      .join("\n");
    expect(visibleOrderedFacts).toContain("Consta en el documento");
    expect(visibleOrderedFacts).not.toMatch(
      /SEIZURE_INSTRUCTIONS|LIQUIDATION_KEY|EXPEDIENTE_ID|OUTSTANDING_PRINCIPAL/u,
    );
    expect(
      history.entries.flatMap((entry) => entry.orderedFacts),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          semantic: "DETAIL",
          label: "Instrucciones",
          value: "Consta en el documento",
          pageNumber: 1,
        }),
      ]),
    );

    const seizureDocument = workspace.documents.find(
      ({ documentSubtype }) => documentSubtype === "seizure.bank_account",
    );
    const enforcementDocument = workspace.documents.find(
      ({ documentSubtype }) =>
        documentSubtype === "collection.enforcement_order",
    );
    expect(seizureDocument).toBeDefined();
    expect(enforcementDocument).toBeDefined();
    if (!seizureDocument || !enforcementDocument) return;
    const deletion = deleteFiscalNotificationDocumentV1({
      workspace,
      ownerScope: OWNER_SCOPE,
      documentId: seizureDocument.id,
      deletedAt: "2026-07-16T10:10:00.000Z",
    });
    expect(deletion.status).toBe("APPLIED");
    if (deletion.status !== "APPLIED") return;
    expect(deletion.workspace.ownerScope).toBe(OWNER_SCOPE);
    expect(deletion.workspace.documents.map(({ id }) => id)).toEqual([
      enforcementDocument.id,
    ]);
    expect(
      deletion.workspace.references.every(
        ({ documentId }) => documentId === enforcementDocument.id,
      ),
    ).toBe(true);
    expect(
      deletion.workspace.evidence.every(
        ({ documentId }) => documentId === enforcementDocument.id,
      ),
    ).toBe(true);
    expect(deletion.workspace.relations).toEqual([]);
    const reopenedAfterDelete = projectFiscalNotificationStructuredHistoryV1(
      structuredClone(deletion.workspace),
      OWNER_SCOPE,
    );
    expect(reopenedAfterDelete.status).toBe("READY");
    if (reopenedAfterDelete.status !== "READY") return;
    expect(reopenedAfterDelete.entries).toEqual([
      expect.objectContaining({
        key: enforcementDocument.id,
        title: "Providencia de apremio",
        documentDate: "2026-02-05",
      }),
    ]);
  });
});
