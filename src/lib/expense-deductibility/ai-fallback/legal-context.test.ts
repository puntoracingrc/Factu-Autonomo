import { describe, expect, it } from "vitest";
import {
  allowedSourceIdsForCategory,
  buildFiscalAiContext,
  containsSensitiveFiscalText,
  minimizeFiscalConcept,
  redactFiscalConcept,
  verifiedFiscalAiSources,
} from "./legal-context";
import {
  MEAL_OFFICIAL_SOURCES,
  OFFICIAL_SOURCES,
  VEHICLE_OFFICIAL_SOURCES,
} from "@/lib/tax-engine/sources";
import type { ExpenseInput, TaxContext } from "@/lib/tax-engine/types";

const INPUT: ExpenseInput = {
  concept: "Servicio profesional",
  supplierName: "Proveedor Privado SL",
  expenseDate: "2026-07-12",
  netAmountCents: 8_000,
  vatAmountCents: 1_680,
  totalAmountCents: 9_680,
  currency: "EUR",
  paymentMethod: "BANK_TRANSFER",
  invoiceType: "FULL_INVOICE",
  extractedText: "OCR COMPLETO QUE NO DEBE SALIR",
  answers: {
    "private.answer": "RESPUESTA PRIVADA QUE NO DEBE SALIR",
  },
  annualContext: {
    netTurnoverCents: 9_999_999,
  },
};

const CONTEXT: TaxContext = {
  jurisdiction: "ES_COMMON",
  taxpayerType: "SELF_EMPLOYED_IRPF",
  directTaxRegime: "DIRECT_ESTIMATION_NORMAL",
  vatRegime: "GENERAL",
  hasFullVatDeductionRight: true,
  activityDescription: "ACTIVIDAD PRIVADA QUE NO DEBE SALIR",
  activityCode: "PRIVATE-CODE",
  fiscalYear: 2026,
};

describe("redacción del contexto fiscal para IA", () => {
  it("redacta secretos, NIF, email, IBAN, teléfono, URL y dirección", () => {
    const unsafe = [
      "Servicio sk-proj-abcdefghijk",
      "persona@example.test",
      "12345678Z",
      "ES91 2100 0418 4502 0005 1332",
      "+34 612 345 678",
      "https://private.example.test/factura",
      "Calle Mayor 12",
    ].join(" · ");

    const redacted = redactFiscalConcept(unsafe);

    expect(redacted).toContain("[SECRETO OMITIDO]");
    expect(redacted).toContain("[EMAIL OMITIDO]");
    expect(redacted).toContain("[NIF OMITIDO]");
    expect(redacted).toContain("[IBAN OMITIDO]");
    expect(redacted).toContain("[TELÉFONO OMITIDO]");
    expect(redacted).toContain("[URL OMITIDA]");
    expect(redacted).toContain("[DIRECCIÓN OMITIDA]");
    expect(containsSensitiveFiscalText(redacted)).toBe(false);
    expect(redacted).not.toMatch(
      /abcdefghijk|persona@example|12345678Z|2100 0418|612 345|private\.example|Mayor 12/,
    );
  });

  it("limpia controles, acota longitud y nunca devuelve un concepto vacío", () => {
    expect(redactFiscalConcept("\u0000\n\t")).toBe("[CONCEPTO OMITIDO]");
    expect(redactFiscalConcept("x".repeat(1_000))).toHaveLength(180);
  });

  it("reconoce los patrones sensibles antes de construir la petición", () => {
    expect(containsSensitiveFiscalText("Contacto persona@example.test")).toBe(
      true,
    );
    expect(containsSensitiveFiscalText("Gasto de material de oficina")).toBe(
      false,
    );
  });

  it("reduce nombres y direcciones no convencionales a vocabulario fiscal seguro", () => {
    const minimized = minimizeFiscalConcept(
      "Asesoría profesional para María García en Gran Vía, ACME Consulting",
    );

    expect(minimized).toBe("asesoria profesional");
    expect(minimized).not.toMatch(/maria|garcia|gran|via|acme/i);
  });
});

