import type { Product } from "@/lib/types";
import { convertedProductCost, discountedProductCost, grossProductPrice } from "./decimal-prices";

type Margin = { pending: string } | {
  unit: string; cost: number; sale: number; margin: number; percent: number | null;
  grossSale: number | null; grossCost: number | null; grossDifference: number | null;
  vatDifference: number | null; converted: boolean; factor: number;
};
const valid = (n: number | undefined) => n !== undefined && Number.isFinite(n) && n >= 0 && n <= 1e12;
const validVat = (n: number | undefined) => valid(n) && n! <= 100;
function unitKey(unit: string) {
  const key=unit.trim().toLowerCase().replace(/\s+/g, "").replace(/²/g,"2").replace(/³/g,"3");
  if (["ud","uds","u","unidad","unidades"].includes(key)) return "ud";
  if (["m","ml","metro","metros"].includes(key)) return "m";
  return key;
}
const difference=(a:number,b:number)=>(Math.round(a*100)-Math.round(b*100))/100;

/** A read-only estimate. The stored cost is already discounted; no tariff/PVP fallback. */
export function catalogMargin(product: Product, input: {
  sale: number | undefined; cost: number | undefined; saleVat: number | undefined; unit: string;
}): Margin {
  if (!valid(input.sale) || !valid(input.cost)) return {pending:"Indica el PVP de venta y el coste neto para calcular el margen."};
  const saleUnit=unitKey(input.unit),originalUnit=unitKey(product.sales?.unit ?? product.unit ?? "ud");
  const purchaseUnit=unitKey(product.purchase?.unit ?? product.unit ?? product.sales?.unit ?? "ud");
  if (!saleUnit || !purchaseUnit || saleUnit!==originalUnit) return {pending:"Revisa la equivalencia de unidades de compra y venta en la ficha completa de Factu."};
  const explicitFactor=product.purchase?.purchaseToSaleFactor;
  const factor=explicitFactor ?? (saleUnit===purchaseUnit ? 1 : undefined);
  if (!valid(factor) || factor!<=0) return {pending:"Falta una equivalencia válida entre la unidad de compra y la de venta."};
  const cost=convertedProductCost(input.cost!,factor!),sale=discountedProductCost(input.sale!,0);
  if (!valid(cost)) return {pending:"Revisa el coste y la equivalencia de unidades antes de calcular el margen."};
  const margin=difference(sale,cost),purchaseVat=product.purchase?.ivaPercent ?? product.ivaPercent;
  const grossSale=validVat(input.saleVat)?grossProductPrice(sale,input.saleVat!):null;
  const grossCost=validVat(purchaseVat)?grossProductPrice(cost,purchaseVat!):null;
  const grossDifference=grossSale!==null&&grossCost!==null?difference(grossSale,grossCost):null;
  return {unit:input.unit.trim(),cost,sale,margin,percent:sale>0?margin/sale*100:null,grossSale,grossCost,grossDifference,
    vatDifference:grossDifference!==null?difference(grossDifference,margin):null,converted:factor!==1||saleUnit!==purchaseUnit,factor:factor!};
}
