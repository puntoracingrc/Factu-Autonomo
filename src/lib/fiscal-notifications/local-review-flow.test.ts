import { describe, expect, it, vi } from "vitest";
import { DISABLED_FISCAL_NOTIFICATION_OCR_PORT } from "./disabled-ocr-port";
import type { BoundedDocumentInput } from "./input-contract";
import {
  analyzeFiscalNotificationLocally,
  FISCAL_NOTIFICATION_LOCAL_REVIEW_TEST_SEAM,
  type FiscalNotificationLocalReviewDependencies,
} from "./local-review-flow";
import type { FiscalNotificationPdfTextLayerResult } from "./pdf-text-layer-adapter";

const HASH = "b".repeat(64);
const PRIVATE_TEXT = "PRIVATE_TAX_ID_AND_CSV_SENTINEL";

function documentInput(
  text: string,
  signal?: AbortSignal,
): BoundedDocumentInput {
  const input = {
    ownerScope: "user:synthetic-review",
    documentId: "document:synthetic-review",
    pages: Object.freeze([
      Object.freeze({
        pageNumber: 1,
        text,
        isBlank: text.trim().length === 0,
      }),
    ]),
  } as BoundedDocumentInput;
  if (signal) {
    Object.defineProperty(input, "signal", {
      value: signal,
      enumerable: false,
      writable: false,
      configurable: false,
    });
  }
  return Object.freeze(input);
}

function intake(
  text: string,
  signal?: AbortSignal,
): FiscalNotificationPdfTextLayerResult {
  return Object.freeze({
    schemaVersion: 1,
    adapterVersion: "1.0.1",
    status: text.trim() ? "TEXT_LAYER_AVAILABLE" : "NO_EXTRACTABLE_TEXT",
    sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
    fileIntegrity: Object.freeze({
      mimeType: "application/pdf",
      byteLength: 2_048,
      sha256: HASH,
    }),
    documentInput: documentInput(text, signal),
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
  });
}

function dependencies(
  text: string,
  overrides: Partial<FiscalNotificationLocalReviewDependencies> = {},
): FiscalNotificationLocalReviewDependencies {
  return {
    readPdf: vi.fn(async () => intake(text)),
    ocrPort: DISABLED_FISCAL_NOTIFICATION_OCR_PORT,
    ...overrides,
  };
}

function analyzeForTest(
  request: unknown,
  testDependencies: FiscalNotificationLocalReviewDependencies,
) {
  if (!FISCAL_NOTIFICATION_LOCAL_REVIEW_TEST_SEAM) {
    throw new Error("Local review test seam is unavailable");
  }
  return FISCAL_NOTIFICATION_LOCAL_REVIEW_TEST_SEAM.analyzeWithDependencies(
    request,
    testDependencies,
  );
}

