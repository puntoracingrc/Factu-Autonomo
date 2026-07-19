import { describe, expect, it } from "vitest";
import { analyzeFiscalNotificationDocumentInput } from "./document-input-analysis";
import { extractFiscalNotificationCandidates } from "./extraction-dispatcher";
import type { BoundedDocumentInput } from "./input-contract";
import type {
  FiscalNotificationLocalAnalysisResult,
  FiscalNotificationLocalReviewResult,
} from "./local-review-flow";
import { appendFiscalNotificationVerticalSliceReviewV1 } from "./vertical-slice-review-workspace.v1";
import {
  enrichVerticalSliceSpecializedFactsV1,
  FiscalNotificationSpecializedFactsEnrichmentErrorV1,
} from "./vertical-slice-specialized-facts.v1";

const OWNER = "user:00000000-0000-4000-8000-000000000801";
const REVIEW_ID = "review:00000000-0000-4000-8000-000000000802";
const CREATED_AT = "2026-07-16T08:00:00.000Z";

const DEFERRAL_TEXT = [
  "AGENCIA TRIBUTARIA",
  "sede.agenciatributaria.gob.es",
  "CONCESION DEL APLAZAMIENTO O FRACCIONAMIENTO",
  "IDENTIFICACION DEL DOCUMENTO",
  "N.I.F.: X0000000X",
  "Nombre: PERSONA SINTETICA PRIVADA",
  "Numero de expediente: EXP-PRIVATE-801",
  "ANEXO I: DEUDAS Y PLAZOS DE LA NOTIFICACION",
  "Clave Liquidacion: BASE-PRIVATE-801",
  "Concepto: CONCEPTO PRIVADO QUE NO SE DEBE GUARDAR",
  "Fecha de Interes: 01-01-2026",
  "1.000,00 0,00 1.000,00 10,00 1.010,00 20-02-2026",
  "1.000,00 0,00 1.000,00 11,00 1.011,00 20-03-2026",
  "1.000,00 0,00 1.000,00 12,00 1.012,00 20-04-2026",
  "1.000,00 0,00 1.000,00 13,00 1.013,00 20-05-2026",
  "1.000,00 0,00 1.000,00 14,00 1.014,00 20-06-2026",
  "ANEXO II",
  "CALCULO DE INTERESES",
].join("\n");

const DEFERRAL_MODIFICATION_TEXT = [
  "AGENCIA TRIBUTARIA",
  "sede.agenciatributaria.gob.es",
  "CONCESION DEL APLAZAMIENTO O FRACCIONAMIENTO",
  "MODIFICACIÓN DEL APLAZAMIENTO",
  "CALENDARIO MODIFICADO",
  "IDENTIFICACION DEL DOCUMENTO",
  "ANEXO I: DEUDAS Y PLAZOS DE LA NOTIFICACION",
  "Referencia del acuerdo: SYN-PLAN-MOD-801",
  "Acuerdo sustituido: SYN-PLAN-OLD-801",
  "Clave Liquidacion: SYN-DEBT-MOD-801",
  "Fecha de Interes: 01-01-2027",
  "1.000,00 0,00 1.000,00 10,00 1.010,00 20-08-2027",
  "ANEXO II",
  "CALCULO DE INTERESES",
].join("\n");

const OFFSET_TEXT = [
  "AGENCIA TRIBUTARIA",
  "www.agenciatributaria.es",
  "ACUERDO DE COMPENSACIÓN A INSTANCIA DEL OBLIGADO AL PAGO",
  "Nombre: PERSONA SINTETICA PRIVADA",
  "N.I.F.: X0000000X",
  "ANEXO I",
  "CRÉDITO Y DEUDAS",
  "NÚMERO DE ACUERDO DE COMPENSACIÓN: ACUERDO-PRIVATE-801",
  "CRÉDITO:",
  "CREDITO-PRIVATE-801 DESCRIPCION PRIVADA 10/01/2026 1.000,00 20,00 1.020,00 900,00",
  "DEUDA:",
  "VENCIMIENTO: DEUDA-PRIVATE-801 CONCEPTO PRIVADO",
  "10/01/2026 800,00 80,00 20,00 0,00 900,00 900,00 0,00 ( 1)",
  "VENCIMIENTO: DEUDA-PRIVATE-802 OTRO CONCEPTO PRIVADO",
  "11/01/2026 600,00 60,00 40,00 0,00 700,00 700,00 0,00 ( 1)",
  "ANEXO II",
  "DETALLE DE EFECTOS",
  "(1) EFECTOS DE LA COMPENSACIÓN",
  "EL IMPORTE DE LA DEUDA QUE FIGURA EN LA COLUMNA TOTAL PENDIENTE ANTES DE COMPENSAR HA QUEDADO EXTINGUIDO EN PERIODO VOLUNTARIO DE INGRESO.",
].join("\n");