describe("buildFiscalAiContext", () => {
  it("envía únicamente hechos fiscales mínimos y omite OCR, proveedor y respuestas", () => {
    const value = buildFiscalAiContext(INPUT, CONTEXT);
    const serialized = JSON.stringify(value);

    expect(Object.keys(value).sort()).toEqual([
      "expense",
      "legalContextMode",
      "legalFragments",
      "tax",
    ]);
    expect(Object.keys(value.expense).sort()).toEqual([
      "concept",
      "invoiceType",
      "paymentMethod",
    ]);
    expect(Object.keys(value.tax).sort()).toEqual([
      "directTaxRegime",
      "fiscalYear",
      "hasFullVatDeductionRight",
      "jurisdiction",
      "taxpayerType",
      "vatRegime",
    ]);
    expect(serialized).not.toMatch(
      /Proveedor Privado|OCR COMPLETO|RESPUESTA PRIVADA|ACTIVIDAD PRIVADA|PRIVATE-CODE|9999999|supplierName|extractedText|answers|annualContext|activityDescription|activityCode|2026-07-12|8000|1680|9680|expenseDate|AmountCents/,
    );
    expect(value.expense.concept).toBe("servicio profesional");
  });

  it("solo incorpora fuentes oficiales verificadas con identificadores estables", () => {
    const value = buildFiscalAiContext(INPUT, CONTEXT);
    const registeredVerifiedIds = verifiedFiscalAiSources().map(
      (source) => source.id,
    );

    expect(value.legalContextMode).toBe(
      "VERIFIED_SUMMARIES_REVIEW_ONLY",
    );
    expect(value.legalFragments.map((fragment) => fragment.sourceId)).toEqual(
      registeredVerifiedIds,
    );
    expect(value.legalFragments.length).toBeGreaterThan(0);
    for (const fragment of value.legalFragments) {
      expect(fragment).toMatchObject({
        id: `${fragment.sourceId}:verified-summary:v1`,
        verificationStatus: "VERIFIED",
      });
      expect(["BOE", "AEAT", "DGT"]).toContain(fragment.authority);
      expect(fragment.verifiedSummary.trim()).not.toBe("");
      expect(fragment).not.toHaveProperty("officialUrl");
      expect(fragment).not.toHaveProperty("effectiveFrom");
    }
  });

  it("excluye expresamente las fuentes pendientes de verificación", () => {
    const verifiedIds = new Set(
      verifiedFiscalAiSources().map((source) => source.id),
    );
    const pendingIds = Object.values(OFFICIAL_SOURCES)
      .filter((source) => source.verificationStatus !== "VERIFIED")
      .map((source) => source.id);

    expect(pendingIds.length).toBeGreaterThan(0);
    for (const pendingId of pendingIds) {
      expect(verifiedIds.has(pendingId)).toBe(false);
    }
  });

  it("reutiliza exactamente las fuentes verificadas de cada categoría", () => {
    const expectedMealIds = MEAL_OFFICIAL_SOURCES.filter(
      (source) => source.verificationStatus === "VERIFIED",
    ).map((source) => source.id);
    const expectedVehicleIds = VEHICLE_OFFICIAL_SOURCES.filter(
      (source) => source.verificationStatus === "VERIFIED",
    ).map((source) => source.id);

    expect(
      [...allowedSourceIdsForCategory("MEALS_AND_HOSPITALITY")],
    ).toEqual(expectedMealIds);
    expect(
      [...allowedSourceIdsForCategory("VEHICLE_RUNNING_COSTS")],
    ).toEqual(expectedVehicleIds);
  });

  it("es determinista y no muta la entrada ni el contexto", () => {
    const inputBefore = structuredClone(INPUT);
    const contextBefore = structuredClone(CONTEXT);

    const first = buildFiscalAiContext(INPUT, CONTEXT);
    const second = buildFiscalAiContext(INPUT, CONTEXT);

    expect(second).toStrictEqual(first);
    expect(INPUT).toStrictEqual(inputBefore);
    expect(CONTEXT).toStrictEqual(contextBefore);
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
  });
});
