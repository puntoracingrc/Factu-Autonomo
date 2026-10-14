"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { prepareProductImage } from "@/lib/product-image";

export function ProductImageField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sequence = useRef(0);
  useEffect(() => () => { sequence.current++; }, []);
  return <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
    <label className="block text-sm font-bold text-slate-800">Imagen o esquema del producto (opcional)
      <input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy}
        className="mt-2 block w-full text-sm" onChange={async event => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          const current = ++sequence.current;
          setBusy(true); setError(null);
          try { const result = await prepareProductImage(file); if (sequence.current === current) onChange(result); }
          catch (cause) { if (sequence.current === current) setError(cause instanceof Error ? cause.message : "No se pudo leer la imagen."); }
          finally { if (sequence.current === current) setBusy(false); }
        }} />
    </label>
    <p className="text-xs text-slate-600">PNG, JPG o WebP, máximo 5 MB. Se guarda una ilustración compacta que se copia a las nuevas líneas del documento.</p>
    {busy ? <p role="status" className="text-sm text-blue-700">Preparando imagen…</p> : null}
    {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
    {value ? <div className="flex items-center gap-4"><Image src={value} alt="Esquema del producto" unoptimized width={112} height={112} className="h-28 w-28 rounded-lg border bg-white object-contain" /><button type="button" disabled={busy} onClick={()=>onChange("")} className="text-sm font-bold text-red-700">Quitar imagen</button></div> : null}
  </div>;
}
