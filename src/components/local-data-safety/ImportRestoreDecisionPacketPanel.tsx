import { createElement } from "react";
import type { ImportRestoreDecisionReport } from "@/lib/local-data-safety";

// PHASE2D86_IMPORT_RESTORE_DECISION_PACKET_PANEL_COMPOSITION_V1

export interface ImportRestoreDecisionPacketPanelProps {
  report: ImportRestoreDecisionReport;
}

const h = createElement;

export function ImportRestoreDecisionPacketPanel({ report }: ImportRestoreDecisionPacketPanelProps) {
  return h(
    "section",
    {
      "aria-labelledby": "import-restore-decision-panel-title",
      className: "space-y-3 rounded-lg border border-slate-200 bg-white p-4",
      "data-phase-marker": "PHASE2D86_IMPORT_RESTORE_DECISION_PACKET_PANEL_COMPOSITION_V1",
    },
    h("h3", { id: "import-restore-decision-panel-title", className: "text-sm font-bold text-slate-950" }, "Paquete de decision"),
    h(
      "dl",
      { className: "grid gap-2 sm:grid-cols-3" },
      h("div", null, h("dt", { className: "text-xs text-slate-500" }, "Gate"), h("dd", { className: "text-sm font-semibold" }, report.gateSummary.status)),
      h("div", null, h("dt", { className: "text-xs text-slate-500" }, "Aprobaciones"), h("dd", { className: "text-sm font-semibold" }, report.approvalStateSummary.state)),
      h("div", null, h("dt", { className: "text-xs text-slate-500" }, "Notas"), h("dd", { className: "text-sm font-semibold" }, `${report.reviewerNotesSummary.accepted}/${report.reviewerNotesSummary.total}`)),
    ),
    h(
      "ol",
      { className: "space-y-1 text-sm text-slate-600" },
      report.nextSteps.map((step) => h("li", { key: step }, step)),
    ),
  );
}
