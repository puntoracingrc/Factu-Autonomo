"use client";

import { documentTotals, formatMoney } from "@/lib/calculations";
import type { Document } from "@/lib/types";

export type WorkCalculatorSourceMode = "quote" | "invoice";

export function WorkSourceSelector({
  sourceMode,
  onSourceModeChange,
  documents,
  selectedDocumentId,
  onSelectedDocumentChange,
}: {
  sourceMode: WorkCalculatorSourceMode;
  onSourceModeChange: (mode: WorkCalculatorSourceMode) => void;
  documents: Document[];
  selectedDocumentId: string;
  onSelectedDocumentChange: (documentId: string) => void;
}) {
  const selectedDocument = documents.find((doc) => doc.id === selectedDocumentId);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-black text-slate-950 dark:text-slate-50">
          Origen del cálculo
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => onSourceModeChange("quote")}
            className={`min-h-11 rounded-md px-3 text-sm font-black transition-colors ${
              sourceMode === "quote"
                ? "bg-white text-blue-700 shadow-sm dark:bg-slate-950 dark:text-blue-200"
                : "text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            Presupuesto
          </button>
          <button
            type="button"
            onClick={() => onSourceModeChange("invoice")}
            className={`min-h-11 rounded-md px-3 text-sm font-black transition-colors ${
              sourceMode === "invoice"
                ? "bg-white text-blue-700 shadow-sm dark:bg-slate-950 dark:text-blue-200"
                : "text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            Factura
          </button>
        </div>
      </div>

      <label className="block">
        <span className="text-sm font-black text-slate-950 dark:text-slate-50">
          Documento existente
        </span>
        <select
          value={selectedDocumentId}
          onChange={(event) => onSelectedDocumentChange(event.target.value)}
          className="mt-2 min-h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        >
          {documents.length === 0 ? (
            <option value="">No hay documentos disponibles</option>
          ) : null}
          {documents.map((doc) => {
            const totals = documentTotals(doc);
            return (
              <option key={doc.id} value={doc.id}>
                {doc.number} · {doc.client.name} · {doc.date} ·{" "}
                {formatMoney(totals.subtotal)} base
              </option>
            );
          })}
        </select>
      </label>

      {selectedDocument ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
          <p className="font-black text-slate-950 dark:text-slate-50">
            {selectedDocument.number} · {selectedDocument.client.name}
          </p>
          <p className="mt-1">
            Fecha {selectedDocument.date}. Base{" "}
            {formatMoney(documentTotals(selectedDocument).subtotal)}. Total{" "}
            {formatMoney(documentTotals(selectedDocument).total)}.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-100">
          No hay documentos de este tipo para calcular todavía.
        </div>
      )}
    </div>
  );
}
