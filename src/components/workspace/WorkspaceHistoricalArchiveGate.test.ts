import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const component = readFileSync(
  new URL("./WorkspaceHistoricalArchiveGate.tsx", import.meta.url),
  "utf8",
);

describe("historical workspace archive automatic recovery wiring", () => {
  it("rechecks when a mobile app regains activity without polling", () => {
    expect(component).toContain('window.addEventListener("online", wake)');
    expect(component).toContain('window.addEventListener("focus", wake)');
    expect(component).toContain('window.addEventListener("pageshow", wake)');
    expect(component).toContain(
      'document.addEventListener("visibilitychange", wake)',
    );
    expect(component).toContain("CLOUD_DEVICE_REACTIVATED_EVENT");
    expect(component).toContain("pendingWakeRef.current = true");
    expect(component).toContain("runningRef.current");
    expect(component).toContain("mountedRef.current");
    expect(component).not.toContain("setInterval");
  });

  it("checks invoice completeness and explains a real archive download", () => {
    expect(component).toContain(
      "hasLocallyCompleteHistoricalWorkspaceArchive(localData)",
    );
    expect(component).toContain("Recuperando tus facturas anteriores");
    expect(component).toContain(
      'setCurrentState({ status: "checking", phase: "restoring" })',
    );
  });

  it("self-heals local quota pressure without asking the user to sign out", () => {
    expect(component).toContain(
      "archiveAndReleaseWorkspaceLocalRecoveryCopies({",
    );
    expect(component).toContain('result.reason === "quota_exceeded"');
    expect(component).toContain(
      "mergeHistoricalWorkspaceArchiveDurably(manifest)",
    );
    expect(component).toContain("AUTOMATIC_RETRY_DELAYS_MS");
    expect(component).toContain("Intentar ahora");
    expect(component).not.toContain("signOut");
    expect(component).not.toContain("Cerrar sesión");
  });

  it("reports the real durability reason without exposing invoice contents", () => {
    expect(component).toContain("reportAppError({");
    expect(component).toContain(
      '`historical_archive_restore_${failureReason ?? "unexpected"}`',
    );
    expect(component).toContain("localInvoiceCount");
    expect(component).not.toContain("documents: getCurrentData()");
  });
});
