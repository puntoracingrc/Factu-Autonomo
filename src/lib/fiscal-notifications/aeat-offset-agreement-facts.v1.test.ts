import { describe, expect, it } from "vitest";
import {
  AEAT_OFFSET_AGREEMENT_FACTS_LIMITS_V1,
  extractAeatOffsetAgreementFactsV1,
} from "./aeat-offset-agreement-facts.v1";
import { FiscalNotificationInputError } from "./input-contract";

function frozenInput(pages: readonly string[], signal?: AbortSignal) {
  return Object.freeze({
    ownerScope: "user:synthetic-offset-owner",
    documentId: "document-synthetic-offset-agreement",
    pages: Object.freeze(
      pages.map((text, index) =>
        Object.freeze({
          pageNumber: index + 1,
          text,
          isBlank: text.length === 0,
        }),
      ),
    ),
    ...(signal ? { signal } : {}),
  });
}

const REQUESTED_PAGE = `
AGENCIA TRIBUTARIA
www.agenciatributaria.es
ACUERDO DE COMPENSACIÓN A INSTANCIA DEL OBLIGADO AL PAGO
ANEXO I
ACUERDO DE COMPENSACIÓN A INSTANCIA DEL OBLIGADO AL PAGO
CRÉDITO Y DEUDAS
IDENTIFICACIÓN DEL DOCUMENTO
NOMBRE Y APELLIDOS / RAZÓN SOCIAL: PERSONA SINTÉTICA
N.I.F.: X0000000T
NÚMERO DE ACUERDO DE COMPENSACIÓN: ACUERDO-0001
FECHA DE PRESENTACIÓN DE LA SOLICITUD DE COMPENSACIÓN: 05/01/2026
CRÉDITO:
FECHA RECONOCIM. IMPORTE IMPORTE INTERESES TOTAL IMPORTE
REFERENCIA DESCRIPCIÓN DEL CRÉDITO CRÉDITO DE DEMORA CRÉDITO COMPENSADO
CREDITO-0001 DEVOLUCIÓN SINTÉTICA 10/01/2026 1.000,00 20,00 1.020,00 900,00
DEUDA:
FECHA EFECTOS PRINCIPAL RECARGOS INTERESES INGRESOS TOTAL PENDIENTE IMPORTE IMPORTE PENDIENTE
COMPENSACIÓN PENDIENTE PERIODO EJECUTIVO DE DEMORA A CUENTA ANTES DE COMPENSAR COMPENSADO DESPUÉS DE COMPENSAR EFECTOS
VENCIMIENTO: DEUDA-0001 MODELO SINTÉTICO EJERCICIO 2025
10/01/2026 800,00 80,00 20,00 0,00 900,00 900,00 0,00 ( 1)
ANEXO II
ACUERDO DE COMPENSACIÓN A INSTANCIA DEL OBLIGADO AL PAGO
DETALLE DE EFECTOS
(1) EFECTOS DE LA COMPENSACIÓN
EL IMPORTE DE LA DEUDA QUE FIGURA EN LA COLUMNA TOTAL PENDIENTE ANTES DE COMPENSAR HA QUEDADO EXTINGUIDO EN PERIODO VOLUNTARIO DE INGRESO.
`;

const EX_OFFICIO_PAGE = `
AGENCIA ESTATAL DE ADMINISTRACIÓN TRIBUTARIA
www.agenciatributaria.gob.es
ACUERDO DE COMPENSACIÓN DE OFICIO
ANEXO I
CRÉDITO Y DEUDAS COMPENSADAS DE OFICIO
IDENTIFICACIÓN DEL DOCUMENTO
NOMBRE Y APELLIDOS / RAZÓN SOCIAL: SOCIEDAD SINTÉTICA
N.I.F.: B00000000
NÚMERO DE ACUERDO DE COMPENSACIÓN: OFICIO-0001
CRÉDITO:
REFERENCIA DESCRIPCIÓN DEL CRÉDITO FECHA RECONOCIM. IMPORTE CRÉDITO IMPORTE INTERESES TOTAL CRÉDITO IMPORTE COMPENSADO
CREDITO-0002 DEVOLUCIÓN SINTÉTICA 12-02-2026 2.000,00 0,00 2.000,00 1.500,00
DEUDA:
FECHA EFECTOS PRINCIPAL RECARGOS INGRESOS TOTAL PENDIENTE IMPORTE PENDIENTE
COMPENSACIÓN PENDIENTE PERIODO EJECUTIVO A CUENTA ANTES DE COMPENSAR IMPORTE COMPENSADO DESPUÉS DE COMPENSAR EFECTOS
VENCIMIENTO: DEUDA-0002 DEUDA SINTÉTICA TOTAL
12-02-2026 700,00 70,00 0,00 770,00 770,00 0,00 ( 4)
VENCIMIENTO: DEUDA-0003 DEUDA SINTÉTICA PARCIAL
12-02-2026 900,00 90,00 0,00 990,00 730,00 260,00 ( 3)
ANEXO II
ACUERDO DE COMPENSACIÓN DE OFICIO
DETALLE DE EFECTOS
(3) EFECTOS DE LA COMPENSACIÓN
LA DEUDA PENDIENTE DE PAGO EN PERIODO EJECUTIVO HA QUEDADO PARCIALMENTE EXTINGUIDA CON EFECTOS DESDE EL RECONOCIMIENTO DEL CRÉDITO.
(4) EFECTOS DE LA COMPENSACIÓN
LA DEUDA PENDIENTE DE PAGO EN PERIODO EJECUTIVO HA QUEDADO TOTALMENTE EXTINGUIDA CON EFECTOS DESDE EL RECONOCIMIENTO DEL CRÉDITO.
`;

