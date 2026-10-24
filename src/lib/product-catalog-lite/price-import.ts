import { sha256Hex } from "@/lib/document-integrity/snapshot-hash";
import { isProductPriceSource, withPriceSourceSummary } from "@/lib/product-price-sources";
import type { Product, ProductAttribute, ProductPriceSource } from "@/lib/types";
import { discountedProductCost } from "./decimal-prices";

export interface SupplierPriceCatalog {
  schema: "FACTU_SUPPLIER_PRICE_CATALOG_V1";
  catalogId: string;
  supplierName: string;
  products: Array<{reference:string;name:string;family:string;subfamily?:string;description?:string;unit:string;listPrice:number;discountPercent:number;salePrice:number;vatPercent:number;source:Pick<ProductPriceSource,"documentName"|"documentNumber"|"documentDate"|"sourceSha256"|"note">;attributes?:ProductAttribute[];notes?:string}>;
}
const text = (v: unknown,max:number): v is string => typeof v === "string" && v.trim().length>0 && v.length<=max;
const amount = (v: unknown,max=1e12): v is number => typeof v === "number" && Number.isFinite(v) && v>=0 && v<=max;
export function parseSupplierPriceCatalog(value: unknown): SupplierPriceCatalog {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("El archivo no es una tarifa de Factu.");
  const c = value as SupplierPriceCatalog;
  if (c.schema!=="FACTU_SUPPLIER_PRICE_CATALOG_V1" || !text(c.catalogId,100) || !/^[a-z0-9_-]+$/i.test(c.catalogId) || !text(c.supplierName,200) || !Array.isArray(c.products) || !c.products.length || c.products.length>50) throw Error("La tarifa debe contener entre 1 y 50 referencias y un proveedor identificado.");
  const references=new Set<string>();
  const products=c.products.map(p=>{
    if (!p || !text(p.reference,100) || !text(p.name,300) || !text(p.family,200) || !text(p.unit,40) || !amount(p.listPrice) || !amount(p.discountPercent,100) || !amount(p.salePrice) || !amount(p.vatPercent,100)) throw Error("Hay una referencia o un precio no válido.");
    if (references.has(p.reference.trim().toUpperCase())) throw Error("La tarifa repite una referencia.");
    references.add(p.reference.trim().toUpperCase());
    if (!p.source || !text(p.source.documentName,300) || !/^[a-f0-9]{64}$/.test(p.source.sourceSha256??"")) throw Error("Cada precio necesita el nombre y la huella SHA-256 de su documento de origen.");
    const proof={...p.source,id:"check",kind:"supplier_tariff",recordedAt:"2026-01-01T00:00:00Z",unit:p.unit};
    if (!isProductPriceSource(proof) || (p.subfamily!==undefined&&!text(p.subfamily,200)) || (p.description!==undefined&&!text(p.description,5000)) || (p.notes!==undefined&&!text(p.notes,10000)) || (p.attributes!==undefined&&(!Array.isArray(p.attributes)||p.attributes.length>50||p.attributes.some(a=>!a||!text(a.key,100)||!text(a.label,100)||!text(a.value,1000)||(a.unit!==undefined&&!text(a.unit,40)))))) throw Error("Revisa la fuente y las características de la tarifa.");
    return {reference:p.reference.trim(),name:p.name.trim(),family:p.family.trim(),subfamily:p.subfamily,description:p.description,unit:p.unit.trim(),listPrice:p.listPrice,discountPercent:p.discountPercent,salePrice:p.salePrice,vatPercent:p.vatPercent,source:{documentName:p.source.documentName,documentNumber:p.source.documentNumber,documentDate:p.source.documentDate,sourceSha256:p.source.sourceSha256,note:p.source.note},attributes:p.attributes,notes:p.notes};
  });
  return {schema:c.schema,catalogId:c.catalogId,supplierName:c.supplierName.trim(),products};
}
export function materializeSupplierPriceCatalog(catalog: SupplierPriceCatalog, companyId: string, now: string): Product[] {
  return catalog.products.map(p=>{
    const externalId=`supplier-price-catalog:${catalog.catalogId}:${p.reference}`;
    const hash=sha256Hex(`${companyId}\0${externalId}`),id=`${hash.slice(0,8)}-${hash.slice(8,12)}-4${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`;
    // Match the existing product normalizer: monetary purchase costs use cents.
    const cost=discountedProductCost(p.listPrice,p.discountPercent);
    const source:ProductPriceSource={...p.source,id:`tariff:${catalog.catalogId}:${p.reference}`,kind:"supplier_tariff",supplierName:catalog.supplierName,supplierReference:p.reference,recordedAt:now,unit:p.unit,listPrice:p.listPrice,discountPercent:p.discountPercent,netUnitCost:cost,saleUnitPrice:p.salePrice,ivaPercent:p.vatPercent};
    return withPriceSourceSummary({id,externalId,key:`${hash.slice(0,16)} ${p.reference}`,name:p.name,sku:p.reference,family:p.family,subfamily:p.subfamily,unit:p.unit,supplierName:catalog.supplierName,pvp:p.listPrice,cost,ivaPercent:p.vatPercent,
      sales:{enabled:true,description:p.description??p.name,unit:p.unit,unitPrice:p.salePrice,ivaPercent:p.vatPercent},purchase:{enabled:true,description:p.description??p.name,unit:p.unit,listPrice:p.listPrice,discountPercent:p.discountPercent,netUnitCost:cost,ivaPercent:p.vatPercent,supplierName:catalog.supplierName,supplierReference:p.reference,purchaseToSaleFactor:1},
      priceSources:[source],purchasePriceSourceId:source.id,salePriceSourceId:source.id,attributes:p.attributes,notes:p.notes,source:"manual",createdAt:now,updatedAt:now});
  });
}
export interface CatalogIdentity {id:string;sku:string;externalId:string;reference:string;deleted?:boolean}
/** New records only. A matching reference never authorizes replacing an existing product. */
export function planSupplierPriceAdmission(products: Product[], identities: CatalogIdentity[]) {
  const pending:Product[]=[],existing:string[]=[],conflicts:string[]=[];
  for(const p of products){
    const found=identities.filter(i=>i.id===p.id || i.externalId===p.externalId || (i.sku&&i.sku.toUpperCase()===p.sku?.toUpperCase()) || (i.reference&&i.reference.toUpperCase()===p.purchase?.supplierReference?.toUpperCase()));
    if(found.some(i=>i.deleted||i.id!==p.id||i.externalId!==p.externalId)) conflicts.push(p.sku??p.name);
    else if(found.length) existing.push(p.sku??p.name);else pending.push(p);
  }
  return {pending,existing,conflicts};
}
