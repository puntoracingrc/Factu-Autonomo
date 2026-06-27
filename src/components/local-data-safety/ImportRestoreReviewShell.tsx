import { createElement } from "react";
import type {
  ImportRestoreReviewViewModel,
  LocalDataReviewSeverity,
  LocalDataSafetyUiShellScope,
  LocalDataSafetyUiShellScopeStatus,
} from "@/lib/local-data-safety";

// PHASE2D24_DISABLED_IMPORT_RESTORE_REACT_SHELL_V1

export interface ImportRestoreReviewShellProps {
  viewModel: ImportRestoreReviewViewModel;
  scope?: LocalDataSafetyUiShellScope;
}

const h = createElement;

function severityLabel(severity: LocalDataReviewSeverity): string {
  if (severity === "blocked") return "Bloqueado";
  if (severity === "warning") return "Requiere revision";
  return "Informativo";
}

function scopeLabel(status?: LocalDataSafetyUiShellScopeStatus): string {
  if (status === "ready_for_future_ui_integration_review") return "Pendiente de decision de conexion";
  if (status === "preview_only") return "Solo vista previa";
  if (status === "blocked") return "Bloqueado";
  return "Deshabilitado";
}

export function ImportRestoreReviewShell({
  viewModel,
  scope,
}: ImportRestoreReviewShellProps) {
  return h(
    "section",
    {
      "aria-labelledby": "import-restore-review-shell-title",
      className: "space-y-4 rounded-lg border border-amber-200 bg-white p-4 text-slate-900",
      "data-phase-marker": "PHASE2D24_DISABLED_IMPORT_RESTORE_REACT_SHELL_V1",
    },
    h(
      "header",
      { className: "space-y-3" },
      h(
        "div",
        {
          role: "status",
          "aria-live": "polite",
          className:
            "rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900",
        },
        h("span", null, viewModel.limitBanner.title),
        h("span", { className: "mx-2", "aria-hidden": true }, "/"),
        h("span", null, viewModel.limitBanner.body),
      ),
      h(
        "div",
        null,
        h("p", { className: "text-xs font-semibold uppercase text-slate-500" }, scopeLabel(scope?.status)),
        h(
          "h2",
          {
            id: "import-restore-review-shell-title",
            className: "text-xl font-bold text-slate-950",
          },
          viewModel.title,
        ),
        h("p", { className: "mt-1 text-sm text-slate-600" }, viewModel.subtitle),
      ),
    ),
    h(
      "dl",
      { className: "grid gap-2 sm:grid-cols-4" },
      h(
        "div",
        { className: "rounded-lg border border-slate-200 p-3" },
        h("dt", { className: "text-xs font-semibold text-slate-500" }, "Estado"),
        h("dd", { className: "text-sm font-bold" }, viewModel.status),
      ),
      h(
        "div",
        { className: "rounded-lg border border-slate-200 p-3" },
        h("dt", { className: "text-xs font-semibold text-slate-500" }, "Severidad"),
        h("dd", { className: "text-sm font-bold" }, severityLabel(viewModel.severity)),
      ),
      h(
        "div",
        { className: "rounded-lg border border-slate-200 p-3" },
        h("dt", { className: "text-xs font-semibold text-slate-500" }, "Protegidos"),
        h("dd", { className: "text-sm font-bold" }, viewModel.counters.protectedDocuments),
      ),
      h(
        "div",
        { className: "rounded-lg border border-slate-200 p-3" },
        h("dt", { className: "text-xs font-semibold text-slate-500" }, "Riesgos"),
        h("dd", { className: "text-sm font-bold" }, viewModel.counters.risks),
      ),
    ),
    h(
      "div",
      { className: "grid gap-4 lg:grid-cols-[1fr_18rem]" },
      h(
        "div",
        { className: "space-y-3" },
        viewModel.sections.map((section) =>
          h(
            "article",
            {
              key: section.id,
              "aria-label": section.title,
              className: "rounded-lg border border-slate-200 p-3",
            },
            h(
              "div",
              { className: "flex items-start justify-between gap-3" },
              h(
                "div",
                null,
                h("h3", { className: "text-sm font-bold text-slate-900" }, section.title),
                h("p", { className: "text-xs font-semibold text-slate-500" }, severityLabel(section.severity)),
              ),
              h(
                "span",
                { className: "rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700" },
                section.count,
              ),
            ),
            h(
              "ul",
              { className: "mt-2 space-y-1 text-sm text-slate-600" },
              section.messages.map((message) => h("li", { key: message }, message)),
            ),
          ),
        ),
      ),
      h(
        "aside",
        { className: "space-y-3", "aria-label": "Acciones deshabilitadas" },
        h(
          "div",
          { className: "rounded-lg border border-slate-200 p-3" },
          h("h3", { className: "text-sm font-bold text-slate-900" }, "Acciones"),
          h(
            "div",
            { className: "mt-3 space-y-2" },
            viewModel.disabledActions.actions.map((action) =>
              h(
                "button",
                {
                  key: action.id,
                  type: "button",
                  disabled: true,
                  "aria-disabled": "true",
                  "aria-label": action.ariaDescription,
                  className:
                    "min-h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-left text-sm font-semibold text-slate-500",
                },
                action.label,
              ),
            ),
          ),
        ),
        h(
          "div",
          { className: "rounded-lg border border-slate-200 p-3" },
          h("h3", { className: "text-sm font-bold text-slate-900" }, "Siguientes pasos"),
          h(
            "ol",
            { className: "mt-2 space-y-1 text-sm text-slate-600" },
            viewModel.nextSteps.map((step) => h("li", { key: step }, step)),
          ),
        ),
      ),
    ),
  );
}
