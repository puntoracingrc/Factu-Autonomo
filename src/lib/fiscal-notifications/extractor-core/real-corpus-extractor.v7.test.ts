import { describe, expect, it } from "vitest";
import { analyzeFiscalNotificationDocumentInput } from "../document-input-analysis";
import type { BoundedDocumentInput } from "../input-contract";
import { projectRealCorpusReviewV7 } from "../real-corpus-review.v7";
import {
  extractAeatRealCorpusDocumentV7,
  type RealCorpusFamilyIdV7,
} from "./real-corpus-extractor.v7";

const OWNER = "user:synthetic-v7";
const AEAT = "AGENCIA ESTATAL DE ADMINISTRACIÓN TRIBUTARIA";

interface CorpusCaseV7 {
  readonly id: string;
  readonly family: RealCorpusFamilyIdV7;
  readonly text: string;
}

function money(cents: number): string {
  return `${Math.floor(cents / 100).toLocaleString("es-ES")},${String(cents % 100).padStart(2, "0")} €`;
}

function planText(input: { debt: string; agreement: string; count: number; principal: number; interest: number; modified?: boolean; replaced?: string }): string {
  const base = Math.floor(input.principal / input.count);
  let assigned = 0;
  const installments = Array.from({ length: input.count }, (_, index) => {
    const baseCents = index === input.count - 1 ? input.principal - assigned : base;
    assigned += baseCents;
    const installmentInterest = index === input.count - 1
      ? input.interest - Math.floor(input.interest / input.count) * (input.count - 1)
      : Math.floor(input.interest / input.count);
    return `CUOTA ${index + 1} | ${String(index + 1).padStart(2, "0")}-08-2027 | ${money(baseCents)} | ${money(installmentInterest)} | ${money(baseCents + installmentInterest)}`;
  });
  return `${input.modified ? "MODIFICACIÓN DEL APLAZAMIENTO\nCALENDARIO MODIFICADO" : "CONCESIÓN DEL APLAZAMIENTO/FRACCIONAMIENTO"}
Referencia del acuerdo: ${input.agreement}
${input.replaced ? `Acuerdo sustituido: ${input.replaced}\n` : ""}Clave de deuda: ${input.debt}
Principal ${input.modified ? "del plan" : "original"}: ${money(input.principal)}
Intereses ${input.modified ? "del plan" : "del aplazamiento"}: ${money(input.interest)}
${installments.join("\n")}`;
}

