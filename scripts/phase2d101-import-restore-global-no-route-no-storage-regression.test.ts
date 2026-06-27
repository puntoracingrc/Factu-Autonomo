import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// PHASE2D101_IMPORT_RESTORE_GLOBAL_NO_ROUTE_NO_STORAGE_REGRESSION_V1

const root = path.resolve(__dirname, "..");

function gitFiles(args: string[]): string[] {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const enablementRuntimeFiles = [
  "src/lib/local-data-safety/hidden-ui-enablement-gate.ts",
  "src/lib/local-data-safety/hidden-ui-enablement-environment.ts",
  "src/lib/local-data-safety/import-restore-final-review-pack.ts",
  "src/lib/local-data-safety/import-restore-no-go-conditions.ts",
  "src/lib/local-data-safety/hidden-shell-readiness-report.ts",
  "src/lib/local-data-safety/hidden-ui-owner-decision-packet.ts",
  "src/lib/local-data-safety/hidden-ui-enablement-state-machine.ts",
];

describe("PHASE2D101 global no-route/no-storage regression", () => {
  it("does not add an app route or public page for hidden import/restore enablement", () => {
    const appFiles = gitFiles(["ls-files", "src/app"]);

    for (const filePath of appFiles) {
      expect(read(filePath), filePath).not.toMatch(/HiddenImportRestore|ImportRestoreRoutelessShell|hidden-ui-enablement/i);
    }
  });

  it("does not connect hidden import/restore enablement to navigation surfaces", () => {
    const navigationFiles = gitFiles(["ls-files"]).filter((filePath) =>
      /(?:nav|menu|sidebar|layout|header|footer)/i.test(filePath),
    );

    for (const filePath of navigationFiles) {
      expect(read(filePath), filePath).not.toMatch(/HiddenImportRestore|ImportRestoreRoutelessShell|hidden-ui-enablement/i);
    }
  });

  it("keeps enablement runtime free of real browser, network and apply surfaces", () => {
    for (const filePath of enablementRuntimeFiles) {
      const source = read(filePath);
      expect(source, filePath).not.toMatch(/localStorage|FileReader|showOpenFilePicker|new Blob|createObjectURL/);
      expect(source, filePath).not.toMatch(/@supabase\/supabase-js|fetch\s*\(|node:http|node:https|axios/);
      expect(source, filePath).not.toMatch(/next\/link|next\/navigation|useRouter|router\.|href\s*=/);
      expect(source, filePath).not.toMatch(/applyImportAllowed:\s*true|applyRestoreAllowed:\s*true/);
    }
  });
});
