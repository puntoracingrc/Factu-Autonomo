import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildHiddenImportRestoreUiShellHarnessProps } from "@/lib/local-data-safety";
import { ImportRestoreRiskPanel } from "./ImportRestoreRiskPanel";

// PHASE2D85_IMPORT_RESTORE_RISK_PANEL_COMPOSITION_V1

describe("ImportRestoreRiskPanel", () => {
  it("renders severity, warnings and protected document summary", () => {
    const props = buildHiddenImportRestoreUiShellHarnessProps({
      selectedFixtureId: "SYNTHETIC_ONLY_COUNTERS_MISMATCH_BACKUP",
      generatedAt: "2026-06-27T00:00:00.000Z",
    });
    const html = renderToStaticMarkup(
      createElement(ImportRestoreRiskPanel, { viewModel: props.viewModel, warnings: props.warnings }),
    );

    expect(html).toContain("PHASE2D85_IMPORT_RESTORE_RISK_PANEL_COMPOSITION_V1");
    expect(html).toContain("Riesgos y revision");
    expect(html).toContain("Severidad:");
    expect(html).not.toMatch(/seguro 100%|Aplicar importacion|Aplicar restauracion/i);
  });
});