const CASES: readonly CorpusCaseV7[] = Object.freeze([
  { id: "V7-S01", family: "sanction.initiation_and_hearing", text: "INICIO DEL PROCEDIMIENTO SANCIONADOR\nTRÁMITE DE AUDIENCIA\nReferencia del expediente sancionador: SYN-SANCTION-V7-01\nModelo y período: 130:2027:1T\nModelo y período: 303:2027:1T\nSanción propuesta: 200,00 €\nReducción propuesta: 50,00 €\nSanción reducida propuesta: 150,00 €\nDías hábiles para alegaciones: 15" },
  { id: "V7-S02", family: "compliance.formal_filing_requirement", text: "REQUERIMIENTO FORMAL DE PRESENTACIÓN\nModelo y período: 130:2027:1T\nModelo y período: 303:2027:1T\nDías hábiles para responder: 10" },
  { id: "V7-S03", family: "seizure.bank_account", text: "DILIGENCIA DE EMBARGO DE CUENTA BANCARIA\nNúmero de diligencia: SYN-SEIZURE-BANK-A\nClave de deuda: SYN-DEBT-A\nTotal de la deuda: 400,00 €\nLímite del embargo: 400,00 €\nImporte embargado: 400,00 €\nOrdinal opaco del activo: 1" },
  { id: "V7-S04", family: "collection.enforcement_order", text: "PROVIDENCIA DE APREMIO\nPRINCIPAL RESTANTE DEL PLAN\nClave de deuda: SYN-DEBT-A\nPrincipal pendiente: 1.800,05 €\nTotal con recargo ordinario: 2.160,06 €\nFin del período voluntario: 05-10-2027\nCARTA DE PAGO" },
  { id: "V7-S05", family: "collection.offset_ex_officio", text: "ACUERDO DE COMPENSACIÓN DE OFICIO\nCrédito aplicado: 500,00 €\nFILA COMPENSACION | SYN-DEBT-FULL | 420,00 | 420,00 | 0,00\nFILA COMPENSACION | SYN-DEBT-A | 430,00 | 80,00 | 350,00" },
  { id: "V7-S06", family: "collection.enforcement_order", text: "PROVIDENCIA DE APREMIO\nClave de deuda: SYN-DEBT-A\nVencimiento ajustado: 05-05-2027\nPrincipal pendiente: 303,00 €\nTotal con recargo ordinario: 363,60 €\nCARTA DE PAGO" },
  { id: "V7-S07", family: "collection.enforcement_order", text: "PROVIDENCIA DE APREMIO\nClave de deuda: SYN-DEBT-A\nVencimiento ajustado: 05-04-2027\nPrincipal pendiente: 302,00 €\nTotal con recargo ordinario: 362,40 €\nCARTA DE PAGO" },
  { id: "V7-S08", family: "registry.tax_registration_resolution", text: "RESOLUCIÓN DE ALTA EN EL REGISTRO DE OPERADORES INTRACOMUNITARIOS\nReferencia de la resolución: SYN-ROI-08\nModelo de solicitud: 036\nFecha de solicitud: 21-04-2027\nFecha de efectos: 21-04-2027" },
  { id: "V7-S09", family: "collection.deferral_grant", text: planText({ debt: "SYN-DEBT-A", agreement: "SYN-PLAN-A", count: 9, principal: 270_000, interest: 6_000 }) },
  { id: "V7-S10", family: "seizure.bank_account", text: "DILIGENCIA DE EMBARGO DE CUENTA BANCARIA\nNúmero de diligencia: SYN-SEIZURE-BANK-B1\nClave de deuda: SYN-DEBT-B\nTotal de la deuda: 450,00 €\nLímite del embargo: 450,00 €\nImporte embargado: 110,00 €\nOrdinal opaco del activo: 1" },
  { id: "V7-S11", family: "seizure.bank_account", text: "DILIGENCIA DE EMBARGO DE CUENTA BANCARIA\nNúmero de diligencia: SYN-SEIZURE-BANK-B2\nClave de deuda: SYN-DEBT-B\nTotal de la deuda: 450,00 €\nLímite del embargo: 450,00 €\nImporte embargado: 30,00 €\nOrdinal opaco del activo: 2" },
  { id: "V7-S12", family: "collection.enforcement_order", text: "PROVIDENCIA DE APREMIO\nClave de deuda: SYN-DEBT-B\nVencimiento ajustado: 05-07-2027\nPrincipal pendiente: 370,00 €\nTotal con recargo ordinario: 450,00 €\nCARTA DE PAGO" },
  { id: "V7-S13", family: "collection.deferral_grant", text: planText({ debt: "SYN-DEBT-B", agreement: "SYN-PLAN-B", count: 9, principal: 270_000, interest: 7_000 }) },
  { id: "V7-S14", family: "collection.offset_requested", text: "ACUERDO DE COMPENSACIÓN A INSTANCIA\nCOMPENSACIÓN SOLICITADA\nReferencia del documento: SYN-OFFSET-DUPLICATE-14" },
  { id: "V7-S15", family: "collection.deferral_modification", text: planText({ debt: "SYN-DEBT-C", agreement: "SYN-PLAN-C-MOD", count: 10, principal: 300_000, interest: 5_000, modified: true, replaced: "SYN-PLAN-C-ORIGINAL" }) },
  { id: "V7-S16", family: "collection.deferral_grant", text: planText({ debt: "SYN-DEBT-C", agreement: "SYN-PLAN-C-ORIGINAL", count: 3, principal: 300_000, interest: 3_000 }) },
  { id: "V7-S17", family: "collection.deferral_grant", text: planText({ debt: "SYN-DEBT-D", agreement: "SYN-PLAN-D", count: 12, principal: 250_000, interest: 8_000 }) },
  { id: "V7-S18", family: "collection.external_debt", text: "DEUDA DE OTRO ORGANISMO EN RECAUDACIÓN AEAT\nReferencia de la deuda externa: SYN-EXTERNAL-DEBT-18\nPrincipal pendiente: 25,00 €\nTotal con recargo ordinario: 30,00 €" },
  { id: "V7-S19", family: "compliance.document_request", text: "REQUERIMIENTO DE DOCUMENTACIÓN\nNO INICIA PROCEDIMIENTO DE COMPROBACIÓN\nEjercicio solicitado: 2025\nEjercicio solicitado: 2026\nEjercicio solicitado: 2027\nCategoría documental: INVOICES\nCategoría documental: RECORD_BOOKS\nDías hábiles para responder: 10" },
  { id: "V7-S20", family: "assessment.final_provisional_assessment", text: "RESOLUCIÓN DE LIQUIDACIÓN PROVISIONAL\nRESOLUCIÓN FINAL DEL PROCEDIMIENTO\nReferencia de la liquidación final: SYN-ASSESSMENT-FINAL-20\nCuota liquidada: 90,00 €\nIntereses de demora: 6,00 €\nTotal a ingresar: 96,00 €\nSaldo declarado rechazado: 750,00 €\nMotivo de regularización: REJECTED_CARRYFORWARD\nCARTA DE PAGO\nEJEMPLAR PARA EL INTERESADO\nCOPIA PARA LA ENTIDAD" },
]);

