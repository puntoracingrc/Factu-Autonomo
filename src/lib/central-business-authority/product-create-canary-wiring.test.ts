import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("central product create canary wiring", () => {
  const appStore = source("../../context/AppStore.tsx");
  const hook = source("../../hooks/useCentralProductCreate.ts");
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
});
