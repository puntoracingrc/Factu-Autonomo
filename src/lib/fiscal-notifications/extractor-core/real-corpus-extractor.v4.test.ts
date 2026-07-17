import { describe, expect, it } from "vitest";
import {
  reduceFiscalNotificationBatchAnalysisV2,
  FiscalNotificationBatchAnalysisIdentityErrorV2,
} from "../batch-analysis-identity.v2";
import { analyzeFiscalNotificationDocumentInput } from "../document-input-analysis";
import type { BoundedDocumentInput } from "../input-contract";
import { projectRealCorpusReviewV4 } from "../real-corpus-review.v4";
import { extractAeatRealCorpusDocumentV4, type RealCorpusFamilyIdV4, type RealCorpusSubtypeV4 } from "./real-corpus-extractor.v4";

const OWNER = "user:owner-synthetic-v4";
const AEAT = "AGENCIA ESTATAL DE ADMINISTRACIÓN TRIBUTARIA";

interface CorpusCase {
  readonly id: string;
  readonly family: RealCorpusFamilyIdV4;
  readonly subtype: RealCorpusSubtypeV4;
  readonly physical: number;
  readonly content: number;
  readonly title: string;
  readonly anchors: readonly string[];
  readonly extra?: string;
  readonly wrapper?: boolean;
}

