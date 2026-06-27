import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildHiddenImportRestoreUiShellHarnessProps } from "@/lib/local-data-safety";
import { ImportRestoreDisabledActionBar } from "./ImportRestoreDisabledActionBar";

// PHASE2D87_IMPORT_RESTORE_DISABLED_ACTION_BAR_COMPOSITION_V1

describe("ImportRestoreDisabledActionBar", () => {
  it("renders all actions disabled with visible reasons", () => {
    const props = buildHiddenImportRestoreUiShellHarnessProps({ generatedAt: "2026-06-27T00:00:00.000Z" });
    const html = renderToStaticMarkup(createElement(ImportRestoreDisabledActionBar, { actionBar: props.actionBar }));

    expect(html).toContain("PHASE2D87_IMPORT_RESTORE_DISABLED_ACTION_BAR_COMPOSITION_V1");
    expect(html).toContain("Aplicar importacion");
    expect(html).toContain("Aplicar restauracion");
    expect(html).toContain("aria-disabled=\"true\"");
    expect(html).toContain("disabled");
    expect(html).not.toContain("href=");
  });
});
