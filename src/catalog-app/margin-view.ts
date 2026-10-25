import type {Product} from "@/lib/types";
import {catalogMargin} from "@/lib/product-catalog-lite/margin";
const esc=(v:unknown)=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
const money=(v:number)=>new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR"}).format(v);
export function marginView(product:Product,input:Parameters<typeof catalogMargin>[1]):string {
  const result=catalogMargin(product,input);
  if ("pending" in result) return `<p class="hint">${esc(result.pending)}</p>`;
  const r=result,pct=r.percent===null?"Porcentaje no calculable con venta a cero":`${new Intl.NumberFormat("es-ES",{maximumFractionDigits:2}).format(r.percent)} % sobre la venta`;
  return `<p class="margin-caption">Por ${esc(r.unit)} de venta · coste tras descuento</p><div class="margin-main ${r.margin<0?"margin-loss":""}"><strong>${esc(money(r.margin))}</strong><span>${r.margin<0?"Pérdida bruta estimada":"Margen bruto sin IVA"}</span><b>${esc(pct)}</b></div><dl class="margin-breakdown"><div><dt>Venta sin IVA</dt><dd>${esc(money(r.sale))}</dd></div><div><dt>Coste neto sin IVA / ${esc(r.unit)}</dt><dd>${esc(money(r.cost))}</dd></div><div><dt>Venta con IVA</dt><dd>${r.grossSale===null?"IVA de venta pendiente":esc(money(r.grossSale))}</dd></div><div><dt>Coste con IVA / ${esc(r.unit)}</dt><dd>${r.grossCost===null?"IVA de compra pendiente":esc(money(r.grossCost))}</dd></div>${r.grossDifference===null?"":`<div><dt>Diferencia con IVA</dt><dd>${esc(money(r.grossDifference))}</dd></div><div><dt>Parte de esa diferencia correspondiente al IVA</dt><dd>${esc(money(r.vatDifference!))}</dd></div>`}</dl>${r.converted?`<p class="hint">Equivalencia configurada: 1 unidad de compra = ${esc(r.factor)} ${esc(r.unit)} de venta.</p>`:""}<p class="hint">Estimación antes de mano de obra, transporte y otros gastos. El IVA se desglosa aparte del margen. Depende del coste y del PVP indicados en esta ficha.</p>`;
}
