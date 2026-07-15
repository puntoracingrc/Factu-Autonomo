import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../", import.meta.url));

function source(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), "utf8");
}

describe("cloud and Drive reliability contract", () => {
  it("serializa subida, pull y descarga completa con un bloqueo liberable", () => {
    const context = source("src/context/CloudSyncContext.tsx");
    const operation = source("src/lib/cloud/sync-operation.ts");

    expect(context.match(/runExclusiveSyncOperation\(syncing/g)).toHaveLength(
      3,
    );
    expect(context).toContain("await pushToCloud(workingData, true, options)");
    expect(context).not.toContain("syncing.current = true");
    expect(operation).toContain("finally");
    expect(operation).toContain("lock.current = false");
  });

  it("no confirma Drive sin readback exacto ni permite copias simultaneas", () => {
    const backup = source("src/lib/google-drive/backup.ts");
    const automatic = source("src/components/cloud/GoogleDriveAutoBackup.tsx");
    const manual = source("src/components/cloud/GoogleDriveBackupCard.tsx");
    const callback = source("src/app/drive/callback/page.tsx");
    const tokenRoute = source("src/app/api/google-drive/token/route.ts");

    expect(backup).toContain("readDriveBackupFile");
    expect(backup).toContain("readback !== jsonText");
    expect(backup).toContain("DRIVE_FETCH_TIMEOUT_MS");
    expect(automatic).toContain("runExclusiveDriveBackup");
    expect(automatic).toContain("AUTO_BACKUP_RETRY_MS");
    expect(manual).toContain("runExclusiveDriveBackup");
    expect(callback).toContain("runExclusiveDriveBackup");
    expect(tokenRoute).toContain("GOOGLE_TOKEN_TIMEOUT_MS");
    expect(tokenRoute).toContain("AbortSignal.timeout");
  });

  it("archiva originales fiscales solo por decisión expresa y readback SHA-256", () => {
    const intake = source(
      "src/components/fiscal-notifications/FiscalNotificationIntakeView.tsx",
    );
    const archive = source(
      "src/lib/google-drive/fiscal-notification-original-archive.v1.ts",
    );
    const domain = source(
      "src/lib/fiscal-notifications/drive-original-archive.v1.ts",
    );

    expect(intake).toContain("Archivar original en Drive");
    expect(intake).toContain("runExclusiveDriveOperation");
    expect(archive).toContain("verifyDriveFileHash");
    expect(archive).toContain("SHA256_READBACK_MATCH");
    expect(archive).toContain("Fecha pendiente");
    expect(domain).toContain("sourceSha256");
    expect(domain).not.toMatch(/originalFilename|rawText|accessToken/u);
  });

  it("mantiene la politica en la raiz y protege sus archivos", () => {
    const agents = source("AGENTS.md");
    const codeowners = source(".github/CODEOWNERS");
    const adr = source(
      "docs/architecture/ADR-0005-cloud-and-drive-sync-reliability.md",
    );

    expect(agents).toContain("ADR-0005-cloud-and-drive-sync-reliability.md");
    expect(agents).toContain("cloud-drive-sync-reliability-contract.test.ts");
    expect(codeowners).toContain("/src/context/CloudSyncContext.tsx");
    expect(codeowners).toContain("/src/lib/cloud/**");
    expect(codeowners).toContain("/src/lib/google-drive/**");
    expect(adr).toContain("drive.file");
    expect(adr).toContain("coincide exactamente");
    expect(adr).toContain("Fecha pendiente");
    expect(adr).toContain("SHA256_READBACK_MATCH");
  });
});
