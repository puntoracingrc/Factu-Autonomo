import { describe, expect, it } from "vitest";
import {
  FiscalNotificationInputError,
  type BoundedDocumentInput,
} from "../input-contract";
import { analyzeFiscalNotificationVerticalSliceV1 } from "./vertical-slice-orchestrator.v1";

const OWNER_SCOPE = "user:synthetic-vertical-slice";
const DOCUMENT_ID = "document:synthetic-vertical-slice";

function document(...pagesOrSignal: readonly (string | AbortSignal)[]): BoundedDocumentInput {
  const signal = pagesOrSignal.at(-1) instanceof AbortSignal
    ? pagesOrSignal.at(-1) as AbortSignal
    : undefined;
  const texts = pagesOrSignal.filter((item): item is string => typeof item === "string");
  return Object.freeze({
    ownerScope: OWNER_SCOPE,
    documentId: DOCUMENT_ID,
    pages: Object.freeze(texts.map((text, index) => Object.freeze({
      pageNumber: index + 1,
      text,
      isBlank: text.trim().length === 0,
    }))),
    ...(signal ? { signal } : {}),
  });
}

const PAYMENT_ORDER = [
  "Agencia Tributaria",
  "sede.agenciatributaria.gob.es",
  "CARTA DE PAGO",
  "Clave de liquidación: LQ-SYN-CHAIN-001",
  "Clave de deuda: DEBT-SYN-CHAIN-001",
  "Número de expediente: EXP-SYN-CHAIN-001",
  "N.I.F.: 12345678Z",
  "Importe principal: 1.000,00 euros",
  "Recargo: 200,00 euros",
  "Importe total: 1.200,00 euros",
  "Fecha límite de pago: 30/09/2026",
  "Medio de pago: Cargo en cuenta",
  "Cuenta de cargo: ES12 3456 7890 1234 5678 9012",
].join("\n");

const PAYMENT_RECEIPT = [
  "Agencia Tributaria",
  "sede.agenciatributaria.gob.es",
  "JUSTIFICANTE DE PAGO",
  "Número de justificante: REC-SYN-CHAIN-001",
  "NRC: ABCDEF1234567890GHIJKL",
  "Fecha del pago: 14/07/2026",
  "N.I.F.: 12345678Z",
  "Modelo: 303",
  "Ejercicio: 2026",
  "Periodo: 2T",
  "Clave de liquidación: LQ-SYN-CHAIN-001",
  "Clave de deuda: DEBT-SYN-CHAIN-001",
  "Importe pagado: 600,00 euros",
  "Resultado del pago: Pago parcial",
  "Tipo de pago: Parcial",
].join("\n");

const FORMAL_REQUIREMENT = [
  "Agencia Tributaria",
  "sede.agenciatributaria.gob.es",
  "REQUERIMIENTO DE PRESENTACIÓN DE DECLARACIONES O AUTOLIQUIDACIONES",
  "IDENTIFICACIÓN DEL DOCUMENTO",
  "Número de requerimiento: REQ-SYN-CHAIN-001",
  "Expediente: EXP-SYN-CHAIN-001",
  "N.I.F.: 12345678Z",
  "Nombre y apellidos / Razón social: PERSONA SINTÉTICA",
  "Fecha de emisión: 05/02/2026",
  "Fecha de notificación: 07/02/2026",
  "Motivo del requerimiento: Falta de presentación detectada",
  "Declaraciones o autoliquidaciones no presentadas",
  "MODELO EJERCICIO PERIODO",
  "303 2025 4T",
  "130 2025 4T",
  "Plazo para atender el requerimiento: Diez días hábiles desde el día siguiente a la notificación",
  "Canal de respuesta: Sede electrónica de la AEAT",
  "Documentación a aportar",
  "- Declaración o autoliquidación omitida",
  "Consecuencias del incumplimiento",
  "- Podrá continuar el procedimiento según se indica en el documento",
  "Código Seguro de Verificación (CSV): CSV-SYN-CHAIN-001",
].join("\n");