const ENFORCEMENT_TEXT = [
  "AGENCIA TRIBUTARIA",
  "sede.agenciatributaria.gob.es",
  "PROVIDENCIA DE APREMIO",
  "IDENTIFICACION DEL DOCUMENTO",
  "IMPORTE DE LA DEUDA",
  "Principal pendiente: 1.234,56 EUR",
  "Recargo de apremio ordinario (20 %): 246,91 EUR",
  "Ingreso a cuenta: 0,00 EUR",
  "Importe total: 1.481,47 EUR",
  "IDENTIFICACION DEL OBLIGADO AL PAGO",
  "NOMBRE O RAZON SOCIAL: PERSONA SINTETICA PRIVADA",
  "NIF: 12345678Z",
  "Clave de liquidación: LQ-PRIVATE-801",
  "Fecha de emisión: 05/02/2026",
].join("\n");

async function analysisFromText(
  text: string,
  sha256: string,
): Promise<FiscalNotificationLocalAnalysisResult> {
  const input: BoundedDocumentInput = Object.freeze({
    ownerScope: OWNER,
    documentId: `notification-review:${sha256.slice(0, 12)}`,
    pages: Object.freeze([
      Object.freeze({ pageNumber: 1, text, isBlank: false }),
    ]),
  });
  const analyzed = await analyzeFiscalNotificationDocumentInput(input);
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
    sha256,
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
    ephemeralEnforcementMoneyFacts: analyzed.enforcementMoneyFacts,
    ephemeralEnforcementExplicitFields: analyzed.enforcementExplicitFields,
    ephemeralEnforcementPartyFacts: analyzed.enforcementPartyFacts,
    ephemeralDeferralGrantFacts: analyzed.deferralGrantFacts ?? null,
    ephemeralOffsetAgreementFacts: analyzed.offsetAgreementFacts ?? null,
    ephemeralVerticalSliceReview: analyzed.verticalSliceReview,
    sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
  });
}

async function verticalWorkspace(
  text: string,
  sha256: string,
): Promise<{
  analysis: FiscalNotificationLocalAnalysisResult;
  result: ReturnType<typeof appendFiscalNotificationVerticalSliceReviewV1>;
}> {
  const analysis = await analysisFromText(text, sha256);
  const result = appendFiscalNotificationVerticalSliceReviewV1({
    ownerScope: OWNER,
    reviewId: REVIEW_ID,
    createdAt: CREATED_AT,
    workspace: null,
    analysis,
  });
  return { analysis, result };
}

