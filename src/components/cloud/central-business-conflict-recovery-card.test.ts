import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const component = readFileSync(
  new URL("./CentralBusinessConflictRecoveryCard.tsx", import.meta.url),
  "utf8",
);
const accountPage = readFileSync(
  new URL("../../app/cuenta/page.tsx", import.meta.url),
  "utf8",
);
const appStore = readFileSync(
  new URL("../../context/AppStore.tsx", import.meta.url),
  "utf8",
);

describe("central business conflict recovery account wiring", () => {
  it("ofrece una decisión explícita y no una sobrescritura automática", () => {
    expect(component).toContain('type="checkbox"');
    expect(component).toContain("Conservar versión del servidor");
    expect(component).toContain("acknowledged[item.key]");
    expect(component).toContain(
      "(!loadError && items.length === 0 && !notice)",
    );
    expect(component).toContain(
      "resolveCentralBusinessConflictKeepingServer",
    );
  });

  it("queda visible en Cuenta y descarga eventos antes de finalizar", () => {
    expect(accountPage).toContain("<CentralBusinessConflictRecoveryCard />");
    expect(appStore).toContain("pullCentralBusinessEvents");
    expect(appStore).toContain(
      'import(\n          "@/lib/central-business-authority/conflict-recovery"',
    );
  });
});
