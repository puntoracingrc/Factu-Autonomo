import { describe, expect, it } from "vitest";
import { extractAeatDeferralGrantFactsV1 } from "./aeat-deferral-grant-facts.v1";
import {
  AeatDeferralGrantFactsContractErrorV1,
  parseAeatDeferralGrantFactsContractV1,
} from "./aeat-deferral-grant-facts.v1-contract";

const PRIMARY_PAGE = [
  "Agencia Tributaria",
  "sede.agenciatributaria.gob.es",
  "CONCESIÓN DEL APLAZAMIENTO O FRACCIONAMIENTO DE PAGO SIN GARANTÍA",
  "IDENTIFICACIÓN DEL DOCUMENTO",
  "N.I.F.: X0000000X",
  "Nombre: PERSONA SINTÉTICA",
  "Número de expediente: EXP-SYN-001",
  "ACUERDO",
  "Se concede por el importe de 1.050,00 euros.",
  "PLAZO Y FORMAS DE PAGO",
  "Cuenta ES00 0000 0000 0000 0000 0000",
].join("\n");
const ANNEX_PAGE = [
  "ANEXO I: DEUDAS Y PLAZOS DE LA NOTIFICACIÓN",
  "Clave Liquidación: L-SYN-001",
  "Concepto: IRPF SINTÉTICO",
  "Fecha de Interés: 01-01-2026",
  "1.000,00 0,00 1.000,00 50,00 1.050,00 20-02-2026",
  "ANEXO II: LIQUIDACIÓN DE INTERESES DE DEMORA",
  "CÁLCULO DE INTERESES",
].join("\n");

function validResult() {
  return extractAeatDeferralGrantFactsV1(
    Object.freeze({
      ownerScope: "worker:ephemeral",
      documentId: "document:ephemeral",
      pages: Object.freeze([
        Object.freeze({
          pageNumber: 1,
          text: PRIMARY_PAGE,
          isBlank: false,
        }),
        Object.freeze({
          pageNumber: 2,
          text: ANNEX_PAGE,
          isBlank: false,
        }),
      ]),
    }),
  );
}

type MutableRecord = Record<string, unknown>;

function mutableResult(): MutableRecord {
  return JSON.parse(JSON.stringify(validResult())) as MutableRecord;
}

function headerOf(value: MutableRecord): MutableRecord {
  return value.header as MutableRecord;
}

function schedulesOf(value: MutableRecord): MutableRecord[] {
  return value.debtSchedules as MutableRecord[];
}

function firstScheduleOf(value: MutableRecord): MutableRecord {
  return schedulesOf(value)[0]!;
}

function installmentsOf(value: MutableRecord): MutableRecord[] {
  return firstScheduleOf(value).installments as MutableRecord[];
}

function firstInstallmentOf(value: MutableRecord): MutableRecord {
  return installmentsOf(value)[0]!;
}

