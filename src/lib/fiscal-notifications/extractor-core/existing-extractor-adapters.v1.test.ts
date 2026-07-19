import { describe, expect, it } from "vitest";
import { extractAeatDeferralGrantFactsV1 } from "../aeat-deferral-grant-facts.v1";
import { extractAeatEnforcementMoneyFacts } from "../aeat-enforcement-money-facts";
import { extractAeatEnforcementExplicitFieldsV2 } from "../aeat-enforcement-explicit-fields.v2";
import { extractAeatEnforcementPartyFactsV1 } from "../aeat-enforcement-party-facts.v1";
import { extractAeatOffsetAgreementFactsV1 } from "../aeat-offset-agreement-facts.v1";
import { FiscalNotificationInputError } from "../input-contract";
import { createDocumentSegmentV1, type DocumentSegmentTypeV1, type DocumentSegmentV1 } from "./document-segment.v1";
import {
  EXISTING_EXTRACTOR_ADAPTERS_RELEASE_V1,
  adaptAeatDeferralGrantFactsV1,
  adaptAeatEnforcementFactsV1,
  adaptAeatOffsetAgreementFactsV1,
} from "./existing-extractor-adapters.v1";

const OWNER_SCOPE = "user:synthetic-existing-adapters";
const DOCUMENT_ID = "document:synthetic-existing-adapters";

const ENFORCEMENT_PAGE = [
  "AGENCIA TRIBUTARIA",
  "sede.agenciatributaria.gob.es",
  "PROVIDENCIA DE APREMIO",
  "IDENTIFICACIÓN DEL DOCUMENTO",
  "Clave de liquidación: LQ-SYNTH-001",
  "Referencia del documento: REF-SYNTH-002",
  "Número de justificante: JUST-SYNTH-003",
  "Código Seguro de Verificación (CSV): CSV-SYNTH-004",
  "Vto.: VTO-SYNTH-005",
  "Fecha de emisión: 05/02/2026",
  "Fecha de firma: 06-02-2026",
  "Fecha de finalización del período voluntario: 28/02/2026",
  "IDENTIFICACION DEL OBLIGADO AL PAGO",
  "NOMBRE / RAZON SOCIAL: PERSONA SINTETICA DE PRUEBA",
  "NIF: 12345678Z",
  "IMPORTE DE LA DEUDA",
  "Principal pendiente: 1.234,56 EUR",
  "Recargo de apremio ordinario (20 %): 246,91 EUR",
  "Ingreso a cuenta: 0,00 EUR",
  "Importe total: 1.481,47 EUR",
].join("\n");

const DEFERRAL_MAIN_PAGE = [
  "Agencia Tributaria",
  "sede.agenciatributaria.gob.es",
  "CONCESIÓN DEL APLAZAMIENTO O FRACCIONAMIENTO DE PAGO SIN GARANTÍA",
  "IDENTIFICACIÓN DEL DOCUMENTO",
  "N.I.F.: 12345678Z",
  "Nombre: PERSONA SINTÉTICA DE PRUEBA",
  "Número de expediente: EXP-SYN-001",
  "ACUERDO",
  "Se concede el aplazamiento por el importe de 1.050,00 euros.",
  "PLAZO Y FORMAS DE PAGO",
  "El ingreso se realizará en la cuenta ES00 0000 0000 0000 0000 0000.",
].join("\n");

const DEFERRAL_ANNEX_PAGE = [
  "ANEXO I: DEUDAS Y PLAZOS DE LA NOTIFICACIÓN",
  "Clave Liquidación: L-SYN-001",
  "Concepto: IRPF SINTÉTICO",
  "Fecha de Interés: 01-01-2026",
  "Importe principal Recargo de apremio Importe total deuda Importe de los intereses Importe total del plazo Fecha de vencimiento",
  "1.000,00 0,00 1.000,00 50,00 1.050,00 20-02-2026",
  "ANEXO II: LIQUIDACIÓN DE INTERESES DE DEMORA",
  "CÁLCULO DE INTERESES",
].join("\n");

