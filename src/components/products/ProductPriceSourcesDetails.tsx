"use client";
import { PRICE_SOURCE_LABELS, priceSourceLabel, productPriceSources } from "@/lib/product-price-sources";
import { formatMoney } from "@/lib/calculations";
import type { Product } from "@/lib/types";

export function ProductPriceSourcesDetails({ product }: {product?:Product}) {
  const sources=product?productPriceSources(product):[];
  return <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
    <h2 className="font-bold text-slate-950">Origen y comparación de precios</h2>
    <p className="text-sm font-semibold text-emerald-800">{product?priceSourceLabel(product):"Origen del precio no documentado"}</p>
    <p className="text-xs leading-relaxed text-slate-500">El alta de una ficha y el origen de su precio pueden ser distintos. Compara costes sin IVA de la misma referencia, unidad y características.</p>
    {sources.length?<div className="max-h-96 space-y-3 overflow-auto">{sources.map(source=><article key={source.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
      <strong className="block">{source.supplierName||"Proveedor no indicado"}</strong>
      <p>{PRICE_SOURCE_LABELS[source.kind]}{source.documentNumber?` · ${source.documentNumber}`:""}</p>
      <p className="break-words text-xs text-slate-500">{source.documentName||"Registro manual"} · {source.documentDate||"Fecha del documento no indicada"}</p>
      <p className="mt-2 font-bold">Coste sin IVA: {source.netUnitCost===undefined?"Sin indicar":formatMoney(source.netUnitCost)} / {source.unit}</p>
      {source.supplierReference?<p className="text-xs">Referencia proveedor: {source.supplierReference}</p>:null}
    </article>)}</div>:<p className="text-sm text-slate-500">No hay una fuente documentada en la ficha. Las compras registradas se muestran en el historial del producto.</p>}
  </section>;
}
