import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_IMAGE_BYTES } from "./limits";
import { resolveScanMimeType, validateScanFile } from "./file-validation";
import {
  filterWarningsAfterPdfLineExtraction,
  extractExpenseFromImage,
  mergePdfPurchaseLineVat,
  resolveExpenseScanMaxTokens,
} from "./openai";
import { EXPENSE_SCAN_MAINTENANCE_MESSAGE } from "./scan-queue";
import {
  EXPENSE_LEARNING_HINTS_SCHEMA_VERSION,
  type ExpenseLearningHintsV1,
} from "../expense-engine/contracts";
import { EXPENSE_SCAN_AI_OUTPUT_SCHEMA_VERSION } from "./schema";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function mockFile(name: string, type: string, size = 1000): File {
  return { name, type, size } as File;
}

function providerExpense() {
  return {
    supplier: { name: "Proveedor Sintético", nif: "B00000000" },
    expense: {
      date: "2026-07-21",
      description: "Material sintético",
      amount: 100,
      ivaPercent: 21,
      category: "Material",
      paymentMethod: "Transferencia",
    },
    confidence: 0.9,
    warnings: [],
  };
}

function providerLearningHints(): ExpenseLearningHintsV1 {
  return {
    schemaVersion: EXPENSE_LEARNING_HINTS_SCHEMA_VERSION,
    layout: {
      pageMode: "SINGLE",
      readingOrder: "ROW_MAJOR",
      regionOrder: ["HEADER", "LINE_ITEMS", "TOTALS"],
      tableCount: "ONE",
    },
    columns: [
      {
        tableRole: "LINE_ITEMS",
        index: 0,
        role: "DESCRIPTION",
        normalizedLabel: "DESCRIPTION",
        unit: "TEXT",
        sign: "UNSIGNED",
        confidence: "HIGH",
      },
    ],
    labels: [{ role: "TOTAL", region: "TOTALS", confidence: "HIGH" }],
    formulas: [
      {
        scope: "DOCUMENT",
        kind: "BASE_PLUS_TAX",
        rounding: { mode: "HALF_UP", scale: 2 },
        sign: "SIGNED",
        confidence: "MEDIUM",
      },
    ],
  };
}

function mockProviderJson(value: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(
    Response.json({
      choices: [{ message: { content: JSON.stringify(value) } }],
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("validateScanFile", () => {
  it("acepta PDF por tipo o extensión", () => {
    expect(validateScanFile(mockFile("factura.pdf", "application/pdf"))).toBeNull();
    expect(validateScanFile(mockFile("factura.pdf", ""))).toBeNull();
  });

  it("acepta imágenes habituales", () => {
    expect(validateScanFile(mockFile("ticket.jpg", "image/jpeg"))).toBeNull();
  });

  it("rechaza formatos no soportados", () => {
    expect(validateScanFile(mockFile("doc.docx", "application/msword"))).toMatch(
      /no soportado/i,
    );
  });

  it("rechaza imágenes por encima del límite", () => {
    expect(
      validateScanFile(mockFile("foto.jpg", "image/jpeg", MAX_IMAGE_BYTES + 1)),
    ).toMatch(/demasiado grande/i);
  });
});

describe("resolveScanMimeType", () => {
  it("infiere PDF sin mime del navegador", () => {
    expect(resolveScanMimeType(mockFile("a.PDF", ""))).toBe("application/pdf");
  });
});

describe("resolveExpenseScanMaxTokens", () => {
  it("usa un margen suficiente para facturas con muchas líneas", () => {
    expect(resolveExpenseScanMaxTokens()).toBe(6000);
  });

  it("permite configurar el margen dentro de límites razonables", () => {
    expect(resolveExpenseScanMaxTokens("4200")).toBe(4200);
    expect(resolveExpenseScanMaxTokens("1200")).toBe(2000);
    expect(resolveExpenseScanMaxTokens("15000")).toBe(12000);
  });
});

describe("extractExpenseFromImage provider failures", () => {
  it("oculta el mensaje de cuota del proveedor y devuelve mantenimiento tipado", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          {
            error: {
              code: "insufficient_quota",
              type: "insufficient_quota",
              message: "You exceeded your current quota.",
            },
          },
          { status: 429 },
        ),
      ),
    );

    const result = await extractExpenseFromImage("base64", "image/jpeg");

    expect(result).toEqual({
      error: EXPENSE_SCAN_MAINTENANCE_MESSAGE,
      errorCode: "SCAN_SERVICE_UNAVAILABLE",
    });
    expect(JSON.stringify(result)).not.toContain("current quota");
  });

  it("presenta una caida de red como mantenimiento sin perder el contrato de reintento", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(
      extractExpenseFromImage("base64", "image/jpeg"),
    ).resolves.toEqual({
      error: EXPENSE_SCAN_MAINTENANCE_MESSAGE,
      errorCode: "SCAN_SERVICE_UNAVAILABLE",
    });
  });
});

