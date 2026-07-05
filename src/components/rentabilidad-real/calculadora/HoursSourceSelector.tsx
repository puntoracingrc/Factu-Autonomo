"use client";

import { documentTotals, formatMoney } from "@/lib/calculations";
import type { RentabilidadRealHoursSourceType } from "@/lib/rentabilidad-real/calculation";
import { rentabilidadRealDocumentClientName } from "@/lib/rentabilidad-real/document-client";
import type { Document } from "@/lib/types";

export function HoursSourceSelector({
  sourceType,
  documents,
  selectedDocumentId,
  onSourceTypeChange,
  onSelectedDocumentChange,
}: {
  sourceType: RentabilidadRealHoursSourceType;
  documents: Document[];
  selectedDocumentId?: string;
  onSourceTypeChange: (sourceType: RentabilidadRealHoursSourceType) => void;
  onSelectedDocumentChange: (documentId: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
        <button
          type="button"
          onClick={() => onSourceTypeChange("document")}
          className={`min-h-11 rounded-md px-3 text-sm font-black transition-colors ${
            sourceType === "document"
              ? "bg-white text-blue-700 shadow-sm dark:bg-slate-950 dark:text-blue-200"
              : "text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-700"
          }`}
        >
          Documento existente
        </button>
        <button
          type="button"
          onClick={() => onSourceTypeChange("manual")}
          className={`min-h-11 rounded-md px-3 text-sm font-black transition-colors ${
            sourceType === "manual"
              ? "bg-white text-blue-700 shadow-sm dark:bg-slate-950 dark:text-blue-200"
              : "text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-700"
          }`}
        >
          Manual local
        </button>
      </div>

      {sourceType === "document" ? (
        <label className="block">
          <span className="text-sm font-black text-slate-950 dark:text-slate-50">
            Factura o presupuesto
          </span>
          <select
            value={selectedDocumentId ?? ""}
            onChange={(event) => onSelectedDocumentChange(event.target.value)}
            className="mt-2 min-h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            {documents.length === 0 ? (
              <option value="">No hay documentos disponibles</option>
            ) : null}
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.number} · {rentabilidadRealDocumentClientName(doc)} ·{" "}
                {formatMoney(documentTotals(doc).subtotal)} base
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm font-semibold text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/35 dark:text-sky-100">
          El modo manual es una simulación local. No crea facturas, gastos ni
          impuestos.
        </p>
      )}
    </div>
  );
}
