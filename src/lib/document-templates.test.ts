import { describe, expect, it } from "vitest";
import {
  DEFAULT_DOCUMENT_TEMPLATE,
  documentTemplateAccentRgb,
  documentTemplateDensityPadding,
  normalizeDocumentTemplate,
} from "./document-templates";

describe("document templates", () => {
  it("normaliza valores incompletos o antiguos", () => {
    expect(normalizeDocumentTemplate(null)).toEqual(DEFAULT_DOCUMENT_TEMPLATE);
    expect(
      normalizeDocumentTemplate({
        style: "futuro",
        accent: "coral",
        showLogo: false,
      }),
    ).toMatchObject({
      style: "futuro",
      accent: "coral",
      density: "normal",
      showLogo: false,
    });
  });

  it("resuelve color y densidad para el PDF", () => {
    expect(documentTemplateAccentRgb("esmeralda")).toEqual([5, 150, 105]);
    expect(documentTemplateDensityPadding("compacta")).toBeLessThan(
      documentTemplateDensityPadding("amplia"),
    );
  });
});
