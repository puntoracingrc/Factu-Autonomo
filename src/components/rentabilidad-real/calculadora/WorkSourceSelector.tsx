"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { formatMoney, formatShortDate } from "@/lib/calculations";
import {
  filterRentabilidadRealWorkDocumentOptions,
  type RentabilidadRealWorkDocumentOption,
} from "@/lib/rentabilidad-real/work-calculator-view-model";

export type WorkCalculatorSourceMode = "quote" | "invoice";
const DOCUMENT_RESULT_LIMIT = 8;

export function WorkSourceSelector({
  sourceMode,
  onSourceModeChange,
  documentOptions,
  selectedDocumentId,
  onSelectedDocumentChange,
}: {
  sourceMode: WorkCalculatorSourceMode;
  onSourceModeChange: (mode: WorkCalculatorSourceMode) => void;
  documentOptions: RentabilidadRealWorkDocumentOption[];
  selectedDocumentId: string;
  onSelectedDocumentChange: (documentId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const selectedDocument = documentOptions.find(
    (doc) => doc.id === selectedDocumentId,
  );
  const filteredDocuments = useMemo(
    () => filterRentabilidadRealWorkDocumentOptions(documentOptions, search),
    [documentOptions, search],
  );
  const visibleDocuments = filteredDocuments.slice(0, DOCUMENT_RESULT_LIMIT);
  const hiddenDocumentCount = Math.max(
    filteredDocuments.length - visibleDocuments.length,
    0,
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-black text-slate-950 dark:text-slate-50">
          Origen del cálculo
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            aria-pressed={sourceMode === "quote"}
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
            aria-pressed={sourceMode === "invoice"}
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

      <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm leading-6 text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/35 dark:text-blue-100">
        Elige presupuesto si quieres comparar previsto vs real. Elige factura si
        quieres analizar un trabajo ya facturado.
      </div>

      <label className="block">
        <span className="text-sm font-black text-slate-950 dark:text-slate-50">
          Buscar documento
        </span>
        <span className="relative mt-2 block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Número, cliente, estado o importe"
            className="min-h-12 w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </span>
      </label>

      {documentOptions.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-100">
          No hay documentos de este tipo para calcular todavía.
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
          No hay documentos que coincidan con la búsqueda.
        </div>
      ) : (
        <div className="space-y-2" role="listbox" aria-label="Documento existente">
          {visibleDocuments.map((doc) => (
            <DocumentOptionButton
              key={doc.id}
              document={doc}
              selected={doc.id === selectedDocumentId}
              onClick={() => onSelectedDocumentChange(doc.id)}
            />
          ))}
          {hiddenDocumentCount > 0 ? (
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Mostrando los {DOCUMENT_RESULT_LIMIT} más recientes de{" "}
              {filteredDocuments.length}. Usa la búsqueda para afinar.
            </p>
          ) : null}
        </div>
      )}

      {selectedDocument ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
          <p className="font-black text-slate-950 dark:text-slate-50">
            {selectedDocument.number} · {selectedDocument.customerName}
          </p>
          <p className="mt-1">
            {selectedDocument.typeLabel} · {selectedDocument.statusLabel} ·{" "}
            {formatShortDate(selectedDocument.date)}. Base{" "}
            {formatMoney(selectedDocument.subtotal)}. Total{" "}
            {formatMoney(selectedDocument.total)}.
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-black uppercase text-slate-600 dark:text-slate-300">
            {selectedDocument.linkedDocumentLabel ? (
              <span className="rounded-full bg-white px-2 py-1 dark:bg-slate-950">
                {selectedDocument.linkedDocumentLabel}
              </span>
            ) : null}
            <span className="rounded-full bg-white px-2 py-1 dark:bg-slate-950">
              {selectedDocument.linkedExpensesCount} gasto(s) enlazado(s)
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DocumentOptionButton({
  document,
  selected,
  onClick,
}: {
  document: RentabilidadRealWorkDocumentOption;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onClick}
      className={`w-full rounded-lg border p-3 text-left transition-colors ${
        selected
          ? "border-blue-600 bg-blue-50 text-blue-950 dark:border-blue-500 dark:bg-blue-950/45 dark:text-blue-50"
          : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-800"
      }`}
    >
      <span className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {document.typeLabel}
            </span>
            <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-black uppercase text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              {document.statusLabel}
            </span>
          </span>
          <span className="mt-2 block truncate text-sm font-black">
            {document.number} · {document.customerName || "Sin cliente"}
          </span>
          <span className="mt-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
            {formatShortDate(document.date)}
            {document.linkedDocumentLabel
              ? ` · ${document.linkedDocumentLabel}`
              : ""}
            {` · ${document.linkedExpensesCount} gasto(s) enlazado(s)`}
          </span>
        </span>
        <span className="shrink-0 text-sm font-black tabular-nums">
          {formatMoney(document.subtotal)} base
        </span>
      </span>
    </button>
  );
}
