import { describe, expect, it } from "vitest";
import { AEAT_OFFICIAL_CATALOG_PROFILES_V9 } from "./knowledge/official-catalog-expansion.v9";
import { explainAeatOfficialCatalogDocumentV9 } from "./official-catalog-explanation.v9";

describe("AEAT official catalog explanation v9", () => {
  it("gives every V9 profile its own ten-section explanation without a fallback", () => {
    for (const profile of AEAT_OFFICIAL_CATALOG_PROFILES_V9) {
      const explanation = explainAeatOfficialCatalogDocumentV9(profile.id);
      expect(explanation.familyId, profile.id).toBe(profile.id);
      expect(explanation.familyName, profile.id).toBe(profile.nameEs);
      expect(explanation.fallbackUsed, profile.id).toBe(false);
      expect(explanation.sections, profile.id).toHaveLength(10);
      expect(explanation.officialSources.length, profile.id).toBeGreaterThan(0);
      expect(explanation.networkPolicy, profile.id).toBe("NO_NETWORK");
      expect(explanation.materializationPolicy, profile.id).toBe(
        "PROHIBITED_UNTIL_REVIEW",
      );
      expect(
        explanation.sections.find((section) => section.id === "WHAT_DOCUMENT_SAYS")
          ?.assertions[0]?.text,
        profile.id,
      ).toBe(profile.whatItIs);
      expect(
        explanation.sections.find((section) => section.id === "NOT_PROVEN")
          ?.assertions.map((assertion) => assertion.text),
        profile.id,
      ).toEqual(profile.notProvenByThisDocument);
    }
  });

  it("keeps request, review and technical-response conclusions conservative", () => {
    const extension = explainAeatOfficialCatalogDocumentV9(
      "procedure.deadline_extension_request",
    );
    const execution = explainAeatOfficialCatalogDocumentV9(
      "review.execution_resolution",
    );
    const verifactu = explainAeatOfficialCatalogDocumentV9(
      "verifactu.technical_response",
    );
    expect(JSON.stringify(extension)).toContain(
      "Que el plazo haya sido ampliado",
    );
    expect(JSON.stringify(execution)).toContain(
      "Que la resolución se haya ejecutado correctamente",
    );
    expect(JSON.stringify(verifactu)).toContain(
      "no confirma por sí solo una deuda",
    );
  });
});
