import type { Product, ProductPriceSource } from "./types";

export const PRICE_SOURCE_LABELS: Record<ProductPriceSource["kind"], string> = {
  manual: "Alta o edición manual", supplier_invoice: "Factura de proveedor",
  supplier_tariff: "Tarifa de proveedor", other: "Otro origen documentado",
};
const optionalText = (v: unknown, max = 300): v is string | undefined => v === undefined || (typeof v === "string" && v.length <= max);
const number = (v: unknown, max = 1e12): v is number | undefined => v === undefined || (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max);
const date = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s;
export function isProductPriceSource(value: unknown): value is ProductPriceSource {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const s = value as ProductPriceSource;
  return typeof s.id === "string" && s.id.length > 0 && s.id.length <= 200 && Object.hasOwn(PRICE_SOURCE_LABELS, s.kind)
    && typeof s.recordedAt === "string" && Number.isFinite(Date.parse(s.recordedAt))
    && typeof s.unit === "string" && s.unit.trim().length > 0 && s.unit.length <= 40
    && [s.supplierName,s.supplierReference,s.documentName,s.documentNumber,s.expenseId,s.lineId].every(v=>optionalText(v))
    && optionalText(s.note, 2000) && (s.documentDate === undefined || (typeof s.documentDate === "string" && date(s.documentDate)))
    && (s.sourceSha256 === undefined || /^[a-f0-9]{64}$/.test(s.sourceSha256))
    && [s.listPrice,s.netUnitCost,s.saleUnitPrice].every(v=>number(v)) && number(s.discountPercent,100) && number(s.ivaPercent,100);
}
export function productPriceSources(product: Pick<Product,"priceSources">): ProductPriceSource[] {
  return Array.isArray(product.priceSources) ? product.priceSources.filter(isProductPriceSource).slice(0,200) : [];
}
const equal = (a: number | undefined, b: number | undefined) => a === b || (a !== undefined && b !== undefined && Math.abs(a-b)<1e-8);
export function currentPriceSource(product: Product, side: "purchase" | "sale" = "purchase"): ProductPriceSource | undefined {
  const id = side === "purchase" ? product.purchasePriceSourceId : product.salePriceSourceId;
  const source = productPriceSources(product).find(s=>s.id===id);
  if (!source) return undefined;
  if (side === "sale") return equal(source.saleUnitPrice,product.sales?.unitPrice) && source.unit === (product.sales?.unit ?? product.unit ?? "ud") ? source : undefined;
  return equal(source.netUnitCost,product.purchase?.netUnitCost ?? product.cost)
    && equal(source.listPrice,product.purchase?.listPrice ?? product.pvp)
    && equal(source.discountPercent,product.purchase?.discountPercent)
    && source.unit === (product.purchase?.unit ?? product.unit ?? "ud")
    && (source.supplierName ?? "") === (product.purchase?.supplierName ?? product.supplierName ?? "") ? source : undefined;
}
export function priceSourceLabel(product: Product, side: "purchase" | "sale" = "purchase"): string {
  const source = currentPriceSource(product,side);
  if (source) return `${PRICE_SOURCE_LABELS[source.kind]}${source.supplierName ? ` · ${source.supplierName}` : ""}${source.documentNumber ? ` · ${source.documentNumber}` : ""}`;
  return "Origen del precio no documentado";
}
export function salePriceWithVat(net: number | null | undefined, vat: number | null | undefined): number | null {
  return net != null && vat != null && Number.isFinite(net) && Number.isFinite(vat) && net >= 0 && vat >= 0 && vat <= 100 ? Math.round((net*(1+vat/100)+Number.EPSILON)*100)/100 : null;
}
function purchaseSignature(p: Product) { return [p.purchase?.netUnitCost??p.cost,p.purchase?.listPrice??p.pvp,p.purchase?.discountPercent,p.purchase?.unit??p.unit??"ud",p.purchase?.supplierName??p.supplierName??""]; }
export function withPriceSourceSummary(p: Product): Product {
  if(!currentPriceSource(p)){if(!p.priceSourceSummary)return p;const next={...p};delete next.priceSourceSummary;return next;}
  return {...p,priceSourceSummary:{purchase:priceSourceLabel(p),purchaseSignature:JSON.stringify(purchaseSignature(p))}};
}
export function summaryPriceSourceLabel(p: Product): string {return p.priceSourceSummary?.purchaseSignature===JSON.stringify(purchaseSignature(p)) ? p.priceSourceSummary.purchase : "Origen del precio no documentado";}
function saleSignature(p: Product) { return [p.sales?.unitPrice,p.sales?.unit??p.unit??"ud",p.sales?.ivaPercent??p.ivaPercent]; }
/** Only called during an explicit save. Loading an old product never fabricates evidence. */
export function recordManualPriceChange(before: Product, after: Product, now: string): Product {
  const purchase = JSON.stringify(purchaseSignature(before)) !== JSON.stringify(purchaseSignature(after)) && !currentPriceSource(after);
  const sale = JSON.stringify(saleSignature(before)) !== JSON.stringify(saleSignature(after)) && !currentPriceSource(after,"sale");
  if (!purchase && !sale) return withPriceSourceSummary(after);
  const sources = productPriceSources(after);
  if (sources.length >= 200) throw new Error("La ficha ya tiene 200 fuentes de precio. Conserva su historial antes de añadir otra.");
  const source: ProductPriceSource = {id:`manual:${after.id}:${now}:${sources.length}`,kind:"manual",recordedAt:now,unit:purchase?(after.purchase?.unit??after.unit??"ud"):(after.sales?.unit??after.unit??"ud"),
    supplierName:after.purchase?.supplierName??after.supplierName,supplierReference:after.purchase?.supplierReference,
    ...(purchase?{listPrice:after.purchase?.listPrice??after.pvp,discountPercent:after.purchase?.discountPercent,netUnitCost:after.purchase?.netUnitCost??after.cost}:{}),
    ...(sale?{saleUnitPrice:after.sales?.unitPrice}:{}),ivaPercent:after.sales?.ivaPercent??after.ivaPercent};
  // Separate units must never claim the same price evidence.
  if (purchase && sale && (after.purchase?.unit??after.unit??"ud") !== (after.sales?.unit??after.unit??"ud")) {
    const saleOnly = {...after,salePriceSourceId:undefined};
    const withPurchase = {...saleOnly,priceSources:[...sources,{...source,saleUnitPrice:undefined}],purchasePriceSourceId:source.id};
    return recordManualPriceChange({...after,sales:before.sales},withPurchase,now);
  }
  return withPriceSourceSummary({...after,priceSources:[...sources,source],...(purchase?{purchasePriceSourceId:source.id}:{}),...(sale?{salePriceSourceId:source.id}:{})});
}
export function mergedPriceSources(products: Product[]): ProductPriceSource[] {
  const result=new Map<string,ProductPriceSource>();
  for(const p of products)for(const source of productPriceSources(p)){
    const previous=result.get(source.id);
    if(previous&&JSON.stringify(previous)!==JSON.stringify(source))throw new Error("Dos fuentes de precio tienen el mismo identificador y datos distintos. Revisa su origen antes de fusionar.");
    result.set(source.id,source);
  }
  if(result.size>200)throw new Error("La fusión supera 200 fuentes de precio; conserva el historial antes de continuar.");
  return [...result.values()];
}
export function recordManualProductCreation(p: Product, now: string): Product {
  if(p.source!=="manual")return p;
  return recordManualPriceChange({...p,cost:undefined,pvp:undefined,sales:p.sales?{...p.sales,unitPrice:undefined}:undefined,purchase:p.purchase?{...p.purchase,listPrice:undefined,discountPercent:undefined,netUnitCost:undefined}:undefined},p,now);
}
