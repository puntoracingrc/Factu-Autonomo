import { describe, expect, it, vi } from "vitest";
import {
  FISCAL_NOTIFICATION_PDF_STANDARD_FONT_DATA_URL,
  parseFiscalNotificationLocalOcrResult,
  recognizeFiscalNotificationPdfLocally,
  type FiscalNotificationLocalOcrDependencies,
} from "./local-pdf-ocr";

const HASH = "0".repeat(64);
const HISTORICAL_ENFORCEMENT = [
  "AGENCIA TRIBUTARIA",
  "www.agenciatributaria.es",
  "NOTIFICACIÓN DE PROVIDENCIA DE APREMIO",
  "IDENTIFICACIÓN DEL DOCUMENTO",
  "IMPORTE DE LA DEUDA",
  "CLAVE DE LIQUIDACIÓN SYNTH-001",
].join("\n");

function pdfFile(): File {
  return new File([new TextEncoder().encode("%PDF-1.7\nsynthetic")], "ignored.pdf", {
    type: "application/pdf",
  });
}

function request(file = pdfFile()) {
  return Object.freeze({
    ownerScope: "user:synthetic-ocr",
    documentId: "document:synthetic-ocr",
    file,
    expectedByteLength: file.size,
    expectedSha256: HASH,
    expectedPageCount: 1,
  });
}

function dependencies(
  text = HISTORICAL_ENFORCEMENT,
  overrides: Partial<FiscalNotificationLocalOcrDependencies> = {},
) {
  const terminate = vi.fn(async () => undefined);
  const release = vi.fn();
  const cleanup = vi.fn();
  const destroyDocument = vi.fn(async () => undefined);
  const destroyLoadingTask = vi.fn(async () => undefined);
  const getDocument = vi.fn(() => ({
    promise: Promise.resolve({
      numPages: 1,
      getPage: async () => ({
        getViewport: () => ({ width: 800, height: 1_000 }),
        render: () => ({ promise: Promise.resolve() }),
        cleanup,
      }),
      destroy: destroyDocument,
    }),
    destroy: destroyLoadingTask,
  }));
  const deps: FiscalNotificationLocalOcrDependencies = {
    digestSha256: vi.fn(async () => new Uint8Array(32).buffer),
    createCanvas: vi.fn(() => ({ canvas: {}, context: {}, release })),
    createOcrWorker: vi.fn(async () => ({
      setParameters: vi.fn(async () => undefined),
      recognize: vi.fn(async () => ({
        data: { text, confidence: 93, blocks: null },
      })),
      terminate,
    })),
    loadPdfJs: vi.fn(async () => ({
      getDocument,
    })),
    timeoutMs: 2_000,
    ...overrides,
  };
  return {
    deps,
    terminate,
    release,
    cleanup,
    destroyDocument,
    destroyLoadingTask,
    getDocument,
  };
}

