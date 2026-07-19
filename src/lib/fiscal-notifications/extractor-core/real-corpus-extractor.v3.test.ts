import { describe, expect, it } from "vitest";
import { analyzeFiscalNotificationDocumentInput } from "../document-input-analysis";
import type { BoundedDocumentInput } from "../input-contract";
import { projectRealCorpusReviewV3 } from "../real-corpus-review.v3";
import { parseFiscalNotificationVerticalSliceReviewV1 } from "../vertical-slice-review.v1";
import {
  extractAeatRealCorpusDocumentV3,
  type RealCorpusExtractorOutcomeV3,
} from "./real-corpus-extractor.v3";

const OWNER = "owner-synthetic-v3";
const AEAT = "AGENCIA ESTATAL DE ADMINISTRACIÓN TRIBUTARIA";

function document(
  id: string,
  pages: readonly string[],
  blankPages: readonly number[] = [],
): BoundedDocumentInput {
  const blank = new Set(blankPages);
  return Object.freeze({
    ownerScope: OWNER,
    documentId: id,
    pages: Object.freeze(
      pages.map((text, index) =>
        Object.freeze({
          pageNumber: index + 1,
          text: blank.has(index + 1) ? "" : text,
          isBlank: blank.has(index + 1),
        }),
      ),
    ),
  });
}

function pages(
  count: number,
  content: Readonly<Record<number, string>>,
): readonly string[] {
  return Object.freeze(
    Array.from({ length: count }, (_, index) => content[index + 1] ?? "Anexo"),
  );
}

function enforcementSource(input: {
  id: string;
  debtKey: string;
  dueDate: string;
  principal: string;
  surcharge20: string;
  ordinary: string;
  reduced: string;
  paymentForm: string;
  model?: string;
  year?: string;
}): BoundedDocumentInput {
  return document(
    input.id,
    pages(10, {
      1: `${AEAT}\nPROVIDENCIA DE APREMIO\nClave de liquidación: ${input.debtKey}\nModelo: ${input.model ?? "130"}\nEjercicio: ${input.year ?? "2025"}\nPeríodo: 4T\nFinal del período voluntario: ${input.dueDate}\nFecha de emisión: 25-05-2026\nPrincipal pendiente: ${input.principal} EUR\nRecargo de apremio ordinario 20%: ${input.surcharge20} EUR\nTotal con recargo ordinario: ${input.ordinary} EUR\nImporte con recargo reducido 10%: ${input.reduced} EUR\nRecargo ejecutivo 5%: 6,00 EUR`,
      2: "Plazo desde la recepción y consecuencias del impago",
      7: `Carta de pago interesado\nReferencia de carta de pago: ${input.paymentForm}\nImporte de carta de pago: ${input.reduced} EUR\nNRC:`,
      9: `Carta de pago entidad colaboradora\nReferencia de carta de pago: ${input.paymentForm}\nNRC:`,
    }),
    [6],
  );
}

function deferralSource(input: {
  id: string;
  agreement: string;
  debtKey: string;
  schedule: readonly Readonly<{
    sequence: number;
    dueDate: string;
    base: string;
    interest: string;
    total: string;
  }>[];
}): BoundedDocumentInput {
  const rows = input.schedule
    .map(
      (item) =>
        `Cuota ${item.sequence} | ${item.dueDate} | Base: ${item.base} EUR | Interés: ${item.interest} EUR | Total: ${item.total} EUR`,
    )
    .join("\n");
  return document(
    input.id,
    pages(10, {
      1: `${AEAT}\nCONCESIÓN DEL APLAZAMIENTO/FRACCIONAMIENTO DE PAGO SIN GARANTÍA\nReferencia del acuerdo: ${input.agreement}\nClave de liquidación: ${input.debtKey}\nDeuda principal: 357,00 EUR\nTotal intereses: 4,20 EUR\nTotal del plan: 361,20 EUR\nFecha del acuerdo: 20-03-2026\nPago mediante domiciliación`,
      7: `ANEXO I CALENDARIO DE CUOTAS\n${rows}`,
      9: "ANEXO II CÁLCULO DE INTERESES",
    }),
    [6],
  );
}

function bankSeizureSource(input: {
  id: string;
  title?: string;
  debtHeader?: string;
  accountsHeader?: string;
  recipientText?: string;
  debtKey?: string;
  pending?: string;
  total?: string;
  limit?: string;
  seizedAmounts?: readonly string[];
  extraHeader?: string;
}): BoundedDocumentInput {
  const seizedAmounts = input.seizedAmounts ?? ["276,00"];
  return document(
    input.id,
    pages(6, {
      1: `${AEAT}\n${input.title ?? "NOTIFICACIÓN DE DILIGENCIA DE EMBARGO DE CUENTAS Y DEPÓSITOS"}\nNúmero de diligencia: SYN-SEIZURE-D11\nFecha de la diligencia: 24-10-2025\n${input.recipientText ?? "Se le notifica en condición de OBLIGADO AL PAGO"}${input.extraHeader ? `\n${input.extraHeader}` : ""}`,
      2: "Información sobre recursos y oposición",
      3: "Continuación de la diligencia",
      5: [
        "DEUDAS DEL EXPEDIENTE EJECUTIVO",
        `CONCEPTO | PER/EJER | ${input.debtHeader ?? "Nº LIQUIDACIÓN"} | IMP. PENDIENTE`,
        `IVA sintético | 4T/2024 | ${input.debtKey ?? "SYN-DEBT-D11"} | ${input.pending ?? "276,00"} EUR`,
        `IMPORTE PENDIENTE TOTAL: ${input.total ?? "276,00"} EUR`,
        `IMPORTE A EMBARGAR: ${input.limit ?? "276,00"} EUR`,
        input.accountsHeader ?? "DEPÓSITOS Y CUENTAS",
        "IDENTIFICADOR INTERNO | IMPORTE EMBARGADO",
        ...seizedAmounts.map(
          (amount, index) => `ACTIVO-${index + 1} | ${amount} EUR`,
        ),
        "IBAN ES0012345678901234567890",
        "Banco Privado Sintético",
      ].join("\n"),
    }),
    [4, 6],
  );
}

