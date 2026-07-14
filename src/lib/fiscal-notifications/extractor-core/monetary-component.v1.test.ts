import { describe, expect, it } from "vitest";
import { createMonetaryComponentV1, type MonetaryComponentV1 } from "./monetary-component.v1";

function component(overrides: Partial<MonetaryComponentV1> = {}): MonetaryComponentV1 {
  return {
    componentId: "money-synthetic-1",
    componentType: "PRINCIPAL",
    amountCents: 123_45,
    currency: "EUR",
    sign: "POSITIVE",
    sourceDocumentId: "document-synthetic-1",
    sourcePage: 3,
    sourceLabel: "Principal",
    sourceCoordinates: null,
    extractionConfidence: 0.99,
    explicitlyPrinted: true,
    calculated: false,
    calculationFormula: null,
    relatedDebtKey: "debt-synthetic-1",
    requiresHumanReview: true,
    ...overrides,
  };
}

describe("monetary component v1", () => {
  it("keeps principal separate, in integer cents and immutable", () => {
    const output = createMonetaryComponentV1(component());
    expect(output).toMatchObject({ componentType: "PRINCIPAL", amountCents: 12345 });
    expect(Object.isFrozen(output)).toBe(true);
  });

  it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1, Number.NaN])("rejects invalid cents %s", (amountCents) => {
    expect(() => createMonetaryComponentV1(component({ amountCents }))).toThrowError(
      expect.objectContaining({ code: "INVALID_AMOUNT", path: "money.amountCents" }),
    );
  });

  it("requires formulas and review for calculated amounts", () => {
    expect(() => createMonetaryComponentV1(component({ explicitlyPrinted: false, calculated: true, calculationFormula: null }))).toThrow();
    expect(() => createMonetaryComponentV1(component({ explicitlyPrinted: false, calculated: true, calculationFormula: "principal + recargo", requiresHumanReview: false }))).toThrow();
    expect(createMonetaryComponentV1(component({ explicitlyPrinted: false, calculated: true, calculationFormula: "principal + recargo" })).calculated).toBe(true);
  });
});