describe("vertical slice specialized facts enrichment v1", () => {
  it("conserva cinco cuotas con la misma referencia como cinco unidades de revisión", async () => {
    const { analysis, result } = await verticalWorkspace(
      DEFERRAL_TEXT,
      "8".repeat(64),
    );

    const enriched = enrichVerticalSliceSpecializedFactsV1({
      ownerScope: OWNER,
      createdAt: CREATED_AT,
      workspace: result.workspace,
      documentIds: result.documentIds,
      analysis,
    });

    expect(enriched.status).toBe("APPLIED");
    expect(enriched.workspace.paymentOptions).toHaveLength(5);
    expect(enriched.workspace.paymentOptions.map((item) => item.deadline)).toEqual([
      "2026-02-20",
      "2026-03-20",
      "2026-04-20",
      "2026-05-20",
      "2026-06-20",
    ]);
    expect(new Set(enriched.workspace.paymentOptions.map((item) => item.id))).toHaveLength(5);
    expect(enriched.workspace).toMatchObject({
      debts: [],
      paymentPlans: [],
      installments: [],
      deadlineRules: [],
      obligations: [],
      accountingDrafts: [],
    });
    const serialized = JSON.stringify(enriched.workspace);
    expect(serialized).not.toMatch(
      /PERSONA SINTETICA PRIVADA|X0000000X|CONCEPTO PRIVADO/iu,
    );
    expect(enriched.workspace.references).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          referenceType: "LIQUIDATION_KEY",
          rawValue: "BASE-PRIVATE-801",
        }),
      ]),
    );
    expect(serialized).toContain("PROHIBITED_UNTIL_REVIEW");
  });

  it("conserva el calendario especializado de una modificación de aplazamiento", async () => {
    const { analysis, result } = await verticalWorkspace(
      DEFERRAL_MODIFICATION_TEXT,
      "7".repeat(64),
    );

    expect(result.workspace.documents[0]?.documentSubtype).toBe(
      "collection.deferral_modification",
    );
    expect(analysis.ephemeralDeferralGrantFacts).not.toBeNull();

    const enriched = enrichVerticalSliceSpecializedFactsV1({
      ownerScope: OWNER,
      createdAt: CREATED_AT,
      workspace: result.workspace,
      documentIds: result.documentIds,
      analysis,
    });

    expect(enriched.status).toBe("APPLIED");
    expect(enriched.workspace.paymentOptions).toHaveLength(1);
    expect(enriched.workspace.documents[0]?.documentSubtype).toBe(
      "collection.deferral_modification",
    );
  });

  it("conserva cada fila de compensación y su efecto sin materializar deuda o pago", async () => {
    const { analysis, result } = await verticalWorkspace(
      OFFSET_TEXT,
      "9".repeat(64),
    );

    const enriched = enrichVerticalSliceSpecializedFactsV1({
      ownerScope: OWNER,
      createdAt: CREATED_AT,
      workspace: result.workspace,
      documentIds: result.documentIds,
      analysis,
    });

    const projection = enriched.workspace.analysisSnapshots[0]?.structuredData
      .administrativeDomain;
    expect(projection?.moneyFacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "CREDIT_TOTAL", amountCents: 102_000 }),
        expect.objectContaining({ kind: "TOTAL_BEFORE_OFFSET", amountCents: 90_000 }),
        expect.objectContaining({ kind: "OFFSET_APPLIED", amountCents: 90_000 }),
        expect.objectContaining({ kind: "REMAINING_AFTER_OFFSET", amountCents: 0 }),
      ]),
    );
    expect(
      projection?.moneyFacts
        .filter(
          (fact) =>
            fact.id.includes(":offset:o:b") &&
            fact.kind === "TOTAL_BEFORE_OFFSET",
        )
        .map((fact) => fact.amountCents),
    ).toEqual([90_000, 70_000]);
    expect(
      enriched.workspace.analysisSnapshots[0]?.structuredData.unknownFields,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          labelRaw: "SPECIALIZED|OFFSET|DEBT|001|EFFECT",
          valueRaw: "TOTAL_EXTINGUISHED_IN_VOLUNTARY_PERIOD",
        }),
        expect.objectContaining({
          labelRaw: "SPECIALIZED|OFFSET|DEBT|002|EFFECT",
          valueRaw: "TOTAL_EXTINGUISHED_IN_VOLUNTARY_PERIOD",
        }),
      ]),
    );
    expect(enriched.workspace.debts).toEqual([]);
    expect(enriched.workspace.obligations).toEqual([]);
    expect(enriched.workspace.timeline).toEqual([]);
    expect(JSON.stringify(enriched.workspace)).not.toMatch(
      /PERSONA SINTETICA PRIVADA|X0000000X|DESCRIPCION PRIVADA|CONCEPTO PRIVADO/iu,
    );
  });

  it("conserva importes y fechas del apremio, pero nunca los datos del sujeto", async () => {
    const { analysis, result } = await verticalWorkspace(
      ENFORCEMENT_TEXT,
      "a".repeat(64),
    );

    const enriched = enrichVerticalSliceSpecializedFactsV1({
      ownerScope: OWNER,
      createdAt: CREATED_AT,
      workspace: result.workspace,
      documentIds: result.documentIds,
      analysis,
    });

    const projection = enriched.workspace.analysisSnapshots[0]?.structuredData
      .administrativeDomain;
    expect(projection?.moneyFacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "OUTSTANDING_PRINCIPAL",
          amountCents: 123_456,
          status: "PROPOSED",
        }),
        expect.objectContaining({
          kind: "EXECUTIVE_SURCHARGE_20",
          amountCents: 24_691,
          status: "PROPOSED",
        }),
      ]),
    );
    expect(JSON.stringify(enriched.workspace)).not.toMatch(
      /PERSONA SINTETICA PRIVADA|12345678Z/iu,
    );
    expect(enriched.workspace.debts).toEqual([]);
    expect(enriched.workspace.paymentOptions).toEqual([]);
    expect(enriched.workspace.deadlineRules).toEqual([]);
  });

  it("ignora hechos especializados amplios cuando la familia autoritativa no es apremio", async () => {
    const base = await analysisFromText(ENFORCEMENT_TEXT, "6".repeat(64));
    expect(base.ephemeralEnforcementMoneyFacts).not.toBeNull();
    const analysis = structuredClone(base) as unknown as {
      ephemeralVerticalSliceReview: {
        documents: Array<{
          reviewDocumentId: string;
          familyId: string;
          title: string;
        }>;
      };
    };
    analysis.ephemeralVerticalSliceReview.documents[0]!.reviewDocumentId =
      "review-document:synthetic-external-debt";
    analysis.ephemeralVerticalSliceReview.documents[0]!.familyId =
      "collection.external_debt";
    analysis.ephemeralVerticalSliceReview.documents[0]!.title =
      "Deuda de otro organismo recaudada por la AEAT";
    const remapped = analysis as unknown as FiscalNotificationLocalAnalysisResult;
    const result = appendFiscalNotificationVerticalSliceReviewV1({
      ownerScope: OWNER,
      reviewId: REVIEW_ID,
      createdAt: CREATED_AT,
      workspace: null,
      analysis: remapped,
    });

    const enriched = enrichVerticalSliceSpecializedFactsV1({
      ownerScope: OWNER,
      createdAt: CREATED_AT,
      workspace: result.workspace,
      documentIds: result.documentIds,
      analysis: remapped,
    });

    expect(enriched.status).toBe("UNCHANGED");
    expect(enriched.workspace.documents[0]).toMatchObject({
      documentSubtype: "collection.external_debt",
    });
    expect(enriched.workspace.documents[0]?.documentType).not.toBe(
      "AEAT_ENFORCEMENT_ORDER",
    );
  });

  it("es idempotente y no contamina una segunda salida", async () => {
    const { analysis, result } = await verticalWorkspace(
      DEFERRAL_TEXT,
      "b".repeat(64),
    );
    const first = enrichVerticalSliceSpecializedFactsV1({
      ownerScope: OWNER,
      createdAt: CREATED_AT,
      workspace: result.workspace,
      documentIds: result.documentIds,
      analysis,
    });
    const replay = enrichVerticalSliceSpecializedFactsV1({
      ownerScope: OWNER,
      createdAt: CREATED_AT,
      workspace: first.workspace,
      documentIds: result.documentIds,
      analysis,
    });

    expect(replay.status).toBe("UNCHANGED");
    expect(replay.workspace.paymentOptions).toHaveLength(5);
    expect(JSON.stringify(replay.workspace)).toBe(JSON.stringify(first.workspace));
    const second = await verticalWorkspace(DEFERRAL_TEXT, "c".repeat(64));
    expect(second.result.workspace.paymentOptions).toEqual([]);
  });

  it("rechaza ownerScope distinto y claves inesperadas sin mutar el workspace", async () => {
    const { analysis, result } = await verticalWorkspace(
      DEFERRAL_TEXT,
      "d".repeat(64),
    );
    const before = structuredClone(result.workspace);
    expect(() =>
      enrichVerticalSliceSpecializedFactsV1({
        ownerScope: "user:00000000-0000-4000-8000-000000000899",
        createdAt: CREATED_AT,
        workspace: result.workspace,
        documentIds: result.documentIds,
        analysis,
      }),
    ).toThrow(FiscalNotificationSpecializedFactsEnrichmentErrorV1);
    const tampered = {
      ...analysis,
      unexpectedRawText: "PERSONA PRIVADA",
    } as unknown as FiscalNotificationLocalAnalysisResult;
    expect(() =>
      enrichVerticalSliceSpecializedFactsV1({
        ownerScope: OWNER,
        createdAt: CREATED_AT,
        workspace: result.workspace,
        documentIds: result.documentIds,
        analysis: tampered,
      }),
    ).toThrow(FiscalNotificationSpecializedFactsEnrichmentErrorV1);
    expect(result.workspace).toEqual(before);
  });
});
