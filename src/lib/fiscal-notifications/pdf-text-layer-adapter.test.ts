import { afterEach, describe, expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import ts from "typescript";
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
  readonly responseSequence?: readonly unknown[];
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

function workerAnalysis(
  status: "TEXT_LAYER_AVAILABLE" | "NO_EXTRACTABLE_TEXT" =
    "TEXT_LAYER_AVAILABLE",
) {
  return {
    schemaVersion: 2,
    analysisVersion: "2.0.0",
    textLayerStatus: status,
    pageCount: 1,
    familyAnalysis:
      status === "TEXT_LAYER_AVAILABLE"
        ? {
            schemaVersion: 1,
            engineId: "fiscal-notification-family-candidate-engine",
            engineVersion: "1.1.0",
            status: "INFORMATION_PENDING",
            reason: "NO_SUPPORTED_FAMILY_SIGNAL",
            candidates: [],
            selectedFamilyId: null,
            requiresHumanReview: true,
            materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
            retainedSourceContent: "NONE",
          }
        : null,
    enforcementMoneyFacts: null,
    enforcementExplicitFields: null,
    sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    retainedSourceContent: "NONE",
  };
}

function resultMessage(analysis: unknown = workerAnalysis()) {
  return {
    type: "RESULT",
    requestId: "parse",
    analysis,
  };
}

const PDFJS_READY_MESSAGE = Object.freeze({
  sourceName: "worker",
  targetName: "main",
  action: "ready",
  data: null,
});

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
    const responses = options.responseSequence ?? [
      options.response ?? resultMessage(),
    ];
    for (const response of responses) {
      if (response === NO_RESPONSE) continue;
      const resolved =
        typeof response === "function" ? response(message) : response;
      queueMicrotask(() => emitMessage(resolved));
    }
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
    "TEXT_LAYER_AVAILABLE",
    "NO_EXTRACTABLE_TEXT",
  ] as const)("returns a bounded %s result without retaining source content", async (status) => {
    const sourceAnalysis = workerAnalysis(status);
    const worker = createFakeWorker({ response: resultMessage(sourceAnalysis) });
    const deps = dependencies(worker);
    const input = request();

    const output = await readFiscalNotificationPdfTextLayer(input, deps);

    expect(output).toMatchObject({
      schemaVersion: 3,
      adapterVersion: "3.0.0",
      status,
      sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
      fileIntegrity: {
        mimeType: "application/pdf",
        byteLength: input.file.size,
        sha256: EXPECTED_SHA256,
      },
      reviewContext: {
        ownerScope: "user:synthetic",
        documentId: "document:synthetic-pdf",
      },
      analysis: {
        textLayerStatus: status,
        pageCount: 1,
        familyAnalysis:
          status === "TEXT_LAYER_AVAILABLE"
            ? expect.objectContaining({
                reason: "NO_SUPPORTED_FAMILY_SIGNAL",
              })
            : null,
        enforcementMoneyFacts: null,
        enforcementExplicitFields: null,
        retainedSourceContent: "NONE",
      },
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    });
    expect(JSON.stringify(output)).not.toContain(PRIVATE_FILENAME);
    expect(Object.isFrozen(output)).toBe(true);
    expect(Object.isFrozen(output.fileIntegrity)).toBe(true);
    expect(Object.isFrozen(output.reviewContext)).toBe(true);
    expect(Object.isFrozen(output.analysis)).toBe(true);
    expect(output.analysis).not.toBe(sourceAnalysis);
    expect(JSON.stringify(output.analysis)).not.toMatch(
      /"(?:ownerScope|documentId|filename|bytes|pages|text|rawValue)"/i,
    );
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    expect(worker.activeMessageListeners()).toBe(0);
    expect(worker.activeErrorListeners()).toBe(0);
  });

  it("sends only protocol metadata and transferable bytes to the worker", async () => {
    const worker = createFakeWorker();
    const deps = dependencies(worker);
    const file = pdfFile(pdfBytes("\nPRIVATE_FILE_CONTENT_SENTINEL"));

    await readFiscalNotificationPdfTextLayer(request({ file }), deps);

    expect(worker.postMessage).toHaveBeenCalledTimes(1);
    const [message, transfer] = worker.postMessage.mock.calls[0] ?? [];
    expect(message).toMatchObject({
      type: "PARSE",
      requestId: "parse",
      bytes: expect.any(ArrayBuffer),
    });
    expect(Reflect.ownKeys(message as object).sort()).toEqual(
      ["bytes", "requestId", "type"].sort(),
    );
    expect(message).not.toHaveProperty("ownerScope");
    expect(message).not.toHaveProperty("documentId");
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
    {
      ...resultMessage(),
      analysis: {
        ...workerAnalysis(),
        privateCsv: "PRIVATE_ANALYSIS_SENTINEL",
      },
    },
    resultMessage({
      ...workerAnalysis(),
      familyAnalysis: {
        ...(workerAnalysis().familyAnalysis as object),
        rawValue: "PRIVATE_FAMILY_SENTINEL",
      },
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

  it("rejects an analysis that claims no text while carrying a family result", async () => {
    const worker = createFakeWorker({
      response: resultMessage({
        ...workerAnalysis("NO_EXTRACTABLE_TEXT"),
        familyAnalysis: workerAnalysis().familyAnalysis,
      }),
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

  it("reattaches owner identifiers only in main and keeps signal non-enumerable", async () => {
    const controller = new AbortController();
    const worker = createFakeWorker();
    const output = await readFiscalNotificationPdfTextLayer(
      request({
        ownerScope: "user:tenant-b",
        documentId: "document:tenant-b",
        signal: controller.signal,
      }),
      dependencies(worker),
    );

    expect(output.reviewContext).toMatchObject({
      ownerScope: "user:tenant-b",
      documentId: "document:tenant-b",
    });
    expect(Object.getOwnPropertyDescriptor(output.reviewContext, "signal")).toMatchObject({
      value: controller.signal,
      enumerable: false,
      writable: false,
      configurable: false,
    });
    expect(JSON.stringify(output.reviewContext)).not.toContain("signal");
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it("accepts the single exact PDF.js ready envelope before the result", async () => {
    const worker = createFakeWorker({
      responseSequence: [PDFJS_READY_MESSAGE, resultMessage()],
    });

    await expect(
      readFiscalNotificationPdfTextLayer(request(), dependencies(worker)),
    ).resolves.toMatchObject({ status: "TEXT_LAYER_AVAILABLE" });
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it.each([
    { ...PDFJS_READY_MESSAGE, data: undefined },
    { ...PDFJS_READY_MESSAGE, privateValue: "PRIVATE_READY_SENTINEL" },
    { ...PDFJS_READY_MESSAGE, action: "Ready" },
  ])("rejects any variant of the PDF.js ready envelope", async (response) => {
    const worker = createFakeWorker({ response });

    await expect(
      readFiscalNotificationPdfTextLayer(request(), dependencies(worker)),
    ).rejects.toMatchObject({ code: "INVALID_WORKER_RESPONSE" });
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it("rejects a duplicate PDF.js ready envelope", async () => {
    const worker = createFakeWorker({
      responseSequence: [PDFJS_READY_MESSAGE, PDFJS_READY_MESSAGE],
    });

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

  it("uses intrinsic abort listeners and still terminates when instance methods are shadowed", async () => {
    const controller = new AbortController();
    const shadowedAdd = vi.fn(() => {
      throw new Error("PRIVATE_SHADOWED_ADD_SENTINEL");
    });
    const shadowedRemove = vi.fn(() => {
      throw new Error("PRIVATE_SHADOWED_REMOVE_SENTINEL");
    });
    Object.defineProperties(controller.signal, {
      addEventListener: {
        configurable: true,
        value: shadowedAdd,
      },
      removeEventListener: {
        configurable: true,
        value: shadowedRemove,
      },
    });
    const worker = createFakeWorker({ response: NO_RESPONSE });
    const parsing = readFiscalNotificationPdfTextLayer(
      request({ signal: controller.signal }),
      dependencies(worker),
    );
    await vi.waitFor(() => expect(worker.postMessage).toHaveBeenCalledTimes(1));

    controller.abort();

    await expect(parsing).rejects.toMatchObject({ code: "ABORTED" });
    expect(shadowedAdd).not.toHaveBeenCalled();
    expect(shadowedRemove).not.toHaveBeenCalled();
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    expect(worker.activeMessageListeners()).toBe(0);
    expect(worker.activeErrorListeners()).toBe(0);
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
    const sourceAnalysis = workerAnalysis();
    const sourceFamily = sourceAnalysis.familyAnalysis;
    const worker = createFakeWorker({ response: resultMessage(sourceAnalysis) });
    const input = request();
    const originalKeys = Reflect.ownKeys(input);

    const output = await readFiscalNotificationPdfTextLayer(input, dependencies(worker));
    sourceAnalysis.pageCount = 80;
    if (sourceFamily) sourceFamily.reason = "PRIVATE_MUTATION";

    expect(Reflect.ownKeys(input)).toEqual(originalKeys);
    expect(input.file.name).toBe(PRIVATE_FILENAME);
    expect(output.reviewContext).toMatchObject({
      ownerScope: "user:synthetic",
    });
    expect(output.analysis).toMatchObject({
      pageCount: 1,
      familyAnalysis: { reason: "NO_SUPPORTED_FAMILY_SIGNAL" },
    });
    expect(JSON.stringify(output)).not.toContain("PRIVATE_MUTATION");
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

  it("locks the pinned PDF.js worker initialization envelope", () => {
    const workerModuleUrl = pathToFileURL(
      createRequire(import.meta.url).resolve(
        "pdfjs-dist/legacy/build/pdf.worker.mjs",
      ),
    ).href;
    const script = `
      const messages = [];
      const listeners = [];
      globalThis.onmessage = null;
      globalThis.postMessage = message => messages.push(message);
      globalThis.addEventListener = (type, listener) => {
        if (type === "message") listeners.push(listener);
      };
      globalThis.removeEventListener = () => {};
      globalThis.self = globalThis;
      globalThis.process = undefined;
      const moduleUrl = ${JSON.stringify(workerModuleUrl)};
      await import(moduleUrl);
      await import(moduleUrl);
      const expected = [{
        sourceName: "worker",
        targetName: "main",
        action: "ready",
        data: null,
      }];
      if (JSON.stringify(messages) !== JSON.stringify(expected)) {
        throw new Error("Unexpected PDF.js initialization envelope");
      }
      if (listeners.length !== 1) {
        throw new Error("Unexpected PDF.js message listener count");
      }
    `;

    expect(() =>
      execFileSync(
        process.execPath,
        ["--input-type=module", "--eval", script],
        { stdio: "pipe", timeout: 10_000 },
      ),
    ).not.toThrow();
  });

  it("locks the real Worker outbound protocol before source content can cross the boundary", () => {
    const source = readFileSync(
      new URL("./pdf-text-layer.worker.ts", import.meta.url),
      "utf8",
    );
    const sourceFile = ts.createSourceFile(
      "pdf-text-layer.worker.ts",
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const envelopes: Array<{
      type: string;
      keys: string[];
      analysisIsShorthand: boolean;
    }> = [];
    const visit = (node: ts.Node): void => {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.expression.getText(sourceFile) === "workerScope" &&
        node.expression.name.text === "postMessage"
      ) {
        expect(node.arguments).toHaveLength(1);
        const argument = node.arguments[0];
        expect(argument && ts.isObjectLiteralExpression(argument)).toBe(true);
        if (!argument || !ts.isObjectLiteralExpression(argument)) return;
        const keys = argument.properties.map((property) => {
          expect(
            ts.isPropertyAssignment(property) ||
              ts.isShorthandPropertyAssignment(property),
          ).toBe(true);
          const name = property.name;
          expect(
            name && (ts.isIdentifier(name) || ts.isStringLiteral(name)),
          ).toBe(true);
          return name && (ts.isIdentifier(name) || ts.isStringLiteral(name))
            ? name.text
            : "INVALID";
        });
        const typeProperty = argument.properties.find(
          (property) => property.name?.getText(sourceFile) === "type",
        );
        expect(typeProperty && ts.isPropertyAssignment(typeProperty)).toBe(true);
        if (!typeProperty || !ts.isPropertyAssignment(typeProperty)) return;
        expect(ts.isStringLiteral(typeProperty.initializer)).toBe(true);
        if (!ts.isStringLiteral(typeProperty.initializer)) return;
        const analysisProperty = argument.properties.find(
          (property) => property.name?.getText(sourceFile) === "analysis",
        );
        envelopes.push({
          type: typeProperty.initializer.text,
          keys: [...keys].sort(),
          analysisIsShorthand:
            analysisProperty !== undefined &&
            ts.isShorthandPropertyAssignment(analysisProperty),
        });
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);

    expect(envelopes.sort((left, right) => left.type.localeCompare(right.type)))
      .toEqual([
        {
          type: "ERROR",
          keys: ["code", "requestId", "type"],
          analysisIsShorthand: false,
        },
        {
          type: "RESULT",
          keys: ["analysis", "requestId", "type"],
          analysisIsShorthand: true,
        },
      ]);
  });

  it("gates the explicit-field extractor inside the Worker before projecting a redacted result", () => {
    const source = readFileSync(
      new URL("./pdf-text-layer.worker.ts", import.meta.url),
      "utf8",
    );
    const sourceFile = ts.createSourceFile(
      "pdf-text-layer.worker.ts",
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const extractorImport = sourceFile.statements.find(
      (statement) =>
        ts.isImportDeclaration(statement) &&
        ts.isStringLiteral(statement.moduleSpecifier) &&
        statement.moduleSpecifier.text ===
          "./aeat-enforcement-explicit-fields.v1",
    );
    expect(extractorImport && ts.isImportDeclaration(extractorImport)).toBe(
      true,
    );
    if (!extractorImport || !ts.isImportDeclaration(extractorImport)) return;
    const namedBindings = extractorImport.importClause?.namedBindings;
    expect(namedBindings && ts.isNamedImports(namedBindings)).toBe(true);
    if (!namedBindings || !ts.isNamedImports(namedBindings)) return;
    expect(namedBindings.elements.map((item) => item.name.text)).toEqual([
      "extractAeatEnforcementExplicitFieldsV1",
    ]);

    const extractorCalls: ts.CallExpression[] = [];
    let explicitDeclaration: ts.VariableDeclaration | null = null;
    let projectorCall: ts.CallExpression | null = null;
    const visit = (node: ts.Node): void => {
      if (
        ts.isCallExpression(node) &&
        node.expression.getText(sourceFile) ===
          "extractAeatEnforcementExplicitFieldsV1"
      ) {
        extractorCalls.push(node);
      }
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.name.text === "enforcementExplicitFields"
      ) {
        explicitDeclaration = node;
      }
      if (
        ts.isCallExpression(node) &&
        node.expression.getText(sourceFile) ===
          "projectFiscalNotificationPdfWorkerAnalysis"
      ) {
        projectorCall = node;
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);

    expect(extractorCalls).toHaveLength(1);
    expect(extractorCalls[0]?.arguments.map((item) => item.getText(sourceFile)))
      .toEqual(["documentInput"]);
    const capturedExplicitDeclaration =
      explicitDeclaration as ts.VariableDeclaration | null;
    expect(capturedExplicitDeclaration).not.toBeNull();
    const initializer = capturedExplicitDeclaration?.initializer;
    expect(initializer && ts.isConditionalExpression(initializer)).toBe(true);
    if (!initializer || !ts.isConditionalExpression(initializer)) return;
    expect(initializer.condition.getText(sourceFile)).toBe(
      "enforcementCandidate",
    );
    expect(initializer.whenTrue).toBe(extractorCalls[0]);
    expect(initializer.whenFalse.kind).toBe(ts.SyntaxKind.NullKeyword);

    const capturedProjectorCall = projectorCall as ts.CallExpression | null;
    expect(capturedProjectorCall).not.toBeNull();
    const projection = capturedProjectorCall?.arguments[0];
    expect(projection && ts.isObjectLiteralExpression(projection)).toBe(true);
    if (!projection || !ts.isObjectLiteralExpression(projection)) return;
    expect(
      projection.properties.map((property) => property.name?.getText(sourceFile)),
    ).toEqual([
      "textLayerStatus",
      "pageCount",
      "familyAnalysis",
      "enforcementMoneyFacts",
      "enforcementExplicitFields",
    ]);
    const explicitProjection = projection.properties.at(-1);
    expect(
      explicitProjection &&
        ts.isShorthandPropertyAssignment(explicitProjection),
    ).toBe(true);
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
