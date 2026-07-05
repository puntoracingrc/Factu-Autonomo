import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearHiddenExpenseCandidatesForTests,
  getHiddenExpenseCandidateIdsForWork,
  hideExpenseCandidateForWork,
  restoreAllExpenseCandidatesForWork,
  restoreExpenseCandidateForWork,
} from "./local-hidden-candidates";

function mockLocalStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  });
}

describe("rentabilidad real hidden expense candidates", () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  afterEach(() => {
    clearHiddenExpenseCandidatesForTests();
    vi.unstubAllGlobals();
  });

  it("oculta y recupera candidatos por documento", () => {
    expect(getHiddenExpenseCandidateIdsForWork("invoice_1")).toEqual([]);

    expect(hideExpenseCandidateForWork("invoice_1", "expense_1")).toEqual([
      "expense_1",
    ]);
    expect(hideExpenseCandidateForWork("invoice_1", "expense_1")).toEqual([
      "expense_1",
    ]);
    expect(hideExpenseCandidateForWork("invoice_2", "expense_2")).toEqual([
      "expense_2",
    ]);

    expect(getHiddenExpenseCandidateIdsForWork("invoice_1")).toEqual([
      "expense_1",
    ]);
    expect(restoreExpenseCandidateForWork("invoice_1", "expense_1")).toEqual(
      [],
    );
    expect(getHiddenExpenseCandidateIdsForWork("invoice_2")).toEqual([
      "expense_2",
    ]);
  });

  it("recupera todos los candidatos ocultos de un documento", () => {
    hideExpenseCandidateForWork("invoice_1", "expense_1");
    hideExpenseCandidateForWork("invoice_1", "expense_2");

    expect(restoreAllExpenseCandidatesForWork("invoice_1")).toEqual([]);
    expect(getHiddenExpenseCandidateIdsForWork("invoice_1")).toEqual([]);
  });

  it("tolera SSR sin localStorage", () => {
    vi.unstubAllGlobals();

    expect(getHiddenExpenseCandidateIdsForWork("invoice_1")).toEqual([]);
  });
});
