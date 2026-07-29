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
    expect(component).toContain('window.addEventListener("online", wake)');
    expect(component).toContain('window.addEventListener("focus", wake)');
    expect(component).toContain(
      'document.addEventListener("visibilitychange", wake)',
    );
  });
});
