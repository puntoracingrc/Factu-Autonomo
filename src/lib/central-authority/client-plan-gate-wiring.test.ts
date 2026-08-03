import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const CENTRAL_WRITE_HOOKS = [
  "../../hooks/useCentralCustomerCreate.ts",
  "../../hooks/useCentralCustomerMutations.ts",
  "../../hooks/useCentralDocumentCustomerUpsert.ts",
  "../../hooks/useCentralSupplierCreate.ts",
  "../../hooks/useCentralSupplierMutations.ts",
  "../../hooks/useCentralProductCreate.ts",
  "../../hooks/useCentralProductMutations.ts",
  "../../hooks/useCentralProductCatalogStructure.ts",
  "../../hooks/useCentralExpenseMutations.ts",
  "../../hooks/useCentralRecurringExpenseMutations.ts",
  "../../hooks/useCentralUserReminders.ts",
  "../../hooks/useCentralProfileMutation.ts",
  "../../hooks/useCentralQuoteCreate.ts",
  "../../hooks/useCentralReceiptCreate.ts",
] as const;

describe("central authority client plan gate wiring", () => {
  it("mounts a single shared provider at the application root", () => {
    const layout = source("../../app/layout.tsx");
    const gate = source("../../hooks/useCentralAuthorityPlanGate.ts");

    expect(layout).toContain("<CentralAuthorityPlanGateProvider>");
    expect(gate).toContain("CentralAuthorityPlanGateContext.Provider");
    expect(gate).toContain("useContext(CentralAuthorityPlanGateContext)");
  });

  it("gates every business write hook before the public wildcard can apply", () => {
    for (const path of CENTRAL_WRITE_HOOKS) {
      const hook = source(path);
      expect(hook, path).toContain("useCentralAuthorityPlanGate");
      expect(hook, path).toContain("planGate.centralUserId");
    }
  });

  it("gates invoice and rectification emission while bootstrap is pending", () => {
    const invoice = source("../../components/forms/DocumentForm.tsx");
    const rectification = source(
      "../../components/forms/RectificativaForm.tsx",
    );

    for (const form of [invoice, rectification]) {
      expect(form).toContain("useCentralAuthorityPlanGate");
      expect(form).toContain('centralPlanGate.mode === "loading"');
      expect(form).toContain(
        "publicFormCanaryUserId: centralPlanGate.centralUserId",
      );
    }
  });

  it("keeps event receivers off for free or unresolved plans", () => {
    const business = source(
      "../../components/cloud/CentralBusinessAuthorityEventsAutoSync.tsx",
    );
    const invoice = source(
      "../../components/cloud/CentralInvoiceAuthorityEventsAutoSync.tsx",
    );

    for (const receiver of [business, invoice]) {
      expect(receiver).toContain("useCentralAuthorityPlanGate");
      expect(receiver).toContain('planGate.mode === "central"');
    }
  });
});
