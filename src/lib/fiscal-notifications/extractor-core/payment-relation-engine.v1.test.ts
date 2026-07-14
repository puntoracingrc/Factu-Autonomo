import { describe, expect, it } from "vitest";
import { type BoundedDocumentInput, FiscalNotificationInputError } from "../input-contract";
import { createDocumentSegmentV1, type DocumentSegmentV1 } from "./document-segment.v1";
import { extractPaymentEvidenceV1 } from "./payment-evidence-extractor.v1";
import { extractPaymentOrderV1 } from "./payment-order-extractor.v1";
import {
  PAYMENT_RELATION_ENGINE_RELEASE_V1,
  linkPaymentOrderToEvidenceV1,
} from "./payment-relation-engine.v1";

const OWNER = "user:synthetic-payment-relations";
const CREATED_AT = "2026-07-14T20:00:00.000Z";
const VALID_NRC = "ABCDEF1234567890GHIJKL";

const ORDER_TEXT = [
  "Agencia Tributaria",
  "CARTA DE PAGO",
  "Número de justificante: PAY-REF-SYN-001",
  "Clave de liquidación: LQ-SYN-001",
  "Clave de deuda: DEBT-SYN-001",
  "Modelo: 303",
  "Ejercicio: 2026",
  "Periodo: 2T",
  "NIF: 12345678Z",
  "Principal: 100,00 euros",
  "Importe total: 100,00 euros",
].join("\n");

const EVIDENCE_TEXT = [
  "Agencia Tributaria",
  "JUSTIFICANTE DE PAGO",
  "Número de justificante: PAY-REF-SYN-001",
  `NRC: ${VALID_NRC}`,
  "Fecha del pago: 14/07/2026",
  "NIF: 12345678Z",
  "Modelo: 303",
  "Ejercicio: 2026",
  "Periodo: 2T",
  "Clave de liquidación: LQ-SYN-001",
  "Clave de deuda: DEBT-SYN-001",
  "Importe pagado: 100,00 euros",
  "Entidad colaboradora: BANCO SINTÉTICO",
  "Medio de pago: Cargo en cuenta",
  "Resultado del pago: Pago realizado",
  "Tipo de pago: Total",
].join("\n");

function document(ownerScope: string, documentId: string, text: string): BoundedDocumentInput {
  return Object.freeze({
    ownerScope,
    documentId,
    pages: Object.freeze([Object.freeze({ pageNumber: 1, text, isBlank: false })]),
  });
}

function segment(documentId: string, title: string, suffix: string): DocumentSegmentV1 {
  return createDocumentSegmentV1({
    segmentId: `segment:${suffix}`,
    documentId,
    segmentType: "PAYMENT_DOCUMENT",
    pageFrom: 1,
    pageTo: 1,
    detectedTitle: title,
    detectedAuthority: "AEAT",
    classificationConfidence: 1,
    extractionStatus: "EXTRACTED_REVIEW_REQUIRED",
    contentHash: `sha256:${suffix === "order" ? "a".repeat(64) : "b".repeat(64)}`,
    canGenerateAdministrativeFacts: true,
  });
}

function order(text = ORDER_TEXT, ownerScope = OWNER, title = "carta de pago") {
  const documentId = "document:synthetic-order";
  return extractPaymentOrderV1({
    document: document(ownerScope, documentId, text),
    segments: [segment(documentId, title, "order")],
  });
}

function evidence(text = EVIDENCE_TEXT, ownerScope = OWNER) {
  const documentId = "document:synthetic-evidence";
  return extractPaymentEvidenceV1({
    document: document(ownerScope, documentId, text),
    segments: [segment(documentId, "justificante de pago", "evidence")],
  });
}

function link(orderOutput = order(), evidenceOutput = evidence()) {
  return linkPaymentOrderToEvidenceV1({
    ownerScope: OWNER,
    order: orderOutput,
    evidence: evidenceOutput,
    createdAt: CREATED_AT,
  });
}

