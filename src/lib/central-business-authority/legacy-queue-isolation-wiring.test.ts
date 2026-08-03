import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const store = readFileSync("src/context/AppStore.tsx", "utf8");

function section(start: string, end: string): string {
  const from = store.indexOf(start);
  const to = store.indexOf(end, from + start.length);
  expect(from).toBeGreaterThanOrEqual(0);
  expect(to).toBeGreaterThan(from);
  return store.slice(from, to);
}

describe("aislamiento de la cola legacy durante la migracion central", () => {
  it("no vuelve a encolar las paginas recibidas de ambas autoridades", () => {
    expect(
      section(
        "const syncCentralInvoiceAuthorityEvents",
        "const pullCentralBusinessEvents",
      ),
    ).toContain("trackLegacyChanges: false");
    expect(
      section(
        "const pullCentralBusinessEvents",
        "const syncCentralBusinessEvents",
      ),
    ).toContain("trackLegacyChanges: false");
    expect(
      section(
        "const adoptCentralBusinessEventsFromServer",
        "const resolveCentralBusinessConflictKeepingServer",
      ),
    ).toContain("trackLegacyChanges: false");
  });

  it("mantiene el tracking legacy como comportamiento durable por defecto", () => {
    const durability = readFileSync("src/lib/app-data-durability.ts", "utf8");
    expect(durability).toContain("input.trackLegacyChanges === false");
    expect(durability).toContain(": trackDataDiff(input.expected, touched)");
  });

  it("retira la cola legacy solo mediante la adopcion central explicita", () => {
    const adoption = section(
      "const retireLegacyPendingChangesAfterCentralAdoption",
      "const resolveCentralBusinessConflictKeepingServer",
    );

    expect(adoption).toContain("buildCentralAdoptionLegacyQueueRetirement");
    expect(adoption).toContain("expectedPendingChangeCount");
    expect(adoption).toContain("expectedPendingChangesSignature");
    expect(adoption).toContain("trackLegacyChanges: false");
  });
});
