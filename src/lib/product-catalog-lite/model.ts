import type { Product, ProductAttribute, ProductPriceSource } from "@/lib/types";
import { productPriceSources, recordManualPriceChange, isProductPriceSource } from "@/lib/product-price-sources";

export interface CatalogSummary {
  id: string; version: number; name: string; sku: string; family: string; subfamily: string;
  salePrice: number | null; cost: number | null; unit: string; purchaseUnit: string; vat: number | null;
  supplierName?: string; priceOrigin?: string;
}
export interface CatalogRecord { product: Product; version: number }
export interface CatalogEdit {
  name: string; sku: string; family: string; subfamily: string; description: string;
  unit: string; salePrice: string; cost: string; vat: string; listPrice: string;
  discount: string; notes: string; attributes: ProductAttribute[];
  priceSources: ProductPriceSource[]; purchasePriceSourceId?: string; salePriceSourceId?: string;
}
export const CATALOG_PAGE_SIZE = 30;
const value = (n: number | undefined) => n === undefined ? "" : String(n).replace(".", ",");
export function catalogEdit(product: Product): CatalogEdit {
  return { name: product.name, sku: product.sku ?? "", family: product.family, subfamily: product.subfamily ?? "",
    description: product.sales?.description ?? "", unit: product.sales?.unit ?? product.unit ?? "ud",
    salePrice: value(product.sales?.unitPrice), cost: value(product.purchase?.netUnitCost ?? product.cost),
    vat: value(product.sales?.ivaPercent ?? product.ivaPercent), listPrice: value(product.purchase?.listPrice ?? product.pvp),
    discount: value(product.purchase?.discountPercent), notes: product.notes ?? "", attributes: structuredClone(product.attributes ?? []), priceSources: structuredClone(productPriceSources(product)),purchasePriceSourceId:product.purchasePriceSourceId,salePriceSourceId:product.salePriceSourceId };
}
export function catalogNumber(text: string, label: string, maximum = 1e12): number | undefined {
  const raw = text.trim(); if (!raw) return undefined;
  if (!/^\d+(?:[.,]\d+)?$/.test(raw)) throw new Error(`${label}: escribe un número válido, sin separador de miles.`);
  const n = Number(raw.replace(",", "."));
  if (!Number.isFinite(n) || n < 0 || n > maximum) throw new Error(`${label}: el importe está fuera de rango.`);
  return n;
}
export function updatedCatalogProduct(base: Product, edit: CatalogEdit, now: string): Product {
  const name = edit.name.trim(); if (!name || name.length > 300) throw new Error("Escribe un nombre de hasta 300 caracteres.");
  for (const [label,text,max] of [["Referencia",edit.sku,200],["Familia",edit.family,200],["Subfamilia",edit.subfamily,200],["Descripción",edit.description,5000],["Unidad",edit.unit,40],["Notas",edit.notes,10000]] as const) {
    if (text.length > max) throw new Error(`${label}: el texto es demasiado largo.`);
  }
  if (edit.attributes.length > 50 || edit.attributes.some(a => !a.label.trim() || a.label.length > 100 || a.value.length > 1000 || (a.unit?.length ?? 0) > 40)) throw new Error("Revisa las características: cada una necesita un nombre y un valor de longitud válida.");
  if (base.calculation?.kind && base.calculation.kind !== "none" && edit.unit.trim() !== (base.sales?.unit ?? base.unit ?? "ud")) throw new Error("La unidad de este producto depende de su cálculo por medidas. Cámbiala desde la ficha completa de Factu.");
  const salePrice = catalogNumber(edit.salePrice,"PVP de venta"), cost = catalogNumber(edit.cost,"Coste neto"), vat = catalogNumber(edit.vat,"IVA",100);
  const listPrice = catalogNumber(edit.listPrice,"Tarifa proveedor"), discount = catalogNumber(edit.discount,"Descuento",100);
  if (edit.priceSources.length>200 || edit.priceSources.some(s=>!isProductPriceSource(s)) || new Set(edit.priceSources.map(s=>s.id)).size!==edit.priceSources.length) throw new Error("Revisa las fuentes de precio de la ficha.");
  // Start with the complete central record. Fields outside this editor (images,
  // aliases, supplier identity, conversion factor, calculation) stay unchanged.
  return recordManualPriceChange(base,{ ...base, name, sku: edit.sku.trim() || undefined, family: edit.family.trim() || "Sin familia", subfamily: edit.subfamily.trim() || undefined,
    unit: edit.unit.trim() || "ud", cost, pvp: listPrice, ivaPercent: vat,
    sales: { ...base.sales, enabled: base.sales?.enabled ?? true, description: edit.description.trim() || undefined, unit: edit.unit.trim() || "ud", unitPrice: salePrice, ivaPercent: vat },
    purchase: { ...base.purchase, netUnitCost: cost, listPrice, discountPercent: discount },
    attributes: edit.attributes.map(a => ({...a, label:a.label.trim(), value:a.value.trim(), unit:a.unit?.trim() || undefined})),
    priceSources:edit.priceSources,purchasePriceSourceId:edit.purchasePriceSourceId,salePriceSourceId:edit.salePriceSourceId,
    notes: edit.notes.trim() || undefined, updatedAt: now },now);
}
// Only letters/numbers enter PostgREST's logical expression. Accent variants
// are generated here, never accepted as executable regex/filter syntax.
export function catalogSearchFilter(query: string): string | null {
  const words = query.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim().split(/\s+/).filter(Boolean).slice(0,8);
  if (!words.length) return null;
  const fields = ["name","sku","externalId","family","subfamily","sales->>description","purchase->>description","purchase->>supplierReference","purchase->>supplierName","attributes","notes","priceSourceSummary->>purchase"];
  const accents: Record<string,string> = {a:"[aáàäâ]",e:"[eéèëê]",i:"[iíìïî]",o:"[oóòöô]",u:"[uúùüû]",n:"[nñ]"};
  const groups = words.map(word => { const regex = [...word].map(c => accents[c] ?? c).join("");
    return `or(${fields.map(field => `current_payload${field.includes("->>") ? "->" : "->>"}${field}.imatch.${regex}`).join(",")})`; });
  return `and(${groups.join(",")})`;
}