const ASSESSMENT_PROPOSAL = [
  "Agencia Tributaria",
  "sede.agenciatributaria.gob.es",
  "NOTIFICACIÓN DEL TRÁMITE DE ALEGACIONES Y",
  "PROPUESTA DE LIQUIDACIÓN PROVISIONAL",
  "IDENTIFICACIÓN DEL DOCUMENTO",
  "Número de expediente: EXP-SYN-CHAIN-002",
  "Concepto tributario: Impuesto sobre el Valor Añadido",
  "Modelo: 303",
  "Ejercicio: 2025",
  "Periodo: 4T",
  "N.I.F.: 12345678Z",
  "Nombre y apellidos / Razón social: PERSONA SINTÉTICA",
  "Motivo de la propuesta: Diferencia explícitamente indicada en el documento",
  "Importe declarado: 800,00 euros",
  "Importe considerado: 1.000,00 euros",
  "Base propuesta: 1.000,00 euros",
  "Cuota propuesta: 210,00 euros",
  "Resultado a ingresar: 210,00 euros",
  "Fecha de emisión: 05/02/2026",
  "Fecha de notificación: 07/02/2026",
  "Plazo de alegaciones: Diez días hábiles desde el día siguiente a la notificación",
  "Clave de liquidación: LQ-SYN-CHAIN-002",
  "Requerimiento anterior: REQ-SYN-CHAIN-001",
  "HECHOS Y FUNDAMENTOS DE DERECHO",
  "- Se consigna un hecho sintético explícito",
  "Código Seguro de Verificación (CSV): CSV-SYN-CHAIN-002",
].join("\n");

