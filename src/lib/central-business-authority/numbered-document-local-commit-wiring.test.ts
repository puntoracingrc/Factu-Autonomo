import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appStore = readFileSync(
  new URL("../../context/AppStore.tsx", import.meta.url),
  "utf8",
);

describe("central numbered document local commit wiring", () => {
  it("expone un commit durable y carga el adaptador solo cuando se usa", () => {
    expect(appStore).toContain(
      "addCentralBusinessNumberedDocumentDurably",
    );
    expect(appStore).toMatch(
      /await import\(\s*"@\/lib\/central-business-authority\/numbered-document-local-commit"\s*\)/u,
    );
    expect(appStore).toContain(
      "buildCentralBusinessNumberedDocumentLocalCommit(",
    );
    expect(appStore).toContain(
      "commitDurableAppData(expected, (previous) =>",
    );
  });
});
