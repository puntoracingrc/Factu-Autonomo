import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("../components/forms/DocumentForm.tsx", import.meta.url),
  "utf8",
);

describe("DocumentForm line VAT integration", () => {
  it("wires mixed VAT editing without an implicit global rewrite", () => {
    expect(source).toContain(
      "documentFormItemsForEditing(existing.items, vatExempt)",
    );
    expect(source).toContain("applyConfirmedDocumentIvaToItems(");
    expect(source).toContain("window.confirm(");
    expect(source).not.toContain(
      "items.map((item) => ({\n            ...item,\n            ivaPercent: effectiveDocumentIva",
    );
  });

  it("keeps the expanded desktop grid contained and names every VAT selector", () => {
    expect(source).toContain("lg:overflow-x-auto");
    expect(source).toContain("ariaLabel={`IVA de la línea ${index + 1}`}");
    expect(source).toContain("unitPriceFromGross(gross, item.ivaPercent)");
  });
});
