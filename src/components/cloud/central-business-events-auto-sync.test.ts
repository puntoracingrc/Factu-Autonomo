import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const component = readFileSync(
  new URL("./CentralBusinessAuthorityEventsAutoSync.tsx", import.meta.url),
  "utf8",
);
const appShell = readFileSync(
  new URL("../layout/AppShell.tsx", import.meta.url),
  "utf8",
);
const appStore = readFileSync(
  new URL("../../context/AppStore.tsx", import.meta.url),
  "utf8",
);

describe("central business events auto sync wiring", () => {
  it("se monta en AppShell y comprueba inmediatamente al recuperar actividad", () => {
    expect(appShell).toContain("CentralBusinessAuthorityEventsAutoSync");
    expect(component).toContain(
      "isCentralBusinessEventsAutoSyncEnabledForUser",
    );
    expect(component).toContain(
      "const enabled = isCentralBusinessEventsAutoSyncEnabledForUser(userId);",
    );
    expect(component).toContain(
      "const userId = cloudUserId ?? sessionFallbackUserId;",
    );
    expect(component).toContain("supabase.auth.getSession()");
    expect(component).toContain("supabase.auth.onAuthStateChange");
    expect(component).not.toContain("emailConfirmed");
    expect(component).toContain("syncCentralBusinessEvents");
    const normalSync = appStore.slice(
      appStore.indexOf("const syncCentralBusinessEvents = useCallback"),
      appStore.indexOf(
        "const resolveCentralBusinessConflictKeepingServer = useCallback",
      ),
    );
    expect(normalSync.indexOf("drainCentralBusinessDurableQueue")).toBeLessThan(
      normalSync.indexOf("return pullCentralBusinessEvents"),
    );
    expect(normalSync).toContain('if (drained.stoppedBy !== "empty")');
    expect(normalSync).toContain(
      "await pullCentralBusinessEvents(ownerScope, options);",
    );
    const queueFailureBlock = normalSync.slice(
      normalSync.indexOf("} catch {"),
      normalSync.indexOf('if (drained.stoppedBy !== "empty")'),
    );
    expect(queueFailureBlock).toContain(
      "const pulled = await pullCentralBusinessEvents(ownerScope, options)",
    );
    expect(queueFailureBlock).toContain(
      "nextSequence: pulled?.ok ? pulled.nextSequence : 0",
    );
    expect(normalSync).toContain("mutateCentralBusinessBatchFromBrowser");
    expect(normalSync).toContain(
      "mutateBatch: mutateCentralBusinessBatchFromBrowser",
    );
    expect(component).toContain('window.addEventListener("online", wake)');
    expect(component).toContain('window.addEventListener("focus", wake)');
    expect(component).toContain('window.addEventListener("pageshow", wake)');
    expect(component).toContain("CLOUD_DEVICE_REACTIVATED_EVENT");
    expect(component).toContain("!enabled || !ready || !userId");
    expect(component).toContain("realtimeWakeRef.current()");
    expect(component).toContain(
      'document.addEventListener("visibilitychange", wake)',
    );
    expect(component).toContain(
      "isCentralBusinessEventsRealtimeWakeupsEnabledForUser",
    );
    expect(component).toContain("centralBusinessEventsRealtimeSubscription");
    expect(component).toContain("await supabase.realtime.setAuth()");
    expect(component).toContain("config: { private: true }");
    expect(component).toContain('"broadcast"');
    expect(component).toContain(
      "CENTRAL_BUSINESS_EVENTS_REALTIME_WAKEUP_EVENT",
    );
    expect(component).toContain("realtimeWakeRef.current()");
    expect(component).toContain("pendingWakeRef.current = true");
  });
});
