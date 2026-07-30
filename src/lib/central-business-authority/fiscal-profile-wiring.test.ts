import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("central fiscal profile wiring", () => {
  it("serializes profile mutations in the central hook", () => {
    const hook = source("src/hooks/useCentralProfileMutation.ts");

    expect(hook).toContain("createSerialMutationRunner");
    expect(hook).toContain("runSerialMutation");
    expect(hook).toContain("updateProfileWithCentralCanary");
  });

  it.each([
    "src/components/tax-model-diagnostic/TaxModelDiagnosticWizard.tsx",
    "src/components/tax-model-diagnostic/DiagnosticResults.tsx",
    "src/components/fiscal-models/FiscalModelCatalogBrowser.tsx",
    "src/components/consultor-fiscal/ExpenseDeductibilityAnalyzer.tsx",
  ])("routes fiscal writes through the central profile hook in %s", (file) => {
    const component = source(file);

    expect(component).toContain("useCentralProfileMutation");
    expect(component).toContain("updateProfile((profile) =>");
    expect(component).toContain("showFactuToast");
    expect(component).not.toContain("ready, updateProfile } = useAppStore()");
  });

  it("rebases manual model selections against the latest profile", () => {
    const results = source(
      "src/components/tax-model-diagnostic/DiagnosticResults.tsx",
    );
    const catalog = source(
      "src/components/fiscal-models/FiscalModelCatalogBrowser.tsx",
    );

    for (const component of [results, catalog]) {
      expect(component).toContain(
        "current: profile.fiscalAdvisoryModelPreferences",
      );
      expect(component).not.toContain(
        "...data.profile,\n      fiscalAdvisoryModelPreferences",
      );
    }
  });
});
