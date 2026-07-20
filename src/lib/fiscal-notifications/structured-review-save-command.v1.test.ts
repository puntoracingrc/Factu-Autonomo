import { afterEach, describe, expect, it, vi } from "vitest";
import { jsPDF } from "jspdf";
import {
  commitAppDataDurably,
  commitAppDataDurablyWithStorageRecovery,
  commitLatestAppDataDurably,
} from "../app-data-durability";
import {
  inspectPersistedData,
  loadData,
  readPersistedDataSnapshot,
  saveData,
} from "../storage";
import { EMPTY_DATA, type AppData } from "../types";
import { extractAeatDeferralGrantFactsV1 } from "./aeat-deferral-grant-facts.v1";
import { extractAeatEnforcementExplicitFieldsV2 } from "./aeat-enforcement-explicit-fields.v2";
import { extractAeatEnforcementMoneyFacts } from "./aeat-enforcement-money-facts";
import { extractAeatEnforcementPartyFactsV1 } from "./aeat-enforcement-party-facts.v1";
import { extractAeatOffsetAgreementFactsV1 } from "./aeat-offset-agreement-facts.v1";
import { readPersistedFiscalNotificationHashesV1 } from "./batch-intake.v1";
import { analyzeFiscalNotificationDocumentInput } from "./document-input-analysis";
import { analyzeFiscalNotificationVerticalSliceV1 } from "./extractor-core/vertical-slice-orchestrator.v1";
import { extractFiscalNotificationCandidates } from "./extraction-dispatcher";
import type { BoundedDocumentInput } from "./input-contract";
import { parseFiscalNotificationPdfTextLayerBytes } from "./pdf-text-layer-parser";
import { projectFiscalNotificationDocumentDetailV1 } from "./structured-review-document-detail.v1";
import { projectFiscalNotificationDocumentLibraryV1 } from "./structured-review-document-library.v1";
import type {
  FiscalNotificationLocalAnalysisResult,
  FiscalNotificationLocalReviewResult,
} from "./local-review-flow";
import { runFiscalNotificationCommandAgainstLatestPersistedV1 } from "./persisted-command.v1";
import type { FiscalNotificationsWorkspace } from "./types";
import {
  runSaveFiscalNotificationStructuredReviewCommandV1,
  type DurableFiscalNotificationStructuredReviewSaveResultV1,
} from "./structured-review-save-command.v1";
import {
  runDeleteFiscalNotificationDocumentCommandV1,
  type DurableFiscalNotificationDocumentDeletionResultV1,
} from "./document-deletion-command.v1";
import { appendStructuredReviewRelationSuggestionsV1 } from "./structured-review-relation-suggestions.v1";
import { projectFiscalNotificationVerticalSliceReviewV1 } from "./vertical-slice-review.v1";
import { enrichVerticalSliceSpecializedFactsV1 } from "./vertical-slice-specialized-facts.v1";
import { appendWorkspaceGlobalReconciliationV8 } from "./workspace-global-reconciliation.v8";
import {
  compareFiscalNotificationsWorkspaceStorageEnvelopesV2,
  encodeFiscalNotificationsWorkspaceForStorageV2,
  parseFiscalNotificationsWorkspaceStorageEnvelopeV2,
} from "./workspace-storage-envelope.v2";

const OWNER = "user:00000000-0000-4000-8000-000000000071";
const FOREIGN_OWNER = "user:00000000-0000-4000-8000-000000000072";
const REVIEW_ID = "review:00000000-0000-4000-8000-000000000073";
const CREATED_AT = "2026-07-14T10:00:00.000Z";
const HASH = "b".repeat(64);

const PRODUCTION_QA_ENFORCEMENT_LINES = Object.freeze([
  "AGENCIA TRIBUTARIA - DOCUMENTO SINTETICO",
  "PRUEBA DE QA - SIN VALIDEZ JURIDICA - SIN DATOS PERSONALES",
  "PROVIDENCIA DE APREMIO",
  "IDENTIFICACION DEL DOCUMENTO",
  "Prueba automatizada local",
  "Clave de liquidacion",
  "LQ-SYNTH-QA-2026-001",
  "Referencia del documento",
  "APR-SYNTH-QA-2026-001",
  "Numero de expediente",
  "EXP-SYNTH-QA-2026-001",
  "Fecha de emision",
  "05/02/2026",
  "Fecha de firma",
  "06/02/2026",
  "Fecha de finalizacion del periodo voluntario",
  "28/02/2026",
  "IMPORTE DE LA DEUDA",
  "Principal pendiente 100,00 EUR",
  "Recargo de apremio ordinario (20 %) 20,00 EUR",
  "Ingreso a cuenta 0,00 EUR",
  "Importe total 120,00 EUR",
  "PLAZOS DE PAGO",
  "Pague el importe total antes del 28/02/2026.",
  "Documento generado exclusivamente para verificar el lector local.",
]);

const PRODUCTION_QA_SEIZURE_LINES = Object.freeze([
  "DOCUMENTO SINTETICO DE QA - SIN VALIDEZ",
  "AGENCIA TRIBUTARIA",
  "sede.agenciatributaria.gob.es",
  "DILIGENCIA DE EMBARGO DE CUENTAS BANCARIAS",
  "Numero de diligencia EMB-SYNTH-QA-2026-002",
  "Numero de expediente EXP-SYNTH-QA-2026-001",
  "Clave de deuda DEBT-SYNTH-QA-2026-001",
  "Clave de liquidacion LQ-SYNTH-QA-2026-001",
  "Referencia de la providencia APR-SYNTH-QA-2026-001",
  "Fecha de emision 03/03/2026",
  "Fecha del embargo 04/03/2026",
  "Plazo de contestacion 12/03/2026",
  "Principal 100,00 EUR",
  "Recargo de apremio 20,00 EUR",
  "Intereses de demora 3,00 EUR",
  "Costas 1,00 EUR",
  "Total pendiente 124,00 EUR",
  "Importe a embargar 124,00 EUR",
  "Instrucciones Contestar por la sede electronica",
]);

afterEach(() => {
  vi.unstubAllGlobals();
});

function emptyFiscalWorkspace(createdAt: string): FiscalNotificationsWorkspace {
  return {
    schemaVersion: 1,
    workspaceId: "fiscal-notifications-workspace-v1",
    ownerScope: OWNER,
    revision: 0,
    createdAt,
    updatedAt: createdAt,
    packages: [],
    files: [],
    documents: [],
    parts: [],
    authorities: [],
    references: [],
    evidence: [],
    debts: [],
    debtObservations: [],
    cases: [],
    relations: [],
    analysisSnapshots: [],
    paymentOptions: [],
    paymentPlans: [],
    installments: [],
    interestCalculations: [],
    deadlineRules: [],
    obligations: [],
    timeline: [],
    accountingDrafts: [],
    auditEvents: [],
    driveArchives: [],
  };
}

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

