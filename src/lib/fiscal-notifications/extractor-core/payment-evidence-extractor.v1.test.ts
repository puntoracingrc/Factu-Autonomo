import { describe, expect, it } from "vitest";
import { type BoundedDocumentInput, FiscalNotificationInputError } from "../input-contract";
import { createDocumentSegmentV1, type DocumentSegmentTypeV1, type DocumentSegmentV1 } from "./document-segment.v1";
import { segmentFiscalNotificationDocumentV1 } from "./document-segmenter.v1";
import {
  PAYMENT_EVIDENCE_EXTRACTOR_RELEASE_V1,
  extractPaymentEvidenceV1,
} from "./payment-evidence-extractor.v1";

const OWNER_SCOPE = "user:synthetic-payment-evidence";
const DOCUMENT_ID = "document:synthetic-payment-evidence";
const RAW_ACCOUNT = "ES12 3456 7890 1234 5678 9012";
const VALID_NRC = "ABCDEF1234567890GHIJKL";

const FULL_PAYMENT_RECEIPT = [
  "Agencia Tributaria",
  "sede.agenciatributaria.gob.es",
  "JUSTIFICANTE DE PAGO",
  "Número de justificante: REC-SYN-001",
  `NRC: ${VALID_NRC}`,
  "Fecha del pago: 14/07/2026",
  "Hora del pago: 10:42:18",
  "N.I.F.: 12345678Z",
  "Modelo: 303",
  "Ejercicio: 2026",
  "Periodo: 2T",
  "Clave de liquidación: LQ-SYN-001",
  "Clave de deuda: DEBT-SYN-001",
  "Importe pagado: 1.234,56 euros",
  "Entidad colaboradora: BANCO SINTÉTICO",
  "Medio de pago: Cargo en cuenta",
  "Resultado del pago: Pago realizado",
  "Tipo de pago: Total",
  `Cuenta de cargo: ${RAW_ACCOUNT}`,
].join("\n");

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

function segment(
  type: DocumentSegmentTypeV1,
  pageFrom: number,
  pageTo = pageFrom,
  suffix = String(pageFrom),
  authority: "AEAT" | "UNKNOWN" = "AEAT",
  detectedTitle?: string,
): DocumentSegmentV1 {
  return createDocumentSegmentV1({
    segmentId: `segment:${suffix}`,
    documentId: DOCUMENT_ID,
    segmentType: type,
    pageFrom,
    pageTo,
    detectedTitle: detectedTitle ?? (type === "PAYMENT_DOCUMENT" ? "justificante de pago" : "contenido auxiliar sintético"),
    detectedAuthority: authority,
    classificationConfidence: 1,
    extractionStatus: "EXTRACTED_REVIEW_REQUIRED",
    contentHash: `sha256:${suffix.padEnd(64, "a").slice(0, 64)}`,
    canGenerateAdministrativeFacts: ["MAIN_ADMINISTRATIVE_ACT", "DEBT_LIST", "PAYMENT_DOCUMENT"].includes(type),
  });
}

