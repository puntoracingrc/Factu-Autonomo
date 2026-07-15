import { describe, expect, it } from "vitest";
import { extractAeatEnforcementMoneyFacts } from "../aeat-enforcement-money-facts";
import { extractAeatEnforcementExplicitFieldsV2 } from "../aeat-enforcement-explicit-fields.v2";
import { extractAeatEnforcementPartyFactsV1 } from "../aeat-enforcement-party-facts.v1";
import {
  FiscalNotificationInputError,
  type BoundedDocumentInput,
} from "../input-contract";
import {
  createDocumentSegmentV1,
  type DocumentSegmentTypeV1,
} from "./document-segment.v1";
import {
  ENFORCEMENT_SEIZURE_RELATION_ENGINE_RELEASE_V1,
  linkEnforcementToSeizureV1,
  linkSeizureFollowUpV1,
} from "./enforcement-seizure-relation-engine.v1";
import { adaptAeatEnforcementFactsV1 } from "./existing-extractor-adapters.v1";
import { normalizeReferenceV1 } from "./reference.v1";
import {
  extractSeizureV1,
  type SeizureExtractorOutputV1,
} from "./seizure-extractor.v1";

const OWNER = "user:synthetic-enforcement-seizure-relations";
const CREATED_AT = "2026-07-14T21:00:00.000Z";

const ENFORCEMENT_TEXT = [
  "AGENCIA TRIBUTARIA",
  "sede.agenciatributaria.gob.es",
  "PROVIDENCIA DE APREMIO",
  "IDENTIFICACIÓN DEL DOCUMENTO",
  "Clave de liquidación: LQ-SYN-REL-001",
  "Referencia del documento: APR-SYN-REL-001",
  "Fecha de emisión: 02/03/2026",
  "IDENTIFICACION DEL OBLIGADO AL PAGO",
  "NOMBRE / RAZON SOCIAL: PERSONA DEUDORA SINTÉTICA",
  "NIF: 12345678Z",
  "IMPORTE DE LA DEUDA",
  "Principal pendiente: 400,00 EUR",
  "Recargo de apremio ordinario (20 %): 80,00 EUR",
  "Importe total: 480,00 EUR",
].join("\n");

const SEIZURE_TEXT = [
  "AGENCIA TRIBUTARIA",
  "sede.agenciatributaria.gob.es",
  "DILIGENCIA DE EMBARGO DE CUENTAS BANCARIAS",
  "Número de diligencia: EMB-SYN-REL-001",
  "Clave de liquidación: LQ-SYN-REL-001",
  "Referencia de la providencia: APR-SYN-REL-001",
  "Deudor: PERSONA DEUDORA SINTÉTICA",
  "NIF del deudor: 12345678Z",
  "Destinatario: BANCO SINTÉTICO",
  "Importe a embargar: 480,00 EUR",
  "Fecha del embargo: 03/03/2026",
].join("\n");

function document(
  ownerScope: string,
  documentId: string,
  text: string,
): BoundedDocumentInput {
  return Object.freeze({
    ownerScope,
    documentId,
    pages: Object.freeze([
      Object.freeze({ pageNumber: 1, text, isBlank: text.trim().length === 0 }),
    ]),
  });
}

function segment(
  documentId: string,
  suffix: string,
  title: string,
  segmentType: DocumentSegmentTypeV1 = "MAIN_ADMINISTRATIVE_ACT",
) {
  return createDocumentSegmentV1({
    segmentId: `segment:${suffix}`,
    documentId,
    segmentType,
    pageFrom: 1,
    pageTo: 1,
    detectedTitle: title,
    detectedAuthority: "AEAT",
    classificationConfidence: 1,
    extractionStatus: "EXTRACTED_REVIEW_REQUIRED",
    contentHash: `sha256:${"a".repeat(64)}`,
    canGenerateAdministrativeFacts: true,
  });
}

function enforcement(
  text = ENFORCEMENT_TEXT,
  ownerScope = OWNER,
) {
  const documentId = `document:enforcement:${ownerScope.split(":").at(-1)}`;
  const input = document(ownerScope, documentId, text);
  return adaptAeatEnforcementFactsV1({
    ownerScope,
    documentId,
    segments: [segment(documentId, "enforcement", "PROVIDENCIA DE APREMIO")],
    explicitFields: extractAeatEnforcementExplicitFieldsV2(input),
    moneyFacts: extractAeatEnforcementMoneyFacts(input),
    partyFacts: extractAeatEnforcementPartyFactsV1(input),
  });
}

