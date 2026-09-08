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
});
