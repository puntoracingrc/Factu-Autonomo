import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const form = readFileSync("src/components/forms/DocumentForm.tsx", "utf8");

function creationBranch(): string {
  const start = form.indexOf("const centralDocumentEligible");
  const end = form.indexOf("recordDocumentCreated();", start);
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
    expect(form).toContain(
      "preflightCentralInvoiceAuthorityFormSeries",
    );
    expect(form).toContain("addDocumentWithCentralIdentity");
    expect(form).toContain("runCentralInvoiceAuthorityClientOperation");
    expect(form).toContain("CentralInvoiceAuthorityFormPolicyNotice");
  });

  it("muestra un preflight visible sin cambiar la rama de guardado", () => {
    expect(form).toContain("centralFormPolicyNoticeEligible");
    expect(form).toContain('existing.status === "borrador"');
    expect(form).toContain("!existing.centralInvoiceAuthority");
    expect(form).toContain("publicFormCanaryEnabled={centralCanaryEnabled}");
    expect(form).toContain("documentLabel=\"factura\"");
  });

  it("intercepta altas y borradores locales cuando la politica central lo permite", () => {
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
    expect(branch).toContain(
      "preflightCentralInvoiceAuthorityFormSeries",
    );
    expect(branch).toContain("runCentralInvoiceAuthorityClientOperation");
    expect(branch).toContain("addDocumentWithCentralIdentity");
    expect(branch).toContain("localDocumentId");
    expect(branch).toContain("requireExistingDraft: Boolean(existing)");
    expect(branch).toContain("saved = addDocument(payload)");
  });

  it("falla cerrado si la autoridad central rechaza antes de escribir localmente", () => {
    const branch = creationBranch();
    const rejectionIndex = branch.indexOf("if (!centralResult.ok)");
    const centralStoreIndex = branch.indexOf(
      "addDocumentWithCentralIdentity",
    );
    const localStoreIndex = branch.indexOf("saved = addDocument(payload)");

    expect(rejectionIndex).toBeGreaterThanOrEqual(0);
    expect(centralStoreIndex).toBeGreaterThan(rejectionIndex);
    expect(localStoreIndex).toBeGreaterThan(centralStoreIndex);
    expect(branch.slice(rejectionIndex, centralStoreIndex)).toContain(
      "return centralResult",
    );
    expect(branch.slice(centralStoreIndex, localStoreIndex)).toContain(
      "if (!centralSave.ok)",
    );
    expect(branch.slice(centralStoreIndex, localStoreIndex)).toContain(
      "setFormError(centralSave.message)",
    );
    expect(branch.slice(rejectionIndex, centralStoreIndex)).toContain("return");
  });

  it("concilia la serie exacta antes de pedir identidad fiscal", () => {
    const branch = creationBranch();
    const preflightIndex = branch.indexOf(
      "preflightCentralInvoiceAuthorityFormSeries",
    );
    const issueIndex = branch.indexOf(
      "issueCentralInvoiceAuthorityFromBrowser",
    );
    const centralStoreIndex = branch.indexOf("addDocumentWithCentralIdentity");

    expect(preflightIndex).toBeGreaterThanOrEqual(0);
    expect(issueIndex).toBeGreaterThan(preflightIndex);
    expect(centralStoreIndex).toBeGreaterThan(issueIndex);
    expect(branch.slice(preflightIndex, issueIndex)).toContain(
      "if (!seriesPreflight.ok) return seriesPreflight",
    );
  });
});
