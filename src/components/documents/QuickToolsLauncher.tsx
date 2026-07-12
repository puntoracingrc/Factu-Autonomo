"use client";

import { Calculator, StickyNote } from "lucide-react";
import { useQuickTools } from "./QuickToolsProvider";

export function QuickToolsLauncher({ compact = false }: { compact?: boolean }) {
  const { calculatorOpen, postItOpen, openCalculator, openPostIt } =
    useQuickTools();
  const buttonClass = compact
    ? "inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
    : "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

  return (
    <div
      className={
        compact
          ? "flex items-center justify-end gap-1.5"
          : "grid grid-cols-2 gap-2"
      }
      role="group"
      aria-label="Herramientas rápidas"
    >
      <button
        type="button"
        onClick={openCalculator}
        aria-label="Abrir calculadora rápida"
        aria-pressed={calculatorOpen}
        title="Calculadora"
        className={`${buttonClass} border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 focus-visible:outline-blue-500 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-100 dark:hover:bg-blue-900/60`}
      >
        <Calculator className="h-4 w-4" />
        {!compact ? <span>Calculadora</span> : null}
      </button>
      <button
        type="button"
        onClick={openPostIt}
        aria-label="Abrir post-it de notas rápidas"
        aria-pressed={postItOpen}
        title="Post-it"
        className={`${buttonClass} border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 focus-visible:outline-amber-600 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100 dark:hover:bg-amber-900/60`}
      >
        <StickyNote className="h-4 w-4" />
        {!compact ? <span>Post-it</span> : null}
      </button>
    </div>
  );
}
