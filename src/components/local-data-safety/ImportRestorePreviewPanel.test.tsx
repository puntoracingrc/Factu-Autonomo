import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildHiddenImportRestoreUiShellHarnessProps } from "@/lib/local-data-safety";
import { ImportRestorePreviewPanel } from "./ImportRestorePreviewPanel";

// PHASE2D84_IMPORT_RESTORE_PREVIEW_PANEL_COMPOSITION_V1

describe("ImportRestorePreviewPanel", () => {
  it("renders safe counters, list and pagination labels", () => {
    const props = buildHiddenImportRestoreUiShellHarnessProps({ generatedAt: "2026-06-27T00:00:00.000Z" });
    const html = renderToStaticMarkup(createElement(ImportRestorePreviewPanel, { viewModel: props.viewModel }));

    expect(html).toContain("PHASE2D84_IMPORT_RESTORE_PREVIEW_PANEL_COMPOSITION_V1");
    expect(html).toContain("Vista previa sintetica");
    expect(html).toContain("Pagina");
    expect(html).not.toContain("href=");
    expect(html).not.toMatch(/documentSnapshot|rawJson|authorization|cookie/i);
  });

  it("renders an empty state", () => {
    const props = buildHiddenImportRestoreUiShellHarnessProps({ generatedAt: "2026-06-27T00:00:00.000Z" });
    const viewModel = {
      ...props.viewModel,
      previewList: { ...props.viewModel.previewList, items: [], totalItems: 0 },
    };
    const html = renderToStaticMarkup(createElement(ImportRestorePreviewPanel, { viewModel }));

    expect(html).toContain("Sin elementos de vista previa.");
  });
});
