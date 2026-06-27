import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { createDisabledLocalDataStorageAdapter } from "../src/lib/local-data-safety";

// PHASE2D42_IMPORT_RESTORE_ROUTE_NAVIGATION_BLOCKER_VALIDATION_V1

const root = path.resolve(new URL("../", import.meta.url).pathname);

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function gitLines(args: string[]): string[] {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

describe("phase 2D.42 import restore route navigation blocker validation", () => {
  it("does not add app routes, pages, navigation, sidebar or menu files", () => {
    const changedPaths = new Set([
      ...gitLines(["diff", "--name-only"]),
      ...gitLines(["diff", "--name-only", "--cached"]),
      ...gitLines(["diff", "--name-only", "main...HEAD"]),
      ...gitLines(["diff", "--name-only", "origin/main...HEAD"]),
      ...gitLines(["ls-files", "--others", "--exclude-standard"]),
    ]);

    for (const changedPath of changedPaths) {
      if (changedPath.startsWith("docs/audit/exports/")) continue;
      if (changedPath.startsWith("docs/vida-screenshots-local/")) continue;
      if (/^(?:scripts|docs)\/phase2d42-/.test(changedPath)) continue;
      if (/^scripts\/validate-phase2d42-/.test(changedPath)) continue;
      expect(changedPath).not.toMatch(/^(src\/app|app|pages|public)\//);
      expect(changedPath).not.toMatch(/(?:navigation|sidebar|menu|layout)/i);
    }
  });

  it("keeps the shell free of router and link imports", () => {
    const shell = read("src/components/local-data-safety/ImportRestoreReviewShell.tsx");

    expect(shell).not.toContain("next/navigation");
    expect(shell).not.toContain("next/router");
    expect(shell).not.toContain("next/link");
    expect(shell).not.toContain("href=");
  });

  it("keeps browser storage adapter disabled", () => {
    const adapter = createDisabledLocalDataStorageAdapter("2026-06-27T00:00:00.000Z");

    expect(adapter.read().canRead).toBe(false);
    expect(adapter.write().canWrite).toBe(false);
  });

  it("does not export the disabled shell from app-level indexes", () => {
    const appFiles = gitLines(["ls-files", "src/app"]);

    expect(appFiles.some((filePath) => read(filePath).includes("ImportRestoreReviewShell"))).toBe(false);
  });
});
