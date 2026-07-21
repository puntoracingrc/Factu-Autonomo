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
  { id: "V7-S03", family: "seizure.bank_account", text: "DILIGENCIA DE EMBARGO DE CUENTA BANCARIA\nNúmero de diligencia: SYN-SEIZURE-BANK-A1\nClave de deuda: SYN-DEBT-A1\nTotal de la deuda: 400,00 €\nLímite del embargo: 400,00 €\nImporte embargado: 400,00 €\nOrdinal opaco del activo: 1" },
  { id: "V7-S04", family: "collection.enforcement_order", text: "PROVIDENCIA DE APREMIO\nPRINCIPAL RESTANTE DEL PLAN\nClave de deuda: SYN-DEBT-A1\nPrincipal pendiente: 1.800,05 €\nTotal con recargo ordinario: 2.160,06 €\nFin del período voluntario: 05-10-2027\nCARTA DE PAGO" },
  { id: "V7-S05", family: "collection.offset_ex_officio", text: "ACUERDO DE COMPENSACIÓN DE OFICIO\nCrédito aplicado: 500,00 €\nFILA COMPENSACION | SYN-DEBT-FULL1 | 420,00 | 420,00 | 0,00\nFILA COMPENSACION | SYN-DEBT-A1 | 430,00 | 80,00 | 350,00" },
  { id: "V7-S06", family: "collection.enforcement_order", text: "PROVIDENCIA DE APREMIO\nClave de deuda: SYN-DEBT-A1\nVencimiento ajustado: 05-05-2027\nPrincipal pendiente: 303,00 €\nTotal con recargo ordinario: 363,60 €\nCARTA DE PAGO" },
  { id: "V7-S07", family: "collection.enforcement_order", text: "PROVIDENCIA DE APREMIO\nClave de deuda: SYN-DEBT-A1\nVencimiento ajustado: 05-04-2027\nPrincipal pendiente: 302,00 €\nTotal con recargo ordinario: 362,40 €\nCARTA DE PAGO" },
  { id: "V7-S08", family: "registry.tax_registration_resolution", text: "RESOLUCIÓN DE ALTA EN EL REGISTRO DE OPERADORES INTRACOMUNITARIOS\nReferencia de la resolución: SYN-ROI-08\nModelo de solicitud: 036\nFecha de solicitud: 21-04-2027\nFecha de efectos: 21-04-2027" },
  { id: "V7-S09", family: "collection.deferral_grant", text: planText({ debt: "SYN-DEBT-A1", agreement: "SYN-PLAN-A1", count: 9, principal: 270_000, interest: 6_000 }) },
  { id: "V7-S10", family: "seizure.bank_account", text: "DILIGENCIA DE EMBARGO DE CUENTA BANCARIA\nNúmero de diligencia: SYN-SEIZURE-BANK-B1\nClave de deuda: SYN-DEBT-B1\nTotal de la deuda: 450,00 €\nLímite del embargo: 450,00 €\nImporte embargado: 110,00 €\nOrdinal opaco del activo: 1" },
  { id: "V7-S11", family: "seizure.bank_account", text: "DILIGENCIA DE EMBARGO DE CUENTA BANCARIA\nNúmero de diligencia: SYN-SEIZURE-BANK-B2\nClave de deuda: SYN-DEBT-B1\nTotal de la deuda: 450,00 €\nLímite del embargo: 450,00 €\nImporte embargado: 30,00 €\nOrdinal opaco del activo: 2" },
  { id: "V7-S12", family: "collection.enforcement_order", text: "PROVIDENCIA DE APREMIO\nClave de deuda: SYN-DEBT-B1\nVencimiento ajustado: 05-07-2027\nPrincipal pendiente: 370,00 €\nTotal con recargo ordinario: 450,00 €\nCARTA DE PAGO" },
  { id: "V7-S13", family: "collection.deferral_grant", text: planText({ debt: "SYN-DEBT-B1", agreement: "SYN-PLAN-B1", count: 9, principal: 270_000, interest: 7_000 }) },
  { id: "V7-S14", family: "collection.offset_requested", text: "ACUERDO DE COMPENSACIÓN A INSTANCIA\nCOMPENSACIÓN SOLICITADA\nReferencia del documento: SYN-OFFSET-DUPLICATE-14" },
  { id: "V7-S15", family: "collection.deferral_modification", text: planText({ debt: "SYN-DEBT-C1", agreement: "SYN-PLAN-C1-MOD", count: 10, principal: 300_000, interest: 5_000, modified: true, replaced: "SYN-PLAN-C1-ORIGINAL" }) },
  { id: "V7-S16", family: "collection.deferral_grant", text: planText({ debt: "SYN-DEBT-C1", agreement: "SYN-PLAN-C1-ORIGINAL", count: 3, principal: 300_000, interest: 3_000 }) },
  { id: "V7-S17", family: "collection.deferral_grant", text: planText({ debt: "SYN-DEBT-D1", agreement: "SYN-PLAN-D1", count: 12, principal: 250_000, interest: 8_000 }) },
  { id: "V7-S18", family: "collection.external_debt", text: "DEUDA DE OTRO ORGANISMO EN RECAUDACIÓN AEAT\nReferencia de la deuda externa: SYN-EXTERNAL-DEBT-18\nPrincipal pendiente: 25,00 €\nTotal con recargo ordinario: 30,00 €" },
  { id: "V7-S19", family: "compliance.document_request", text: "REQUERIMIENTO DE DOCUMENTACIÓN\nNO INICIA PROCEDIMIENTO DE COMPROBACIÓN\nEjercicio solicitado: 2025\nEjercicio solicitado: 2026\nEjercicio solicitado: 2027\nCategoría documental: INVOICES\nCategoría documental: RECORD_BOOKS\nDías hábiles para responder: 10" },
  { id: "V7-S20", family: "assessment.final_provisional_assessment", text: "RESOLUCIÓN DE LIQUIDACIÓN PROVISIONAL\nRESOLUCIÓN FINAL DEL PROCEDIMIENTO\nReferencia de la liquidación final: SYN-ASSESSMENT-FINAL-20\nCuota liquidada: 90,00 €\nIntereses de demora: 6,00 €\nTotal a ingresar: 96,00 €\nSaldo declarado rechazado: 750,00 €\nMotivo de regularización: Saldo declarado de otro ejercicio no admitido\nCARTA DE PAGO\nEJEMPLAR PARA EL INTERESADO\nCOPIA PARA LA ENTIDAD" },
]);

