import {describe,it,expect} from "vitest";
import {discountedProductCost,grossProductPrice} from "./decimal-prices";
import {catalogEdit,recalculatedCatalogCost,updatedCatalogProduct} from "./model";
import {currentPriceSource} from "@/lib/product-price-sources";
import {materializeSupplierPriceCatalog,parseSupplierPriceCatalog} from "./price-import";
describe("decimal product price arithmetic",()=>{
 it("rounds every half-cent correctly rather than trusting binary multiplication",()=>{
   for(let cents=1;cents<=40000;cents++)expect(discountedProductCost(cents/100,50)).toBe(Math.ceil(cents/2)/100);
 });
 it("handles fractional percentages, zero, complete discount and scientific notation",()=>{
   expect(discountedProductCost(123.45,35)).toBe(80.24);expect(discountedProductCost(10,12.5)).toBe(8.75);expect(discountedProductCost(20,100)).toBe(0);expect(discountedProductCost(1e-7,0)).toBe(0);
   expect(grossProductPrice(.5,21)).toBe(.61);expect(grossProductPrice(0,21)).toBe(0);expect(grossProductPrice(12.34,0)).toBe(12.34);expect(()=>discountedProductCost(10,101)).toThrow();expect(()=>grossProductPrice(NaN,21)).toThrow();
 });
 it("recalculates a derived tariff cost without replacing its source document or unrelated offers",()=>{
   const catalog=parseSupplierPriceCatalog({schema:"FACTU_SUPPLIER_PRICE_CATALOG_V1",catalogId:"synthetic-rounding",supplierName:"Proveedor sintético",products:[{reference:"SYN-ROUND",name:"Producto de prueba",family:"Motores",unit:"ud",listPrice:123.45,discountPercent:50,salePrice:123.45,vatPercent:21,source:{documentName:"tarifa-test.jpg",sourceSha256:"a".repeat(64)}}]});
   const p=materializeSupplierPriceCatalog(catalog,"synthetic-company","2026-10-24T10:00:00Z")[0];p.cost=61.72;p.purchase!.netUnitCost=61.72;p.priceSources![0].netUnitCost=61.72;
   const recalculated=recalculatedCatalogCost(catalogEdit(p)),saved=updatedCatalogProduct(p,recalculated,"2026-10-24T12:00:00Z");
   expect(saved.cost).toBe(61.73);expect(saved.priceSources).toHaveLength(1);expect(currentPriceSource(saved)).toMatchObject({kind:"supplier_tariff",sourceSha256:"a".repeat(64),documentName:"tarifa-test.jpg",netUnitCost:61.73});expect(saved.purchasePriceSourceId).toBe(p.purchasePriceSourceId);expect(p.priceSources![0].netUnitCost).toBe(61.72);
   const changed=catalogEdit(p);changed.listPrice="200";const manual=updatedCatalogProduct(p,recalculatedCatalogCost(changed),"2026-10-24T12:00:00Z");expect(currentPriceSource(manual)?.kind).toBe("manual");expect(manual.priceSources?.[0].netUnitCost).toBe(61.72);
 });
});
