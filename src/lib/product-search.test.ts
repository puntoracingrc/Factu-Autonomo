import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildProductSearchEntry, buildProductSearchIndex, normalizeProductSearch, productSearchScore } from "./product-search";

describe("shared product reference search", () => {
  it.each(["AL-PRA1-R", "AL PRA1 R", " al  pra1   r ", "@AL-PRA1-R", "AL_PRA1_R", "AL–PRA1–R"])(
    "keeps letters, numbers and suffixes while normalizing %s", (query) => {
      expect(normalizeProductSearch(query)).toBe("al pra1 r");
      expect(productSearchScore(buildProductSearchEntry({ name: "Ventana", sku: "AL-PRA1-R" }), query)).toBe(2000);
    },
  );

  it("does not truncate descriptions, references or aliases after eight words", () => {
    const entry = buildProductSearchEntry({
      name: "Suministro y colocación de una ventana de aluminio con vidrio aislante y muchas características",
      sku: "AL-PRA1-R", aliases: ["ORIGINAL-123-R"],
      purchaseSupplierReference: "PROV-987-F", subfamily: "Ventanas singulares",
    });
    for (const query of ["AL PRA1 R", "original 123 r", "prov 987 f", "singulares"]) {
      expect(productSearchScore(entry, query)).not.toBeNull();
    }
  });

  it("requires all fragments and distinguishes one/two leaves and the R suffix", () => {
    const entry = buildProductSearchEntry({ name: "Ventana aluminio", sku: "AL-PRA1", family: "Carpintería" });
    expect(productSearchScore(entry, "AL PRA1")).toBe(2000);
    for (const query of ["AL PRA2", "AL PRA1 R", "PVC PRA1", "AL inexistente"]) {
      expect(productSearchScore(entry, query)).toBeNull();
    }
    expect(productSearchScore(entry, "PRA1")).not.toBeNull();
    expect(productSearchScore(entry, "1")).not.toBeNull();
    expect(productSearchScore(entry, "2")).toBeNull();
  });

  it("searches names, accents, words in a different order, suppliers and sale descriptions", () => {
    const entry = buildProductSearchEntry({ name: "Ventana", family: "Carpintería",
      saleDescription: "Guía azul instalada", usualSupplier: { supplierName: "Proveedor Demo" } });
    for (const query of ["guia azul", "azul guia", "carpinteria", "demo guia"]) {
      expect(productSearchScore(entry, query)).not.toBeNull();
    }
    expect(productSearchScore(entry, "demo inexistente")).toBeNull();
  });

  it("returns no match for an unrelated product even if AL occurs inside a word", () => {
    const entry = buildProductSearchEntry({ name: "Centralita radio", usualSupplier: { supplierName: "Metal Demo" } });
    expect(productSearchScore(entry, "AL PRA1 R")).toBeNull();
  });

  it("does not confuse a material or model number with words and dimensions in the description", () => {
    const entries = buildProductSearchIndex([
      { name: "Ventana practicable con fijo lateral y vidrio 4/12/4", sku: "PVC-PRA1-R-FL1" },
      { name: "Ventana practicable con fijo lateral y vidrio 4/12/4", sku: "AL-PRA2-R-FL1" },
      { name: "Ventana practicable con registro", sku: "AL-PRA1-R" },
      { name: "Motor G50", sku: "SYN-MOTOR-50" },
    ]);
    for (const query of ["AL PRA1 R", "AL-PRA1-R", "AL PRA 1 R"]) {
      expect(entries.filter((entry) => productSearchScore(entry, query) !== null).map((entry) => entry.product.sku))
        .toEqual(["AL-PRA1-R"]);
    }
    expect(productSearchScore(entries[3], "motor g50")).not.toBeNull();
  });

  it("keeps an exact reference ahead of extensions, abbreviations and descriptive matches", () => {
    const scores = ["AL-PRA1-R-FL2", "AL-PRA1-R-FL1", "AL-PRA1-R"].map((sku) => ({
      sku, score: productSearchScore(buildProductSearchEntry({ name: "Ventana", sku }), "AL PRA1 R")!,
    })).sort((a, b) => b.score - a.score);
    expect(scores[0].sku).toBe("AL-PRA1-R");
  });

  it("has no writes and is shared by the catalog, its line picker and @ suggestions", () => {
    const page = readFileSync(new URL("../app/productos/page.tsx", import.meta.url), "utf8");
    const suggestions = readFileSync(new URL("./document-product-suggestions.ts", import.meta.url), "utf8");
    const form = readFileSync(new URL("../components/forms/DocumentForm.tsx", import.meta.url), "utf8");
    const search = readFileSync(new URL("./product-search.ts", import.meta.url), "utf8");
    for (const consumer of [page, suggestions]) {
      expect(consumer).toContain("buildProductSearchIndex");
      expect(consumer).toContain("productSearchScore");
    }
    expect(page).toContain("getDocumentProductPickRequest");
    expect(page).toContain("filteredProducts.slice(0, visibleCount)");
    expect(form).toContain('openProductFlowForLine(item, "/productos")');
    expect(form).toContain("searchDocumentProductSuggestions(");
    expect(form).toContain("{product.sku}");
    expect(search).not.toMatch(/localStorage|indexedDB|fetch\(|supabase|\.slice\(0, 8\)/);
  });
});