const OFFSET_REQUESTED_PAGE = [
  "AGENCIA TRIBUTARIA",
  "www.agenciatributaria.es",
  "ACUERDO DE COMPENSACIÓN A INSTANCIA DEL OBLIGADO AL PAGO",
  "ANEXO I",
  "ACUERDO DE COMPENSACIÓN A INSTANCIA DEL OBLIGADO AL PAGO",
  "CRÉDITO Y DEUDAS",
  "IDENTIFICACIÓN DEL DOCUMENTO",
  "NOMBRE Y APELLIDOS / RAZÓN SOCIAL: PERSONA SINTÉTICA",
  "N.I.F.: 12345678Z",
  "NÚMERO DE ACUERDO DE COMPENSACIÓN: ACUERDO-0001",
  "FECHA DE PRESENTACIÓN DE LA SOLICITUD DE COMPENSACIÓN: 05/01/2026",
  "CRÉDITO:",
  "FECHA RECONOCIM. IMPORTE IMPORTE INTERESES TOTAL IMPORTE",
  "REFERENCIA DESCRIPCIÓN DEL CRÉDITO CRÉDITO DE DEMORA CRÉDITO COMPENSADO",
  "CREDITO-0001 DEVOLUCIÓN SINTÉTICA 10/01/2026 1.000,00 20,00 1.020,00 900,00",
  "DEUDA:",
  "FECHA EFECTOS PRINCIPAL RECARGOS INTERESES INGRESOS TOTAL PENDIENTE IMPORTE IMPORTE PENDIENTE",
  "COMPENSACIÓN PENDIENTE PERIODO EJECUTIVO DE DEMORA A CUENTA ANTES DE COMPENSAR COMPENSADO DESPUÉS DE COMPENSAR EFECTOS",
  "VENCIMIENTO: DEUDA-0001 MODELO SINTÉTICO EJERCICIO 2025",
  "10/01/2026 800,00 80,00 20,00 0,00 900,00 900,00 0,00 ( 1)",
  "ANEXO II",
  "DETALLE DE EFECTOS",
  "(1) EFECTOS DE LA COMPENSACIÓN",
  "EL IMPORTE DE LA DEUDA QUE FIGURA EN LA COLUMNA TOTAL PENDIENTE ANTES DE COMPENSAR HA QUEDADO EXTINGUIDO EN PERIODO VOLUNTARIO DE INGRESO.",
].join("\n");

const OFFSET_EX_OFFICIO_PAGE = OFFSET_REQUESTED_PAGE
  .replaceAll("A INSTANCIA DEL OBLIGADO AL PAGO", "DE OFICIO")
  .replace("CRÉDITO Y DEUDAS", "CRÉDITO Y DEUDAS COMPENSADAS DE OFICIO")
  .replace("FECHA DE PRESENTACIÓN DE LA SOLICITUD DE COMPENSACIÓN: 05/01/2026\n", "");

function document(...pageTexts: readonly string[]) {
  return Object.freeze({
    ownerScope: OWNER_SCOPE,
    documentId: DOCUMENT_ID,
    pages: Object.freeze(pageTexts.map((text, index) => Object.freeze({
      pageNumber: index + 1,
      text,
      isBlank: text.trim().length === 0,
    }))),
  });
}

function segment(
  type: DocumentSegmentTypeV1,
  pageFrom: number,
  pageTo = pageFrom,
  suffix = String(pageFrom),
): DocumentSegmentV1 {
  return createDocumentSegmentV1({
    segmentId: `segment:${suffix}`,
    documentId: DOCUMENT_ID,
    segmentType: type,
    pageFrom,
    pageTo,
    detectedTitle: type === "MAIN_ADMINISTRATIVE_ACT" ? "Documento administrativo sintético" : "Anexo sintético",
    detectedAuthority: "AEAT",
    classificationConfidence: 1,
    extractionStatus: "EXTRACTED_REVIEW_REQUIRED",
    contentHash: `sha256:${suffix.padEnd(64, "a").slice(0, 64)}`,
    canGenerateAdministrativeFacts: ["MAIN_ADMINISTRATIVE_ACT", "DEBT_LIST", "PAYMENT_DOCUMENT"].includes(type),
  });
}

