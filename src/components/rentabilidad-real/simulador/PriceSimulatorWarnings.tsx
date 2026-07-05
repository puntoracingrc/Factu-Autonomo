"use client";

import { AlertTriangle, Info } from "lucide-react";
import type { RentabilidadRealPriceSimulatorWarning } from "@/lib/rentabilidad-real/price-simulator";

function warningClass(severity: RentabilidadRealPriceSimulatorWarning["severity"]) {
  if (severity === "risk") {
    return "border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/35 dark:text-red-100";
  }
  if (severity === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-100";
  }
  return "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/35 dark:text-blue-100";
}

export function PriceSimulatorWarnings({
  warnings,
}: {
  warnings: RentabilidadRealPriceSimulatorWarning[];
}) {
  if (warnings.length === 0) return null;

  return (
    <div className="space-y-2">
      {warnings.map((warning) => {
        const Icon = warning.severity === "info" ? Info : AlertTriangle;
        return (
          <div
            key={warning.code}
            className={`flex items-start gap-2 rounded-lg border p-3 text-sm font-semibold leading-6 ${warningClass(warning.severity)}`}
          >
            <Icon className="mt-1 h-4 w-4 shrink-0" />
            <p>{warning.message}</p>
          </div>
        );
      })}
    </div>
  );
}