function seizure(
  text = SEIZURE_TEXT,
  ownerScope = OWNER,
  suffix = "seizure",
  title = "DILIGENCIA DE EMBARGO DE CUENTAS BANCARIAS",
): SeizureExtractorOutputV1 {
  const documentId = `document:${suffix}:${ownerScope.split(":").at(-1)}`;
  return extractSeizureV1({
    document: document(ownerScope, documentId, text),
    segments: [segment(documentId, suffix, title)],
  });
}

function enforcementWithDebtKey(value: string) {
  const output = enforcement();
  return Object.freeze({
    ...output,
    references: Object.freeze([
      ...output.references,
      normalizeReferenceV1({
        referenceType: "DEBT_KEY",
        rawValue: value,
        sourceDocumentId: "document:enforcement:synthetic-enforcement-seizure-relations",
        sourcePage: 1,
        sourceLabel: "Clave de deuda",
        sourceCoordinates: null,
        confidence: 1,
      }),
    ]),
  });
}

function followUp(
  title: string,
  lines: readonly string[],
  suffix: string,
): SeizureExtractorOutputV1 {
  return seizure([
    "AGENCIA TRIBUTARIA",
    "sede.agenciatributaria.gob.es",
    title,
    ...lines,
  ].join("\n"), OWNER, suffix, title);
}

function release(orderId = "EMB-SYN-REL-001") {
  return followUp("LEVANTAMIENTO DE DILIGENCIA DE EMBARGO", [
    `Número de diligencia: ${orderId}`,
    "Bien o derecho levantado: CUENTA ****9876",
    "Motivo del levantamiento: MOTIVO IMPRESO SINTÉTICO",
    "Tipo de levantamiento: PARCIAL",
    "Importe liberado: 200,00 EUR",
    "Fecha del levantamiento: 08/03/2026",
  ], "release");
}

function thirdPartyResponse(orderId = "EMB-SYN-REL-001") {
  return followUp("CONTESTACIÓN A DILIGENCIA DE EMBARGO", [
    `Número de diligencia: ${orderId}`,
    "Tercero obligado: PAGADOR SINTÉTICO",
    "Relación con el deudor: CLIENTE",
    "Existencia de crédito o saldo: SÍ CONSTA",
    "Respuesta del tercero: CONTESTACIÓN IMPRESA SINTÉTICA",
    "Fecha de contestación: 06/03/2026",
  ], "response");
}

function thirdPartyPayment(orderId = "EMB-SYN-REL-001") {
  return followUp("JUSTIFICANTE DE INGRESO DE DILIGENCIA DE EMBARGO", [
    `Número de diligencia: ${orderId}`,
    "Tercero retenedor: PAGADOR SINTÉTICO",
    "Número de justificante: JUST-SYN-REL-002",
    "Importe transferido: 200,00 EUR",
    "Fecha del ingreso: 07/03/2026",
  ], "third-party-payment");
}

function linkEnforcement(
  enforcementOutput = enforcement(),
  seizureOutput = seizure(),
) {
  return linkEnforcementToSeizureV1({
    ownerScope: OWNER,
    enforcement: enforcementOutput,
    seizure: seizureOutput,
    createdAt: CREATED_AT,
  });
}

function linkFollowUp(followUpOutput: SeizureExtractorOutputV1) {
  return linkSeizureFollowUpV1({
    ownerScope: OWNER,
    seizure: seizure(),
    followUp: followUpOutput,
    createdAt: CREATED_AT,
  });
}