const CASES: readonly CorpusCase[] = Object.freeze([
  { id: "001", family: "identity.clave_registration_receipt", subtype: "HIGH_LEVEL_REGISTRATION_WITH_TERMS", physical: 4, content: 3, title: "JUSTIFICANTE DE ALTA EN EL SISTEMA DE IDENTIFICACIÓN Y FIRMA CL@VE", anchors: ["NIVEL DE REGISTRO ALTO", "HA SIDO DADO DE ALTA"], extra: "Fecha de alta: 03-08-2020\nTÉRMINOS Y CONDICIONES" },
  { id: "002", family: "seizure.release", subtype: "MOVABLE_ASSET_RELEASE_WITH_ASSET_ANNEX", physical: 4, content: 3, title: "LEVANTAMIENTO DE EMBARGO", anchors: ["SE ACUERDA EL LEVANTAMIENTO", "Nº DE LA DILIGENCIA"], extra: "Número de diligencia: SYNSEIZURE002\nFecha del acuerdo: 03-08-2020\nFecha de la diligencia: 02-03-2008\nVEHÍCULO\nLEVANTAMIENTO TOTAL\nCANCELAR LA ANOTACIÓN" },
  { id: "003", family: "seizure.release", subtype: "REAL_ESTATE_RELEASE_WITH_REGISTRY_ANNEX", physical: 4, content: 3, title: "LEVANTAMIENTO DE EMBARGO", anchors: ["SE ACUERDA EL LEVANTAMIENTO", "Nº DE LA DILIGENCIA"], extra: "Número de diligencia: SYNSEIZURE003\nFecha del acuerdo: 03-08-2020\nFecha de la diligencia: 02-03-2008\nINMUEBLE\nREGISTRO DE LA PROPIEDAD" },
  { id: "004", family: "seizure.release", subtype: "COMMERCIAL_CREDIT_RELEASE_TO_THIRD_PARTY", physical: 2, content: 2, title: "LEVANTAMIENTO DE EMBARGO", anchors: ["SE ACUERDA EL LEVANTAMIENTO", "Nº DE LA DILIGENCIA"], extra: "Número de diligencia: SYNSEIZURE004\nFecha del acuerdo: 04-07-2025\nCRÉDITOS COMERCIALES" },
  { id: "005", family: "assessment.final_provisional_assessment", subtype: "MODEL_180_115_MISMATCH_WITH_INTEREST_AND_PAYMENT_FORM", physical: 10, content: 9, title: "NOTIFICACIÓN DE RESOLUCIÓN CON LIQUIDACIÓN PROVISIONAL", anchors: ["TOTAL A INGRESAR", "FINALIZA EL PROCEDIMIENTO", "PAGO DE LA DEUDA"], extra: "Referencia del procedimiento: SYNPROCEDURE180\nReferencia del acto: SYNACT005\nClave de liquidación: SYNLIQ005\nFecha de firma: 21-05-2025\nFecha de notificación de la propuesta: 20-04-2025\nModelo tributario: 180\nModelo relacionado: 115\nEjercicio fiscal: 2024\nRetenciones anuales declaradas: 1.000,00 €\nPagos periódicos declarados: 772,00 €\nCuota final: 228,00 €\nIntereses de demora: 3,07 €\nTotal a ingresar: 231,07 €\nReferencia de pago: SYNPAY005" },
  { id: "006", family: "seizure.compliance_reiteration", subtype: "THIRD_PARTY_CREDIT_RESPONSE_REITERATION", physical: 2, content: 2, title: "DOCUMENTO DE REITERACIÓN DE CUMPLIMIENTO DE OBLIGACIONES", anchors: ["SEGUNDO REQUERIMIENTO", "NO CONSTA LA RECEPCIÓN DEL ANEXO", "10 DÍAS HÁBILES"], extra: "Nº de la diligencia: SYNSEIZURE008\nFecha del acto: 05-05-2025" },
  { id: "007", family: "assessment.allegations_and_proposal", subtype: "MODEL_180_115_MISMATCH_LIMITED_CHECK", physical: 8, content: 7, title: "NOTIFICACIÓN DEL TRÁMITE DE ALEGACIONES Y PROPUESTA DE LIQUIDACIÓN PROVISIONAL", anchors: ["10 DÍAS HÁBILES", "RESULTADO DE LA PROPUESTA", "MODELO PARA EFECTUAR ALEGACIONES"], extra: "Referencia del procedimiento: SYNPROCEDURE180\nReferencia del acto: SYNACT007\nFecha de firma: 15-04-2025\nModelo tributario: 180\nModelo relacionado: 115\nEjercicio fiscal: 2024\nRetenciones anuales declaradas: 1.000,00 €\nPagos periódicos declarados: 772,00 €\nCuota propuesta: 228,00 €" },
  { id: "008", family: "seizure.commercial_credits", subtype: "THIRD_PARTY_PAYER_RESPONSE_AND_MULTIPLE_PAYMENT_FORMS", physical: 18, content: 12, title: "DILIGENCIA DE EMBARGO DE CRÉDITOS", anchors: ["OBLIGACIÓN DE CONTESTAR", "RETENER E INGRESAR"], extra: "Nº de la diligencia: SYNSEIZURE008\nFecha del acto: 04-04-2025\nImporte a embargar: 1.812,65 €\nReferencia de pago: SYNPAY008A\nReferencia de pago: SYNPAY008B" },
  { id: "009", family: "seizure.bank_account", subtype: "DEBTOR_NOTICE_WITH_BANK_ANNEX_AND_DELAYED_TRANSFER", physical: 6, content: 4, title: "NOTIFICACIÓN DE DILIGENCIA DE EMBARGO DE CUENTAS BANCARIAS", anchors: ["SALDOS DE LAS CUENTAS", "IMPORTE A EMBARGAR"], extra: "Nº de la diligencia: SYNSEIZURE009\nFecha del acto: 11-03-2025\nFecha de firma: 11-03-2025\nClave de deuda: SYNDEBT010\nDeuda pendiente: 425,60 €\nImporte a embargar: 425,60 €\n20 DÍAS NATURALES" },
  { id: "010", family: "collection.enforcement_order", subtype: "DEFAULTED_DEFERRAL_INSTALLMENT_WITH_PAYMENT_FORM", physical: 10, content: 9, title: "PROVIDENCIA DE APREMIO", anchors: ["PRINCIPAL PENDIENTE", "RECARGO DE APREMIO ORDINARIO", "PLAZOS DE PAGO"], extra: "CUOTA DEL APLAZAMIENTO\nClave de deuda: SYNDEBT010\nFin del período voluntario: 20-09-2024\nPrincipal pendiente: 354,67 €\nRecargo de apremio ordinario: 70,93 €\nTotal ordinario: 425,60 €\nReferencia de pago: SYNPAY010" },
  { id: "011", family: "collection.deferral_grant", subtype: "THREE_INSTALLMENTS_WITH_INTEREST_SCHEDULE", physical: 11, content: 9, title: "CONCESIÓN DEL APLAZAMIENTO/FRACCIONAMIENTO DE PAGO SIN GARANTÍA", anchors: ["ANEXO I: DEUDAS Y PLAZOS", "LIQUIDACIÓN DE INTERESES DE DEMORA"], extra: "Referencia del acuerdo: SYNAGREEMENT011\nClave de deuda: SYNDEBT010\nDeuda principal: 1.056,97 €\nTotal intereses: 10,60 €\nTotal del plan: 1.067,57 €\nCUOTA 1 | 20-09-2024 | 352,32 | 2,35 | 354,67 | SYNPAY010\nCUOTA 2 | 21-10-2024 | 352,32 | 3,53 | 355,85 | SYNPAY011B\nCUOTA 3 | 20-11-2024 | 352,33 | 4,72 | 357,05 | SYNPAY011C" },
  { id: "012", family: "seizure.commercial_credits", subtype: "DEBTOR_NOTICE_MULTI_DEBT_COMMERCIAL_CREDIT_SEIZURE", physical: 6, content: 5, title: "DILIGENCIA DE EMBARGO DE CRÉDITOS", anchors: ["DEUDAS DEL EXPEDIENTE EJECUTIVO", "CRÉDITOS A SU FAVOR"], extra: "Nº de la diligencia: SYNSEIZURE012\nClave de deuda: SYNDEBT017\nImporte pendiente: 1.480,74 €\nClave de deuda: SYNDEBT020\nImporte pendiente: 900,00 €\nClave de deuda: SYNDEBT012C\nImporte pendiente: 1.586,54 €" },
  { id: "013", family: "collection.enforcement_order", subtype: "STANDARD_ENFORCEMENT_WITH_PAYMENT_FORM", physical: 10, content: 9, title: "PROVIDENCIA DE APREMIO", anchors: ["PRINCIPAL PENDIENTE", "RECARGO DE APREMIO ORDINARIO", "PLAZOS DE PAGO"], extra: "Clave de deuda: SYNPLAN130\nFin del período voluntario: 22-08-2022\nPrincipal pendiente: 235,05 €\nReferencia de pago: SYNPAY013" },
  { id: "014", family: "collection.enforcement_order", subtype: "STANDARD_ENFORCEMENT_WITH_PAYMENT_FORM", physical: 10, content: 9, title: "PROVIDENCIA DE APREMIO", anchors: ["PRINCIPAL PENDIENTE", "RECARGO DE APREMIO ORDINARIO", "PLAZOS DE PAGO"], extra: "Clave de deuda: SYNPLAN303\nFin del período voluntario: 22-08-2022\nPrincipal pendiente: 380,01 €\nReferencia de pago: SYNPAY014" },
  { id: "015", family: "collection.enforcement_order", subtype: "FAILED_DELIVERY_COVER_ENFORCEMENT", physical: 12, content: 10, title: "PROVIDENCIA DE APREMIO", anchors: ["PRINCIPAL PENDIENTE", "RECARGO DE APREMIO ORDINARIO", "PLAZOS DE PAGO"], extra: "NCC actual: SYNNCC015\nNCC anterior: SYNNCC015OLD\nClave de deuda: SYNPLAN303\nFin del período voluntario: 20-07-2022\nPrincipal pendiente: 378,82 €\nReferencia de pago: SYNPAY015", wrapper: true },
  { id: "016", family: "collection.enforcement_order", subtype: "FAILED_DELIVERY_COVER_ENFORCEMENT", physical: 12, content: 10, title: "PROVIDENCIA DE APREMIO", anchors: ["PRINCIPAL PENDIENTE", "RECARGO DE APREMIO ORDINARIO", "PLAZOS DE PAGO"], extra: "NCC actual: SYNNCC016\nNCC anterior: SYNNCC016OLD\nClave de deuda: SYNPLAN130\nFin del período voluntario: 20-07-2022\nPrincipal pendiente: 232,44 €\nReferencia de pago: SYNPAY016", wrapper: true },
  { id: "017", family: "collection.enforcement_order", subtype: "STANDARD_ENFORCEMENT_WITH_PAYMENT_FORM", physical: 10, content: 9, title: "PROVIDENCIA DE APREMIO", anchors: ["PRINCIPAL PENDIENTE", "RECARGO DE APREMIO ORDINARIO", "PLAZOS DE PAGO"], extra: "Clave de deuda: SYNDEBT017\nPrincipal pendiente: 1.233,95 €\nTotal ordinario: 1.480,74 €\nReferencia de pago: SYNPAY017" },
  { id: "018", family: "seizure.movable_asset", subtype: "FAILED_DELIVERY_COVER_MULTI_DEBT_VEHICLE_SEIZURE", physical: 14, content: 8, title: "NOTIFICACIÓN DE DILIGENCIA DE EMBARGO DE BIENES MUEBLES", anchors: ["ANEXO 1", "ANEXO 2", "BIENES MUEBLES"], extra: "NCC actual: SYNNCC018\nNCC anterior: SYNNCC018OLD\nNº de la diligencia: SYNSEIZURE018\nFecha del acto: 23-07-2022\nImporte a embargar: 1.000,00 €\nClave de deuda: SYNDEBT018A\nImporte pendiente: 100,00 €\nClave de deuda: SYNDEBT018B\nImporte pendiente: 200,00 €\nClave de deuda: SYNDEBT018C\nImporte pendiente: 300,00 €\nClave de deuda: SYNDEBT018D\nImporte pendiente: 400,00 €\nReferencia de pago: SYNPAY018", wrapper: true },
  { id: "019", family: "collection.enforcement_order", subtype: "STANDARD_ENFORCEMENT_WITH_PAYMENT_FORM", physical: 10, content: 9, title: "PROVIDENCIA DE APREMIO", anchors: ["PRINCIPAL PENDIENTE", "RECARGO DE APREMIO ORDINARIO", "PLAZOS DE PAGO"], extra: "Clave de deuda: SYNPLAN303\nFin del período voluntario: 20-06-2022\nPrincipal pendiente: 377,64 €\nReferencia de pago: SYNPAY019" },
  { id: "020", family: "collection.enforcement_order", subtype: "STANDARD_ENFORCEMENT_WITH_PAYMENT_FORM", physical: 10, content: 9, title: "PROVIDENCIA DE APREMIO", anchors: ["PRINCIPAL PENDIENTE", "RECARGO DE APREMIO ORDINARIO", "PLAZOS DE PAGO"], extra: "Clave de deuda: SYNDEBT020\nPrincipal pendiente: 800,00 €\nTotal ordinario: 960,00 €\nReferencia de pago: SYNPAY020" },
]);

