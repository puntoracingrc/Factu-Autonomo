import { describe, expect, it } from "vitest";
import { analyzeFiscalNotificationDocumentInput } from "../document-input-analysis";
import type { BoundedDocumentInput } from "../input-contract";
import { projectRealCorpusReviewV6 } from "../real-corpus-review.v6";
import {
  extractAeatRealCorpusDocumentV6,
  type RealCorpusFamilyIdV6,
} from "./real-corpus-extractor.v6";

const OWNER = "user:synthetic-v6";
const AEAT = "AGENCIA ESTATAL DE ADMINISTRACIÓN TRIBUTARIA";

interface CorpusCaseV6 {
  readonly id: string;
  readonly family: RealCorpusFamilyIdV6;
  readonly physicalPages: number;
  readonly contentPages: number;
  readonly wrapper?: boolean;
  readonly debtKey?: string;
  readonly voluntaryEndDate?: string;
  readonly principalCents?: number;
  readonly ordinaryTotalCents?: number;
  readonly paymentReference?: string;
  readonly agreementId?: string;
  readonly installments?: readonly Readonly<{
    sequence: number;
    dueDate: string;
    baseCents: number;
    interestCents: number;
    totalCents: number;
  }>[];
}

const CASES: readonly CorpusCaseV6[] = Object.freeze([
  {
    id: "V6-S01",
    family: "collection.deferral_grant",
    physicalPages: 10,
    contentPages: 9,
    wrapper: true,
    debtKey: "SYN-DEBT-IVA-4T",
    agreementId: "SYN-PLAN-IVA-4T",
    installments: Object.freeze(
      Array.from({ length: 12 }, (_, index) => ({
        sequence: index + 1,
        dueDate: `2027-${String(index + 1).padStart(2, "0")}-20`,
        baseCents: 10_000,
        interestCents: (index + 1) * 10,
        totalCents: 10_000 + (index + 1) * 10,
      })),
    ),
  },
  { id: "V6-S02", family: "collection.enforcement_order", physicalPages: 10, contentPages: 7, debtKey: "SYN-DEBT-IVA-2T", voluntaryEndDate: "2027-03-20", principalCents: 10_300, ordinaryTotalCents: 12_360, paymentReference: "SYN-PAY-61" },
  { id: "V6-S03", family: "collection.enforcement_order", physicalPages: 10, contentPages: 7, debtKey: "SYN-DEBT-IVA-2T", voluntaryEndDate: "2027-02-20", principalCents: 10_200, ordinaryTotalCents: 12_240, paymentReference: "SYN-PAY-62" },
  { id: "V6-S04", family: "collection.enforcement_order", physicalPages: 10, contentPages: 7, debtKey: "SYN-DEBT-IVA-2T", voluntaryEndDate: "2027-01-20", principalCents: 10_100, ordinaryTotalCents: 12_120, paymentReference: "SYN-PAY-63" },
  { id: "V6-S05", family: "collection.enforcement_order", physicalPages: 10, contentPages: 7, debtKey: "SYN-DEBT-IRPF-2T", voluntaryEndDate: "2027-01-20", principalCents: 8_100, ordinaryTotalCents: 9_720, paymentReference: "SYN-PAY-64" },
  { id: "V6-S06", family: "collection.enforcement_order", physicalPages: 10, contentPages: 7, debtKey: "SYN-DEBT-IRPF-2T", voluntaryEndDate: "2027-02-20", principalCents: 8_200, ordinaryTotalCents: 9_840, paymentReference: "SYN-PAY-65" },
  { id: "V6-S07", family: "collection.deferral_grant", physicalPages: 8, contentPages: 7, debtKey: "SYN-DEBT-IVA-3T", agreementId: "SYN-PLAN-IVA-3T", installments: Object.freeze([{ sequence: 1, dueDate: "2027-04-20", baseCents: 12_000, interestCents: 100, totalCents: 12_100 }, { sequence: 2, dueDate: "2027-05-20", baseCents: 12_000, interestCents: 200, totalCents: 12_200 }, { sequence: 3, dueDate: "2027-06-20", baseCents: 12_000, interestCents: 300, totalCents: 12_300 }]) },
  { id: "V6-S08", family: "collection.deferral_grant", physicalPages: 8, contentPages: 7, debtKey: "SYN-DEBT-IRPF-3T", agreementId: "SYN-PLAN-IRPF-3T", installments: Object.freeze([{ sequence: 1, dueDate: "2027-04-20", baseCents: 6_000, interestCents: 100, totalCents: 6_100 }, { sequence: 2, dueDate: "2027-05-20", baseCents: 6_000, interestCents: 200, totalCents: 6_200 }, { sequence: 3, dueDate: "2027-06-20", baseCents: 6_000, interestCents: 300, totalCents: 6_300 }]) },
  { id: "V6-S09", family: "collection.deferral_grant", physicalPages: 10, contentPages: 8, wrapper: true, debtKey: "SYN-DEBT-IVA-2T", agreementId: "SYN-PLAN-IVA-2T", installments: Object.freeze([{ sequence: 1, dueDate: "2027-01-20", baseCents: 10_000, interestCents: 100, totalCents: 10_100 }, { sequence: 2, dueDate: "2027-02-20", baseCents: 10_000, interestCents: 200, totalCents: 10_200 }, { sequence: 3, dueDate: "2027-03-20", baseCents: 10_000, interestCents: 300, totalCents: 10_300 }]) },
  { id: "V6-S10", family: "collection.deferral_grant", physicalPages: 10, contentPages: 8, wrapper: true, debtKey: "SYN-DEBT-IRPF-2T", agreementId: "SYN-PLAN-IRPF-2T", installments: Object.freeze([{ sequence: 1, dueDate: "2027-01-20", baseCents: 8_000, interestCents: 100, totalCents: 8_100 }, { sequence: 2, dueDate: "2027-02-20", baseCents: 8_000, interestCents: 200, totalCents: 8_200 }, { sequence: 3, dueDate: "2027-03-20", baseCents: 8_000, interestCents: 300, totalCents: 8_300 }]) },
  { id: "V6-S11", family: "seizure.movable_asset", physicalPages: 12, contentPages: 7 },
  { id: "V6-S12", family: "seizure.real_estate", physicalPages: 12, contentPages: 7 },
  { id: "V6-S13", family: "collection.enforcement_order", physicalPages: 12, contentPages: 9, wrapper: true, debtKey: "SYN-CLAWBACK-DEBT-01", voluntaryEndDate: "2027-08-20", principalCents: 5_000, ordinaryTotalCents: 6_000, paymentReference: "SYN-PAY-72" },
  { id: "V6-S14", family: "collection.enforcement_order", physicalPages: 12, contentPages: 8, debtKey: "SYN-INTEREST-LIQ-01", voluntaryEndDate: "2027-10-20", principalCents: 550, ordinaryTotalCents: 660, paymentReference: "SYN-PAY-73" },
  { id: "V6-S15", family: "sanction.loss_of_reduction", physicalPages: 10, contentPages: 6, wrapper: true },
  { id: "V6-S16", family: "collection.interest_assessment", physicalPages: 10, contentPages: 6 },
  { id: "V6-S17", family: "collection.enforcement_order", physicalPages: 12, contentPages: 8, debtKey: "SYN-SANCTION-DEBT-01", voluntaryEndDate: "2027-07-20", principalCents: 15_000, ordinaryTotalCents: 18_000, paymentReference: "SYN-PAY-76" },
  { id: "V6-S18", family: "collection.enforcement_order", physicalPages: 12, contentPages: 8, debtKey: "SYN-DENIED-DEBT-01", voluntaryEndDate: "2027-09-20", principalCents: 50_000, ordinaryTotalCents: 60_000, paymentReference: "SYN-PAY-77" },
  { id: "V6-S19", family: "collection.deferral_denial", physicalPages: 10, contentPages: 7, agreementId: "SYN-DENIAL-01" },
  { id: "V6-S20", family: "sanction.resolution", physicalPages: 8, contentPages: 6 },
]);