describe("enforcement-to-seizure relation engine v1", () => {
  it("links the enforcement order and seizure by exact printed references", () => {
    const output = linkEnforcement();

    expect(output).toMatchObject({
      status: "LINKED_REVIEW_REQUIRED",
      reason: "EXPLICIT_ENFORCEMENT_REFERENCE_LINK",
      matchedKeys: ["ENFORCEMENT_ACT_REFERENCE", "LIQUIDATION_KEY"],
      contradictions: [],
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
      balanceMutationPolicy: "NO_BALANCE_OR_CURRENT_STATE_MUTATION",
      automaticEffect: "NONE",
      retainedSourceContent: "NONE",
    });
    expect(output.relationships).toEqual([
      expect.objectContaining({
        relationType: "ENFORCES",
        confidenceLevel: "EXACT",
        createdAutomatically: true,
        userConfirmed: false,
      }),
      expect.objectContaining({
        relationType: "ORDERS_SEIZURE",
        confidenceLevel: "EXACT",
        createdAutomatically: true,
        userConfirmed: false,
      }),
    ]);
  });

  it("does not link two documents on amount and dates alone", () => {
    const noReferences = SEIZURE_TEXT
      .replace("Clave de liquidación: LQ-SYN-REL-001\n", "")
      .replace("Referencia de la providencia: APR-SYN-REL-001\n", "");
    const output = linkEnforcement(enforcement(), seizure(noReferences));

    expect(output).toMatchObject({
      status: "INFORMATION_PENDING",
      reason: "NO_SHARED_EXPLICIT_REFERENCE",
      matchedKeys: [],
      contradictions: [],
      relationships: [],
    });
  });

  it("creates an exact link from one shared debt key without relying on the amount", () => {
    const debtOnlySeizure = SEIZURE_TEXT
      .replace("Clave de liquidación: LQ-SYN-REL-001", "Clave de deuda: DEBT-SYN-REL-777")
      .replace("Referencia de la providencia: APR-SYN-REL-001\n", "")
      .replace("Importe a embargar: 480,00 EUR", "Importe a embargar: 999,00 EUR");
    const output = linkEnforcement(
      enforcementWithDebtKey("DEBT-SYN-REL-777"),
      seizure(debtOnlySeizure),
    );

    expect(output.status).toBe("LINKED_REVIEW_REQUIRED");
    expect(output.matchedKeys).toEqual(["DEBT_KEY"]);
    expect(output.relationships).toContainEqual(expect.objectContaining({
      relationType: "ENFORCES",
      confidenceLevel: "EXACT",
    }));
  });

  it("blocks the relation when the documents print different keys despite equal amounts", () => {
    const different = SEIZURE_TEXT
      .replace("LQ-SYN-REL-001", "LQ-OTHER")
      .replace("APR-SYN-REL-001", "APR-OTHER");
    const output = linkEnforcement(enforcement(), seizure(different));

    expect(output).toMatchObject({
      status: "CONFLICTING_REVIEW_REQUIRED",
      reason: "EXPLICIT_REFERENCE_CONFLICT",
      contradictions: [
        "ENFORCEMENT_ACT_REFERENCE_MISMATCH",
        "LIQUIDATION_KEY_MISMATCH",
      ],
      relationships: [],
    });
  });

  it("blocks a conflicting reference even when another exact key matches", () => {
    const output = linkEnforcement(
      enforcement(),
      seizure(SEIZURE_TEXT.replace("APR-SYN-REL-001", "APR-OTHER")),
    );

    expect(output.status).toBe("CONFLICTING_REVIEW_REQUIRED");
    expect(output.matchedKeys).toEqual(["LIQUIDATION_KEY"]);
    expect(output.contradictions).toEqual(["ENFORCEMENT_ACT_REFERENCE_MISMATCH"]);
    expect(output.relationships).toEqual([]);
  });

  it("rejects cross-owner data before creating a graph edge", () => {
    expect(() => linkEnforcementToSeizureV1({
      ownerScope: OWNER,
      enforcement: enforcement(),
      seizure: seizure(SEIZURE_TEXT, "user:other-owner"),
      createdAt: CREATED_AT,
    })).toThrowError(expect.objectContaining<Partial<FiscalNotificationInputError>>({
      code: "INVALID_INPUT",
      path: "enforcementSeizureRelationInput.seizure",
    }));
  });

  it("fails closed on unknown keys and invalid timestamps", () => {
    const valid = {
      ownerScope: OWNER,
      enforcement: enforcement(),
      seizure: seizure(),
      createdAt: CREATED_AT,
    };
    expect(() => linkEnforcementToSeizureV1({ ...valid, hidden: true } as never))
      .toThrowError(expect.objectContaining<Partial<FiscalNotificationInputError>>({
        path: "enforcementSeizureRelationInput.$shape",
      }));
    expect(() => linkEnforcementToSeizureV1({
      ...valid,
      createdAt: "2026-02-31T00:00:00.000Z",
    })).toThrowError(expect.objectContaining<Partial<FiscalNotificationInputError>>({
      path: "relationInput.createdAt",
    }));
  });

  it("is deterministic, immutable and does not expose matched reference values", () => {
    const input = Object.freeze({
      ownerScope: OWNER,
      enforcement: enforcement(),
      seizure: seizure(),
      createdAt: CREATED_AT,
    });
    const before = JSON.stringify(input);
    const first = linkEnforcementToSeizureV1(input);
    const second = linkEnforcementToSeizureV1(input);

    expect(first).toEqual(second);
    expect(JSON.stringify(input)).toBe(before);
    expect(JSON.stringify(first)).not.toContain("LQ-SYN-REL-001");
    expect(JSON.stringify(first)).not.toContain("APR-SYN-REL-001");
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.relationships)).toBe(true);
    expect(Object.isFrozen(first.relationships[0]?.matchingEvidence)).toBe(true);
    expect(() => (first.relationships as unknown as unknown[]).push({})).toThrow();
  });
});

