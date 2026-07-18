import { afterEach, describe, expect, it, vi } from "vitest";
import {
  commitAppDataDurably,
  commitAppDataDurablyWithStorageRecovery,
} from "../app-data-durability";
import { inspectPersistedData, loadData, saveData } from "../storage";
import { EMPTY_DATA, type AppData } from "../types";
import { extractAeatDeferralGrantFactsV1 } from "./aeat-deferral-grant-facts.v1";
import { extractAeatEnforcementExplicitFieldsV2 } from "./aeat-enforcement-explicit-fields.v2";
import { extractAeatEnforcementMoneyFacts } from "./aeat-enforcement-money-facts";
import { extractAeatEnforcementPartyFactsV1 } from "./aeat-enforcement-party-facts.v1";
import { extractAeatOffsetAgreementFactsV1 } from "./aeat-offset-agreement-facts.v1";
import { analyzeFiscalNotificationDocumentInput } from "./document-input-analysis";
import { analyzeFiscalNotificationVerticalSliceV1 } from "./extractor-core/vertical-slice-orchestrator.v1";
import { extractFiscalNotificationCandidates } from "./extraction-dispatcher";
import type { BoundedDocumentInput } from "./input-contract";
import type {
  FiscalNotificationLocalAnalysisResult,
  FiscalNotificationLocalReviewResult,
} from "./local-review-flow";
import { runSaveFiscalNotificationStructuredReviewCommandV1 } from "./structured-review-save-command.v1";
import { appendStructuredReviewRelationSuggestionsV1 } from "./structured-review-relation-suggestions.v1";
import { projectFiscalNotificationVerticalSliceReviewV1 } from "./vertical-slice-review.v1";
import { enrichVerticalSliceSpecializedFactsV1 } from "./vertical-slice-specialized-facts.v1";
import { appendWorkspaceGlobalReconciliationV8 } from "./workspace-global-reconciliation.v8";

const OWNER = "user:00000000-0000-4000-8000-000000000071";
const FOREIGN_OWNER = "user:00000000-0000-4000-8000-000000000072";
const REVIEW_ID = "review:00000000-0000-4000-8000-000000000073";
const CREATED_AT = "2026-07-14T10:00:00.000Z";
const HASH = "b".repeat(64);

afterEach(() => {
  vi.unstubAllGlobals();
});

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

