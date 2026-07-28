import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const component = readFileSync(
  new URL("./CentralInvoiceAuthorityEventsAutoSync.tsx", import.meta.url),
  "utf8",
);
const appShell = readFileSync(
  new URL("../layout/AppShell.tsx", import.meta.url),
  "utf8",
);

describe("central authority events automatic sync shell", () => {
  it("se monta de forma silenciosa en AppShell detras de la flag publica", () => {
    expect(appShell).toContain("CentralInvoiceAuthorityEventsAutoSync");
    expect(component).toContain("isCentralInvoiceAuthorityEventsAutoSyncEnabled");
    expect(component).toContain("return null");
  });

  it("usa solo el puente durable de AppStore y no la reparacion de nube antigua", () => {
    expect(component).toContain("syncCentralInvoiceAuthorityEvents");
    expect(component).toContain("shouldRunCentralInvoiceAuthorityEventsAutoSync");
    expect(component).toContain("nextCentralInvoiceAuthorityEventsAutoSyncDelay");
    expect(component).not.toContain("forceDownloadFromCloud");
    expect(component).not.toContain("prepareCloudRepairPreview");
    expect(component).not.toContain("replaceCloudSnapshotDurably");
    expect(component).not.toContain("syncNow(");
  });

  it("escucha senales ligeras del navegador sin renderizar datos fiscales", () => {
    expect(component).toContain('window.addEventListener("online"');
    expect(component).toContain('window.addEventListener("focus"');
    expect(component).toContain('document.addEventListener("visibilitychange"');
    expect(component).not.toContain("documentPayload");
    expect(component).not.toContain("emittedHash");
    expect(component).not.toContain("safeSummary");
  });

  it("usa realtime solo como wakeup filtrado por usuario y con import diferido", () => {
    expect(component).toContain(
      "isCentralInvoiceAuthorityEventsRealtimeWakeupsEnabled",
    );
    expect(component).toContain(
      "shouldSubscribeCentralInvoiceAuthorityEventsRealtimeWakeups",
    );
    expect(component).toContain(
      "centralInvoiceAuthorityEventsRealtimeWakeupsSubscription",
    );
    expect(component).toContain('void import("@/lib/supabase/client")');
    expect(component).toContain('"postgres_changes"');
    expect(component).toContain('event: "INSERT"');
    expect(component).toContain("subscription.filter");
    expect(component).toContain("realtimeWakeRef.current()");
    expect(component).not.toContain('from "@/lib/supabase/client"');
  });
});
