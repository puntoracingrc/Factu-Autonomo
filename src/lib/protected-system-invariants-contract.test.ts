import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../", import.meta.url));

function source(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), "utf8");
}

const protectedAdrs = [
  "ADR-0001-historical-imported-documents.md",
  "ADR-0002-app-issued-document-recovery.md",
  "ADR-0003-explicit-test-document-retirement.md",
  "ADR-0004-expense-inbox-email-reliability.md",
  "ADR-0005-cloud-and-drive-sync-reliability.md",
  "ADR-0006-customer-master-reliability.md",
] as const;

describe("mandatory protected-system registry", () => {
  it("obliga a leer el registro desde las instrucciones de raiz", () => {
    const agents = source("AGENTS.md");

    expect(agents).toContain("Lectura obligatoria antes de editar");
    expect(agents).toContain("PROTECTED-SYSTEM-INVARIANTS.md");
    expect(agents).toContain("protected-system-invariants-contract.test.ts");
  });

  it("mantiene todos los contratos versionados en el registro", () => {
    const registry = source("docs/architecture/PROTECTED-SYSTEM-INVARIANTS.md");

    for (const adr of protectedAdrs) {
      expect(registry).toContain(adr);
      expect(() => source(`docs/architecture/${adr}`)).not.toThrow();
    }

    expect(registry).toContain("autorización expresa");
    expect(registry).toContain("legacy_imported + user_attested");
    expect(registry).toContain("expense-inbox-reliability-contract.test.ts");
    expect(registry).toContain("cloud-drive-sync-reliability-contract.test.ts");
    expect(registry).toContain("customer-master-reliability-contract.test.ts");
    expect(registry).toContain("no añade fricción");
  });

  it("protege las instrucciones y el registro con CODEOWNERS", () => {
    const codeowners = source(".github/CODEOWNERS");

    expect(codeowners).toContain("/AGENTS.md");
    expect(codeowners).toContain(
      "/docs/architecture/PROTECTED-SYSTEM-INVARIANTS.md",
    );
    for (const adr of protectedAdrs) {
      expect(codeowners).toContain(`/docs/architecture/${adr}`);
    }
  });
});
