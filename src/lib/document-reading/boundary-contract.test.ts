import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const NEUTRAL_SOURCES = [
  "src/lib/document-reading/contracts.v1.ts",
  "src/lib/document-reading/limits.v1.ts",
  "src/lib/document-reading/browser-file-integrity.v1.ts",
] as const;
const EXPENSE_READER_SOURCES = [
  "src/lib/expense-scan/fiscal-text-layer-compat.v1.ts",
  "src/lib/expense-scan/local-document-reader.worker.ts",
  "src/lib/expense-scan/local-document-reader-adapter.v1.ts",
  "src/lib/expense-scan/local-document-reader-shadow.v1.ts",
] as const;

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("document-reading phase 0 boundary", () => {
  it("mantiene la infraestructura neutral libre de dominios fiscal y gastos", () => {
    for (const path of NEUTRAL_SOURCES) {
      const content = source(path);
      expect(content, path).not.toMatch(/fiscal-notifications|expense-scan|expense-engine/u);
      expect(content, path).not.toMatch(/\b(fetch|localStorage|sessionStorage|indexedDB)\b/u);
      expect(content, path).not.toMatch(/\bconsole\.(?:log|info|warn|error)\b/u);
    }
  });

  it("permite un único puente al parser fiscal sin importar su analizador", () => {
    const compat = source(
      "src/lib/expense-scan/fiscal-text-layer-compat.v1.ts",
    );
    expect(compat).toContain("parseFiscalNotificationPdfTextLayerBytes");
    expect(compat).toContain("fiscal-notifications/pdf-text-layer-parser");
    expect(compat).not.toContain("analyzeFiscalNotificationDocumentInput");
    expect(compat).not.toContain("pdf-worker-analysis-contract");

    for (const path of EXPENSE_READER_SOURCES.filter(
      (candidate) => !candidate.endsWith("fiscal-text-layer-compat.v1.ts"),
    )) {
      expect(source(path), path).not.toMatch(/fiscal-notifications/u);
    }
  });

  it("prohíbe IA, persistencia, UI y mutaciones dentro del lector shadow", () => {
    for (const path of EXPENSE_READER_SOURCES) {
      const content = source(path);
      expect(content, path).not.toMatch(/@\/lib\/expense-engine|openai|api\/expenses|expense-inbox/u);
      expect(content, path).not.toMatch(/\b(fetch|localStorage|sessionStorage|indexedDB)\b/u);
      expect(content, path).not.toMatch(/\bconsole\.(?:log|info|warn|error)\b/u);
      expect(content, path).not.toMatch(/saveExpense|addExpense|updateExpense|deleteExpense/u);
    }
    const shadow = source(
      "src/lib/expense-scan/local-document-reader-shadow.v1.ts",
    );
    expect(shadow).toContain('existingResultPolicy: "UNCHANGED"');
    expect(shadow).toContain('promotionPolicy: "BLOCKED"');
    expect(shadow).toContain('persistencePolicy: "DO_NOT_PERSIST"');
  });

  it("declara la política efímera y nunca devuelve nombres de archivo", () => {
    const contracts = source("src/lib/document-reading/contracts.v1.ts");
    const integrity = source(
      "src/lib/document-reading/browser-file-integrity.v1.ts",
    );
    expect(contracts).toContain("EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST");
    expect(contracts).toContain("retainedSourceContent: \"NONE\"");
    expect(integrity).not.toMatch(/file\.name|filename/u);
  });
});
