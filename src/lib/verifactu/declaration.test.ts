import { describe, expect, it } from "vitest";
import { buildDeclarationOfConformity } from "./declaration";

describe("declaration of conformity", () => {
  it("includes software metadata and Spanish statement", () => {
    const doc = buildDeclarationOfConformity();
    expect(doc.modality).toBe("VERI*FACTU");
    expect(doc.statementEs).toContain("DECLARACIÓN RESPONSABLE");
    expect(doc.statementEs).toContain(doc.softwareName);
    expect(doc.issuedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