describe("payment order-to-evidence relation engine v1", () => {
  it("links a confirmed receipt to the printed debt by exact references", () => {
    const result = link();

    expect(result).toMatchObject({
      status: "LINKED_REVIEW_REQUIRED",
      reason: "EXPLICIT_REFERENCE_LINK",
      matchedKeys: ["DEBT_KEY", "LIQUIDATION_KEY", "PAYMENT_REFERENCE"],
      corroboratingKeys: ["AMOUNT", "FISCAL_YEAR", "MODEL", "NIF", "TAX_PERIOD"],
      contradictions: [],
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
      automaticEffect: "NONE",
      retainedSourceContent: "NONE",
    });
    expect(result.relationships).toEqual([
      expect.objectContaining({ relationType: "REFERENCES", confidenceLevel: "EXPLICIT_REFERENCE", createdAutomatically: true }),
      expect.objectContaining({ relationType: "PAYS", confidenceLevel: "EXPLICIT_REFERENCE", createdAutomatically: true }),
    ]);
    expect(result.relationships.every((item) => item.userConfirmed === false)).toBe(true);
  });

  it("links a literal partial payment with PARTIALLY_PAYS", () => {
    const partial = evidence(EVIDENCE_TEXT
      .replace("Importe pagado: 100,00 euros", "Importe pagado: 40,00 euros")
      .replace("Resultado del pago: Pago realizado", "Resultado del pago: Pago parcial")
      .replace("Tipo de pago: Total", "Tipo de pago: Parcial"));
    const result = link(order(), partial);

    expect(result.status).toBe("LINKED_REVIEW_REQUIRED");
    expect(result.contradictions).toEqual([]);
    expect(result.corroboratingKeys).toContain("AMOUNT");
    expect(result.relationships).toContainEqual(expect.objectContaining({ relationType: "PARTIALLY_PAYS" }));
  });

  it.each([
    ["Pago iniciado", "PAYMENT_ATTEMPT_FOR"],
    ["Pago rechazado", "PAYMENT_REJECTED_FOR"],
    ["Pago devuelto", "PAYMENT_RETURNED_FOR"],
  ] as const)("maps %s to its exact operational relation", (printedState, relationType) => {
    const extra = printedState === "Pago devuelto" ? "\nFecha de devolución: 15/07/2026" : "";
    const result = link(order(), evidence(`${EVIDENCE_TEXT.replace("Pago realizado", printedState)}${extra}`));

    expect(result.status).toBe("LINKED_REVIEW_REQUIRED");
    expect(result.relationships).toContainEqual(expect.objectContaining({ relationType }));
    expect(result.relationships).not.toContainEqual(expect.objectContaining({ relationType: "PAYS" }));
  });

  it("does not invent a settlement relation for a cancelled payment", () => {
    const result = link(order(), evidence(EVIDENCE_TEXT.replace("Pago realizado", "Pago anulado")));

    expect(result.relationships).toEqual([
      expect.objectContaining({ relationType: "REFERENCES" }),
    ]);
    expect(result.warnings).toEqual(["CANCELLED_PAYMENT_HAS_NO_SAFE_SETTLEMENT_RELATION"]);
  });

  it("links only the documents when the receipt state is unknown", () => {
    const incomplete = EVIDENCE_TEXT
      .replace(`NRC: ${VALID_NRC}\n`, "")
      .replace("Importe pagado: 100,00 euros\n", "")
      .replace("Entidad colaboradora: BANCO SINTÉTICO\n", "")
      .replace("Medio de pago: Cargo en cuenta\n", "")
      .replace("Resultado del pago: Pago realizado\n", "");
    const result = link(order(), evidence(incomplete));

    expect(result.status).toBe("LINKED_REVIEW_REQUIRED");
    expect(result.relationships).toEqual([expect.objectContaining({ relationType: "REFERENCES" })]);
    expect(result.warnings).toEqual(["PAYMENT_STATE_UNKNOWN_NO_SETTLEMENT_RELATION"]);
  });

  it("does not link on NIF, model, period and amount alone", () => {
    const withoutStrongReferences = EVIDENCE_TEXT
      .replace("Número de justificante: PAY-REF-SYN-001\n", "")
      .replace("Clave de liquidación: LQ-SYN-001\n", "")
      .replace("Clave de deuda: DEBT-SYN-001\n", "");
    const result = link(order(), evidence(withoutStrongReferences));

    expect(result).toMatchObject({
      status: "INFORMATION_PENDING",
      reason: "NO_SHARED_EXPLICIT_REFERENCE",
      matchedKeys: [],
      corroboratingKeys: ["AMOUNT", "FISCAL_YEAR", "MODEL", "NIF", "TAX_PERIOD"],
      relationships: [],
    });
  });

  it.each([
    ["Clave de deuda: DEBT-SYN-001", "Clave de deuda: DEBT-OTHER", "DEBT_KEY_MISMATCH"],
    ["Clave de liquidación: LQ-SYN-001", "Clave de liquidación: LQ-OTHER", "LIQUIDATION_KEY_MISMATCH"],
  ] as const)("blocks a strong reference conflict: %s", (from, to, contradiction) => {
    const result = link(order(), evidence(EVIDENCE_TEXT.replace(from, to)));

    expect(result.status).toBe("CONFLICTING_REVIEW_REQUIRED");
    expect(result.reason).toBe("EXPLICIT_REFERENCE_OR_FACT_CONFLICT");
    expect(result.contradictions).toContain(contradiction);
    expect(result.relationships).toEqual([
      expect.objectContaining({ confidenceLevel: "CONFLICTING", createdAutomatically: false }),
    ]);
    expect(result.relationships).not.toContainEqual(expect.objectContaining({ relationType: "PAYS" }));
  });

  it("does not treat two different document receipt numbers as a contradiction when debt references match", () => {
    const result = link(order(), evidence(EVIDENCE_TEXT.replace(
      "Número de justificante: PAY-REF-SYN-001",
      "Número de justificante: PAY-REF-OTHER",
    )));

    expect(result.status).toBe("LINKED_REVIEW_REQUIRED");
    expect(result.matchedKeys).toEqual(["DEBT_KEY", "LIQUIDATION_KEY"]);
    expect(result.contradictions).toEqual([]);
    expect(result.relationships).toContainEqual(expect.objectContaining({ relationType: "PAYS" }));
  });

  it.each([
    ["NIF: 12345678Z", "NIF: B00000000", "NIF_MISMATCH"],
    ["Modelo: 303", "Modelo: 111", "MODEL_MISMATCH"],
    ["Ejercicio: 2026", "Ejercicio: 2025", "FISCAL_YEAR_MISMATCH"],
    ["Periodo: 2T", "Periodo: 1T", "TAX_PERIOD_MISMATCH"],
  ] as const)("blocks a corroborating identity conflict: %s", (from, to, contradiction) => {
    const result = link(order(), evidence(EVIDENCE_TEXT.replace(from, to)));

    expect(result.status).toBe("CONFLICTING_REVIEW_REQUIRED");
    expect(result.matchedKeys.length).toBeGreaterThan(0);
    expect(result.contradictions).toContain(contradiction);
    expect(result.relationships).not.toContainEqual(expect.objectContaining({ relationType: "PAYS" }));
  });

  it("blocks a total payment whose printed amount differs from the order total", () => {
    const result = link(order(), evidence(EVIDENCE_TEXT.replace("100,00 euros", "99,00 euros")));

    expect(result.status).toBe("CONFLICTING_REVIEW_REQUIRED");
    expect(result.contradictions).toContain("TOTAL_PAYMENT_AMOUNT_MISMATCH");
    expect(result.relationships).not.toContainEqual(expect.objectContaining({ relationType: "PAYS" }));
  });

  it("blocks a partial payment greater than the order total", () => {
    const partial = evidence(EVIDENCE_TEXT
      .replace("Importe pagado: 100,00 euros", "Importe pagado: 120,00 euros")
      .replace("Resultado del pago: Pago realizado", "Resultado del pago: Pago parcial")
      .replace("Tipo de pago: Total", "Tipo de pago: Parcial"));
    const result = link(order(), partial);

    expect(result.status).toBe("CONFLICTING_REVIEW_REQUIRED");
    expect(result.contradictions).toContain("PARTIAL_PAYMENT_EXCEEDS_ORDER_TOTAL");
  });

  it("blocks a non-positive printed payment amount", () => {
    const result = link(order(), evidence(EVIDENCE_TEXT.replace("100,00 euros", "-10,00 euros")));

    expect(result.status).toBe("CONFLICTING_REVIEW_REQUIRED");
    expect(result.contradictions).toContain("NON_POSITIVE_PAYMENT_AMOUNT");
  });

  it("allows a rejected attempt to print zero without turning it into a payment contradiction", () => {
    const rejected = EVIDENCE_TEXT
      .replace("Importe pagado: 100,00 euros", "Importe pagado: 0,00 euros")
      .replace("Resultado del pago: Pago realizado", "Resultado del pago: Pago rechazado");
    const result = link(order(), evidence(rejected));

    expect(result.status).toBe("LINKED_REVIEW_REQUIRED");
    expect(result.contradictions).toEqual([]);
    expect(result.relationships).toContainEqual(expect.objectContaining({ relationType: "PAYMENT_REJECTED_FOR" }));
    expect(result.relationships).not.toContainEqual(expect.objectContaining({ relationType: "PAYS" }));
  });

  it("allows one exact debt key to establish the candidate when no other strong key is printed", () => {
    const sparseOrder = order(ORDER_TEXT
      .replace("Número de justificante: PAY-REF-SYN-001\n", "")
      .replace("Clave de liquidación: LQ-SYN-001\n", ""));
    const sparseEvidence = evidence(EVIDENCE_TEXT
      .replace("Número de justificante: PAY-REF-SYN-001\n", "")
      .replace("Clave de liquidación: LQ-SYN-001\n", ""));
    const result = link(sparseOrder, sparseEvidence);

    expect(result.status).toBe("LINKED_REVIEW_REQUIRED");
    expect(result.matchedKeys).toEqual(["DEBT_KEY"]);
    expect(result.relationships).toContainEqual(expect.objectContaining({ relationType: "PAYS" }));
  });

  it("normalizes only harmless case and whitespace differences in explicit references", () => {
    const altered = evidence(EVIDENCE_TEXT
      .replace("DEBT-SYN-001", " debt-syn-001 ")
      .replace("LQ-SYN-001", " lq-syn-001 ")
      .replace("PAY-REF-SYN-001", " pay-ref-syn-001 "));
    const result = link(order(), altered);

    expect(result.status).toBe("LINKED_REVIEW_REQUIRED");
    expect(result.matchedKeys).toEqual(["DEBT_KEY", "LIQUIDATION_KEY", "PAYMENT_REFERENCE"]);
  });

  it("keeps the document link but reports when the order has no explicit debt entity", () => {
    const withoutTotal = order(ORDER_TEXT
      .replace("Principal: 100,00 euros\n", "")
      .replace("Importe total: 100,00 euros", ""));
    const result = link(withoutTotal, evidence());

    expect(result.status).toBe("LINKED_REVIEW_REQUIRED");
    expect(result.relationships).toEqual([expect.objectContaining({ relationType: "REFERENCES" })]);
    expect(result.warnings).toEqual(["PAYMENT_RELATION_TARGET_DEBT_NOT_AVAILABLE"]);
  });

  it("returns information pending when either extractor did not recognize its document", () => {
    const unknownOrder = order(
      "Agencia Tributaria\nINSTRUCCIONES PARA EFECTUAR EL PAGO",
      OWNER,
      "instrucciones para efectuar el pago",
    );
    const result = link(unknownOrder, evidence());

    expect(result).toMatchObject({
      status: "INFORMATION_PENDING",
      reason: "EXTRACTOR_OUTPUT_NOT_RECOGNIZED",
      relationships: [],
    });
  });

  it("rejects owner-scope mixing before creating any relation", () => {
    expect(() => linkPaymentOrderToEvidenceV1({
      ownerScope: OWNER,
      order: order(),
      evidence: evidence(EVIDENCE_TEXT, "user:other-owner"),
      createdAt: CREATED_AT,
    })).toThrowError(expect.objectContaining<Partial<FiscalNotificationInputError>>({
      code: "INVALID_INPUT",
      path: "paymentRelationInput.evidence",
    }));
  });

  it("fails closed on unknown keys and invalid explicit timestamps", () => {
    const valid = { ownerScope: OWNER, order: order(), evidence: evidence(), createdAt: CREATED_AT };
    expect(() => linkPaymentOrderToEvidenceV1({ ...valid, hidden: true } as never)).toThrowError(
      expect.objectContaining<Partial<FiscalNotificationInputError>>({ path: "paymentRelationInput.$shape" }),
    );
    expect(() => linkPaymentOrderToEvidenceV1({ ...valid, createdAt: "2026-02-31T00:00:00.000Z" })).toThrowError(
      expect.objectContaining<Partial<FiscalNotificationInputError>>({ path: "paymentRelationInput.createdAt" }),
    );
  });

  it("is deterministic, immutable and does not expose matched reference values", () => {
    const input = Object.freeze({ ownerScope: OWNER, order: order(), evidence: evidence(), createdAt: CREATED_AT });
    const before = JSON.stringify(input);
    const first = linkPaymentOrderToEvidenceV1(input);
    const second = linkPaymentOrderToEvidenceV1(input);

    expect(first).toEqual(second);
    expect(JSON.stringify(input)).toBe(before);
    expect(JSON.stringify(first)).not.toContain("DEBT-SYN-001");
    expect(JSON.stringify(first)).not.toContain("12345678Z");
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.relationships)).toBe(true);
    expect(Object.isFrozen(first.relationships[0]?.matchingEvidence)).toBe(true);
    expect(() => (first.relationships as unknown as unknown[]).push({})).toThrow();
  });

  it("publishes strict matching, conflict and absence policies", () => {
    expect(PAYMENT_RELATION_ENGINE_RELEASE_V1).toEqual({
      version: "1.0.0",
      strongMatchKeys: ["DEBT_KEY", "LIQUIDATION_KEY", "PAYMENT_REFERENCE"],
      corroborationOnlyKeys: ["NIF", "MODEL", "FISCAL_YEAR", "TAX_PERIOD", "AMOUNT"],
      relationPolicy: "EXACT_EXPLICIT_REFERENCE_REQUIRED",
      conflictPolicy: "ANY_EXPLICIT_CONTRADICTION_BLOCKS_SETTLEMENT_RELATION",
      paymentPolicy: "DOCUMENT_STATE_CONTROLS_RELATION_TYPE_NO_AUTOMATIC_EFFECT",
      absencePolicy: "ABSENCE_OF_PAYMENT_EVIDENCE_NEVER_MEANS_NONPAYMENT",
      actionPolicy: "REVIEW_ONLY_NO_DEBT_PAYMENT_DEADLINE_OR_ACCOUNTING_ACTION",
    });
  });
});
