import { describe, expect, it } from "vitest";
import {
  DEFAULT_DOCUMENT_TEMPLATE,
  documentTemplateAccentRgb,
  documentTemplateDensityPadding,
  documentTemplatePdfFont,
  documentTemplatePdfFontSize,
  normalizeDocumentTemplate,
} from "./document-templates";

describe("document templates", () => {
  it("normaliza valores incompletos o antiguos", () => {
    expect(normalizeDocumentTemplate(null)).toEqual(DEFAULT_DOCUMENT_TEMPLATE);
    expect(
      normalizeDocumentTemplate({
        style: "futuro",
        font: "clasica",
        accent: "coral",
        titleFontSize: "grande",
        showLogo: false,
      }),
    ).toMatchObject({
      style: "futuro",
      font: "clasica",
      accent: "coral",
      density: "normal",
      bodyFontSize: "normal",
      titleFontSize: "grande",
      showLogo: false,
    });
  });

  it("resuelve color y densidad para el PDF", () => {
    expect(documentTemplateAccentRgb("esmeralda")).toEqual([5, 150, 105]);
    expect(documentTemplateDensityPadding("compacta")).toBeLessThan(
      documentTemplateDensityPadding("amplia"),
    );
  });

  it("resuelve fuente y tamaños para el PDF", () => {
    expect(documentTemplatePdfFont("clasica")).toBe("times");
    expect(documentTemplatePdfFont("tecnica")).toBe("courier");
    expect(documentTemplatePdfFontSize("grande", "title")).toBeGreaterThan(
      documentTemplatePdfFontSize("pequena", "title"),
    );
  });
});
