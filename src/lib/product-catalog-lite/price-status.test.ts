import {describe,it,expect} from "vitest";
import {catalogPriceStatus} from "./price-status";

describe("visible catalog price availability",()=>{
  it("distinguishes a usable PVP from cost-only and entirely unpriced products",()=>{
    expect(catalogPriceStatus(100,60,21).kind).toBe("pvp");
    expect(catalogPriceStatus(null,60,21).kind).toBe("cost-only");
    expect(catalogPriceStatus(undefined,undefined,21).kind).toBe("unpriced");
  });
  it("never calls a known sale price cost-only when its VAT is missing or invalid",()=>{
    for(const vat of [null,undefined,NaN,-1,101])expect(catalogPriceStatus(100,60,vat).kind).toBe("vat-pending");
  });
  it("preserves explicit zero prices and tax-exempt sales as known values",()=>{
    expect(catalogPriceStatus(0,60,21).kind).toBe("pvp");
    expect(catalogPriceStatus(100,null,0).kind).toBe("pvp");
    expect(catalogPriceStatus(null,0,21).kind).toBe("cost-only");
  });
  it("does not present nonfinite, negative or out-of-range amounts as available",()=>{
    for(const sale of [NaN,Infinity,-1,1e13])expect(catalogPriceStatus(sale,60,21).kind).toBe("cost-only");
    expect(catalogPriceStatus(null,NaN,21).kind).toBe("unpriced");
  });
});
