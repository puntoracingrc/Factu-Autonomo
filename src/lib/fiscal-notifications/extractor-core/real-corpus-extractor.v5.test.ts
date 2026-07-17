import { describe, expect, it } from "vitest";
import {
  FiscalNotificationBatchAnalysisIdentityErrorV2,
  reduceFiscalNotificationBatchAnalysisV2,
} from "../batch-analysis-identity.v2";
import { analyzeFiscalNotificationDocumentInput } from "../document-input-analysis";
import type { BoundedDocumentInput } from "../input-contract";
import { projectRealCorpusReviewV5 } from "../real-corpus-review.v5";
import {
  extractAeatRealCorpusDocumentV5,
  type RealCorpusFamilyIdV5,
} from "./real-corpus-extractor.v5";

const OWNER = "user:synthetic-v5";
const AEAT = "AGENCIA ESTATAL DE ADMINISTRACIÓN TRIBUTARIA";

interface CorpusCaseV5 {
  readonly id: string;
  readonly family: RealCorpusFamilyIdV5;
  readonly variant: string;
  readonly physicalPages: number;
  readonly contentPages: number;
  readonly principalCents?: number;
  readonly ordinaryTotalCents?: number;
  readonly voluntaryEndDate?: string;
  readonly debtKey?: string;
  readonly wrapper?: boolean;
}

const CASES = Object.freeze<readonly CorpusCaseV5[]>([
  { id: "V5-S01", family: "collection.enforcement_order", variant: "plain_two_page_payment_form", physicalPages: 10, contentPages: 9, principalCents: 10137, ordinaryTotalCents: 12164, voluntaryEndDate: "2027-01-20", debtKey: "SYN-DEBT-01" },
  { id: "V5-S02", family: "collection.enforcement_order", variant: "same_key_unmatched_to_later_plan", physicalPages: 10, contentPages: 9, principalCents: 10274, ordinaryTotalCents: 12328, voluntaryEndDate: "2027-02-20", debtKey: "SYN-DEBT-20" },
  { id: "V5-S03", family: "collection.enforcement_order", variant: "long_plan_installment_3", physicalPages: 10, contentPages: 9, principalCents: 10411, ordinaryTotalCents: 12492, voluntaryEndDate: "2027-03-20", debtKey: "SYN-LONG-03" },
  { id: "V5-S04", family: "collection.enforcement_order", variant: "aggregate_group_d_installment_3", physicalPages: 10, contentPages: 9, principalCents: 10548, ordinaryTotalCents: 12656, voluntaryEndDate: "2027-04-20", debtKey: "SYN-GROUP-D4" },
  { id: "V5-S05", family: "collection.enforcement_order", variant: "aggregate_group_d_installment_2", physicalPages: 10, contentPages: 7, principalCents: 10685, ordinaryTotalCents: 12820, voluntaryEndDate: "2027-05-20", debtKey: "SYN-GROUP-D4" },
  { id: "V5-S06", family: "collection.enforcement_order", variant: "long_plan_installment_2", physicalPages: 10, contentPages: 7, principalCents: 10822, ordinaryTotalCents: 12984, voluntaryEndDate: "2027-06-20", debtKey: "SYN-LONG-03" },
  { id: "V5-S07", family: "collection.deferral_denial", variant: "denial_with_existing_executive_debts", physicalPages: 14, contentPages: 8, wrapper: true },
  { id: "V5-S08", family: "collection.enforcement_order", variant: "aggregate_group_d_installment_1", physicalPages: 10, contentPages: 7, principalCents: 11096, ordinaryTotalCents: 13312, voluntaryEndDate: "2027-08-20", debtKey: "SYN-GROUP-D4" },
  { id: "V5-S09", family: "collection.enforcement_order", variant: "long_plan_installment_1", physicalPages: 10, contentPages: 7, principalCents: 11233, ordinaryTotalCents: 13476, voluntaryEndDate: "2027-09-20", debtKey: "SYN-LONG-03" },
  { id: "V5-S10", family: "seizure.commercial_credits", variant: "debtor_copy_with_third_party_payer", physicalPages: 6, contentPages: 5 },
  { id: "V5-S11", family: "collection.deferral_grant", variant: "three_installments_plan_b", physicalPages: 10, contentPages: 8, debtKey: "SYN-DEBT-11" },
  { id: "V5-S12", family: "collection.deferral_grant", variant: "three_installments_plan_a", physicalPages: 10, contentPages: 8, debtKey: "SYN-DEBT-12" },
  { id: "V5-S13", family: "collection.enforcement_order", variant: "aggregate_group_f_installment_3", physicalPages: 12, contentPages: 8, principalCents: 11781, ordinaryTotalCents: 14132, voluntaryEndDate: "2027-01-20", debtKey: "SYN-GROUP-F6", wrapper: true },
  { id: "V5-S14", family: "collection.enforcement_order", variant: "aggregate_group_e_installment_3", physicalPages: 10, contentPages: 7, principalCents: 11918, ordinaryTotalCents: 14296, voluntaryEndDate: "2027-02-20", debtKey: "SYN-GROUP-E5" },
  { id: "V5-S15", family: "collection.enforcement_order", variant: "aggregate_group_e_installment_2", physicalPages: 10, contentPages: 7, principalCents: 12055, ordinaryTotalCents: 14460, voluntaryEndDate: "2027-03-20", debtKey: "SYN-GROUP-E5" },
  { id: "V5-S16", family: "collection.enforcement_order", variant: "aggregate_group_f_installment_2", physicalPages: 10, contentPages: 7, principalCents: 12192, ordinaryTotalCents: 14624, voluntaryEndDate: "2027-04-20", debtKey: "SYN-GROUP-F6" },
  { id: "V5-S17", family: "collection.enforcement_order", variant: "aggregate_group_f_installment_1_with_wrapper", physicalPages: 12, contentPages: 8, principalCents: 12329, ordinaryTotalCents: 14788, voluntaryEndDate: "2027-05-20", debtKey: "SYN-GROUP-F6", wrapper: true },
  { id: "V5-S18", family: "collection.enforcement_order", variant: "aggregate_group_e_installment_1_with_wrapper", physicalPages: 12, contentPages: 8, principalCents: 12466, ordinaryTotalCents: 14952, voluntaryEndDate: "2027-06-20", debtKey: "SYN-GROUP-E5", wrapper: true },
  { id: "V5-S19", family: "collection.enforcement_order", variant: "single_debt_with_wrapper", physicalPages: 12, contentPages: 8, principalCents: 12603, ordinaryTotalCents: 15116, voluntaryEndDate: "2027-07-20", debtKey: "SYN-DEBT-19", wrapper: true },
  { id: "V5-S20", family: "collection.deferral_grant", variant: "twelve_installments_with_wrapper", physicalPages: 10, contentPages: 9, debtKey: "SYN-DEBT-20", wrapper: true },
]);

