import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const form = readFileSync("src/components/forms/RectificativaForm.tsx", "utf8");

function saveBranch(): string {
  const start = form.indexOf("const payload = buildRectificativaPayload");
  const end = form.indexOf("recordDocumentCreated();", start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return form.slice(start, end);
}

describe("RectificativaForm central authority canary wiring", () => {
  it("importa el puente canary y expone la escritura central del store", () => {
    expect(form).toContain(
      "buildCentralInvoiceAuthorityRectificationFormIssueRequest",
    );
    expect(form).toContain(
      "shouldUseCentralInvoiceAuthorityRectificationFormCanary",
    );
    expect(form).toContain("isCentralInvoiceAuthorityFormCanaryEnabled");
    expect(form).toContain("issueCentralInvoiceAuthorityFromBrowser");
    expect(form).toContain("addDocumentWithCentralIdentity");
    expect(form).toContain("buildRectificativaPayload");
    expect(form).toContain("CentralInvoiceAuthorityFormPolicyNotice");
  });

  it("muestra preflight visible solo para originales con identidad central coherente", () => {
    expect(form).toContain("centralRectificationPolicyNoticeEligible");
    expect(form).toContain("resolveCentralInvoiceAuthorityRectificationTarget");
    expect(form).toContain("publicFormCanaryEnabled={centralCanaryEnabled}");
    expect(form).toContain("documentLabel=\"factura rectificativa\"");
  });

  it("solo intercepta rectificativas centrales cuando la politica central lo permite", () => {
    const branch = saveBranch();

    expect(branch).toContain("centralCanaryEnabled");
    expect(branch).toContain(
      "shouldUseCentralInvoiceAuthorityRectificationFormCanary",
    );
    expect(branch).toContain("crypto.randomUUID()");
    expect(branch).toContain(
      "buildCentralInvoiceAuthorityRectificationFormIssueRequest",
    );
    expect(branch).toContain("issueCentralInvoiceAuthorityFromBrowser");
    expect(branch).toContain("addDocumentWithCentralIdentity");
    expect(branch).toContain("localDocumentId");
    expect(branch).toContain("saved = await addRectificativa(original.id, payload)");
  });

  it("falla cerrado si la autoridad central rechaza antes de escribir localmente", () => {
    const branch = saveBranch();
    const rejectionIndex = branch.indexOf("if (!centralResult.ok)");
    const centralStoreIndex = branch.indexOf("addDocumentWithCentralIdentity");
    const localStoreIndex = branch.indexOf(
      "saved = await addRectificativa(original.id, payload)",
    );

    expect(rejectionIndex).toBeGreaterThanOrEqual(0);
    expect(centralStoreIndex).toBeGreaterThan(rejectionIndex);
    expect(localStoreIndex).toBeGreaterThan(centralStoreIndex);
    expect(branch.slice(rejectionIndex, centralStoreIndex)).toContain(
      "setSaveAction(\"idle\")",
    );
    expect(branch.slice(rejectionIndex, centralStoreIndex)).toContain(
      "setFormError(centralResult.message)",
    );
    expect(branch.slice(rejectionIndex, centralStoreIndex)).toContain("return");
  });
});
