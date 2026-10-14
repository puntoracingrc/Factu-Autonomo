"use client";

import { useEffect, useRef, useState } from "react";
import { useCompany } from "@/context/CompanyContext";
import { useAppStore } from "@/context/AppStore";
import { useWorkspaceStorage } from "@/context/WorkspaceStorageContext";
import { useCentralAuthorityPlanGate } from "@/hooks/useCentralAuthorityPlanGate";
import { useCentralProductCatalogStructure } from "@/hooks/useCentralProductCatalogStructure";
import { isActiveWorkspaceOwnerScope } from "@/lib/workspace-owner-runtime";
import { catalogAdmissionBatches, materializeCatalogProduct, parseProductImageCatalog, type ProductImageCatalog } from "@/lib/product-image-catalog";

export function ProductImageCatalogImport() {
  const { activeCompany } = useCompany();
  const { getCurrentData } = useAppStore();
  const scope = useWorkspaceStorage();
  const gate = useCentralAuthorityPlanGate();
  const { applyCatalogStructure } = useCentralProductCatalogStructure();
  const [catalog,setCatalog] = useState<ProductImageCatalog|null>(null);
  const [message,setMessage] = useState<string|null>(null);
  const [busy,setBusy] = useState(false);
  const sequence = useRef(0);
  const owner = scope.ownerScope;
  useEffect(()=>()=>{sequence.current++},[owner]);
  async function run() {
    if (!catalog || busy || gate.mode !== "central") return;
    const current=++sequence.current;
    const live=()=>sequence.current===current && isActiveWorkspaceOwnerScope(owner);
    const baseline=getCurrentData();
    const candidates=catalog.products.map(p=>materializeCatalogProduct(catalog.catalogId,p,owner,new Date().toISOString(),baseline.profile.iva.defaultRate));
    let added=0, skipped=0;
    setBusy(true);setMessage("Preparando la importación central…");
    try {
      for (const batch of catalogAdmissionBatches(candidates)) {
        if (!live()) return;
        const known=new Set(getCurrentData().products.map(p=>p.externalId));
        const pending=batch.filter(p=>!known.has(p.externalId));
        skipped+=batch.length-pending.length;
        if (!pending.length) continue;
        const result=await applyCatalogStructure({type:"import_products",products:pending});
        if (!live()) return;
        if (!result.ok) throw new Error(result.error);
        if (result.delivery!=="central_confirmed") throw new Error("El servidor todavía no ha confirmado el lote.");
        added+=result.result.productCount;
        setMessage(`Confirmados por el servidor: ${added}. Ya existentes: ${skipped}.`);
      }
      if (live()) setMessage(`Importación terminada en ${activeCompany?.name}: ${added} productos nuevos y ${skipped} ya existentes. No se ha reemplazado ninguna ficha ni documento.`);
    } catch (error) {
      if(live())setMessage(`${error instanceof Error ? error.message : "No se pudo completar la importación."} Confirmados: ${added}. Sincroniza antes de reintentar; las fichas confirmadas no se vuelven a crear.`);
    } finally {if(live())setBusy(false);}
  }
  return <details className="rounded-xl border border-slate-200 bg-white p-4">
    <summary className="cursor-pointer font-bold text-blue-700">Importar catálogo con imágenes</summary>
    <div className="mt-3 space-y-3">
      <p className="text-sm text-slate-600">Destino: <strong>{activeCompany?.name ?? "Sin empresa seleccionada"}</strong>. Solo crea fichas nuevas; no modifica productos existentes, facturas ni presupuestos.</p>
      <label className="block text-sm font-bold">Archivo de catálogo Factu (.json)<input className="mt-2 block w-full" type="file" accept="application/json,.json" disabled={busy || gate.mode!=="central"} onChange={async event=>{
        const file=event.target.files?.[0];event.target.value="";if(!file)return;
        const current=++sequence.current;
        try {if(file.size>20*1024*1024)throw new Error("El catálogo supera 20 MB.");const parsed=parseProductImageCatalog(JSON.parse(await file.text()));if(sequence.current===current){setCatalog(parsed);setMessage(null);}}
        catch(error){if(sequence.current===current){setCatalog(null);setMessage(error instanceof Error?error.message:"No se pudo abrir el catálogo.");}}
      }}/></label>
      {catalog ? <><p className="font-bold">{catalog.products.length} fichas con imagen, sin precios inventados.</p><div className="max-h-44 overflow-auto rounded border p-2 text-xs">{catalog.products.map(p=><p key={p.sourceId}><strong>{p.sku}</strong> · {p.name}</p>)}</div><button type="button" disabled={busy || gate.mode!=="central"} onClick={()=>void run()} className="rounded-lg bg-blue-600 px-4 py-3 font-bold text-white disabled:opacity-50">{busy?"Importando…":`Importar en ${activeCompany?.name}`}</button></> : null}
      {gate.mode!=="central"?<p className="text-sm text-slate-600">La importación necesita una empresa conectada al servidor central.</p>:null}
      {message?<p role="status" aria-live="polite" className="text-sm font-semibold text-slate-700">{message}</p>:null}
    </div>
  </details>;
}
