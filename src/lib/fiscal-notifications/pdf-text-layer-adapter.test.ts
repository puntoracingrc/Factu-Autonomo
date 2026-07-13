import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import {
  readFiscalNotificationPdfTextLayer,
  type FiscalNotificationPdfWorkerLike,
} from "./pdf-text-layer-adapter";
import {
  FISCAL_NOTIFICATION_PDF_LIMITS,
  FiscalNotificationPdfError,
} from "./pdf-text-layer-parser";

const NO_RESPONSE = Symbol("NO_RESPONSE");
const PRIVATE_FILENAME = "PRIVATE_TAX_ID_12345678Z.pdf";
const EXPECTED_SHA256 = Array.from({ length: 32 }, (_, index) =>
  index.toString(16).padStart(2, "0"),
).join("");

interface FakeWorkerOptions {
  readonly response?:
    | unknown
    | typeof NO_RESPONSE
    | ((postedMessage: unknown) => unknown);
  readonly postThrows?: boolean;
  readonly terminateThrows?: boolean;
  readonly removeThrows?: boolean;
}

function pdfBytes(suffix = "\nsynthetic-pdf"): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(`%PDF-1.7${suffix}`);
}

function pdfFile(
  bytes: Uint8Array<ArrayBuffer> = pdfBytes(),
  type = "application/pdf",
  name = PRIVATE_FILENAME,
): File {
  return new File([bytes], name, { type });
}

function digestBytes(length = 32): ArrayBuffer {
  return Uint8Array.from({ length }, (_, index) => index).buffer;
}

function request(overrides: Record<string, unknown> = {}) {
  return {
    ownerScope: "user:synthetic",
    documentId: "document:synthetic-pdf",
    file: pdfFile(),
    ...overrides,
  };
}

function workerDocument(
  pages: readonly {
    readonly pageNumber: number;
    readonly text: string;
    readonly isBlank: boolean;
  }[] = [{ pageNumber: 1, text: "AGENCIA TRIBUTARIA", isBlank: false }],
) {
  return {
    ownerScope: "user:synthetic",
    documentId: "document:synthetic-pdf",
    pages: pages.map((page) => ({ ...page })),
  };
}

function resultMessage(documentInput: unknown = workerDocument()) {
  return {
    type: "RESULT",
    requestId: "parse",
    documentInput,
  };
}

function createFakeWorker(options: FakeWorkerOptions = {}) {
  const messageListeners = new Set<(event: MessageEvent<unknown>) => void>();
  const errorListeners = new Set<(event: Event) => void>();

  const emitMessage = (data: unknown) => {
    for (const listener of [...messageListeners]) {
      listener({ data } as MessageEvent<unknown>);
    }
  };
  const emitError = () => {
    for (const listener of [...errorListeners]) listener({} as Event);
  };
  const postMessage = vi.fn((message: unknown, transfer: Transferable[]) => {
    void transfer;
    if (options.postThrows) throw new Error("PRIVATE_POST_SENTINEL");
    const response = options.response ?? resultMessage();
    if (response === NO_RESPONSE) return;
    const resolved = typeof response === "function" ? response(message) : response;
    queueMicrotask(() => emitMessage(resolved));
  });
  const addEventListener = vi.fn(
    (type: "message" | "error", listener: (event: never) => void) => {
      if (type === "message") {
        messageListeners.add(
          listener as unknown as (event: MessageEvent<unknown>) => void,
        );
      } else {
        errorListeners.add(listener as unknown as (event: Event) => void);
      }
    },
  );
  const removeEventListener = vi.fn(
    (type: "message" | "error", listener: (event: never) => void) => {
      if (options.removeThrows) {
        throw new Error("PRIVATE_REMOVE_SENTINEL");
      }
      if (type === "message") {
        messageListeners.delete(
          listener as unknown as (event: MessageEvent<unknown>) => void,
        );
      } else {
        errorListeners.delete(listener as unknown as (event: Event) => void);
      }
    },
  );
  const terminate = vi.fn(() => {
    if (options.terminateThrows) {
      throw new Error("PRIVATE_TERMINATE_SENTINEL");
    }
  });
  const worker = {
    postMessage,
    addEventListener,
    removeEventListener,
    terminate,
  } as unknown as FiscalNotificationPdfWorkerLike;

  return {
    worker,
    postMessage,
    addEventListener,
    removeEventListener,
    terminate,
    emitMessage,
    emitError,
    activeMessageListeners: () => messageListeners.size,
    activeErrorListeners: () => errorListeners.size,
  };
}