function syntheticDeferralGrantPages(
  token: string,
  dueDates: readonly string[],
): readonly string[] {
  const primary = [
    "AGENCIA TRIBUTARIA",
    "sede.agenciatributaria.gob.es",
    "CONCESIÓN DEL APLAZAMIENTO O FRACCIONAMIENTO DE PAGO SIN GARANTÍA",
    `Número de expediente: EXP-SYN-${token}`,
    "ACUERDO",
    `Se concede el aplazamiento por el importe de ${dueDates.length * 100},00 euros.`,
  ].join("\n");
  const annex = [
    "ANEXO I: DEUDAS Y PLAZOS DE LA NOTIFICACIÓN",
    "Número Fecha de Importe Fecha de",
    "Concepto Importe",
    "Liquidación Intereses del plazo Vencimiento",
    ...dueDates.map((dueDate, index) =>
      index === 0
        ? `L-SYN-${token} CONCEPTO SINTÉTICO 01-01-2026 ${dueDates.length * 100},00 100,00 ${dueDate.split("-").reverse().join("-")}`
        : `100,00 ${dueDate.split("-").reverse().join("-")}`,
    ),
    "ANEXO II: LIQUIDACIÓN DE INTERESES DE DEMORA",
    "CÁLCULO DE INTERESES",
  ].join("\n");
  return [primary, annex];
}

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

async function verticalEnforcementAnalysis(): Promise<FiscalNotificationLocalAnalysisResult> {
  const input = documentInput();
  const analyzed = await analyzeFiscalNotificationDocumentInput(input);
  const base = analysis();
  return Object.freeze({
    ...base,
    ephemeralEnforcementMoneyFacts: extractAeatEnforcementMoneyFacts(input),
    ephemeralEnforcementExplicitFields:
      extractAeatEnforcementExplicitFieldsV2(input),
    ephemeralEnforcementPartyFacts: extractAeatEnforcementPartyFactsV1(input),
    ephemeralVerticalSliceReview: analyzed.verticalSliceReview,
  });
}

