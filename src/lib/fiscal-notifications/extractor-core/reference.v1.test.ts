import { describe, expect, it } from "vitest";
import { normalizeReferenceV1, type NormalizeReferenceInputV1 } from "./reference.v1";

function input(overrides: Partial<NormalizeReferenceInputV1> = {}): NormalizeReferenceInputV1 {
  return {
    referenceType: "DEBT_KEY",
    rawValue: " AB–12 34 ",
    sourceDocumentId: "document-synthetic-1",
    sourcePage: 2,
    sourceLabel: "Clave de deuda",
    sourceCoordinates: { x: 0.1, y: 0.2, width: 0.3, height: 0.1 },
    confidence: 0.93,
    ...overrides,
  };
}

describe("canonical reference normalizer v1", () => {
  it("preserves the raw literal while normalizing whitespace, dash and case", () => {
    const rawValue = "ab–12 34";
    const output = normalizeReferenceV1(input({ rawValue }));
    expect(output.rawValue).toBe(rawValue);
    expect(output.normalizedValue).toBe("AB-1234");
    expect(Object.isFrozen(output)).toBe(true);
    expect(Object.isFrozen(output.sourceCoordinates)).toBe(true);
  });

  it("detects OCR ambiguities without replacing the observed characters", () => {
    const output = normalizeReferenceV1(input({ rawValue: "AOI-BS" }));
    expect(output.normalizedValue).toBe("AOI-BS");
    expect(output.normalizationStatus).toBe("AMBIGUOUS_OCR_REVIEW_REQUIRED");
    expect(output.ambiguities.map((entry) => [entry.observed, entry.possibleAlternative])).toEqual([
      ["O", "0"], ["I", "1"], ["B", "8"], ["S", "5"],
    ]);
    expect(output.requiresHumanReview).toBe(true);
  });

  it("validates known model, year and period shapes without inventing values", () => {
    expect(normalizeReferenceV1(input({ referenceType: "MODEL", rawValue: "303" })).normalizationStatus).toBe("NORMALIZED_EXACTLY");
    expect(normalizeReferenceV1(input({ referenceType: "MODEL", rawValue: "3O3" })).normalizationStatus).toBe("INVALID_PATTERN_REVIEW_REQUIRED");
    expect(normalizeReferenceV1(input({ referenceType: "FISCAL_YEAR", rawValue: "2026" })).normalizedValue).toBe("2026");
    expect(normalizeReferenceV1(input({ referenceType: "TAX_PERIOD", rawValue: "4T" })).normalizedValue).toBe("4T");
  });

  it("computes known Spanish tax ID control digits and never trusts caller flags", () => {
    const output = normalizeReferenceV1(input({ referenceType: "NIF", rawValue: "12345678Z" }));
    expect(output.checkDigitValid).toBe(true);
    expect(output.requiresHumanReview).toBe(false);
    expect(() => normalizeReferenceV1({ ...input(), checkDigitValid: true } as unknown as NormalizeReferenceInputV1)).toThrowError(
      expect.objectContaining({ path: "reference.$shape" }),
    );
  });
});
