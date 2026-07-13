import { describe, expect, it, vi } from "vitest";
import {
  DISABLED_FISCAL_NOTIFICATION_OCR_PORT,
  MAX_FISCAL_NOTIFICATION_OCR_METADATA_BYTES,
} from "./disabled-ocr-port";

const HASH = "a".repeat(64);

function metadata(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    ownerScope: "user:synthetic",
    documentId: "document-synthetic-ocr",
    mimeType: "application/pdf",
    byteLength: 1_024,
    sha256: HASH,
    ...overrides,
  };
}

describe("disabled fiscal notification OCR port", () => {
  it("returns an exact, immutable and deterministic unavailable outcome", async () => {
    const first = await DISABLED_FISCAL_NOTIFICATION_OCR_PORT.recognize(metadata());
    const second = await DISABLED_FISCAL_NOTIFICATION_OCR_PORT.recognize(metadata());

    expect(first).toEqual({
      schemaVersion: 1,
      portVersion: "1.0.0",
      status: "INFORMATION_PENDING",
      reason: "OCR_DISABLED",
      documentInput: null,
      providerCalled: false,
      executionBoundary: "NONE",
      retainedSourceContent: "NONE",
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    });
    expect(first).toBe(second);
    expect(Object.isFrozen(first)).toBe(true);
  });

  it("never reads bytes, files or personal fields and never calls a provider", async () => {
    const input = metadata();
    Object.defineProperty(input, "bytes", {
      enumerable: false,
      get: () => {
        throw new Error("bytes must never be read");
      },
    });
    await expect(
      DISABLED_FISCAL_NOTIFICATION_OCR_PORT.recognize(input),
    ).rejects.toMatchObject({ path: "$" });

    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = await DISABLED_FISCAL_NOTIFICATION_OCR_PORT.recognize(
      metadata({ privateTaxId: undefined }),
    ).catch((error) => error);
    expect(result).toMatchObject({ path: "$.$unknown" });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it.each([
    [{ schemaVersion: 2 }, "schemaVersion"],
    [{ ownerScope: " user:synthetic" }, "ownerScope"],
    [{ documentId: "" }, "documentId"],
    [{ mimeType: "image/svg+xml" }, "mimeType"],
    [{ byteLength: 0 }, "byteLength"],
    [{ byteLength: MAX_FISCAL_NOTIFICATION_OCR_METADATA_BYTES + 1 }, "byteLength"],
    [{ sha256: "ABC" }, "sha256"],
  ])("rejects malformed metadata without coercion", async (overrides, path) => {
    await expect(
      DISABLED_FISCAL_NOTIFICATION_OCR_PORT.recognize(metadata(overrides)),
    ).rejects.toMatchObject({ path });
  });

  it("honors an already-aborted signal", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      DISABLED_FISCAL_NOTIFICATION_OCR_PORT.recognize(
        metadata({ signal: controller.signal }),
      ),
    ).rejects.toMatchObject({ code: "ABORTED" });
  });
});