describe("fiscal notification local review flow", () => {
  it("returns only a review candidate and never retains source text or File metadata", async () => {
    const text = [
      "AGENCIA TRIBUTARIA",
      "sede.agenciatributaria.gob.es",
      "PROVIDENCIA DE APREMIO",
      "IDENTIFICACION DEL DOCUMENTO",
      "IMPORTE DE LA DEUDA",
      PRIVATE_TEXT,
    ].join("\n");

    const result = await analyzeForTest(
      { privateFilename: "PRIVATE_FILENAME.pdf" },
      dependencies(text),
    );

    expect(result).toMatchObject({
      schemaVersion: 1,
      flowVersion: "1.0.0",
      status: "REVIEW_REQUIRED",
      reason: "SUPPORTED_FAMILY_CANDIDATE",
      engineId: "fiscal-notification-family-candidate-engine",
      engineVersion: "1.0.0",
      pageCount: 1,
      byteLength: 2_048,
      sha256: HASH,
      selectedFamilyId: null,
      providerCalled: false,
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
      retainedSourceContent: "NONE",
      candidates: [
        {
          familyId: "AEAT_ENFORCEMENT_ORDER_CANDIDATE",
          documentType: "AEAT_ENFORCEMENT_ORDER",
          authoritySignal: "AEAT_UNVERIFIED",
          handlerId: "aeat-enforcement-order-candidate",
          handlerVersion: "1.0.0",
          signalStatus: "COMPLETE_REQUIRED_ANCHORS",
        },
      ],
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(PRIVATE_TEXT);
    expect(serialized).not.toContain("PRIVATE_FILENAME");
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.candidates)).toBe(true);
    expect(Object.isFrozen(result.candidates[0]?.matchedAnchors)).toBe(true);
  });

  it("uses only metadata with the disabled OCR port for a scanned PDF", async () => {
    const recognize = vi.fn(async (value: unknown) => {
      expect(value).toEqual({
        schemaVersion: 1,
        ownerScope: "user:synthetic-review",
        documentId: "document:synthetic-review",
        mimeType: "application/pdf",
        byteLength: 2_048,
        sha256: HASH,
      });
      return Object.freeze({
        schemaVersion: 1 as const,
        portVersion: "1.0.0" as const,
        status: "INFORMATION_PENDING" as const,
        reason: "OCR_DISABLED" as const,
        documentInput: null,
        providerCalled: false as const,
        executionBoundary: "NONE" as const,
        retainedSourceContent: "NONE" as const,
        requiresHumanReview: true as const,
        materializationPolicy: "PROHIBITED_UNTIL_REVIEW" as const,
      });
    });

    const result = await analyzeForTest(
      {},
      dependencies("", { ocrPort: { recognize } }),
    );

    expect(result).toMatchObject({
      status: "INFORMATION_PENDING",
      reason: "OCR_DISABLED",
      engineId: null,
      engineVersion: null,
      candidates: [],
      providerCalled: false,
      retainedSourceContent: "NONE",
    });
    expect(recognize).toHaveBeenCalledTimes(1);
  });

  it("keeps unknown and partial documents pending without inventing a match", async () => {
    const result = await analyzeForTest(
      {},
      dependencies("COMUNICACION ADMINISTRATIVA SINTETICA"),
    );

    expect(result).toMatchObject({
      status: "INFORMATION_PENDING",
      reason: "NO_SUPPORTED_FAMILY_SIGNAL",
      candidates: [],
      selectedFamilyId: null,
    });
  });

  it("propagates a bounded intake failure without invoking OCR", async () => {
    const failure = new Error("bounded-intake-failure");
    const readPdf = vi.fn(async () => {
      throw failure;
    });
    const recognize = vi.fn();

    await expect(
      analyzeForTest({}, {
        readPdf,
        ocrPort: { recognize },
      }),
    ).rejects.toBe(failure);
    expect(recognize).not.toHaveBeenCalled();
  });

  it("keeps dependency injection unavailable through the production function", () => {
    expect(analyzeFiscalNotificationLocally).toHaveLength(1);
    expect(FISCAL_NOTIFICATION_LOCAL_REVIEW_TEST_SEAM).not.toBeNull();
  });

  it("rejects an OCR outcome that could make providerCalled audit metadata false", async () => {
    const recognize = vi.fn(async () => ({
      schemaVersion: 1 as const,
      portVersion: "1.0.0" as const,
      status: "INFORMATION_PENDING" as const,
      reason: "OCR_DISABLED" as const,
      documentInput: null,
      providerCalled: true as unknown as false,
      executionBoundary: "NONE" as const,
      retainedSourceContent: "NONE" as const,
      requiresHumanReview: true as const,
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW" as const,
    }));

    await expect(
      analyzeForTest({}, dependencies("", { ocrPort: { recognize } })),
    ).rejects.toMatchObject({
      code: "INVALID_INPUT",
      path: "ocrOutcome",
    });
  });

  it("propagates the non-enumerable abort signal into deterministic extraction", async () => {
    const controller = new AbortController();
    const readPdf = vi.fn(async () => {
      controller.abort();
      return intake("PROVIDENCIA DE APREMIO", controller.signal);
    });

    await expect(
      analyzeForTest({}, {
        readPdf,
        ocrPort: DISABLED_FISCAL_NOTIFICATION_OCR_PORT,
      }),
    ).rejects.toMatchObject({ code: "ABORTED", path: "signal" });
    expect(JSON.stringify(await readPdf())).not.toContain("signal");
  });
});
