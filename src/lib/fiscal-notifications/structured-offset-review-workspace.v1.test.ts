import { describe, expect, it } from "vitest";
import { extractAeatOffsetAgreementFactsV1 } from "./aeat-offset-agreement-facts.v1";
import { extractFiscalNotificationCandidates } from "./extraction-dispatcher";
import type { BoundedDocumentInput } from "./input-contract";
import type {
  FiscalNotificationLocalAnalysisResult,
  FiscalNotificationLocalReviewResult,
} from "./local-review-flow";
import { projectFiscalNotificationStructuredHistoryV1 } from "./structured-review-history-view-model.v1";
import {
  appendAeatOffsetStructuredReviewV1,
  FiscalNotificationStructuredReviewV1Error,
} from "./structured-review-workspace.v1";
import { validateFiscalNotificationsWorkspaceIntegrity } from "./workspace-integrity";

const OWNER = "user:00000000-0000-4000-8000-000000000131";
const REVIEW_ID = "review:00000000-0000-4000-8000-000000000132";
const CREATED_AT = "2026-07-14T13:00:00.000Z";
const HASH = "f".repeat(64);

const OFFSET_TEXT = [
  "AGENCIA TRIBUTARIA",
  "www.agenciatributaria.es",
  "ACUERDO DE COMPENSACIÓN A INSTANCIA DEL OBLIGADO AL PAGO",
  "ANEXO I",
  "ACUERDO DE COMPENSACIÓN A INSTANCIA DEL OBLIGADO AL PAGO",
  "CRÉDITO Y DEUDAS",
  "IDENTIFICACIÓN DEL DOCUMENTO",
  "NOMBRE Y APELLIDOS / RAZÓN SOCIAL: PERSONA SINTÉTICA",
  "N.I.F.: X0000000T",
  "NÚMERO DE ACUERDO DE COMPENSACIÓN: ACUERDO-0131",
  "FECHA DE PRESENTACIÓN DE LA SOLICITUD DE COMPENSACIÓN: 05/01/2026",
  "CRÉDITO:",
  "FECHA RECONOCIM. IMPORTE IMPORTE INTERESES TOTAL IMPORTE",
  "REFERENCIA DESCRIPCIÓN DEL CRÉDITO CRÉDITO DE DEMORA CRÉDITO COMPENSADO",
  "CREDITO-0131 DEVOLUCIÓN SINTÉTICA 10/01/2026 1.000,00 20,00 1.020,00 900,00",
  "DEUDA:",
  "FECHA EFECTOS PRINCIPAL RECARGOS INTERESES INGRESOS TOTAL PENDIENTE IMPORTE IMPORTE PENDIENTE",
  "COMPENSACIÓN PENDIENTE PERIODO EJECUTIVO DE DEMORA A CUENTA ANTES DE COMPENSAR COMPENSADO DESPUÉS DE COMPENSAR EFECTOS",
  "VENCIMIENTO: DEUDA-0131 MODELO SINTÉTICO EJERCICIO 2025",
  "10/01/2026 800,00 80,00 20,00 0,00 900,00 900,00 0,00 ( 1)",
  "ANEXO II",
  "ACUERDO DE COMPENSACIÓN A INSTANCIA DEL OBLIGADO AL PAGO",
  "DETALLE DE EFECTOS",
  "(1) EFECTOS DE LA COMPENSACIÓN",
  "EL IMPORTE DE LA DEUDA QUE FIGURA EN LA COLUMNA TOTAL PENDIENTE ANTES DE COMPENSAR HA QUEDADO EXTINGUIDO EN PERIODO VOLUNTARIO DE INGRESO.",
  "Documento firmado electrónicamente por la Administradora, 30 de julio de 2026.",
].join("\n");

function source(): BoundedDocumentInput {
  return Object.freeze({
    ownerScope: OWNER,
    documentId: "notification-review:synthetic-offset-workspace",
    pages: Object.freeze([
      Object.freeze({ pageNumber: 1, text: OFFSET_TEXT, isBlank: false }),
    ]),
  });
}

