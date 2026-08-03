import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("central authority rollout wiring", () => {
  it("mantiene el porcentaje al cero y el interruptor apagado por defecto", () => {
    const environment = source("../../../.env.example");
    expect(environment).toContain("CENTRAL_AUTHORITY_ROLLOUT_PERCENT=0");
    expect(environment).toContain(
      "NEXT_PUBLIC_CENTRAL_AUTHORITY_ROLLOUT_PERCENT=0",
    );
    expect(environment).toContain(
      "CENTRAL_AUTHORITY_ROLLOUT_ELIGIBLE_USERS=",
    );
    expect(environment).toContain(
      "NEXT_PUBLIC_CENTRAL_AUTHORITY_ROLLOUT_ELIGIBLE_USER_IDS=",
    );
    expect(environment).toContain("CENTRAL_AUTHORITY_KILL_SWITCH=false");
    expect(environment).toContain(
      "NEXT_PUBLIC_CENTRAL_AUTHORITY_KILL_SWITCH=false",
    );
  });

  it("aplica una unica cohorte a todos los maestros y documentos nuevos", () => {
    const writeGates = [
      "../central-business-authority/customer-create-canary.ts",
      "../central-business-authority/product-create-canary.ts",
      "../central-business-authority/supplier-create-canary.ts",
      "../central-business-authority/reminder-create-canary.ts",
      "../central-business-authority/expense-profile-canary.ts",
      "../central-business-authority/quote-create-canary.ts",
      "../central-business-authority/receipt-create-canary.ts",
      "../central-invoice-authority/form-canary-client.ts",
    ].map(source);

    for (const gate of writeGates) {
      expect(gate).toContain("isCentralAuthorityPublicRolloutUser");
      expect(gate).not.toContain("isCentralAuthorityPublicWriteRolloutUser");
    }
  });

  it("mantiene las lecturas activas para la cohorte aunque se pausen escrituras", () => {
    const businessEvents = source(
      "../central-business-authority/events-auto-sync.ts",
    );
    const invoiceEvents = source(
      "../central-invoice-authority/events-auto-sync.ts",
    );
    expect(businessEvents).toContain("isCentralAuthorityPublicRolloutUser");
    expect(invoiceEvents).toContain("isCentralAuthorityPublicRolloutUser");
    expect(businessEvents).not.toContain("PublicWriteRolloutUser");
    expect(invoiceEvents).not.toContain("PublicWriteRolloutUser");
  });
});
