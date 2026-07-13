import { describe, expect, it, vi } from "vitest";
import { jsPDF } from "jspdf";
import {
  FISCAL_NOTIFICATION_PDF_LIMITS,
  FiscalNotificationPdfError,
  hasStrictPdfMagic,
  parseFiscalNotificationPdfTextLayerBytes,
  type FiscalNotificationPdfJsAdapter,
} from "./pdf-text-layer-parser";

interface SyntheticTextItem {
  readonly str?: string;
  readonly hasEOL?: boolean;
}

interface SyntheticPdfOptions {
  readonly numPages?: number;
  readonly itemsByPage?: readonly (readonly unknown[])[];
  readonly loadingError?: Error;
  readonly pageErrorAt?: number;
  readonly textErrorAt?: number;
  readonly pendingLoading?: Promise<never>;
  readonly pendingTextAt?: number;
  readonly cleanupThrows?: boolean;
  readonly destroyThrows?: boolean;
  readonly pendingDestroy?: boolean;
}

function pdfBytes(version = "1.7", suffix = "\nsynthetic-pdf"): Uint8Array {
  return new TextEncoder().encode(`%PDF-${version}${suffix}`);
}

function textItem(str: string, hasEOL = false): SyntheticTextItem {
  return Object.freeze({ str, hasEOL });
}

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    ownerScope: "user:synthetic",
    documentId: "document:synthetic-pdf",
    bytes: pdfBytes(),
    ...overrides,
  };
}

function createSyntheticPdfJs(options: SyntheticPdfOptions = {}) {
  let lastDocumentOptions: Record<string, unknown> | null = null;
  const cleanup = vi.fn(() => {
    if (options.cleanupThrows) throw new Error("PRIVATE_CLEANUP_SENTINEL");
  });
  const documentDestroy = vi.fn(async () => {
    if (options.pendingDestroy) {
      return await new Promise<never>(() => undefined);
    }
    if (options.destroyThrows) throw new Error("PRIVATE_DESTROY_SENTINEL");
  });
  const loadingDestroy = vi.fn(async () => {
    if (options.destroyThrows) throw new Error("PRIVATE_LOADING_SENTINEL");
  });
  const getTextContent = vi.fn(async (pageNumber: number) => {
    if (options.pendingTextAt === pageNumber) {
      return await new Promise<never>(() => undefined);
    }
    if (options.textErrorAt === pageNumber) {
      throw new Error("PRIVATE_TEXT_CONTENT_SENTINEL");
    }
    return { items: options.itemsByPage?.[pageNumber - 1] ?? [] };
  });
  const getPage = vi.fn(async (pageNumber: number) => {
    if (options.pageErrorAt === pageNumber) {
      throw new Error("PRIVATE_PAGE_SENTINEL");
    }
    return {
      getTextContent: () => getTextContent(pageNumber),
      cleanup,
    };
  });
  const document = {
    numPages: options.numPages ?? options.itemsByPage?.length ?? 1,
    getPage,
    destroy: documentDestroy,
  };
  const loadingPromise = options.pendingLoading
    ? options.pendingLoading
    : options.loadingError
      ? Promise.reject(options.loadingError)
      : Promise.resolve(document);
  const getDocument = vi.fn((documentOptions: Record<string, unknown>) => {
    lastDocumentOptions = documentOptions;
    return {
      promise: loadingPromise,
      destroy: loadingDestroy,
    };
  });
  const pdfjs: FiscalNotificationPdfJsAdapter = { getDocument };

  return {
    pdfjs,
    getDocument,
    getPage,
    getTextContent,
    cleanup,
    documentDestroy,
    loadingDestroy,
    lastDocumentOptions: () => lastDocumentOptions,
  };
}

async function captureFailure(
  promise: Promise<unknown>,
): Promise<FiscalNotificationPdfError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(FiscalNotificationPdfError);
    return error as FiscalNotificationPdfError;
  }
  throw new Error("Expected parser failure");
}

