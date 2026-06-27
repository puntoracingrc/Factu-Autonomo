import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildHiddenImportRestoreUiShellHarnessProps } from "@/lib/local-data-safety";
import { ImportRestoreDecisionPacketPanel } from "./ImportRestoreDecisionPacketPanel";

// PHASE2D86_IMPORT_RESTORE_DECISION_PACKET_PANEL_COMPOSITION_V1

describe("ImportRestoreDecisionPacketPanel", () => {
  it("renders decision gate, approvals, reviewer notes and next steps", () => {
    const props = buildHiddenImportRestoreUiShellHarnessProps({ generatedAt: "2026-06-27T00:00:00.000Z" });
    const html = renderToStaticMarkup(createElement(ImportRestoreDecisionPacketPanel, { report: props.decisionReport }));

    expect(html).toContain("PHASE2D86_IMPORT_RESTORE_DECISION_PACKET_PANEL_COMPOSITION_V1");
    expect(html).toContain("Paquete de decision");
    expect(html).toContain("Gate");
    expect(html).toContain("Aprobaciones");
    expect(html).not.toMatch(/documentSnapshot|SYNTHETIC_ONLY_DRAFT|authorization|cookie/i);
  });
});