describe("AEAT offset agreement explicit facts v1", () => {
  it("extracts requested offset credit, debt, residual and printed effect", () => {
    const result = extractAeatOffsetAgreementFactsV1(
      frozenInput([REQUESTED_PAGE]),
    );

    expect(result).toMatchObject({
      documentType: "AEAT_OFFSET_AGREEMENT",
      agreementMode: "REQUESTED",
      status: "REVIEW_REQUIRED",
      outcome: "FACTS_AVAILABLE",
      semanticPolicy: "EXPLICIT_PRINTED_FACTS_ONLY",
      effectPolicy: "PRINTED_EFFECT_TEXT_ONLY",
      relationPolicy: "NOT_CREATED",
      debtMutationPolicy: "NOT_PERFORMED",
      paymentActionPolicy: "NOT_CREATED",
      accountingActionPolicy: "NOT_CREATED",
      persistencePolicy: "DO_NOT_PERSIST",
      networkPolicy: "NO_NETWORK",
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    });
    expect(result.header.subjectName?.printedValue).toBe("PERSONA SINTÉTICA");
    expect(result.header.subjectTaxId?.printedValue).toBe("X0000000T");
    expect(result.header.agreementNumber?.printedValue).toBe("ACUERDO-0001");
    expect(result.header.requestDate?.calendarDate).toBe("2026-01-05");
    expect(result.credits).toHaveLength(1);
    expect(result.credits[0]).toMatchObject({
      reference: { printedValue: "CREDITO-0001" },
      recognitionDate: { calendarDate: "2026-01-10" },
      creditAmount: { amountCents: 100_000 },
      delayInterest: { amountCents: 2_000 },
      totalCredit: { amountCents: 102_000 },
      compensatedAmount: { amountCents: 90_000 },
    });
    expect(result.debts).toHaveLength(1);
    expect(result.debts[0]).toMatchObject({
      liquidationKey: { printedValue: "DEUDA-0001" },
      effectDate: { calendarDate: "2026-01-10" },
      principalPending: { amountCents: 80_000 },
      enforcementSurcharge: { amountCents: 8_000 },
      delayInterest: { amountCents: 2_000 },
      paymentsOnAccount: { amountCents: 0 },
      totalBeforeOffset: { amountCents: 90_000 },
      compensatedAmount: { amountCents: 90_000 },
      remainingAfterOffset: { amountCents: 0 },
      effectCode: { printedValue: "1" },
      effectMeaning: "TOTAL_EXTINGUISHED_IN_VOLUNTARY_PERIOD",
      effectStatementPageNumbers: [1],
    });
    expect(result.issues).toEqual([]);
  });

  it("keeps ex-officio total and partial printed effects distinct", () => {
    const result = extractAeatOffsetAgreementFactsV1(
      frozenInput([EX_OFFICIO_PAGE]),
    );

    expect(result.agreementMode).toBe("EX_OFFICIO");
    expect(result.header.requestDate).toBeNull();
    expect(result.debts).toHaveLength(2);
    expect(result.debts[0]).toMatchObject({
      delayInterest: null,
      remainingAfterOffset: { amountCents: 0 },
      effectCode: { printedValue: "4" },
      effectMeaning: "TOTAL_EXTINGUISHED_IN_ENFORCEMENT",
    });
    expect(result.debts[1]).toMatchObject({
      remainingAfterOffset: { amountCents: 26_000 },
      effectCode: { printedValue: "3" },
      effectMeaning: "PARTIALLY_EXTINGUISHED_IN_ENFORCEMENT",
    });
    expect(result.issues).toEqual([]);
  });

  it("does not confuse a request or generic procedure mention with an agreement", () => {
    const result = extractAeatOffsetAgreementFactsV1(
      frozenInput([
        `AGENCIA TRIBUTARIA\nwww.agenciatributaria.gob.es\nSOLICITUD DE COMPENSACIÓN\nLa presentación de una solicitud de compensación no implica su concesión.`,
      ]),
    );

    expect(result).toMatchObject({
      documentType: null,
      agreementMode: null,
      status: "INFORMATION_PENDING",
      outcome: "INFORMATION_PENDING",
      credits: [],
      debts: [],
      issues: [{ code: "FAMILY_GATE_NOT_SATISFIED" }],
    });
  });

  it("fails closed when requested and ex-officio titles coexist", () => {
    const result = extractAeatOffsetAgreementFactsV1(
      frozenInput([`${REQUESTED_PAGE}\n${EX_OFFICIO_PAGE}`]),
    );

    expect(result).toMatchObject({
      documentType: null,
      agreementMode: null,
      outcome: "AMBIGUOUS",
      issues: [{ code: "MULTIPLE_AGREEMENT_MODES" }],
    });
  });

  it("preserves an unmapped printed effect code instead of inventing its meaning", () => {
    const result = extractAeatOffsetAgreementFactsV1(
      frozenInput([REQUESTED_PAGE.replace("( 1)", "( 9)")]),
    );

    expect(result.outcome).toBe("AMBIGUOUS");
    expect(result.debts[0]).toMatchObject({
      effectCode: { printedValue: "9" },
      effectMeaning: "PRINTED_CODE_UNMAPPED",
      effectStatementPageNumbers: [],
    });
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "EFFECT_CODE_WITHOUT_EXPLICIT_STATEMENT",
        debtIndex: 0,
      }),
    );
  });

  it("rejects malformed money rows without turning them into zero", () => {
    const result = extractAeatOffsetAgreementFactsV1(
      frozenInput([
        REQUESTED_PAGE.replace(
          "10/01/2026 800,00 80,00 20,00 0,00 900,00 900,00 0,00 ( 1)",
          "10/01/2026 SIN_IMPORTE 80,00 20,00 0,00 900,00 900,00 0,00 ( 1)",
        ),
      ]),
    );

    expect(result.debts).toEqual([]);
    expect(result.outcome).toBe("AMBIGUOUS");
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "INVALID_DEBT_ROW" }),
    );
  });

  it("blocks bounded resource excess before expensive parsing", () => {
    const oversizedPage = Array.from(
      { length: AEAT_OFFSET_AGREEMENT_FACTS_LIMITS_V1.maxLinesPerPage + 1 },
      () => "línea",
    ).join("\n");
    const result = extractAeatOffsetAgreementFactsV1(
      frozenInput([oversizedPage]),
    );

    expect(result).toMatchObject({
      documentType: null,
      outcome: "PROCESSING_BLOCKED",
      issues: [{ code: "RESOURCE_LIMIT_EXCEEDED", pageNumbers: [1] }],
    });
  });

  it("honours cancellation", () => {
    const controller = new AbortController();
    controller.abort();

    expect(() =>
      extractAeatOffsetAgreementFactsV1(
        frozenInput([REQUESTED_PAGE], controller.signal),
      ),
    ).toThrowError(FiscalNotificationInputError);
  });

  it("does not mutate input and returns defensive immutable results", () => {
    const input = frozenInput([REQUESTED_PAGE]);
    const before = JSON.stringify(input);
    const first = extractAeatOffsetAgreementFactsV1(input);
    const second = extractAeatOffsetAgreementFactsV1(input);

    expect(JSON.stringify(input)).toBe(before);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.credits)).toBe(true);
    expect(Object.isFrozen(first.credits[0])).toBe(true);
    expect(Object.isFrozen(first.debts[0]?.effectStatementPageNumbers)).toBe(
      true,
    );
    expect(first).toEqual(second);
    expect(JSON.stringify(first)).not.toContain("user:synthetic-offset-owner");
    expect(JSON.stringify(first)).not.toContain(
      "document-synthetic-offset-agreement",
    );
  });

  it("rejects mutable input rather than snapshotting mutable caller data", () => {
    expect(() =>
      extractAeatOffsetAgreementFactsV1({
        ownerScope: "user:synthetic-offset-owner",
        documentId: "document-synthetic-offset-agreement",
        pages: [{ pageNumber: 1, text: REQUESTED_PAGE, isBlank: false }],
      }),
    ).toThrowError(FiscalNotificationInputError);
  });
});
