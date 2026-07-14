import { describe, expect, it } from "vitest";
import { extractAeatOffsetAgreementFactsV1 } from "./aeat-offset-agreement-facts.v1";
import {
  AeatOffsetAgreementFactsContractErrorV1,
  parseAeatOffsetAgreementFactsContractV1,
} from "./aeat-offset-agreement-facts.v1-contract";

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
CREDITO-0001 DEVOLUCIÓN SINTÉTICA 10/01/2026 1.000,00 20,00 1.020,00 900,00
DEUDA:
VENCIMIENTO: DEUDA-0001 MODELO SINTÉTICO EJERCICIO 2025
10/01/2026 800,00 80,00 20,00 0,00 900,00 900,00 0,00 ( 1)
ANEXO II
(1) EFECTOS DE LA COMPENSACIÓN
EL IMPORTE DE LA DEUDA QUE FIGURA EN LA COLUMNA TOTAL PENDIENTE ANTES DE COMPENSAR HA QUEDADO EXTINGUIDO EN PERIODO VOLUNTARIO DE INGRESO.
`;

function input(text = REQUESTED_PAGE) {
  return Object.freeze({
    ownerScope: "user:synthetic-offset-contract",
    documentId: "document:synthetic-offset-contract",
    pages: Object.freeze([
      Object.freeze({ pageNumber: 1, text, isBlank: text.length === 0 }),
    ]),
  });
}

function validResult() {
  return extractAeatOffsetAgreementFactsV1(input());
}

function mutable<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe("AEAT offset agreement facts Worker contract v1", () => {
  it("accepts exact printed facts and returns a defensive immutable copy", () => {
    const source = validResult();
    const before = structuredClone(source);

    const parsed = parseAeatOffsetAgreementFactsContractV1(source, 1);

    expect(parsed).toEqual(source);
    expect(source).toEqual(before);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.credits)).toBe(true);
    expect(Object.isFrozen(parsed.debts[0])).toBe(true);
    expect(Object.isFrozen(parsed.debts[0]?.effectStatementPageNumbers)).toBe(
      true,
    );
  });

  it.each([
    ["unknown root key", (value: Record<string, unknown>) => {
      value.customerEmail = "private@example.invalid";
    }],
    ["unknown nested key", (value: Record<string, unknown>) => {
      const header = value.header as Record<string, unknown>;
      header.rawText = "texto no permitido";
    }],
    ["forged amount", (value: Record<string, unknown>) => {
      const credits = value.credits as Array<Record<string, unknown>>;
      (credits[0]?.creditAmount as Record<string, unknown>).amountCents = 1;
    }],
    ["forged date", (value: Record<string, unknown>) => {
      const credits = value.credits as Array<Record<string, unknown>>;
      (credits[0]?.recognitionDate as Record<string, unknown>).calendarDate =
        "2026-01-11";
    }],
    ["forged effect meaning", (value: Record<string, unknown>) => {
      const debts = value.debts as Array<Record<string, unknown>>;
      debts[0]!.effectMeaning = "PARTIALLY_EXTINGUISHED_IN_ENFORCEMENT";
    }],
    ["foreign page", (value: Record<string, unknown>) => {
      const debts = value.debts as Array<Record<string, unknown>>;
      debts[0]!.effectStatementPageNumbers = [2];
    }],
    ["operational policy", (value: Record<string, unknown>) => {
      value.paymentActionPolicy = "CREATED";
    }],
  ])("rejects %s", (_label, poison) => {
    const value = mutable(validResult()) as unknown as Record<string, unknown>;
    poison(value);

    expect(() => parseAeatOffsetAgreementFactsContractV1(value, 1)).toThrow(
      AeatOffsetAgreementFactsContractErrorV1,
    );
  });

  it("accepts the deterministic empty family-gate result", () => {
    const empty = extractAeatOffsetAgreementFactsV1(
      input("AGENCIA TRIBUTARIA\nSOLICITUD DE COMPENSACIÓN"),
    );

    expect(parseAeatOffsetAgreementFactsContractV1(empty, 1)).toEqual(empty);
  });

  it("requires an issue for every unmapped printed effect", () => {
    const value = mutable(
      extractAeatOffsetAgreementFactsV1(
        input(REQUESTED_PAGE.replace("( 1)", "( 9)")),
      ),
    ) as unknown as Record<string, unknown>;
    value.issues = [];

    expect(() => parseAeatOffsetAgreementFactsContractV1(value, 1)).toThrow(
      AeatOffsetAgreementFactsContractErrorV1,
    );
  });

  it.each([0, 201, 1.5])("rejects invalid pageCount %s", (pageCount) => {
    expect(() =>
      parseAeatOffsetAgreementFactsContractV1(validResult(), pageCount),
    ).toThrow(AeatOffsetAgreementFactsContractErrorV1);
  });
});