function fieldAmount(
  outcome: RealCorpusExtractorOutcomeV3,
  code: string,
): number | null {
  const item = outcome.fields.find((candidate) => candidate.fieldCode === code);
  return item?.kind === "MONEY" ? item.amountCents : null;
}

function fieldText(
  outcome: RealCorpusExtractorOutcomeV3,
  code: string,
): string | null {
  const item = outcome.fields.find((candidate) => candidate.fieldCode === code);
  return item?.kind === "TEXT" ? item.value : null;
}

function fieldReference(
  outcome: RealCorpusExtractorOutcomeV3,
  code: string,
): string | null {
  const item = outcome.fields.find((candidate) => candidate.fieldCode === code);
  return item?.kind === "REFERENCE" ? item.value : null;
}

describe("AEAT real corpus extractor V3", () => {
  it("models the three enforcement surcharge outcomes as alternatives", async () => {
    const result = await extractAeatRealCorpusDocumentV3(
      enforcementSource({
        id: "SYN-V3-APREMIO-A1",
        debtKey: "A9999900010001001",
        dueDate: "20-04-2026",
        principal: "120,00",
        surcharge20: "24,00",
        ordinary: "144,00",
        reduced: "132,00",
        paymentForm: "SYN-PAYFORM-A1",
      }),
    );

    expect(result.familyId).toBe("collection.enforcement_order");
    expect(result.amountScenarios).toEqual([
      {
        code: "PRINCIPAL_ONLY_WITH_5_PERCENT_IF_PREPAID",
        amountCents: 12600,
        condition: "PRINCIPAL_PAID_BEFORE_NOTICE",
      },
      {
        code: "REDUCED_SURCHARGE_10_PERCENT",
        amountCents: 13200,
        condition: "PAID_WITHIN_NOTICE_DEADLINE",
      },
      {
        code: "ORDINARY_SURCHARGE_20_PERCENT",
        amountCents: 14400,
        condition: "ORDINARY_ENFORCEMENT_OUTCOME",
      },
    ]);
    expect(result.paymentFormStatus).toBe("PAYMENT_FORM_ONLY");
    expect(result.confirmsPayment).toBe(false);
    expect(
      result.segments.filter(
        (item) => item.relationToPrimary === "PAYMENT_FORM_FOR",
      ),
    ).toHaveLength(2);
    expect(result.segments.every((item) => !item.provesPayment)).toBe(true);
    expect(result.physicalPageCount).toBe(10);
    expect(result.contentPageCount).toBe(9);
  });

  it("does not treat a payment form as evidence unless both payment date and NRC are filled", async () => {
    const withoutEvidence = await extractAeatRealCorpusDocumentV3(
      enforcementSource({
        id: "SYN-V3-PAYMENT-FORM-ONLY",
        debtKey: "A9999900010001111",
        dueDate: "20-04-2026",
        principal: "120,00",
        surcharge20: "24,00",
        ordinary: "144,00",
        reduced: "132,00",
        paymentForm: "SYN-PAYFORM-ONLY",
      }),
    );
    expect(withoutEvidence.paymentFormStatus).toBe("PAYMENT_FORM_ONLY");
    expect(
      withoutEvidence.fields.some((item) => item.fieldCode === "NRC"),
    ).toBe(false);

    const withEvidence = await extractAeatRealCorpusDocumentV3(
      document(
        "SYN-V3-PAYMENT-EVIDENCE",
        pages(10, {
          1: `${AEAT}\nPROVIDENCIA DE APREMIO\nClave de liquidación: A9999900010001111\nPrincipal pendiente: 120,00 EUR\nRecargo de apremio ordinario 20%: 24,00 EUR\nTotal con recargo ordinario: 144,00 EUR\nImporte con recargo reducido 10%: 132,00 EUR`,
          7: "Carta de pago interesado\nFecha de pago: 21-04-2026\nNRC: SYN-NRC-PAID-1",
          9: "Carta de pago entidad colaboradora",
        }),
        [6],
      ),
    );
    expect(withEvidence.paymentFormStatus).toBe("PAYMENT_EVIDENCE_PRESENT");
    expect(withEvidence.fields.map((item) => item.fieldCode)).toEqual(
      expect.arrayContaining(["PAYMENT_DATE", "NRC"]),
    );
    expect(withEvidence.confirmsPayment).toBe(false);
    expect(withEvidence.segments.filter((item) => item.provesPayment)).toEqual([
      expect.objectContaining({
        type: "PAYMENT_FORM_INTERESTED_COPY",
        relationToPrimary: "PAYMENT_EVIDENCE_FOR",
      }),
    ]);
    const persisted = parseFiscalNotificationVerticalSliceReviewV1(
      JSON.parse(JSON.stringify(projectRealCorpusReviewV3(withEvidence))),
    );
    expect(persisted.documents[0]?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldId: expect.stringContaining(":PAYMENT_DATE:"),
          canonicalType: "PAYMENT_DATE",
        }),
        expect.objectContaining({
          fieldId: expect.stringContaining(":NRC:"),
        }),
      ]),
    );
  });

  it("keeps every installment and its base, interest and total independently", async () => {
    const result = await extractAeatRealCorpusDocumentV3(
      deferralSource({
        id: "SYN-V3-DEFERRAL-A",
        agreement: "SYN-PLAN-A",
        debtKey: "A9999900010001001",
        schedule: [
          {
            sequence: 1,
            dueDate: "20-04-2026",
            base: "119,00",
            interest: "1,00",
            total: "120,00",
          },
          {
            sequence: 2,
            dueDate: "20-05-2026",
            base: "119,00",
            interest: "1,40",
            total: "120,40",
          },
          {
            sequence: 3,
            dueDate: "22-06-2026",
            base: "119,00",
            interest: "1,80",
            total: "120,80",
          },
        ],
      }),
    );

    expect(result.familyId).toBe("collection.deferral_grant");
    expect(result.installments).toHaveLength(3);
    expect(result.installments.map((item) => item.totalCents)).toEqual([
      12000, 12040, 12080,
    ]);
    expect(
      new Set(result.installments.map((item) => item.installmentId)).size,
    ).toBe(3);
    expect(result.installments[0]?.installmentId).toContain(
      ":AEAT:A9999900010001001:2026-04-20:1",
    );
    expect(result.segments.map((item) => item.type)).toEqual([
      "PRIMARY_ACT",
      "BLANK_SEPARATOR",
      "ANNEX_INSTALLMENT_SCHEDULE",
      "ANNEX_INTEREST_CALCULATION",
    ]);
  });

  it.each([
    [
      "SYN-V3-APREMIO-B4",
      "20-04-2026",
      "300,00",
      "60,00",
      "360,00",
      "330,00",
      "SYN-PAYFORM-B4",
    ],
    [
      "SYN-V3-APREMIO-B5",
      "20-05-2026",
      "301,00",
      "60,20",
      "361,20",
      "331,10",
      "SYN-PAYFORM-B5",
    ],
    [
      "SYN-V3-APREMIO-C3",
      "20-02-2026",
      "517,00",
      "103,40",
      "620,40",
      "568,70",
      "SYN-PAYFORM-C3",
    ],
    [
      "SYN-V3-APREMIO-D",
      "20-08-2025",
      "230,00",
      "46,00",
      "276,00",
      "253,00",
      "SYN-PAYFORM-D",
    ],
  ])(
    "classifies corpus enforcement case %s",
    async (
      id,
      dueDate,
      principal,
      surcharge20,
      ordinary,
      reduced,
      paymentForm,
    ) => {
      const result = await extractAeatRealCorpusDocumentV3(
        enforcementSource({
          id,
          debtKey: id.includes("B")
            ? "A9999900010002002"
            : id.includes("C")
              ? "A9999900010003003"
              : "A9999900010004004",
          dueDate,
          principal,
          surcharge20,
          ordinary,
          reduced,
          paymentForm,
          ...(id.endsWith("D") ? { model: "180", year: "2024" } : {}),
        }),
      );
      expect(result.familyId).toBe("collection.enforcement_order");
      expect(fieldAmount(result, "OUTSTANDING_PRINCIPAL")).toBe(
        Math.round(Number(principal.replace(",", ".")) * 100),
      );
    },
  );

  it.each([
    ["SYN-V3-DEFERRAL-B", "SYN-PLAN-B", "A9999900010002002"],
    ["SYN-V3-DEFERRAL-C", "SYN-PLAN-C", "A9999900010003003"],
  ])("classifies corpus deferral case %s", async (id, agreement, debtKey) => {
    const result = await extractAeatRealCorpusDocumentV3(
      deferralSource({
        id,
        agreement,
        debtKey,
        schedule: [
          {
            sequence: 1,
            dueDate: "20-01-2026",
            base: "295,00",
            interest: "2,00",
            total: "297,00",
          },
          {
            sequence: 2,
            dueDate: "20-02-2026",
            base: "295,00",
            interest: "3,00",
            total: "298,00",
          },
          {
            sequence: 3,
            dueDate: "20-03-2026",
            base: "295,00",
            interest: "4,00",
            total: "299,00",
          },
        ],
      }),
    );
    expect(result.familyId).toBe("collection.deferral_grant");
    expect(result.installments).toHaveLength(3);
  });

  it("extracts the real six-page Nº LIQUIDACIÓN structure without inventing a transfer", async () => {
    const result = await extractAeatRealCorpusDocumentV3(
      bankSeizureSource({ id: "SYN-V3-BANK-SEIZURE-D11" }),
    );
    expect(result.familyId).toBe("seizure.bank_account");
    expect(fieldReference(result, "SEIZURE_ORDER_ID")).toBe("SYN-SEIZURE-D11");
    expect(fieldReference(result, "DEBT_KEY")).toBe("SYN-DEBT-D11");
    expect(fieldAmount(result, "PENDING_DEBT")).toBe(27600);
    expect(fieldAmount(result, "PENDING_DEBT_TOTAL")).toBe(27600);
    expect(fieldAmount(result, "SEIZURE_LIMIT")).toBe(27600);
    expect(fieldAmount(result, "SEIZED_AMOUNT")).toBe(27600);
    expect(fieldText(result, "RECIPIENT_ROLE")).toBe("Obligado al pago");
    expect(fieldText(result, "ASSET_KIND")).toBe("Cuenta o depósito bancario");
    expect(
      result.fields.some((item) => item.fieldCode === "REMITTED_AMOUNT"),
    ).toBe(false);
    expect(JSON.stringify(result)).not.toContain("ES0012345678901234567890");
    expect(JSON.stringify(result)).not.toContain("Banco Privado Sintético");
    expect(result.contentPageCount).toBe(4);
  });

  it.each([
    "NÚMERO LIQUIDACIÓN",
    "NUMERO LIQUIDACION",
    "Nº LIQUIDACIÓN",
    "N.º LIQUIDACIÓN",
  ])(
    "accepts the official liquidation header variant %s",
    async (debtHeader) => {
      const result = await extractAeatRealCorpusDocumentV3(
        bankSeizureSource({ id: `SYN-V3-BANK-${debtHeader}`, debtHeader }),
      );
      expect(result.familyId).toBe("seizure.bank_account");
      expect(fieldReference(result, "DEBT_KEY")).toBe("SYN-DEBT-D11");
    },
  );

  it("keeps the historical cuentas bancarias title and block compatible", async () => {
    const result = await extractAeatRealCorpusDocumentV3(
      bankSeizureSource({
        id: "SYN-V3-BANK-HISTORICAL",
        title: "DILIGENCIA DE EMBARGO DE CUENTAS BANCARIAS",
        debtHeader: "CLAVE DE LIQUIDACIÓN",
        accountsHeader: "CUENTAS BANCARIAS",
      }),
    );
    expect(result.familyId).toBe("seizure.bank_account");
    expect(fieldReference(result, "DEBT_KEY")).toBe("SYN-DEBT-D11");
  });

  it("does not treat a generic document date as a signing date", async () => {
    const result = await extractAeatRealCorpusDocumentV3(
      bankSeizureSource({
        id: "SYN-V3-BANK-GENERIC-DOCUMENT-DATE",
        extraHeader: "Fecha del documento: 25-10-2025",
      }),
    );

    expect(result.fields.some(
      (field) => field.fieldCode === "SIGNING_DATE",
    )).toBe(false);
  });

  it("uses the financial-entity role only for the separate recipient variant", async () => {
    const result = await extractAeatRealCorpusDocumentV3(
      bankSeizureSource({
        id: "SYN-V3-BANK-FINANCIAL-RECIPIENT",
        recipientText: "Notificación dirigida a la entidad financiera",
      }),
    );
    expect(result.familyId).toBe("seizure.bank_account");
    expect(fieldText(result, "RECIPIENT_ROLE")).toBe(
      "Entidad financiera destinataria",
    );
  });

  it("keeps multiple accounts separate by ordinal without retaining identifiers", async () => {
    const result = await extractAeatRealCorpusDocumentV3(
      bankSeizureSource({
        id: "SYN-V3-BANK-MULTI-ASSET",
        seizedAmounts: ["200,00", "76,00"],
      }),
    );
    expect(
      result.fields
        .filter((item) => item.fieldCode === "SEIZED_AMOUNT")
        .map((item) => (item.kind === "MONEY" ? item.amountCents : null)),
    ).toEqual([20000, 7600]);
    expect(
      result.fields.some((item) => item.fieldCode === "OPAQUE_ASSET_ORDINAL"),
    ).toBe(false);
    expect(JSON.stringify(result)).not.toContain("ACTIVO-1");
    expect(JSON.stringify(result)).not.toContain("ACTIVO-2");
  });

  it("does not classify an isolated debt-and-account annex", async () => {
    const result = await extractAeatRealCorpusDocumentV3(
      document(
        "SYN-V3-BANK-ANNEX-ONLY",
        pages(6, {
          5: `${AEAT}\nDEUDAS DEL EXPEDIENTE EJECUTIVO\nCONCEPTO | PER/EJER | Nº LIQUIDACIÓN | IMP. PENDIENTE\nIVA | 4T/2024 | SYN-DEBT-D11 | 276,00 EUR\nIMPORTE PENDIENTE TOTAL: 276,00 EUR\nIMPORTE A EMBARGAR: 276,00 EUR\nDEPÓSITOS Y CUENTAS\nCUENTA | IMPORTE EMBARGADO\nACTIVO-1 | 276,00 EUR`,
        }),
        [1, 2, 3, 4, 6],
      ),
    );
    expect(result.status).toBe("UNKNOWN");
    expect(result.familyId).toBeNull();
  });

  it("does not confuse a commercial-credit seizure with a bank seizure", async () => {
    const source = bankSeizureSource({ id: "SYN-V3-COMMERCIAL-CREDIT" });
    const changed = Object.freeze({
      ...source,
      pages: Object.freeze(
        source.pages.map((page) =>
          page.pageNumber === 1
            ? Object.freeze({
                ...page,
                text: `${AEAT}\nDILIGENCIA DE EMBARGO DE CRÉDITOS COMERCIALES\nNúmero de diligencia: SYN-SEIZURE-D11\nFecha de la diligencia: 24-10-2025`,
              })
            : page,
        ),
      ),
    });
    const result = await extractAeatRealCorpusDocumentV3(changed);
    expect(result.status).toBe("UNKNOWN");
    expect(result.familyId).toBeNull();
  });

  it("requires the six-page structure but preserves useful facts when an optional amount is absent", async () => {
    const source = bankSeizureSource({ id: "SYN-V3-BANK-STRICT-SHAPE" });
    const fivePages = Object.freeze({
      ...source,
      pages: Object.freeze(source.pages.slice(0, 5)),
    });
    const sevenPages = Object.freeze({
      ...source,
      pages: Object.freeze([
        ...source.pages,
        Object.freeze({ pageNumber: 7, text: "Apéndice", isBlank: false }),
      ]),
    });
    const missingLimit = Object.freeze({
      ...source,
      pages: Object.freeze(
        source.pages.map((page) =>
          page.pageNumber === 5
            ? Object.freeze({
                ...page,
                text: page.text.replace(
                  "IMPORTE A EMBARGAR: 276,00 EUR",
                  "Dato no identificado: 276,00 EUR",
                ),
              })
            : page,
        ),
      ),
    });

    for (const candidate of [fivePages, sevenPages]) {
      const result = await extractAeatRealCorpusDocumentV3(candidate);
      expect(result.status).toBe("UNKNOWN");
      expect(result.familyId).toBeNull();
    }
    const partial = await extractAeatRealCorpusDocumentV3(missingLimit);
    expect(partial).toMatchObject({
      status: "REVIEW_REQUIRED",
      familyId: "seizure.bank_account",
    });
    expect(partial.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ fieldCode: "SEIZURE_ORDER_ID" }),
      expect.objectContaining({ fieldCode: "SEIZURE_DATE" }),
    ]));
    expect(partial.fields.some((field) => field.fieldCode === "SEIZE_LIMIT")).toBe(false);
  });

  it("extracts a remitted amount only when a later bank response or proof says so", async () => {
    const source = bankSeizureSource({ id: "SYN-V3-BANK-REMITTED-PROOF" });
    const withProof = Object.freeze({
      ...source,
      pages: Object.freeze(
        source.pages.map((page) =>
          page.pageNumber === 3
            ? Object.freeze({
                ...page,
                text: `${page.text}\nRESPUESTA DE LA ENTIDAD FINANCIERA\nImporte remitido al Tesoro: 276,00 EUR`,
              })
            : page,
        ),
      ),
    });
    const result = await extractAeatRealCorpusDocumentV3(withProof);
    expect(result.familyId).toBe("seizure.bank_account");
    expect(fieldAmount(result, "REMITTED_AMOUNT")).toBe(27_600);
    expect(result.confirmsPayment).toBe(false);
  });

  it("treats the bilingual reminder as one act and no formal requirement", async () => {
    const result = await extractAeatRealCorpusDocumentV3(
      document(
        "SYN-V3-MODEL180-REMINDER",
        pages(6, {
          1: `${AEAT}\nDECLARACIONES INFORMATIVAS\nMODELO 115\nMODELO 180\n1 DE ENERO\nPRESENTACIÓN ELECTRÓNICA\nReferencia del documento: SYN-REMINDER-180\nModelo de origen: 115\nModelo esperado: 180\nEjercicio: 2024`,
          4: "VERSIÓ EN CATALÀ DEL MATEIX AVÍS",
        }),
        [6],
      ),
    );
    expect(result.familyId).toBe("information.model_filing_reminder");
    expect(
      result.segments.filter(
        (item) => item.relationToPrimary === "PARALLEL_LANGUAGE_COPY",
      ),
    ).toHaveLength(1);
    expect(result.explanation?.result).toContain("no acredita que falte");
    expect(result.fields.map((item) => item.fieldCode)).toEqual(
      expect.arrayContaining([
        "SOURCE_MODEL",
        "EXPECTED_MODEL",
        "PRINTED_START_DATE",
        "ELECTRONIC_CHANNEL",
      ]),
    );
    expect(result.confirmsDeadline).toBe(false);
  });

  it("keeps a refund transfer order separate from final bank credit", async () => {
    const result = await extractAeatRealCorpusDocumentV3(
      document("SYN-V3-REFUND-EXTERNAL-DEDUCTIONS", [
        `${AEAT}\nCOMUNICACIÓN DE PAGO DE DEVOLUCIÓN\nReferencia de la devolución: SYN-REFUND-2022\nReferencia del acuerdo de devolución: SYN-REFUND-DECISION\nDevolución solicitada: 1.250,00 EUR\nDevolución acordada: 1.250,00 EUR\nDevolución ordenada: 1.250,00 EUR\nDeducción organismo público: Seguridad Social | 360,00 EUR\nDeducción organismo público: Hacienda autonómica | 750,00 EUR\nReferencia de deducción: SYN-EXTERNAL-DEDUCTION-1\nReferencia de deducción: SYN-EXTERNAL-DEDUCTION-2\nTotal deducciones: 1.110,00 EUR\nLíquido a transferir: 140,00 EUR\nFecha de emisión: 01-06-2023`,
        "Detalle de organismos por roles genéricos",
      ]),
    );
    expect(result.familyId).toBe("refund.payment_communication");
    expect(fieldAmount(result, "NET_REFUND_PAYMENT")).toBe(14000);
    expect(
      result.fields
        .filter((item) =>
          item.fieldCode.startsWith("EXTERNAL_DEDUCTION_REFERENCE_"),
        )
        .map((item) => (item.kind === "REFERENCE" ? item.value : null)),
    ).toEqual(["SYN-EXTERNAL-DEDUCTION-1", "SYN-EXTERNAL-DEDUCTION-2"]);
    expect(
      result.fields
        .filter((item) => item.fieldCode.startsWith("PUBLIC_AUTHORITY_ROLE_"))
        .map((item) => (item.kind === "TEXT" ? item.value : null)),
    ).toEqual(["Seguridad Social", "Hacienda autonómica"]);
    expect(
      result.fields.some((item) => item.fieldCode === "TRANSFER_STATUS"),
    ).toBe(false);
    expect(result.explanation?.whatIs).toContain("se ordenó transferir");
    expect(result.confirmsPayment).toBe(false);
  });

  it("extracts a refund decision reference printed inside the agreed-amount row", async () => {
    const result = await extractAeatRealCorpusDocumentV3(
      document("SYN-V3-REFUND-INLINE-DECISION", [
        `${AEAT}\nCOMUNICACIÓN DE PAGO DE DEVOLUCIÓN\nReferencia: SYN-REFUND-INLINE-1\nDevolución solicitada: 1.250,00 EUR\nImporte acordado según acuerdo n.º 202600000000001X 1.250,00 EUR\nDevolución ordenada: 1.250,00 EUR\nDeducción organismo público: Seguridad Social | 1.110,00 EUR\nTotal deducciones: 1.110,00 EUR\nLíquido a transferir: 140,00 EUR`,
        "Detalle de la deducción",
      ]),
    );

    expect(result).toMatchObject({
      status: "REVIEW_REQUIRED",
      familyId: "refund.payment_communication",
    });
    expect(result.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldCode: "REFUND_DECISION_REFERENCE",
          kind: "REFERENCE",
          value: "202600000000001X",
          evidence: expect.objectContaining({ pageNumbers: [1] }),
        }),
      ]),
    );
  });

  it("classifies the model 303 channel change without creating a personal obligation", async () => {
    const result = await extractAeatRealCorpusDocumentV3(
      document("SYN-V3-MODEL303-CHANNEL-CHANGE", [
        `${AEAT}\nDESAPARECE LA MODALIDAD DE PRESENTACIÓN mediante PREDECLARACIÓN del MODELO 303 para el EJERCICIO 2023 Y SIGUIENTES\nReferencia del documento: SYN-CHANGE-303\nModelo afectado: 303\nFecha de emisión: 08-03-2023`,
        "La presentación será electrónica",
      ]),
    );
    expect(result.familyId).toBe("information.regulatory_change");
    expect(result.explanation?.consequence).toBe(
      "No es un requerimiento, liquidación ni sanción.",
    );
    expect(result.confirmsDeadline).toBe(false);
  });

  it("extracts a regulatory reference embedded after adjacent identity metadata", async () => {
    const result = await extractAeatRealCorpusDocumentV3(
      document("SYN-V3-MODEL303-EMBEDDED-REFERENCE", [
        `${AEAT}\nN.I.F.: IDENTITY_PRIVATE_SENTINEL Referencia: SYN 000000000000001\nDESAPARECE LA MODALIDAD DE PRESENTACIÓN mediante PREDECLARACIÓN del MODELO 303 para el EJERCICIO 2023 Y SIGUIENTES`,
        "La presentación será electrónica",
      ]),
    );

    expect(result.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldCode: "DOCUMENT_REFERENCE",
          kind: "REFERENCE",
          value: "SYN000000000000001",
          evidence: expect.objectContaining({ pageNumbers: [1] }),
        }),
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("IDENTITY_PRIVATE_SENTINEL");
  });

  it("uses the release date for the current event and does not create a seizure from its annex", async () => {
    const result = await extractAeatRealCorpusDocumentV3(
      document(
        "SYN-V3-MOVABLE-RELEASE",
        pages(4, {
          1: `${AEAT}\nLEVANTAMIENTO DE EMBARGO DE BIENES MUEBLES\nNúmero de diligencia: SYN-MOVABLE-SEIZURE-1\nFecha de la diligencia: 23-07-2022\nFecha del levantamiento: 20-10-2022\nSe ordena la cancelación registral`,
          3: "ANEXO DEL BIEN ANTERIOR\nMatrícula 0000-XXX\nBastidor VIN-SYNTHETIC-PRIVATE\nLugar de depósito privado",
        }),
        [4],
      ),
    );
    expect(result.familyId).toBe("seizure.release");
    const releaseDate = result.fields.find(
      (item) => item.fieldCode === "RELEASE_DATE",
    );
    const sourceDate = result.fields.find(
      (item) => item.fieldCode === "SOURCE_SEIZURE_DATE",
    );
    expect(releaseDate?.kind === "DATE" ? releaseDate.value : null).toBe(
      "2022-10-20",
    );
    expect(sourceDate?.kind === "DATE" ? sourceDate.value : null).toBe(
      "2022-07-23",
    );
    const review = projectRealCorpusReviewV3(result);
    expect(review.documents[0]?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldId: expect.stringContaining(":SOURCE_SEIZURE_DATE:"),
          semantic: "DETAIL",
          canonicalType: "FACT_OR_GROUND",
        }),
        expect.objectContaining({
          fieldId: expect.stringContaining(":RELEASE_DATE:"),
          canonicalType: "RELEASE_DATE",
        }),
      ]),
    );
    expect(
      result.segments.find(
        (item) => item.type === "ANNEX_PREVIOUSLY_SEIZED_ASSET",
      )?.createsIndependentDebt,
    ).toBe(false);
    expect(JSON.stringify(result)).not.toContain("0000-XXX");
    expect(JSON.stringify(result)).not.toContain("VIN-SYNTHETIC-PRIVATE");
  });

  it("stores a negative certificate as a dated snapshot without debt details", async () => {
    const result = await extractAeatRealCorpusDocumentV3(
      document(
        "SYN-V3-NEGATIVE-CERTIFICATE",
        [
          `${AEAT}\nDENEGACIÓN DE CERTIFICADO\nReferencia del certificado: SYN-CERT-NEG-1\nFecha de emisión: 16-12-2021\nConstan DEUDAS O SANCIONES en período EJECUTIVA no suspendidas ni aplazadas`,
          "Página informativa",
        ],
        [2],
      ),
    );
    expect(result.familyId).toBe("certificate.tax_compliance");
    expect(result.fields.some((item) => item.kind === "MONEY")).toBe(false);
    expect(result.explanation?.result).toContain("A la fecha del certificado");
  });

  it("projects a corpus document through the UI review and JSON persistence boundary", async () => {
    const outcome = await extractAeatRealCorpusDocumentV3(
      deferralSource({
        id: "SYN-V3-DEFERRAL-PERSISTENCE",
        agreement: "SYN-PLAN-PERSIST",
        debtKey: "A9999900010005005",
        schedule: [
          {
            sequence: 1,
            dueDate: "20-04-2026",
            base: "100,00",
            interest: "1,00",
            total: "101,00",
          },
        ],
      }),
    );
    const review = projectRealCorpusReviewV3(outcome);
    const persisted = parseFiscalNotificationVerticalSliceReviewV1(
      JSON.parse(JSON.stringify(review)),
    );
    expect(persisted.documents).toHaveLength(1);
    expect(persisted.documents[0]?.familyId).toBe("collection.deferral_grant");
    expect(
      persisted.documents[0]?.fields.some(
        (item) => item.fieldId === "real-corpus-v3:installment:0",
      ),
    ).toBe(true);
    expect(persisted.permitsDebtCreation).toBe(false);
    expect(persisted.permitsPaymentAction).toBe(false);
  });

  it("runs V3 through the production analysis pipeline without duplicating its family card", async () => {
    const source = deferralSource({
      id: "SYN-V3-DEFERRAL-PIPELINE",
      agreement: "SYN-PLAN-PIPELINE",
      debtKey: "A9999900010005006",
      schedule: [
        {
          sequence: 1,
          dueDate: "20-04-2026",
          base: "100,00",
          interest: "1,00",
          total: "101,00",
        },
      ],
    });
    const analysis = await analyzeFiscalNotificationDocumentInput(source);
    const persisted = parseFiscalNotificationVerticalSliceReviewV1(
      JSON.parse(JSON.stringify(analysis.verticalSliceReview)),
    );
    const familyDocuments = persisted.documents.filter(
      (item) => item.familyId === "collection.deferral_grant",
    );

    expect(familyDocuments).toHaveLength(1);
    expect(familyDocuments[0]?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldId: "real-corpus-v3:DEBT_KEY:0",
          displayValue: "A9999900010005006",
        }),
        expect.objectContaining({
          fieldId: "real-corpus-v3:installment:0",
        }),
      ]),
    );
    expect(JSON.stringify(familyDocuments[0]?.fields)).not.toMatch(
      /recognized-family|V3:EXPLANATION|V3:EXACT|payment-form-status/u,
    );
    expect(persisted.permitsDebtCreation).toBe(false);
  });

  it("runs the real bank-seizure structure through Worker analysis and the review boundary", async () => {
    const analysis = await analyzeFiscalNotificationDocumentInput(
      bankSeizureSource({ id: "SYN-V3-BANK-SEIZURE-PIPELINE" }),
    );
    const persisted = parseFiscalNotificationVerticalSliceReviewV1(
      JSON.parse(JSON.stringify(analysis.verticalSliceReview)),
    );
    const seizures = persisted.documents.filter(
      (item) => item.familyId === "seizure.bank_account",
    );
    expect(seizures).toHaveLength(1);
    expect(seizures[0]?.pageFrom).toBe(1);
    expect(seizures[0]?.pageTo).toBe(6);
    expect(seizures[0]?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          canonicalType: "SEIZURE_ORDER_ID",
          displayValue: "SYN-SEIZURE-D11",
        }),
        expect.objectContaining({
          canonicalType: "LIQUIDATION_KEY",
          displayValue: "SYN-DEBT-D11",
        }),
        expect.objectContaining({
          canonicalType: "SEIZURE_LIMIT",
          amountCents: 27_600,
        }),
        expect.objectContaining({
          canonicalType: "SEIZED_AMOUNT",
          amountCents: 27_600,
        }),
        expect.objectContaining({
          canonicalType: "SEIZURE_RECIPIENT_ROLE",
          displayValue: "Obligado al pago",
        }),
      ]),
    );
    expect(JSON.stringify(persisted)).not.toContain("ES0012345678901234567890");
    expect(JSON.stringify(persisted)).not.toContain("Banco Privado Sintético");
    expect(persisted.permitsDebtCreation).toBe(false);
    expect(persisted.permitsPaymentAction).toBe(false);
  });

  it("projects all eight V3 families through the same UI and persistence contract", async () => {
    const sources: readonly BoundedDocumentInput[] = [
      enforcementSource({
        id: "SYN-V3-UI-ENFORCEMENT",
        debtKey: "A9999900010008008",
        dueDate: "20-04-2026",
        principal: "120,00",
        surcharge20: "24,00",
        ordinary: "144,00",
        reduced: "132,00",
        paymentForm: "SYN-PAYFORM-UI",
      }),
      deferralSource({
        id: "SYN-V3-UI-DEFERRAL",
        agreement: "SYN-PLAN-UI",
        debtKey: "A9999900010008008",
        schedule: [
          {
            sequence: 1,
            dueDate: "20-04-2026",
            base: "119,00",
            interest: "1,00",
            total: "120,00",
          },
        ],
      }),
      bankSeizureSource({
        id: "SYN-V3-UI-SEIZURE",
        debtKey: "A9999900010008008",
        pending: "144,00",
        total: "144,00",
        limit: "144,00",
        seizedAmounts: ["144,00"],
      }),
      document(
        "SYN-V3-UI-REMINDER",
        pages(6, {
          1: `${AEAT}\nDECLARACIONES INFORMATIVAS\nMODELO 115\nMODELO 180\n1 DE ENERO\nPRESENTACIÓN ELECTRÓNICA\nReferencia: SYN-REMINDER-UI\nModelo de origen: 115\nModelo esperado: 180\nEjercicio: 2024`,
          4: "VERSIÓ CATALANA DEL MATEIX ACTE",
        }),
        [6],
      ),
      document("SYN-V3-UI-REFUND", [
        `${AEAT}\nCOMUNICACIÓN DE PAGO DE DEVOLUCIÓN\nReferencia de la devolución: SYN-REFUND-UI\nReferencia del acuerdo de devolución: SYN-DECISION-UI\nDevolución solicitada: 100,00 EUR\nDevolución acordada: 100,00 EUR\nDevolución ordenada: 100,00 EUR\nDeducción organismo público: 20,00 EUR\nTotal deducciones: 20,00 EUR\nLíquido a transferir: 80,00 EUR\nFecha de emisión: 01-06-2023`,
      ]),
      document("SYN-V3-UI-REGULATORY", [
        `${AEAT}\nDESAPARECE LA MODALIDAD DE PRESENTACIÓN mediante PREDECLARACIÓN del MODELO 303 para el EJERCICIO 2023 Y SIGUIENTES\nReferencia: SYN-CHANGE-UI\nModelo afectado: 303\nFecha de emisión: 08-03-2023`,
      ]),
      document(
        "SYN-V3-UI-RELEASE",
        pages(4, {
          1: `${AEAT}\nLEVANTAMIENTO DE EMBARGO DE BIENES MUEBLES\nNúmero de diligencia: SYN-SEIZURE-UI\nFecha de la diligencia: 23-07-2022\nFecha del levantamiento: 20-10-2022\nCancelación registral`,
          3: "ANEXO DEL VEHÍCULO ANTERIORMENTE EMBARGADO",
        }),
        [4],
      ),
      document("SYN-V3-UI-CERTIFICATE", [
        `${AEAT}\nDENEGACIÓN DE CERTIFICADO\nReferencia: SYN-CERT-UI\nFecha de emisión: 16-12-2021\nConstan DEUDAS O SANCIONES en EJECUTIVA no suspendidas ni aplazadas`,
      ]),
    ];
    const families = new Set<string>();
    for (const source of sources) {
      const outcome = await extractAeatRealCorpusDocumentV3(source);
      let review;
      try {
        review = projectRealCorpusReviewV3(outcome);
      } catch (error) {
        throw new Error(`V3_UI_PROJECTION_FAILED:${String(outcome.familyId)}`, {
          cause: error,
        });
      }
      const persisted = parseFiscalNotificationVerticalSliceReviewV1(
        JSON.parse(JSON.stringify(review)),
      );
      expect(persisted.documents).toHaveLength(1);
      expect(persisted.documents[0]?.fields.length).toBeGreaterThan(0);
      expect(
        persisted.documents[0]?.fields.every(
          (field) => field.sourcePageNumbers.length > 0,
        ),
      ).toBe(true);
      expect(JSON.stringify(persisted.documents[0]?.fields)).not.toMatch(
        /recognized-family|V3:EXPLANATION|V3:EXACT|payment-form-status/u,
      );
      expect(persisted.permitsDebtCreation).toBe(false);
      expect(persisted.permitsPaymentAction).toBe(false);
      families.add(String(persisted.documents[0]?.familyId));
    }
    expect(families).toEqual(
      new Set([
        "collection.enforcement_order",
        "collection.deferral_grant",
        "seizure.bank_account",
        "information.model_filing_reminder",
        "refund.payment_communication",
        "information.regulatory_change",
        "seizure.release",
        "certificate.tax_compliance",
      ]),
    );
  });

  it("does not retain PII, raw OCR or arbitrary non-AEAT text", async () => {
    const source = document("SYN-V3-PII", [
      `${AEAT}\nDENEGACIÓN DE CERTIFICADO\nReferencia del certificado: SYN-CERT-PII\nFecha de emisión: 16-12-2021\nConstan DEUDAS O SANCIONES en EJECUTIVA\nNombre Persona Privada\n12345678Z\nCalle Privada 99\ntelefono 612345678`,
    ]);
    const result = await extractAeatRealCorpusDocumentV3(source);
    const serialized = JSON.stringify(result);
    for (const forbidden of [
      "Nombre Persona Privada",
      "12345678Z",
      "Calle Privada 99",
      "612345678",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
    expect(result.retainedSourceContent).toBe("NONE");

    const unknown = await extractAeatRealCorpusDocumentV3(
      document("SYN-V3-UNKNOWN", ["PROVIDENCIA DE APREMIO\nTexto no oficial"]),
    );
    expect(unknown.status).toBe("UNKNOWN");
  });
});
