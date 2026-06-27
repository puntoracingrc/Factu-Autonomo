import { createElement } from "react";
import type { HiddenImportRestoreUiShellHarnessProps } from "@/lib/local-data-safety";
import { ImportRestoreDecisionPacketPanel } from "./ImportRestoreDecisionPacketPanel";
import { ImportRestoreDisabledActionBar } from "./ImportRestoreDisabledActionBar";
import { ImportRestorePreviewPanel } from "./ImportRestorePreviewPanel";
import { ImportRestoreRiskPanel } from "./ImportRestoreRiskPanel";

// PHASE2D82_ROUTELESS_IMPORT_RESTORE_COMPOSITION_ROOT_V1

export interface ImportRestoreRoutelessShellProps extends HiddenImportRestoreUiShellHarnessProps {
  onBlockedAction?: (actionId: string) => void;
}

const h = createElement;

export function ImportRestoreRoutelessShell(props: ImportRestoreRoutelessShellProps) {
  return h(
    "section",
    {
      "aria-labelledby": "import-restore-routeless-shell-title",
      className: "space-y-4 rounded-lg border border-slate-300 bg-white p-4 text-slate-900",
      "data-phase-marker": "PHASE2D82_ROUTELESS_IMPORT_RESTORE_COMPOSITION_ROOT_V1",
      "data-hidden-shell": "true",
      "data-hidden-routeless": "true",
    },
    h(
      "header",
      { className: "space-y-2" },
      h(
        "p",
        {
          role: "status",
          className: "rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold uppercase text-slate-600",
        },
        "Hidden/routeless preview shell",
      ),
      h("h2", { id: "import-restore-routeless-shell-title", className: "text-lg font-bold text-slate-950" }, "Import/restore preview interno"),
      h("p", { className: "text-sm text-slate-600" }, "Composicion sintetica no navegable, sin acciones reales."),
    ),
    h(
      "div",
      { className: "grid gap-4 lg:grid-cols-[1fr_22rem]" },
      h(
        "div",
        { className: "space-y-4" },
        h(ImportRestorePreviewPanel, { viewModel: props.viewModel }),
        h(ImportRestoreRiskPanel, { viewModel: props.viewModel, warnings: props.warnings }),
      ),
      h(
        "aside",
        { className: "space-y-4", "aria-label": "Decision y acciones deshabilitadas" },
        h(ImportRestoreDecisionPacketPanel, { report: props.decisionReport }),
        h(ImportRestoreDisabledActionBar, { actionBar: props.actionBar }),
      ),
    ),
  );
}