const EXPECTED_FIELD_CODES: Readonly<Record<string, readonly string[]>> = Object.freeze({
  "001": ["REGISTRATION_STATUS", "REGISTRATION_LEVEL", "REGISTRATION_METHOD", "REGISTRATION_DATE", "TERMS_ATTACHED"],
  "002": ["SEIZURE_ORDER_ID", "RELEASE_DATE", "CITED_SEIZURE_DATE", "ASSET_KIND", "RELEASE_EXTENT", "REGISTRY_CANCELLATION_ORDERED"],
  "003": ["SEIZURE_ORDER_ID", "RELEASE_DATE", "CITED_SEIZURE_DATE", "ASSET_KIND", "RELEASE_EXTENT"],
  "004": ["SEIZURE_ORDER_ID", "RELEASE_DATE", "ASSET_KIND", "THIRD_PARTY_ROLE"],
  "005": ["PROCEDURE_ID", "ACT_ID", "DEBT_KEY", "SIGNING_DATE", "PROPOSAL_NOTIFICATION_DATE", "FINAL_QUOTA", "LATE_PAYMENT_INTEREST", "DOCUMENT_TOTAL", "DECLARED_ANNUAL_WITHHOLDINGS", "PERIODIC_PAYMENTS", "TAX_MODEL", "RELATED_MODEL", "FISCAL_YEAR", "DOCUMENT_STATUS"],
  "006": ["SEIZURE_ORDER_ID", "ACTION_DATE", "RESPONSE_DEADLINE_RULE", "THIRD_PARTY_ROLE", "REJECTION_REASON", "EXPLICIT_CONSEQUENCE"],
  "007": ["PROCEDURE_ID", "ACT_ID", "SIGNING_DATE", "TAX_MODEL", "RELATED_MODEL", "FISCAL_YEAR", "PROPOSED_QUOTA", "DECLARED_ANNUAL_WITHHOLDINGS", "PERIODIC_PAYMENTS", "RESPONSE_DEADLINE_RULE", "DOCUMENTATION_REQUIRED", "SANCTION_WARNING"],
  "008": ["SEIZURE_ORDER_ID", "ACTION_DATE", "SEIZED_AMOUNT", "THIRD_PARTY_ROLE", "OBLIGATION_RESPOND", "OBLIGATION_WITHHOLD_AND_REMIT", "PAYMENT_TIME", "CREDIT_SCOPE"],
  "009": ["SEIZURE_ORDER_ID", "ACTION_DATE", "SIGNING_DATE", "DEBT_KEY", "SEIZED_AMOUNT", "OUTSTANDING_TOTAL", "ACCOUNT_OR_DEPOSIT", "TRANSFER_WAIT_DAYS"],
  "010": ["DEBT_KEY", "VOLUNTARY_PAYMENT_DEADLINE", "OUTSTANDING_PRINCIPAL", "EXECUTIVE_SURCHARGE_20", "TOTAL_WITH_20"],
  "011": ["AGREEMENT_ID", "DEBT_KEY", "ORIGINAL_TAX_PRINCIPAL", "DEFERRAL_INTEREST", "PAYMENT_METHOD", "GUARANTEE_TYPE"],
  "012": ["SEIZURE_ORDER_ID", "THIRD_PARTY_ROLE", "OBLIGATION_RESPOND", "OBLIGATION_WITHHOLD_AND_REMIT"],
  "013": ["DEBT_KEY", "VOLUNTARY_PAYMENT_DEADLINE", "OUTSTANDING_PRINCIPAL"],
  "014": ["DEBT_KEY", "VOLUNTARY_PAYMENT_DEADLINE", "OUTSTANDING_PRINCIPAL"],
  "015": ["NOTIFICATION_ID", "PREVIOUS_NOTIFICATION_ID", "NOTIFICATION_STATE", "DEBT_KEY", "VOLUNTARY_PAYMENT_DEADLINE", "OUTSTANDING_PRINCIPAL"],
  "016": ["NOTIFICATION_ID", "PREVIOUS_NOTIFICATION_ID", "NOTIFICATION_STATE", "DEBT_KEY", "VOLUNTARY_PAYMENT_DEADLINE", "OUTSTANDING_PRINCIPAL"],
  "017": ["DEBT_KEY", "OUTSTANDING_PRINCIPAL", "TOTAL_WITH_20"],
  "018": ["NOTIFICATION_ID", "PREVIOUS_NOTIFICATION_ID", "SEIZURE_ORDER_ID", "ACTION_DATE", "SEIZED_AMOUNT", "ASSET_KIND"],
  "019": ["DEBT_KEY", "VOLUNTARY_PAYMENT_DEADLINE", "OUTSTANDING_PRINCIPAL"],
  "020": ["DEBT_KEY", "OUTSTANDING_PRINCIPAL", "TOTAL_WITH_20"],
});

