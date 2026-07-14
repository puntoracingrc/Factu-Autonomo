import { describe, expect, it } from "vitest";
import { createProceduralDateV1, type ProceduralDateV1 } from "./procedural-date.v1";

function proceduralDate(overrides: Partial<ProceduralDateV1> = {}): ProceduralDateV1 {
  return {
    proceduralDateId: "date-synthetic-1",
    dateType: "VOLUNTARY_PAYMENT_DEADLINE",
    rawText: "hasta el 20/07/2026",
    rawDeadlineText: "hasta el 20/07/2026",
    parsedDate: "2026-07-20",
    timezone: "Europe/Madrid",
    sourceDocumentId: "document-synthetic-1",
    sourcePage: 4,
    sourceLabel: "Plazo de ingreso",
    sourceCoordinates: null,
    extractionConfidence: 0.97,
    explicitlyPrinted: true,
    legallyComputed: false,
    computationRuleId: null,
    requiresReview: true,
    ...overrides,
  };
}

describe("procedural date v1", () => {
  it("preserves printed deadline text independently from parsed date", () => {
    const output = createProceduralDateV1(proceduralDate());
    expect(output.rawDeadlineText).toBe("hasta el 20/07/2026");
    expect(output.parsedDate).toBe("2026-07-20");
  });

  it("rejects impossible dates and deadlines without raw wording", () => {
    expect(() => createProceduralDateV1(proceduralDate({ parsedDate: "2026-02-30" }))).toThrow();
    expect(() => createProceduralDateV1(proceduralDate({ rawDeadlineText: null }))).toThrow();
  });

  it("requires a versioned rule and human review for legally computed dates", () => {
    expect(() => createProceduralDateV1(proceduralDate({ explicitlyPrinted: false, legallyComputed: true, computationRuleId: null }))).toThrow();
    expect(() => createProceduralDateV1(proceduralDate({ explicitlyPrinted: false, legallyComputed: true, computationRuleId: "deadline-rule-v1", requiresReview: false }))).toThrow();
    expect(createProceduralDateV1(proceduralDate({ explicitlyPrinted: false, legallyComputed: true, computationRuleId: "deadline-rule-v1" })).requiresReview).toBe(true);
  });
});