async function productionQaEnforcementAnalysis(): Promise<FiscalNotificationLocalAnalysisResult> {
  const lines = PRODUCTION_QA_ENFORCEMENT_LINES;
  const input: BoundedDocumentInput = Object.freeze({
    ownerScope: OWNER,
    documentId: "notification-review:synthetic-production-qa",
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
  return productionQaEnforcementAnalysisFromInput(input);
}

async function productionQaEnforcementAnalysisFromInput(
  input: BoundedDocumentInput,
  byteLength = 3_072,
  sourceSha256 = "9".repeat(64),
): Promise<FiscalNotificationLocalAnalysisResult> {
  const analyzed = await analyzeFiscalNotificationDocumentInput(input);
  const extraction = analyzed.familyAnalysis;
  if (
    !extraction ||
    analyzed.verticalSliceReview.status !== "REVIEW_REQUIRED"
  ) {
    throw new Error("synthetic_production_qa_extraction_incomplete");
  }
  const technicalReview: FiscalNotificationLocalReviewResult = Object.freeze({
    schemaVersion: 1,
    flowVersion: "1.0.0",
    status: extraction.status,
    reason: extraction.reason,
    engineId: extraction.engineId,
    engineVersion: extraction.engineVersion,
    pageCount: analyzed.pageCount,
    byteLength,
    sha256: sourceSha256,
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
  return withProductionSourceIdentity(
    Object.freeze({
      schemaVersion: 6,
      analysisVersion: "6.0.0",
      technicalReview,
      ephemeralEnforcementMoneyFacts: analyzed.enforcementMoneyFacts ?? null,
      ephemeralEnforcementExplicitFields:
        analyzed.enforcementExplicitFields ?? null,
      ephemeralEnforcementPartyFacts: analyzed.enforcementPartyFacts ?? null,
      ephemeralDeferralGrantFacts: analyzed.deferralGrantFacts ?? null,
      ephemeralOffsetAgreementFacts: analyzed.offsetAgreementFacts ?? null,
      ephemeralVerticalSliceReview: analyzed.verticalSliceReview,
      sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    }),
    sourceSha256,
  );
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

async function verticalDeferralAnalysis(options?: {
  text?: string;
  pageTexts?: readonly string[];
  documentId?: string;
  sha256?: string;
}): Promise<FiscalNotificationLocalAnalysisResult> {
  const pageTexts = options?.pageTexts ?? [options?.text ?? DEFERRAL_TEXT];
  const input: BoundedDocumentInput = Object.freeze({
    ownerScope: OWNER,
    documentId:
      options?.documentId ?? "notification-review:synthetic-deferral-save-v2",
    pages: Object.freeze(
      pageTexts.map((text, index) =>
        Object.freeze({ pageNumber: index + 1, text, isBlank: false }),
      ),
    ),
  });
  const analyzed = await analyzeFiscalNotificationDocumentInput(input);
  const legacy = deferralAnalysis();
  return Object.freeze({
    ...legacy,
    technicalReview: Object.freeze({
      ...legacy.technicalReview,
      pageCount: pageTexts.length,
      byteLength: pageTexts.reduce((total, text) => total + text.length, 0),
      sha256: options?.sha256 ?? legacy.technicalReview.sha256,
    }),
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
  it("persists the exact fully synthetic production QA PDF through PDF.js and storage", async () => {
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    PRODUCTION_QA_ENFORCEMENT_LINES.forEach((line, index) => {
      pdf.text(line, 48, 48 + index * 24);
    });
    const bytes = new Uint8Array(pdf.output("arraybuffer"));
    const documentInput = await parseFiscalNotificationPdfTextLayerBytes({
      ownerScope: OWNER,
      documentId: "notification-document:00000000-0000-4000-8000-000000000099",
      bytes,
    });
    const reviewAnalysis = await productionQaEnforcementAnalysisFromInput(
      documentInput,
      bytes.byteLength,
      "c".repeat(64),
    );
    const store = new Map<string, string>();
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    });
    const emptyGeneration = {
      ...emptyFiscalWorkspace("2026-07-19T23:50:00.000Z"),
      revision: 1,
    };
    expect(
      saveData({
        ...structuredClone(EMPTY_DATA),
        fiscalNotificationsWorkspace: emptyGeneration,
        meta: {
          lastModified: "2026-07-19T23:50:00.000Z",
          pendingChanges: [
            {
              entityType: "fiscal_notifications_workspace",
              entityId: emptyGeneration.workspaceId,
              deleted: false,
              payload: emptyGeneration,
              updatedAt: "2026-07-19T23:50:00.000Z",
            },
          ],
        },
      }),
    ).toEqual({ status: "applied" });
    const current = loadData();

    const result = runSaveFiscalNotificationStructuredReviewCommandV1({
      expected: current,
      ownerScope: OWNER,
      reviewId: "review:00000000-0000-4000-8000-000000000099",
      createdAt: "2026-07-20T02:00:00.000Z",
      confirmedAt: "2026-07-20T02:01:00.000Z",
      analysis: reviewAnalysis,
      commit: (expected, build) =>
        commitAppDataDurably({
          expected,
          storageBaseline: { status: "known", data: expected },
          getCurrent: () => current,
          build,
          persist: (candidate, storageExpected) =>
            saveData(candidate, {
              expected: storageExpected,
              fiscalNotificationsBaseAwareProjection: true,
            }),
        }),
    });

    expect(result.status, JSON.stringify(result)).toMatch(/^applied/u);
    const persisted = loadData();
    expect(persisted.fiscalNotificationsWorkspace).toMatchObject({
      createdAt: "2026-07-20T02:01:00.000Z",
      documents: [
        expect.objectContaining({
          documentSubtype: "collection.enforcement_order",
        }),
      ],
    });
    expect(persisted.meta?.pendingChanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityType: "fiscal_notifications_workspace",
          deleted: false,
        }),
      ]),
    );
    const library = projectFiscalNotificationDocumentLibraryV1(
      persisted.fiscalNotificationsWorkspace,
      OWNER,
    );
    expect(library.status).toBe("READY");
    expect(library.documents).toHaveLength(1);
    expect(library.documents[0]).toMatchObject({
      documentSubtype: "collection.enforcement_order",
      documentDate: "2026-02-05",
      references: expect.arrayContaining([
        expect.objectContaining({ label: "Clave de liquidación" }),
        expect.objectContaining({ label: "Número de expediente" }),
      ]),
      money: expect.arrayContaining([
        expect.objectContaining({ amountCents: 10_000 }),
        expect.objectContaining({ amountCents: 12_000 }),
      ]),
    });
    const document = library.documents[0]!;
    const group = library.groups.find((candidate) =>
      candidate.documents.some((candidateDocument) => candidateDocument.key === document.key),
    );
    expect(group).toBeDefined();
    const detail = projectFiscalNotificationDocumentDetailV1({
      document,
      group: group!,
      allDocuments: library.documents,
    });
    expect(
      detail.factGroups.find((factGroup) => factGroup.id === "REFERENCES")?.fields,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Clave de liquidación",
          value: "LQ-SYNTH-QA-2026-001",
        }),
        expect.objectContaining({
          label: "Identificador del acto",
          value: "APR-SYNTH-QA-2026-001",
        }),
        expect.objectContaining({
          label: "Número de expediente",
          value: "EXP-SYNTH-QA-2026-001",
        }),
      ]),
    );
    expect(detail.economy?.rows.map(({ label, value }) => ({ label, value }))).toEqual([
      { label: "Principal pendiente", value: "100,00 €" },
      { label: "Recargo ejecutivo del veinte por ciento", value: "20,00 €" },
      { label: "Ingreso a cuenta", value: "0,00 €" },
      { label: "Total del documento", value: "120,00 €" },
    ]);
    expect(
      detail.factGroups.flatMap((factGroup) => factGroup.fields).map((field) => field.label),
    ).not.toContain("Dato");
    const serialized = JSON.stringify(persisted.fiscalNotificationsWorkspace);
    expect(serialized).not.toMatch(
      /EXACT_|INTEGER:|BOOLEAN:|EXPLANATION:|_DURATION|_CONTENT/u,
    );
    expect(JSON.stringify(library)).not.toMatch(
      /INTEGER:|BOOLEAN:|EXPLANATION:|_DURATION|_CONTENT|EXACT_TITLE_AND_AUTHORITY/u,
    );
  });

  it("roundtrips the production QA document chain and deletes 1-of-N with pending sync", async () => {
    const analyzePdf = async (
      lines: readonly string[],
      documentId: string,
      sha256: string,
    ): Promise<FiscalNotificationLocalAnalysisResult> => {
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      lines.forEach((line, index) => {
        pdf.text(line, 48, 48 + index * 24);
      });
      const bytes = new Uint8Array(pdf.output("arraybuffer"));
      const documentInput = await parseFiscalNotificationPdfTextLayerBytes({
        ownerScope: OWNER,
        documentId,
        bytes,
      });
      return productionQaEnforcementAnalysisFromInput(
        documentInput,
        bytes.byteLength,
        sha256,
      );
    };
    const enforcementAnalysis = await analyzePdf(
      PRODUCTION_QA_ENFORCEMENT_LINES,
      "notification-document:00000000-0000-4000-8000-000000000626",
      "6".repeat(64),
    );
    const seizureAnalysis = await analyzePdf(
      PRODUCTION_QA_SEIZURE_LINES,
      "notification-document:00000000-0000-4000-8000-000000000627",
      "7".repeat(64),
    );
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
    const persistFiscal = (candidate: AppData, expected: AppData) =>
      saveData(candidate, {
        expected,
        fiscalNotificationsBaseAwareProjection: true,
      });
    const persistReview = (
      current: AppData,
      reviewId: string,
      createdAt: string,
      analysis: FiscalNotificationLocalAnalysisResult,
    ) =>
      runFiscalNotificationCommandAgainstLatestPersistedV1<DurableFiscalNotificationStructuredReviewSaveResultV1>(
        {
          fallback: current,
          storageBaseline: { status: "known", data: current },
          lastKnownPersisted: current,
          readPersisted: readPersistedDataSnapshot,
          persist: persistFiscal,
          blocked: (reason) => ({
            status: "blocked",
            stage: "COMMIT",
            safeCode: "DURABILITY_CONFLICT",
            warningCodes: [],
            reason,
          }),
          run: (expected, commit) =>
            runSaveFiscalNotificationStructuredReviewCommandV1({
              expected,
              ownerScope: OWNER,
              reviewId,
              createdAt,
              analysis,
              commit,
            }),
        },
      );

    let current = loadData();
    expect(
      persistReview(
        current,
        "review:00000000-0000-4000-8000-000000000626",
        "2026-07-20T10:00:00.000Z",
        enforcementAnalysis,
      ).status,
    ).toMatch(/^applied/u);
    current = loadData();
    const persistedSeizure = persistReview(
      current,
      "review:00000000-0000-4000-8000-000000000627",
      "2026-07-20T10:01:00.000Z",
      seizureAnalysis,
    );
    expect(
      persistedSeizure.status,
      JSON.stringify(persistedSeizure),
    ).toMatch(/^applied/u);
    current = loadData();

    const workspace = current.fiscalNotificationsWorkspace!;
    const library = projectFiscalNotificationDocumentLibraryV1(workspace, OWNER);
    expect(library.status).toBe("READY");
    expect(library.documents).toHaveLength(2);
    expect(
      library.groups,
      JSON.stringify({
        relations: workspace.relations,
        references: workspace.references.map((reference) => ({
          id: reference.id,
          documentId: reference.documentId,
          referenceType: reference.referenceType,
          normalizedValue: reference.normalizedValue,
          confidence: reference.confidence,
          occurrenceIds: reference.occurrenceIds,
        })),
      }),
    ).toHaveLength(1);
    expect(
      library.documents.map(({ documentSubtype, documentDate }) => [
        documentSubtype,
        documentDate,
      ]),
    ).toEqual(
      expect.arrayContaining([
        ["collection.enforcement_order", "2026-02-05"],
        ["seizure.bank_account", "2026-03-03"],
      ]),
    );
    const seizureDocument = library.documents.find(
      ({ documentSubtype }) => documentSubtype === "seizure.bank_account",
    );
    expect(seizureDocument?.printedDates).toEqual(
      expect.arrayContaining([
        { label: "Fecha de emisión", value: "2026-03-03" },
        { label: "Fecha de embargo", value: "2026-03-04" },
        { label: "Fecha límite de respuesta", value: "2026-03-12" },
      ]),
    );
    expect(seizureDocument?.references).toEqual(
      expect.arrayContaining([
        {
          label: "Número de expediente",
          value: "EXP-SYNTH-QA-2026-001",
        },
      ]),
    );
    expect(seizureDocument?.printedDates).not.toContainEqual({
      label: "Dato observado",
      value: "Consta en el documento",
    });
    expect(workspace.relations).toEqual([
      expect.objectContaining({
        relationType: "ENFORCES",
        status: "SYSTEM_CONFIRMED_EXACT",
        evidence: expect.objectContaining({
          matchingReferenceTypes: ["LIQUIDATION_KEY"],
          matchingAmountTypes: [],
        }),
      }),
    ]);
    const visibleLibraryContent = JSON.stringify({
      documents: library.documents.map((document) => ({
        title: document.title,
        authority: document.authority,
        references: document.references,
        printedDates: document.printedDates,
        orderedFacts: document.orderedFacts.map(({ label, value }) => ({
          label,
          value,
        })),
        money: document.money.map(({ label, amountCents }) => ({
          label,
          amountCents,
        })),
        explanation: document.explanation,
      })),
      groups: library.groups.map((group) => ({
        links: group.links.map(({ label, explanation, matches }) => ({
          label,
          explanation,
          matches: matches.map(({ label: matchLabel, value, issuer }) => ({
            label: matchLabel,
            value,
            issuer,
          })),
        })),
      })),
    });
    expect(visibleLibraryContent).not.toMatch(
      /EXACT_|INTEGER:|BOOLEAN:|EXPLANATION:|_DURATION|_CONTENT|reference:\d+:|date:[a-z]|seizure-money:|detail:/u,
    );

    const enforcementDocumentId = workspace.documents.find(
      ({ documentSubtype }) =>
        documentSubtype === "collection.enforcement_order",
    )!.id;
    const durableBeforeDelete = readPersistedDataSnapshot();
    expect(durableBeforeDelete?.fiscalNotificationsWorkspace?.revision).toBe(
      workspace.revision + 1,
    );
    const persistDelete = vi.fn(persistFiscal);
    const deleted =
      runFiscalNotificationCommandAgainstLatestPersistedV1<DurableFiscalNotificationDocumentDeletionResultV1>(
        {
          fallback: current,
          storageBaseline: {
            status: "blocked",
            reason: "stale_precondition",
          },
          lastKnownPersisted: structuredClone(EMPTY_DATA),
          readPersisted: readPersistedDataSnapshot,
          persist: persistDelete,
          blocked: (reason) =>
            reason === "storage_state_unknown"
              ? { status: "indeterminate", reason }
              : { status: "blocked", reason },
          run: (expected, commit) =>
            runDeleteFiscalNotificationDocumentCommandV1({
              expected,
              ownerScope: OWNER,
              documentId: enforcementDocumentId,
              deletedAt: "2026-07-20T10:02:00.000Z",
              commit,
            }),
        },
      );
    expect(
      deleted.status,
      JSON.stringify({
        deleted,
        persistenceResults: persistDelete.mock.results.map(({ value }) => value),
      }),
    ).toBe("applied");
    const afterDelete = loadData();
    expect(afterDelete.fiscalNotificationsWorkspace).toMatchObject({
      ownerScope: OWNER,
      documents: [
        expect.objectContaining({ documentSubtype: "seizure.bank_account" }),
      ],
      relations: [],
    });
    expect(
      projectFiscalNotificationDocumentLibraryV1(
        afterDelete.fiscalNotificationsWorkspace,
        OWNER,
      ),
    ).toMatchObject({ status: "READY", documents: [{}], groups: [{}] });
    const pendingFiscal = afterDelete.meta?.pendingChanges?.find(
      ({ entityType }) => entityType === "fiscal_notifications_workspace",
    );
    expect(
      parseFiscalNotificationsWorkspaceStorageEnvelopeV2(
        pendingFiscal?.payload,
        OWNER,
      )?.workspace.documents,
    ).toHaveLength(1);
  });

  it("persists the production QA enforcement review through the real storage projection", async () => {
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
    const current = loadData();

    const result = runSaveFiscalNotificationStructuredReviewCommandV1({
      expected: current,
      ownerScope: OWNER,
      reviewId: "review:00000000-0000-4000-8000-000000000091",
      createdAt: "2026-07-20T01:30:00.000Z",
      analysis: await productionQaEnforcementAnalysis(),
      commit: (expected, build) =>
        commitAppDataDurably({
          expected,
          storageBaseline: { status: "known", data: expected },
          getCurrent: () => current,
          build,
          persist: (candidate, storageExpected) =>
            saveData(candidate, {
              expected: storageExpected,
              fiscalNotificationsBaseAwareProjection: true,
            }),
        }),
    });

    expect(result.status).toBe("applied");
    expect(loadData().fiscalNotificationsWorkspace?.documents).toEqual([
      expect.objectContaining({
        documentSubtype: "collection.enforcement_order",
      }),
    ]);
  });

  it("preserves a compressed fiscal graph with pending sync across save, replay, and 1-of-N deletion", async () => {
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
    const persistFiscal = (candidate: AppData, expected: AppData) =>
      saveData(candidate, {
        expected,
        fiscalNotificationsBaseAwareProjection: true,
      });
    const runPersistedSave = (
      expected: AppData,
      reviewId: string,
      createdAt: string,
      reviewAnalysis: FiscalNotificationLocalAnalysisResult,
      confirmedAt?: string,
    ) =>
      runFiscalNotificationCommandAgainstLatestPersistedV1<DurableFiscalNotificationStructuredReviewSaveResultV1>(
        {
          fallback: expected,
          storageBaseline: { status: "known", data: expected },
          lastKnownPersisted: expected,
          readPersisted: readPersistedDataSnapshot,
          persist: persistFiscal,
          blocked: (reason) => ({
            status: "blocked",
            stage: "COMMIT",
            safeCode: "DURABILITY_CONFLICT",
            warningCodes: [],
            reason,
          }),
          run: (latest, commit) =>
            runSaveFiscalNotificationStructuredReviewCommandV1({
              expected: latest,
              ownerScope: OWNER,
              reviewId,
              createdAt,
              ...(confirmedAt ? { confirmedAt } : {}),
              analysis: reviewAnalysis,
              commit,
            }),
        },
      );
    const runPersistedDelete = (
      expected: AppData,
      documentId: string,
      deletedAt: string,
    ) =>
      runFiscalNotificationCommandAgainstLatestPersistedV1<DurableFiscalNotificationDocumentDeletionResultV1>(
        {
          fallback: expected,
          storageBaseline: { status: "known", data: expected },
          lastKnownPersisted: expected,
          readPersisted: readPersistedDataSnapshot,
          persist: persistFiscal,
          blocked: (reason) =>
            reason === "storage_state_unknown"
              ? { status: "indeterminate", reason }
              : { status: "blocked", reason },
          run: (latest, commit) =>
            runDeleteFiscalNotificationDocumentCommandV1({
              expected: latest,
              ownerScope: OWNER,
              documentId,
              deletedAt,
              commit,
            }),
        },
      );

    const enforcement = runPersistedSave(
      current,
      "review:00000000-0000-4000-8000-000000000092",
      "2026-07-20T01:20:00.000Z",
      await verticalEnforcementAnalysis(),
    );
    expect(enforcement.status, JSON.stringify(enforcement)).toMatch(
      /^applied/u,
    );
    current = loadData();
    const seizure = runPersistedSave(
      current,
      "review:00000000-0000-4000-8000-000000000093",
      "2026-07-20T01:21:00.000Z",
      await seizureAnalysis(),
    );
    expect(seizure.status, JSON.stringify(seizure)).toMatch(/^applied/u);
    current = loadData();

    const graphForDocuments = (
      data: AppData,
      documentIds: readonly string[],
    ) => {
      const workspace = data.fiscalNotificationsWorkspace;
      if (!workspace) throw new Error("missing_fiscal_workspace");
      const documentIdSet = new Set(documentIds);
      const documents = workspace.documents.filter((document) =>
        documentIdSet.has(document.id),
      );
      const fileIds = new Set(documents.map((document) => document.fileId));
      const packageIds = new Set(
        documents.map((document) => document.packageId),
      );
      const authorityIds = new Set(
        documents.map((document) => document.authorityId),
      );
      return structuredClone({
        ownerScope: workspace.ownerScope,
        packages: workspace.packages.filter((entry) =>
          packageIds.has(entry.id),
        ),
        files: workspace.files.filter((entry) => fileIds.has(entry.id)),
        documents,
        parts: workspace.parts.filter((entry) =>
          documentIdSet.has(entry.documentId),
        ),
        authorities: workspace.authorities.filter((entry) =>
          authorityIds.has(entry.id),
        ),
        references: workspace.references.filter((entry) =>
          documentIdSet.has(entry.documentId),
        ),
        evidence: workspace.evidence.filter((entry) =>
          documentIdSet.has(entry.documentId),
        ),
        analysisSnapshots: workspace.analysisSnapshots.filter((entry) =>
          documentIdSet.has(entry.documentId),
        ),
        relations: workspace.relations.filter(
          (entry) =>
            documentIdSet.has(entry.sourceDocumentId) &&
            documentIdSet.has(entry.targetDocumentId),
        ),
        driveArchives: (workspace.driveArchives ?? []).filter((entry) =>
          entry.documentIds.some((id) => documentIdSet.has(id)),
        ),
      });
    };
    const nonFiscalSnapshot = (data: AppData) => {
      const snapshot = structuredClone(data);
      delete snapshot.fiscalNotificationsWorkspace;
      delete snapshot.meta;
      return snapshot;
    };
    const unrelatedPendingChanges = (data: AppData) =>
      structuredClone(
        (data.meta?.pendingChanges ?? []).filter(
          (change) => change.entityType !== "fiscal_notifications_workspace",
        ),
      );
    const fiscalPendingDocumentIds = (data: AppData): string[] => {
      const change = data.meta?.pendingChanges?.find(
        (entry) => entry.entityType === "fiscal_notifications_workspace",
      );
      const envelope = parseFiscalNotificationsWorkspaceStorageEnvelopeV2(
        change?.payload,
        OWNER,
      );
      if (!change || change.deleted || !envelope) {
        throw new Error("missing_fiscal_pending_envelope");
      }
      return envelope.workspace.documents.map((document) => document.id);
    };
    const retainedDocumentIds =
      current.fiscalNotificationsWorkspace?.documents.map(
        (document) => document.id,
      ) ?? [];
    const retainedRelations = structuredClone(
      current.fiscalNotificationsWorkspace?.relations ?? [],
    );
    expect(retainedDocumentIds).toHaveLength(2);
    expect(retainedRelations).toEqual([
      expect.objectContaining({
        relationType: "ENFORCES",
        status: "SYSTEM_CONFIRMED_EXACT",
        evidence: expect.objectContaining({
          matchingReferenceTypes: ["LIQUIDATION_KEY"],
        }),
      }),
    ]);

    const fiscalWorkspace = current.fiscalNotificationsWorkspace!;
    const historicalCandidate: AppData = {
      ...current,
      profile: {
        ...current.profile,
        name: "estado historico fiscal ".repeat(40_000),
      },
      meta: {
        lastModified: "2026-07-20T01:22:00.000Z",
        pendingChanges: [
          {
            entityType: "fiscal_notifications_workspace",
            entityId: fiscalWorkspace.workspaceId,
            deleted: false,
            payload: fiscalWorkspace,
            updatedAt: "2026-07-20T01:22:00.000Z",
          },
          {
            entityType: "profile",
            entityId: "profile",
            deleted: false,
            payload: { marker: "pending-profile-state" },
            updatedAt: "2026-07-20T01:22:00.000Z",
          },
        ],
      },
    };
    expect(persistFiscal(historicalCandidate, current)).toEqual({
      status: "applied",
    });
    expect(store.get("factura-autonomo-data")).toMatch(/^factu-gzip-v1:/u);
    current = loadData();
    const retainedGraph = graphForDocuments(current, retainedDocumentIds);
    const retainedNonFiscalState = nonFiscalSnapshot(current);
    const retainedUnrelatedPending = unrelatedPendingChanges(current);
    expect(fiscalPendingDocumentIds(current)).toEqual(retainedDocumentIds);

    const nativeBtoa = globalThis.btoa;
    let compressionCount = 0;
    vi.stubGlobal("btoa", (value: string) => {
      compressionCount += 1;
      if (compressionCount > 1) throw new Error("redundant compression");
      return nativeBtoa(value);
    });
    const productionAnalysis = await productionQaEnforcementAnalysis();
    const saved = runPersistedSave(
      current,
      "review:00000000-0000-4000-8000-000000000094",
      "2026-07-20T01:23:00.000Z",
      productionAnalysis,
    );
    expect(saved.status).toMatch(/^applied/u);
    expect(compressionCount).toBe(1);
    current = loadData();
    const persistedHashesAfterSave = readPersistedFiscalNotificationHashesV1(
      current.fiscalNotificationsWorkspace,
      OWNER,
    );
    expect(persistedHashesAfterSave.status).toBe("READY");
    if (persistedHashesAfterSave.status === "READY") {
      expect(persistedHashesAfterSave.sha256).toContain(
        productionAnalysis.technicalReview.sha256,
      );
    }
    const afterSaveDocumentIds =
      current.fiscalNotificationsWorkspace?.documents.map(
        (document) => document.id,
      ) ?? [];
    const savedDocumentId = afterSaveDocumentIds.find(
      (id) => !retainedDocumentIds.includes(id),
    );
    expect(savedDocumentId).toBeTruthy();
    expect(afterSaveDocumentIds).toHaveLength(3);
    expect(graphForDocuments(current, retainedDocumentIds)).toEqual(
      retainedGraph,
    );
    expect(nonFiscalSnapshot(current)).toEqual(retainedNonFiscalState);
    expect(unrelatedPendingChanges(current)).toEqual(retainedUnrelatedPending);
    expect(fiscalPendingDocumentIds(current)).toEqual(afterSaveDocumentIds);
    const pendingAfterSave = structuredClone(current.meta?.pendingChanges);

    compressionCount = 0;
    const replay = runPersistedSave(
      current,
      "review:00000000-0000-4000-8000-000000000095",
      "2026-07-20T01:24:00.000Z",
      productionAnalysis,
    );
    expect(replay.status).toBe("applied");
    if (replay.status === "applied") expect(replay.replayed).toBe(true);
    expect(compressionCount).toBe(0);
    expect(loadData()).toEqual(current);
    expect(loadData().meta?.pendingChanges).toEqual(pendingAfterSave);

    compressionCount = 0;
    const deleted = runPersistedDelete(
      current,
      savedDocumentId!,
      "2026-07-20T01:25:00.000Z",
    );
    expect(deleted.status).toBe("applied");
    expect(compressionCount).toBe(1);
    current = loadData();
    const persistedHashesAfterDelete = readPersistedFiscalNotificationHashesV1(
      current.fiscalNotificationsWorkspace,
      OWNER,
    );
    expect(persistedHashesAfterDelete.status).toBe("READY");
    if (persistedHashesAfterDelete.status === "READY") {
      expect(persistedHashesAfterDelete.sha256).not.toContain(
        productionAnalysis.technicalReview.sha256,
      );
    }
    expect(
      current.fiscalNotificationsWorkspace?.documents.map(
        (document) => document.id,
      ),
    ).toEqual(retainedDocumentIds);
    expect(graphForDocuments(current, retainedDocumentIds)).toEqual(
      retainedGraph,
    );
    expect(nonFiscalSnapshot(current)).toEqual(retainedNonFiscalState);
    expect(unrelatedPendingChanges(current)).toEqual(retainedUnrelatedPending);
    expect(fiscalPendingDocumentIds(current)).toEqual(retainedDocumentIds);

    compressionCount = 0;
    expect(
      runPersistedDelete(current, savedDocumentId!, "2026-07-20T01:26:00.000Z"),
    ).toEqual({ status: "NOT_FOUND" });
    expect(compressionCount).toBe(0);
    expect(loadData()).toEqual(current);

    for (const [index, documentId] of retainedDocumentIds.entries()) {
      compressionCount = 0;
      const cleared = runPersistedDelete(
        current,
        documentId,
        `2026-07-20T01:${27 + index}:00.000Z`,
      );
      expect(cleared.status).toBe("applied");
      expect(compressionCount).toBe(1);
      current = loadData();
    }
    expect(current.fiscalNotificationsWorkspace?.documents).toEqual([]);
    expect(
      readPersistedFiscalNotificationHashesV1(
        current.fiscalNotificationsWorkspace,
        OWNER,
      ),
    ).toEqual({ status: "READY", sha256: [] });
    expect(nonFiscalSnapshot(current)).toEqual(retainedNonFiscalState);
    expect(unrelatedPendingChanges(current)).toEqual(retainedUnrelatedPending);
    expect(fiscalPendingDocumentIds(current)).toEqual([]);
    const emptyPendingChange = current.meta?.pendingChanges?.find(
      (change) => change.entityType === "fiscal_notifications_workspace",
    );
    const emptyPendingEnvelope =
      parseFiscalNotificationsWorkspaceStorageEnvelopeV2(
        emptyPendingChange?.payload,
        OWNER,
      );
    expect(emptyPendingEnvelope).not.toBeNull();
    if (!emptyPendingEnvelope) return;

    compressionCount = 0;
    const savedAfterEmptyHistory = runPersistedSave(
      current,
      "review:00000000-0000-4000-8000-000000000096",
      "2026-07-20T01:22:30.000Z",
      productionAnalysis,
      "2026-07-20T01:30:00.000Z",
    );
    expect(
      savedAfterEmptyHistory.status,
      JSON.stringify(savedAfterEmptyHistory),
    ).toMatch(/^applied/u);
    expect(compressionCount).toBe(1);
    current = loadData();
    expect(
      readPersistedFiscalNotificationHashesV1(
        current.fiscalNotificationsWorkspace,
        OWNER,
      ),
    ).toEqual({
      status: "READY",
      sha256: [productionAnalysis.technicalReview.sha256],
    });
    expect(current.fiscalNotificationsWorkspace?.documents).toEqual([
      expect.objectContaining({
        documentSubtype: "collection.enforcement_order",
      }),
    ]);
    expect(current.fiscalNotificationsWorkspace?.createdAt).toBe(
      "2026-07-20T01:30:00.000Z",
    );
    const restartedDocumentId =
      current.fiscalNotificationsWorkspace?.documents[0]?.id;
    expect(restartedDocumentId).toBeTruthy();
    const restartedPendingChange = current.meta?.pendingChanges?.find(
      (change) => change.entityType === "fiscal_notifications_workspace",
    );
    expect(
      parseFiscalNotificationsWorkspaceStorageEnvelopeV2(
        restartedPendingChange?.payload,
        OWNER,
      )?.transition,
    ).toMatchObject({
      kind: "USER_CONFIRMED_EMPTY_RESTART_V1",
      confirmedAt: "2026-07-20T01:30:00.000Z",
    });

    compressionCount = 0;
    const replayAfterEmptyRestart = runPersistedSave(
      current,
      "review:00000000-0000-4000-8000-000000000096",
      "2026-07-20T01:22:30.000Z",
      productionAnalysis,
      "2026-07-20T01:30:00.000Z",
    );
    expect(replayAfterEmptyRestart.status).toBe("applied");
    if (replayAfterEmptyRestart.status === "applied") {
      expect(replayAfterEmptyRestart.replayed).toBe(true);
    }
    expect(compressionCount).toBe(0);
    expect(loadData()).toEqual(current);

    compressionCount = 0;
    const deletedBeforeRestartSync = runPersistedDelete(
      current,
      restartedDocumentId!,
      "2026-07-20T01:31:00.000Z",
    );
    expect(deletedBeforeRestartSync.status).toBe("applied");
    expect(compressionCount).toBe(1);
    current = loadData();
    expect(current.fiscalNotificationsWorkspace?.documents).toEqual([]);
    const reducedRestartPendingChange = current.meta?.pendingChanges?.find(
      (change) => change.entityType === "fiscal_notifications_workspace",
    );
    const reducedRestartEnvelope =
      parseFiscalNotificationsWorkspaceStorageEnvelopeV2(
        reducedRestartPendingChange?.payload,
        OWNER,
      );
    expect(reducedRestartEnvelope?.transition).toMatchObject({
      kind: "USER_CONFIRMED_EMPTY_RESTART_V1",
      confirmedAt: "2026-07-20T01:30:00.000Z",
    });
    expect(
      compareFiscalNotificationsWorkspaceStorageEnvelopesV2(
        emptyPendingEnvelope,
        reducedRestartEnvelope,
        OWNER,
      ),
    ).toBe("INCOMING_ADVANCES");

    compressionCount = 0;
    const savedAfterSecondEmptyHistory = runPersistedSave(
      current,
      "review:00000000-0000-4000-8000-000000000097",
      "2026-07-20T01:32:00.000Z",
      await seizureAnalysis(),
      "2026-07-20T01:32:00.000Z",
    );
    expect(savedAfterSecondEmptyHistory.status).toMatch(/^applied/u);
    expect(compressionCount).toBe(1);
    current = loadData();
    const secondRestartPendingChange = current.meta?.pendingChanges?.find(
      (change) => change.entityType === "fiscal_notifications_workspace",
    );
    const secondRestartEnvelope =
      parseFiscalNotificationsWorkspaceStorageEnvelopeV2(
        secondRestartPendingChange?.payload,
        OWNER,
      );
    expect(secondRestartEnvelope?.workspace.documents).toHaveLength(1);
    expect(secondRestartEnvelope?.transition).toMatchObject({
      kind: "USER_CONFIRMED_EMPTY_RESTART_V1",
      confirmedAt: "2026-07-20T01:32:00.000Z",
      baseEnvelopeSha256: expect.stringMatching(/^[0-9a-f]{64}$/u),
      lineageEnvelopeSha256s: expect.arrayContaining([
        expect.stringMatching(/^[0-9a-f]{64}$/u),
      ]),
    });
    expect(
      compareFiscalNotificationsWorkspaceStorageEnvelopesV2(
        emptyPendingEnvelope,
        secondRestartEnvelope,
        OWNER,
      ),
    ).toBe("INCOMING_ADVANCES");
    expect(nonFiscalSnapshot(current)).toEqual(retainedNonFiscalState);
    expect(unrelatedPendingChanges(current)).toEqual(retainedUnrelatedPending);
  }, 15_000);

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
      /PERSONA SINTETICA|X0000000X|IRPF SINTETICO/iu,
    );
    expect(result.data.fiscalNotificationsWorkspace?.references).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          referenceType: "LIQUIDATION_KEY",
          rawValue: "L-SAVE-071",
          normalizedValue: "L-SAVE-071",
        }),
      ]),
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
    ).not.toContain("SPECIALIZED_ENRICHMENT_SKIPPED");
    expect(
      JSON.stringify(result.data.fiscalNotificationsWorkspace),
    ).not.toMatch(
      /SPECIALIZED_ENRICHMENT_SKIPPED|RELATION_RECONCILIATION_PENDING/u,
    );
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
    const firstDocumentIds =
      current.fiscalNotificationsWorkspace?.documents.map(
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

  it("preserva las cuotas del primer aplazamiento al guardar otro tras recargar", async () => {
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
    const persistReview = (
      reviewId: string,
      createdAt: string,
      analysis: FiscalNotificationLocalAnalysisResult,
    ) =>
      runSaveFiscalNotificationStructuredReviewCommandV1({
        expected: current,
        ownerScope: OWNER,
        reviewId,
        createdAt,
        analysis,
        commit: (expected, build) =>
          commitAppDataDurably({
            expected,
            storageBaseline: { status: "known", data: expected },
            getCurrent: () => current,
            build,
            persist: (candidate, storageExpected) =>
              saveData(candidate, {
                expected: storageExpected,
                fiscalNotificationsBaseAwareProjection: true,
              }),
          }),
      });

    const firstAnalysis = await verticalDeferralAnalysis({
      pageTexts: syntheticDeferralGrantPages("FIRST", [
        "2027-01-20",
        "2027-02-20",
        "2027-03-20",
      ]),
      documentId: "notification-review:synthetic-deferral-first",
      sha256: "1".repeat(64),
    });
    expect(
      firstAnalysis.ephemeralDeferralGrantFacts?.debtSchedules.flatMap(
        (schedule) => schedule.installments,
      ),
    ).toHaveLength(3);
    const first = persistReview(
      "review:00000000-0000-4000-8000-000000000083",
      "2026-07-20T03:00:00.000Z",
      firstAnalysis,
    );
    expect(first.status, JSON.stringify(first)).toBe("applied");
    current = loadData();

    const secondAnalysis = await verticalDeferralAnalysis({
      pageTexts: syntheticDeferralGrantPages("SECOND", [
        "2027-04-20",
        "2027-05-20",
      ]),
      documentId: "notification-review:synthetic-deferral-second",
      sha256: "2".repeat(64),
    });
    const second = persistReview(
      "review:00000000-0000-4000-8000-000000000084",
      "2026-07-20T03:01:00.000Z",
      secondAnalysis,
    );
    expect(second.status, JSON.stringify(second)).toBe("applied");

    const reloaded = loadData();
    const envelope = encodeFiscalNotificationsWorkspaceForStorageV2(
      reloaded.fiscalNotificationsWorkspace,
    );
    expect(envelope?.workspace.documents).toHaveLength(2);
    const installmentDates =
      envelope?.workspace.dates.filter(
        (date) => date.kind === "VOLUNTARY_PAYMENT_DEADLINE",
      ) ?? [];
    expect(installmentDates.map((date) => date.value).sort()).toEqual([
      "2027-01-20",
      "2027-02-20",
      "2027-03-20",
      "2027-04-20",
      "2027-05-20",
    ]);
    expect(new Set(installmentDates.map((date) => date.id)).size).toBe(5);
  });

  it("rebasa una eliminación de otra pestaña y recarga la familia exacta", async () => {
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

    const seeded = runSaveFiscalNotificationStructuredReviewCommandV1({
      expected: current,
      ownerScope: OWNER,
      reviewId: "review:00000000-0000-4000-8000-000000000090",
      createdAt: "2026-07-14T09:58:00.000Z",
      analysis: offsetAnalysis(),
      commit: (_expected, build) =>
        commitLatestAppDataDurably({
          getCurrent: () => current,
          build,
          persist: (candidate) => saveData(candidate),
        }),
    });
    expect(seeded.status).toMatch(/^applied/u);
    current = loadData();
    const staleTab = current;
    const seededDocumentId =
      current.fiscalNotificationsWorkspace?.documents[0]?.id;
    expect(seededDocumentId).toBeTruthy();

    const deleted = runDeleteFiscalNotificationDocumentCommandV1({
      expected: current,
      ownerScope: OWNER,
      documentId: seededDocumentId!,
      deletedAt: "2026-07-14T10:00:00.000Z",
      commit: (_expected, build) =>
        commitLatestAppDataDurably({
          getCurrent: () => current,
          build,
          persist: (candidate) => saveData(candidate),
        }),
    });
    expect(deleted.status).toBe("applied");
    current = loadData();
    expect(current.fiscalNotificationsWorkspace?.documents).toEqual([]);

    const verticalAnalysis = await verticalEnforcementAnalysis();
    let persistedReads = 0;
    const result =
      runFiscalNotificationCommandAgainstLatestPersistedV1<DurableFiscalNotificationStructuredReviewSaveResultV1>(
        {
          fallback: staleTab,
          storageBaseline: { status: "known", data: staleTab },
          lastKnownPersisted: staleTab,
          readPersisted: () => {
            persistedReads += 1;
            return persistedReads === 1 ? staleTab : loadData();
          },
          persist: (candidate, expected) => saveData(candidate, { expected }),
          blocked: (reason) => ({
            status: "blocked",
            stage: "COMMIT",
            safeCode: "DURABILITY_CONFLICT",
            warningCodes: [],
            reason,
          }),
          run: (expected, commit) =>
            runSaveFiscalNotificationStructuredReviewCommandV1({
              expected,
              ownerScope: OWNER,
              reviewId: "review:00000000-0000-4000-8000-000000000089",
              createdAt: "2026-07-14T10:01:30.000Z",
              analysis: verticalAnalysis,
              commit,
            }),
        },
      );

    expect(result.status).toMatch(/^applied/u);
    expect(persistedReads).toBe(2);
    const reloaded = loadData();
    expect(reloaded.fiscalNotificationsWorkspace?.documents).toEqual([
      expect.objectContaining({
        documentSubtype: "collection.enforcement_order",
      }),
    ]);
    expect(reloaded.fiscalNotificationsWorkspace?.references).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ referenceType: "LIQUIDATION_KEY" }),
      ]),
    );
  });

  it("guarda la ficha sin perder un perfil local pendiente tras un fallo previo", () => {
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
    const lastKnown = loadData();
    const current: AppData = {
      ...lastKnown,
      profile: {
        ...lastKnown.profile,
        name: "Perfil local pendiente",
      },
      meta: {
        ...lastKnown.meta,
        lastModified: "2026-07-14T09:59:00.000Z",
        pendingChanges: [
          {
            entityType: "profile",
            entityId: "profile",
            deleted: false,
            payload: {
              ...lastKnown.profile,
              name: "Perfil local pendiente",
            },
            updatedAt: "2026-07-14T09:59:00.000Z",
          },
        ],
      },
    };

    const result =
      runFiscalNotificationCommandAgainstLatestPersistedV1<DurableFiscalNotificationStructuredReviewSaveResultV1>(
        {
          fallback: current,
          storageBaseline: { status: "blocked", reason: "write_failed" },
          lastKnownPersisted: lastKnown,
          readPersisted: readPersistedDataSnapshot,
          persist: (candidate, expected) => saveData(candidate, { expected }),
          blocked: (reason) => ({
            status: "blocked",
            stage: "COMMIT",
            safeCode: "DURABILITY_CONFLICT",
            warningCodes: [],
            reason,
          }),
          run: (expected, commit) =>
            runSaveFiscalNotificationStructuredReviewCommandV1({
              expected,
              ownerScope: OWNER,
              reviewId: "review:00000000-0000-4000-8000-000000000083",
              createdAt: "2026-07-14T10:02:00.000Z",
              analysis: offsetAnalysis(),
              commit,
            }),
        },
      );

    expect(result.status).toMatch(/applied/);
    if (!result.status.startsWith("applied")) return;
    const reloaded = loadData();
    expect(reloaded.profile.name).toBe("Perfil local pendiente");
    expect(reloaded.fiscalNotificationsWorkspace?.documents).toHaveLength(1);
    expect(
      reloaded.meta?.pendingChanges?.some(
        (change) => change.entityType === "profile",
      ),
    ).toBe(true);
    expect(
      reloaded.meta?.pendingChanges?.some(
        (change) => change.entityType === "fiscal_notifications_workspace",
      ),
    ).toBe(true);
  });

  it("guarda sobre la cuenta vigente sin exigir la referencia completa anterior", () => {
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
    const current: AppData = {
      ...loadData(),
      profile: {
        ...loadData().profile,
        name: "Perfil recibido durante la revisión",
      },
    };

    const result = runSaveFiscalNotificationStructuredReviewCommandV1({
      expected: current,
      ownerScope: OWNER,
      reviewId: "review:00000000-0000-4000-8000-000000000093",
      createdAt: "2026-07-14T10:03:00.000Z",
      analysis: offsetAnalysis(),
      commit: (_expected, build) =>
        commitLatestAppDataDurably({
          storageBaseline: {
            status: "blocked",
            reason: "stale_precondition",
          },
          getCurrent: () => current,
          build,
          persist: (candidate) => saveData(candidate),
        }),
    });

    expect(result.status).toMatch(/applied/u);
    if (!result.status.startsWith("applied")) return;
    const reloaded = loadData();
    expect(reloaded.profile.name).toBe("Perfil recibido durante la revisión");
    expect(reloaded.fiscalNotificationsWorkspace?.documents).toHaveLength(1);
    expect(
      reloaded.meta?.pendingChanges?.some(
        (change) => change.entityType === "fiscal_notifications_workspace",
      ),
    ).toBe(true);
  });

  it("guarda y permite borrar inmediatamente la ficha aunque su sincronización siga pendiente", () => {
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
    const saved = runSaveFiscalNotificationStructuredReviewCommandV1({
      expected: current,
      ownerScope: OWNER,
      reviewId: "review:00000000-0000-4000-8000-000000000094",
      createdAt: "2026-07-14T10:04:00.000Z",
      analysis: offsetAnalysis(),
      commit: (_expected, build) =>
        commitLatestAppDataDurably({
          getCurrent: () => current,
          build,
          persist: (candidate) => saveData(candidate),
        }),
    });
    expect(saved.status).toMatch(/^applied/u);
    current = loadData();
    const documentId = current.fiscalNotificationsWorkspace?.documents[0]?.id;
    expect(documentId).toBeTruthy();

    const deleted = runDeleteFiscalNotificationDocumentCommandV1({
      expected: current,
      ownerScope: OWNER,
      documentId: documentId!,
      deletedAt: "2026-07-14T10:05:00.000Z",
      commit: (_expected, build) =>
        commitLatestAppDataDurably({
          getCurrent: () => current,
          build,
          persist: (candidate) => saveData(candidate),
        }),
    });

    expect(deleted.status).toBe("applied");
    expect(loadData().fiscalNotificationsWorkspace?.documents ?? []).toEqual(
      [],
    );
  });

  it("guarda aunque una cola fiscal antigua ya no cumpla el envelope privado actual", () => {
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
    const lastKnown = loadData();
    const current: AppData = {
      ...lastKnown,
      meta: {
        ...lastKnown.meta,
        lastModified: "2026-07-14T10:02:30.000Z",
        pendingChanges: [
          {
            entityType: "fiscal_notifications_workspace",
            entityId: "fiscal-notifications-workspace-v1",
            deleted: false,
            payload: {
              schemaVersion: 1,
              rawPdfText: "dato legado que no debe sobrevivir",
            },
            updatedAt: "2026-07-14T10:02:30.000Z",
          },
        ],
      },
    };

    const result = runSaveFiscalNotificationStructuredReviewCommandV1({
      expected: current,
      ownerScope: OWNER,
      reviewId: "review:00000000-0000-4000-8000-000000000088",
      createdAt: "2026-07-14T10:03:00.000Z",
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
          readPersisted: readPersistedDataSnapshot,
        }),
    });

    expect(result.status).toMatch(/^applied/u);
    const raw = [...store.values()].join("\n");
    expect(raw).not.toContain("dato legado que no debe sobrevivir");
    expect(loadData().fiscalNotificationsWorkspace?.documents).toHaveLength(1);
  });

  it("guarda la ficha completa usando el snapshot durable actual cuando el baseline de la UI quedó obsoleto", () => {
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
    const persisted = loadData();
    const current: AppData = {
      ...persisted,
      meta: {
        ...persisted.meta,
        lastModified: "2026-07-14T10:04:30.000Z",
      },
    };

    const result = runSaveFiscalNotificationStructuredReviewCommandV1({
      expected: current,
      ownerScope: OWNER,
      reviewId: "review:00000000-0000-4000-8000-000000000085",
      createdAt: "2026-07-14T10:05:00.000Z",
      analysis: offsetAnalysis(),
      commit: (expected, build) =>
        commitAppDataDurablyWithStorageRecovery({
          expected,
          storageBaseline: { status: "blocked", reason: "write_failed" },
          getCurrent: () => current,
          build,
          persist: (candidate, storageExpected) =>
            saveData(candidate, { expected: storageExpected }),
          inspectPersisted: inspectPersistedData,
          readPersisted: readPersistedDataSnapshot,
        }),
    });

    expect(result.status).toMatch(/applied/);
    expect(loadData().fiscalNotificationsWorkspace?.documents).toHaveLength(1);
  });

  it("guarda y recarga la ficha sin perder cambios de cuenta pendientes cuando la base durable anterior sigue verificada", () => {
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
    const lastKnown = loadData();
    const current: AppData = {
      ...lastKnown,
      profile: {
        ...lastKnown.profile,
        name: "Perfil pendiente ya visible en la cuenta",
      },
    };

    const result = runSaveFiscalNotificationStructuredReviewCommandV1({
      expected: current,
      ownerScope: OWNER,
      reviewId: "review:00000000-0000-4000-8000-000000000086",
      createdAt: "2026-07-14T10:06:00.000Z",
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
          readPersisted: readPersistedDataSnapshot,
        }),
    });

    expect(result.status).toMatch(/applied/);
    const reloaded = loadData();
    expect(reloaded.profile.name).toBe(
      "Perfil pendiente ya visible en la cuenta",
    );
    expect(reloaded.fiscalNotificationsWorkspace?.documents).toHaveLength(1);
  });

  it("guarda en Mi cuenta cuando el historial fiscal local quedó vacío tras borrar fichas", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    });
    const lastKnown = structuredClone(EMPTY_DATA);
    const emptyWorkspace = emptyFiscalWorkspace("2026-07-14T10:03:00.000Z");
    const current: AppData = {
      ...lastKnown,
      fiscalNotificationsWorkspace: emptyWorkspace,
      meta: {
        lastModified: "2026-07-14T10:03:00.000Z",
        pendingChanges: [
          {
            entityType: "fiscal_notifications_workspace",
            entityId: "fiscal-notifications-workspace-v2",
            deleted: false,
            payload: emptyWorkspace,
            updatedAt: "2026-07-14T10:03:00.000Z",
          },
        ],
      },
    };

    const result = runSaveFiscalNotificationStructuredReviewCommandV1({
      expected: current,
      ownerScope: OWNER,
      reviewId: "review:00000000-0000-4000-8000-000000000084",
      createdAt: "2026-07-14T10:04:00.000Z",
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
      reloaded.fiscalNotificationsWorkspace?.documents[0]?.documentSubtype,
    ).toBe("collection.offset_requested");
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