function source(testCase: CorpusCase, includePii = false): BoundedDocumentInput {
  const blankCount = testCase.physical - testCase.content;
  const blankPages = new Set(Array.from({ length: blankCount }, (_, index) => testCase.physical - index));
  const core = `${AEAT}\n${testCase.title}\n${testCase.anchors.join("\n")}\nReferencia del documento: SYNV4REF${testCase.id}X\nFecha del documento: 17-07-2026\n${testCase.extra ?? ""}${includePii ? "\nNIF: 12345678Z\nIBAN: ES1200000000000000000000\nNombre: PERSONA ULTRAPRIVADA" : ""}`;
  const actPage = testCase.wrapper ? 3 : 1;
  return Object.freeze({
    ownerScope: OWNER,
    documentId: `syn-v4-${testCase.id}`,
    pages: Object.freeze(Array.from({ length: testCase.physical }, (_, index) => {
      const pageNumber = index + 1;
      const isBlank = blankPages.has(pageNumber);
      const text = isBlank ? "" : pageNumber === actPage ? core : pageNumber === 1 && testCase.wrapper ? "NUEVO INTENTO DE NOTIFICACIÓN\nENTREGA ANTERIOR FALLIDA" : `ANEXO ${pageNumber}`;
      return Object.freeze({ pageNumber, text, isBlank });
    })),
  });
}