describe("payment evidence extractor v1", () => {
  it("runs after the closed document segmenter without manually supplied family data", async () => {
    const source = document(FULL_PAYMENT_RECEIPT);
    const segmentation = await segmentFiscalNotificationDocumentV1({
      ownerScope: OWNER_SCOPE,
      documentId: DOCUMENT_ID,
      pages: source.pages.map((page) => ({
        pageNumber: page.pageNumber,
        normalizedLines: page.text.split("\n").map((line) => line
          .normalize("NFD")
          .replace(/\p{M}/gu, "")
          .toLowerCase()),
        isBlank: page.isBlank,
      })),
    });

    expect(segmentation.segments).toEqual([
      expect.objectContaining({ segmentType: "PAYMENT_DOCUMENT", detectedTitle: "justificante de pago" }),
    ]);
    const output = extractPaymentEvidenceV1({
      document: source,
      segments: segmentation.segments,
    });
    expect(output.paymentEvidenceFacts.paymentState).toBe("CONFIRMED");
    expect(output.familyCandidates[0]?.familyId).toBe("payment.receipt");
  });

  it("extracts a complete receipt and exposes a review-only confirmed payment", () => {
    const output = extractPaymentEvidenceV1({
      document: document(FULL_PAYMENT_RECEIPT),
      segments: [segment("PAYMENT_DOCUMENT", 1)],
    });

    expect(output.status).toBe("REVIEW_REQUIRED");
    expect(output.familyCandidates).toEqual([
      expect.objectContaining({ familyId: "payment.receipt", confidence: 1 }),
    ]);
    expect(output.paymentEvidenceFacts).toMatchObject({
      documentKind: "JUSTIFICANTE_DE_PAGO",
      paymentState: "CONFIRMED",
      stateBasis: "EXPLICIT_RESULT",
      receiptNumber: { printedValue: "REC-SYN-001" },
      nrc: { printedValue: VALID_NRC },
      paymentDate: { printedValue: "14/07/2026" },
      paymentTime: { printedValue: "10:42:18" },
      taxId: { printedValue: "12345678Z" },
      model: { printedValue: "303" },
      fiscalYear: { printedValue: "2026" },
      period: { printedValue: "2T" },
      liquidationKey: { printedValue: "LQ-SYN-001" },
      debtKey: { printedValue: "DEBT-SYN-001" },
      amountPaid: { printedValue: "1.234,56 euros", amountCents: 123_456 },
      collaboratingEntity: { printedValue: "BANCO SINTÉTICO" },
      paymentMedium: { printedValue: "Cargo en cuenta" },
      result: { printedValue: "Pago realizado" },
      paymentScope: { printedValue: "Total" },
      maskedBankAccount: { maskedValue: "****9012", disclosurePolicy: "MASKED_LAST_FOUR_ONLY" },
    });
    expect(output.references).toEqual(expect.arrayContaining([
      expect.objectContaining({ referenceType: "PAYMENT_RECEIPT_ID", normalizedValue: "REC-SYN-001" }),
      expect.objectContaining({ referenceType: "NRC", normalizedValue: VALID_NRC }),
      expect.objectContaining({ referenceType: "LIQUIDATION_KEY", normalizedValue: "LQ-SYN-001" }),
      expect.objectContaining({ referenceType: "DEBT_KEY", normalizedValue: "DEBT-SYN-001" }),
    ]));
    expect(output.monetaryComponents).toEqual([
      expect.objectContaining({ componentType: "TOTAL_PAID", amountCents: 123_456, explicitlyPrinted: true }),
    ]);
    expect(output.proceduralDates).toEqual([
      expect.objectContaining({ dateType: "PAYMENT_DATE", parsedDate: "2026-07-14", legallyComputed: false }),
    ]);
    expect(output.entities).toEqual(expect.arrayContaining([
      expect.objectContaining({ entityKind: "ADMINISTRATIVE_ACT", familyId: "payment.receipt" }),
      expect.objectContaining({ entityKind: "PAYMENT_EVENT", paymentStatus: "PAID" }),
      expect.objectContaining({ entityKind: "PARTY", roles: ["PAYER"] }),
      expect.objectContaining({ entityKind: "PARTY", roles: ["FINANCIAL_ENTITY"] }),
    ]));
    expect(output).toMatchObject({
      retainedSourceContent: "NONE",
      paymentStatePolicy: "ONLY_POSITIVE_PRINTED_EVIDENCE_CAN_CONFIRM_PAYMENT",
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
      permitsDebtCreation: false,
      permitsDeadlineCreation: false,
      permitsPaymentAction: false,
      permitsAccountingAction: false,
    });
  });

  it("confirms a titled receipt from a valid NRC plus printed date and amount", () => {
    const withoutResult = FULL_PAYMENT_RECEIPT.replace("Resultado del pago: Pago realizado\n", "");
    const output = extractPaymentEvidenceV1({
      document: document(withoutResult),
      segments: [segment("PAYMENT_DOCUMENT", 1)],
    });

    expect(output.paymentEvidenceFacts).toMatchObject({
      paymentState: "CONFIRMED",
      stateBasis: "EXPLICIT_RECEIPT_WITH_VALID_NRC_AND_CORE_FIELDS",
    });
    expect(output.entities).toContainEqual(expect.objectContaining({ paymentStatus: "PAID" }));
  });

  it("confirms a complete non-NRC receipt only when its core printed fields are present", () => {
    const bankReceipt = FULL_PAYMENT_RECEIPT
      .replace("JUSTIFICANTE DE PAGO", "RECIBO DE PAGO")
      .replace(`NRC: ${VALID_NRC}\n`, "")
      .replace("Resultado del pago: Pago realizado\n", "");
    const output = extractPaymentEvidenceV1({
      document: document(bankReceipt),
      segments: [segment("PAYMENT_DOCUMENT", 1, 1, "b", "AEAT", "recibo de pago")],
    });

    expect(output.paymentEvidenceFacts).toMatchObject({
      documentKind: "RECIBO_DE_PAGO",
      paymentState: "CONFIRMED",
      stateBasis: "EXPLICIT_RECEIPT_WITH_COMPLETE_CORE_FIELDS",
      nrc: null,
    });
  });

  it("maps an explicit partial payment to a partial event and amount", () => {
    const output = extractPaymentEvidenceV1({
      document: document(FULL_PAYMENT_RECEIPT
        .replace("Resultado del pago: Pago realizado", "Resultado del pago: Pago parcial")
        .replace("Tipo de pago: Total", "Tipo de pago: Parcial")),
      segments: [segment("PAYMENT_DOCUMENT", 1)],
    });

    expect(output.paymentEvidenceFacts.paymentState).toBe("PARTIAL");
    expect(output.entities).toContainEqual(expect.objectContaining({ paymentStatus: "PARTIALLY_PAID" }));
    expect(output.monetaryComponents).toEqual([
      expect.objectContaining({ componentType: "PARTIAL_PAYMENT", amountCents: 123_456 }),
    ]);
  });

  it("classifies an explicit rejection and keeps its reason without representing money as paid", () => {
    const rejected = FULL_PAYMENT_RECEIPT
      .replace("Resultado del pago: Pago realizado", "Resultado del pago: Pago rechazado")
      .replace("Tipo de pago: Total", "Motivo del rechazo: Cuenta no operativa");
    const output = extractPaymentEvidenceV1({
      document: document(rejected),
      segments: [segment("PAYMENT_DOCUMENT", 1)],
    });

    expect(output.familyCandidates[0]?.familyId).toBe("payment.failed_or_reversed");
    expect(output.paymentEvidenceFacts).toMatchObject({
      paymentState: "REJECTED",
      rejectionReason: { printedValue: "Cuenta no operativa" },
    });
    expect(output.entities).toContainEqual(expect.objectContaining({ paymentStatus: "REJECTED" }));
    expect(output.monetaryComponents).toEqual([]);
  });

  it.each([
    ["Pago iniciado", "ATTEMPTED", "payment.receipt", "ATTEMPTED"],
    ["Pago anulado", "CANCELLED", "payment.failed_or_reversed", "ANNULLED"],
    ["Pago devuelto", "RETURNED", "payment.failed_or_reversed", "RETURNED"],
  ] as const)("maps %s without inventing settlement", (literal, state, familyId, domainStatus) => {
    const extra = state === "RETURNED" ? "\nFecha de devolución: 15/07/2026" : "";
    const output = extractPaymentEvidenceV1({
      document: document(`${FULL_PAYMENT_RECEIPT.replace("Pago realizado", literal)}${extra}`),
      segments: [segment("PAYMENT_DOCUMENT", 1)],
    });

    expect(output.paymentEvidenceFacts.paymentState).toBe(state);
    expect(output.familyCandidates[0]?.familyId).toBe(familyId);
    expect(output.entities).toContainEqual(expect.objectContaining({ paymentStatus: domainStatus }));
    expect(output.monetaryComponents).toEqual([]);
  });

  it("keeps an incomplete receipt visible as UNKNOWN without a paid event", () => {
    const incomplete = [
      "Agencia Tributaria",
      "JUSTIFICANTE DE PAGO",
      "Número de justificante: REC-SYN-INCOMPLETE",
      "Fecha del pago: 14/07/2026",
    ].join("\n");
    const output = extractPaymentEvidenceV1({
      document: document(incomplete),
      segments: [segment("PAYMENT_DOCUMENT", 1)],
    });

    expect(output.familyCandidates[0]).toMatchObject({ familyId: "payment.receipt", confidence: 0.9 });
    expect(output.paymentEvidenceFacts).toMatchObject({
      documentKind: "JUSTIFICANTE_DE_PAGO",
      paymentState: "UNKNOWN",
      receiptNumber: { printedValue: "REC-SYN-INCOMPLETE" },
    });
    expect(output.warnings).toContain("MISSING_EXPLICIT_PAYMENT_STATUS_OR_CORE_RECEIPT_EVIDENCE");
    expect(output.entities).not.toContainEqual(expect.objectContaining({ entityKind: "PAYMENT_EVENT" }));
  });

  it("fails closed on conflicting printed payment states", () => {
    const output = extractPaymentEvidenceV1({
      document: document(FULL_PAYMENT_RECEIPT.replace(
        "Resultado del pago: Pago realizado",
        "Resultado del pago: Pago realizado\nEstado del pago: Pago devuelto",
      )),
      segments: [segment("PAYMENT_DOCUMENT", 1)],
    });

    expect(output.paymentEvidenceFacts.paymentState).toBe("UNKNOWN");
    expect(output.warnings).toContain("CONFLICTING_PAYMENT_RESULT");
    expect(output.entities).not.toContainEqual(expect.objectContaining({ entityKind: "PAYMENT_EVENT" }));
  });

  it("does not accept a payment order as evidence even if it prints an NRC", () => {
    const output = extractPaymentEvidenceV1({
      document: document(`Agencia Tributaria\nCARTA DE PAGO\nNRC: ${VALID_NRC}\nImporte: 10,00 euros`),
      segments: [segment("PAYMENT_DOCUMENT", 1, 1, "c", "AEAT", "carta de pago")],
    });

    expect(output).toMatchObject({
      status: "BLOCKED",
      warnings: ["PAYMENT_ORDER_IS_NOT_PAYMENT_EVIDENCE"],
      familyCandidates: [],
      entities: [],
    });
  });

  it("blocks an incompatible authority and a guide quoting a receipt title", () => {
    const regional = extractPaymentEvidenceV1({
      document: document(FULL_PAYMENT_RECEIPT.replace("Agencia Tributaria", "Agencia Tributaria Canaria")),
      segments: [segment("PAYMENT_DOCUMENT", 1)],
    });
    const guide = extractPaymentEvidenceV1({
      document: document(`Guía de ejemplo\n${FULL_PAYMENT_RECEIPT}`),
      segments: [segment("PAYMENT_DOCUMENT", 1)],
    });

    expect(regional).toMatchObject({ status: "BLOCKED", warnings: ["CONFLICTING_AUTHORITY_OR_TERRITORY"] });
    expect(guide).toMatchObject({ status: "BLOCKED", warnings: ["CONFLICTING_NON_DOCUMENT_GUIDE"] });
  });

  it("retains invalid NRC and non-positive amount for review but never confirms payment", () => {
    const output = extractPaymentEvidenceV1({
      document: document(FULL_PAYMENT_RECEIPT
        .replace(VALID_NRC, "NRC-INVALIDO")
        .replace("1.234,56 euros", "-10,00 euros")
        .replace("Resultado del pago: Pago realizado\n", "")
        .replace("Entidad colaboradora: BANCO SINTÉTICO\n", "")
        .replace("Medio de pago: Cargo en cuenta\n", "")),
      segments: [segment("PAYMENT_DOCUMENT", 1)],
    });

    expect(output.paymentEvidenceFacts).toMatchObject({
      paymentState: "UNKNOWN",
      nrc: { printedValue: "NRC-INVALIDO" },
      amountPaid: { sign: "NEGATIVE", amountCents: 1_000 },
    });
    expect(output.warnings).toEqual(expect.arrayContaining([
      "INVALID_PRINTED_NRC",
      "NON_POSITIVE_PAYMENT_AMOUNT",
      "MISSING_EXPLICIT_PAYMENT_STATUS_OR_CORE_RECEIPT_EVIDENCE",
    ]));
    expect(output.references).not.toContainEqual(expect.objectContaining({ referenceType: "NRC" }));
    expect(output.entities).not.toContainEqual(expect.objectContaining({ entityKind: "PAYMENT_EVENT" }));
  });

  it("never turns a non-positive printed amount into paid money even with an explicit success result", () => {
    const output = extractPaymentEvidenceV1({
      document: document(FULL_PAYMENT_RECEIPT.replace("1.234,56 euros", "-10,00 euros")),
      segments: [segment("PAYMENT_DOCUMENT", 1)],
    });

    expect(output.paymentEvidenceFacts).toMatchObject({
      paymentState: "CONFIRMED",
      stateBasis: "EXPLICIT_RESULT",
      amountPaid: { sign: "NEGATIVE", amountCents: 1_000 },
    });
    expect(output.warnings).toContain("NON_POSITIVE_PAYMENT_AMOUNT");
    expect(output.monetaryComponents).toEqual([]);
    expect(output.entities).toContainEqual(expect.objectContaining({
      entityKind: "PAYMENT_EVENT",
      paymentStatus: "PAID",
      monetaryComponents: [],
    }));
  });

  it("does not promote fields printed only in generic instructions", () => {
    const payment = FULL_PAYMENT_RECEIPT
      .replace("Entidad colaboradora: BANCO SINTÉTICO\n", "")
      .replace(`Cuenta de cargo: ${RAW_ACCOUNT}`, "");
    const output = extractPaymentEvidenceV1({
      document: document(payment, "Entidad colaboradora: BANCO INCORRECTO\nCuenta de cargo: ES00 0000 0000 0000 0000 9999"),
      segments: [
        segment("PAYMENT_DOCUMENT", 1),
        segment("GENERIC_INSTRUCTIONS", 2, 2, "d"),
      ],
    });

    expect(output.paymentEvidenceFacts.collaboratingEntity).toBeNull();
    expect(output.paymentEvidenceFacts.maskedBankAccount).toBeNull();
  });

  it("rejects unknown keys and observes cancellation", () => {
    const valid = {
      document: document(FULL_PAYMENT_RECEIPT),
      segments: [segment("PAYMENT_DOCUMENT", 1)],
    };
    expect(() => extractPaymentEvidenceV1({ ...valid, hiddenPii: "forbidden" } as never)).toThrowError(
      expect.objectContaining<Partial<FiscalNotificationInputError>>({ code: "INVALID_INPUT", path: "paymentEvidenceInput.$shape" }),
    );
    const controller = new AbortController();
    controller.abort();
    expect(() => extractPaymentEvidenceV1({
      document: document(FULL_PAYMENT_RECEIPT, controller.signal),
      segments: valid.segments,
    })).toThrowError(expect.objectContaining<Partial<FiscalNotificationInputError>>({ code: "ABORTED" }));
  });

  it("is deterministic, non-mutating and immutable without retaining the raw account", () => {
    const input = Object.freeze({
      document: document(FULL_PAYMENT_RECEIPT),
      segments: Object.freeze([segment("PAYMENT_DOCUMENT", 1)]),
    });
    const before = JSON.stringify(input);
    const first = extractPaymentEvidenceV1(input);
    const second = extractPaymentEvidenceV1(input);

    expect(first).toEqual(second);
    expect(JSON.stringify(input)).toBe(before);
    expect(JSON.stringify(first)).not.toContain(RAW_ACCOUNT);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.paymentEvidenceFacts)).toBe(true);
    expect(Object.isFrozen(first.monetaryComponents)).toBe(true);
    expect(() => (first.monetaryComponents as unknown as unknown[]).push({})).toThrow();
  });

  it("publishes official context and strict evidence policies", () => {
    expect(PAYMENT_EVIDENCE_EXTRACTOR_RELEASE_V1).toMatchObject({
      version: "1.0.0",
      sourcePriority: "DOCUMENT_LITERAL_CONTROLS_FACTS",
      confirmationPolicy: "VALID_NRC_OR_COMPLETE_RECEIPT_CORE_OR_EXPLICIT_RESULT_REQUIRED",
      negativeEvidencePolicy: "ABSENCE_OF_RECEIPT_NEVER_MEANS_NONPAYMENT",
      accountPolicy: "MASK_LAST_FOUR_AND_DISCARD_RAW_VALUE",
      actionPolicy: "NO_DEBT_PAYMENT_DEADLINE_OR_ACCOUNTING_ACTION",
    });
    expect(PAYMENT_EVIDENCE_EXTRACTOR_RELEASE_V1.officialInterpretationSources).toEqual([
      expect.objectContaining({ sourceId: "aeat.payment.nrc", url: expect.stringContaining("agenciatributaria.gob.es") }),
      expect.objectContaining({ sourceId: "aeat.payment.previous", url: expect.stringContaining("agenciatributaria.gob.es") }),
      expect.objectContaining({ sourceId: "aeat.payment.history", url: expect.stringContaining("agenciatributaria.gob.es") }),
      expect.objectContaining({ sourceId: "boe.rgr.article.41", url: expect.stringContaining("BOE-A-2005-14803") }),
      expect.objectContaining({ sourceId: "boe.order.eha-2027-2007", url: expect.stringContaining("BOE-A-2007-13223") }),
    ]);
  });
});