function dependencies(worker: ReturnType<typeof createFakeWorker>) {
  return {
    createWorker: vi.fn(() => worker.worker),
    digestSha256: vi.fn(async (bytes: Uint8Array<ArrayBuffer>) => {
      void bytes;
      return digestBytes();
    }),
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
  throw new Error("Expected adapter failure");
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("fiscal notification PDF text-layer adapter", () => {
  it.each([
    [
      [{ pageNumber: 1, text: "AGENCIA TRIBUTARIA", isBlank: false }],
      "TEXT_LAYER_AVAILABLE",
    ],
    [[{ pageNumber: 1, text: "", isBlank: true }], "NO_EXTRACTABLE_TEXT"],
  ] as const)("returns a bounded %s result without retaining the filename", async (pages, status) => {
    const sourceDocument = workerDocument(pages);
    const worker = createFakeWorker({ response: resultMessage(sourceDocument) });
    const deps = dependencies(worker);
    const input = request();

    const output = await readFiscalNotificationPdfTextLayer(input, deps);

    expect(output).toMatchObject({
      schemaVersion: 1,
      adapterVersion: "1.0.0",
      status,
      sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
      fileIntegrity: {
        mimeType: "application/pdf",
        byteLength: input.file.size,
        sha256: EXPECTED_SHA256,
      },
      documentInput: {
        ownerScope: "user:synthetic",
        documentId: "document:synthetic-pdf",
        pages,
      },
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    });
    expect(JSON.stringify(output)).not.toContain(PRIVATE_FILENAME);
    expect(Object.isFrozen(output)).toBe(true);
    expect(Object.isFrozen(output.fileIntegrity)).toBe(true);
    expect(Object.isFrozen(output.documentInput)).toBe(true);
    expect(Object.isFrozen(output.documentInput.pages)).toBe(true);
    expect(output.documentInput.pages.every(Object.isFrozen)).toBe(true);
    expect(output.documentInput).not.toBe(sourceDocument);
    expect(sourceDocument.pages[0]).toEqual(pages[0]);
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    expect(worker.activeMessageListeners()).toBe(0);
    expect(worker.activeErrorListeners()).toBe(0);
  });

  it("sends only bounded identifiers and transferable bytes to the worker", async () => {
    const worker = createFakeWorker();
    const deps = dependencies(worker);
    const file = pdfFile(pdfBytes("\nPRIVATE_FILE_CONTENT_SENTINEL"));

    await readFiscalNotificationPdfTextLayer(request({ file }), deps);

    expect(worker.postMessage).toHaveBeenCalledTimes(1);
    const [message, transfer] = worker.postMessage.mock.calls[0] ?? [];
    expect(message).toMatchObject({
      type: "PARSE",
      requestId: "parse",
      ownerScope: "user:synthetic",
      documentId: "document:synthetic-pdf",
      bytes: expect.any(ArrayBuffer),
    });
    expect(Reflect.ownKeys(message as object).sort()).toEqual(
      ["bytes", "documentId", "ownerScope", "requestId", "type"].sort(),
    );
    expect(JSON.stringify({ ...(message as object), bytes: undefined })).not.toContain(
      PRIVATE_FILENAME,
    );
    expect(transfer).toEqual([(message as { bytes: ArrayBuffer }).bytes]);
    expect(deps.digestSha256).toHaveBeenCalledTimes(1);
    expect(Array.from(deps.digestSha256.mock.calls[0]?.[0] ?? [])).toEqual(
      Array.from(pdfBytes("\nPRIVATE_FILE_CONTENT_SENTINEL")),
    );
  });

  it.each(["", "text/plain", "image/png"])(
    "requires the exact application/pdf MIME type: %j",
    async (type) => {
      const file = pdfFile(pdfBytes(), type);
      const arrayBuffer = vi.spyOn(file, "arrayBuffer");
      const worker = createFakeWorker();
      const deps = dependencies(worker);

      await expect(
        readFiscalNotificationPdfTextLayer(request({ file }), deps),
      ).rejects.toMatchObject({ code: "UNSUPPORTED_FILE" });
      expect(arrayBuffer).not.toHaveBeenCalled();
      expect(deps.digestSha256).not.toHaveBeenCalled();
      expect(deps.createWorker).not.toHaveBeenCalled();
    },
  );

  it.each([
    [new Uint8Array(), "INVALID_PDF"],
    [new Uint8Array(FISCAL_NOTIFICATION_PDF_LIMITS.maxBytes + 1), "FILE_TOO_LARGE"],
  ] as const)("rejects file size bounds before reading bytes", async (bytes, code) => {
    const file = pdfFile(bytes);
    const arrayBuffer = vi.spyOn(file, "arrayBuffer");
    const worker = createFakeWorker();
    const deps = dependencies(worker);

    await expect(
      readFiscalNotificationPdfTextLayer(request({ file }), deps),
    ).rejects.toMatchObject({ code });
    expect(arrayBuffer).not.toHaveBeenCalled();
    expect(deps.createWorker).not.toHaveBeenCalled();
  });

  it("rejects a declared/read byte-length mismatch", async () => {
    const file = pdfFile();
    vi.spyOn(file, "arrayBuffer").mockResolvedValue(pdfBytes().slice(0, 8).buffer);
    const worker = createFakeWorker();
    const deps = dependencies(worker);

    await expect(
      readFiscalNotificationPdfTextLayer(request({ file }), deps),
    ).rejects.toMatchObject({ code: "INVALID_PDF" });
    expect(deps.digestSha256).not.toHaveBeenCalled();
    expect(deps.createWorker).not.toHaveBeenCalled();
  });

  it("rejects bad magic before hashing or constructing a worker", async () => {
    const file = pdfFile(new TextEncoder().encode("renamed non-pdf"));
    const worker = createFakeWorker();
    const deps = dependencies(worker);

    const failure = await captureFailure(
      readFiscalNotificationPdfTextLayer(request({ file }), deps),
    );

    expect(failure).toMatchObject({ code: "INVALID_PDF" });
    expect(failure.message).not.toContain(PRIVATE_FILENAME);
    expect(deps.digestSha256).not.toHaveBeenCalled();
    expect(deps.createWorker).not.toHaveBeenCalled();
  });

  it("records a lowercase SHA-256 digest and fails closed on malformed digest output", async () => {
    const worker = createFakeWorker();
    const deps = dependencies(worker);
    const output = await readFiscalNotificationPdfTextLayer(request(), deps);
    expect(output.fileIntegrity.sha256).toBe(EXPECTED_SHA256);

    const malformedWorker = createFakeWorker();
    const malformedDigest = vi.fn(async () => digestBytes(31));
    await expect(
      readFiscalNotificationPdfTextLayer(request(), {
        createWorker: () => malformedWorker.worker,
        digestSha256: malformedDigest,
      }),
    ).rejects.toMatchObject({ code: "HASH_UNAVAILABLE" });
    expect(malformedWorker.postMessage).not.toHaveBeenCalled();
    expect(malformedWorker.terminate).not.toHaveBeenCalled();
  });

  it("maps digest provider failures without leaking their message", async () => {
    const worker = createFakeWorker();
    const failure = await captureFailure(
      readFiscalNotificationPdfTextLayer(request(), {
        createWorker: () => worker.worker,
        digestSha256: async () => {
          throw new Error("PRIVATE_DIGEST_SENTINEL");
        },
      }),
    );

    expect(failure.code).toBe("HASH_UNAVAILABLE");
    expect(failure.message).toBe("FISCAL_NOTIFICATION_PDF_ERROR:HASH_UNAVAILABLE");
    expect(JSON.stringify(failure)).not.toContain("PRIVATE_DIGEST_SENTINEL");
    expect(worker.postMessage).not.toHaveBeenCalled();
  });

  it("rejects unknown root keys and accessors before reading the file", async () => {
    const file = pdfFile();
    const arrayBuffer = vi.spyOn(file, "arrayBuffer");
    const worker = createFakeWorker();
    const deps = dependencies(worker);
    const unknown = request({ privateTaxId: "PRIVATE_ROOT_SENTINEL" });
    const getter = vi.fn(() => "PRIVATE_ACCESSOR_SENTINEL");
    const accessor = request();
    Object.defineProperty(accessor, "privateCsv", { get: getter });

    for (const value of [unknown, accessor]) {
      await expect(
        readFiscalNotificationPdfTextLayer(value, deps),
      ).rejects.toMatchObject({ code: "INVALID_PDF" });
    }
    expect(getter).not.toHaveBeenCalled();
    expect(arrayBuffer).not.toHaveBeenCalled();
    expect(deps.createWorker).not.toHaveBeenCalled();
  });

  it.each([
    {
      ...resultMessage(),
      privateTaxId: "PRIVATE_MESSAGE_SENTINEL",
    },
    resultMessage({
      ...workerDocument(),
      privateCsv: "PRIVATE_DOCUMENT_SENTINEL",
    }),
    resultMessage({
      ...workerDocument(),
      pages: [
        {
          pageNumber: 1,
          text: "safe",
          isBlank: false,
          rawValue: "PRIVATE_PAGE_SENTINEL",
        },
      ],
    }),
  ])("rejects unknown keys from every worker response level", async (response) => {
    const worker = createFakeWorker({ response });
    const failure = await captureFailure(
      readFiscalNotificationPdfTextLayer(request(), dependencies(worker)),
    );

    expect(failure.code).toBe("INVALID_WORKER_RESPONSE");
    expect(failure.message).not.toContain("PRIVATE_");
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it.each([
    { pageNumber: 1, text: "", isBlank: false },
    { pageNumber: 1, text: "   ", isBlank: false },
    { pageNumber: 1, text: "SAFE TEXT", isBlank: true },
  ])("rejects inconsistent worker blank-page state", async (page) => {
    const worker = createFakeWorker({
      response: resultMessage(workerDocument([page])),
    });

    await expect(
      readFiscalNotificationPdfTextLayer(request(), dependencies(worker)),
    ).rejects.toMatchObject({ code: "INVALID_WORKER_RESPONSE" });
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it("never permits a test timeout above the canonical production deadline", async () => {
    const worker = createFakeWorker();
    await expect(
      readFiscalNotificationPdfTextLayer(request(), {
        ...dependencies(worker),
        timeoutMs: FISCAL_NOTIFICATION_PDF_LIMITS.timeoutMs + 1,
      }),
    ).rejects.toMatchObject({ code: "TIMEOUT" });
    expect(worker.postMessage).not.toHaveBeenCalled();
  });

  it.each([
    ["ownerScope", "user:cross-tenant"],
    ["documentId", "document:cross-owner"],
  ] as const)("rejects crossed worker %s", async (key, value) => {
    const crossed = { ...workerDocument(), [key]: value };
    const worker = createFakeWorker({ response: resultMessage(crossed) });

    await expect(
      readFiscalNotificationPdfTextLayer(request(), dependencies(worker)),
    ).rejects.toMatchObject({ code: "INVALID_WORKER_RESPONSE" });
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it("times out, removes listeners, terminates once and ignores late messages", async () => {
    vi.useFakeTimers();
    const worker = createFakeWorker({ response: NO_RESPONSE });
    const parsing = readFiscalNotificationPdfTextLayer(request(), {
      ...dependencies(worker),
      timeoutMs: 25,
    });
    const timedOut = expect(parsing).rejects.toMatchObject({ code: "TIMEOUT" });
    await vi.advanceTimersByTimeAsync(0);
    expect(worker.postMessage).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(25);

    await timedOut;
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    expect(worker.activeMessageListeners()).toBe(0);
    expect(worker.activeErrorListeners()).toBe(0);
    worker.emitMessage(resultMessage());
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it("aborts pending worker processing, terminates once and ignores late messages", async () => {
    const controller = new AbortController();
    const worker = createFakeWorker({ response: NO_RESPONSE });
    const parsing = readFiscalNotificationPdfTextLayer(
      request({ signal: controller.signal }),
      dependencies(worker),
    );
    await vi.waitFor(() => expect(worker.postMessage).toHaveBeenCalledTimes(1));

    controller.abort();

    await expect(parsing).rejects.toMatchObject({ code: "ABORTED" });
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    expect(worker.activeMessageListeners()).toBe(0);
    expect(worker.activeErrorListeners()).toBe(0);
    worker.emitMessage(resultMessage());
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it("rejects an already-aborted request before reading bytes or creating a worker", async () => {
    const controller = new AbortController();
    controller.abort();
    const file = pdfFile();
    const arrayBuffer = vi.spyOn(file, "arrayBuffer");
    const worker = createFakeWorker();
    const deps = dependencies(worker);

    await expect(
      readFiscalNotificationPdfTextLayer(
        request({ file, signal: controller.signal }),
        deps,
      ),
    ).rejects.toMatchObject({ code: "ABORTED" });
    expect(arrayBuffer).not.toHaveBeenCalled();
    expect(deps.createWorker).not.toHaveBeenCalled();
  });

  it("maps worker errors and postMessage failure while always terminating", async () => {
    const runtimeErrorWorker = createFakeWorker({ response: NO_RESPONSE });
    const runtimeFailure = readFiscalNotificationPdfTextLayer(
      request(),
      dependencies(runtimeErrorWorker),
    );
    await vi.waitFor(() =>
      expect(runtimeErrorWorker.postMessage).toHaveBeenCalledTimes(1),
    );
    runtimeErrorWorker.emitError();
    await expect(runtimeFailure).rejects.toMatchObject({ code: "INVALID_PDF" });
    expect(runtimeErrorWorker.terminate).toHaveBeenCalledTimes(1);

    const postFailureWorker = createFakeWorker({ postThrows: true });
    await expect(
      readFiscalNotificationPdfTextLayer(
        request(),
        dependencies(postFailureWorker),
      ),
    ).rejects.toMatchObject({ code: "WORKER_UNAVAILABLE" });
    expect(postFailureWorker.terminate).toHaveBeenCalledTimes(1);
  });

  it("does not mutate request or worker output, and snapshots before later changes", async () => {
    const sourceDocument = workerDocument();
    const sourcePage = sourceDocument.pages[0];
    const worker = createFakeWorker({ response: resultMessage(sourceDocument) });
    const input = request();
    const originalKeys = Reflect.ownKeys(input);

    const output = await readFiscalNotificationPdfTextLayer(input, dependencies(worker));
    sourcePage.text = "MUTATED AFTER RESULT";
    sourceDocument.ownerScope = "user:mutated";

    expect(Reflect.ownKeys(input)).toEqual(originalKeys);
    expect(input.file.name).toBe(PRIVATE_FILENAME);
    expect(output.documentInput).toMatchObject({
      ownerScope: "user:synthetic",
      pages: [{ text: "AGENCIA TRIBUTARIA", isBlank: false }],
    });
    expect(JSON.stringify(output)).not.toContain("MUTATED AFTER RESULT");
    expect(JSON.stringify(output)).not.toContain(PRIVATE_FILENAME);
  });

  it("fails closed on terminate failure and never logs filename or worker details", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const worker = createFakeWorker({ terminateThrows: true });

    const failure = await captureFailure(
      readFiscalNotificationPdfTextLayer(request(), dependencies(worker)),
    );
    expect(failure).toMatchObject({ code: "WORKER_UNAVAILABLE" });
    expect(failure.message).not.toContain("PRIVATE_TERMINATE_SENTINEL");
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
    expect(errorLog).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });

  it("settles and terminates even when listener cleanup throws", async () => {
    const worker = createFakeWorker({ removeThrows: true });

    await expect(
      readFiscalNotificationPdfTextLayer(request(), dependencies(worker)),
    ).resolves.toMatchObject({ status: "TEXT_LAYER_AVAILABLE" });
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it("keeps the intake browser-only and free of network, AI and persistence calls", () => {
    const adapterSource = readFileSync(
      new URL("./pdf-text-layer-adapter.ts", import.meta.url),
      "utf8",
    );
    const workerSource = readFileSync(
      new URL("./pdf-text-layer.worker.ts", import.meta.url),
      "utf8",
    );
    const parserSource = readFileSync(
      new URL("./pdf-text-layer-parser.ts", import.meta.url),
      "utf8",
    );
    expect(adapterSource.startsWith('"use client";')).toBe(true);
    for (const source of [adapterSource, workerSource, parserSource]) {
      expect(source).not.toMatch(/\bfetch\s*\(/u);
      expect(source).not.toMatch(/OpenAI|localStorage|sessionStorage|supabase/iu);
      expect(source).not.toMatch(/console\.(?:log|warn|error)/u);
    }
  });
});