const SEIZURE_TEXT = [
  "AGENCIA TRIBUTARIA",
  "sede.agenciatributaria.gob.es",
  "DILIGENCIA DE EMBARGO DE CUENTAS BANCARIAS",
  "Número de diligencia: EMB-SAVE-071",
  "Número de expediente: EXP-SAVE-071",
  "Clave de deuda: DEBT-SAVE-071",
  "Clave de liquidación: LQ-SYNTH-071",
  "Deudor: PERSONA DEUDORA SINTÉTICA",
  "NIF del deudor: 12345678Z",
  "Destinatario: BANCO SINTÉTICO",
  "NIF del destinatario: A12345674",
  "Entidad financiera: BANCO SINTÉTICO",
  "IBAN: ES00 0000 0000 0000 1234",
  "Principal: 1.234,56 EUR",
  "Límite del embargo: 1.481,47 EUR",
  "Importe retenido: 900,00 EUR",
  "Fecha del embargo: 04/03/2026",
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

function analysisWithHash(
  sha256: string,
): FiscalNotificationLocalAnalysisResult {
  const value = analysis();
  return Object.freeze({
    ...value,
    technicalReview: Object.freeze({
      ...value.technicalReview,
      sha256,
    }),
  });
}

async function seizureAnalysis(): Promise<FiscalNotificationLocalAnalysisResult> {
  const input: BoundedDocumentInput = Object.freeze({
    ownerScope: OWNER,
    documentId: "notification-review:synthetic-seizure-save",
    pages: Object.freeze([
      Object.freeze({ pageNumber: 1, text: SEIZURE_TEXT, isBlank: false }),
    ]),
  });
  const value = structuredClone(analysis()) as unknown as {
    technicalReview: FiscalNotificationLocalReviewResult;
    ephemeralEnforcementMoneyFacts: FiscalNotificationLocalAnalysisResult["ephemeralEnforcementMoneyFacts"];
    ephemeralEnforcementExplicitFields: FiscalNotificationLocalAnalysisResult["ephemeralEnforcementExplicitFields"];
    ephemeralEnforcementPartyFacts: FiscalNotificationLocalAnalysisResult["ephemeralEnforcementPartyFacts"];
    ephemeralVerticalSliceReview?: unknown;
  };
  value.technicalReview = Object.freeze({
    ...value.technicalReview,
    pageCount: 1,
    byteLength: 5_678,
    sha256: "d".repeat(64),
  });
  value.ephemeralEnforcementMoneyFacts = null;
  value.ephemeralEnforcementExplicitFields = null;
  value.ephemeralEnforcementPartyFacts = null;
  value.ephemeralVerticalSliceReview =
    projectFiscalNotificationVerticalSliceReviewV1(
      await analyzeFiscalNotificationVerticalSliceV1(input),
    );
  return Object.freeze(
    value,
  ) as unknown as FiscalNotificationLocalAnalysisResult;
}

async function realSixPageBankSeizureAnalysis(
  debtKey = "SYN-DEBT-D11",
): Promise<FiscalNotificationLocalAnalysisResult> {
  const pageTexts = [
    [
      "AGENCIA ESTATAL DE ADMINISTRACIÓN TRIBUTARIA",
      "NOTIFICACIÓN DE DILIGENCIA DE EMBARGO DE CUENTAS Y DEPÓSITOS",
      "Número de diligencia: SYN-SEIZURE-D11",
      "Fecha de la diligencia: 24-10-2025",
      "Se le notifica en condición de OBLIGADO AL PAGO",
    ].join("\n"),
    "Información sobre recursos y oposición",
    "Continuación de la diligencia",
    "",
    [
      "DEUDAS DEL EXPEDIENTE EJECUTIVO",
      "CONCEPTO | PER/EJER | Nº LIQUIDACIÓN | IMP. PENDIENTE",
      `IVA sintético | 4T/2024 | ${debtKey} | 276,00 EUR`,
      "IMPORTE PENDIENTE TOTAL: 276,00 EUR",
      "IMPORTE A EMBARGAR: 276,00 EUR",
      "DEPÓSITOS Y CUENTAS",
      "IDENTIFICADOR INTERNO | IMPORTE EMBARGADO",
      "ACTIVO-1 | 276,00 EUR",
      "IBAN ES0012345678901234567890",
      "Banco Privado Sintético",
    ].join("\n"),
    "",
  ];
  const input: BoundedDocumentInput = Object.freeze({
    ownerScope: OWNER,
    documentId: "notification-review:synthetic-seizure-save-v3-d11",
    pages: Object.freeze(
      pageTexts.map((text, index) =>
        Object.freeze({
          pageNumber: index + 1,
          text,
          isBlank: text.length === 0,
        }),
      ),
    ),
  });
  const analyzed = await analyzeFiscalNotificationDocumentInput(input);
  const value = structuredClone(analysis()) as unknown as {
    technicalReview: FiscalNotificationLocalReviewResult;
    ephemeralEnforcementMoneyFacts: FiscalNotificationLocalAnalysisResult["ephemeralEnforcementMoneyFacts"];
    ephemeralEnforcementExplicitFields: FiscalNotificationLocalAnalysisResult["ephemeralEnforcementExplicitFields"];
    ephemeralEnforcementPartyFacts: FiscalNotificationLocalAnalysisResult["ephemeralEnforcementPartyFacts"];
    ephemeralVerticalSliceReview?: unknown;
  };
  value.technicalReview = Object.freeze({
    ...value.technicalReview,
    pageCount: 6,
    byteLength: 8_192,
    sha256: "f".repeat(64),
  });
  value.ephemeralEnforcementMoneyFacts = null;
  value.ephemeralEnforcementExplicitFields = null;
  value.ephemeralEnforcementPartyFacts = null;
  value.ephemeralVerticalSliceReview = analyzed.verticalSliceReview;
  return Object.freeze(
    value,
  ) as unknown as FiscalNotificationLocalAnalysisResult;
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

async function verticalDeferralAnalysis(): Promise<FiscalNotificationLocalAnalysisResult> {
  const input: BoundedDocumentInput = Object.freeze({
    ownerScope: OWNER,
    documentId: "notification-review:synthetic-deferral-save-v2",
    pages: Object.freeze([
      Object.freeze({ pageNumber: 1, text: DEFERRAL_TEXT, isBlank: false }),
    ]),
  });
  const analyzed = await analyzeFiscalNotificationDocumentInput(input);
  const legacy = deferralAnalysis();
  return Object.freeze({
    ...legacy,
    ephemeralDeferralGrantFacts: analyzed.deferralGrantFacts ?? null,
    ephemeralVerticalSliceReview: analyzed.verticalSliceReview,
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
        ? ({
            status: "indeterminate",
            reason: "storage_state_unknown",
          } as const)
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

function withProductionSourceIdentity(
  value: FiscalNotificationLocalAnalysisResult,
  sourceSha256 = value.technicalReview.sha256,
): FiscalNotificationLocalAnalysisResult {
  const result = { ...value } as FiscalNotificationLocalAnalysisResult;
  Object.defineProperty(result, "sourceIdentity", {
    value: Object.freeze({
      fileId: "notification-file:00000000-0000-4000-8000-000000000074",
      documentId: "notification-document:00000000-0000-4000-8000-000000000075",
      sourceSha256,
    }),
    enumerable: false,
    writable: false,
    configurable: false,
  });
  return Object.freeze(result);
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
    expect(
      result.data.fiscalNotificationsWorkspace?.documents[0],
    ).toMatchObject({
      titleRaw: "Providencia de apremio AEAT",
      subjectParty: {
        displayName: "PERSONA SINTETICA",
        taxIdNormalized: "12345678Z",
      },
    });
    expect(
      result.data.fiscalNotificationsWorkspace?.analysisSnapshots[0]
        ?.structuredData.administrativeDomain?.moneyFacts,
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

  it("valida la identidad efímera de producción sin intentar persistirla", async () => {
    const input = commandInput();
    const analysisWithIdentity = withProductionSourceIdentity(
      await verticalDeferralAnalysis(),
    );

    const result = runSaveFiscalNotificationStructuredReviewCommandV1({
      ...input.value,
      analysis: analysisWithIdentity,
    });

    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;
    expect(input.persist).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(result.data)).not.toContain("notification-file:");
    expect(
      Object.getOwnPropertyDescriptor(analysisWithIdentity, "sourceIdentity"),
    ).toMatchObject({
      enumerable: false,
      writable: false,
      configurable: false,
    });
  });

  it("bloquea una identidad efímera que no corresponde al PDF analizado", async () => {
    const input = commandInput();
    const mismatched = withProductionSourceIdentity(
      await verticalDeferralAnalysis(),
      "a".repeat(64),
    );

    expect(
      runSaveFiscalNotificationStructuredReviewCommandV1({
        ...input.value,
        analysis: mismatched,
      }),
    ).toEqual({
      status: "blocked",
      stage: "CORE",
      safeCode: "CORE_INVALID_INPUT",
      warningCodes: [],
    });
    expect(input.persist).not.toHaveBeenCalled();
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

  it("enriquece la ficha V2 con sus cuotas en la misma transición durable", async () => {
    const input = commandInput();
    const result = runSaveFiscalNotificationStructuredReviewCommandV1({
      ...input.value,
      analysis: await verticalDeferralAnalysis(),
    });

    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;
    expect(result.replayed).toBe(false);
    expect(result.value.status).toBe("APPLIED");
    expect(result.data.fiscalNotificationsWorkspace?.documents).toEqual([
      expect.objectContaining({
        documentSubtype: "collection.deferral_grant",
      }),
    ]);
    expect(
      result.data.fiscalNotificationsWorkspace?.documents[0]?.subjectParty,
    ).toBeUndefined();
    expect(result.data.fiscalNotificationsWorkspace?.paymentOptions).toEqual([
      expect.objectContaining({
        title: "Cuota 1",
        totalCents: 105_000,
        deadline: "2026-02-20",
        deadlineStatus: "DOCUMENT_STATED",
      }),
    ]);
    expect(result.data.fiscalNotificationsWorkspace).toMatchObject({
      debts: [],
      paymentPlans: [],
      installments: [],
      deadlineRules: [],
      obligations: [],
      accountingDrafts: [],
    });
    expect(JSON.stringify(result.data)).not.toMatch(
      /PERSONA SINTETICA|X0000000X|IRPF SINTETICO|L-SAVE-071/iu,
    );
    expect(input.persist).toHaveBeenCalledTimes(1);
  });

  it("guarda el core validado cuando el enriquecimiento opcional necesita revisión", async () => {
    const input = commandInput();
    const result = runSaveFiscalNotificationStructuredReviewCommandV1(
      {
        ...input.value,
        analysis: await verticalDeferralAnalysis(),
      },
      {
        enrich: () => {
          throw new Error("SYNTHETIC_ENRICHMENT_REVIEW_REQUIRED");
        },
        relate: appendStructuredReviewRelationSuggestionsV1,
        reconcile: appendWorkspaceGlobalReconciliationV8,
      },
    );

    expect(result.status).toBe("applied_with_warnings");
    if (result.status !== "applied_with_warnings") return;
    expect(result).toMatchObject({
      stage: "ENRICHMENT",
      safeCode: "SPECIALIZED_ENRICHMENT_REVIEW_REQUIRED",
      warningCodes: ["SPECIALIZED_ENRICHMENT_SKIPPED"],
    });
    expect(result.data.fiscalNotificationsWorkspace?.documents).toHaveLength(1);
    expect(result.data.fiscalNotificationsWorkspace?.paymentOptions).toEqual(
      [],
    );
    expect(
      result.data.fiscalNotificationsWorkspace?.analysisSnapshots[0]
        ?.validationWarnings,
    ).toContain("SPECIALIZED_ENRICHMENT_SKIPPED");
    expect(input.persist).toHaveBeenCalledTimes(1);
  });

  it("guarda el core cuando una sugerencia de relación queda pendiente", async () => {
    const input = commandInput();
    const result = runSaveFiscalNotificationStructuredReviewCommandV1(
      {
        ...input.value,
        analysis: await verticalDeferralAnalysis(),
      },
      {
        enrich: enrichVerticalSliceSpecializedFactsV1,
        relate: ({ workspace }) => ({
          status: "REVIEW_REQUIRED" as const,
          reason: "RESULT_INVALID" as const,
          addedRelationIds: [] as const,
          workspace,
        }),
        reconcile: appendWorkspaceGlobalReconciliationV8,
      },
    );

    expect(result.status).toBe("applied_with_warnings");
    if (result.status !== "applied_with_warnings") return;
    expect(result).toMatchObject({
      stage: "RELATIONS",
      safeCode: "RELATION_SUGGESTION_REVIEW_REQUIRED",
      warningCodes: ["RELATION_RECONCILIATION_PENDING"],
    });
    expect(input.persist).toHaveBeenCalledTimes(1);
  });

  it("guarda el último workspace válido cuando la reconciliación global queda pendiente", async () => {
    const input = commandInput();
    const result = runSaveFiscalNotificationStructuredReviewCommandV1(
      {
        ...input.value,
        analysis: await verticalDeferralAnalysis(),
      },
      {
        enrich: enrichVerticalSliceSpecializedFactsV1,
        relate: appendStructuredReviewRelationSuggestionsV1,
        reconcile: ({ workspace }) => ({
          status: "REVIEW_REQUIRED" as const,
          reason: "RECONCILIATION_BLOCKED" as const,
          changedRelationIds: [] as const,
          workspace,
        }),
      },
    );

    expect(result.status).toBe("applied_with_warnings");
    if (result.status !== "applied_with_warnings") return;
    expect(result).toMatchObject({
      stage: "RECONCILIATION",
      safeCode: "GLOBAL_RECONCILIATION_REVIEW_REQUIRED",
      warningCodes: ["RELATION_RECONCILIATION_PENDING"],
    });
    expect(input.persist).toHaveBeenCalledTimes(1);
  });

  it("guarda dos revisiones consecutivas y recupera un baseline anterior sin perder la primera", async () => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    });
    expect(saveData(structuredClone(EMPTY_DATA))).toEqual({
      status: "applied",
    });
    let current = loadData();

    const first = runSaveFiscalNotificationStructuredReviewCommandV1({
      expected: current,
      ownerScope: OWNER,
      reviewId: "review:00000000-0000-4000-8000-000000000081",
      createdAt: "2026-07-14T10:00:00.000Z",
      analysis: offsetAnalysis(),
      commit: (expected, build) =>
        commitAppDataDurably({
          expected,
          storageBaseline: { status: "known", data: expected },
          getCurrent: () => current,
          build,
          persist: (candidate, storageExpected) =>
            saveData(candidate, { expected: storageExpected }),
        }),
    });
    expect(first.status).toBe("applied");
    if (first.status !== "applied") return;
    current = loadData();
    const firstDocumentIds = current.fiscalNotificationsWorkspace?.documents.map(
      (document) => document.id,
    );
    expect(firstDocumentIds).toHaveLength(1);

    const second = runSaveFiscalNotificationStructuredReviewCommandV1({
      expected: current,
      ownerScope: OWNER,
      reviewId: "review:00000000-0000-4000-8000-000000000082",
      createdAt: "2026-07-14T10:01:00.000Z",
      analysis: await verticalDeferralAnalysis(),
      commit: (expected, build) =>
        commitAppDataDurablyWithStorageRecovery({
          expected,
          storageBaseline: { status: "blocked", reason: "write_failed" },
          getCurrent: () => current,
          build,
          persist: (candidate, storageExpected) =>
            saveData(candidate, { expected: storageExpected }),
          inspectPersisted: inspectPersistedData,
        }),
    });

    expect(second.status).toBe("applied");
    if (second.status !== "applied") return;
    const reloaded = loadData();
    expect(reloaded.fiscalNotificationsWorkspace?.documents).toHaveLength(2);
    expect(
      reloaded.fiscalNotificationsWorkspace?.documents.map(
        (document) => document.id,
      ),
    ).toEqual(expect.arrayContaining(firstDocumentIds ?? []));
    expect(
      reloaded.fiscalNotificationsWorkspace?.documents.map(
        (document) => document.documentSubtype,
      ),
    ).toContain("collection.deferral_grant");
  });

  it("guarda en Mi cuenta tras un fallo de sincronización que solo cambió metadatos", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    });
    expect(saveData(structuredClone(EMPTY_DATA))).toEqual({ status: "applied" });
    const lastKnown = loadData();
    const current: AppData = {
      ...lastKnown,
      meta: {
        ...lastKnown.meta,
        lastModified: "2026-07-14T09:59:00.000Z",
        pendingChanges: [
          {
            entityType: "profile",
            entityId: "profile",
            deleted: false,
            payload: lastKnown.profile,
            updatedAt: "2026-07-14T09:59:00.000Z",
          },
        ],
      },
    };

    const result = runSaveFiscalNotificationStructuredReviewCommandV1({
      expected: current,
      ownerScope: OWNER,
      reviewId: "review:00000000-0000-4000-8000-000000000083",
      createdAt: "2026-07-14T10:02:00.000Z",
      analysis: offsetAnalysis(),
      commit: (expected, build) =>
        commitAppDataDurablyWithStorageRecovery({
          expected,
          storageBaseline: { status: "blocked", reason: "write_failed" },
          lastKnownStorageBaseline: lastKnown,
          getCurrent: () => current,
          build,
          persist: (candidate, storageExpected) =>
            saveData(candidate, { expected: storageExpected }),
          inspectPersisted: inspectPersistedData,
        }),
    });

    expect(result.status).toMatch(/applied/);
    if (!result.status.startsWith("applied")) return;
    const reloaded = loadData();
    expect(reloaded.fiscalNotificationsWorkspace?.documents).toHaveLength(1);
    expect(
      reloaded.meta?.pendingChanges?.some(
        (change) => change.entityType === "fiscal_notifications_workspace",
      ),
    ).toBe(true);
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
        expect.objectContaining({
          kind: "TOTAL_BEFORE_OFFSET",
          amountCents: 90_000,
        }),
        expect.objectContaining({
          kind: "REMAINING_AFTER_OFFSET",
          amountCents: 0,
        }),
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

    expect(
      runSaveFiscalNotificationStructuredReviewCommandV1(input.value),
    ).toEqual({
      status: "blocked",
      stage: "COMMIT",
      safeCode: "DURABILITY_CONFLICT",
      warningCodes: [],
      reason: "stale_precondition",
    });
    expect(input.persist).not.toHaveBeenCalled();
  });

  it("propaga un estado de almacenamiento indeterminado sin afirmar guardado", () => {
    const input = commandInput({ persistStatus: "indeterminate" });

    expect(
      runSaveFiscalNotificationStructuredReviewCommandV1(input.value),
    ).toEqual({
      status: "blocked",
      stage: "COMMIT",
      safeCode: "DURABILITY_CONFLICT",
      warningCodes: [],
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

    expect(
      runSaveFiscalNotificationStructuredReviewCommandV1(foreign.value),
    ).toEqual({
      status: "blocked",
      stage: "CORE",
      safeCode: "CORE_WORKSPACE_INTEGRITY_FAILED",
      warningCodes: [],
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
    expect(
      secondResult.data.fiscalNotificationsWorkspace?.documents,
    ).toHaveLength(2);
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

  it("guarda la diligencia como embargo exacto de su providencia sin aplicar efectos", async () => {
    const first = commandInput();
    const firstResult = runSaveFiscalNotificationStructuredReviewCommandV1(
      first.value,
    );
    expect(firstResult.status).toBe("applied");
    if (firstResult.status !== "applied") return;

    const second = commandInput({ expected: firstResult.data });
    const secondResult = runSaveFiscalNotificationStructuredReviewCommandV1({
      ...second.value,
      reviewId: "review:00000000-0000-4000-8000-000000000076",
      createdAt: "2026-07-14T10:03:00.000Z",
      analysis: await seizureAnalysis(),
    });

    expect(secondResult.status).toBe("applied");
    if (secondResult.status !== "applied") return;
    expect(secondResult.data.fiscalNotificationsWorkspace?.relations).toEqual([
      expect.objectContaining({
        relationType: "ENFORCES",
        status: "SYSTEM_CONFIRMED_EXACT",
        confidenceBand: "EXACT",
        evidence: expect.objectContaining({
          matchingReferenceTypes: ["LIQUIDATION_KEY"],
        }),
      }),
    ]);
    expect(secondResult.data.fiscalNotificationsWorkspace).toMatchObject({
      debts: [],
      obligations: [],
      installments: [],
      paymentPlans: [],
      accountingDrafts: [],
    });
    expect(JSON.stringify(secondResult.data)).not.toContain(SEIZURE_TEXT);
  });

  it("persists the real six-page bank seizure without bank data or operational effects", async () => {
    const input = commandInput();
    const result = runSaveFiscalNotificationStructuredReviewCommandV1({
      ...input.value,
      reviewId: "review:00000000-0000-4000-8000-000000000077",
      createdAt: "2026-07-14T10:04:00.000Z",
      analysis: await realSixPageBankSeizureAnalysis(),
    });

    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;
    const workspace = result.data.fiscalNotificationsWorkspace;
    expect(workspace?.documents).toEqual([
      expect.objectContaining({
        documentType: "AEAT_SEIZURE_ORDER",
        documentSubtype: "seizure.bank_account",
        titleRaw: "Embargo de cuenta o depósito",
      }),
    ]);
    expect(
      workspace?.analysisSnapshots[0]?.structuredData.administrativeDomain
        ?.moneyFacts,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ amountCents: 27_600 }),
      ]),
    );
    expect(workspace).toMatchObject({
      debts: [],
      obligations: [],
      installments: [],
      paymentPlans: [],
      accountingDrafts: [],
    });
    const serialized = JSON.stringify(result.data);
    expect(serialized).toContain("SYN-SEIZURE-D11");
    expect(serialized).toContain("SYN-DEBT-D11");
    expect(serialized).not.toContain("Banco Privado Sintético");
    expect(serialized).not.toContain("ES0012345678901234567890");
    expect(serialized).not.toContain("ACTIVO-1");
    expect(input.persist).toHaveBeenCalledTimes(1);
  });

  it("links the real bank seizure to the previous enforcement order by the same liquidation", async () => {
    const first = commandInput();
    const enforcement = runSaveFiscalNotificationStructuredReviewCommandV1(
      first.value,
    );
    expect(enforcement.status).toBe("applied");
    if (enforcement.status !== "applied") return;

    const second = commandInput({ expected: enforcement.data });
    const seizure = runSaveFiscalNotificationStructuredReviewCommandV1({
      ...second.value,
      reviewId: "review:00000000-0000-4000-8000-000000000078",
      createdAt: "2026-07-14T10:05:00.000Z",
      analysis: await realSixPageBankSeizureAnalysis("LQ-SYNTH-071"),
    });

    expect(seizure.status).toBe("applied");
    if (seizure.status !== "applied") return;
    expect(seizure.data.fiscalNotificationsWorkspace?.relations).toEqual([
      expect.objectContaining({
        relationType: "ENFORCES",
        status: "SYSTEM_CONFIRMED_EXACT",
        confidenceBand: "EXACT",
        evidence: expect.objectContaining({
          matchingReferenceTypes: ["LIQUIDATION_KEY"],
        }),
      }),
    ]);
    expect(seizure.data.fiscalNotificationsWorkspace).toMatchObject({
      debts: [],
      obligations: [],
      paymentPlans: [],
      accountingDrafts: [],
    });
  });

  it("bloquea con diagnóstico de privacidad si una proyección intenta persistir texto libre", async () => {
    const input = commandInput();
    const candidate = structuredClone(await seizureAnalysis()) as unknown as {
      ephemeralVerticalSliceReview: {
        documents: Array<{
          fields: Array<{ displayValue: string }>;
        }>;
      };
    };
    candidate.ephemeralVerticalSliceReview.documents[0]!.fields[0]!.displayValue =
      "PERSONA SINTÉTICA 12345678Z";

    expect(
      runSaveFiscalNotificationStructuredReviewCommandV1({
        ...input.value,
        analysis: candidate as unknown as FiscalNotificationLocalAnalysisResult,
      }),
    ).toEqual({
      status: "blocked",
      stage: "CORE",
      safeCode: "CORE_PRIVACY_REJECTED",
      warningCodes: [],
    });
    expect(input.persist).not.toHaveBeenCalled();
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
    ).toEqual({
      status: "blocked",
      stage: "CORE",
      safeCode: "CORE_INVALID_INPUT",
      warningCodes: [],
    });
    expect(input.persist).not.toHaveBeenCalled();
  });
});
