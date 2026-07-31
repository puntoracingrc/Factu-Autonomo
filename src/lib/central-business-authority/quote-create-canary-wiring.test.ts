import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const form = source("../../components/forms/DocumentForm.tsx");
const hook = source("../../hooks/useCentralQuoteCreate.ts");
const store = source("../../context/AppStore.tsx");
const environment = source("../../../.env.example");

describe("central quote create canary wiring", () => {
  it("conecta solo las altas nuevas de presupuesto al hook canario", () => {
    expect(form).toContain("useCentralQuoteCreate");
    expect(form).toContain('if (type === "presupuesto")');
    expect(form).toContain("const quoteSave = await createQuote({");
    expect(form).toContain("saved = quoteSave.document");
    expect(hook).toContain("createQuoteWithCentralCanary");
    expect(hook).toMatch(
      /await import\(\s*"@\/lib\/central-business-authority\/quote-create-canary"\s*\)/u,
    );
  });

  it("usa el commit durable y la recepcion central antes de escribir", () => {
    expect(hook).toContain(
      "addCentralBusinessNumberedDocumentDurably",
    );
    expect(hook).toContain("syncCentralBusinessEvents(userId)");
    expect(store).toContain(
      "addCentralBusinessNumberedDocumentDurably",
    );
  });

  it("documenta un flag cerrado por UUID y no reutiliza el canario fiscal", () => {
    expect(environment).toContain(
      "NEXT_PUBLIC_CENTRAL_BUSINESS_QUOTE_CREATE_CANARY_ENABLED=false",
    );
    expect(environment).toContain(
      "NEXT_PUBLIC_CENTRAL_BUSINESS_QUOTE_CREATE_CANARY_USER_IDS=",
    );
    expect(hook).not.toContain("CentralInvoiceAuthority");
  });
});
