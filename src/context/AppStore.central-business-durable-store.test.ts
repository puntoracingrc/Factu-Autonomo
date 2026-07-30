import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./AppStore.tsx", import.meta.url), "utf8");

function callbackBlock(name: string, nextName: string): string {
  const start = source.indexOf(`const ${name} = useCallback`);
  const end = source.indexOf(`const ${nextName} = useCallback`, start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("AppStore durable central business writes", () => {
  it("normaliza el perfil igual en la escritura local y la durable", () => {
    const local = callbackBlock("updateProfile", "updateProfileDurably");
    const durable = callbackBlock("updateProfileDurably", "addDocument");

    expect(local).toContain("normalizeProfileForAppStore(profile)");
    expect(durable).toContain("commitDurableAppData(expected");
    expect(durable).toContain("normalizeProfileForAppStore(profile)");
    expect(durable).not.toContain("setAppData(");
  });

  it("crea gastos con identidad estable dentro del commit durable", () => {
    const block = callbackBlock("addExpenseDurably", "deleteExpense");

    expect(block).toContain("commitDurableAppData(expected");
    expect(block).toContain("id: identity.id");
    expect(block).toContain("createdAt: identity.now");
    expect(block).toContain("EXPENSE_IDENTIFIER_COLLISION");
    expect(block).not.toContain("newId()");
    expect(block).not.toContain("setAppData(");
  });

  it("actualiza y borra gastos sin saltarse la persistencia durable", () => {
    const remove = callbackBlock(
      "deleteExpenseDurably",
      "updateExpense",
    );
    const update = callbackBlock(
      "updateExpenseDurably",
      "saveScannedExpenseDurably",
    );

    expect(remove).toContain("commitDurableAppData(expected");
    expect(remove).toContain(
      "deleteExpenseFromData(previous, id, identity.excludedAt)",
    );
    expect(update).toContain("commitDurableAppData(expected");
    expect(update).toContain("EXPENSE_NOT_FOUND");
    expect(update).toContain("EXPENSE_IDENTIFIER_COLLISION");
    expect(remove).not.toContain("setAppData(");
    expect(update).not.toContain("setAppData(");
  });

  it("expone todas las variantes durables en el contexto", () => {
    for (const name of [
      "updateProfileDurably",
      "addExpenseDurably",
      "updateExpenseDurably",
      "deleteExpenseDurably",
    ]) {
      expect(source.match(new RegExp(`\\b${name}\\b`, "g"))?.length).toBeGreaterThan(
        3,
      );
    }
  });

  it("protege el autoguardado general frente a pestañas obsoletas", () => {
    expect(source).toContain("persistAppDataAgainstDurableBaseline({");
    expect(source).toContain(
      "persist: (candidate, expected) => saveData(candidate, { expected })",
    );
  });

  it("expone una relectura central que rebobina bajo bloqueo y aplica paginas durables", () => {
    const block = callbackBlock(
      "reconcileCentralBusinessEvents",
      "resolveCentralBusinessConflictKeepingServer",
    );

    expect(block).toContain("withCentralBusinessQueueLock(ownerScope");
    expect(block).toContain(
      "rewindCentralBusinessEventCursorForReconciliation",
    );
    expect(block).toContain("pullCentralBusinessEvents(ownerScope");
    expect(source.match(/\breconcileCentralBusinessEvents\b/g)?.length).toBeGreaterThan(
      3,
    );
  });
});
