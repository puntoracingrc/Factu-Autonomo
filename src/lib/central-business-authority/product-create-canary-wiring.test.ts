import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("central product create canary wiring", () => {
  const appStore = source("../../context/AppStore.tsx");
  const hook = source("../../hooks/useCentralProductCreate.ts");
  const mutationHook = source("../../hooks/useCentralProductMutations.ts");
  const productsPage = source("../../app/productos/page.tsx");
  const newProductPage = source("../../app/productos/nuevo/page.tsx");

  it("expone un commit durable con identidad preparada", () => {
    expect(appStore).toContain("addProductDurably");
    expect(appStore).toContain("createProductWithIdentity");
  });

  it("conecta el formulario dedicado mediante el hook central", () => {
    expect(hook).toContain("createProductWithCentralCanary");
    expect(newProductPage).toContain("useCentralProductCreate");
    expect(newProductPage).toContain("await createProduct");
    expect(newProductPage).not.toContain("const { data, addProduct }");
  });

  it("conecta edicion y borrado central sin permitir lotes parciales", () => {
    expect(mutationHook).toContain("updateProductWithCentralCanary");
    expect(mutationHook).toContain("deleteProductWithCentralCanary");
    expect(productsPage).toContain("useCentralProductMutations");
    expect(productsPage).toContain("await updateProduct(updated)");
    expect(productsPage).toContain("await deleteProduct(existing.id)");
    expect(productsPage).toContain("includesCentralProducts");
    expect(appStore).toContain("updateProductDurably");
    expect(appStore).toContain("deleteProductDurably");
  });
});