describe("AEAT real corpus extractor V4", () => {
  it.each(CASES)("recognizes all 20 synthetic contracts: $id", async (testCase) => {
    const result = await extractAeatRealCorpusDocumentV4(source(testCase));
    expect(result).toMatchObject({ status: "REVIEW_REQUIRED", familyId: testCase.family, subtype: testCase.subtype, physicalPageCount: testCase.physical, contentPageCount: testCase.content, sourceDocumentId: `syn-v4-${testCase.id}`, retainedSourceContent: "NONE", requiresHumanReview: true, materializationPolicy: "PROHIBITED", confirmsDebt: false, confirmsPayment: false, confirmsRemittance: false, confirmsDeadline: false });
    expect(result.segments.flatMap((segment) => segment.pageNumbers)).toHaveLength(testCase.physical);
    expect(result.segments.every((segment) => !segment.provesPayment && !segment.createsIndependentDebt)).toBe(true);
    const fieldCodes = new Set(result.fields.map((field) => field.fieldCode));
    expect(EXPECTED_FIELD_CODES[testCase.id]?.every((code) => fieldCodes.has(code))).toBe(true);
  });

  it.each(CASES)("runs all 20 contracts end to end through the production orchestrator: $id", async (testCase) => {
    const result = await analyzeFiscalNotificationDocumentInput(source(testCase));
    const matching = result.verticalSliceReview.documents.filter((document) => document.familyId === testCase.family);
    expect(matching).toHaveLength(1);
    expect(matching[0]).toMatchObject({ pageFrom: 1, pageTo: testCase.physical, requiresHumanReview: true });
    expect(result.verticalSliceReview).toMatchObject({ retainedSourceContent: "NONE", materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW", permitsDebtCreation: false, permitsDeadlineCreation: false, permitsPaymentAction: false, permitsAccountingAction: false });
  });

  it("does not let a failed-delivery cover hide the substantive act", async () => {
    const result = await extractAeatRealCorpusDocumentV4(source(CASES[14]!));
    expect(result.familyId).toBe("collection.enforcement_order");
    expect(result.segments[0]).toMatchObject({ type: "DELIVERY_COVER", relationToPrimary: "NOTIFICATION_EVIDENCE_FOR" });
    expect(result.segments.some((segment) => segment.type === "PRIMARY_ACT")).toBe(true);
  });

  it("keeps payment forms and surcharge outcomes separate from payment evidence", async () => {
    const result = await extractAeatRealCorpusDocumentV4(source(CASES[9]!));
    expect(result.paymentFormStatus).toBe("PAYMENT_FORM_ONLY");
    expect(result.paymentFormReferences).toEqual(["SYNPAY010"]);
    expect(result.amountScenarios.map((item) => item.code)).toEqual(["PRINCIPAL_ONLY_WITH_5_PERCENT_IF_PREPAID", "REDUCED_SURCHARGE_10_PERCENT", "ORDINARY_SURCHARGE_20_PERCENT"]);
    expect(result.confirmsPayment).toBe(false);
  });

  it("preserves every installment and every multi-debt observation independently", async () => {
    const grant = await extractAeatRealCorpusDocumentV4(source(CASES[10]!));
    const seizure = await extractAeatRealCorpusDocumentV4(source(CASES[11]!));
    expect(grant.installments).toHaveLength(3);
    expect(new Set(grant.installments.map((item) => item.dueDate)).size).toBe(3);
    expect(seizure.debtObservations).toHaveLength(3);
    expect(new Set(seizure.debtObservations.map((item) => item.debtKey)).size).toBe(3);
  });

  it("never returns raw PII, account digits, activation codes or OCR text", async () => {
    const result = await extractAeatRealCorpusDocumentV4(source(CASES[0]!, true));
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("12345678Z");
    expect(serialized).not.toContain("ES1200000000000000000000");
    expect(serialized).not.toContain("PERSONA ULTRAPRIVADA");
    expect(serialized).not.toContain("rawText");
  });

  it("projects through the production review boundary without duplicating the family", async () => {
    const input = source(CASES[4]!);
    const outcome = await extractAeatRealCorpusDocumentV4(input);
    const review = projectRealCorpusReviewV4(outcome);
    expect(review.documents).toHaveLength(1);
    expect(review.documents[0]?.familyId).toBe("assessment.final_provisional_assessment");
    const production = await analyzeFiscalNotificationDocumentInput(input);
    expect(production.verticalSliceReview.documents.filter((item) => item.familyId === outcome.familyId)).toHaveLength(1);
  });

  it("keeps every result bound to fileId + sha256 + documentId", async () => {
    const identity = Object.freeze({ fileId: "file-v4-001", documentId: "syn-v4-001", sourceSha256: "a".repeat(64) });
    const result = await extractAeatRealCorpusDocumentV4(source(CASES[0]!));
    expect(reduceFiscalNotificationBatchAnalysisV2({ queue: [identity], current: [], completed: { identity, value: result } })[0]).toMatchObject({ identity, value: { sourceDocumentId: identity.documentId } });
    expect(() => reduceFiscalNotificationBatchAnalysisV2({ queue: [identity], current: [], completed: { identity: { ...identity, sourceSha256: "b".repeat(64) }, value: result } })).toThrow(FiscalNotificationBatchAnalysisIdentityErrorV2);
  });
});
