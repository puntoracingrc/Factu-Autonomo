import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetRentabilidadRealLocalConfiguration } from "../local-reset";
import {
  clearDocumentAnalysisModesForTests,
  getDocumentAnalysisMode,
  getDocumentAnalysisModeLabel,
  getStoredDocumentAnalysisModes,
  normalizeDocumentAnalysisMode,
  removeDocumentAnalysisMode,
  setDocumentAnalysisMode,
  setStoredDocumentAnalysisModes,
} from "./local-document-analysis-modes";

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
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  });
}

describe("document analysis modes", () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  afterEach(() => {
    clearDocumentAnalysisModesForTests();
    vi.unstubAllGlobals();
  });

  it("guarda y recupera modo por documentId", () => {
    setDocumentAnalysisMode("invoice_1", "fixed_price_work");

    expect(getDocumentAnalysisMode("invoice_1")).toBe("fixed_price_work");
    expect(getStoredDocumentAnalysisModes()).toEqual({
      invoice_1: "fixed_price_work",
    });
  });

  it("normaliza valores desconocidos como unknown", () => {
    expect(normalizeDocumentAnalysisMode("noise")).toBe("unknown");
    expect(
      setStoredDocumentAnalysisModes({
        invoice_1: "hours_project",
        invoice_2: "noise" as "unknown",
      }),
    ).toEqual({
      invoice_1: "hours_project",
      invoice_2: "unknown",
    });
  });

  it("elimina modo de un documento", () => {
    setStoredDocumentAnalysisModes({
      invoice_1: "fixed_price_work",
      invoice_2: "hours_project",
    });

    expect(removeDocumentAnalysisMode("invoice_1")).toEqual({
      invoice_2: "hours_project",
    });
  });

  it("tolera SSR sin localStorage", () => {
    vi.stubGlobal("localStorage", undefined);

    expect(getStoredDocumentAnalysisModes()).toEqual({});
    expect(getDocumentAnalysisMode("missing")).toBe("unknown");
  });

  it("usa labels de autonomo para cada modo", () => {
    expect(getDocumentAnalysisModeLabel("fixed_price_work")).toBe("Obra/trabajo");
    expect(getDocumentAnalysisModeLabel("hours_project")).toBe("Horas/proyecto");
    expect(getDocumentAnalysisModeLabel("unknown")).toBe("No definido");
  });

  it("el reset local de Rentabilidad Real borra analysisMode", () => {
    setDocumentAnalysisMode("invoice_1", "fixed_price_work");

    const result = resetRentabilidadRealLocalConfiguration();

    expect(result.removedKeys).toContain(
      "fa_rentabilidad_real_document_analysis_modes_v1",
    );
    expect(getStoredDocumentAnalysisModes()).toEqual({});
  });
});
