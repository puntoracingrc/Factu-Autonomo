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
    const appStore = source("src/context/AppStore.tsx");

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
    expect(appStore).toContain("!isCloudSyncTemporarilyPaused()");
  });

  it("distingue la copia completa pausada de las acciones centrales activas", () => {
    const accountCard = source("src/components/cloud/CloudAccountCard.tsx");
    const indicator = source("src/components/cloud/CloudSyncIndicator.tsx");
    const documentForm = source("src/components/forms/DocumentForm.tsx");

    expect(accountCard).toContain("cloudSyncPaused");
    expect(accountCard).toContain("Pausada temporalmente");
    expect(accountCard).toContain(
      "La copia completa entre dispositivos está pausada temporalmente.",
    );
    expect(accountCard).toContain("&quot;Servidor central&quot;");
    expect(accountCard).toContain("se confirman y sincronizan allí");
    expect(accountCard).toContain("limits.cloudSync && !cloudSyncPaused ?");
    expect(accountCard).toContain("canShowSyncActions && !cloudSyncPaused");

    expect(indicator).toContain("cloudSyncPaused");
    expect(indicator).toContain("Copia completa entre dispositivos pausada.");
    expect(indicator).toContain("&quot;Servidor central&quot;");
    expect(indicator).toContain("se confirman y sincronizan allí");

    expect(documentForm).toContain("cloudSyncPaused");
    expect(documentForm).toContain("!cloudSyncPaused");
    expect(documentForm).toContain("requiresFreshCloudBeforeEmission");
  });
});
