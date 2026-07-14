import { describe, expect, it } from "vitest";
import {
  AEAT_DEFERRAL_GRANT_FACTS_ENGINE_ID_V1,
  AEAT_DEFERRAL_GRANT_FACTS_ENGINE_VERSION_V1,
  AEAT_DEFERRAL_GRANT_FACTS_LIMITS_V1,
  AEAT_DEFERRAL_GRANT_FACTS_SCHEMA_VERSION_V1,
  extractAeatDeferralGrantFactsV1,
} from "./aeat-deferral-grant-facts.v1";

const PRIMARY_PAGE = [
  "Agencia Tributaria",
  "sede.agenciatributaria.gob.es",
  "CONCESIÓN DEL APLAZAMIENTO O FRACCIONAMIENTO DE PAGO SIN GARANTÍA",
  "IDENTIFICACIÓN DEL DOCUMENTO",
  "N.I.F.: X0000000X",
  "Nombre: PERSONA SINTÉTICA DE PRUEBA",
  "Número de expediente: EXP-SYN-001",
  "ACUERDO",
  "Se concede el aplazamiento por el importe de 1.050,00 euros.",
  "PLAZO Y FORMAS DE PAGO",
  "El ingreso se realizará en la cuenta ES00 0000 0000 0000 0000 0000.",
].join("\n");

const ANNEX_PAGE = [
  "ANEXO I: DEUDAS Y PLAZOS DE LA NOTIFICACIÓN",
  "Clave Liquidación: L-SYN-001",
  "Concepto: IRPF SINTÉTICO",
  "Fecha de Interés: 01-01-2026",
  "Importe principal Recargo de apremio Importe total deuda Importe de los intereses Importe total del plazo Fecha de vencimiento",
  "1.000,00 0,00 1.000,00 50,00 1.050,00 20-02-2026",
  "ANEXO II: LIQUIDACIÓN DE INTERESES DE DEMORA",
  "CÁLCULO DE INTERESES",
].join("\n");

function documentWith(
  ...pageTexts: string[]
): Readonly<{
  ownerScope: string;
  documentId: string;
  pages: readonly Readonly<{
    pageNumber: number;
    text: string;
    isBlank: boolean;
  }>[];
}> {
  return Object.freeze({
    ownerScope: "user:synthetic-deferral-owner",
    documentId: "document-synthetic-deferral-grant",
    pages: Object.freeze(
      pageTexts.map((text, index) =>
        Object.freeze({
          pageNumber: index + 1,
          text,
          isBlank: text.trim().length === 0,
        }),
      ),
    ),
  });
}

function completeDocument(
  primaryPage = PRIMARY_PAGE,
  annexPage = ANNEX_PAGE,
) {
  return documentWith(primaryPage, annexPage);
}

