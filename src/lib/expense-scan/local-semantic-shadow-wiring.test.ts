import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("expense local semantic shadow wiring", () => {
  const scanner = source("../../components/expenses/ExpenseScanCard.tsx");
  const form = source("../../app/gastos/nuevo/page.tsx");
  const runtime = source("./local-semantic-shadow.v1.ts");

  it("runs locally in parallel without changing the provider payload", () => {
    expect(scanner.indexOf("startExpenseLocalSemanticShadowV1({")).toBeLessThan(
      scanner.indexOf("await scanFile(item.file)"),
    );
    expect(scanner).toContain("onScanned(data, {");
    expect(scanner).toContain("localShadow,");
    expect(scanner).toContain("localShadowHandlesRef.current.add(localShadow)");
    expect(scanner).toContain("localShadowHandlesRef.current.delete(localShadow)");
    expect(scanner).toContain("handle.dispose()");
    expect(scanner).not.toContain("await startExpenseLocalSemanticShadowV1");
    expect(scanner).not.toContain("data: localShadow");
  });

  it("carries only an ephemeral handle until durable human save succeeds", () => {
    expect(form).toContain(
      "localShadow?: ExpenseLocalSemanticShadowHandleV1;",
    );
    expect(form).toContain("result.value.expense");
    expect(form).toContain("result.replayed");
    expect(form).toContain("if (replayed) {");
    expect(form).toContain("replayed: false,");
    expect(form).toContain(
      "localShadowHandlesRef.current.add(review.localShadow)",
    );
    expect(form).toContain(
      "localShadowHandlesRef.current.delete(handle)",
    );
    expect(form).toContain("handle.dispose()");
    expect(form.match(/completeLocalSemanticShadowAfterDurableSave\(/gu)).toHaveLength(
      3,
    );
    const saveScanPayload = form.indexOf("async function saveScanPayload(");
    const appliedGate = form.indexOf(
      'if (result.status !== "applied")',
      saveScanPayload,
    );
    const completion = form.indexOf(
      "completeLocalSemanticShadowAfterDurableSave(",
      appliedGate,
    );
    expect(appliedGate).toBeGreaterThan(saveScanPayload);
    expect(completion).toBeGreaterThan(appliedGate);
    expect(form).not.toContain("JSON.stringify(review.localShadow)");
    expect(form).not.toContain("localStorage.setItem");
  });

  it("keeps the runtime disconnected from persistence, APIs and UI", () => {
    expect(runtime).toContain('persistencePolicy: "DO_NOT_PERSIST"');
    expect(runtime).toContain('existingResultPolicy: "UNCHANGED"');
    expect(runtime).toContain("normalizeExpenseEngineObservationV1");
    expect(runtime).not.toContain("fetch(");
    expect(runtime).not.toContain("localStorage");
    expect(runtime).not.toContain("sessionStorage");
    expect(runtime).not.toContain("console.");
    expect(runtime).not.toContain("supabase");
  });
});