function source(testCase: CorpusCaseV7, includePii = false): BoundedDocumentInput {
  return sourceText(testCase.id, testCase.text, includePii);
}

function sourceText(
  id: string,
  text: string,
  includePii = false,
): BoundedDocumentInput {
  const pii = includePii ? "\nIdentificador fiscal: IDENTITY_PRIVATE_SENTINEL\nCuenta: BANK_ACCOUNT_PRIVATE_SENTINEL\nNombre: PERSONA ULTRAPRIVADA" : "";
  return Object.freeze({
    ownerScope: OWNER,
    documentId: `synthetic-${id.toLowerCase()}`,
    pages: Object.freeze([
      Object.freeze({ pageNumber: 1, text: `${AEAT}\nFecha del documento: 17-07-2027\n${text}${pii}`, isBlank: false }),
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

  it("keeps printed sanction and ROI fields without turning recognition titles into facts", async () => {
    const sanction = await extractAeatRealCorpusDocumentV7(source(CASES[0]!));
    const requirement = await extractAeatRealCorpusDocumentV7(source(CASES[1]!));
    const roi = await extractAeatRealCorpusDocumentV7(source(CASES[7]!));
    const assessment = await extractAeatRealCorpusDocumentV7(source(CASES[19]!));
    expect(sanction.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ fieldCode: "SANCTION_REFERENCE" }),
      expect.objectContaining({ fieldCode: "INITIAL_FINE_PROPOSAL" }),
      expect.objectContaining({ fieldCode: "ALLEGATION_BUSINESS_DAYS" }),
    ]));
    expect(sanction.fields.some((field) => field.fieldCode === "SANCTION_STAGE")).toBe(false);
    expect(requirement.fields.some((field) => field.fieldCode === "LEGAL_EFFECT")).toBe(false);
    expect(roi.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ fieldCode: "ACT_ID" }),
      expect.objectContaining({ fieldCode: "REQUEST_DATE" }),
      expect.objectContaining({ fieldCode: "EFFECTIVE_DATE" }),
    ]));
    expect(roi.fields.some((field) =>
      field.fieldCode === "ROI_STATUS" || field.fieldCode === "CURRENT_STATUS",
    )).toBe(false);
    expect(assessment.fields.some((field) =>
      field.fieldCode === "PROCEDURE_STAGE" ||
      field.fieldCode === "PAYMENT_FORM_STATUS",
    )).toBe(false);
    const modifiedPlan = await extractAeatRealCorpusDocumentV7(source(CASES[14]!));
    expect(modifiedPlan.fields.some(
      (field) => field.fieldCode === "SCHEDULE_STATE",
    )).toBe(false);
    const printedScheduleState = await extractAeatRealCorpusDocumentV7(
      sourceText(
        "V7-PRINTED-SCHEDULE-STATE",
        `${CASES[14]!.text}\nEstado del calendario: Calendario modificado`,
      ),
    );
    expect(printedScheduleState.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({
        fieldCode: "SCHEDULE_STATE",
        kind: "TEXT",
        value: "Calendario modificado",
      }),
    ]));
  });

  it("does not infer a signing date from an administrative role and generic date", async () => {
    const result = await extractAeatRealCorpusDocumentV7(sourceText(
      "V7-NOT-SIGNING-DATE",
      [
        "DILIGENCIA DE EMBARGO DE CUENTA BANCARIA",
        "Número de diligencia: SYN-SEIZURE-NOT-SIGNING",
        "Clave de deuda: SYN-DEBT-NOT-SIGNING",
        "Importe embargado: 100,00 €",
        "Responsable del órgano emisor de la Agencia Tributaria, en fecha 18-07-2027",
      ].join("\n"),
    ));

    expect(result.fields.some(
      (field) => field.fieldCode === "SIGNATURE_DATE",
    )).toBe(false);
  });

  it("does not join a signature marker with a following registration date", async () => {
    const result = await extractAeatRealCorpusDocumentV7(sourceText(
      "V7-SIGNATURE-MARKER-REGISTRATION-DATE",
      [
        "REQUERIMIENTO FORMAL DE PRESENTACIÓN",
        "Referencia del procedimiento: SYN-PROCEDURE-REGISTERED-1",
        "Modelo 130",
        "Dispone de 10 días hábiles para responder.",
        "Documento firmado electrónicamente",
        "Fecha de registro: 18-07-2027",
      ].join("\n"),
    ));

    expect(result.fields.some(
      (field) => field.fieldCode === "SIGNATURE_DATE",
    )).toBe(false);
    expect(result.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({
        fieldCode: "ISSUE_DATE",
        value: "2027-07-17",
      }),
    ]));
  });

  it("extracts useful observed facts from realistic wrapped V7 wording", async () => {
    const formalRequirement = source({
      id: "V7-REALISTIC-FORMAL",
      family: "compliance.formal_filing_requirement",
      text: [
        "REQUERIMIENTO",
        "Referencia:",
        "SYN-PROCEDURE-FORMAL-1",
        "Se requiere la presentación de la declaración correspondiente al modelo 130.",
        "Dispone de un plazo de 10 días hábiles para contestar.",
      ].join("\n"),
    });
    const roiResolution = source({
      id: "V7-REALISTIC-ROI",
      family: "registry.tax_registration_resolution",
      text: [
        "ACUERDO DE ALTA EN EL REGISTRO DE OPERADORES INTRACOMUNITARIOS",
        "Referencia: SYN-ACT-ROI-1",
        "La declaración censal (modelo 036) se presentó en fecha 21-04-2027.",
        "Se acuerda el alta en el registro con efectos desde el 01-05-2027.",
      ].join("\n"),
    });
    const documentRequest = source({
      id: "V7-REALISTIC-DOCUMENT-REQUEST",
      family: "compliance.document_request",
      text: [
        "REQUERIMIENTO",
        "Referencia:",
        "SYN-PROCEDURE-DOCUMENTS-1",
        "Documentación solicitada para el ejercicio 2026.",
        "Dispone de un plazo de 10 días hábiles para contestar.",
        "Este requerimiento no supone el inicio de un procedimiento de comprobación tributaria.",
      ].join("\n"),
    });

    const formal = await extractAeatRealCorpusDocumentV7(formalRequirement);
    const roi = await extractAeatRealCorpusDocumentV7(roiResolution);
    const request = await extractAeatRealCorpusDocumentV7(documentRequest);

    expect(formal).toMatchObject({
      status: "REVIEW_REQUIRED",
      familyId: "compliance.formal_filing_requirement",
    });
    expect(formal.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ fieldCode: "PROCEDURE_ID", value: "SYN-PROCEDURE-FORMAL-1" }),
      expect.objectContaining({ fieldCode: "REQUEST_MODEL", value: "130" }),
      expect.objectContaining({ fieldCode: "RESPONSE_BUSINESS_DAYS", value: 10 }),
    ]));
    expect(roi).toMatchObject({
      status: "REVIEW_REQUIRED",
      familyId: "registry.tax_registration_resolution",
    });
    expect(roi.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ fieldCode: "ACT_ID", value: "SYN-ACT-ROI-1" }),
      expect.objectContaining({ fieldCode: "REQUEST_MODEL", value: "036" }),
      expect.objectContaining({ fieldCode: "REQUEST_DATE", value: "2027-04-21" }),
      expect.objectContaining({ fieldCode: "EFFECTIVE_DATE", value: "2027-05-01" }),
    ]));
    expect(request).toMatchObject({
      status: "REVIEW_REQUIRED",
      familyId: "compliance.document_request",
    });
    expect(request.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ fieldCode: "PROCEDURE_ID", value: "SYN-PROCEDURE-DOCUMENTS-1" }),
      expect.objectContaining({ fieldCode: "RESPONSE_BUSINESS_DAYS", value: 10 }),
      expect.objectContaining({ fieldCode: "ASSESSMENT_START", value: "No inicia procedimiento de comprobación" }),
    ]));
    expect(JSON.stringify([formal, roi, request])).not.toMatch(
      /EXACT_|INTEGER:|BOOLEAN:|EXPLANATION:|_DURATION|_CONTENT/u,
    );
  });

  it("does not reclassify an assessment proposal as a filing requirement", async () => {
    const outcome = await extractAeatRealCorpusDocumentV7(
      sourceText(
        "V7-ASSESSMENT-PROPOSAL-NOT-FORMAL-FILING",
        [
          "NOTIFICACIÓN DEL TRÁMITE DE ALEGACIONES Y PROPUESTA DE LIQUIDACIÓN PROVISIONAL",
          "Se requiere la presentación de una declaración del modelo 180.",
          "Dispone de 10 días hábiles para formular alegaciones.",
        ].join("\n"),
      ),
    );

    expect(outcome).toMatchObject({ status: "UNKNOWN", familyId: null });
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

  it("keeps one observed payment-form reference with provenance from both printed copies", async () => {
    const paymentCopy = [
      "AGENCIA TRIBUTARIA DOCUMENTO DE PAGO",
      "Clave de liquidación",
      "A 0000000000000001",
      "Importe para ingresar: 96,00 €",
      "700000000001P",
    ].join("\n");
    const input: BoundedDocumentInput = Object.freeze({
      ownerScope: OWNER,
      documentId: "synthetic-v7-payment-reference-copies",
      pages: Object.freeze([
        Object.freeze({
          pageNumber: 1,
          text: `${AEAT}\nRESOLUCIÓN DE LIQUIDACIÓN PROVISIONAL\nRESOLUCIÓN FINAL DEL PROCEDIMIENTO\nReferencia de la liquidación final: SYN-ASSESSMENT-PAYMENT-1\nCuota liquidada: 90,00 €\nIntereses de demora: 6,00 €\nTotal a ingresar: 96,00 €\nCARTA DE PAGO`,
          isBlank: false,
        }),
        Object.freeze({ pageNumber: 2, text: paymentCopy, isBlank: false }),
        Object.freeze({ pageNumber: 3, text: paymentCopy, isBlank: false }),
      ]),
    });

    const result = await extractAeatRealCorpusDocumentV7(input);
    expect(
      result.fields.filter(
        (field) => field.fieldCode === "PAYMENT_FORM_REFERENCE",
      ),
    ).toEqual([
      expect.objectContaining({
        kind: "REFERENCE",
        value: "700000000001P",
        evidence: expect.objectContaining({ pageNumbers: [2, 3] }),
      }),
    ]);
    expect(
      result.fields.filter((field) => field.fieldCode === "LIQUIDATION_KEY"),
    ).toEqual([
      expect.objectContaining({
        kind: "REFERENCE",
        value: "A0000000000000001",
        evidence: expect.objectContaining({ pageNumbers: [2, 3] }),
      }),
    ]);
    expect(result.paymentFormOperationCount).toBe(1);
    expect(result.confirmsPayment).toBe(false);
  });

  it("prefers the explicitly labeled payment reference over a structural fallback", async () => {
    const paymentCopy = [
      "AGENCIA TRIBUTARIA DOCUMENTO DE PAGO",
      "Clave de liquidación",
      "A 0000000000000001",
      "Número de referencia: L0000000000000000001",
      "Importe para ingresar: 96,00 €",
      "700000000001P",
    ].join("\n");
    const input: BoundedDocumentInput = Object.freeze({
      ownerScope: OWNER,
      documentId: "synthetic-v7-labeled-payment-reference",
      pages: Object.freeze([
        Object.freeze({
          pageNumber: 1,
          text: `${AEAT}\nRESOLUCIÓN DE LIQUIDACIÓN PROVISIONAL\nRESOLUCIÓN FINAL DEL PROCEDIMIENTO\nReferencia de la liquidación final: SYN-ASSESSMENT-PAYMENT-2\nCuota liquidada: 90,00 €\nIntereses de demora: 6,00 €\nTotal a ingresar: 96,00 €\nCARTA DE PAGO`,
          isBlank: false,
        }),
        Object.freeze({ pageNumber: 2, text: paymentCopy, isBlank: false }),
        Object.freeze({ pageNumber: 3, text: paymentCopy, isBlank: false }),
      ]),
    });

    const result = await extractAeatRealCorpusDocumentV7(input);
    expect(
      result.fields.find(
        (field) => field.fieldCode === "PAYMENT_FORM_REFERENCE",
      ),
    ).toEqual(
      expect.objectContaining({
        kind: "REFERENCE",
        value: "L0000000000000000001",
        evidence: expect.objectContaining({ pageNumbers: [2, 3] }),
      }),
    );
  });

  it("keeps model 180 separate from model 002 and rejects a quota mislabeled as interest", async () => {
    const input: BoundedDocumentInput = Object.freeze({
      ownerScope: OWNER,
      documentId: "synthetic-v7-model-180-assessment",
      pages: Object.freeze([
        Object.freeze({
          pageNumber: 1,
          isBlank: false,
          text: [
            AEAT,
            "NOTIFICACIÓN DE RESOLUCIÓN CON LIQUIDACIÓN PROVISIONAL",
            "TOTAL A INGRESAR",
            "FINALIZA EL PROCEDIMIENTO",
            "PAGO DE LA DEUDA",
            "Referencia del procedimiento: SYN-PROCEDURE-180-2024",
            "Referencia del acto: SYN-ACT-180-2024",
            "Fecha de firma: 21-05-2025",
            "Modelo 180",
            "Modelo relacionado: 115",
            "Ejercicio fiscal: 2024",
            "Retenciones anuales declaradas: 684,00 €",
            "Pagos periódicos declarados: 456,00 €",
            "Cuota resultante: 228,00 €",
            "Intereses de demora: 228,00 €",
            "Intereses de demora: 3,07 €",
            "Total a ingresar: 231,07 €",
          ].join("\n"),
        }),
        Object.freeze({
          pageNumber: 2,
          isBlank: false,
          text: [
            "AGENCIA TRIBUTARIA DOCUMENTO DE PAGO",
            "CARTA DE PAGO",
            "Modelo: 002",
            "Clave de liquidación",
            "A 0000000000000024",
            "Importe para ingresar: 231,07 €",
            "L 0000000000000000024",
          ].join("\n"),
        }),
      ]),
    });
    const result = await extractAeatRealCorpusDocumentV7(input);
    expect(result.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ fieldCode: "TAX_MODEL", value: "180" }),
      expect.objectContaining({ fieldCode: "RELATED_MODEL", value: "115" }),
      expect.objectContaining({ fieldCode: "FISCAL_YEAR", value: "2024" }),
      expect.objectContaining({ fieldCode: "PAYMENT_FORM_MODEL", value: "002" }),
      expect.objectContaining({ fieldCode: "LIQUIDATION_KEY", value: "A0000000000000024" }),
      expect.objectContaining({ fieldCode: "PAYMENT_FORM_REFERENCE", value: "L0000000000000000024" }),
      expect.objectContaining({ fieldCode: "FINAL_QUOTA", amountCents: 22_800 }),
      expect.objectContaining({ fieldCode: "LATE_PAYMENT_INTEREST", amountCents: 307 }),
      expect.objectContaining({ fieldCode: "DOCUMENT_TOTAL", amountCents: 23_107 }),
    ]));
    expect(result.fields.some((field) =>
      field.fieldCode === "LATE_PAYMENT_INTEREST" && field.kind === "MONEY" &&
      field.amountCents === 22_800,
    )).toBe(false);
    expect(result.fields.filter((field) => field.fieldCode === "LIQUIDATION_KEY")).toHaveLength(1);

    const analyzed = await analyzeFiscalNotificationDocumentInput(input);
    const assessments = analyzed.verticalSliceReview.documents.filter((document) =>
      document.familyId === "assessment.final_provisional_assessment",
    );
    expect(assessments).toHaveLength(1);
    expect(assessments[0]?.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ canonicalType: "MODEL", displayValue: "180" }),
      expect.objectContaining({ canonicalType: "PAYMENT_FORM_MODEL", displayValue: "002" }),
      expect.objectContaining({ canonicalType: "TAX_QUOTA", amountCents: 22_800 }),
      expect.objectContaining({ canonicalType: "LATE_INTEREST", amountCents: 307 }),
      expect.objectContaining({ canonicalType: "TOTAL_CLAIMED", amountCents: 23_107 }),
    ]));
    expect(assessments[0]?.mathematicalIntegrity).toMatchObject({
      status: "VALIDATED_EXACT",
      persistenceDecision: "ALLOW_CORE",
    });
  });

  it("extracts a spaced historical procedure identifier without using nearby identity", async () => {
    const request = source({
      id: "V7-HISTORICAL-PROCEDURE",
      family: "compliance.document_request",
      text: [
        "REQUERIMIENTO DE DOCUMENTACIÓN",
        "2027 VIS 00000008 S",
        "Ejercicio solicitado: 2026",
        "Días hábiles para responder: 10",
        "NO INICIA PROCEDIMIENTO DE COMPROBACIÓN",
      ].join("\n"),
    });

    const result = await extractAeatRealCorpusDocumentV7(request);
    expect(result.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldCode: "PROCEDURE_ID",
          kind: "REFERENCE",
          value: "2027VIS00000008S",
          evidence: expect.objectContaining({ pageNumbers: [1] }),
        }),
      ]),
    );
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
    })).toThrow("FISCAL_NOTIFICATION_VERTICAL_SLICE_REVIEW_PRIVACY_REJECTED");
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

  it("does not classify a grant as a modification from incidental legal wording", async () => {
    const input: BoundedDocumentInput = Object.freeze({
      ownerScope: OWNER,
      documentId: "synthetic-v7-grant-with-incidental-modification",
      pages: Object.freeze([
        Object.freeze({
          pageNumber: 1,
          text: `${AEAT}\n${planText({ debt: "SYN-DEBT-GRANT", agreement: "SYN-PLAN-GRANT", count: 2, principal: 20_000, interest: 1_000 })}`,
          isBlank: false,
        }),
        Object.freeze({
          pageNumber: 2,
          text: "La modificación posterior deberá solicitarse y no producirá efectos sobre las fracciones ya vencidas.",
          isBlank: false,
        }),
      ]),
    });

    await expect(extractAeatRealCorpusDocumentV7(input)).resolves.toMatchObject({
      status: "REVIEW_REQUIRED",
      familyId: "collection.deferral_grant",
    });
  });

  it("does not promote installment or effect dates to document issue date", async () => {
    const input: BoundedDocumentInput = Object.freeze({
      ownerScope: OWNER,
      documentId: "synthetic-v7-plan-without-issue-date",
      pages: Object.freeze([
        Object.freeze({
          pageNumber: 1,
          text: `${AEAT}\n${planText({ debt: "SYN-DEBT-NO-ISSUE", agreement: "SYN-PLAN-NO-ISSUE", count: 2, principal: 20_000, interest: 1_000 })}\nFecha de efectos: 01-08-2027`,
          isBlank: false,
        }),
      ]),
    });

    const result = await extractAeatRealCorpusDocumentV7(input);
    expect(result.fields.some((field) => field.fieldCode === "ISSUE_DATE")).toBe(
      false,
    );
    expect(result.installments).toHaveLength(2);
  });

  it("restores historical vertical deferral tables as observed plan facts", async () => {
    const input: BoundedDocumentInput = Object.freeze({
      ownerScope: OWNER,
      documentId: "synthetic-v7-historical-deferral-table",
      pages: Object.freeze([
        Object.freeze({
          pageNumber: 1,
          text: [
            AEAT,
            "CONCESIÓN DEL APLAZAMIENTO/FRACCIONAMIENTO DE PAGO",
            "Referencia del acuerdo: SYN-PLAN-HISTORICAL-001",
            "Número liquidación: X0000000000000001",
            "Importe principal",
            "Recargo de apremio",
            "Importe total deuda",
            "Importe de los intereses",
            "Importe total del plazo",
            "Fecha de vencimiento",
            "100,00 0,00 100,00 5,00 105,00 20-08-2027",
            "TOTAL",
            "100,00 0,00 100,00 5,00 105,00",
          ].join("\n"),
          isBlank: false,
        }),
      ]),
    });

    const result = await extractAeatRealCorpusDocumentV7(input);

    expect(result).toMatchObject({
      status: "REVIEW_REQUIRED",
      familyId: "collection.deferral_grant",
      paymentPlan: {
        agreementId: "SYN-PLAN-HISTORICAL-001",
        debtKey: "X0000000000000001",
        principalCents: 10_000,
        interestCents: 500,
      },
      installments: [
        {
          sequence: 1,
          dueDate: "2027-08-20",
          baseCents: 10_000,
          deferralInterestCents: 500,
          totalCents: 10_500,
          pageNumber: 1,
        },
      ],
    });
    expect(result.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldCode: "DEBT_KEY",
          value: "X0000000000000001",
        }),
        expect.objectContaining({
          fieldCode: "PLAN_PRINCIPAL",
          amountCents: 10_000,
        }),
        expect.objectContaining({
          fieldCode: "PLAN_INTEREST",
          amountCents: 500,
        }),
        expect.objectContaining({
          fieldCode: "PLAN_TOTAL",
          amountCents: 10_500,
        }),
      ]),
    );
    expect(result.fields.some((field) => field.fieldCode === "SIGNATURE_DATE")).toBe(
      false,
    );

    const analyzed = await analyzeFiscalNotificationDocumentInput(input);
    const storedMoney = analyzed.verticalSliceReview.documents
      .find((document) => document.familyId === "collection.deferral_grant")
      ?.fields.filter((field) => field.semantic === "MONEY")
      .map((field) => field.amountCents);
    expect(storedMoney).toEqual(
      expect.arrayContaining([10_000, 500, 10_500]),
    );
  });

  it("reconstructs four-column installment rows and reconciles their printed totals", async () => {
    const input: BoundedDocumentInput = Object.freeze({
      ownerScope: OWNER,
      documentId: "synthetic-v7-three-installment-table",
      pages: Object.freeze([
        Object.freeze({
          pageNumber: 1,
          text: [
            AEAT,
            "CONCESIÓN DEL APLAZAMIENTO/FRACCIONAMIENTO DE PAGO",
            "Referencia del acuerdo: SYN-PLAN-THREE-ROWS-001",
            "Número liquidación: SYN-DEBT-THREE-ROWS-001",
            "Cuota Vencimiento Principal Intereses de demora Recargo ejecutivo Total cuota",
            "1 22/06/2026 70,39 0,48 0,00 70,87",
            "2 20/07/2026 70,39 0,71 0,00 71,10",
            "3 20/08/2026 70,41 0,96 0,00 71,37",
            "Totales 211,19 2,15 0,00 213,34",
          ].join("\n"),
          isBlank: false,
        }),
      ]),
    });

    const result = await extractAeatRealCorpusDocumentV7(input);

    expect(result).toMatchObject({
      status: "REVIEW_REQUIRED",
      familyId: "collection.deferral_grant",
      installments: [
        {
          sequence: 1,
          dueDate: "2026-06-22",
          baseCents: 7_039,
          deferralInterestCents: 48,
          enforcementSurchargeCents: 0,
          totalCents: 7_087,
        },
        {
          sequence: 2,
          dueDate: "2026-07-20",
          baseCents: 7_039,
          deferralInterestCents: 71,
          enforcementSurchargeCents: 0,
          totalCents: 7_110,
        },
        {
          sequence: 3,
          dueDate: "2026-08-20",
          baseCents: 7_041,
          deferralInterestCents: 96,
          enforcementSurchargeCents: 0,
          totalCents: 7_137,
        },
      ],
    });
    expect(result.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldCode: "PLAN_PRINCIPAL",
          amountCents: 21_119,
        }),
        expect.objectContaining({
          fieldCode: "PLAN_INTEREST",
          amountCents: 215,
        }),
        expect.objectContaining({
          fieldCode: "PLAN_TOTAL",
          amountCents: 21_334,
        }),
      ]),
    );

    const analyzed = await analyzeFiscalNotificationDocumentInput(input);
    const document = analyzed.verticalSliceReview.documents.find(
      (item) => item.familyId === "collection.deferral_grant",
    );
    expect(document?.amountReconciliation).toMatchObject({
      status: "MATCHED",
      passCount: 1,
      requiresManualReview: false,
      totals: {
        installmentCount: 3,
        principalCents: 21_119,
        interestCents: 215,
        surchargeCents: 0,
        totalCents: 21_334,
        printedPrincipalCents: 21_119,
        printedInterestCents: 215,
        printedTotalCents: 21_334,
      },
    });
    expect(document?.amountReconciliation?.equations).toHaveLength(7);
    expect(
      document?.amountReconciliation?.equations.every(
        (equation) => equation.status === "MATCHED",
      ),
    ).toBe(true);
  });

  it("records a printed plan total mismatch instead of hiding it behind balanced rows", async () => {
    const input: BoundedDocumentInput = Object.freeze({
      ownerScope: OWNER,
      documentId: "synthetic-v7-mismatched-printed-plan-total",
      pages: Object.freeze([
        Object.freeze({
          pageNumber: 1,
          text: [
            AEAT,
            "CONCESIÓN DEL APLAZAMIENTO/FRACCIONAMIENTO DE PAGO",
            "Referencia del acuerdo: SYN-PLAN-MISMATCH-001",
            "Número liquidación: SYN-DEBT-MISMATCH-001",
            "Cuota Vencimiento Principal Intereses de demora Recargo ejecutivo Total cuota",
            "1 22/06/2026 70,39 0,48 0,00 70,87",
            "2 20/07/2026 70,39 0,71 0,00 71,10",
            "3 20/08/2026 70,41 0,96 0,00 71,37",
            "Totales 211,19 2,15 0,00 214,34",
          ].join("\n"),
          isBlank: false,
        }),
      ]),
    });

    const analyzed = await analyzeFiscalNotificationDocumentInput(input);
    const reconciliation = analyzed.verticalSliceReview.documents.find(
      (item) => item.familyId === "collection.deferral_grant",
    )?.amountReconciliation;
    const printedTotalEquation = reconciliation?.equations.find(
      (equation) =>
        equation.formula === "INSTALLMENT_ROWS_EQUAL_PRINTED_PLAN_TOTAL",
    );

    expect(reconciliation).toMatchObject({
      status: "REVIEW_REQUIRED",
      requiresManualReview: true,
    });
    expect(printedTotalEquation).toMatchObject({
      status: "MISMATCH_REVIEW_REQUIRED",
      leftCents: 21_334,
      rightCents: 21_434,
      differenceCents: -100,
    });
  });

  it("retains an inconsistent installment row and sends it to review", async () => {
    const analyzed = await analyzeFiscalNotificationDocumentInput(
      Object.freeze({
        ownerScope: OWNER,
        documentId: "synthetic-v7-mismatched-installment-row",
        pages: Object.freeze([
          Object.freeze({
            pageNumber: 1,
            text: [
              AEAT,
              "CONCESIÓN DEL APLAZAMIENTO/FRACCIONAMIENTO DE PAGO",
              "Referencia del acuerdo: SYN-PLAN-ROW-MISMATCH-001",
              "Número liquidación: SYN-DEBT-ROW-MISMATCH-001",
              "Cuota Vencimiento Principal Intereses de demora Recargo ejecutivo Total cuota",
              "1 22/06/2026 70,39 0,48 0,00 70,99",
              "2 20/07/2026 70,39 0,71 0,00 71,10",
              "3 20/08/2026 70,41 0,96 0,00 71,37",
              "Totales 211,19 2,15 0,00 213,46",
            ].join("\n"),
            isBlank: false,
          }),
        ]),
      }),
    );
    const reconciliation = analyzed.verticalSliceReview.documents.find(
      (item) => item.familyId === "collection.deferral_grant",
    )?.amountReconciliation;

    expect(reconciliation).toMatchObject({
      status: "REVIEW_REQUIRED",
      requiresManualReview: true,
    });
    expect(reconciliation?.installments[0]).toMatchObject({
      sequence: 1,
      principalCents: 7_039,
      interestCents: 48,
      surchargeCents: 0,
      totalCents: 7_099,
      equationStatus: "MISMATCH_REVIEW_REQUIRED",
    });
    expect(
      reconciliation?.equations.find(
        (equation) => equation.equationId === "installment:1",
      ),
    ).toMatchObject({
      leftCents: 7_087,
      rightCents: 7_099,
      differenceCents: -12,
    });
  });

  it("keeps an interest-annex total without turning its column header into plan totals", async () => {
    const input: BoundedDocumentInput = Object.freeze({
      ownerScope: OWNER,
      documentId: "synthetic-v7-deferral-interest-annex",
      pages: Object.freeze([
        Object.freeze({
          pageNumber: 1,
          text: [
            AEAT,
            "CONCESIÓN DEL APLAZAMIENTO/FRACCIONAMIENTO DE PAGO",
            "Referencia del acuerdo: SYN-PLAN-INTEREST-ANNEX-001",
          ].join("\n"),
          isBlank: false,
        }),
        Object.freeze({
          pageNumber: 2,
          text: [
            "ANEXO II",
            "LIQUIDACIÓN DE INTERESES DE DEMORA",
            "PERIODO NÚMERO LIQUIDACIÓN BASE INTERÉS TOTAL INTERESES",
            "X0000000000000001 100,00 01-01-2027 31-01-2027 1,00 5,00",
            "TOTALES 5,00",
          ].join("\n"),
          isBlank: false,
        }),
      ]),
    });

    const result = await extractAeatRealCorpusDocumentV7(input);
    expect(result).toMatchObject({
      status: "REVIEW_REQUIRED",
      familyId: "collection.deferral_grant",
      paymentPlan: null,
      installments: [],
    });
    expect(result.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldCode: "PLAN_INTEREST",
          amountCents: 500,
          evidence: expect.objectContaining({ pageNumbers: [2] }),
        }),
      ]),
    );
    expect(
      result.fields.some((field) =>
        ["PLAN_PRINCIPAL", "PLAN_TOTAL"].includes(field.fieldCode),
      ),
    ).toBe(false);
  });

  it("extracts a split printed location date without using legal-context dates", async () => {
    const input: BoundedDocumentInput = Object.freeze({
      ownerScope: OWNER,
      documentId: "synthetic-v7-split-location-date",
      pages: Object.freeze([
        Object.freeze({
          pageNumber: 1,
          text: [
            AEAT,
            "REQUERIMIENTO FORMAL DE PRESENTACIÓN",
            "Referencia del procedimiento: SYN-PROCEDURE-SPLIT-DATE-1",
            "Modelo 130",
            "Dispone de 10 días hábiles para responder.",
          ].join("\n"),
          isBlank: false,
        }),
        Object.freeze({
          pageNumber: 2,
          text: "Madrid 17 de\njulio de 2027",
          isBlank: false,
        }),
      ]),
    });

    const result = await extractAeatRealCorpusDocumentV7(input);
    expect(result.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldCode: "ISSUE_DATE",
          value: "2027-07-17",
          evidence: expect.objectContaining({ pageNumbers: [2] }),
        }),
      ]),
    );
  });

  it("accepts a long printed locality ending in 'a' as the issue date", async () => {
    const input: BoundedDocumentInput = Object.freeze({
      ownerScope: OWNER,
      documentId: "synthetic-v7-long-location-date",
      pages: Object.freeze([
        Object.freeze({
          pageNumber: 1,
          text: [
            AEAT,
            "REQUERIMIENTO FORMAL DE PRESENTACIÓN",
            "Referencia del procedimiento: SYN-PROCEDURE-LONG-LOCATION-1",
            "Modelo 130",
            "Dispone de 10 días hábiles para responder.",
            "En Santa Cruz de Tenerife a 17 de julio de 2027",
          ].join("\n"),
          isBlank: false,
        }),
      ]),
    });

    const result = await extractAeatRealCorpusDocumentV7(input);
    expect(result.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldCode: "ISSUE_DATE",
          value: "2027-07-17",
          evidence: expect.objectContaining({ pageNumbers: [1] }),
        }),
      ]),
    );
    expect(result.fields.some((field) => field.fieldCode === "SIGNATURE_DATE")).toBe(
      false,
    );
  });

  it("keeps an explicitly labelled signing date distinct from the issue date", async () => {
    const input: BoundedDocumentInput = Object.freeze({
      ownerScope: OWNER,
      documentId: "synthetic-v7-terminal-signing-date",
      pages: Object.freeze([
        Object.freeze({
          pageNumber: 1,
          text: [
            AEAT,
            "REQUERIMIENTO FORMAL DE PRESENTACIÓN",
            "Referencia del procedimiento: SYN-PROCEDURE-SIGNING-1",
            "Modelo 130",
            "Dispone de 10 días hábiles para responder.",
            "Fecha de firma: 17 de julio de 2027",
          ].join("\n"),
          isBlank: false,
        }),
      ]),
    });

    const result = await extractAeatRealCorpusDocumentV7(input);
    expect(result.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldCode: "SIGNATURE_DATE",
          value: "2027-07-17",
        }),
      ]),
    );
    expect(result.fields.some((field) => field.fieldCode === "ISSUE_DATE")).toBe(
      false,
    );
  });

  it("recognizes realistic sanction, external-debt and final-assessment variants", async () => {
    const sanction = source({
      id: "V7-REALISTIC-SANCTION",
      family: "sanction.initiation_and_hearing",
      text: [
        "ACUERDO DE INICIACIÓN Y COMUNICACIÓN DEL TRÁMITE DE AUDIENCIA",
        "EXPEDIENTE SANCIONADOR",
        "Referencia: SYN-SANCTION-REALISTIC-1",
        "PROPUESTA DE IMPOSICIÓN DE SANCIÓN",
        "Importe de la propuesta: 200,00 €",
        "Reducción propuesta: 50,00 €",
        "Sanción reducida propuesta: 150,00 €",
        "Dispone de 15 días hábiles para alegaciones.",
      ].join("\n"),
    });
    const externalDebt = source({
      id: "V7-REALISTIC-EXTERNAL",
      family: "collection.external_debt",
      text: [
        "NOTIFICACIÓN DE PROVIDENCIA DE APREMIO",
        "Organismo de origen: TESORERÍA GENERAL DE LA SEGURIDAD SOCIAL",
        "Clave de liquidación: SYN-EXTERNAL-DEBT-1",
        "Principal pendiente: 100,00 €",
        "Importe total: 120,00 €",
      ].join("\n"),
    });
    const assessment = source({
      id: "V7-REALISTIC-ASSESSMENT",
      family: "assessment.final_provisional_assessment",
      text: [
        "NOTIFICACIÓN DE RESOLUCIÓN CON LIQUIDACIÓN PROVISIONAL",
        "Referencia: SYN-ASSESSMENT-REALISTIC-1",
        "Cuota: 90,00 €",
        "Intereses de demora: 6,00 €",
        "Total a ingresar: 96,00 €",
        "CARTA DE PAGO",
      ].join("\n"),
    });

    await expect(extractAeatRealCorpusDocumentV7(sanction)).resolves.toMatchObject({
      status: "REVIEW_REQUIRED",
      familyId: "sanction.initiation_and_hearing",
    });
    await expect(extractAeatRealCorpusDocumentV7(externalDebt)).resolves.toMatchObject({
      status: "REVIEW_REQUIRED",
      familyId: "collection.external_debt",
    });
    await expect(extractAeatRealCorpusDocumentV7(assessment)).resolves.toMatchObject({
      status: "REVIEW_REQUIRED",
      familyId: "assessment.final_provisional_assessment",
    });
    const assessmentReview = await analyzeFiscalNotificationDocumentInput(
      assessment,
    );
    const assessmentFields = assessmentReview.verticalSliceReview.documents
      .find(
        (document) =>
          document.familyId === "assessment.final_provisional_assessment",
      )
      ?.fields;
    expect(
      assessmentFields?.filter(
        (field) => field.canonicalType === "TAX_QUOTA",
      ),
    ).toHaveLength(1);
    expect(
      assessmentFields?.filter(
        (field) => field.canonicalType === "LATE_INTEREST",
      ),
    ).toHaveLength(1);
    expect(
      assessmentFields?.filter(
        (field) => field.canonicalType === "TOTAL_CLAIMED",
      ),
    ).toHaveLength(1);
  });

  it("rejects title-only recognition but retains observed inconsistent amounts for review", async () => {
    const incompleteRoi = source({
      id: "V7-INCOMPLETE-ROI",
      family: "registry.tax_registration_resolution",
      text: "RESOLUCIÓN DE ALTA EN EL REGISTRO DE OPERADORES INTRACOMUNITARIOS",
    });
    const inconsistentAssessment = source({
      id: "V7-INCONSISTENT-ASSESSMENT",
      family: "assessment.final_provisional_assessment",
      text: "RESOLUCIÓN DE LIQUIDACIÓN PROVISIONAL\nRESOLUCIÓN FINAL DEL PROCEDIMIENTO\nReferencia de la liquidación final: SYN-ASSESSMENT-BAD-1\nCuota liquidada: 90,00 €\nIntereses de demora: 6,00 €\nTotal a ingresar: 97,00 €\nSaldo declarado rechazado: 750,00 €",
    });
    await expect(extractAeatRealCorpusDocumentV7(incompleteRoi)).resolves.toMatchObject({ status: "UNKNOWN", familyId: null });
    await expect(extractAeatRealCorpusDocumentV7(inconsistentAssessment)).resolves.toMatchObject({
      status: "REVIEW_REQUIRED",
      familyId: "assessment.final_provisional_assessment",
    });
    const reviewed = await analyzeFiscalNotificationDocumentInput(
      inconsistentAssessment,
    );
    expect(
      reviewed.verticalSliceReview.documents.find(
        (document) =>
          document.familyId === "assessment.final_provisional_assessment",
      )?.amountReconciliation,
    ).toMatchObject({
      status: "REVIEW_REQUIRED",
      requiresManualReview: true,
      equations: [
        {
          status: "MISMATCH_REVIEW_REQUIRED",
          leftCents: 9_600,
          rightCents: 9_700,
          differenceCents: -100,
        },
      ],
    });
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
