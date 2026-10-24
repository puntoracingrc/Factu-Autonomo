import {salePriceWithVat} from "@/lib/product-price-sources";

type PriceStatus = {kind:"pvp"|"cost-only"|"vat-pending"|"unpriced";label:string;symbol:string};
const known=(value:number|null|undefined)=>value!=null&&Number.isFinite(value)&&value>=0&&value<=1e12;

/** Uses the sale price, never the supplier tariff or a markup inferred from cost. */
export function catalogPriceStatus(salePrice:number|null|undefined,cost:number|null|undefined,vat:number|null|undefined):PriceStatus {
  if(salePriceWithVat(salePrice,vat)!==null)return {kind:"pvp",label:"PVP disponible",symbol:"✓"};
  if(known(salePrice))return {kind:"vat-pending",label:"Venta sin IVA · IVA pendiente",symbol:"!"};
  if(known(cost))return {kind:"cost-only",label:"Solo coste · PVP pendiente",symbol:"!"};
  return {kind:"unpriced",label:"Sin precios",symbol:"—"};
}
