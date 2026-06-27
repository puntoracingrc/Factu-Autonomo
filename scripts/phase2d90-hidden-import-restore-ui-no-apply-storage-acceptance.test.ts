import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ImportRestoreDisabledActionBar } from "../src/components/local-data-safety/ImportRestoreDisabledActionBar";
import { ImportRestoreRoutelessShell } from "../src/components/local-data-safety/ImportRestoreRoutelessShell";
import { buildHiddenImportRestoreUiShellHarnessProps } from "../src/lib/local-data-safety";

// PHASE2D90_HIDDEN_IMPORT_RESTORE_UI_NO_APPLY_STORAGE_ACCEPTANCE_V1

const root = path.resolve(new URL("../", import.meta.url).pathname);
const componentDir = path.join(root, "src/components/local-data-safety");

function componentSources(): string {
  return fs
    .readdirSync(componentDir)
    .filter((entry) => /^ImportRestore.*\.tsx$/.test(entry) && !entry.includes(".test."))
    .map((entry) => fs.readFileSync(path.join(componentDir, entry), "utf8"))
    .join("\n");
}

describe("phase 2D.90 hidden import/restore UI no-apply/storage acceptance", () => {
  it("keeps import, restore and recovery actions disabled", () => {
    const props = buildHiddenImportRestoreUiShellHarnessProps({ generatedAt: "2026-06-27T00:00:00.000Z" });
    const html = renderToStaticMarkup(createElement(ImportRestoreDisabledActionBar, { actionBar: props.actionBar }));

    expect(html).toContain("data-action-id=\"apply_import\"");
    expect(html).toContain("data-action-id=\"apply_restore\"");
    expect(html).toContain("data-action-id=\"download_recovery_snapshot\"");
    expect(html.match(/aria-disabled="true"/g)?.length).toBe(props.actionBar.actions.length);
    expect(html).not.toMatch(/onClick|createObjectURL/);
  });

  it("has no browser storage, file reader or binary download APIs in components", () => {
    const source = componentSources();

    expect(source).not.toMatch(/localStorage|FileReader|showOpenFilePicker|Blob|createObjectURL|setItem|removeItem|clear\(/);
  });

  it("does not leak raw data through hidden shell markup", () => {
    const props = buildHiddenImportRestoreUiShellHarnessProps({
      selectedFixtureId: "SYNTHETIC_ONLY_MALFORMED_SHAPE_BACKUP",
      generatedAt: "2026-06-27T00:00:00.000Z",
    });
    const html = renderToStaticMarkup(createElement(ImportRestoreRoutelessShell, props));

    expect(html).not.toMatch(/documentSnapshot|pdfSnapshot|rawJson|fullPayload|authorization|cookie|privateKey/i);
    expect(props.applyImportAllowed).toBe(false);
    expect(props.applyRestoreAllowed).toBe(false);
    expect(props.rawDataIncluded).toBe(false);
  });
});