function money(cents: number): string {
  return `${Math.floor(cents / 100).toLocaleString("es-ES")},${String(cents % 100).padStart(2, "0")} €`;
}

function coreText(testCase: CorpusCaseV6, includePii: boolean): string {
  const pii = includePii
    ? "\nNIF: 12345678Z\nIBAN: ES1200000000000000000000\nMatrícula: 0000ZZZ\nNombre: PERSONA ULTRAPRIVADA"
    : "";
  if (testCase.family === "collection.enforcement_order") {
    const principal = testCase.principalCents!;
    return `${AEAT}\nPROVIDENCIA DE APREMIO\nPRINCIPAL PENDIENTE\nRECARGO DE APREMIO ORDINARIO\nPLAZOS DE PAGO\nFecha del documento: 17-07-2027\nClave de deuda: ${testCase.debtKey}\nFin del período voluntario: ${testCase.voluntaryEndDate}\nPrincipal pendiente: ${money(principal)}\nRecargo ordinario del 20 %: ${money(testCase.ordinaryTotalCents! - principal)}\nTotal ordinario: ${money(testCase.ordinaryTotalCents!)}\nTotal con recargo reducido 10 %: ${money(Math.round(principal * 1.1))}\nRecargo ejecutivo 5 %: ${money(Math.round(principal * 0.05))}\nReferencia de pago: ${testCase.paymentReference}${pii}`;
  }
  if (testCase.family === "collection.deferral_grant") {
    const installments = testCase.installments!.map((item) =>
      `CUOTA ${item.sequence} | ${item.dueDate.split("-").reverse().join("-")} | ${money(item.baseCents)} | ${money(item.interestCents)} | ${money(item.totalCents)} | SYN-PAY-${testCase.id}-${item.sequence}`,
    );
    const principal = testCase.installments!.reduce((sum, item) => sum + item.baseCents, 0);
    const interest = testCase.installments!.reduce((sum, item) => sum + item.interestCents, 0);
    return `${AEAT}\nCONCESIÓN DEL APLAZAMIENTO/FRACCIONAMIENTO DE PAGO SIN GARANTÍA\nANEXO I: DEUDAS Y PLAZOS\nLIQUIDACIÓN DE INTERESES DE DEMORA\nFecha del documento: 17-05-2027\nReferencia del acuerdo: ${testCase.agreementId}\nClave de deuda: ${testCase.debtKey}\nPrincipal original: ${money(principal)}\nIntereses del aplazamiento: ${money(interest)}\nTotal del plan: ${money(principal + interest)}\n${installments.join("\n")}${pii}`;
  }
  if (testCase.family === "collection.deferral_denial") {
    return `${AEAT}\nDENEGACIÓN DEL APLAZAMIENTO/FRACCIONAMIENTO\nDEUDA DENEGADA\nDEUDAS EJECUTIVAS CITADAS\nFecha del documento: 10-06-2027\nReferencia del acuerdo: SYN-DENIAL-01\nDEUDA DENEGADA | SYN-DENIED-DEBT-01 | 500,00 | SYN-DENIAL-PAY-01\nDEUDA EJECUTIVA CITADA | SYN-CITED-DEBT-01 | 120,00${pii}`;
  }
  if (testCase.family === "sanction.resolution") {
    return `${AEAT}\nRESOLUCIÓN DEL PROCEDIMIENTO SANCIONADOR\nFecha del documento: 15-06-2027\nReferencia del expediente sancionador: SYN-SANCTION-CASE-01\nClave de la sanción: SYN-SANCTION-DEBT-01\nSanción inicial: 200,00 €\nPorcentaje histórico de reducción: 25 %\nReducción aplicada: 50,00 €\nSanción reducida: 150,00 €${pii}`;
  }
  if (testCase.family === "sanction.loss_of_reduction") {
    return `${AEAT}\nEXIGENCIA DE REDUCCIÓN DE SANCIÓN\nFecha del documento: 20-07-2027\nClave de la sanción de origen: SYN-SANCTION-DEBT-01\nClave de la reducción exigida: SYN-CLAWBACK-DEBT-01\nPorcentaje histórico de reducción: 25 %\nImporte de la reducción exigida: 50,00 €${pii}`;
  }
  if (testCase.family === "collection.interest_assessment") {
    return `${AEAT}\nLIQUIDACIÓN INDEPENDIENTE DE INTERESES\nFecha del documento: 01-09-2027\nClave de la liquidación de intereses: SYN-INTEREST-LIQ-01\nReferencia de la solicitud: SYN-DENIAL-01\nClave de la deuda principal: SYN-DENIED-DEBT-01\nPrincipal de la deuda de origen: 500,00 €\nIntereses liquidados: 5,50 €\nInicio del cálculo de intereses: 01-01-2027\nFin del cálculo de intereses: 10-04-2027${pii}`;
  }
  const realEstate = testCase.family === "seizure.real_estate";
  const interest = realEstate ? 20_000 : 10_000;
  const costs = realEstate ? 50_000 : 0;
  const limit = 334_660 + interest + costs;
  return `${AEAT}\nDILIGENCIA DE EMBARGO DE BIEN ${realEstate ? "INMUEBLE" : "MUEBLE"}\nFecha del documento: 01-11-2027\nFecha del acto: 30-10-2027\nNúmero de diligencia: SYN-SEIZURE-${realEstate ? "REAL" : "MOVABLE"}-01\nDEUDA EMBARGADA | SYN-SANCTION-DEBT-01 | 180,00\nDEUDA EMBARGADA | SYN-DENIED-DEBT-01 | 600,00\nDEUDA EMBARGADA | SYN-INTEREST-LIQ-01 | 6,60\nDEUDA EMBARGADA | SYN-CLAWBACK-DEBT-01 | 60,00\nDEUDA EMBARGADA | SYN-OTHER-DEBT-01 | 2.500,00\nSubtotal de deudas: 3.346,60 €\nIntereses impresos: ${money(interest)}\nCostas impresas: ${money(costs)}\nLímite del embargo: ${money(limit)}\nTotal impreso en la carta: ${money(realEstate ? 354_660 : limit)}\nImporte de la carta de pago: ${money(realEstate ? 349_660 : limit)}${pii}`;
}

