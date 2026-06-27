import { createElement } from "react";
import type {
  ImportRestoreDataLossWarningsModel,
  ImportRestoreReviewViewModel,
} from "@/lib/local-data-safety";

// PHASE2D85_IMPORT_RESTORE_RISK_PANEL_COMPOSITION_V1

export interface ImportRestoreRiskPanelProps {
  viewModel: ImportRestoreReviewViewModel;
  warnings: ImportRestoreDataLossWarningsModel;
}

const h = createElement;

function warningTitle(warning: ImportRestoreDataLossWarningsModel["warnings"][number]): string {
  return warning.id === "apply_disabled" ? "Acciones reales deshabilitadas" : warning.title;
}

function warningBody(warning: ImportRestoreDataLossWarningsModel["warnings"][number]): string {
  return warning.id === "apply_disabled"
    ? "Esta composicion solo muestra revision sintetica; no ejecuta cambios sobre datos."
    : warning.body;
}

export function ImportRestoreRiskPanel({ viewModel, warnings }: ImportRestoreRiskPanelProps) {
  return h(
    "section",
    {
      "aria-labelledby": "import-restore-risk-panel-title",
      className: "space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4",
      "data-phase-marker": "PHASE2D85_IMPORT_RESTORE_RISK_PANEL_COMPOSITION_V1",
    },
    h("h3", { id: "import-restore-risk-panel-title", className: "text-sm font-bold text-amber-950" }, "Riesgos y revision"),
    h("p", { className: "text-sm text-amber-900" }, `Severidad: ${viewModel.severity}. Revision manual: ${viewModel.counters.risks > 0 ? "requerida" : "no requerida para este caso sintetico"}.`),
    h("p", { className: "text-sm text-amber-900" }, viewModel.protectedDocumentsSummary),
    h(
      "ul",
      { className: "space-y-2" },
      warnings.warnings.map((warning) =>
        h(
          "li",
          { key: warning.id, className: "rounded-lg border border-amber-200 bg-white p-3" },
          h("p", { className: "text-sm font-semibold text-amber-950" }, warningTitle(warning)),
          h("p", { className: "text-xs text-amber-800" }, warningBody(warning)),
        ),
      ),
    ),
  );
}