function enforcementFacts(page = ENFORCEMENT_PAGE) {
  const input = document(page);
  return {
    explicitFields: extractAeatEnforcementExplicitFieldsV2(input),
    moneyFacts: extractAeatEnforcementMoneyFacts(input),
    partyFacts: extractAeatEnforcementPartyFactsV1(input),
  };
}

function mutable<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe("existing fiscal notification extractor adapters v1", () => {
  it("projects an exact enforcement order with its printed data, without enabling actions", () => {
    const facts = enforcementFacts();
    const output = adaptAeatEnforcementFactsV1({
      ownerScope: OWNER_SCOPE,
      documentId: DOCUMENT_ID,
      segments: [segment("MAIN_ADMINISTRATIVE_ACT", 1)],
      ...facts,
    });

    expect(output.status).toBe("REVIEW_REQUIRED");
    expect(output.familyCandidates).toEqual([
      expect.objectContaining({ familyId: "collection.enforcement_order", confidence: 1 }),
    ]);
    expect(output.references.map((item) => item.referenceType)).toEqual([
      "LIQUIDATION_KEY", "ACT_ID", "PAYMENT_RECEIPT_ID", "CSV", "OTHER_OFFICIAL_REFERENCE", "NIF",
    ]);
    expect(output.proceduralDates.map((item) => item.dateType)).toEqual([
      "ISSUE_DATE", "SIGNING_DATE", "VOLUNTARY_PAYMENT_DEADLINE",
    ]);
    expect(output.monetaryComponents.map((item) => [item.componentType, item.amountCents])).toEqual([
      ["PRINCIPAL", 123_456],
      ["EXECUTIVE_SURCHARGE", 24_691],
      ["PAYMENT_ON_ACCOUNT", 0],
      ["TOTAL_CLAIMED", 148_147],
    ]);
    expect(output.entities.map((item) => item.entityKind)).toEqual([
      "ADMINISTRATIVE_ACT", "DEBT_CLAIM", "PARTY",
    ]);
    expect(output).toMatchObject({
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
      permitsDebtCreation: false,
      permitsDeadlineCreation: false,
      permitsPaymentAction: false,
      permitsAccountingAction: false,
      permitsAutomaticFamilyConfirmation: false,
    });
  });

  it("keeps Vto. as an identifier and never invents a date or installment from it", () => {
    const facts = enforcementFacts();
    const output = adaptAeatEnforcementFactsV1({
      ownerScope: OWNER_SCOPE,
      documentId: DOCUMENT_ID,
      segments: [segment("MAIN_ADMINISTRATIVE_ACT", 1)],
      ...facts,
    });

    expect(output.references).toContainEqual(expect.objectContaining({
      referenceType: "OTHER_OFFICIAL_REFERENCE",
      rawValue: "VTO-SYNTH-005",
    }));
    expect(output.proceduralDates).not.toContainEqual(expect.objectContaining({ rawText: "VTO-SYNTH-005" }));
  });

  it("reuses observed enforcement facts for a debt collected from another authority", () => {
    const facts = enforcementFacts();
    const output = adaptAeatEnforcementFactsV1({
      ownerScope: OWNER_SCOPE,
      documentId: DOCUMENT_ID,
      segments: [segment("MAIN_ADMINISTRATIVE_ACT", 1)],
      familyId: "collection.external_debt",
      ...facts,
    });

    expect(output.familyCandidates).toEqual([
      expect.objectContaining({
        familyId: "collection.external_debt",
        confidence: 1,
      }),
    ]);
    expect(output.monetaryComponents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          componentType: "PRINCIPAL",
          amountCents: 123_456,
        }),
        expect.objectContaining({
          componentType: "TOTAL_CLAIMED",
          amountCents: 148_147,
        }),
      ]),
    );
  });

  it("adapts the explicit debt schedule printed in a deferral annex", () => {
    const facts = extractAeatDeferralGrantFactsV1(document(DEFERRAL_MAIN_PAGE, DEFERRAL_ANNEX_PAGE));
    const output = adaptAeatDeferralGrantFactsV1({
      ownerScope: OWNER_SCOPE,
      documentId: DOCUMENT_ID,
      segments: [segment("MAIN_ADMINISTRATIVE_ACT", 1), segment("DEBT_LIST", 2)],
      facts,
    });

    expect(output.familyCandidates[0]).toMatchObject({ familyId: "collection.deferral_grant", confidence: 1 });
    expect(output.references).toContainEqual(expect.objectContaining({ referenceType: "EXPEDIENTE_ID", rawValue: "EXP-SYN-001" }));
    expect(output.references).toContainEqual(expect.objectContaining({ referenceType: "LIQUIDATION_KEY", rawValue: "L-SYN-001" }));
    expect(output.proceduralDates).toContainEqual(expect.objectContaining({
      dateType: "INSTALLMENT_DUE_DATE",
      parsedDate: "2026-02-20",
      legallyComputed: false,
    }));
    expect(output.monetaryComponents).toContainEqual(expect.objectContaining({ componentType: "PRINCIPAL", amountCents: 100_000 }));
    expect(output.entities.filter((item) => item.entityKind === "DEBT_CLAIM")).toHaveLength(1);
    expect(output.permitsPaymentAction).toBe(false);
  });

  it("keeps requested and ex-officio compensation as two exact catalog variants", () => {
    const requested = adaptAeatOffsetAgreementFactsV1({
      ownerScope: OWNER_SCOPE,
      documentId: DOCUMENT_ID,
      segments: [segment("MAIN_ADMINISTRATIVE_ACT", 1)],
      facts: extractAeatOffsetAgreementFactsV1(document(OFFSET_REQUESTED_PAGE)),
    });
    const exOfficio = adaptAeatOffsetAgreementFactsV1({
      ownerScope: OWNER_SCOPE,
      documentId: DOCUMENT_ID,
      segments: [segment("MAIN_ADMINISTRATIVE_ACT", 1)],
      facts: extractAeatOffsetAgreementFactsV1(document(OFFSET_EX_OFFICIO_PAGE)),
    });

    expect(requested.familyCandidates[0]?.familyId).toBe("collection.offset_requested");
    expect(exOfficio.familyCandidates[0]?.familyId).toBe("collection.offset_ex_officio");
    expect(requested.monetaryComponents).toContainEqual(expect.objectContaining({
      componentType: "COMPENSATED_AMOUNT",
      amountCents: 90_000,
    }));
    expect(requested.monetaryComponents).toContainEqual(expect.objectContaining({
      componentType: "TOTAL_PENDING",
      amountCents: 0,
    }));
    expect(requested.entities).toContainEqual(expect.objectContaining({ entityKind: "DEBT_CLAIM" }));
    expect(requested.permitsDebtCreation).toBe(false);
    expect(requested.permitsAccountingAction).toBe(false);
  });

  it("returns UNKNOWN with no invented facts when legacy gates do not recognize the document", () => {
    const facts = enforcementFacts("Texto sintético sin título ni campos fiscales");
    const output = adaptAeatEnforcementFactsV1({
      ownerScope: OWNER_SCOPE,
      documentId: DOCUMENT_ID,
      segments: [segment("MAIN_ADMINISTRATIVE_ACT", 1)],
      ...facts,
    });

    expect(output.status).toBe("UNKNOWN");
    expect(output.familyCandidates).toEqual([]);
    expect(output.entities).toEqual([]);
    expect(output.references).toEqual([]);
    expect(output.monetaryComponents).toEqual([]);
  });

  it("rejects unknown nested keys at the legacy-to-core boundary", () => {
    const facts = mutable(extractAeatDeferralGrantFactsV1(document(DEFERRAL_MAIN_PAGE, DEFERRAL_ANNEX_PAGE))) as unknown as Record<string, unknown>;
    const header = facts.header as Record<string, unknown>;
    header.rawPdfText = "must never cross";

    expect(() => adaptAeatDeferralGrantFactsV1({
      ownerScope: OWNER_SCOPE,
      documentId: DOCUMENT_ID,
      segments: [segment("MAIN_ADMINISTRATIVE_ACT", 1), segment("DEBT_LIST", 2)],
      facts,
    })).toThrow();
  });

  it("rejects unknown money evidence fields and uncovered pages fail-closed", () => {
    const facts = enforcementFacts();
    const moneyFacts = mutable(facts.moneyFacts) as unknown as Record<string, unknown>;
    const firstFact = (moneyFacts.facts as Record<string, unknown>[])[0]!;
    const firstEvidence = (firstFact.evidence as Record<string, unknown>[])[0]!;
    firstEvidence.accountNumber = "forbidden";

    expect(() => adaptAeatEnforcementFactsV1({
      ownerScope: OWNER_SCOPE,
      documentId: DOCUMENT_ID,
      segments: [segment("MAIN_ADMINISTRATIVE_ACT", 1)],
      explicitFields: facts.explicitFields,
      moneyFacts,
      partyFacts: facts.partyFacts,
    })).toThrow(FiscalNotificationInputError);

    expect(() => adaptAeatDeferralGrantFactsV1({
      ownerScope: OWNER_SCOPE,
      documentId: DOCUMENT_ID,
      segments: [segment("MAIN_ADMINISTRATIVE_ACT", 1), segment("ANNEX", 3)],
      facts: extractAeatDeferralGrantFactsV1(document(DEFERRAL_MAIN_PAGE, DEFERRAL_ANNEX_PAGE)),
    })).toThrow(FiscalNotificationInputError);
  });

  it("preserves explicit schedule facts printed in an annex without enabling actions", () => {
    const facts = extractAeatDeferralGrantFactsV1(document(DEFERRAL_MAIN_PAGE, DEFERRAL_ANNEX_PAGE));
    const output = adaptAeatDeferralGrantFactsV1({
      ownerScope: OWNER_SCOPE,
      documentId: DOCUMENT_ID,
      segments: [segment("MAIN_ADMINISTRATIVE_ACT", 1), segment("ANNEX", 2)],
      facts,
    });

    expect(output.proceduralDates).toContainEqual(expect.objectContaining({
      dateType: "INSTALLMENT_DUE_DATE",
      parsedDate: "2026-02-20",
    }));
    expect(output.monetaryComponents).toContainEqual(expect.objectContaining({
      componentType: "PRINCIPAL",
      amountCents: 100_000,
    }));
    expect(output.permitsDebtCreation).toBe(false);
    expect(output.permitsPaymentAction).toBe(false);
  });

  it("is deterministic, does not mutate inputs and returns defensive immutable outputs", () => {
    const legacy = enforcementFacts();
    const input = {
      ownerScope: OWNER_SCOPE,
      documentId: DOCUMENT_ID,
      segments: [segment("MAIN_ADMINISTRATIVE_ACT", 1)],
      ...legacy,
    };
    const before = JSON.stringify(input);
    const first = adaptAeatEnforcementFactsV1(input);
    const second = adaptAeatEnforcementFactsV1(input);

    expect(JSON.stringify(input)).toBe(before);
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.monetaryComponents)).toBe(true);
    expect(() => (first.warnings as string[]).push("mutation")).toThrow();
    expect(second.warnings).not.toContain("mutation");
  });

  it("honours cancellation before any projection work", () => {
    const controller = new AbortController();
    controller.abort();
    const facts = enforcementFacts();
    expect(() => adaptAeatEnforcementFactsV1({
      ownerScope: OWNER_SCOPE,
      documentId: DOCUMENT_ID,
      segments: [segment("MAIN_ADMINISTRATIVE_ACT", 1)],
      signal: controller.signal,
      ...facts,
    })).toThrowError(expect.objectContaining({ code: "ABORTED" }));
  });

  it("publishes a closed manifest for the adapted catalog families", () => {
    expect(EXISTING_EXTRACTOR_ADAPTERS_RELEASE_V1).toEqual({
      version: "1.1.0",
      adaptedFamilies: [
        "collection.enforcement_order",
        "collection.external_debt",
        "collection.deferral_grant",
        "collection.offset_requested",
        "collection.offset_ex_officio",
      ],
      semanticPolicy: "EXPLICIT_LEGACY_FACTS_TO_REVIEW_ONLY_CORE",
      persistencePolicy: "NO_PERSISTENCE_PERFORMED_BY_ADAPTER",
      actionPolicy: "NO_DEBT_PAYMENT_DEADLINE_OR_ACCOUNTING_ACTION",
    });
  });
});