function source(
  testCase: CorpusCaseV6,
  includePii = false,
): BoundedDocumentInput {
  const primaryPage = testCase.wrapper ? 2 : 1;
  return Object.freeze({
    ownerScope: OWNER,
    documentId: `synthetic-${testCase.id.toLowerCase()}`,
    pages: Object.freeze(Array.from({ length: testCase.physicalPages }, (_, index) => {
      const pageNumber = index + 1;
      const isBlank = pageNumber > testCase.contentPages;
      let text = "";
      if (!isBlank) {
        if (testCase.wrapper && pageNumber === 1) {
          text = "NUEVO INTENTO DE NOTIFICACIÓN\nENTREGA ANTERIOR FALLIDA";
        } else if (pageNumber === primaryPage) {
          text = coreText(testCase, includePii);
        } else if (testCase.family === "collection.deferral_grant" && pageNumber === primaryPage + 1) {
          text = "CALENDARIO DE CUOTAS\nANEXO I: DEUDAS Y PLAZOS";
        } else if (testCase.family.startsWith("seizure.") && pageNumber === primaryPage + 1) {
          text = "ANEXO DE DEUDAS\nDEUDA EMBARGADA";
        } else if (testCase.family.startsWith("seizure.") && pageNumber === primaryPage + 2) {
          text = "ANEXO DEL BIEN\nBIEN EMBARGADO";
        } else if (pageNumber === testCase.contentPages) {
          text = "CARTA DE PAGO\nEJEMPLAR DEL INTERESADO";
        } else {
          text = `INFORMACIÓN ADJUNTA ${pageNumber}`;
        }
      }
      return Object.freeze({ pageNumber, text, isBlank });
    })),
  });
}