describe("extractExpenseFromImage learning envelope", () => {
  it("devuelve hints válidos como metadato separado con una sola llamada", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key");
    const fetchMock = mockProviderJson({
      schemaVersion: EXPENSE_SCAN_AI_OUTPUT_SCHEMA_VERSION,
      expense: providerExpense(),
      learningHints: providerLearningHints(),
    });

    const result = await extractExpenseFromImage("base64", "image/jpeg");

    expect(result.data?.expense.description).toBe("Material sintético");
    expect(result.learningHints?.formulas[0]?.kind).toBe("BASE_PLUS_TAX");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("descarta hints con contenido libre sin perder el gasto ni registrarlo", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key");
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fetchMock = mockProviderJson({
      schemaVersion: EXPENSE_SCAN_AI_OUTPUT_SCHEMA_VERSION,
      expense: providerExpense(),
      learningHints: {
        ...providerLearningHints(),
        supplierName: "CANARY-IDENTITY-NOT-FOR-LOGS",
      },
    });

    const result = await extractExpenseFromImage("base64", "image/jpeg");

    expect(result.data?.supplier.name).toBe("Proveedor Sintético");
    expect(result.learningHints).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.stringify([...info.mock.calls, ...error.mock.calls])).not.toContain(
      "CANARY-IDENTITY-NOT-FOR-LOGS",
    );
  });

  it("mantiene compatibilidad con respuestas legadas", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key");
    const fetchMock = mockProviderJson(providerExpense());

    const result = await extractExpenseFromImage("base64", "image/jpeg");

    expect(result.data?.expense.amount).toBe(100);
    expect(result.learningHints).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("filterWarningsAfterPdfLineExtraction", () => {
  it("elimina avisos obsoletos cuando el lector del PDF recupera todas las líneas", () => {
    expect(
      filterWarningsAfterPdfLineExtraction(
        [
          "Documento contiene múltiples líneas de productos, se han extraído las primeras 5.",
          "Revisar si conviene configurar como gasto fijo.",
          "Revisa el NIF del proveedor.",
        ],
        40,
        "purchase_invoice",
      ),
    ).toEqual(["Revisa el NIF del proveedor."]);
  });

  it("mantiene sugerencias de gasto fijo cuando el gasto realmente es fijo", () => {
    expect(
      filterWarningsAfterPdfLineExtraction(
        ["Revisar si conviene configurar como gasto fijo."],
        2,
        "fixed",
      ),
    ).toEqual(["Revisar si conviene configurar como gasto fijo."]);
  });
});

describe("mergePdfPurchaseLineVat", () => {
  it("conserva los tipos de IVA visuales al ampliar una tabla PDF", () => {
    const merged = mergePdfPurchaseLineVat(
      [
        { supplierReference: "A-1", description: "Material", quantity: 1, unitPrice: 100 },
        { supplierReference: "B-2", description: "Transporte", quantity: 1, unitPrice: 100 },
        { supplierReference: "C-3", description: "Embalaje", quantity: 1, unitPrice: 10 },
      ],
      [
        { supplierReference: "A-1", description: "Material", quantity: 1, unitPrice: 100, ivaPercent: 21 },
        { supplierReference: "B-2", description: "Transporte", quantity: 1, unitPrice: 100, ivaPercent: 10 },
      ],
    );

    expect(merged.map((line) => line.ivaPercent)).toEqual([21, 10, undefined]);
  });

  it("no asigna IVA por posición ni por una clave ambigua", () => {
    const merged = mergePdfPurchaseLineVat(
      [
        { description: "Fila distinta", quantity: 1, unitPrice: 100 },
        { description: "Repetida", quantity: 1, unitPrice: 50 },
        { description: "Repetida", quantity: 1, unitPrice: 50 },
      ],
      [
        { description: "Otra fila", quantity: 1, unitPrice: 100, ivaPercent: 21 },
        { description: "Repetida", quantity: 1, unitPrice: 50, ivaPercent: 10 },
        { description: "Repetida", quantity: 1, unitPrice: 50, ivaPercent: 4 },
      ],
    );

    expect(merged.map((line) => line.ivaPercent)).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
  });
});
