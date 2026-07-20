import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../../", import.meta.url));

function source(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), "utf8");
}

describe("Drive onboarding return contract", () => {
  it("solo vuelve al inicio tras completar y verificar la copia", () => {
    const backup = source("src/lib/google-drive/backup.ts");
    const callback = source("src/app/drive/callback/page.tsx");

    expect(backup).toContain('return value === "/"');
    expect(callback).toContain("uploadAppBackupToGoogleDriveWithAccessToken");
    expect(callback).toContain("saveDriveBackupSettings");
    expect(callback).toContain("window.location.replace(pending.returnPath)");
    expect(callback).toContain('status.returnPath === "/"');
  });
});
