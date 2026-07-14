import { describe, expect, it } from "vitest";
import { extractAeatDeferralGrantFactsV1 } from "./aeat-deferral-grant-facts.v1";
import { extractFiscalNotificationCandidates } from "./extraction-dispatcher";
import type { BoundedDocumentInput } from "./input-contract";
import type {
  FiscalNotificationLocalAnalysisResult,
  FiscalNotificationLocalReviewResult,
} from "./local-review-flow";
import {
  appendAeatDeferralStructuredReviewV1,
  FiscalNotificationStructuredReviewV1Error,
} from "./structured-review-workspace.v1";
import { validateFiscalNotificationsWorkspaceIntegrity } from "./workspace-integrity";

const OWNER = "user:00000000-0000-4000-8000-000000000091";
const REVIEW_ID = "review:00000000-0000-4000-8000-000000000092";
const CREATED_AT = "2026-07-14T12:00:00.000Z";
const HASH = "d".repeat(64);
const PRIVATE_NAME = "PERSONA SINTÉTICA DE PRUEBA";

const PRIMARY_PAGE = [
  "Agencia Tributaria",
  "sede.agenciatributaria.gob.es",
  "CONCESIÓN DEL APLAZAMIENTO O FRACCIONAMIENTO DE PAGO SIN GARANTÍA",
  "IDENTIFICACIÓN DEL DOCUMENTO",
  "N.I.F.: X0000000X",
  `Nombre: ${PRIVATE_NAME}`,
  "Número de expediente: EXP-SYN-091",
  "ACUERDO",
  "Se concede el aplazamiento por el importe de 1.050,00 euros.",
  "PLAZO Y FORMAS DE PAGO",
  "El ingreso se realizará en la cuenta ES00 0000 0000 0000 0000 0000.",
].join("\n");

const ANNEX_PAGE = [
  "ANEXO I: DEUDAS Y PLAZOS DE LA NOTIFICACIÓN",
  "Clave Liquidación: L-SYN-091",
  "Concepto: IRPF SINTÉTICO",
  "Fecha de Interés: 01-01-2026",
  "Importe principal Recargo de apremio Importe total deuda Importe de los intereses Importe total del plazo Fecha de vencimiento",
  "1.000,00 0,00 1.000,00 50,00 1.050,00 20-02-2026",
  "ANEXO II: LIQUIDACIÓN DE INTERESES DE DEMORA",
  "CÁLCULO DE INTERESES",
].join("\n");

function source(annexPage = ANNEX_PAGE): BoundedDocumentInput {
  return Object.freeze({
    ownerScope: OWNER,
    documentId: "notification-review:synthetic-deferral",
    pages: Object.freeze(
      [PRIMARY_PAGE, annexPage].map((text, index) =>
        Object.freeze({ pageNumber: index + 1, text, isBlank: false }),
      ),
    ),
  });
}

function technicalReview(
  input: BoundedDocumentInput,
): FiscalNotificationLocalReviewResult {
  const extraction = extractFiscalNotificationCandidates(input);
  return Object.freeze({
    schemaVersion: 1,
    flowVersion: "1.0.0",
    status: extraction.status,
    reason: extraction.reason,
    engineId: extraction.engineId,
    engineVersion: extraction.engineVersion,
    pageCount: input.pages.length,
    byteLength: 8_192,
    sha256: HASH,
    candidates: Object.freeze(
      extraction.candidates.map((candidate) =>
        Object.freeze({
          familyId: candidate.familyId,
          recognitionPolicyVersion: candidate.recognitionPolicyVersion,
          segmentationVersion: candidate.segmentationVersion,
          documentType: candidate.documentType,
          authoritySignal: candidate.authoritySignal,
          handlerId: candidate.handlerId,
          handlerVersion: candidate.handlerVersion,
          signalStatus: candidate.signalStatus,
          matchedAnchors: Object.freeze(
            candidate.matchedAnchors.map((anchor) =>
              Object.freeze({
                anchorId: anchor.anchorId,
                pageNumbers: Object.freeze([...anchor.pageNumbers]),
              }),
            ),
          ),
          missingRequiredAnchorIds: Object.freeze([
            ...candidate.missingRequiredAnchorIds,
          ]),
          conflictingAnchorIds: Object.freeze([
            ...candidate.conflictingAnchorIds,
          ]),
          requiresHumanReview: true as const,
        }),
      ),
    ),
    selectedFamilyId: null,
    providerCalled: false,
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    retainedSourceContent: "NONE",
  });
}

