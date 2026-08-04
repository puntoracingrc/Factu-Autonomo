import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/context/AppStore.tsx", "utf8");

function functionSource(name: string, nextName: string): string {
  const start = source.indexOf(`const ${name}`);
  const end = source.indexOf(`const ${nextName}`, start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("central invoice authority form store bridge", () => {
  it("expone una escritura separada para identidad central sin reasignar numero local", () => {
    const bridge = functionSource(
      "addDocumentWithCentralIdentity",
      "updateDocument",
    );

    expect(source).toContain("addDocumentWithCentralIdentity:");
    expect(source).toContain("addDocumentWithCentralIdentity,");
    expect(bridge).toContain("identity.fullNumber");
    expect(bridge).toContain("identity.kind");
    expect(bridge).toContain("identity.fiscalYear");
    expect(bridge).toContain("identity.sequence");
    expect(bridge).toContain("centralInvoiceAuthority");
    expect(bridge).toContain("identity.serverDocumentId");
    expect(bridge).toContain("identity.identityId");
    expect(bridge).toContain("identity.outboxEventId");
    expect(bridge).toContain("identity.documentVersion");
    expect(bridge).toContain("options.localDocumentId");
    expect(bridge).toContain("bumpNumberingAfterAssign");
    expect(bridge).toContain("commitDurableAppData");
    expect(bridge).not.toContain("assignNextDocumentNumber");
  });

  it("rechaza borradores y series incompatibles antes de tocar el store", () => {
    const bridge = functionSource(
      "addDocumentWithCentralIdentity",
      "updateDocument",
    );

    expect(bridge).toContain('doc.status === "borrador"');
    expect(bridge).toContain('doc.type !== "factura"');
    expect(bridge).toContain('identity.kind !== "factura_rectificativa"');
    expect(bridge).toContain('identity.kind !== "factura"');
    expect(bridge.indexOf("throw new Error")).toBeLessThan(
      bridge.indexOf("commitDurableAppData"),
    );
  });

  it("sustituye el borrador local existente sin duplicarlo tras la confirmacion central", () => {
    const bridge = functionSource(
      "addDocumentWithCentralIdentity",
      "updateDocument",
    );

    expect(bridge).toContain("options.requireExistingDraft");
    expect(bridge).toContain("existingDraft ?? createdDraft");
    expect(bridge).toContain("const nextDocuments = existingDraft");
    expect(bridge).toContain("? prev.documents.map");
    expect(bridge).toContain("item.id === existingDraft.id ? created : item");
    expect(bridge).toContain(": [...prev.documents, created]");
  });

  it("materializa rectificativas centrales con el flujo canonico y actualiza la original", () => {
    const bridge = functionSource(
      "addDocumentWithCentralIdentity",
      "updateDocument",
    );
    const rectificationBranchStart = bridge.indexOf("if (doc.rectification)");
    const localNumberingIndex = bridge.indexOf("const createdDraft");

    expect(rectificationBranchStart).toBeGreaterThanOrEqual(0);
    expect(localNumberingIndex).toBeGreaterThan(rectificationBranchStart);
    const rectificationBranch = bridge.slice(
      rectificationBranchStart,
      localNumberingIndex,
    );

    expect(rectificationBranch).toContain(
      "requireUniqueRectificationOriginal",
    );
    expect(rectificationBranch).toContain(
      "resolveCanonicalRectificationSource",
    );
    expect(rectificationBranch).toContain("canRectifyInvoice");
    expect(rectificationBranch).toContain("hasPendingRectificationDraft");
    expect(rectificationBranch).toContain("canonicalRectificationReference");
    expect(rectificationBranch).toContain("canonicalRectificationItems");
    expect(rectificationBranch).toContain("assertRectificationEmissionAllowed");
    expect(rectificationBranch).toContain("assertDocumentEmissionValid");
    expect(rectificationBranch).toContain("materializeRectificationDocument");
    expect(rectificationBranch).toContain("applyEmittedRectificationToOriginal");
    expect(rectificationBranch).toContain("identity.fullNumber");
    expect(rectificationBranch).toContain("centralInvoiceAuthority");
    expect(rectificationBranch).toContain("bumpNumberingAfterAssign");
    expect(rectificationBranch).not.toContain("assignNextDocumentNumber");
  });
});