describe("local PDF OCR", () => {
  it("reads a scanned historical template locally and returns only structured data", async () => {
    const file = pdfFile();
    const source = request(file);
    const {
      deps,
      terminate,
      release,
      cleanup,
      destroyDocument,
      destroyLoadingTask,
      getDocument,
    } =
      dependencies();

    const result = await recognizeFiscalNotificationPdfLocally(source, deps);

    expect(result).toMatchObject({
      status: "OCR_TEXT_AVAILABLE",
      pageCount: 1,
      averageConfidence: 0.93,
      providerCalled: false,
      executionBoundary: "LOCAL_TESSERACT_WORKER",
      retainedSourceContent: "NONE",
      analysis: {
        familyAnalysis: {
          reason: "SUPPORTED_FAMILY_CANDIDATE",
          candidates: [
            {
              familyId: "AEAT_ENFORCEMENT_ORDER_CANDIDATE",
              signalStatus: "COMPLETE_REQUIRED_ANCHORS",
            },
          ],
        },
      },
    });
    expect(JSON.stringify(result)).not.toContain(HISTORICAL_ENFORCEMENT);
    expect(JSON.stringify(result)).not.toContain("synthetic-ocr");
    expect(source.file).toBe(file);
    expect(terminate).toHaveBeenCalledOnce();
    expect(release).toHaveBeenCalledOnce();
    expect(cleanup).toHaveBeenCalledOnce();
    expect(destroyDocument).toHaveBeenCalledOnce();
    expect(destroyLoadingTask).toHaveBeenCalledOnce();
    expect(getDocument).toHaveBeenCalledWith({
      data: expect.any(Uint8Array),
      standardFontDataUrl: FISCAL_NOTIFICATION_PDF_STANDARD_FONT_DATA_URL,
    });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("routes a scanned V2 family through the same structured review pipeline", async () => {
    const sourceText = [
      "Agencia Estatal de Administración Tributaria",
      "Datos fiscales",
      "Ejercicio fiscal: 2025",
      "Fecha de emisión: 16/07/2026",
    ].join("\n");

    const result = await recognizeFiscalNotificationPdfLocally(
      request(),
      dependencies(sourceText).deps,
    );

    expect(result).toMatchObject({
      status: "OCR_TEXT_AVAILABLE",
      providerCalled: false,
      analysis: {
        verticalSliceReview: {
          status: "REVIEW_REQUIRED",
          documents: [
            expect.objectContaining({
              familyId: "information.tax_data_report",
              title: "Datos fiscales",
              fields: expect.arrayContaining([
                expect.objectContaining({
                  canonicalType: "FISCAL_YEAR",
                  normalizedValue: "2025",
                }),
                expect.objectContaining({
                  canonicalType: "ISSUE_DATE",
                  normalizedValue: "2026-07-16",
                }),
              ]),
            }),
          ],
        },
      },
      retainedSourceContent: "NONE",
    });
    expect(JSON.stringify(result)).not.toContain(sourceText);
  });

  it("uses bounded OCR geometry to preserve repeated values in a printed table", async () => {
    const sourceText = [
      "Agencia Estatal de Administración Tributaria",
      "Liquidación independiente de intereses de demora",
      "Intereses de demora",
      "1,00 €",
      "2,00 €",
    ].join("\n");
    const bbox = (x0: number, y0: number, x1: number, y1: number) => ({
      x0,
      y0,
      x1,
      y1,
    });
    const line = (text: string, y: number) => ({
      text,
      confidence: 95,
      baseline: { x0: 10, y0: y + 10, x1: 160, y1: y + 10 },
      rowAttributes: { ascenders: 1, descenders: 1, rowHeight: 12 },
      bbox: bbox(10, y, 160, y + 12),
      words: [
        {
          text,
          confidence: 95,
          bbox: bbox(10, y, 160, y + 12),
          symbols: [],
          choices: [],
          font_name: "",
        },
      ],
    });
    const terminate = vi.fn(async () => undefined);
    const result = await recognizeFiscalNotificationPdfLocally(
      request(),
      dependencies(sourceText, {
        createOcrWorker: vi.fn(async () => ({
          setParameters: vi.fn(async () => undefined),
          recognize: vi.fn(async () => ({
            data: {
              text: sourceText,
              confidence: 95,
              blocks: [
                {
                  paragraphs: [
                    {
                      lines: [
                        line("Intereses de demora", 100),
                        line("1,00 €", 130),
                        line("2,00 €", 160),
                      ],
                    },
                  ],
                },
              ],
            },
          })),
          terminate,
        })),
      }).deps,
    );

    const fields = result.analysis?.verticalSliceReview.documents[0]?.fields ?? [];
    expect(fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ canonicalType: "LATE_INTEREST", amountCents: 100 }),
        expect.objectContaining({ canonicalType: "LATE_INTEREST", amountCents: 200 }),
      ]),
    );
    expect(terminate).toHaveBeenCalledOnce();
    expect(JSON.stringify(result)).not.toContain(sourceText);
  });

  it("reports an unreadable scan without retaining source data", async () => {
    const result = await recognizeFiscalNotificationPdfLocally(
      request(),
      dependencies("   \n").deps,
    );
    expect(result).toMatchObject({
      status: "NO_READABLE_TEXT",
      averageConfidence: null,
      analysis: null,
      retainedSourceContent: "NONE",
    });
  });

  it("fails closed for a hash mismatch and still terminates local resources", async () => {
    const resources = dependencies();
    await expect(
      recognizeFiscalNotificationPdfLocally(
        { ...request(), expectedSha256: "f".repeat(64) },
        resources.deps,
      ),
    ).rejects.toMatchObject({ code: "INVALID_PDF" });
    expect(resources.terminate).not.toHaveBeenCalled();
  });

  it("rejects unknown request and output keys", async () => {
    await expect(
      recognizeFiscalNotificationPdfLocally(
        { ...request(), rawText: "forbidden" },
        dependencies().deps,
      ),
    ).rejects.toMatchObject({ code: "INVALID_PDF" });

    expect(() =>
      parseFiscalNotificationLocalOcrResult({
        schemaVersion: 1,
        ocrVersion: "1.1.0",
        status: "NO_READABLE_TEXT",
        pageCount: 1,
        averageConfidence: null,
        analysis: null,
        providerCalled: false,
        executionBoundary: "LOCAL_TESSERACT_WORKER",
        sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
        retainedSourceContent: "NONE",
        requiresHumanReview: true,
        materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
        rawText: "forbidden",
      }),
    ).toThrowError(expect.objectContaining({ code: "INVALID_WORKER_RESPONSE" }));
  });

  it("enforces page pixel limits before OCR", async () => {
    const resources = dependencies(HISTORICAL_ENFORCEMENT, {
      loadPdfJs: vi.fn(async () => ({
        getDocument: () => ({
          promise: Promise.resolve({
            numPages: 1,
            getPage: async () => ({
              getViewport: () => ({ width: 3_000, height: 3_000 }),
              render: () => ({ promise: Promise.resolve() }),
            }),
          }),
        }),
      })),
    });
    await expect(
      recognizeFiscalNotificationPdfLocally(request(), resources.deps),
    ).rejects.toMatchObject({ code: "INVALID_PDF" });
  });

  it("honors cancellation before reading", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      recognizeFiscalNotificationPdfLocally(
        { ...request(), signal: controller.signal },
        dependencies().deps,
      ),
    ).rejects.toMatchObject({ code: "ABORTED" });
  });
});
