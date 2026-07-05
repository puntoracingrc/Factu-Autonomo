"use client";

import { AlertTriangle, Info } from "lucide-react";
import type { RentabilidadRealCalculationWarning } from "@/lib/rentabilidad-real/calculation";

function warningClass(severity: RentabilidadRealCalculationWarning["severity"]) {
  if (severity === "risk") {
    return "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/35 dark:text-rose-100";
  }
  if (severity === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-100";
  }
  return "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/35 dark:text-sky-100";
}

export function ReportsWarnings({
  warnings,
}: {
  warnings: RentabilidadRealCalculationWarning[];
}) {
  if (warnings.length === 0) return null;

  return (
    <div className="space-y-2">
      {warnings.map((warning) => {
        const Icon = warning.severity === "info" ? Info : AlertTriangle;
        return (
          <div
            key={`${warning.code}-${warning.message}`}
            className={`rounded-lg border p-4 text-sm leading-6 ${warningClass(warning.severity)}`}
          >
            <div className="flex items-start gap-2">
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="font-semibold">{warning.message}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