describe("AEAT deferral grant Worker boundary contract v1", () => {
  it("copies and freezes the complete explicit-fact envelope", () => {
    const input = mutableResult();
    const parsed = parseAeatDeferralGrantFactsContractV1(input, 2);

    expect(parsed).toEqual(validResult());
    expect(parsed).not.toBe(input);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.header)).toBe(true);
    expect(Object.isFrozen(parsed.debtSchedules)).toBe(true);
    expect(Object.isFrozen(parsed.debtSchedules[0])).toBe(true);
    expect(Object.isFrozen(parsed.debtSchedules[0]?.installments)).toBe(true);
    expect(Object.isFrozen(parsed.debtSchedules[0]?.installments[0])).toBe(true);
  });

  it.each([
    (value: MutableRecord) => {
      value.privateText = "PRIVATE";
    },
    (value: MutableRecord) => {
      headerOf(value).privateNif = "PRIVATE";
    },
    (value: MutableRecord) => {
      firstScheduleOf(value).privateCsv = "PRIVATE";
    },
    (value: MutableRecord) => {
      firstInstallmentOf(value).privateIban = "PRIVATE";
    },
    (value: MutableRecord) => {
      (value.issues as unknown[]).push({
        code: "NO_INSTALLMENT_ROWS",
        pageNumbers: [],
        scheduleIndex: null,
        installmentIndex: null,
        privateText: "PRIVATE",
      });
    },
  ])("rejects unknown fields at every nested level", (mutate) => {
    const value = mutableResult();
    mutate(value);
    expect(() => parseAeatDeferralGrantFactsContractV1(value, 2)).toThrow(
      AeatDeferralGrantFactsContractErrorV1,
    );
  });

  it.each([
    (value: MutableRecord) => {
      (headerOf(value).grantedTotal as MutableRecord).amountCents = 1;
    },
    (value: MutableRecord) => {
      (firstInstallmentOf(value).dueDate as MutableRecord).calendarDate =
        "2026-03-03";
    },
    (value: MutableRecord) => {
      firstInstallmentOf(value).printedArithmetic =
        "PRINTED_TOTAL_MISMATCH";
    },
    (value: MutableRecord) => {
      (headerOf(value).expediente as MutableRecord).pageNumbers = [2, 1];
    },
    (value: MutableRecord) => {
      (headerOf(value).subjectName as MutableRecord).pageNumbers = [3];
    },
    (value: MutableRecord) => {
      value.paymentActionPolicy = "CREATED";
    },
    (value: MutableRecord) => {
      value.persistencePolicy = "PERSIST";
    },
    (value: MutableRecord) => {
      value.outcome = "FACTS_AVAILABLE";
      value.issues = [
        {
          code: "INVALID_INSTALLMENT_ROW",
          pageNumbers: [2],
          scheduleIndex: 0,
          installmentIndex: 0,
        },
      ];
    },
  ])("rejects forged values, provenance and policy", (mutate) => {
    const value = mutableResult();
    mutate(value);
    expect(() => parseAeatDeferralGrantFactsContractV1(value, 2)).toThrow(
      AeatDeferralGrantFactsContractErrorV1,
    );
  });

  it("rejects accessors, symbols, exotic objects and sparse arrays", () => {
    const accessor = mutableResult();
    Object.defineProperty(headerOf(accessor), "subjectName", {
      get: () => ({ private: true }),
    });

    const symbol = mutableResult();
    Object.defineProperty(firstScheduleOf(symbol), Symbol("private"), {
      value: "PRIVATE",
    });

    const exotic = Object.assign(Object.create({ inherited: true }),
      mutableResult(),
    );

    const sparse = mutableResult();
    installmentsOf(sparse).length = 2;

    for (const value of [accessor, symbol, exotic, sparse]) {
      expect(() => parseAeatDeferralGrantFactsContractV1(value, 2)).toThrow(
        AeatDeferralGrantFactsContractErrorV1,
      );
    }
  });

  it("accepts a fail-closed family-gate result but no fake empty success", () => {
    const empty = extractAeatDeferralGrantFactsV1(
      Object.freeze({
        ownerScope: "worker:ephemeral",
        documentId: "document:ephemeral",
        pages: Object.freeze([
          Object.freeze({ pageNumber: 1, text: "OTRO DOCUMENTO", isBlank: false }),
        ]),
      }),
    );
    expect(parseAeatDeferralGrantFactsContractV1(empty, 1)).toEqual(empty);

    const forged = JSON.parse(JSON.stringify(empty)) as MutableRecord;
    forged.documentType = "AEAT_INSTALLMENT_OR_DEFERRAL_GRANT";
    forged.outcome = "FACTS_AVAILABLE";
    forged.status = "REVIEW_REQUIRED";
    forged.issues = [];
    expect(() => parseAeatDeferralGrantFactsContractV1(forged, 1)).toThrow(
      AeatDeferralGrantFactsContractErrorV1,
    );
  });
});
