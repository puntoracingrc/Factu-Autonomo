import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { isCloudSyncTemporarilyPaused } from "@/lib/supabase/config";

const ROOT = process.cwd();
const PREVIOUS_PAUSE_FLAG =
  process.env.NEXT_PUBLIC_CLOUD_SYNC_TEMPORARILY_PAUSED;

afterEach(() => {
  if (PREVIOUS_PAUSE_FLAG === undefined) {
    delete process.env.NEXT_PUBLIC_CLOUD_SYNC_TEMPORARILY_PAUSED;
    return;
  }
  process.env.NEXT_PUBLIC_CLOUD_SYNC_TEMPORARILY_PAUSED = PREVIOUS_PAUSE_FLAG;
});

function source(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

describe("temporary cloud sync pause", () => {
  it("pauses cloud sync by default during the repair window", () => {
    delete process.env.NEXT_PUBLIC_CLOUD_SYNC_TEMPORARILY_PAUSED;

    expect(isCloudSyncTemporarilyPaused()).toBe(true);
  });

  it("only resumes cloud sync when the public flag is explicitly false", () => {
    process.env.NEXT_PUBLIC_CLOUD_SYNC_TEMPORARILY_PAUSED = "true";
    expect(isCloudSyncTemporarilyPaused()).toBe(true);

    process.env.NEXT_PUBLIC_CLOUD_SYNC_TEMPORARILY_PAUSED = "false";
    expect(isCloudSyncTemporarilyPaused()).toBe(false);
  });

  it("keeps writes local and clears the desync write block while paused", () => {
    const cloudSyncContext = source("src/context/CloudSyncContext.tsx");

    expect(cloudSyncContext).toContain("cloudSyncPaused: boolean");
    expect(cloudSyncContext).toContain("TEMPORARY_CLOUD_SYNC_PAUSE_MESSAGE");
    expect(cloudSyncContext).toContain(
      'clearExternalWriteBlock("cloud_sync_review")',
    );
    expect(cloudSyncContext).toContain('if (cloudSyncPaused) return "fresh";');
    expect(cloudSyncContext).toContain("stopPendingCloudTimers();");
    expect(cloudSyncContext).toContain("markSyncPending();");
    expect(cloudSyncContext).toContain(
      "if (cloudSyncPaused || demoMode || !ready || !user) return;",
    );
  });

  it("presents the paused state as local-only work instead of a repair flow", () => {
    const accountCard = source("src/components/cloud/CloudAccountCard.tsx");
    const indicator = source("src/components/cloud/CloudSyncIndicator.tsx");

    expect(accountCard).toContain("cloudSyncPaused");
    expect(accountCard).toContain("Pausada temporalmente");
    expect(accountCard).toContain(
      "Puedes trabajar y emitir en\n              este dispositivo",
    );
    expect(accountCard).toContain("limits.cloudSync && !cloudSyncPaused ?");
    expect(accountCard).toContain("canShowSyncActions && !cloudSyncPaused");

    expect(indicator).toContain("cloudSyncPaused");
    expect(indicator).toContain("Los cambios quedan guardados en");
    expect(indicator).toContain(
      "este dispositivo y se subiran cuando reactivemos la nube.",
    );
  });
});
