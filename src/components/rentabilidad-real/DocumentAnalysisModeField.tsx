"use client";

import type { RentabilidadRealDocumentAnalysisMode } from "@/lib/rentabilidad-real/document-analysis-modes";
import { getDocumentAnalysisModeLabel } from "@/lib/rentabilidad-real/document-analysis-modes";

export interface DocumentAnalysisModeOption {
  value: RentabilidadRealDocumentAnalysisMode;
  label?: string;
}

export function DocumentAnalysisModeField({
  value,
  options,
  onChange,
}: {
  value: RentabilidadRealDocumentAnalysisMode;
  options: DocumentAnalysisModeOption[];
  onChange: (mode: RentabilidadRealDocumentAnalysisMode) => void;
}) {
  return (
    <label className="block rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
      <span className="text-sm font-black text-slate-950 dark:text-slate-50">
        Cómo analizar este documento
      </span>
      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value as RentabilidadRealDocumentAnalysisMode)
        }
        className="mt-2 min-h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label ?? getDocumentAnalysisModeLabel(option.value)}
          </option>
        ))}
      </select>
    </label>
  );
}
