import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const documentListSource = readFileSync(
  new URL("./DocumentList.tsx", import.meta.url),
  "utf8",
);

describe("rectification list presentation wiring", () => {
  it("replaces isolated profitability with the cancellation cash explanation", () => {
    expect(documentListSource).toContain(
      "cancellationListPresentationForDocument(doc, data.documents)",
    );
    expect(documentListSource).toContain("!cancellationPresentation");
    expect(documentListSource).toContain("Impacto en cobros:");
    expect(documentListSource).toContain(
      "formatMoney(cancellationPresentation.cashImpact)",
    );
  });

  it("does not repeat the generic rectified-original message", () => {
    expect(documentListSource).toContain(
      "doc.rectifiedById && !cancellationPresentation",
    );
  });
});
