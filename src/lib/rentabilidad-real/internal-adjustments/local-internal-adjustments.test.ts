import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addStoredInternalAdjustment,
  clearInternalAdjustmentsForTests,
  getInternalAdjustmentsForSource,
  getStoredInternalAdjustments,
  removeStoredInternalAdjustment,
  setStoredInternalAdjustments,
} from "./local-internal-adjustments";
import { createInternalProfitabilityAdjustment } from "./internal-adjustments";

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

describe("local internal adjustments", () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  afterEach(() => {
    clearInternalAdjustmentsForTests();
    vi.unstubAllGlobals();
  });

  it("guarda y recupera", () => {
    const adjustment = createInternalProfitabilityAdjustment({
      id: "adj_1",
      sourceDocumentId: "doc_1",
      sourceType: "invoice",
      amount: 100,
      label: "Ajuste",
      category: "other_internal_adjustment",
    });

    setStoredInternalAdjustments([adjustment]);

    expect(getStoredInternalAdjustments()).toHaveLength(1);
  });

  it("filtra por sourceDocumentId", () => {
    addStoredInternalAdjustment({
      id: "adj_1",
      sourceDocumentId: "doc_1",
      sourceType: "invoice",
      amount: 100,
      label: "Ajuste 1",
      category: "other_internal_adjustment",
    });
    addStoredInternalAdjustment({
      id: "adj_2",
      sourceDocumentId: "doc_2",
      sourceType: "invoice",
      amount: 50,
      label: "Ajuste 2",
      category: "waste_or_loss",
    });

    expect(getInternalAdjustmentsForSource("doc_1").map((item) => item.id))
      .toEqual(["adj_1"]);
  });

  it("elimina ajuste", () => {
    addStoredInternalAdjustment({
      id: "adj_1",
      sourceDocumentId: "doc_1",
      sourceType: "invoice",
      amount: 100,
      label: "Ajuste",
      category: "other_internal_adjustment",
    });

    removeStoredInternalAdjustment("adj_1");

    expect(getStoredInternalAdjustments()).toHaveLength(0);
  });

  it("tolera SSR sin localStorage", () => {
    vi.unstubAllGlobals();

    expect(getStoredInternalAdjustments()).toEqual([]);
  });

  it("limpia en tests", () => {
    addStoredInternalAdjustment({
      id: "adj_1",
      sourceDocumentId: "doc_1",
      sourceType: "invoice",
      amount: 100,
      label: "Ajuste",
      category: "other_internal_adjustment",
    });

    clearInternalAdjustmentsForTests();

    expect(getStoredInternalAdjustments()).toEqual([]);
  });
});
