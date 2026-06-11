import { describe, expect, it } from "vitest";
import { getManualSection, getManualSlugs, manualSections } from "./sections";

describe("manual sections", () => {
  it("expone secciones ordenadas con slugs únicos", () => {
    const slugs = getManualSlugs();
    expect(slugs.length).toBe(manualSections.length);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(manualSections[0]?.slug).toBe("primeros-pasos");
  });

  it("resuelve cada slug", () => {
    for (const slug of getManualSlugs()) {
      const section = getManualSection(slug);
      expect(section?.slug).toBe(slug);
      expect(section?.steps.length).toBeGreaterThan(0);
    }
  });
});
