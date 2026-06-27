import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ImportRestoreRoutelessShell } from "../src/components/local-data-safety/ImportRestoreRoutelessShell";
import { buildHiddenImportRestoreUiShellHarnessProps } from "../src/lib/local-data-safety";

// PHASE2D89_HIDDEN_IMPORT_RESTORE_UI_NO_ROUTE_ACCEPTANCE_V1

const root = path.resolve(new URL("../", import.meta.url).pathname);
const componentDir = path.join(root, "src/components/local-data-safety");
const appDir = path.join(root, "src/app");

function readFiles(dir: string): Array<{ filePath: string; body: string }> {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return readFiles(fullPath);
      return [{ filePath: fullPath, body: fs.readFileSync(fullPath, "utf8") }];
    })
    .filter((entry) => /\.(?:ts|tsx)$/.test(entry.filePath) && !entry.filePath.includes(".test."));
}

describe("phase 2D.89 hidden import/restore UI no-route acceptance", () => {
  it("has no app route, page, menu or navigation connection", () => {
    const appBodies = readFiles(appDir);
    const appImports = appBodies.filter((entry) => /ImportRestoreRoutelessShell|ImportRestorePreviewPanel|ImportRestoreRiskPanel/.test(entry.body));

    expect(appImports).toEqual([]);
    expect(fs.existsSync(path.join(appDir, "import-restore"))).toBe(false);
    expect(fs.existsSync(path.join(appDir, "importar-restaurar"))).toBe(false);
  });

  it("keeps routeless components free from router and link imports", () => {
    for (const { filePath, body } of readFiles(componentDir)) {
      if (!filePath.includes("ImportRestore")) continue;
      expect(body, filePath).not.toMatch(/next\/link|next\/navigation|useRouter|redirect\(|router\./);
      expect(body, filePath).not.toMatch(/href\s*=|data-route/);
    }
  });

  it("renders hidden shell without links or route attributes", () => {
    const props = buildHiddenImportRestoreUiShellHarnessProps({ generatedAt: "2026-06-27T00:00:00.000Z" });
    const html = renderToStaticMarkup(createElement(ImportRestoreRoutelessShell, props));

    expect(html).toContain("PHASE2D82_ROUTELESS_IMPORT_RESTORE_COMPOSITION_ROOT_V1");
    expect(html).not.toContain("href=");
    expect(html).not.toContain("data-route");
    expect(html).not.toContain("<nav");
  });
});
