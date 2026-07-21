import { describe, expect, it, vi } from "vitest";
import {
  createAbstainedDocumentReadingOutcomeV1,
  createReadableDocumentReadingOutcomeV1,
} from "@/lib/document-reading/contracts.v1";
import { EXPENSE_LOCAL_DOCUMENT_READER_SHADOW_TEST_SEAM } from "./local-document-reader-shadow.v1";

const RAW_SENTINEL = "PRIVATE_SHADOW_RAW_TEXT_SENTINEL";
const HASH = "b".repeat(64);

describe("expense local document reader shadow v1", () => {
  it("observa una lectura sin reemplazar, persistir ni mutar el gasto", async () => {
    const reading = createReadableDocumentReadingOutcomeV1({
      source: { mimeType: "application/pdf", byteLength: 100, sha256: HASH },
      pages: [{ pageNumber: 1, text: RAW_SENTINEL, isBlank: false }],
    });
    const readDocument = vi.fn(async () => reading);
    const result = await EXPENSE_LOCAL_DOCUMENT_READER_SHADOW_TEST_SEAM?.runWithDependencies(
      { synthetic: true },
      { readDocument },
    );

    expect(result).toMatchObject({
      mode: "SHADOW",
      existingResultPolicy: "UNCHANGED",
      mutationPerformed: false,
      providerCalled: false,
      persistencePolicy: "DO_NOT_PERSIST",
      promotionPolicy: "BLOCKED",
    });
    expect(readDocument).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(result)).not.toContain(RAW_SENTINEL);
  });

  it("propaga una abstención cerrada sin convertirla en resultado", async () => {
    const reading = createAbstainedDocumentReadingOutcomeV1({
      reason: "OCR_REQUIRED",
      source: { mimeType: "application/pdf", byteLength: 100, sha256: HASH },
      pageCount: 1,
    });
    const result = await EXPENSE_LOCAL_DOCUMENT_READER_SHADOW_TEST_SEAM?.runWithDependencies(
      {},
      { readDocument: async () => reading },
    );
    expect(result?.reading).toBe(reading);
    expect(result?.reading.status).toBe("ABSTAINED");
    expect(result?.promotionPolicy).toBe("BLOCKED");
  });
});
