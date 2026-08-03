import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const component = readFileSync(
  new URL("./CentralBusinessAutomaticBootstrap.tsx", import.meta.url),
  "utf8",
);
const appShell = readFileSync(
  new URL("../layout/AppShell.tsx", import.meta.url),
  "utf8",
);

describe("central business automatic bootstrap wiring", () => {
  it("runs only for a resolved cloud plan inside the public rollout", () => {
    expect(appShell).toContain("CentralBusinessAutomaticBootstrap");
    expect(component).toContain("useCentralAuthorityPlanGate");
    expect(component).toContain('planGate.mode !== "central"');
    expect(component).toContain("isCentralAuthorityPublicRolloutUser");
    expect(component).toContain("isLegacyCloudExplicitlyRetiredForUser");
  });

  it("keeps user writes gated until an additive or identical snapshot is verified", () => {
    expect(component).toContain("requireBootstrapVerified: false");
    expect(component).toContain("previewCentralBusinessBootstrapFromBrowser");
    expect(component).toContain("automaticBootstrapDisposition");
    expect(component).toContain("commitCentralBusinessBootstrapFromBrowser");
    expect(component).toContain("recordCentralBusinessBootstrapCheckpoint");
    expect(component).toContain(
      "markCentralBusinessAutomaticBootstrapVerified",
    );
    expect(component).not.toContain("setExternalWriteBlock");
  });

  it("unblocks the first write after the committed snapshot checkpoint", () => {
    const checkpoint = component.indexOf(
      "await recordCentralBusinessBootstrapCheckpoint",
    );
    const verified = component.indexOf(
      "markCentralBusinessAutomaticBootstrapVerified({",
      checkpoint,
    );
    const confirmation = component.indexOf(
      "const confirmationSync = await syncAllBusinessEvents()",
      checkpoint,
    );

    expect(checkpoint).toBeGreaterThan(-1);
    expect(verified).toBeGreaterThan(checkpoint);
    expect(confirmation).toBeGreaterThan(verified);
  });

  it("receives invoice history before dependent business records", () => {
    expect(component).toContain("syncCentralBusinessEvents");
    expect(component).toContain("syncCentralInvoiceAuthorityEvents");
    expect(component).toContain(
      "replayFromStartWhenNoActiveInvoices: true",
    );
    expect(component).toContain("MAX_EVENT_PAGES");
    expect(
      component.indexOf("const invoiceSync = await syncAllInvoiceEvents()"),
    ).toBeLessThan(
      component.indexOf("const businessSync = await syncAllBusinessEvents()"),
    );
    expect(component).not.toContain("adoptCentralBusinessEventsFromServer");
    expect(component).not.toContain(
      "retireLegacyPendingChangesAfterCentralAdoption",
    );
    expect(component).toContain(
      'result.retryable ? "retry" : "manual_review"',
    );
    expect(component).toContain(
      'result.status === "indeterminate"',
    );
  });
});
