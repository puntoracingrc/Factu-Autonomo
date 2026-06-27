import { createElement } from "react";
import type { ImportRestoreReviewViewModel } from "@/lib/local-data-safety";

// PHASE2D84_IMPORT_RESTORE_PREVIEW_PANEL_COMPOSITION_V1

export interface ImportRestorePreviewPanelProps {
  viewModel: ImportRestoreReviewViewModel;
}

const h = createElement;

export function ImportRestorePreviewPanel({ viewModel }: ImportRestorePreviewPanelProps) {
  return h(
    "section",
    {
      "aria-labelledby": "import-restore-preview-panel-title",
      className: "space-y-3 rounded-lg border border-slate-200 bg-white p-4",
      "data-phase-marker": "PHASE2D84_IMPORT_RESTORE_PREVIEW_PANEL_COMPOSITION_V1",
    },
    h("h3", { id: "import-restore-preview-panel-title", className: "text-sm font-bold text-slate-950" }, "Vista previa sintetica"),
    h(
      "dl",
      { className: "grid gap-2 sm:grid-cols-4" },
      h("div", null, h("dt", { className: "text-xs text-slate-500" }, "Estado"), h("dd", { className: "text-sm font-semibold" }, viewModel.status)),
      h("div", null, h("dt", { className: "text-xs text-slate-500" }, "Secciones"), h("dd", { className: "text-sm font-semibold" }, viewModel.counters.sections)),
      h("div", null, h("dt", { className: "text-xs text-slate-500" }, "Protegidos"), h("dd", { className: "text-sm font-semibold" }, viewModel.counters.protectedDocuments)),
      h("div", null, h("dt", { className: "text-xs text-slate-500" }, "Riesgos"), h("dd", { className: "text-sm font-semibold" }, viewModel.counters.risks)),
    ),
    viewModel.previewList.items.length === 0
      ? h("p", { className: "text-sm text-slate-600" }, "Sin elementos de vista previa.")
      : h(
          "ul",
          { className: "space-y-2" },
          viewModel.previewList.items.map((item) =>
            h(
              "li",
              { key: item.id, className: "rounded-lg border border-slate-200 p-3" },
              h("p", { className: "text-sm font-semibold text-slate-900" }, item.label),
              h("p", { className: "text-xs text-slate-500" }, `${item.severity} / ${item.status} / ${item.count}`),
            ),
          ),
        ),
    h(
      "p",
      { className: "text-xs font-semibold text-slate-500" },
      `Pagina ${viewModel.previewList.page} de ${viewModel.previewList.totalPages}`,
    ),
  );
}
