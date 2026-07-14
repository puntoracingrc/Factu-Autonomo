import { describe, expect, it, vi } from "vitest";
import { commitAppDataDurably } from "../app-data-durability";
import { EMPTY_DATA, type AppData } from "../types";
import { extractAeatDeferralGrantFactsV1 } from "./aeat-deferral-grant-facts.v1";
import { extractAeatEnforcementExplicitFieldsV2 } from "./aeat-enforcement-explicit-fields.v2";
import { extractAeatEnforcementMoneyFacts } from "./aeat-enforcement-money-facts";
import { extractAeatEnforcementPartyFactsV1 } from "./aeat-enforcement-party-facts.v1";
import { extractAeatOffsetAgreementFactsV1 } from "./aeat-offset-agreement-facts.v1";
import { extractFiscalNotificationCandidates } from "./extraction-dispatcher";
import type { BoundedDocumentInput } from "./input-contract";
import type {
  FiscalNotificationLocalAnalysisResult,
  FiscalNotificationLocalReviewResult,
} from "./local-review-flow";
import { runSaveFiscalNotificationStructuredReviewCommandV1 } from "./structured-review-save-command.v1";

const OWNER = "user:00000000-0000-4000-8000-000000000071";
const FOREIGN_OWNER = "user:00000000-0000-4000-8000-000000000072";
const REVIEW_ID = "review:00000000-0000-4000-8000-000000000073";
const CREATED_AT = "2026-07-14T10:00:00.000Z";
const HASH = "b".repeat(64);

const DEFERRAL_TEXT = [
  "AGENCIA TRIBUTARIA",
  "sede.agenciatributaria.gob.es",
  "CONCESION DEL APLAZAMIENTO O FRACCIONAMIENTO",
  "IDENTIFICACION DEL DOCUMENTO",
  "N.I.F.: X0000000X",
  "Nombre: PERSONA SINTETICA",
  "Numero de expediente: EXP-SAVE-071",
  "ANEXO I: DEUDAS Y PLAZOS DE LA NOTIFICACION",
  "Clave Liquidacion: L-SAVE-071",
  "Concepto: IRPF SINTETICO",
  "Fecha de Interes: 01-01-2026",
  "1.000,00 0,00 1.000,00 50,00 1.050,00 20-02-2026",
  "ANEXO II",
  "CALCULO DE INTERESES",
].join("\n");

const DOCUMENT_TEXT = [
  "AGENCIA TRIBUTARIA",
  "sede.agenciatributaria.gob.es",
  "PROVIDENCIA DE APREMIO",
  "IDENTIFICACION DEL DOCUMENTO",
  "IMPORTE DE LA DEUDA",
  "Principal pendiente: 1.234,56 EUR",
  "Recargo de apremio ordinario (20 %): 246,91 EUR",
  "Importe total: 1.481,47 EUR",
  "IDENTIFICACION DEL OBLIGADO AL PAGO",
  "NOMBRE O RAZON SOCIAL: PERSONA SINTETICA",
  "NIF: 12345678Z",
  "Clave de liquidación: LQ-SYNTH-071",
  "Código Seguro de Verificación (CSV): CSV-SYNTH-071",
  "Fecha de emisión: 05/02/2026",
].join("\n");

const OFFSET_TEXT = [
  "AGENCIA TRIBUTARIA",
  "www.agenciatributaria.es",
  "ACUERDO DE COMPENSACIÓN A INSTANCIA DEL OBLIGADO AL PAGO",
  "ANEXO I",
  "CRÉDITO Y DEUDAS",
  "NÚMERO DE ACUERDO DE COMPENSACIÓN: ACUERDO-SAVE-071",
  "CRÉDITO:",
  "CREDITO-SAVE-071 DEVOLUCIÓN SINTÉTICA 10/01/2026 1.000,00 20,00 1.020,00 900,00",
  "DEUDA:",
  "VENCIMIENTO: DEUDA-SAVE-071 MODELO SINTÉTICO",
  "10/01/2026 800,00 80,00 20,00 0,00 900,00 900,00 0,00 ( 1)",
  "ANEXO II",
  "DETALLE DE EFECTOS",
  "(1) EFECTOS DE LA COMPENSACIÓN",
  "EL IMPORTE DE LA DEUDA QUE FIGURA EN LA COLUMNA TOTAL PENDIENTE ANTES DE COMPENSAR HA QUEDADO EXTINGUIDO EN PERIODO VOLUNTARIO DE INGRESO.",
].join("\n");