function analysis(
  input: BoundedDocumentInput = source(),
): FiscalNotificationLocalAnalysisResult {
  return Object.freeze({
    schemaVersion: 5,
    analysisVersion: "5.0.0",
    technicalReview: technicalReview(input),
    ephemeralEnforcementMoneyFacts: null,
    ephemeralEnforcementExplicitFields: null,
    ephemeralEnforcementPartyFacts: null,
    ephemeralDeferralGrantFacts: extractAeatDeferralGrantFactsV1(input),
    sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
  });
}

function mutable<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe("structured deferral review workspace v1", () => {
  it("persists every printed installment and reference without activating a plan", () => {
    const input = {
      ownerScope: OWNER,
      reviewId: REVIEW_ID,
      createdAt: CREATED_AT,
      workspace: null,
      analysis: analysis(),
    };
    const before = structuredClone(input);

    const result = appendAeatDeferralStructuredReviewV1(input);

    expect(result.status).toBe("APPLIED");
    expect(validateFiscalNotificationsWorkspaceIntegrity(result.workspace, OWNER)).toEqual({
      valid: true,
      issues: [],
    });
    expect(input).toEqual(before);
    expect(result.workspace.documents[0]).toMatchObject({
      documentType: "AEAT_INSTALLMENT_OR_DEFERRAL_GRANT",
      titleRaw: "Concesión de aplazamiento o fraccionamiento AEAT",
      subjectParty: {
        displayName: PRIVATE_NAME,
        taxIdNormalized: "X0000000X",
        matchesBusinessProfile: "UNKNOWN",
      },
      authenticityStatus: "NOT_CHECKED",
      humanReviewStatus: "PENDING",
    });
    expect(result.workspace.references).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          referenceType: "EXPEDIENT_NUMBER",
          rawValue: "EXP-SYN-091",
          confirmationStatus: "PENDING",
        }),
        expect.objectContaining({
          referenceType: "LIQUIDATION_KEY",
          rawValue: "L-SYN-091",
          confirmationStatus: "PENDING",
        }),
      ]),
    );
    expect(result.workspace.paymentOptions).toEqual([
      expect.objectContaining({
        title: "Cuota impresa 1 · liquidación 1",
        totalCents: 105_000,
        deadline: "2026-02-20",
        deadlineStatus: "DOCUMENT_STATED",
        components: [
          expect.objectContaining({ type: "PRINCIPAL", amountCents: 100_000 }),
          expect.objectContaining({ type: "OTHER", amountCents: 0 }),
          expect.objectContaining({ type: "INTEREST", amountCents: 5_000 }),
        ],
      }),
    ]);
    expect(
      result.workspace.analysisSnapshots[0]?.structuredData.unknownFields,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          labelRaw: "PRINTED_PAYMENT_ACCOUNT",
          valueRaw: "ES00 0000 0000 0000 0000 0000",
        }),
        expect.objectContaining({
          labelRaw: "PRINTED_DEBT_CONCEPT",
          valueRaw: "IRPF SINTÉTICO",
        }),
        expect.objectContaining({
          labelRaw: "PRINTED_INTEREST_START_DATE",
          valueRaw: "01-01-2026",
        }),
      ]),
    );
    expect(
      result.workspace.analysisSnapshots[0]?.structuredData.administrativeDomain,
    ).toMatchObject({
      status: "REVIEW_REQUIRED",
      roleAssertions: [],
      missingFieldIds: expect.not.arrayContaining(["subject.identification"]),
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    });
    expect(result.workspace.paymentPlans).toEqual([]);
    expect(result.workspace.installments).toEqual([]);
    expect(result.workspace.debts).toEqual([]);
    expect(result.workspace.deadlineRules).toEqual([]);
    expect(result.workspace.obligations).toEqual([]);
    expect(result.workspace.accountingDrafts).toEqual([]);
    expect(JSON.stringify(result)).not.toContain(PRIMARY_PAGE);
    expect(Object.isFrozen(result.workspace.paymentOptions)).toBe(true);
  });

  it("deduplicates by source hash and rejects a foreign owner", () => {
    const first = appendAeatDeferralStructuredReviewV1({
      ownerScope: OWNER,
      reviewId: REVIEW_ID,
      createdAt: CREATED_AT,
      workspace: null,
      analysis: analysis(),
    });
    const replay = appendAeatDeferralStructuredReviewV1({
      ownerScope: OWNER,
      reviewId: "review:00000000-0000-4000-8000-000000000093",
      createdAt: "2026-07-14T12:01:00.000Z",
      workspace: first.workspace,
      analysis: analysis(),
    });
    expect(replay.status).toBe("EXISTING");
    expect(replay.workspace.revision).toBe(1);

    expect(() =>
      appendAeatDeferralStructuredReviewV1({
        ownerScope: "user:00000000-0000-4000-8000-000000000099",
        reviewId: "review:00000000-0000-4000-8000-000000000094",
        createdAt: "2026-07-14T12:02:00.000Z",
        workspace: first.workspace,
        analysis: analysis(),
      }),
    ).toThrow(FiscalNotificationStructuredReviewV1Error);
  });

  it("preserves discrepant printed values as review data without correcting them", () => {
    const input = source(
      ANNEX_PAGE.replace(
        "1.000,00 0,00 1.000,00 50,00 1.050,00",
        "1.000,00 0,00 999,99 50,00 1.100,00",
      ),
    );
    const result = appendAeatDeferralStructuredReviewV1({
      ownerScope: OWNER,
      reviewId: "review:00000000-0000-4000-8000-000000000095",
      createdAt: "2026-07-14T12:03:00.000Z",
      workspace: null,
      analysis: analysis(input),
    });

    expect(result.workspace.paymentOptions[0]).toMatchObject({
      totalCents: 110_000,
      components: [
        { type: "PRINCIPAL", amountCents: 100_000 },
        { type: "OTHER", amountCents: 0 },
        { type: "INTEREST", amountCents: 5_000 },
      ],
    });
    expect(
      result.workspace.analysisSnapshots[0]?.structuredData.validationCodes,
    ).toContain("PRINTED_VALUES_REQUIRE_REVIEW");
    expect(result.workspace.paymentPlans).toEqual([]);
  });

  it("fails closed for unknown keys and information without installments", () => {
    const poisoned = mutable(analysis()) as unknown as Record<string, unknown>;
    const deferral = poisoned.ephemeralDeferralGrantFacts as Record<
      string,
      unknown
    >;
    deferral.rawText = "PRIVATE_UNKNOWN_VALUE";
    expect(() =>
      appendAeatDeferralStructuredReviewV1({
        ownerScope: OWNER,
        reviewId: REVIEW_ID,
        createdAt: CREATED_AT,
        workspace: null,
        analysis: poisoned as unknown as FiscalNotificationLocalAnalysisResult,
      }),
    ).toThrow("FISCAL_NOTIFICATION_STRUCTURED_REVIEW_INVALID_INPUT");

    const empty = mutable(analysis()) as unknown as Record<string, unknown>;
    const facts = empty.ephemeralDeferralGrantFacts as Record<string, unknown>;
    facts.outcome = "INFORMATION_PENDING";
    facts.debtSchedules = [];
    facts.issues = [
      {
        code: "NO_INSTALLMENT_ROWS",
        pageNumbers: [],
        scheduleIndex: null,
        installmentIndex: null,
      },
    ];
    expect(() =>
      appendAeatDeferralStructuredReviewV1({
        ownerScope: OWNER,
        reviewId: REVIEW_ID,
        createdAt: CREATED_AT,
        workspace: null,
        analysis: empty as unknown as FiscalNotificationLocalAnalysisResult,
      }),
    ).toThrow("FISCAL_NOTIFICATION_STRUCTURED_REVIEW_NO_STRUCTURED_FACTS");
  });
});
