import { afterEach, describe, expect, it, vi } from "vitest";
import type { DocumentReadingPageV1 } from "@/lib/document-reading/contracts.v1";
import {
  readExpenseDocumentLocallyV1,
  type ExpenseLocalDocumentReaderWorkerLikeV1,
} from "./local-document-reader-adapter.v1";

const RAW_SENTINEL = "PRIVATE_EXPENSE_RAW_TEXT_SENTINEL";
const PRIVATE_FILENAME = "PRIVATE_CUSTOMER_12345678Z.pdf";
const EXPECTED_SHA256 = Array.from({ length: 32 }, (_, index) =>
  index.toString(16).padStart(2, "0"),
).join("");

function pdfBytes(): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode("%PDF-1.7\nsynthetic");
}

function pdfFile(type = "application/pdf"): File {
  return new File([pdfBytes()], PRIVATE_FILENAME, { type });
}

function digestBytes(): ArrayBuffer {
  return Uint8Array.from({ length: 32 }, (_, index) => index).buffer;
}

function request(overrides: Record<string, unknown> = {}) {
  return {
    ownerScope: "user:synthetic",
    operationId: "operation:synthetic",
    documentId: "expense:synthetic",
    file: pdfFile(),
    ...overrides,
  };
}

function resultMessage(
  pages: readonly DocumentReadingPageV1[],
  overrides: Record<string, unknown> = {},
) {
  return {
    type: "RESULT",
    schemaVersion: 1,
    requestId: "operation:synthetic",
    documentId: "expense:synthetic",
    sourceSha256: EXPECTED_SHA256,
    status: pages.some((page) => !page.isBlank)
      ? "TEXT_LAYER_AVAILABLE"
      : "NO_EXTRACTABLE_TEXT",
    pageCount: pages.length,
    pages,
    ...overrides,
  };
}

class FakeWorker implements ExpenseLocalDocumentReaderWorkerLikeV1 {
  readonly terminate = vi.fn();
  readonly posted: unknown[] = [];
  private readonly messageListeners = new Set<(event: MessageEvent<unknown>) => void>();
  private readonly errorListeners = new Set<(event: Event) => void>();

  constructor(private readonly response: unknown | null) {}

  postMessage(message: unknown): void {
    this.posted.push(message);
    if (this.response !== null) {
      queueMicrotask(() => {
        for (const listener of this.messageListeners) {
          listener({ data: this.response } as MessageEvent<unknown>);
        }
      });
    }
  }

  addEventListener(
    type: "message" | "error",
    listener: ((event: MessageEvent<unknown>) => void) | ((event: Event) => void),
  ): void {
    if (type === "message") {
      this.messageListeners.add(listener as (event: MessageEvent<unknown>) => void);
    } else {
      this.errorListeners.add(listener as (event: Event) => void);
    }
  }

  removeEventListener(
    type: "message" | "error",
    listener: ((event: MessageEvent<unknown>) => void) | ((event: Event) => void),
  ): void {
    if (type === "message") {
      this.messageListeners.delete(listener as (event: MessageEvent<unknown>) => void);
    } else {
      this.errorListeners.delete(listener as (event: Event) => void);
    }
  }
}

function dependencies(worker: FakeWorker) {
  return {
    createWorker: () => worker,
    digestSha256: async () => digestBytes(),
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("expense local document reader adapter v1", () => {
  it("devuelve texto digital solo en un envelope no serializable", async () => {
    const pages = [
      {
        pageNumber: 1,
        text: RAW_SENTINEL,
        isBlank: false,
        layoutRows: [
          {
            yMilli: 100,
            cells: [{ xMilli: 20, widthMilli: 50, text: RAW_SENTINEL }],
          },
        ],
      },
    ] as const;
    const worker = new FakeWorker(resultMessage(pages));
    const result = await readExpenseDocumentLocallyV1(
      request(),
      dependencies(worker),
    );

    expect(result.status).toBe("READABLE");
    if (result.status !== "READABLE") throw new Error("expected readable result");
    expect(result.ephemeralContent.pages[0]?.text).toBe(RAW_SENTINEL);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(RAW_SENTINEL);
    expect(serialized).not.toContain(PRIVATE_FILENAME);
    expect(serialized).not.toContain("layoutRows");
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    expect(worker.posted[0]).toMatchObject({
      type: "READ_PDF_TEXT_LAYER",
      sourceSha256: EXPECTED_SHA256,
      byteLength: pdfBytes().byteLength,
    });
  });

  it("se abstiene con OCR_REQUIRED cuando el PDF no contiene texto", async () => {
    const worker = new FakeWorker(
      resultMessage([{ pageNumber: 1, text: "", isBlank: true }]),
    );
    const result = await readExpenseDocumentLocallyV1(
      request(),
      dependencies(worker),
    );
    expect(result).toMatchObject({
      status: "ABSTAINED",
      reason: "OCR_REQUIRED",
      providerCalled: false,
      retainedSourceContent: "NONE",
    });
  });

  it("se abstiene antes del worker para imágenes", async () => {
    const createWorker = vi.fn(() => new FakeWorker(null));
    const result = await readExpenseDocumentLocallyV1(request({ file: pdfFile("image/png") }), {
      createWorker,
      digestSha256: async () => digestBytes(),
    });
    expect(result).toMatchObject({
      status: "ABSTAINED",
      reason: "UNSUPPORTED_MIME",
      source: null,
    });
    expect(createWorker).not.toHaveBeenCalled();
  });

  it("rechaza identidad, campos extra y páginas incoherentes del worker", async () => {
    const validPages = [
      { pageNumber: 1, text: RAW_SENTINEL, isBlank: false },
    ] as const;
    for (const response of [
      resultMessage(validPages, { sourceSha256: "f".repeat(64) }),
      resultMessage(validPages, { unexpected: true }),
      resultMessage(validPages, { pageCount: 2 }),
      resultMessage([
        { pageNumber: 1, text: RAW_SENTINEL, isBlank: true },
      ]),
    ]) {
      const result = await readExpenseDocumentLocallyV1(
        request(),
        dependencies(new FakeWorker(response)),
      );
      expect(result).toMatchObject({
        status: "ABSTAINED",
        reason: "INVALID_WORKER_RESPONSE",
      });
    }
  });

  it("corta el worker y se abstiene al expirar el timeout", async () => {
    vi.useFakeTimers();
    const worker = new FakeWorker(null);
    const reading = readExpenseDocumentLocallyV1(request(), {
      ...dependencies(worker),
      timeoutMs: 10,
    });
    await vi.advanceTimersByTimeAsync(10);
    await expect(reading).resolves.toMatchObject({
      status: "ABSTAINED",
      reason: "TIMEOUT",
    });
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });
});
