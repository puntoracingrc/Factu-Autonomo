import {describe,it,expect} from "vitest";
import type {Product} from "@/lib/types";
import {catalogMargin} from "./margin";
import {marginView} from "@/catalog-app/margin-view";
const product:Product={id:"synthetic-margin",key:"synthetic-margin",name:"Producto sintético",family:"Pruebas",unit:"ud",sales:{unit:"ud",unitPrice:100,ivaPercent:21},purchase:{unit:"ud",listPrice:100,discountPercent:50,netUnitCost:50,ivaPercent:21},cost:50,pvp:100,source:"manual",createdAt:"2026-01-01",updatedAt:"2026-01-01"};
const input={sale:100,cost:50,saleVat:21,unit:"ud"};
describe("read-only product margin",()=>{
 it("uses the already-discounted cost once and separates VAT from margin",()=>{
  const before=structuredClone(product);
  expect(catalogMargin(product,input)).toMatchObject({margin:50,percent:50,grossSale:121,grossCost:60.5,grossDifference:60.5,vatDifference:10.5,cost:50});
  expect(product).toEqual(before);
 });
 it("does not invent a sale price from supplier tariff, or missing costs or taxes",()=>{
  expect(catalogMargin(product,{...input,sale:undefined})).toHaveProperty("pending");
  expect(catalogMargin(product,{...input,cost:undefined})).toHaveProperty("pending");
  expect(catalogMargin({...product,purchase:{unit:"ud"},ivaPercent:undefined},{...input,saleVat:undefined})).toMatchObject({margin:50,grossSale:null,grossCost:null,grossDifference:null});
 });
 it("handles zero, a loss, different VAT rates and decimal half-cent rounding",()=>{
  expect(catalogMargin(product,{...input,sale:0})).toMatchObject({margin:-50,percent:null});
  expect(catalogMargin(product,{...input,cost:0})).toMatchObject({margin:100,percent:100});
  expect(catalogMargin({...product,purchase:{unit:"ud",ivaPercent:10}},input)).toMatchObject({margin:50,grossDifference:66,vatDifference:16});
  expect(catalogMargin(product,{...input,sale:10.005,cost:3.335})).toMatchObject({sale:10.01,cost:3.34,margin:6.67,grossSale:12.11,grossCost:4.04});
 });
 it("converts purchase packs to sale units and rejects missing or stale equivalence",()=>{
  const pack={...product,purchase:{unit:"caja",purchaseToSaleFactor:10,ivaPercent:21}};
  expect(catalogMargin(pack,input)).toMatchObject({cost:5,margin:95,converted:true,factor:10});
  expect(catalogMargin({...pack,purchase:{unit:"caja"}},input)).toHaveProperty("pending");
  for(const factor of [0,-1,NaN,Infinity])expect(catalogMargin({...pack,purchase:{unit:"caja",purchaseToSaleFactor:factor}},input)).toHaveProperty("pending");
  expect(catalogMargin(pack,{...input,unit:"m2"})).toHaveProperty("pending");
  expect(catalogMargin(product,{...input,unit:"unidades"})).toMatchObject({margin:50});
 });
 it("rejects invalid numbers rather than producing misleading profit",()=>{
  for(const n of [NaN,Infinity,-1])expect(catalogMargin(product,{...input,cost:n})).toHaveProperty("pending");
  expect(catalogMargin(product,{...input,saleVat:101})).toMatchObject({margin:50,grossSale:null});
 });
 it("shows missing data, losses, conversion and escaped units in the actual view",()=>{
  expect(marginView(product,{...input,sale:undefined})).toContain("Indica el PVP");
  expect(marginView(product,{...input,sale:40})).toContain("Pérdida bruta estimada");
  expect(marginView(product,input)).toContain("Margen bruto sin IVA");
  expect(marginView(product,input)).toContain("Parte de esa diferencia correspondiente al IVA");
  const unit='<img src=x onerror=alert(1)>';
  const result=marginView({...product,unit,sales:{unit},purchase:{unit}},{...input,unit});
  expect(result).not.toContain("<img");expect(result).toContain("&lt;img");
 });
});