function money(cents: number): string {
  return `${Math.floor(cents / 100).toLocaleString("es-ES")},${String(cents % 100).padStart(2, "0")} €`;
}

function coreText(testCase: CorpusCaseV5, includePii: boolean): string {
  const pii = includePii
    ? "\nNIF: 12345678Z\nIBAN: ES1200000000000000000000\nNombre: PERSONA ULTRAPRIVADA"
    : "";
  if (testCase.family === "collection.enforcement_order") {
    const principal = testCase.principalCents!;
    return `${AEAT}\nPROVIDENCIA DE APREMIO\nPRINCIPAL PENDIENTE\nRECARGO DE APREMIO ORDINARIO\nPLAZOS DE PAGO\nFecha de emisión: 17-07-2027\nClave de deuda: ${testCase.debtKey}\nFin del período voluntario: ${testCase.voluntaryEndDate}\nPrincipal pendiente: ${money(principal)}\nRecargo ordinario del 20 %: ${money(testCase.ordinaryTotalCents! - principal)}\nTotal ordinario: ${money(testCase.ordinaryTotalCents!)}\nTotal con recargo reducido 10 %: ${money(Math.round(principal * 1.1))}\nRecargo ejecutivo 5 %: ${money(Math.round(principal * 0.05))}\nReferencia de pago: SYNPAY${testCase.id.replace("V5-S", "")}${pii}`;
  }
  if (testCase.family === "collection.deferral_grant") {
    const installmentLines = [
      "CUOTA 1 | 20-06-2027 | 100,00 | 1,00 | 101,00 | SYNPLANPAY01",
      "CUOTA 2 | 20-07-2027 | 100,00 | 2,00 | 102,00 | SYNPLANPAY02",
      "CUOTA 3 | 20-08-2027 | 100,00 | 3,00 | 103,00 | SYNPLANPAY03",
    ];
    return `${AEAT}\nCONCESIÓN DEL APLAZAMIENTO/FRACCIONAMIENTO DE PAGO SIN GARANTÍA\nANEXO I: DEUDAS Y PLAZOS\nLIQUIDACIÓN DE INTERESES DE DEMORA\nFecha de emisión: 17-05-2027\nReferencia del acuerdo: SYNAGREEMENT${testCase.id.replace("V5-S", "")}\nClave de deuda: ${testCase.debtKey}\nPrincipal original: 300,00 €\nIntereses del aplazamiento: 6,00 €\nTotal del plan: 306,00 €\n${installmentLines.join("\n")}${pii}`;
  }
  if (testCase.family === "collection.deferral_denial") {
    const cited = Array.from(
      { length: 8 },
      (_, index) =>
        `DEUDA EJECUTIVA CITADA | SYN-CITED-${index + 1} | ${money(10_500 + index * 500)}`,
    ).join("\n");
    return `${AEAT}\nDENEGACIÓN DEL APLAZAMIENTO/FRACCIONAMIENTO\nDEUDA DENEGADA\nDEUDAS EJECUTIVAS CITADAS\nFecha de emisión: 10-06-2027\nReferencia del acuerdo: SYN-DENIAL-07\nDEUDA DENEGADA | SYN-DENIED-7 | 500,00 | SYNDENIALPAY7\n${cited}${pii}`;
  }
  return `${AEAT}\nDILIGENCIA DE EMBARGO DE CRÉDITOS\nDEUDAS DEL EXPEDIENTE EJECIVO\nDEUDAS DEL EXPEDIENTE EJECUTIVO\nCRÉDITOS A SU FAVOR\nFecha de emisión: 17-05-2027\nFecha del acto: 06-05-2027\nNúmero de diligencia: SYN-SEIZURE-10\nClave de deuda: SYN-SEIZED-DEBT-10\nImporte a embargar: 250,00 €\nDestinatario: PRIMARY_DEBTOR\nTercero: GARNISHED_THIRD_PARTY${pii}`;
}

