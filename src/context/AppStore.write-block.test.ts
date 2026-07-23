import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appStoreSource = readFileSync(
  new URL("./AppStore.tsx", import.meta.url),
  "utf8",
);
const cloudSyncSource = readFileSync(
  new URL("./CloudSyncContext.tsx", import.meta.url),
  "utf8",
);
const appShellSource = readFileSync(
  new URL("../components/layout/AppShell.tsx", import.meta.url),
  "utf8",
);
const storageSource = readFileSync(
  new URL("../lib/storage.ts", import.meta.url),
  "utf8",
);

describe("stale cloud snapshot write block", () => {
  it("exposes a global write block from AppStore", () => {
    expect(appStoreSource).toContain("export interface AppWriteBlock");
    expect(appStoreSource).toContain("writeBlock: AppWriteBlock | null");
    expect(appStoreSource).toContain("setExternalWriteBlock");
    expect(appStoreSource).toContain("clearExternalWriteBlock");
  });

  it("blocks AppStore writes and durable commits while a sync review is active", () => {
    expect(storageSource).toContain('"cloud_snapshot_incomplete"');
    expect(appStoreSource).toContain(
      "CLOUD_SNAPSHOT_INCOMPLETE_WRITE_BLOCK_REASON",
    );
    expect(appStoreSource).toContain(
      "writeBlockRef.current && !options?.bypassWriteBlock",
    );
    expect(appStoreSource).toContain(
      "if (writeBlockRef.current) return blockedDurableResult()",
    );
    expect(appStoreSource).toContain(
      "if (writeBlockRef.current) return false",
    );
    expect(appStoreSource).toContain(
      "writeBlockRef.current\n                ? blockedSaveResult()",
    );
  });

  it("lets cloud sync place stale devices in read-only mode", () => {
    expect(cloudSyncSource).toContain("setExternalWriteBlock({");
    expect(cloudSyncSource).toContain('source: "cloud_sync_review"');
    expect(cloudSyncSource).toContain("clearExternalWriteBlock");
    expect(cloudSyncSource).toContain(
      "no se pueden crear, editar ni borrar datos de negocio",
    );
  });

  it("shows a global read-only banner and disables business content", () => {
    expect(appShellSource).toContain("writeBlock");
    expect(appShellSource).toContain("businessContentBlocked");
    expect(appShellSource).toContain('role="alert"');
    expect(appShellSource).toContain("pointer-events-none");
  });
});
