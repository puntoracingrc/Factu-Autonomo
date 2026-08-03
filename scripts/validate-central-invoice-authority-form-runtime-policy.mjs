import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function runBin(bin, args) {
  execFileSync(bin, args, {
    encoding: "utf8",
    stdio: "pipe",
  });
}

function includes(source, text, label) {
  assert.match(
    source,
    new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    `${label} must contain ${text}`,
  );
}

const marker = "CENTRAL_INVOICE_AUTHORITY_FORM_RUNTIME_POLICY_V1";
const client = read("src/lib/central-invoice-authority/form-canary-client.ts");
const documentForm = read("src/components/forms/DocumentForm.tsx");
const rectificationForm = read("src/components/forms/RectificativaForm.tsx");
const policyNotice = read(
  "src/lib/central-invoice-authority/form-canary-presentation.ts",
);
const policyNoticeComponent = read(
  "src/components/forms/CentralInvoiceAuthorityFormPolicyNotice.tsx",
);
const wiringTest = read(
  "src/lib/central-invoice-authority/form-runtime-policy-wiring.test.ts",
);
const envExample = read(".env.example");
const doc = read(
  "docs/architecture/central-invoice-authority-form-runtime-policy-v1.md",
);
const documentDoc = read(
  "docs/architecture/central-invoice-authority-document-form-canary-v1.md",
);
const rectificationDoc = read(
  "docs/architecture/central-invoice-authority-rectification-form-wiring-v1.md",
);
const packageJson = JSON.parse(read("package.json"));
const body = `${client}\n${documentForm}\n${rectificationForm}\n${wiringTest}\n${doc}\n${documentDoc}\n${rectificationDoc}`;
const noticeBody = `${policyNotice}\n${policyNoticeComponent}\n${wiringTest}\n${envExample}\n${doc}`;

for (const required of [
  marker,
  "NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_FORM_CANARY",
  "NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_FORM_CANARY_USERS",
  "CENTRAL_INVOICE_AUTHORITY_CANARY_USER_EMAILS",
  "NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_FORM_REQUIRED",
  "isCentralInvoiceAuthorityFormCanaryEnabledForUser",
  "resolveCentralInvoiceAuthorityFormIssuePolicyFromBrowser",
  "fetchCentralInvoiceAuthorityStatusFromBrowser",
  'status.activation.requestedMode === "required"',
  "status.summary.fiscalWritesPossible",
  "public_canary_not_ready",
  "server_canary_not_ready",
  "centralDocumentEligible",
  "centralRectificationEligible",
  'centralPlanGate.mode === "loading"',
  "centralAuthorityPlanLoadingFailure",
  "publicFormCanaryUserId: centralPlanGate.centralUserId",
  "centralPolicy?.shouldUseCentralAuthority",
  "addDocumentWithCentralIdentity",
  "no cae a numeracion local",
]) {
  includes(body, required, "central authority form runtime policy");
}

for (const required of [
  "CENTRAL_INVOICE_AUTHORITY_FORM_POLICY_NOTICE_V1",
  "describeCentralInvoiceAuthorityFormPolicyNotice",
  "CentralInvoiceAuthorityFormPolicyNotice",
  "Comprobando autoridad central",
  "Canario central activo",
  "Canario central en espera",
  "NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_FORM_CANARY=false",
  "NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_FORM_CANARY_USERS=",
  "CENTRAL_INVOICE_AUTHORITY_CANARY_USER_EMAILS=",
  "NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_FORM_REQUIRED=false",
  "CENTRAL_INVOICE_AUTHORITY_MODE=off",
]) {
  includes(noticeBody, required, "central authority form policy notice");
}

const resolverStart = client.indexOf(
  "export async function resolveCentralInvoiceAuthorityFormIssuePolicyFromBrowser",
);
const resolverEnd = client.indexOf("async function defaultAccessToken", resolverStart);
assert.ok(resolverStart >= 0, "Missing central authority form policy resolver");
assert.ok(resolverEnd > resolverStart, "Cannot isolate central authority resolver");
const resolver = client.slice(resolverStart, resolverEnd);
assert.ok(
  resolver.indexOf("fetchCentralInvoiceAuthorityStatusFromBrowser") <
    resolver.indexOf('return enabledPolicy("public_form_canary", status)'),
  "public form canary must be status-bound before using central authority",
);
assert.match(
  resolver,
  /return localPolicy\("public_canary_not_ready"/,
  "public form canary must abstain when status gates are not ready",
);

const docBranchStart = documentForm.indexOf("const centralDocumentEligible");
const docBranchEnd = documentForm.indexOf("recordDocumentCreated();", docBranchStart);
assert.ok(docBranchStart >= 0, "Missing document central eligibility");
assert.ok(docBranchEnd > docBranchStart, "Cannot isolate DocumentForm branch");
const docBranch = documentForm.slice(docBranchStart, docBranchEnd);
assert.ok(
  docBranch.indexOf("resolveCentralInvoiceAuthorityFormIssuePolicyFromBrowser") <
    docBranch.indexOf("addDocumentWithCentralIdentity"),
  "DocumentForm must resolve central policy before central store write",
);
assert.ok(
  docBranch.indexOf("addDocumentWithCentralIdentity") <
    docBranch.indexOf("saved = addDocument(payload)"),
  "DocumentForm local fallback must remain outside central branch",
);

const rectBranchStart = rectificationForm.indexOf(
  "const centralRectificationEligible",
);
const rectBranchEnd = rectificationForm.indexOf(
  "recordDocumentCreated();",
  rectBranchStart,
);
assert.ok(rectBranchStart >= 0, "Missing rectification central eligibility");
assert.ok(rectBranchEnd > rectBranchStart, "Cannot isolate RectificativaForm branch");
const rectBranch = rectificationForm.slice(rectBranchStart, rectBranchEnd);
assert.ok(
  rectBranch.indexOf("resolveCentralInvoiceAuthorityFormIssuePolicyFromBrowser") <
    rectBranch.indexOf("addDocumentWithCentralIdentity"),
  "RectificativaForm must resolve central policy before central store write",
);
assert.ok(
  rectBranch.indexOf("addDocumentWithCentralIdentity") <
    rectBranch.indexOf("saved = await addRectificativa(original.id, payload)"),
  "RectificativaForm local fallback must remain outside central branch",
);

assert.equal(
  packageJson.scripts["validate:central-invoice-authority-form-runtime-policy"],
  "node scripts/validate-central-invoice-authority-form-runtime-policy.mjs",
);
assert.match(
  packageJson.scripts["check:authority-central-release-gate"],
  /validate:central-invoice-authority-form-runtime-policy/,
);

runBin("npx", [
  "vitest",
  "run",
  "src/lib/central-invoice-authority/form-canary-client.test.ts",
  "src/lib/central-invoice-authority/form-runtime-policy-wiring.test.ts",
  "src/lib/central-invoice-authority/form-canary-presentation.test.ts",
  "src/lib/central-invoice-authority/document-form-canary-wiring.test.ts",
  "src/lib/central-invoice-authority/rectification-form-canary-wiring.test.ts",
]);

console.log("central invoice authority form runtime policy: OK");