function source(testCase: CorpusCaseV7, includePii = false): BoundedDocumentInput {
  const pii = includePii ? "\nIdentificador fiscal: IDENTITY_PRIVATE_SENTINEL\nCuenta: BANK_ACCOUNT_PRIVATE_SENTINEL\nNombre: PERSONA ULTRAPRIVADA" : "";
  return Object.freeze({
    ownerScope: OWNER,
    documentId: `synthetic-${testCase.id.toLowerCase()}`,
    pages: Object.freeze([
      Object.freeze({ pageNumber: 1, text: `${AEAT}\nFecha del documento: 17-07-2027\n${testCase.text}${pii}`, isBlank: false }),
    ]),
  });
}

describe("AEAT real corpus extractor V7", () => {
  it.each(CASES)("recognizes the V7 synthetic contract $id", async (testCase) => {
    const result = await extractAeatRealCorpusDocumentV7(source(testCase));
    expect(result).toMatchObject({
      status: "REVIEW_REQUIRED",
      familyId: testCase.family,
      retainedSourceContent: "NONE",
      sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED",
      confirmsDebt: false,
      confirmsPayment: false,
      confirmsRemittance: false,
      confirmsDeadline: false,
      confirmsDebtExtinction: false,
      confirmsCurrentRegistryStatus: false,
    });
  });

  it.each(CASES)("runs V7 end to end without a generic fallback: $id", async (testCase) => {
    const analysis = await analyzeFiscalNotificationDocumentInput(source(testCase));
    const documents = analysis.verticalSliceReview.documents.filter((item) => item.familyId === testCase.family);
    expect(documents).toHaveLength(1);
    expect(documents[0]?.reviewDocumentId).toContain("real-corpus-v7");
    expect(analysis.verticalSliceReview).toMatchObject({
      retainedSourceContent: "NONE",
      materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
      permitsDebtCreation: false,
      permitsDeadlineCreation: false,
      permitsPaymentAction: false,
      permitsAccountingAction: false,
    });
  });

  it("keeps sanction initiation, formal requirement and historical ROI semantics closed", async () => {
    const sanction = await extractAeatRealCorpusDocumentV7(source(CASES[0]!));
    const requirement = await extractAeatRealCorpusDocumentV7(source(CASES[1]!));
    const roi = await extractAeatRealCorpusDocumentV7(source(CASES[7]!));
    expect(sanction.fields).toEqual(expect.arrayContaining([expect.objectContaining({ fieldCode: "SANCTION_STAGE", value: "PROPOSAL_NOT_FINAL" })]));
    expect(requirement.fields).toEqual(expect.arrayContaining([expect.objectContaining({ fieldCode: "LEGAL_EFFECT", value: "NOT_DEBT_NOT_SANCTION" })]));
    expect(roi.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ fieldCode: "ROI_STATUS", value: "REGISTERED" }),
      expect.objectContaining({ fieldCode: "CURRENT_STATUS", value: "NOT_INFERRED" }),
    ]));
  });

  it("preserves offset rows, treats two payment copies as one operation and never confirms remittance", async () => {
    const offset = await extractAeatRealCorpusDocumentV7(source(CASES[4]!));
    const assessment = await extractAeatRealCorpusDocumentV7(source(CASES[19]!));
    const seizure = await extractAeatRealCorpusDocumentV7(source(CASES[9]!));
    expect(offset.offsetRows).toEqual([
      expect.objectContaining({ beforeCents: 42_000, appliedCents: 42_000, remainingCents: 0 }),
      expect.objectContaining({ beforeCents: 43_000, appliedCents: 8_000, remainingCents: 35_000 }),
    ]);
    expect(assessment.paymentFormOperationCount).toBe(1);
    expect(assessment.confirmsPayment).toBe(false);
    expect(seizure.bankSeizure?.remittedAmountCents).toBeNull();
    expect(seizure.confirmsRemittance).toBe(false);
  });

  it("projects only closed fields and strips direct identity from output", async () => {
    const outcome = await extractAeatRealCorpusDocumentV7(source(CASES[17]!, true));
    expect(JSON.stringify(outcome)).not.toMatch(/IDENTITY_PRIVATE_SENTINEL|BANK_ACCOUNT_PRIVATE_SENTINEL|PERSONA ULTRAPRIVADA/u);
    const review = projectRealCorpusReviewV7(outcome);
    expect(review.documents).toHaveLength(1);
    expect(JSON.stringify(review)).not.toMatch(/IDENTITY_PRIVATE_SENTINEL|BANK_ACCOUNT_PRIVATE_SENTINEL|PERSONA ULTRAPRIVADA/u);
    expect(() => projectRealCorpusReviewV7({
      ...outcome,
      fields: [...outcome.fields, Object.freeze({
        fieldCode: "UNSAFE_TEXT",
        label: "Estado del documento",
        kind: "TEXT" as const,
        value: "PERSONA ULTRAPRIVADA",
        evidence: Object.freeze({ pageNumbers: Object.freeze([1]), assertionType: "EXPLICIT_IN_DOCUMENT" as const }),
      })],
    })).toThrow("FISCAL_NOTIFICATION_VERTICAL_SLICE_REVIEW_INVALID");
  });

  it("keeps publication, effective notification and signature dates separate", async () => {
    const input = source({
      ...CASES[17]!,
      text: `${CASES[17]!.text}\nFecha de publicación: 01-07-2027\nFecha efectiva de notificación: 15-07-2027\nFecha de firma: 16-07-2027`,
    });
    const result = await extractAeatRealCorpusDocumentV7(input);
    expect(result.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ fieldCode: "PUBLICATION_DATE", value: "2027-07-01" }),
      expect.objectContaining({ fieldCode: "EFFECTIVE_NOTIFICATION_DATE", value: "2027-07-15" }),
      expect.objectContaining({ fieldCode: "SIGNATURE_DATE", value: "2027-07-16" }),
    ]));
    expect(result.confirmsDeadline).toBe(false);
  });

  it("fails closed when a required family fact or arithmetic invariant is missing", async () => {
    const incompleteRoi = source({
      id: "V7-INCOMPLETE-ROI",
      family: "registry.tax_registration_resolution",
      text: "RESOLUCIÓN DE ALTA EN EL REGISTRO DE OPERADORES INTRACOMUNITARIOS\nReferencia de la resolución: SYN-ROI-INCOMPLETE-1\nModelo de solicitud: 036",
    });
    const inconsistentAssessment = source({
      id: "V7-INCONSISTENT-ASSESSMENT",
      family: "assessment.final_provisional_assessment",
      text: "RESOLUCIÓN DE LIQUIDACIÓN PROVISIONAL\nRESOLUCIÓN FINAL DEL PROCEDIMIENTO\nReferencia de la liquidación final: SYN-ASSESSMENT-BAD-1\nCuota liquidada: 90,00 €\nIntereses de demora: 6,00 €\nTotal a ingresar: 97,00 €\nSaldo declarado rechazado: 750,00 €",
    });
    await expect(extractAeatRealCorpusDocumentV7(incompleteRoi)).resolves.toMatchObject({ status: "UNKNOWN", familyId: null });
    await expect(extractAeatRealCorpusDocumentV7(inconsistentAssessment)).resolves.toMatchObject({ status: "UNKNOWN", familyId: null });
  });

  it("does not mutate input and returns defensive frozen output", async () => {
    const input = source(CASES[8]!);
    const before = JSON.stringify(input);
    const result = await extractAeatRealCorpusDocumentV7(input);
    expect(JSON.stringify(input)).toBe(before);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.fields)).toBe(true);
    expect(Object.isFrozen(result.installments)).toBe(true);
    expect(Object.isFrozen(result.offsetRows)).toBe(true);
  });
});