describe("fiscal notification first vertical-slice orchestrator v1", () => {
  it("segments a payment order and exposes exact review-only fields", async () => {
    const result = await analyzeFiscalNotificationVerticalSliceV1(
      document(PAYMENT_ORDER),
    );

    expect(result).toMatchObject({
      status: "REVIEW_REQUIRED",
      recognizedExtractorIds: ["payment-order"],
      blockedExtractorIds: [],
      retainedSourceContent: "NONE",
      materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
      permitsDebtCreation: false,
      permitsPaymentAction: false,
    });
    expect(result.segmentation.segments).toEqual([
      expect.objectContaining({
        segmentType: "PAYMENT_DOCUMENT",
        detectedTitle: "carta de pago",
      }),
    ]);
    expect(result.extractions.paymentOrder?.paymentOrderFacts).toMatchObject({
      liquidationKey: { printedValue: "LQ-SYN-CHAIN-001" },
      debtKey: { printedValue: "DEBT-SYN-CHAIN-001" },
      paymentState: "ORDERED_NOT_CONFIRMED",
      maskedBankAccount: { maskedValue: "****9012" },
    });
    expect(result.extractions.paymentEvidence).toBeNull();
  });

  it("recognizes a partial receipt without converting it into an automatic action", async () => {
    const result = await analyzeFiscalNotificationVerticalSliceV1(
      document(PAYMENT_RECEIPT),
    );

    expect(result.recognizedExtractorIds).toEqual(["payment-evidence"]);
    expect(result.extractions.paymentEvidence?.paymentEvidenceFacts).toMatchObject({
      paymentState: "PARTIAL",
      debtKey: { printedValue: "DEBT-SYN-CHAIN-001" },
      amountPaid: { amountCents: 60_000 },
    });
    expect(result.extractions.paymentEvidence?.entities).toContainEqual(
      expect.objectContaining({
        entityKind: "PAYMENT_EVENT",
        paymentStatus: "PARTIALLY_PAID",
      }),
    );
    expect(result.permitsPaymentAction).toBe(false);
    expect(result.permitsAccountingAction).toBe(false);
  });

  it("runs the requirement extractor after segmenting the exact main act", async () => {
    const result = await analyzeFiscalNotificationVerticalSliceV1(
      document(FORMAL_REQUIREMENT),
    );

    expect(result.recognizedExtractorIds).toEqual(["requirement"]);
    expect(result.segmentation.segments[0]).toMatchObject({
      segmentType: "MAIN_ADMINISTRATIVE_ACT",
      pageFrom: 1,
      pageTo: 1,
    });
    expect(
      result.extractions.formalFilingRequirement?.requirementFacts,
    ).toMatchObject({
      requirementNumber: { printedValue: "REQ-SYN-CHAIN-001" },
      obligations: [
        { model: "303", fiscalYear: "2025", period: "4T" },
        { model: "130", fiscalYear: "2025", period: "4T" },
      ],
    });
  });

  it("segments and extracts an allegations proposal without inventing a debt", async () => {
    const result = await analyzeFiscalNotificationVerticalSliceV1(
      document(ASSESSMENT_PROPOSAL),
    );

    expect(result.recognizedExtractorIds).toEqual(["assessment"]);
    expect(result.segmentation.segments[0]).toMatchObject({
      segmentType: "MAIN_ADMINISTRATIVE_ACT",
      detectedTitle: "notificacion del tramite de alegaciones y",
    });
    expect(result.extractions.assessment?.assessmentFacts).toMatchObject({
      stage: "ALLEGATIONS_AND_PROVISIONAL_ASSESSMENT_PROPOSAL",
      expediente: { printedValue: "EXP-SYN-CHAIN-002" },
      priorRequirementReference: { printedValue: "REQ-SYN-CHAIN-001" },
    });
    expect(result.extractions.assessment?.entities).not.toContainEqual(
      expect.objectContaining({ entityKind: "DEBT_CLAIM" }),
    );
  });

  it("keeps a cover and generic instructions outside factual extraction", async () => {
    const result = await analyzeFiscalNotificationVerticalSliceV1(document(
      "Notificación electrónica\nDirección Electrónica Habilitada Única",
      PAYMENT_ORDER,
      "Instrucciones generales\nNO_RETENER_ESTE_TEXTO_BRUTO",
    ));

    expect(result.segmentation.segments.map((segment) => segment.segmentType)).toEqual([
      "NOTIFICATION_COVER",
      "PAYMENT_DOCUMENT",
      "GENERIC_INSTRUCTIONS",
    ]);
    expect(result.extractions.paymentOrder?.paymentOrderFacts.moneyFacts).toEqual([
      expect.objectContaining({ role: "PRINCIPAL", amountCents: 100_000 }),
      expect.objectContaining({ role: "SURCHARGE", amountCents: 20_000 }),
      expect.objectContaining({ role: "TOTAL_DUE", amountCents: 120_000 }),
    ]);
    expect(JSON.stringify(result)).not.toContain("NO_RETENER_ESTE_TEXTO_BRUTO");
  });

  it("returns information pending for an unsupported document without inventing facts", async () => {
    const result = await analyzeFiscalNotificationVerticalSliceV1(document(
      "Agencia Tributaria\nComunicación informativa sintética",
    ));

    expect(result.status).toBe("INFORMATION_PENDING");
    expect(result.recognizedExtractorIds).toEqual([]);
    expect(result.extractions).toEqual({
      formalFilingRequirement: null,
      assessment: null,
      paymentOrder: null,
      paymentEvidence: null,
    });
  });

  it("is deterministic, immutable and does not mutate the bounded input", async () => {
    const source = document(PAYMENT_ORDER);
    const before = structuredClone(source);
    const first = await analyzeFiscalNotificationVerticalSliceV1(source);
    const second = await analyzeFiscalNotificationVerticalSliceV1(source);

    expect(first).toEqual(second);
    expect(source).toEqual(before);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.extractions)).toBe(true);
    expect(Object.isFrozen(first.recognizedExtractorIds)).toBe(true);
  });

  it("fails closed on cancellation and malformed unfrozen inputs", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      analyzeFiscalNotificationVerticalSliceV1(
        document(PAYMENT_ORDER, controller.signal),
      ),
    ).rejects.toMatchObject({ code: "ABORTED" });
    await expect(
      analyzeFiscalNotificationVerticalSliceV1({
        ownerScope: OWNER_SCOPE,
        documentId: DOCUMENT_ID,
        pages: [{ pageNumber: 1, text: PAYMENT_ORDER, isBlank: false }],
      }),
    ).rejects.toBeInstanceOf(FiscalNotificationInputError);
  });
});
