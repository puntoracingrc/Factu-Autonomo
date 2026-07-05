"use client";

import { AlertTriangle, Info } from "lucide-react";
import type { RentabilidadRealCalculationWarning } from "@/lib/rentabilidad-real/calculation";

interface FriendlyWarning {
  key: string;
  message: string;
  severity: RentabilidadRealCalculationWarning["severity"];
}

const HIDDEN_WARNING_CODES = new Set([
  "invoice_without_quote",
  "unlinked_direct_costs_available",
  "unlinked_expenses_excluded_from_calculation",
  "fixed_expenses_allocated_by_rule",
  "vat_estimate_not_final",
  "irpf_estimate_not_final",
  "internal_adjustments_reduce_internal_profit_only",
  "internal_adjustments_do_not_change_taxes",
]);

function simplifyWorkWarnings(
  warnings: RentabilidadRealCalculationWarning[],
): FriendlyWarning[] {
  const items: FriendlyWarning[] = [];
  const codes = new Set(warnings.map((warning) => warning.code));

  if (codes.has("invoice_source_quote_not_found")) {
    items.push({
      key: "invoice_source_quote_not_found",
      message:
        "La factura apunta a un presupuesto que no encontramos. Puedes calcular igual, pero revisa el vínculo.",
      severity: "risk",
    });
  } else if (codes.has("quote_without_invoice")) {
    items.push({
      key: "quote_without_invoice",
      message:
        "Esto es un presupuesto: sirve para estimar, pero todavía no es resultado real.",
      severity: "info",
    });
  }

  if (
    codes.has("candidate_expenses_not_included") ||
    codes.has("no_linked_direct_costs")
  ) {
    items.push({
      key: "candidate_expenses_not_included",
      message:
        "Revisa los gastos de abajo. Solo cuentan los que enlaces a este trabajo.",
      severity: codes.has("no_linked_direct_costs") ? "warning" : "info",
    });
  }

  if (
    codes.has("fixed_cost_allocation_missing") ||
    codes.has("fixed_cost_allocation_incomplete")
  ) {
    items.push({
      key: "fixed_cost_allocation_missing",
      message:
        "Tienes gastos fijos, pero aquí no se están repartiendo todavía.",
      severity: "warning",
    });
  }

  if (codes.has("scanned_cost_review_recommended")) {
    items.push({
      key: "scanned_cost_review_recommended",
      message:
        "Hay gastos escaneados por IA. Revísalos antes de fiarte del margen.",
      severity: "info",
    });
  }

  for (const warning of warnings) {
    if (HIDDEN_WARNING_CODES.has(warning.code)) continue;
    if (items.some((item) => item.key === warning.code)) continue;
    if (
      warning.code === "candidate_expenses_not_included" ||
      warning.code === "no_linked_direct_costs" ||
      warning.code === "quote_without_invoice" ||
      warning.code === "invoice_source_quote_not_found" ||
      warning.code === "fixed_cost_allocation_missing" ||
      warning.code === "fixed_cost_allocation_incomplete" ||
      warning.code === "scanned_cost_review_recommended"
    ) {
      continue;
    }
    items.push({
      key: warning.code,
      message: warning.message,
      severity: warning.severity,
    });
  }

  return items.slice(0, 4);
}

export function WorkProfitabilityWarnings({
  warnings,
}: {
  warnings: RentabilidadRealCalculationWarning[];
}) {
  const friendlyWarnings = simplifyWorkWarnings(warnings);
  if (friendlyWarnings.length === 0) return null;
  const hasRisk = friendlyWarnings.some((warning) => warning.severity === "risk");
  const hasWarning = friendlyWarnings.some(
    (warning) => warning.severity === "warning",
  );

  return (
    <div
      className={`rounded-lg border p-4 text-sm leading-6 ${
        hasRisk
          ? "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/35 dark:text-rose-100"
          : hasWarning
            ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-100"
            : "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/35 dark:text-sky-100"
      }`}
    >
      <div className="flex items-start gap-2">
        {hasRisk || hasWarning ? (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        ) : (
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
        )}
        <div>
          <p className="font-black">Antes de fiarte del número</p>
          <ul className="mt-2 space-y-1 font-semibold">
            {friendlyWarnings.map((warning) => (
              <li key={warning.key}>- {warning.message}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
