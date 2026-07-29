import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const client = readFileSync(
  "src/lib/central-invoice-authority/form-canary-client.ts",
  "utf8",
);
const documentForm = readFileSync("src/components/forms/DocumentForm.tsx", "utf8");
const rectificationForm = readFileSync(
  "src/components/forms/RectificativaForm.tsx",
  "utf8",
);
const envExample = readFileSync(".env.example", "utf8");
const runtimeDoc = readFileSync(
  "docs/architecture/central-invoice-authority-form-runtime-policy-v1.md",
  "utf8",
);

function documentCreationBranch(): string {
  const start = documentForm.indexOf("const centralDocumentEligible");
  const end = documentForm.indexOf("recordDocumentCreated();", start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return documentForm.slice(start, end);
}

function rectificationCreationBranch(): string {
  const start = rectificationForm.indexOf("const centralRectificationEligible");
  const end = rectificationForm.indexOf("recordDocumentCreated();", start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return rectificationForm.slice(start, end);
}

describe("central invoice authority form runtime policy wiring", () => {
  it("expone una politica runtime que cubre canary publico, required publico y status servidor", () => {
    expect(client).toContain("CENTRAL_INVOICE_AUTHORITY_FORM_RUNTIME_POLICY_V1");
    expect(client).toContain("NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_FORM_CANARY");
    expect(client).toContain(
      "NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_FORM_CANARY_USERS",
    );
    expect(envExample).toContain("CENTRAL_INVOICE_AUTHORITY_CANARY_USER_EMAILS=");
    expect(envExample).toContain("CENTRAL_INVOICE_AUTHORITY_SHADOW_USER_EMAILS=");
    expect(client).toContain("isCentralInvoiceAuthorityFormCanaryEnabledForUser");
    expect(client).toContain("NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_FORM_REQUIRED");
    expect(client).toContain(
      "process.env.NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_FORM_CANARY",
    );
    expect(client).toContain(
      "process.env.NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_FORM_REQUIRED",
    );
    expect(client).not.toContain(
      "env: Record<string, string | undefined> = process.env",
    );
    expect(client).toContain("CENTRAL_INVOICE_AUTHORITY_FORM_LAST_KNOWN_GUARD_V1");
    expect(client).toContain("last_known_central_authority");
    expect(client).toContain("public_canary_not_ready");
    expect(client).toContain("server_canary_not_ready");
    expect(client).toContain("localStorage");
    expect(client).toContain("resolveCentralInvoiceAuthorityFormIssuePolicyFromBrowser");
    expect(client).toContain("fetchCentralInvoiceAuthorityStatusFromBrowser");
    expect(client).toContain('status.activation.requestedMode === "required"');
    expect(client).toContain("status.summary.fiscalWritesPossible");
    expect(runtimeDoc).toContain("aviso no bloqueante");
    expect(runtimeDoc).toContain("No cambia variables de Vercel");
    expect(envExample).toContain("CENTRAL_INVOICE_AUTHORITY_MODE=off");
    expect(envExample).toContain("NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_FORM_CANARY=false");
    expect(envExample).toContain("NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_FORM_CANARY_USERS=");
    expect(envExample).toContain("NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_FORM_REQUIRED=false");
    expect(runtimeDoc).toContain(
      "NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_FORM_CANARY_USERS=<uuid>[,<uuid>]",
    );
    expect(runtimeDoc).toContain(
      "CENTRAL_INVOICE_AUTHORITY_CANARY_USER_EMAILS=<email>[,<email>]",
    );
    expect(runtimeDoc).toContain(
      "CENTRAL_INVOICE_AUTHORITY_SHADOW_USER_EMAILS=<email>[,<email>]",
    );

    const resolverStart = client.indexOf(
      "export async function resolveCentralInvoiceAuthorityFormIssuePolicyFromBrowser",
    );
    const resolverEnd = client.indexOf("async function defaultAccessToken", resolverStart);
    const resolver = client.slice(resolverStart, resolverEnd);
    expect(resolver.indexOf("fetchCentralInvoiceAuthorityStatusFromBrowser")).toBeLessThan(
      resolver.indexOf('return enabledPolicy("public_form_canary", status)'),
    );
    expect(resolver).toContain('return localPolicy("public_canary_not_ready"');
  });

  it("DocumentForm consulta la politica antes de caer al alta local", () => {
    const branch = documentCreationBranch();
    const policyIndex = branch.indexOf(
      "resolveCentralInvoiceAuthorityFormIssuePolicyFromBrowser",
    );
    const centralStoreIndex = branch.indexOf("addDocumentWithCentralIdentity");
    const localStoreIndex = branch.indexOf("saved = addDocument(payload)");

    expect(branch).toContain("centralDocumentEligible");
    expect(branch).toContain("centralPolicy?.shouldUseCentralAuthority");
    expect(branch).toContain("publicFormCanaryUserId: cloudUser?.id");
    expect(policyIndex).toBeGreaterThanOrEqual(0);
    expect(centralStoreIndex).toBeGreaterThan(policyIndex);
    expect(localStoreIndex).toBeGreaterThan(centralStoreIndex);
  });

  it("RectificativaForm consulta la politica antes de caer al alta local", () => {
    const branch = rectificationCreationBranch();
    const policyIndex = branch.indexOf(
      "resolveCentralInvoiceAuthorityFormIssuePolicyFromBrowser",
    );
    const centralStoreIndex = branch.indexOf("addDocumentWithCentralIdentity");
    const localStoreIndex = branch.indexOf(
      "saved = await addRectificativa(original.id, payload)",
    );

    expect(branch).toContain("centralRectificationEligible");
    expect(branch).toContain("centralPolicy?.shouldUseCentralAuthority");
    expect(branch).toContain("publicFormCanaryUserId: cloudUser?.id");
    expect(policyIndex).toBeGreaterThanOrEqual(0);
    expect(centralStoreIndex).toBeGreaterThan(policyIndex);
    expect(localStoreIndex).toBeGreaterThan(centralStoreIndex);
  });
});