describe("AEAT deferral grant explicit facts v1", () => {
  it("extracts the printed subject, expediente, payment account and installments", () => {
    const result = extractAeatDeferralGrantFactsV1(completeDocument());

    expect(result).toEqual({
      schemaVersion: AEAT_DEFERRAL_GRANT_FACTS_SCHEMA_VERSION_V1,
      engineId: AEAT_DEFERRAL_GRANT_FACTS_ENGINE_ID_V1,
      engineVersion: AEAT_DEFERRAL_GRANT_FACTS_ENGINE_VERSION_V1,
      documentType: "AEAT_INSTALLMENT_OR_DEFERRAL_GRANT",
      status: "REVIEW_REQUIRED",
      outcome: "FACTS_AVAILABLE",
      header: {
        subjectName: expect.objectContaining({
          printedValue: "PERSONA SINTÉTICA DE PRUEBA",
          pageNumbers: [1],
        }),
        subjectTaxId: expect.objectContaining({
          printedValue: "X0000000X",
          pageNumbers: [1],
        }),
        expediente: expect.objectContaining({
          printedValue: "EXP-SYN-001",
          pageNumbers: [1],
        }),
        grantedTotal: expect.objectContaining({
          printedValue: "1.050,00",
          amountCents: 105_000,
          currency: "EUR",
          pageNumbers: [1],
        }),
        paymentAccount: expect.objectContaining({
          printedValue: "ES00 0000 0000 0000 0000 0000",
          pageNumbers: [1],
        }),
      },
      debtSchedules: [
        {
          liquidationKey: expect.objectContaining({
            printedValue: "L-SYN-001",
          }),
          concept: expect.objectContaining({
            printedValue: "IRPF SINTÉTICO",
          }),
          interestStartDate: expect.objectContaining({
            printedValue: "01-01-2026",
            calendarDate: "2026-01-01",
            dateMeaning: "PRINTED_LABEL_ONLY",
            legalEffect: "NOT_DETERMINED",
          }),
          listedDebtAmount: null,
          installments: [
            {
              layout: "COMPONENT_BREAKDOWN",
              principal: expect.objectContaining({ amountCents: 100_000 }),
              enforcementSurcharge: expect.objectContaining({ amountCents: 0 }),
              debtTotal: expect.objectContaining({ amountCents: 100_000 }),
              interest: expect.objectContaining({ amountCents: 5_000 }),
              installmentTotal: expect.objectContaining({
                amountCents: 105_000,
              }),
              dueDate: expect.objectContaining({
                printedValue: "20-02-2026",
                calendarDate: "2026-02-20",
                dateMeaning: "PRINTED_LABEL_ONLY",
                legalEffect: "NOT_DETERMINED",
              }),
              printedArithmetic: "CONSISTENT",
              reviewStatus: "REVIEW_REQUIRED",
            },
          ],
          reviewStatus: "REVIEW_REQUIRED",
        },
      ],
      issues: [],
      semanticPolicy: "EXPLICIT_PRINTED_FACTS_ONLY",
      installmentPolicy: "PRINTED_VALUES_NOT_RECALCULATED",
      dateMeaningPolicy: "PRINTED_DUE_DATE_NO_LEGAL_EFFECT",
      legalRuleStatus: "NOT_APPLIED",
      paymentActionPolicy: "NOT_CREATED",
      accountingActionPolicy: "NOT_CREATED",
      persistencePolicy: "DO_NOT_PERSIST",
      networkPolicy: "NO_NETWORK",
      retainedSourceContent: "NONE",
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    });
  });

  it("preserves every printed amount when the document arithmetic disagrees", () => {
    const result = extractAeatDeferralGrantFactsV1(
      completeDocument(
        PRIMARY_PAGE,
        ANNEX_PAGE.replace(
          "1.000,00 0,00 1.000,00 50,00 1.050,00",
          "1.000,00 0,00 999,99 50,00 1.100,00",
        ),
      ),
    );

    expect(result).toMatchObject({
      status: "REVIEW_REQUIRED",
      outcome: "AMBIGUOUS",
      debtSchedules: [
        {
          installments: [
            {
              principal: { amountCents: 100_000 },
              debtTotal: { amountCents: 99_999 },
              installmentTotal: { amountCents: 110_000 },
              printedArithmetic: "PRINTED_TOTAL_MISMATCH",
            },
          ],
        },
      ],
      issues: [
        {
          code: "INSTALLMENT_PRINTED_TOTAL_MISMATCH",
          pageNumbers: [2],
          scheduleIndex: 0,
          installmentIndex: 0,
        },
      ],
    });
  });

  it("extracts multiple schedules and page-spanning installment rows deterministically", () => {
    const firstAnnexPage = ANNEX_PAGE.replace(
      "ANEXO II: LIQUIDACIÓN DE INTERESES DE DEMORA\nCÁLCULO DE INTERESES",
      "2.000,00 100,00 2.100,00 25,00 2.125,00 20-03-2026",
    );
    const secondAnnexPage = [
      "Clave Liquidación: L-SYN-002",
      "Concepto: IVA SINTÉTICO",
      "Fecha de Interés: 02/01/2026",
      "300,00 30,00 330,00 5,00 335,00 20/04/2026",
      "ANEXO II: LIQUIDACIÓN DE INTERESES DE DEMORA",
      "CÁLCULO DE INTERESES",
    ].join("\n");

    const result = extractAeatDeferralGrantFactsV1(
      documentWith(PRIMARY_PAGE, firstAnnexPage, secondAnnexPage),
    );

    expect(result.outcome).toBe("FACTS_AVAILABLE");
    expect(result.debtSchedules).toHaveLength(2);
    expect(result.debtSchedules[0]?.installments).toHaveLength(2);
    expect(result.debtSchedules[1]).toMatchObject({
      liquidationKey: { printedValue: "L-SYN-002" },
      interestStartDate: { calendarDate: "2026-01-02" },
      installments: [
        {
          dueDate: { calendarDate: "2026-04-20" },
          installmentTotal: { amountCents: 33_500 },
        },
      ],
    });
  });

  it("supports the AEAT table that prints debt amount and scheduled amount only", () => {
    const compactAnnex = [
      "ANEXO I: DEUDAS Y PLAZOS DE LA NOTIFICACIÓN",
      "Número Fecha de Importe Fecha de",
      "Concepto Importe",
      "Liquidación Intereses del plazo Vencimiento",
      "L-SYN-001 IVA SINTÉTICO 01-01-2026 1.000,00 250,00 20-02-2026",
      "250,00 20-03-2026",
      "250,00 20-04-2026",
      "ANEXO II: LIQUIDACIÓN DE INTERESES DE DEMORA",
      "CÁLCULO DE INTERESES",
    ].join("\n");

    const result = extractAeatDeferralGrantFactsV1(
      completeDocument(PRIMARY_PAGE, compactAnnex),
    );

    expect(result).toMatchObject({
      outcome: "FACTS_AVAILABLE",
      issues: [],
      debtSchedules: [
        {
          liquidationKey: { printedValue: "L-SYN-001" },
          concept: { printedValue: "IVA SINTÉTICO" },
          interestStartDate: { calendarDate: "2026-01-01" },
          listedDebtAmount: { amountCents: 100_000 },
          installments: [
            {
              layout: "SCHEDULED_AMOUNT_ONLY",
              installmentTotal: { amountCents: 25_000 },
              dueDate: { calendarDate: "2026-02-20" },
              printedArithmetic: "NOT_APPLICABLE_COMPONENTS_NOT_PRINTED",
            },
            {
              layout: "SCHEDULED_AMOUNT_ONLY",
              installmentTotal: { amountCents: 25_000 },
              dueDate: { calendarDate: "2026-03-20" },
            },
            {
              layout: "SCHEDULED_AMOUNT_ONLY",
              installmentTotal: { amountCents: 25_000 },
              dueDate: { calendarDate: "2026-04-20" },
            },
          ],
        },
      ],
    });
    expect(result.debtSchedules[0]?.installments[0]).not.toHaveProperty(
      "principal",
    );
    expect(result.debtSchedules[0]?.installments[0]).not.toHaveProperty(
      "interest",
    );
  });

  it("keeps the family recognized but information pending when Annex I has no rows", () => {
    const result = extractAeatDeferralGrantFactsV1(
      completeDocument(
        PRIMARY_PAGE,
        ANNEX_PAGE.replace(
          "1.000,00 0,00 1.000,00 50,00 1.050,00 20-02-2026\n",
          "",
        ),
      ),
    );

    expect(result).toMatchObject({
      documentType: "AEAT_INSTALLMENT_OR_DEFERRAL_GRANT",
      status: "REVIEW_REQUIRED",
      outcome: "INFORMATION_PENDING",
      debtSchedules: [],
      issues: [
        {
          code: "NO_INSTALLMENT_ROWS",
          pageNumbers: [],
        },
      ],
    });
    expect(result.header.expediente?.printedValue).toBe("EXP-SYN-001");
  });

  it("rejects a row with an impossible printed date without inventing a corrected date", () => {
    const result = extractAeatDeferralGrantFactsV1(
      completeDocument(
        PRIMARY_PAGE,
        ANNEX_PAGE.replace("20-02-2026", "31-02-2026"),
      ),
    );

    expect(result).toMatchObject({
      outcome: "AMBIGUOUS",
      debtSchedules: [],
      issues: [
        {
          code: "INVALID_PRINTED_DATE",
          pageNumbers: [2],
          scheduleIndex: 0,
          installmentIndex: 0,
        },
        { code: "NO_INSTALLMENT_ROWS" },
      ],
    });
    expect(JSON.stringify(result)).not.toContain("2026-03-03");
  });

  it("fails closed when an installment appears without its liquidation key", () => {
    const result = extractAeatDeferralGrantFactsV1(
      completeDocument(
        PRIMARY_PAGE,
        ANNEX_PAGE.replace("Clave Liquidación: L-SYN-001\n", ""),
      ),
    );

    expect(result).toMatchObject({
      outcome: "AMBIGUOUS",
      debtSchedules: [],
      issues: expect.arrayContaining([
        expect.objectContaining({
          code: "SCHEDULE_WITHOUT_LIQUIDATION_KEY",
          pageNumbers: [2],
        }),
        expect.objectContaining({ code: "NO_INSTALLMENT_ROWS" }),
      ]),
    });
  });

  it("does not choose between distinct printed expedientes or payment accounts", () => {
    const conflictingAnnex = ANNEX_PAGE.replace(
      "ANEXO I: DEUDAS Y PLAZOS DE LA NOTIFICACIÓN",
      [
        "Número de expediente: EXP-SYN-999",
        "PLAZO Y FORMAS DE PAGO",
        "Cuenta ES00 1111 1111 1111 1111 1111",
        "ANEXO I: DEUDAS Y PLAZOS DE LA NOTIFICACIÓN",
      ].join("\n"),
    );
    const result = extractAeatDeferralGrantFactsV1(
      completeDocument(PRIMARY_PAGE, conflictingAnnex),
    );

    expect(result.outcome).toBe("AMBIGUOUS");
    expect(result.header.expediente).toBeNull();
    expect(result.header.paymentAccount).toBeNull();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "MULTIPLE_DISTINCT_EXPEDIENT_VALUES",
          pageNumbers: [1, 2],
        }),
        expect.objectContaining({
          code: "MULTIPLE_DISTINCT_PAYMENT_ACCOUNTS",
          pageNumbers: [1, 2],
        }),
      ]),
    );
  });

  it("does not expose facts for a different or incomplete family", () => {
    const result = extractAeatDeferralGrantFactsV1(
      documentWith(
        "Agencia Tributaria\nsede.agenciatributaria.gob.es\nPROVIDENCIA DE APREMIO\nIDENTIFICACIÓN DEL DOCUMENTO\nIMPORTE DE LA DEUDA",
      ),
    );

    expect(result).toMatchObject({
      documentType: null,
      status: "INFORMATION_PENDING",
      outcome: "INFORMATION_PENDING",
      header: {
        subjectName: null,
        subjectTaxId: null,
        expediente: null,
        grantedTotal: null,
        paymentAccount: null,
      },
      debtSchedules: [],
      issues: [{ code: "FAMILY_GATE_NOT_SATISFIED" }],
    });
  });

  it("cuts off oversized line collections before scanning facts", () => {
    const oversizedAnnex = [
      "ANEXO I: DEUDAS Y PLAZOS DE LA NOTIFICACIÓN",
      ...Array.from(
        {
          length:
            AEAT_DEFERRAL_GRANT_FACTS_LIMITS_V1.maxLinesPerPage + 1,
        },
        () => "x",
      ),
      "ANEXO II: LIQUIDACIÓN DE INTERESES DE DEMORA",
      "CÁLCULO DE INTERESES",
    ].join("\n");
    const result = extractAeatDeferralGrantFactsV1(
      completeDocument(PRIMARY_PAGE, oversizedAnnex),
    );

    expect(result).toMatchObject({
      status: "REVIEW_REQUIRED",
      outcome: "PROCESSING_BLOCKED",
      header: {
        subjectName: null,
        subjectTaxId: null,
        expediente: null,
        grantedTotal: null,
        paymentAccount: null,
      },
      debtSchedules: [],
      issues: [
        {
          code: "RESOURCE_LIMIT_EXCEEDED",
          pageNumbers: [2],
        },
      ],
    });
  });

  it("honors cancellation without returning partial facts", () => {
    const controller = new AbortController();
    controller.abort();
    const base = completeDocument();
    const aborted = Object.freeze({ ...base, signal: controller.signal });

    expect(() => extractAeatDeferralGrantFactsV1(aborted)).toThrowError(
      expect.objectContaining({
        code: "ABORTED",
        path: "signal",
      }),
    );
  });

  it("does not mutate input and returns deeply defensive facts", () => {
    const input = completeDocument();
    const before = JSON.stringify(input);
    const first = extractAeatDeferralGrantFactsV1(input);
    const second = extractAeatDeferralGrantFactsV1(input);

    expect(JSON.stringify(input)).toBe(before);
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.header)).toBe(true);
    expect(Object.isFrozen(first.debtSchedules)).toBe(true);
    expect(Object.isFrozen(first.debtSchedules[0])).toBe(true);
    expect(Object.isFrozen(first.debtSchedules[0]?.installments)).toBe(true);
    expect(Object.isFrozen(first.debtSchedules[0]?.installments[0])).toBe(true);
    expect(() => {
      (first.debtSchedules as unknown as object[]).push({});
    }).toThrow();
    expect(second.debtSchedules).toHaveLength(1);
  });

  it("never returns PDF text, owner scope or document identifiers", () => {
    const privateMarker = "PRIVATE_PDF_TEXT_SENTINEL";
    const result = extractAeatDeferralGrantFactsV1(
      completeDocument(`${PRIMARY_PAGE}\n${privateMarker}`, ANNEX_PAGE),
    );
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain(privateMarker);
    expect(serialized).not.toContain("user:synthetic-deferral-owner");
    expect(serialized).not.toContain("document-synthetic-deferral-grant");
    expect(serialized).not.toContain("PRIVATE_PDF_TEXT");
  });
});
