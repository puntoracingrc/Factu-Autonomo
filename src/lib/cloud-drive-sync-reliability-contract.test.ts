import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../", import.meta.url));

function source(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), "utf8");
}

describe("central authority and Drive reliability contract", () => {
  it("sincroniza solo las autoridades vigentes y el workspace fiscal dedicado", () => {
    const context = source("src/context/CloudSyncContext.tsx");
    const workspace = source(
      "src/lib/fiscal-notifications/workspace-cloud-repository.ts",
    );

    expect(context).toContain("syncCentralBusinessEvents");
    expect(context).toContain("syncCentralInvoiceAuthorityEvents");
    expect(context).toContain("syncFiscalNotificationsWorkspace");
    expect(context).not.toContain("pushSyncChanges");
    expect(context).not.toContain("pullSyncChanges");
    expect(workspace).toContain('TABLE = "workspace_auxiliary_entities"');
    expect(workspace).not.toContain("sync_entities");
  });

  it("comprueba central antes de emitir numeracion fiscal definitiva", () => {
    const form = source("src/components/forms/DocumentForm.tsx");

    expect(form).toContain("requiresFreshCloudBeforeEmission");
    expect(form).toContain("const synced = await syncNow()");
    expect(form.indexOf("const synced = await syncNow()")).toBeLessThan(
      form.indexOf("const shouldUpsertCustomer"),
    );
    expect(form).not.toContain("cloudSyncPaused");
  });

  it("aplica plan y dispositivo activo antes de leer central", () => {
    const context = source("src/context/CloudSyncContext.tsx");
    const devices = source("src/lib/cloud/devices.ts");
    const client = source("src/lib/supabase/client.ts");

    expect(context).toContain("canUseCloudForUser");
    expect(context).toContain("registerCurrentCloudDevice");
    expect(context).toContain("retireCurrentCloudDevice");
    expect(context).toContain("releaseCurrentCloudDeviceSession");
    expect(devices).toContain("cloudDeviceLimitForPlan");
    expect(client).toContain("deviceAwareFetch");
  });

  it("no confirma Drive sin readback exacto ni permite copias simultaneas", () => {
    const backup = source("src/lib/google-drive/backup.ts");
    const automatic = source("src/components/cloud/GoogleDriveAutoBackup.tsx");
    const manual = source("src/components/cloud/GoogleDriveBackupCard.tsx");

    expect(backup).toContain("readDriveBackupFile");
    expect(backup).toContain("readback !== jsonText");
    expect(automatic).toContain("runExclusiveDriveBackup");
    expect(manual).toContain("runExclusiveDriveBackup");
  });

  it("mantiene la politica protegida en la raiz", () => {
    const agents = source("AGENTS.md");
    const codeowners = source(".github/CODEOWNERS");

    expect(agents).toContain("ADR-0005-cloud-and-drive-sync-reliability.md");
    expect(agents).toContain("cloud-drive-sync-reliability-contract.test.ts");
    expect(codeowners).toContain("/src/context/CloudSyncContext.tsx");
    expect(codeowners).toContain("/src/lib/cloud/**");
    expect(codeowners).toContain("/src/lib/google-drive/**");
  });
});