function contentPages(testCase: CorpusCaseV5): ReadonlySet<number> {
  if (!testCase.wrapper) {
    return new Set(
      Array.from({ length: testCase.contentPages }, (_, index) => index + 1),
    );
  }
  const pages = new Set<number>([1, 3]);
  for (let page = 4; pages.size < testCase.contentPages; page += 1) {
    pages.add(page);
  }
  return pages;
}

function source(
  testCase: CorpusCaseV5,
  includePii = false,
): BoundedDocumentInput {
  const nonBlank = contentPages(testCase);
  const actPage = testCase.wrapper ? 3 : 1;
  const paymentPages = new Set([
    Math.max(actPage + 1, [...nonBlank].at(-1)! - 1),
    [...nonBlank].at(-1)!,
  ]);
  return Object.freeze({
    ownerScope: OWNER,
    documentId: `synthetic-${testCase.id.toLowerCase()}`,
    pages: Object.freeze(
      Array.from({ length: testCase.physicalPages }, (_, index) => {
        const pageNumber = index + 1;
        const isBlank = !nonBlank.has(pageNumber);
        let text = "";
        if (!isBlank) {
          if (pageNumber === 1 && testCase.wrapper) {
            text = "NUEVO INTENTO DE NOTIFICACIÓN\nENTREGA ANTERIOR FALLIDA";
          } else if (pageNumber === actPage) {
            text = coreText(testCase, includePii);
          } else if (
            testCase.family === "collection.deferral_grant" &&
            pageNumber === actPage + 1
          ) {
            text = "CALENDARIO DE CUOTAS\nANEXO I: DEUDAS Y PLAZOS";
          } else if (testCase.family === "collection.deferral_denial") {
            text = pageNumber >= 8 ? "CARTA DE PAGO" : "ANEXO DE DEUDAS";
          } else if (
            testCase.family === "collection.enforcement_order" &&
            paymentPages.has(pageNumber)
          ) {
            text = "CARTA DE PAGO\nEJEMPLAR DEL INTERESADO";
          } else {
            text = `ANEXO ${pageNumber}`;
          }
        }
        return Object.freeze({ pageNumber, text, isBlank });
      }),
    ),
  });
}

