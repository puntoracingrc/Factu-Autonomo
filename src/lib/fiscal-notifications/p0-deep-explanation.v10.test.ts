import { describe, expect, it } from "vitest";
import { AEAT_P0_DEEP_PROFILE_IDS_V10 } from "./knowledge/p0-deep-contracts.v10";
import { explainAeatP0DeepDocumentV10 } from "./p0-deep-explanation.v10";
import { FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_V2_CANONICAL_SECTIONS } from "./structured-document-explanation.v2";

describe("AEAT P0 deep explanation v10", () => {
  it("gives every deep profile its own complete plain-language explanation", () => {
    for (const familyId of AEAT_P0_DEEP_PROFILE_IDS_V10) {
      const result = explainAeatP0DeepDocumentV10(familyId);
      expect(result.familyId, familyId).toBe(familyId);
      expect(result.fallbackUsed, familyId).toBe(false);
      expect(result.knowledgeReleaseId, familyId).toBe("aeat-p0-deep-contracts.2026-07-17.v10");
      expect(result.sections.map((section) => section.id), familyId).toEqual(
        FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_V2_CANONICAL_SECTIONS,
      );
      expect(result.sections.every((section) => section.assertions.length > 0), familyId).toBe(true);
      expect(result.officialSources.length, familyId).toBeGreaterThan(0);
      expect(result.officialSources.every((source) => source.sourceVersion?.lastChecked === "2026-07-17"), familyId).toBe(true);
      expect(result.networkPolicy, familyId).toBe("NO_NETWORK");
      expect(result.requiresHumanReview, familyId).toBe(true);
      expect(result.materializationPolicy, familyId).toBe("PROHIBITED_UNTIL_REVIEW");
    }
  });

  it("states the corrected automatic extension rule without waiting for an express grant", () => {
    const text = JSON.stringify(explainAeatP0DeepDocumentV10("procedure.deadline_extension_request"));
    expect(text).toContain("automáticamente");
    expect(text).toContain("denegación expresa");
    expect(text).not.toContain("solo una concesión expresa");
  });

  it("allows a direct rectification resolution and separates refund recognition from payment", () => {
    const resolution = explainAeatP0DeepDocumentV10("assessment.rectification_resolution");
    const text = JSON.stringify(resolution);
    expect(text).toContain("decisión final");
    expect(text).toContain("resolución directa sin propuesta previa");
    expect(text).toContain("No afirmar pago de una devolución");
    expect(text).toContain("Resolución favorable no equivale a transferencia");
  });

  it("uses the specific certificate disagreement route rather than an ordinary appeal", () => {
    const result = explainAeatP0DeepDocumentV10("certificate.correction_or_disagreement");
    const text = JSON.stringify(result);
    expect(text).toContain("diez días");
    expect(text).toContain("disconformidad");
    expect(text).toContain("recurso ordinario");
  });

  it("marks official sources as preloaded local knowledge, not live scan queries", () => {
    const result = explainAeatP0DeepDocumentV10("filing.rectifying_self_assessment_receipt");
    const sourceSection = result.sections.find((section) => section.id === "OFFICIAL_SOURCES")!;
    expect(sourceSection.assertions.every((item) => item.text.includes("no se consulta internet durante el escaneo"))).toBe(true);
    expect(result.officialSources.every((source) => source.canonicalUrl?.startsWith("https://sede.agenciatributaria.gob.es/"))).toBe(true);
  });

  it("is deterministic and immutable", () => {
    const first = explainAeatP0DeepDocumentV10("review.execution_resolution");
    const second = explainAeatP0DeepDocumentV10("review.execution_resolution");
    expect(first).toEqual(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.sections)).toBe(true);
    expect(Object.isFrozen(first.sections[0]?.assertions)).toBe(true);
  });
});