function analysis(): FiscalNotificationLocalAnalysisResult {
  const input = source();
  const extraction = extractFiscalNotificationCandidates(input);
  const technicalReview: FiscalNotificationLocalReviewResult = Object.freeze({
    schemaVersion: 1,
    flowVersion: "1.0.0",
    status: extraction.status,
    reason: extraction.reason,
    engineId: extraction.engineId,
    engineVersion: extraction.engineVersion,
    pageCount: 1,
    byteLength: 12_345,
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

describe("structured offset review workspace v1", () => {
  it("persists all printed offset facts without creating operational entities", () => {
    const input = {
      ownerScope: OWNER,
      reviewId: REVIEW_ID,
      createdAt: CREATED_AT,
      workspace: null,
      analysis: analysis(),
    };
    const before = structuredClone(input);

    const result = appendAeatOffsetStructuredReviewV1(input);

    expect(result.status).toBe("APPLIED");
    expect(input).toEqual(before);
    expect(validateFiscalNotificationsWorkspaceIntegrity(result.workspace, OWNER)).toEqual({
      valid: true,
      issues: [],
    });
    expect(result.workspace.documents[0]).toMatchObject({
      documentType: "AEAT_OFFSET_AGREEMENT",
      documentSubtype: "REQUESTED",
      titleRaw: "Acuerdo de compensación solicitado AEAT",
      issueDate: "2026-07-30",
      signatureDate: "2026-07-30",
      subjectParty: {
        displayName: "PERSONA SINTÉTICA",
        taxIdNormalized: "X0000000T",
        matchesBusinessProfile: "UNKNOWN",
      },
      authenticityStatus: "NOT_CHECKED",
      humanReviewStatus: "PENDING",
      debtIds: [],
    });
    expect(result.workspace.references).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          referenceType: "PROCEDURE_NUMBER",
          rawValue: "ACUERDO-0131",
        }),
        expect.objectContaining({
          referenceType: "DOCUMENT_REFERENCE",
          rawValue: "CREDITO-0131",
        }),
        expect.objectContaining({
          referenceType: "LIQUIDATION_KEY",
          rawValue: "DEUDA-0131",
        }),
      ]),
    );
    const domain = result.workspace.analysisSnapshots[0]?.structuredData.administrativeDomain;
    expect(domain?.moneyFacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "REFUND_CREDIT", amountCents: 100_000 }),
        expect.objectContaining({ kind: "CREDIT_TOTAL", amountCents: 102_000 }),
        expect.objectContaining({ kind: "TOTAL_BEFORE_OFFSET", amountCents: 90_000 }),
        expect.objectContaining({ kind: "OFFSET_APPLIED", amountCents: 90_000 }),
        expect.objectContaining({ kind: "REMAINING_AFTER_OFFSET", amountCents: 0 }),
      ]),
    );
    expect(domain?.moneyFacts.every((fact) => fact.sourceActRefId)).toBe(true);
    expect(
      result.workspace.analysisSnapshots[0]?.structuredData.unknownFields,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          labelRaw: "PRINTED_OFFSET_REQUEST_DATE",
          valueRaw: "05/01/2026",
        }),
        expect.objectContaining({
          labelRaw: "PRINTED_SIGNATURE_DATE",
          valueRaw: "30-07-2026",
        }),
        expect.objectContaining({
          labelRaw: "OFFSET_EFFECT_MEANING",
          valueRaw: "Deuda totalmente extinguida en período voluntario",
        }),
      ]),
    );
    expect(result.workspace.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          textSnippet: "Efecto identificado por regla cerrada",
          rawValue: "TOTAL_EXTINGUISHED_IN_VOLUNTARY_PERIOD",
          assertionType: "INFERRED",
          confidence: "HIGH",
        }),
      ]),
    );
    expect(result.workspace.debts).toEqual([]);
    expect(result.workspace.debtObservations).toEqual([]);
    expect(result.workspace.paymentOptions).toEqual([]);
    expect(result.workspace.paymentPlans).toEqual([]);
    expect(result.workspace.installments).toEqual([]);
    expect(result.workspace.deadlineRules).toEqual([]);
    expect(result.workspace.obligations).toEqual([]);
    expect(result.workspace.accountingDrafts).toEqual([]);
    expect(JSON.stringify(result)).not.toContain(OFFSET_TEXT);
    expect(Object.isFrozen(result.workspace)).toBe(true);
  });

  it("projects references, exact values and effects into visible history", () => {
    const result = appendAeatOffsetStructuredReviewV1({
      ownerScope: OWNER,
      reviewId: REVIEW_ID,
      createdAt: CREATED_AT,
      workspace: null,
      analysis: analysis(),
    });

    const history = projectFiscalNotificationStructuredHistoryV1(
      result.workspace,
      OWNER,
    );
    expect(history.status).toBe("READY");
    expect(history.entries[0]).toMatchObject({
      title: "Acuerdo de compensación solicitado AEAT",
      documentDate: "2026-07-30",
      subjectName: null,
      subjectTaxId: null,
      references: expect.arrayContaining([
        { label: "Número de procedimiento", value: "ACUERDO-0131" },
        { label: "Referencia del documento", value: "CREDITO-0131" },
        { label: "Clave de liquidación", value: "DEUDA-0131" },
      ]),
      printedDates: expect.arrayContaining([
        { label: "Fecha de solicitud", value: "05/01/2026" },
      ]),
      money: expect.arrayContaining([
        expect.objectContaining({
          label: "Total antes de compensar",
          amountCents: 90_000,
          currency: "EUR",
          sourceReference: "DEUDA-0131",
        }),
        expect.objectContaining({
          label: "Pendiente tras compensar",
          amountCents: 0,
          currency: "EUR",
          sourceReference: "DEUDA-0131",
        }),
      ]),
      explanation: expect.objectContaining({
        ruleId: "aeat.offset-agreement.explanation",
        status: "EXPLAINED",
        result: expect.stringContaining("queda totalmente extinguida"),
        nextStep: expect.objectContaining({ status: "NO_PAYMENT_SHOWN" }),
        deadline: expect.objectContaining({ status: "MISSING_RECEIPT_DATE" }),
        networkPolicy: "NO_NETWORK",
      }),
    });
    expect(history.entries[0]?.printedDates).not.toContainEqual(
      expect.objectContaining({ label: "Efecto indicado en el documento" }),
    );
  });

  it("deduplicates by hash and rejects a foreign owner", () => {
    const first = appendAeatOffsetStructuredReviewV1({
      ownerScope: OWNER,
      reviewId: REVIEW_ID,
      createdAt: CREATED_AT,
      workspace: null,
      analysis: analysis(),
    });
    const replay = appendAeatOffsetStructuredReviewV1({
      ownerScope: OWNER,
      reviewId: "review:00000000-0000-4000-8000-000000000133",
      createdAt: "2026-07-14T13:01:00.000Z",
      workspace: first.workspace,
      analysis: analysis(),
    });
    expect(replay.status).toBe("EXISTING");
    expect(replay.workspace.revision).toBe(1);

    expect(() =>
      appendAeatOffsetStructuredReviewV1({
        ownerScope: "user:00000000-0000-4000-8000-000000000139",
        reviewId: "review:00000000-0000-4000-8000-000000000134",
        createdAt: "2026-07-14T13:02:00.000Z",
        workspace: first.workspace,
        analysis: analysis(),
      }),
    ).toThrow(FiscalNotificationStructuredReviewV1Error);
  });
});
