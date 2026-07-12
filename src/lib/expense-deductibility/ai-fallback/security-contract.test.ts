import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function productionSources(relativeDirectory: string): string {
  const root = fileURLToPath(new URL(relativeDirectory, import.meta.url));
  return readdirSync(root, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith(".ts") &&
        !entry.name.endsWith(".test.ts"),
    )
    .map((entry) => readFileSync(join(root, entry.name), "utf8"))
    .join("\n");
}

describe("perímetro de seguridad del fallback fiscal", () => {
  const fallback = productionSources("./");
  const analyzer = source(
    "../../../components/consultor-fiscal/ExpenseDeductibilityAnalyzer.tsx",
  );
  const route = source(
    "../../../app/api/expense-deductibility/evaluate/route.ts",
  );
  const sharedClient = source("../../server/openai-client.ts");
  const importReview = source("../../import-ai/review.ts");

  it("mantiene la llamada OpenAI y la API key exclusivamente en el transporte servidor", () => {
    expect(sharedClient).toContain("https://api.openai.com/v1");
    expect(sharedClient).toContain("process.env.OPENAI_API_KEY");
    expect(fallback).not.toContain("https://api.openai.com");
    expect(fallback).not.toContain("OPENAI_API_KEY");
    expect(fallback).not.toMatch(/\bfetch\s*\(/);
    expect(analyzer).not.toContain("api.openai.com");
    expect(analyzer).not.toContain("OPENAI_API_KEY");
    expect(route).not.toContain("OPENAI_API_KEY");
  });

  it("reutiliza el transporte compartido en vez de añadir un fetch fiscal o de importación", () => {
    expect(importReview).toContain("requestOpenAiJson");
    expect(importReview).not.toContain("api.openai.com");
    expect(importReview).not.toMatch(/\bfetch\s*\(/);
    expect(fallback).toContain("requestOpenAiJson");
  });

  it("no contiene caminos de escritura de gastos, documentos o asientos", () => {
    expect(`${fallback}\n${route}\n${analyzer}`).not.toMatch(
      /\b(?:addExpense|updateExpense|createExpense|createJournalEntry|addJournalEntry|confirmJournalEntry|saveDocument|persistEvaluation)\b/,
    );
    expect(source("../../../components/consultor-fiscal/EvaluationResultPanel.tsx"))
      .toMatch(/<button[\s\S]*?disabled[\s\S]*?Aplicar propuesta/);
  });
});
