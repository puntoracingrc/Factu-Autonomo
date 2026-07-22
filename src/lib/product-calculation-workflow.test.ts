import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("product calculation workflow", () => {
  it("ofrece las plantillas universales sin confundirlas con las unidades", () => {
    const fields = source("../components/products/ProductFormFields.tsx");
    expect(fields).toContain('<option value="none">Cantidad directa</option>');
    expect(fields).toContain('<option value="linear">');
    expect(fields).toContain('<option value="area">');
    expect(fields).toContain('<option value="volume">');
  });

  it("transfiere la plantilla explícita del producto al documento", () => {
    const draft = source("./product-document-draft.ts");
    const form = source("../components/forms/DocumentForm.tsx");
    expect(draft).toContain("calculation: product.calculation");
    expect(draft).toContain('{ kind: "none", unit }');
    expect(form).toContain("pickedLine.draftLine.calculation");
    expect(form).toContain("draftLine.calculation");
    expect(form).toContain("calculation: {");
    expect(form).toContain("currentMeasurement.roundingDecimals");
    expect(form).toContain('const isVolumeLine = measurementKind === "volume"');
    expect(source("../app/productos/nuevo/page.tsx")).toContain(
      "productFormDraftFromDocumentPrefill(prefill)",
    );
  });

  it("mantiene la precisión visible del PDF alineada con sus cálculos", () => {
    const pdf = source("./pdf.ts");
    const units = source("./document-units.ts");
    expect(pdf).toContain("const quantityLabel = formatQuantityWithUnit(");
    expect(pdf).toContain("item.quantity,");
    expect(units).toContain(".toFixed(4)");
  });
});