describe("fiscal notification PDF text-layer parser", () => {
  it("extracts numbered pages, preserves structural line endings and freezes its output", async () => {
    const sourceItems = Object.freeze([
      Object.freeze([textItem("AGENCIA", true), textItem("TRIBUTARIA")]),
      Object.freeze([textItem("   "), Object.freeze({ type: "marked-content" })]),
    ]);
    const harness = createSyntheticPdfJs({ itemsByPage: sourceItems });
    const input = validInput({ pdfjs: harness.pdfjs });

    const result = await parseFiscalNotificationPdfTextLayerBytes(input);

    expect(result).toEqual({
      ownerScope: "user:synthetic",
      documentId: "document:synthetic-pdf",
      pages: [
        { pageNumber: 1, text: "AGENCIA\nTRIBUTARIA", isBlank: false },
        { pageNumber: 2, text: "", isBlank: true },
      ],
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.pages)).toBe(true);
    expect(result.pages.every(Object.isFrozen)).toBe(true);
    expect(sourceItems[0]?.[0]).toEqual({ str: "AGENCIA", hasEOL: true });
    expect(harness.getDocument).toHaveBeenCalledWith({
      data: input.bytes,
      isEvalSupported: false,
      stopAtErrors: true,
      enableXfa: false,
      useWorkerFetch: false,
      useSystemFonts: false,
      disableFontFace: true,
      disableAutoFetch: true,
      disableStream: true,
      verbosity: 0,
    });
    const suppliedBytes = harness.lastDocumentOptions()?.data;
    expect(suppliedBytes).not.toBe(input.bytes);
    expect(input.bytes.byteLength).toBeGreaterThan(8);
    expect(harness.cleanup).toHaveBeenCalledTimes(2);
    expect(harness.documentDestroy).toHaveBeenCalledTimes(1);
    expect(harness.loadingDestroy).not.toHaveBeenCalled();
  });

  it("reads a real, fully synthetic PDF with the installed local PDF.js runtime", async () => {
    const pdf = new jsPDF();
    pdf.text("AGENCIA TRIBUTARIA", 20, 20);
    const bytes = new Uint8Array(pdf.output("arraybuffer"));

    const result = await parseFiscalNotificationPdfTextLayerBytes(
      validInput({ bytes }),
    );

    expect(result.pages).toHaveLength(1);
    expect(result.pages[0]?.text).toContain("AGENCIA TRIBUTARIA");
    expect(result.pages[0]?.isBlank).toBe(false);
  });

  it("accepts PDF 1.x and 2.x magic and rejects prefixes, unsupported versions and short headers", () => {
    expect(hasStrictPdfMagic(pdfBytes("1.0"))).toBe(true);
    expect(hasStrictPdfMagic(pdfBytes("1.9"))).toBe(true);
    expect(hasStrictPdfMagic(pdfBytes("2.0"))).toBe(true);
    expect(hasStrictPdfMagic(pdfBytes("2.9"))).toBe(true);
    expect(hasStrictPdfMagic(pdfBytes("3.0"))).toBe(false);
    expect(hasStrictPdfMagic(new TextEncoder().encode(" %PDF-1.7"))).toBe(false);
    expect(hasStrictPdfMagic(new TextEncoder().encode("%PDF-1."))).toBe(false);
    expect(hasStrictPdfMagic(new TextEncoder().encode("not-a-pdf"))).toBe(false);
  });

  it.each([
    [new Uint8Array(), "INVALID_PDF"],
    [new TextEncoder().encode("renamed.pdf"), "INVALID_PDF"],
    [new Uint8Array(FISCAL_NOTIFICATION_PDF_LIMITS.maxBytes + 1), "FILE_TOO_LARGE"],
  ] as const)("rejects invalid bytes before invoking PDF.js: %s", async (bytes, code) => {
    const harness = createSyntheticPdfJs();

    await expect(
      parseFiscalNotificationPdfTextLayerBytes(
        validInput({ bytes, pdfjs: harness.pdfjs }),
      ),
    ).rejects.toMatchObject({ code });
    expect(harness.getDocument).not.toHaveBeenCalled();
  });

  it.each([
    [0, "INVALID_PDF"],
    [1.5, "INVALID_PDF"],
    [FISCAL_NOTIFICATION_PDF_LIMITS.maxPages + 1, "TOO_MANY_PAGES"],
  ] as const)("rejects invalid or excessive page count %s before reading pages", async (numPages, code) => {
    const harness = createSyntheticPdfJs({ numPages });

    await expect(
      parseFiscalNotificationPdfTextLayerBytes(
        validInput({ pdfjs: harness.pdfjs }),
      ),
    ).rejects.toMatchObject({ code });
    expect(harness.getPage).not.toHaveBeenCalled();
    expect(harness.documentDestroy).toHaveBeenCalledTimes(1);
    expect(harness.loadingDestroy).not.toHaveBeenCalled();
  });

  it("rejects a page item collection over its cap before visiting its items", async () => {
    const sentinel = Object.freeze({
      get str(): string {
        throw new Error("PRIVATE_GETTER_MUST_NOT_RUN");
      },
    });
    const items = new Array(
      FISCAL_NOTIFICATION_PDF_LIMITS.maxTextItemsPerPage + 1,
    ).fill(sentinel);
    const harness = createSyntheticPdfJs({ itemsByPage: [items] });

    await expect(
      parseFiscalNotificationPdfTextLayerBytes(
        validInput({ pdfjs: harness.pdfjs }),
      ),
    ).rejects.toMatchObject({ code: "TOO_MANY_TEXT_ITEMS" });
    expect(harness.cleanup).toHaveBeenCalledTimes(1);
    expect(harness.documentDestroy).toHaveBeenCalledTimes(1);
  });

  it("enforces the aggregate text-item cap across pages", async () => {
    const fullPage = new Array(
      FISCAL_NOTIFICATION_PDF_LIMITS.maxTextItemsPerPage,
    ).fill(Object.freeze({ type: "marked-content" }));
    const itemsByPage = [
      ...new Array(10).fill(fullPage),
      [Object.freeze({ type: "one-too-many" })],
    ];
    const harness = createSyntheticPdfJs({ itemsByPage });

    await expect(
      parseFiscalNotificationPdfTextLayerBytes(
        validInput({ pdfjs: harness.pdfjs }),
      ),
    ).rejects.toMatchObject({ code: "TOO_MANY_TEXT_ITEMS" });
    expect(harness.getPage).toHaveBeenCalledTimes(11);
    expect(harness.cleanup).toHaveBeenCalledTimes(11);
    expect(harness.documentDestroy).toHaveBeenCalledTimes(1);
  });

  it("rejects an oversized individual text item", async () => {
    const harness = createSyntheticPdfJs({
      itemsByPage: [
        [textItem("x".repeat(FISCAL_NOTIFICATION_PDF_LIMITS.maxTextItemChars + 1))],
      ],
    });

    await expect(
      parseFiscalNotificationPdfTextLayerBytes(
        validInput({ pdfjs: harness.pdfjs }),
      ),
    ).rejects.toMatchObject({ code: "TEXT_ITEM_TOO_LARGE" });
    expect(harness.cleanup).toHaveBeenCalledTimes(1);
    expect(harness.documentDestroy).toHaveBeenCalledTimes(1);
  });

  it("accepts the exact aggregate text boundary and rejects one additional character", async () => {
    const maxItem = "x".repeat(FISCAL_NOTIFICATION_PDF_LIMITS.maxTextItemChars);
    const boundaryItems = [
      ...new Array(15).fill(textItem(maxItem)),
      textItem("x".repeat(8_464)),
    ];
    const accepted = createSyntheticPdfJs({ itemsByPage: [boundaryItems] });
    const acceptedResult = await parseFiscalNotificationPdfTextLayerBytes(
      validInput({ pdfjs: accepted.pdfjs }),
    );

    expect(acceptedResult.pages[0]?.text.length).toBe(
      FISCAL_NOTIFICATION_PDF_LIMITS.maxTextChars - 1,
    );
    expect(accepted.documentDestroy).toHaveBeenCalledTimes(1);

    const rejected = createSyntheticPdfJs({
      itemsByPage: [
        [...boundaryItems.slice(0, -1), textItem("x".repeat(8_465))],
      ],
    });
    await expect(
      parseFiscalNotificationPdfTextLayerBytes(
        validInput({ pdfjs: rejected.pdfjs }),
      ),
    ).rejects.toMatchObject({ code: "TEXT_TOO_LARGE" });
    expect(rejected.cleanup).toHaveBeenCalledTimes(1);
    expect(rejected.documentDestroy).toHaveBeenCalledTimes(1);
  });

  it("rejects accessor-backed and malformed text items without invoking accessors", async () => {
    const getter = vi.fn(() => "PRIVATE_ACCESSOR_SENTINEL");
    const accessor = Object.defineProperty({}, "str", { get: getter });
    const invalidEol = Object.freeze({ str: "safe", hasEOL: "yes" });

    for (const item of [accessor, invalidEol]) {
      const harness = createSyntheticPdfJs({ itemsByPage: [[item]] });
      await expect(
        parseFiscalNotificationPdfTextLayerBytes(
          validInput({ pdfjs: harness.pdfjs }),
        ),
      ).rejects.toMatchObject({ code: "INVALID_PDF" });
      expect(harness.cleanup).toHaveBeenCalledTimes(1);
      expect(harness.documentDestroy).toHaveBeenCalledTimes(1);
    }
    expect(getter).not.toHaveBeenCalled();
  });

  it("destroys the loading task when opening fails and never leaks the parser error", async () => {
    const harness = createSyntheticPdfJs({
      loadingError: new Error("PRIVATE_OPEN_SENTINEL"),
    });
    const error = await captureFailure(
      parseFiscalNotificationPdfTextLayerBytes(
        validInput({ pdfjs: harness.pdfjs }),
      ),
    );

    expect(error.code).toBe("INVALID_PDF");
    expect(error.message).toBe("FISCAL_NOTIFICATION_PDF_ERROR:INVALID_PDF");
    expect(JSON.stringify(error)).not.toContain("PRIVATE_OPEN_SENTINEL");
    expect(harness.loadingDestroy).toHaveBeenCalledTimes(1);
    expect(harness.documentDestroy).not.toHaveBeenCalled();
  });

  it("cleans the page and destroys the opened document when text extraction fails", async () => {
    const harness = createSyntheticPdfJs({ textErrorAt: 1 });
    const error = await captureFailure(
      parseFiscalNotificationPdfTextLayerBytes(
        validInput({ pdfjs: harness.pdfjs }),
      ),
    );

    expect(error).toMatchObject({ code: "INVALID_PDF" });
    expect(error.message).not.toContain("PRIVATE_TEXT_CONTENT_SENTINEL");
    expect(harness.cleanup).toHaveBeenCalledTimes(1);
    expect(harness.documentDestroy).toHaveBeenCalledTimes(1);
    expect(harness.loadingDestroy).not.toHaveBeenCalled();
  });

  it("maps cancellation during loading to ABORTED and destroys the loading task", async () => {
    const controller = new AbortController();
    const harness = createSyntheticPdfJs({
      pendingLoading: new Promise<never>(() => undefined),
    });
    const parsing = parseFiscalNotificationPdfTextLayerBytes(
      validInput({ pdfjs: harness.pdfjs, signal: controller.signal }),
    );

    controller.abort();

    await expect(parsing).rejects.toMatchObject({ code: "ABORTED" });
    expect(harness.loadingDestroy).toHaveBeenCalledTimes(1);
    expect(harness.documentDestroy).not.toHaveBeenCalled();
  });

  it("enforces its own total deadline even when no AbortSignal is supplied", async () => {
    vi.useFakeTimers();
    try {
      const harness = createSyntheticPdfJs({
        pendingLoading: new Promise<never>(() => undefined),
      });
      const parsing = parseFiscalNotificationPdfTextLayerBytes(
        validInput({ pdfjs: harness.pdfjs }),
      );
      const timedOut = expect(parsing).rejects.toMatchObject({ code: "TIMEOUT" });

      await vi.advanceTimersByTimeAsync(FISCAL_NOTIFICATION_PDF_LIMITS.timeoutMs);

      await timedOut;
      expect(harness.loadingDestroy).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("bounds a PDF.js destroy operation that never settles", async () => {
    vi.useFakeTimers();
    try {
      const harness = createSyntheticPdfJs({
        itemsByPage: [[textItem("SAFE SYNTHETIC TEXT")]],
        pendingDestroy: true,
      });
      const parsing = parseFiscalNotificationPdfTextLayerBytes(
        validInput({ pdfjs: harness.pdfjs }),
      );
      await vi.advanceTimersByTimeAsync(250);

      await expect(parsing).resolves.toMatchObject({
        pages: [{ text: "SAFE SYNTHETIC TEXT" }],
      });
      expect(harness.documentDestroy).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("maps cancellation during page extraction to ABORTED, cleanup and document destruction", async () => {
    const controller = new AbortController();
    const harness = createSyntheticPdfJs({ pendingTextAt: 1 });
    const parsing = parseFiscalNotificationPdfTextLayerBytes(
      validInput({ pdfjs: harness.pdfjs, signal: controller.signal }),
    );
    await vi.waitFor(() => expect(harness.getTextContent).toHaveBeenCalled());

    controller.abort();

    await expect(parsing).rejects.toMatchObject({ code: "ABORTED" });
    expect(harness.cleanup).toHaveBeenCalledTimes(1);
    expect(harness.documentDestroy).toHaveBeenCalledTimes(1);
    expect(harness.loadingDestroy).not.toHaveBeenCalled();
  });

  it("rejects an already-aborted request before PDF.js is invoked", async () => {
    const controller = new AbortController();
    controller.abort();
    const harness = createSyntheticPdfJs();

    await expect(
      parseFiscalNotificationPdfTextLayerBytes(
        validInput({ pdfjs: harness.pdfjs, signal: controller.signal }),
      ),
    ).rejects.toMatchObject({ code: "ABORTED" });
    expect(harness.getDocument).not.toHaveBeenCalled();
  });

  it("silences cleanup and destroy failures without logging PII or masking a valid result", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const harness = createSyntheticPdfJs({
      itemsByPage: [[textItem("SAFE SYNTHETIC TEXT")]],
      cleanupThrows: true,
      destroyThrows: true,
    });

    try {
      await expect(
        parseFiscalNotificationPdfTextLayerBytes(
          validInput({ pdfjs: harness.pdfjs }),
        ),
      ).resolves.toMatchObject({
        pages: [{ text: "SAFE SYNTHETIC TEXT", isBlank: false }],
      });
      expect(warn).not.toHaveBeenCalled();
      expect(errorLog).not.toHaveBeenCalled();
      expect(log).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
      errorLog.mockRestore();
      log.mockRestore();
    }
  });

  it("never includes document content or PDF.js errors in public failures", async () => {
    const sentinels = [
      "PRIVATE_TAX_ID_SENTINEL",
      "PRIVATE_CSV_SENTINEL",
      "PRIVATE_EXPEDIENT_SENTINEL",
    ];
    const harness = createSyntheticPdfJs({
      textErrorAt: 1,
      itemsByPage: [[textItem(sentinels.join(" "))]],
    });
    const failure = await captureFailure(
      parseFiscalNotificationPdfTextLayerBytes(
        validInput({ pdfjs: harness.pdfjs }),
      ),
    );
    const serialized = JSON.stringify(failure);

    expect(failure.message).toBe("FISCAL_NOTIFICATION_PDF_ERROR:INVALID_PDF");
    for (const sentinel of sentinels) {
      expect(serialized).not.toContain(sentinel);
      expect(failure.message).not.toContain(sentinel);
    }
  });
});
