import { describe, expect, it } from "vitest";
import { CatalogBackStack, type CatalogLocation } from "./navigation";

const products: CatalogLocation = {
  view: "products", query: "Somfy", family: "Motores", subfamily: "Somfy · cable",
  browseFamily: "", familyQuery: "", familyLimit: 100, scrollY: 870,
};

describe("catalog navigation trail", () => {
  it("returns through subfamilies and families to the previous filtered search", () => {
    const stack = new CatalogBackStack<CatalogLocation>();
    stack.push(products);
    const families = { ...products, view: "families" as const, familyQuery: "mot", scrollY: 120 };
    stack.push(families);
    const subfamilies = { ...families, browseFamily: "Motores", familyQuery: "cable", scrollY: 430 };
    stack.push(subfamilies);
    expect(stack.pop()).toEqual(subfamilies);
    expect(stack.pop()).toEqual(families);
    expect(stack.pop()).toEqual(products);
    expect(stack.available).toBe(false);
  });

  it("preserves the loaded results when returning from a product", () => {
    const stack = new CatalogBackStack<CatalogLocation & { rows: string[]; total: number; hasMore: boolean }>();
    stack.push({ ...products, rows: ["page-1", "page-2"], total: 75, hasMore: true });
    expect(stack.pop()).toMatchObject({ rows: ["page-1", "page-2"], total: 75, hasMore: true, scrollY: 870 });
  });

  it("cannot restore another company's or signed-out session's trail", () => {
    const stack = new CatalogBackStack<CatalogLocation>();
    stack.push(products);
    stack.reset();
    expect(stack.available).toBe(false);
    expect(stack.pop()).toBeUndefined();
  });

  it("bounds the trail while retaining the 50 most recent destinations", () => {
    const stack = new CatalogBackStack<CatalogLocation>();
    for (let i = 0; i < 60; i++) stack.push({ ...products, scrollY: i });
    for (let i = 59; i >= 10; i--) expect(stack.pop()?.scrollY).toBe(i);
    expect(stack.pop()).toBeUndefined();
  });
});