describe("AEAT real corpus extractor V5", () => {
  it.each(CASES)("recognizes all 20 V5 synthetic contracts: $id", async (testCase) => {
    const result = await extractAeatRealCorpusDocumentV5(source(testCase));
    expect(result).toMatchObject({
      status: "REVIEW_REQUIRED",
      familyId: testCase.family,
      physicalPageCount: testCase.physicalPages,
      contentPageCount: testCase.contentPages,
      retainedSourceContent: "NONE",
      sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED",
      confirmsDebt: false,
      confirmsPayment: false,
      confirmsRemittance: false,
      confirmsDeadline: false,
    });
    expect(result.segments.flatMap((segment) => segment.pageNumbers)).toHaveLength(
      testCase.physicalPages,
    );
    expect(
      result.segments.every(
        (segment) => !segment.provesPayment && !segment.createsIndependentDebt,
      ),
    ).toBe(true);
  });

  it.each(CASES)("runs every V5 case end to end: $id", async (testCase) => {
    const result = await analyzeFiscalNotificationDocumentInput(source(testCase));
    const matching = result.verticalSliceReview.documents.filter(
      (document) => document.familyId === testCase.family,
    );
    expect(matching).toHaveLength(1);
    expect(matching[0]).toMatchObject({
      pageFrom: 1,
      pageTo: testCase.physicalPages,
      requiresHumanReview: true,
    });
    expect(result.verticalSliceReview).toMatchObject({
      retainedSourceContent: "NONE",
      materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
      permitsDebtCreation: false,
      permitsDeadlineCreation: false,
      permitsPaymentAction: false,
      permitsAccountingAction: false,
    });
  });

  it("keeps the denied debt separate from the cited executive debts", async () => {
    const result = await extractAeatRealCorpusDocumentV5(source(CASES[6]!));
    expect(result.deniedDebt).toMatchObject({
      debtKey: "SYN-DENIED-7",
      principalCents: 50_000,
    });
    expect(result.existingExecutiveDebtsCitedAsReason).toHaveLength(8);
    expect(
      result.existingExecutiveDebtsCitedAsReason.reduce(
        (total, item) => total + item.snapshotAmountCents,
        0,
      ),
    ).not.toBe(result.deniedDebt?.principalCents);
  });

  it("keeps payment form copies as one operation and never as payment evidence", async () => {
    const result = await extractAeatRealCorpusDocumentV5(source(CASES[0]!));
    expect(result.paymentFormOperationCount).toBe(1);
    expect(result.paymentFormReferences).toEqual(["SYNPAY01"]);
    expect(result.amountScenarios.map((item) => item.code)).toEqual([
      "PRINCIPAL_ONLY_WITH_5_PERCENT_IF_PREPAID",
      "REDUCED_SURCHARGE_10_PERCENT",
      "ORDINARY_SURCHARGE_20_PERCENT",
    ]);
    expect(result.confirmsPayment).toBe(false);
  });

  it("keeps the debtor and opaque garnished third party roles separate", async () => {
    const result = await extractAeatRealCorpusDocumentV5(source(CASES[9]!));
    expect(result).toMatchObject({
      recipientRole: "PRIMARY_DEBTOR",
      thirdPartyRole: "GARNISHED_THIRD_PARTY_WITHOUT_IDENTITY",
      seizedAmountCents: 25_000,
      retainedAmountCents: null,
      remittedAmountCents: null,
    });
  });

  it("does not let a cover or blank page hide or create the substantive act", async () => {
    const result = await extractAeatRealCorpusDocumentV5(source(CASES[18]!));
    expect(result.familyId).toBe("collection.enforcement_order");
    expect(result.segments[0]).toMatchObject({
      type: "DELIVERY_COVER",
      relationToPrimary: "DELIVERY_ATTEMPT_FOR",
    });
    expect(result.segments.some((segment) => segment.type === "PRIMARY_ACT")).toBe(
      true,
    );
    expect(result.segments.some((segment) => segment.type === "BLANK")).toBe(true);
    const denial = await extractAeatRealCorpusDocumentV5(source(CASES[6]!));
    const grant = await extractAeatRealCorpusDocumentV5(source(CASES[19]!));
    expect(denial.segments.some((segment) => segment.type === "PRIMARY_ACT")).toBe(true);
    expect(grant.segments.some((segment) => segment.type === "PRIMARY_ACT")).toBe(true);
  });

  it("keeps issue, act and voluntary-end dates in separate fields", async () => {
    const result = await extractAeatRealCorpusDocumentV5(source(CASES[0]!));
    const fields = new Map(result.fields.map((item) => [item.fieldCode, item]));
    expect(fields.get("ISSUE_DATE")).toMatchObject({
      kind: "DATE",
      value: "2027-07-17",
    });
    expect(fields.get("VOLUNTARY_END_DATE")).toMatchObject({
      kind: "DATE",
      value: "2027-01-20",
    });
  });

  it("never returns raw PII or OCR text", async () => {
    const result = await extractAeatRealCorpusDocumentV5(source(CASES[6]!, true));
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("12345678Z");
    expect(serialized).not.toContain("ES1200000000000000000000");
    expect(serialized).not.toContain("PERSONA ULTRAPRIVADA");
    expect(serialized).not.toContain("rawText");
  });

  it("does not mutate inputs and returns defensive immutable collections", async () => {
    const input = source(CASES[0]!);
    const before = JSON.stringify(input);
    const result = await extractAeatRealCorpusDocumentV5(input);
    expect(JSON.stringify(input)).toBe(before);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.fields)).toBe(true);
    expect(Object.isFrozen(result.segments)).toBe(true);
    expect(Object.isFrozen(result.existingExecutiveDebtsCitedAsReason)).toBe(true);
  });

  it("projects through the closed review boundary", async () => {
    const outcome = await extractAeatRealCorpusDocumentV5(source(CASES[6]!));
    const review = projectRealCorpusReviewV5(outcome);
    expect(review.documents).toHaveLength(1);
    expect(review.documents[0]?.familyId).toBe("collection.deferral_denial");
    expect(review.documents[0]?.fields.some((item) => item.label === "Principal denegado")).toBe(true);
  });

  it("rejects arbitrary detail values at the review privacy boundary", async () => {
    const outcome = await extractAeatRealCorpusDocumentV5(source(CASES[0]!));
    expect(() =>
      projectRealCorpusReviewV5({
        ...outcome,
        fields: [
          ...outcome.fields,
          Object.freeze({
            fieldCode: "UNSAFE_TEXT",
            label: "Estado del documento",
            kind: "TEXT" as const,
            value: "PERSONA ULTRAPRIVADA",
            evidence: Object.freeze({
              pageNumbers: Object.freeze([1]),
              assertionType: "EXPLICIT_IN_DOCUMENT" as const,
            }),
          }),
        ],
      }),
    ).toThrow("FISCAL_NOTIFICATION_VERTICAL_SLICE_REVIEW_PRIVACY_REJECTED");
  });

  it("keeps every result bound to fileId + sha256 + documentId", async () => {
    const identity = Object.freeze({
      fileId: "file-v5-001",
      documentId: "synthetic-v5-s01",
      sourceSha256: "a".repeat(64),
    });
    const result = await extractAeatRealCorpusDocumentV5(source(CASES[0]!));
    expect(
      reduceFiscalNotificationBatchAnalysisV2({
        queue: [identity],
        current: [],
        completed: { identity, value: result },
      })[0],
    ).toMatchObject({ identity, value: { sourceDocumentId: identity.documentId } });
    expect(() =>
      reduceFiscalNotificationBatchAnalysisV2({
        queue: [identity],
        current: [],
        completed: {
          identity: { ...identity, sourceSha256: "b".repeat(64) },
          value: result,
        },
      }),
    ).toThrow(FiscalNotificationBatchAnalysisIdentityErrorV2);
  });
});
