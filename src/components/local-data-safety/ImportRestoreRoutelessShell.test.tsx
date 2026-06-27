import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildHiddenImportRestoreUiShellHarnessProps } from "@/lib/local-data-safety";
import { ImportRestoreRoutelessShell } from "./ImportRestoreRoutelessShell";

// PHASE2D82_ROUTELESS_IMPORT_RESTORE_COMPOSITION_ROOT_V1

describe("ImportRestoreRoutelessShell", () => {
  it("renders the hidden routeless composition with synthetic fixture data", () => {
    const props = buildHiddenImportRestoreUiShellHarnessProps({
      selectedFixtureId: "SYNTHETIC_ONLY_DRAFTS_ONLY_BACKUP",
      generatedAt: "2026-06-27T00:00:00.000Z",
      flagInput: {
        envLike: {
          IMPORT_RESTORE_HIDDEN_UI_SHELL_ENABLED: "true",
          IMPORT_RESTORE_HIDDEN_UI_SHELL_MODE: "routeless_preview_only",
        },
        runtime: "test",
      },
    });
    const html = renderToStaticMarkup(createElement(ImportRestoreRoutelessShell, props));

    expect(html).toContain("PHASE2D82_ROUTELESS_IMPORT_RESTORE_COMPOSITION_ROOT_V1");
    expect(html).toContain("Hidden/routeless preview shell");
    expect(html).toContain("Vista previa sintetica");
    expect(html).toContain("Riesgos y revision");
    expect(html).toContain("Paquete de decision");
    expect(html).toContain("aria-disabled=\"true\"");
  });

  it("does not render links, routes, navigation or unsafe internals", () => {
    const props = buildHiddenImportRestoreUiShellHarnessProps({ generatedAt: "2026-06-27T00:00:00.000Z" });
    const html = renderToStaticMarkup(createElement(ImportRestoreRoutelessShell, props));

    expect(html).not.toContain("href=");
    expect(html).not.toContain("data-route");
    expect(html).not.toContain("SYNTHETIC_ONLY_DRAFT");
    expect(html).not.toContain("<script");
  });
});