describe("seizure follow-up relation engine v1", () => {
  it.each([
    ["release", release(), "RELEASES_SEIZURE"],
    ["third-party response", thirdPartyResponse(), "RESPONDS_TO_SEIZURE"],
    ["third-party transfer", thirdPartyPayment(), "TRANSFERS_SEIZED_FUNDS"],
  ] as const)("links an exact %s by seizure order id", (_label, followUpOutput, relationType) => {
    const output = linkFollowUp(followUpOutput);

    expect(output).toMatchObject({
      status: "LINKED_REVIEW_REQUIRED",
      reason: "EXPLICIT_SEIZURE_ORDER_LINK",
      matchedKeys: ["SEIZURE_ORDER_ID"],
      contradictions: [],
      balanceMutationPolicy: "NO_BALANCE_OR_CURRENT_STATE_MUTATION",
      automaticEffect: "NONE",
    });
    expect(output.relationships).toEqual([
      expect.objectContaining({
        relationType,
        confidenceLevel: "EXACT",
        createdAutomatically: true,
        userConfirmed: false,
      }),
    ]);
  });

  it("keeps a partial release as history without inferring the current seizure state", () => {
    const output = linkFollowUp(release());

    expect(output.relationships[0]?.relationType).toBe("RELEASES_SEIZURE");
    expect(output.balanceMutationPolicy).toBe("NO_BALANCE_OR_CURRENT_STATE_MUTATION");
    expect(output.automaticEffect).toBe("NONE");
    expect(JSON.stringify(output)).not.toContain("PARCIAL");
    expect(JSON.stringify(output)).not.toContain("200,00");
  });

  it("does not turn a third-party transfer into an automatic debt payment or balance", () => {
    const output = linkFollowUp(thirdPartyPayment());

    expect(output.relationships).toEqual([
      expect.objectContaining({ relationType: "TRANSFERS_SEIZED_FUNDS" }),
    ]);
    expect(output.relationships).not.toContainEqual(expect.objectContaining({ relationType: "PAYS" }));
    expect(output.relationships).not.toContainEqual(expect.objectContaining({ relationType: "PARTIALLY_PAYS" }));
    expect(output.automaticEffect).toBe("NONE");
  });

  it("blocks a follow-up that names a different seizure order", () => {
    const output = linkFollowUp(release("EMB-OTHER"));

    expect(output).toMatchObject({
      status: "CONFLICTING_REVIEW_REQUIRED",
      reason: "EXPLICIT_REFERENCE_CONFLICT",
      contradictions: ["SEIZURE_ORDER_ID_MISMATCH"],
      relationships: [],
    });
  });

  it("returns information pending when the follow-up omits the seizure order id", () => {
    const withoutId = release().seizureFacts.seizureOrderId;
    expect(withoutId).not.toBeNull();
    const output = linkFollowUp(followUp("LEVANTAMIENTO DE DILIGENCIA DE EMBARGO", [
      "Bien o derecho levantado: CUENTA ****9876",
      "Tipo de levantamiento: TOTAL",
      "Fecha del levantamiento: 08/03/2026",
    ], "release-without-id"));

    expect(output).toMatchObject({
      status: "INFORMATION_PENDING",
      reason: "NO_SHARED_EXPLICIT_REFERENCE",
      relationships: [],
    });
  });

  it("does not connect a second seizure order as if it were a follow-up", () => {
    const output = linkFollowUp(seizure());

    expect(output).toMatchObject({
      status: "INFORMATION_PENDING",
      reason: "UNSUPPORTED_SEIZURE_FOLLOW_UP",
      relationships: [],
    });
  });

  it("publishes strict identity, source-retention and no-action policies", () => {
    expect(ENFORCEMENT_SEIZURE_RELATION_ENGINE_RELEASE_V1).toEqual({
      version: "1.0.0",
      exactMatchKeys: [
        "DEBT_KEY",
        "LIQUIDATION_KEY",
        "ENFORCEMENT_ACT_REFERENCE",
        "SEIZURE_ORDER_ID",
      ],
      amountOnlyRelationPolicy: "PROHIBITED",
      followUpTypes: [
        "SEIZURE_RELEASE",
        "THIRD_PARTY_RESPONSE",
        "THIRD_PARTY_PAYMENT",
      ],
      balanceMutationPolicy: "NO_BALANCE_OR_CURRENT_STATE_MUTATION",
      sourceContentPolicy: "STRUCTURED_FACTS_ONLY_NO_RAW_SOURCE",
      actionPolicy: "NO_DEBT_PAYMENT_DEADLINE_SEIZURE_OR_ACCOUNTING_ACTION",
    });
  });
});
