import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const button = source("../../components/documents/GenerateReceiptButton.tsx");
const hook = source("../../hooks/useCentralReceiptCreate.ts");
const store = source("../../context/AppStore.tsx");
const environment = source("../../../.env.example");
const nextConfig = source("../../../next.config.ts");

describe("central receipt create canary wiring", () => {
  it("conecta la accion visible al orquestador central asincrono", () => {
    expect(button).toContain("useCentralReceiptCreate");
    expect(button).toContain("const result = await createReceipt(doc.id)");
    expect(button).toContain('label={saving ? "Guardando" : "Crear recibo"}');
    expect(hook).toContain("createReceiptWithCentralCanary");
    expect(hook).toMatch(
      /await import\(\s*"@\/lib\/central-business-authority\/receipt-create-canary"\s*\)/u,
    );
  });

  it("sincroniza ambas autoridades y usa el commit durable", () => {
    expect(hook).toContain("syncCentralInvoiceAuthorityEvents");
    expect(hook).toContain("syncCentralBusinessEvents(userId)");
    expect(hook).toContain("addCentralBusinessNumberedDocumentDurably");
    expect(store).toContain("addCentralBusinessNumberedDocumentDurably");
  });

  it("documenta y expone un flag cerrado por UUID", () => {
    expect(environment).toContain(
      "NEXT_PUBLIC_CENTRAL_BUSINESS_RECEIPT_CREATE_CANARY_ENABLED=false",
    );
    expect(environment).toContain(
      "NEXT_PUBLIC_CENTRAL_BUSINESS_RECEIPT_CREATE_CANARY_USER_IDS=",
    );
    expect(nextConfig).toContain(
      "NEXT_PUBLIC_CENTRAL_BUSINESS_RECEIPT_CREATE_CANARY_ENABLED",
    );
    expect(nextConfig).toContain(
      "NEXT_PUBLIC_CENTRAL_BUSINESS_RECEIPT_CREATE_CANARY_USER_IDS",
    );
  });
});