function documentInput(): BoundedDocumentInput {
  return Object.freeze({
    ownerScope: OWNER,
    documentId: "notification-review:synthetic-save",
    pages: Object.freeze([
      Object.freeze({
        pageNumber: 1,
        text: DOCUMENT_TEXT,
        isBlank: false,
      }),
    ]),
  });
}

function analysis(): FiscalNotificationLocalAnalysisResult {
  const input = documentInput();
  const extraction = extractFiscalNotificationCandidates(input);
  const technicalReview: FiscalNotificationLocalReviewResult = Object.freeze({
    schemaVersion: 1,
    flowVersion: "1.0.0",
    status: extraction.status,
    reason: extraction.reason,
    engineId: extraction.engineId,
    engineVersion: extraction.engineVersion,
    pageCount: 1,
    byteLength: 4_096,
    sha256: HASH,
    candidates: Object.freeze(
      extraction.candidates.map((candidate) =>
        Object.freeze({
          familyId: candidate.familyId,
          ...(candidate.recognitionPolicyVersion
            ? { recognitionPolicyVersion: candidate.recognitionPolicyVersion }
            : {}),
          ...(candidate.segmentationVersion
            ? { segmentationVersion: candidate.segmentationVersion }
            : {}),
          documentType: candidate.documentType,
          authoritySignal: candidate.authoritySignal,
          handlerId: candidate.handlerId,
          handlerVersion: candidate.handlerVersion,
          signalStatus: candidate.signalStatus,
          matchedAnchors: candidate.matchedAnchors.map((anchor) => ({
            anchorId: anchor.anchorId,
            pageNumbers: [...anchor.pageNumbers],
          })),
          missingRequiredAnchorIds: [...candidate.missingRequiredAnchorIds],
          conflictingAnchorIds: [...candidate.conflictingAnchorIds],
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
  return Object.freeze({
    schemaVersion: 6,
    analysisVersion: "6.0.0",
    technicalReview,
    ephemeralEnforcementMoneyFacts: extractAeatEnforcementMoneyFacts(input),
    ephemeralEnforcementExplicitFields:
      extractAeatEnforcementExplicitFieldsV2(input),
    ephemeralEnforcementPartyFacts: extractAeatEnforcementPartyFactsV1(input),
    ephemeralDeferralGrantFacts: null,
    ephemeralOffsetAgreementFacts: null,
    sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
  });
}

function analysisWithHash(sha256: string): FiscalNotificationLocalAnalysisResult {
  const value = analysis();
  return Object.freeze({
    ...value,
    technicalReview: Object.freeze({
      ...value.technicalReview,
      sha256,
    }),
  });
}

function deferralAnalysis(): FiscalNotificationLocalAnalysisResult {
  const input: BoundedDocumentInput = Object.freeze({
    ownerScope: OWNER,
    documentId: "notification-review:synthetic-deferral-save",
    pages: Object.freeze([
      Object.freeze({ pageNumber: 1, text: DEFERRAL_TEXT, isBlank: false }),
    ]),
  });
  const extraction = extractFiscalNotificationCandidates(input);
  const technicalReview: FiscalNotificationLocalReviewResult = Object.freeze({
    schemaVersion: 1,
    flowVersion: "1.0.0",
    status: extraction.status,
    reason: extraction.reason,
    engineId: extraction.engineId,
    engineVersion: extraction.engineVersion,
    pageCount: 1,
    byteLength: 4_096,
    sha256: "e".repeat(64),
    candidates: Object.freeze(
      extraction.candidates.map((candidate) =>
        Object.freeze({
          familyId: candidate.familyId,
          ...(candidate.recognitionPolicyVersion
            ? { recognitionPolicyVersion: candidate.recognitionPolicyVersion }
            : {}),
          ...(candidate.segmentationVersion
            ? { segmentationVersion: candidate.segmentationVersion }
            : {}),
          documentType: candidate.documentType,
          authoritySignal: candidate.authoritySignal,
          handlerId: candidate.handlerId,
          handlerVersion: candidate.handlerVersion,
          signalStatus: candidate.signalStatus,
          matchedAnchors: candidate.matchedAnchors.map((anchor) => ({
            anchorId: anchor.anchorId,
            pageNumbers: [...anchor.pageNumbers],
          })),
          missingRequiredAnchorIds: [...candidate.missingRequiredAnchorIds],
          conflictingAnchorIds: [...candidate.conflictingAnchorIds],
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
  return Object.freeze({
    schemaVersion: 6,
    analysisVersion: "6.0.0",
    technicalReview,
    ephemeralEnforcementMoneyFacts: null,
    ephemeralEnforcementExplicitFields: null,
    ephemeralEnforcementPartyFacts: null,
    ephemeralDeferralGrantFacts: extractAeatDeferralGrantFactsV1(input),
    ephemeralOffsetAgreementFacts: null,
    sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
  });
}

function offsetAnalysis(): FiscalNotificationLocalAnalysisResult {
  const input: BoundedDocumentInput = Object.freeze({
    ownerScope: OWNER,
    documentId: "notification-review:synthetic-offset-save",
    pages: Object.freeze([
      Object.freeze({ pageNumber: 1, text: OFFSET_TEXT, isBlank: false }),
    ]),
  });
  const extraction = extractFiscalNotificationCandidates(input);
  const technicalReview: FiscalNotificationLocalReviewResult = Object.freeze({
    schemaVersion: 1,
    flowVersion: "1.0.0",
    status: extraction.status,
    reason: extraction.reason,
    engineId: extraction.engineId,
    engineVersion: extraction.engineVersion,
    pageCount: 1,
    byteLength: 4_096,
    sha256: "a".repeat(64),
    candidates: Object.freeze(
      extraction.candidates.map((candidate) =>
        Object.freeze({
          familyId: candidate.familyId,
          ...(candidate.recognitionPolicyVersion
            ? { recognitionPolicyVersion: candidate.recognitionPolicyVersion }
            : {}),
          ...(candidate.segmentationVersion
            ? { segmentationVersion: candidate.segmentationVersion }
            : {}),
          documentType: candidate.documentType,
          authoritySignal: candidate.authoritySignal,
          handlerId: candidate.handlerId,
          handlerVersion: candidate.handlerVersion,
          signalStatus: candidate.signalStatus,
          matchedAnchors: candidate.matchedAnchors.map((anchor) => ({
            anchorId: anchor.anchorId,
            pageNumbers: [...anchor.pageNumbers],
          })),
          missingRequiredAnchorIds: [...candidate.missingRequiredAnchorIds],
          conflictingAnchorIds: [...candidate.conflictingAnchorIds],
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
  return Object.freeze({
    schemaVersion: 6,
    analysisVersion: "6.0.0",
    technicalReview,
    ephemeralEnforcementMoneyFacts: null,
    ephemeralEnforcementExplicitFields: null,
    ephemeralEnforcementPartyFacts: null,
    ephemeralDeferralGrantFacts: null,
    ephemeralOffsetAgreementFacts: extractAeatOffsetAgreementFactsV1(input),
    sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
  });
}

function commandInput(options?: {
  expected?: AppData;
  ownerScope?: string;
  current?: AppData;
  persistStatus?: "applied" | "blocked" | "indeterminate";
}) {
  const expected = options?.expected ?? structuredClone(EMPTY_DATA);
  const current = options?.current ?? expected;
  const persist = vi.fn(() =>
    options?.persistStatus === "blocked"
      ? ({ status: "blocked", reason: "write_failed" } as const)
      : options?.persistStatus === "indeterminate"
        ? ({ status: "indeterminate", reason: "storage_state_unknown" } as const)
        : ({ status: "applied" } as const),
  );
  const commit = <T>(
    baseline: AppData,
    build: (previous: AppData) => { data: AppData; value: T },
  ) =>
    commitAppDataDurably({
      expected: baseline,
      getCurrent: () => current,
      build,
      persist,
    });
  return {
    persist,
    value: {
      expected,
      ownerScope: options?.ownerScope ?? OWNER,
      reviewId: REVIEW_ID,
      createdAt: CREATED_AT,
      analysis: analysis(),
      commit,
    },
  };
}

describe("structured fiscal notification save command v1", () => {
  it("guarda una única transición durable con los hechos exactos", () => {
    const input = commandInput();
    const before = structuredClone(input.value.expected);

    const result = runSaveFiscalNotificationStructuredReviewCommandV1(
      input.value,
    );

    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;
    expect(result.replayed).toBe(false);
    expect(result.value.status).toBe("APPLIED");
    expect(result.data.fiscalNotificationsWorkspace?.documents[0]).toMatchObject({
      titleRaw: "Providencia de apremio AEAT",
      subjectParty: {
        displayName: "PERSONA SINTETICA",
        taxIdNormalized: "12345678Z",
      },
    });
    expect(
      result.data.fiscalNotificationsWorkspace?.analysisSnapshots[0]?.structuredData
        .administrativeDomain?.moneyFacts,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "OUTSTANDING_PRINCIPAL",
          amountCents: 123_456,
        }),
      ]),
    );
    expect(input.persist).toHaveBeenCalledTimes(1);
    expect(input.value.expected).toEqual(before);
    expect(JSON.stringify(result.data)).not.toContain(DOCUMENT_TEXT);
  });

  it("guarda las cuotas de una concesión como datos consultables, no como plan activo", () => {
    const input = commandInput();
    const result = runSaveFiscalNotificationStructuredReviewCommandV1({
      ...input.value,
      analysis: deferralAnalysis(),
    });

    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;
    const workspace = result.data.fiscalNotificationsWorkspace;
    expect(workspace?.documents[0]).toMatchObject({
      documentType: "AEAT_INSTALLMENT_OR_DEFERRAL_GRANT",
      titleRaw: "Concesión de aplazamiento o fraccionamiento AEAT",
    });
    expect(workspace?.paymentOptions).toEqual([
      expect.objectContaining({
        totalCents: 105_000,
        deadline: "2026-02-20",
        deadlineStatus: "DOCUMENT_STATED",
      }),
    ]);
    expect(workspace?.paymentPlans).toEqual([]);
    expect(workspace?.installments).toEqual([]);
    expect(workspace?.debts).toEqual([]);
    expect(workspace?.accountingDrafts).toEqual([]);
    expect(input.persist).toHaveBeenCalledTimes(1);
  });

  it("guarda créditos y deudas compensadas como datos consultables, sin efectos operativos", () => {
    const input = commandInput();
    const result = runSaveFiscalNotificationStructuredReviewCommandV1({
      ...input.value,
      analysis: offsetAnalysis(),
    });

    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;
    const workspace = result.data.fiscalNotificationsWorkspace;
    expect(workspace?.documents[0]).toMatchObject({
      documentType: "AEAT_OFFSET_AGREEMENT",
      titleRaw: "Acuerdo de compensación solicitado AEAT",
      debtIds: [],
    });
    expect(
      workspace?.analysisSnapshots[0]?.structuredData.administrativeDomain
        ?.moneyFacts,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "CREDIT_TOTAL", amountCents: 102_000 }),
        expect.objectContaining({ kind: "TOTAL_BEFORE_OFFSET", amountCents: 90_000 }),
        expect.objectContaining({ kind: "REMAINING_AFTER_OFFSET", amountCents: 0 }),
      ]),
    );
    expect(workspace?.debts).toEqual([]);
    expect(workspace?.paymentPlans).toEqual([]);
    expect(workspace?.obligations).toEqual([]);
    expect(workspace?.accountingDrafts).toEqual([]);
    expect(input.persist).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(result.data)).not.toContain(OFFSET_TEXT);
  });

  it("bloquea una precondición obsoleta sin escribir", () => {
    const expected = structuredClone(EMPTY_DATA);
    const input = commandInput({
      expected,
      current: { ...expected, customers: [{ id: "changed" }] as never },
    });

    expect(runSaveFiscalNotificationStructuredReviewCommandV1(input.value)).toEqual({
      status: "blocked",
      reason: "stale_precondition",
    });
    expect(input.persist).not.toHaveBeenCalled();
  });

  it("propaga un estado de almacenamiento indeterminado sin afirmar guardado", () => {
    const input = commandInput({ persistStatus: "indeterminate" });

    expect(runSaveFiscalNotificationStructuredReviewCommandV1(input.value)).toEqual({
      status: "indeterminate",
      reason: "storage_state_unknown",
    });
  });

  it("rechaza un owner distinto del workspace existente", () => {
    const first = commandInput();
    const applied = runSaveFiscalNotificationStructuredReviewCommandV1(
      first.value,
    );
    expect(applied.status).toBe("applied");
    if (applied.status !== "applied") return;
    const foreign = commandInput({
      expected: applied.data,
      ownerScope: FOREIGN_OWNER,
    });

    expect(runSaveFiscalNotificationStructuredReviewCommandV1(foreign.value)).toEqual({
      status: "blocked",
      reason: "invalid_structured_review",
    });
    expect(foreign.persist).not.toHaveBeenCalled();
  });

  it("deduplica por huella sin una segunda escritura", () => {
    const first = commandInput();
    const applied = runSaveFiscalNotificationStructuredReviewCommandV1(
      first.value,
    );
    expect(applied.status).toBe("applied");
    if (applied.status !== "applied") return;
    const replay = commandInput({ expected: applied.data });

    const result = runSaveFiscalNotificationStructuredReviewCommandV1({
      ...replay.value,
      reviewId: "review:00000000-0000-4000-8000-000000000074",
      createdAt: "2026-07-14T10:01:00.000Z",
    });

    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;
    expect(result.replayed).toBe(true);
    expect(result.value.status).toBe("EXISTING");
    expect(result.data).toBe(applied.data);
    expect(replay.persist).not.toHaveBeenCalled();
  });

  it("guarda como sugerencia la referencia exacta compartida por dos fichas", () => {
    const first = commandInput();
    const firstResult = runSaveFiscalNotificationStructuredReviewCommandV1(
      first.value,
    );
    expect(firstResult.status).toBe("applied");
    if (firstResult.status !== "applied") return;

    const second = commandInput({ expected: firstResult.data });
    const secondResult = runSaveFiscalNotificationStructuredReviewCommandV1({
      ...second.value,
      reviewId: "review:00000000-0000-4000-8000-000000000075",
      createdAt: "2026-07-14T10:02:00.000Z",
      analysis: analysisWithHash("c".repeat(64)),
    });

    expect(secondResult.status).toBe("applied");
    if (secondResult.status !== "applied") return;
    expect(second.persist).toHaveBeenCalledTimes(1);
    expect(secondResult.data.fiscalNotificationsWorkspace?.documents).toHaveLength(
      2,
    );
    expect(secondResult.data.fiscalNotificationsWorkspace?.relations).toEqual([
      expect.objectContaining({
        relationType: "POSSIBLY_RELATED",
        status: "SUGGESTED",
        confidenceBand: "HIGH",
        evidence: expect.objectContaining({
          matchingReferenceTypes: ["CSV", "LIQUIDATION_KEY"],
        }),
      }),
    ]);
  });

  it("no guarda una clasificación sin hechos estructurados exactos", () => {
    const input = commandInput();
    const emptyAnalysis: FiscalNotificationLocalAnalysisResult = {
      ...input.value.analysis,
      ephemeralEnforcementMoneyFacts: null,
      ephemeralEnforcementExplicitFields: null,
      ephemeralEnforcementPartyFacts: null,
    };

    expect(
      runSaveFiscalNotificationStructuredReviewCommandV1({
        ...input.value,
        analysis: emptyAnalysis,
      }),
    ).toEqual({ status: "blocked", reason: "no_structured_facts" });
    expect(input.persist).not.toHaveBeenCalled();
  });
});