describe("AEAT real corpus extractor V6", () => {
  it.each(CASES)("recognizes the V6 synthetic contract $id", async (testCase) => {
    const result = await extractAeatRealCorpusDocumentV6(source(testCase));
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
      confirmsDebtExtinction: false,
    });
    expect(result.segments.flatMap((segment) => segment.pageNumbers)).toHaveLength(testCase.physicalPages);
  });

  it.each(CASES)("runs V6 end to end without a generic fallback: $id", async (testCase) => {
    const result = await analyzeFiscalNotificationDocumentInput(source(testCase));
    const documents = result.verticalSliceReview.documents.filter(
      (document) => document.familyId === testCase.family,
    );
    expect(documents).toHaveLength(1);
    expect(documents[0]?.reviewDocumentId).toContain("real-corpus-v6");
    expect(result.verticalSliceReview).toMatchObject({
      retainedSourceContent: "NONE",
      materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
      permitsDebtCreation: false,
      permitsDeadlineCreation: false,
      permitsPaymentAction: false,
      permitsAccountingAction: false,
    });
  });

  it("keeps the sanction and its lost reduction as different economic acts", async () => {
    const resolution = await extractAeatRealCorpusDocumentV6(source(CASES[19]!));
    const loss = await extractAeatRealCorpusDocumentV6(source(CASES[14]!));
    expect(resolution.sanctionResolution).toEqual({
      sanctionReference: "SYN-SANCTION-CASE-01",
      sanctionDebtKey: "SYN-SANCTION-DEBT-01",
      initialSanctionCents: 20_000,
      printedHistoricalReductionPercent: 25,
      reductionCents: 5_000,
      reducedSanctionCents: 15_000,
    });
    expect(loss.lossOfReduction).toEqual({
      originSanctionDebtKey: "SYN-SANCTION-DEBT-01",
      clawbackDebtKey: "SYN-CLAWBACK-DEBT-01",
      printedHistoricalReductionPercent: 25,
      clawbackCents: 5_000,
    });
  });

  it("keeps denied principal, assessed interest and later surcharge separate", async () => {
    const denial = await extractAeatRealCorpusDocumentV6(source(CASES[18]!));
    const interest = await extractAeatRealCorpusDocumentV6(source(CASES[15]!));
    const enforcement = await extractAeatRealCorpusDocumentV6(source(CASES[13]!));
    expect(denial.deniedDebt?.principalCents).toBe(50_000);
    expect(interest.interestAssessment).toMatchObject({
      sourcePrincipalCents: 50_000,
      interestCents: 550,
    });
    expect(enforcement.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fieldCode: "ORDINARY_SURCHARGE_20", amountCents: 110 }),
      ]),
    );
  });

  it("preserves both contradictory seizure values and never treats a limit as collection", async () => {
    const movable = await extractAeatRealCorpusDocumentV6(source(CASES[10]!));
    const realEstate = await extractAeatRealCorpusDocumentV6(source(CASES[11]!));
    expect(movable.seizureSnapshot).toMatchObject({
      debtSubtotalCents: 334_660,
      seizeLimitCents: 344_660,
      paymentFormAmountCents: 344_660,
      hasPrintedAmountDiscrepancy: false,
    });
    expect(realEstate.seizureSnapshot).toMatchObject({
      debtSubtotalCents: 334_660,
      seizeLimitCents: 404_660,
      paymentFormPrintedTotalCents: 354_660,
      paymentFormAmountCents: 349_660,
      hasPrintedAmountDiscrepancy: true,
    });
    expect(realEstate.confirmsPayment).toBe(false);
    expect(realEstate.confirmsDebtExtinction).toBe(false);
  });

  it("keeps wrappers, blank pages, annexes and payment forms as parts of one act", async () => {
    const result = await extractAeatRealCorpusDocumentV6(source(CASES[12]!));
    expect(result.segments[0]?.type).toBe("DELIVERY_COVER");
    expect(result.segments.some((segment) => segment.type === "PRIMARY_ACT")).toBe(true);
    expect(result.segments.some((segment) => segment.type === "PAYMENT_FORM")).toBe(true);
    expect(result.segments.some((segment) => segment.type === "BLANK")).toBe(true);
    expect(result.paymentFormOperationCount).toBe(1);
    expect(result.confirmsPayment).toBe(false);
  });

  it("keeps a deferral interest Annex II inside the grant instead of elevating it to another act", async () => {
    const grant = source(CASES[0]!);
    const pages = grant.pages.map((page) =>
      page.pageNumber === 4
        ? Object.freeze({
            pageNumber: page.pageNumber,
            isBlank: false,
            text: [
              "ANEXO II",
              "ACUERDO DE LIQUIDACIÓN DE INTERESES DE DEMORA",
              "CÁLCULO DE INTERESES",
              "Referencia del acuerdo: SYN-PLAN-IVA-4T",
              "Clave de la deuda principal: SYN-DEBT-IVA-4T",
            ].join("\n"),
          })
        : page,
    );
    const result = await extractAeatRealCorpusDocumentV6(
      Object.freeze({ ...grant, pages: Object.freeze(pages) }),
    );

    expect(result.familyId).toBe("collection.deferral_grant");
    expect(result.interestAssessment).toBeNull();
    expect(result.segments).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: "ANNEX_INTEREST_CALCULATION",
        relationToPrimary: "ANNEX_ONLY",
        createsIndependentDebt: false,
      }),
    ]));
    expect(projectRealCorpusReviewV6(result).documents[0]?.subtitle).toBe(
      "1 documento reconocido · incluye calendario, anexo de intereses y carta de pago",
    );
  });

  it("namespaces payment-form fields without replacing the main act date or tax model", async () => {
    const enforcement = source(CASES[1]!);
    const pages = enforcement.pages.map((page) =>
      page.pageNumber === CASES[1]!.contentPages
        ? Object.freeze({
            pageNumber: page.pageNumber,
            isBlank: false,
            text: [
              "CARTA DE PAGO",
              "Fecha de la carta de pago: 18-07-2027",
              "Modelo de ingreso: 002",
              "Referencia de la carta de pago: SYN-PAY-61",
              "Importe de la carta de pago: 123,60 €",
            ].join("\n"),
          })
        : page,
    );
    const result = await extractAeatRealCorpusDocumentV6(Object.freeze({
      ...enforcement,
      pages: Object.freeze(pages),
    }));
    const review = projectRealCorpusReviewV6(result);

    expect(result.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ fieldCode: "ISSUE_DATE", value: "2027-07-17" }),
      expect.objectContaining({ fieldCode: "PAYMENT_FORM_DATE", value: "2027-07-18" }),
      expect.objectContaining({ fieldCode: "PAYMENT_FORM_MODEL", value: "002" }),
      expect.objectContaining({ fieldCode: "PAYMENT_FORM_REFERENCE", value: "SYN-PAY-61" }),
    ]));
    expect(result.fields.some((item) => item.fieldCode === "TAX_MODEL")).toBe(false);
    expect(review.documents[0]?.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ canonicalType: "PAYMENT_FORM_DATE", normalizedValue: "2027-07-18" }),
      expect.objectContaining({ canonicalType: "PAYMENT_FORM_MODEL" }),
      expect.objectContaining({ canonicalType: "PAYMENT_FORM_REFERENCE" }),
    ]));
  });

  it("projects known V6 money with exact semantics instead of OTHER", async () => {
    const result = await extractAeatRealCorpusDocumentV6(source(CASES[1]!));
    const fields = projectRealCorpusReviewV6(result).documents[0]?.fields ?? [];
    expect(fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ semantic: "MONEY", canonicalType: "OUTSTANDING_PRINCIPAL" }),
      expect.objectContaining({ semantic: "MONEY", canonicalType: "EXECUTIVE_SURCHARGE_20" }),
      expect.objectContaining({ semantic: "MONEY", canonicalType: "EXECUTIVE_SURCHARGE_5" }),
    ]));
  });

  it("never returns direct identity, asset identifiers or OCR text", async () => {
    const result = await extractAeatRealCorpusDocumentV6(source(CASES[11]!, true));
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("12345678Z");
    expect(serialized).not.toContain("ES1200000000000000000000");
    expect(serialized).not.toContain("0000ZZZ");
    expect(serialized).not.toContain("PERSONA ULTRAPRIVADA");
    expect(serialized).not.toContain("rawText");
  });

  it("projects only closed fields through the privacy boundary", async () => {
    const outcome = await extractAeatRealCorpusDocumentV6(source(CASES[19]!));
    const review = projectRealCorpusReviewV6(outcome);
    expect(review.documents).toHaveLength(1);
    expect(review.documents[0]?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Porcentaje histórico de reducción", displayValue: "25" }),
      ]),
    );
    expect(() => projectRealCorpusReviewV6({
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
    })).toThrow("FISCAL_NOTIFICATION_VERTICAL_SLICE_REVIEW_PRIVACY_REJECTED");
  });

  it("does not mutate source inputs and returns frozen collections", async () => {
    const input = source(CASES[0]!);
    const before = JSON.stringify(input);
    const result = await extractAeatRealCorpusDocumentV6(input);
    expect(JSON.stringify(input)).toBe(before);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.fields)).toBe(true);
    expect(Object.isFrozen(result.segments)).toBe(true);
    expect(Object.isFrozen(result.installments)).toBe(true);
  });
});
