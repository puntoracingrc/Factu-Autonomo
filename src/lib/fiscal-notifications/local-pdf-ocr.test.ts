import { describe, expect, it, vi } from "vitest";
import {
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
  const deps: FiscalNotificationLocalOcrDependencies = {
    digestSha256: vi.fn(async () => new Uint8Array(32).buffer),
    createCanvas: vi.fn(() => ({ canvas: {}, context: {}, release })),
    createOcrWorker: vi.fn(async () => ({
      setParameters: vi.fn(async () => undefined),
      recognize: vi.fn(async () => ({ data: { text, confidence: 93 } })),
      terminate,
    })),
    loadPdfJs: vi.fn(async () => ({
      getDocument: () => ({
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
      }),
    })),
    timeoutMs: 2_000,
    ...overrides,
  };
  return { deps, terminate, release, cleanup, destroyDocument, destroyLoadingTask };
}

describe("local PDF OCR", () => {
  it("reads a scanned historical template locally and returns only structured data", async () => {
    const file = pdfFile();
    const source = request(file);
    const { deps, terminate, release, cleanup, destroyDocument, destroyLoadingTask } =
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
    expect(Object.isFrozen(result)).toBe(true);
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
        ocrVersion: "1.0.0",
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
