import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const form = readFileSync("src/components/forms/DocumentForm.tsx", "utf8");

function creationBranch(): string {
  const start = form.indexOf("if (existing) {");
  const end = form.indexOf("saved = attachIssuerSnapshot", start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return form.slice(start, end);
}

describe("DocumentForm central authority canary wiring", () => {
  it("importa el puente canary y expone la escritura central del store", () => {
    expect(form).toContain(
      "buildCentralInvoiceAuthorityDocumentFormIssueRequest",
    );
    expect(form).toContain(
      "shouldUseCentralInvoiceAuthorityDocumentFormCanary",
    );
    expect(form).toContain("isCentralInvoiceAuthorityFormCanaryEnabled");
    expect(form).toContain("issueCentralInvoiceAuthorityFromBrowser");
    expect(form).toContain("addDocumentWithCentralIdentity");
  });

  it("solo intercepta la creacion nueva cuando la bandera canary esta activa", () => {
    const branch = creationBranch();

    expect(branch).toContain("centralCanaryEnabled");
    expect(branch).toContain(
      "shouldUseCentralInvoiceAuthorityDocumentFormCanary",
    );
    expect(branch).toContain("crypto.randomUUID()");
    expect(branch).toContain(
      "buildCentralInvoiceAuthorityDocumentFormIssueRequest",
    );
    expect(branch).toContain("issueCentralInvoiceAuthorityFromBrowser");
    expect(branch).toContain("addDocumentWithCentralIdentity");
    expect(branch).toContain("localDocumentId");
    expect(branch).toContain("saved = addDocument(payload)");
  });

  it("falla cerrado si la autoridad central rechaza antes de escribir localmente", () => {
    const branch = creationBranch();
    const rejectionIndex = branch.indexOf("if (!centralResult.ok)");
    const centralStoreIndex = branch.indexOf("addDocumentWithCentralIdentity");
    const localStoreIndex = branch.indexOf("saved = addDocument(payload)");

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
