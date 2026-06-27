import { createElement } from "react";
import type { ImportRestoreDisabledActionsModel } from "@/lib/local-data-safety";

// PHASE2D87_IMPORT_RESTORE_DISABLED_ACTION_BAR_COMPOSITION_V1

export interface ImportRestoreDisabledActionBarProps {
  actionBar: ImportRestoreDisabledActionsModel;
}

const h = createElement;

export function ImportRestoreDisabledActionBar({ actionBar }: ImportRestoreDisabledActionBarProps) {
  return h(
    "section",
    {
      "aria-label": "Acciones ocultas deshabilitadas",
      className: "rounded-lg border border-slate-200 bg-slate-50 p-4",
      "data-phase-marker": "PHASE2D87_IMPORT_RESTORE_DISABLED_ACTION_BAR_COMPOSITION_V1",
    },
    h(
      "div",
      { className: "flex flex-wrap gap-2" },
      actionBar.actions.map((action) =>
        h(
          "button",
          {
            key: action.id,
            type: "button",
            disabled: true,
            "aria-disabled": "true",
            "aria-label": action.ariaDescription,
            "data-action-id": action.id,
            className: "min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-500",
          },
          action.label,
        ),
      ),
    ),
    h(
      "ul",
      { className: "mt-3 space-y-1 text-xs text-slate-500" },
      actionBar.actions.map((action) => h("li", { key: `${action.id}-reason` }, action.reason)),
    ),
  );
}
