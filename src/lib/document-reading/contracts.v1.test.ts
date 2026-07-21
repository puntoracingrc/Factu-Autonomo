import { describe, expect, it } from "vitest";
import {
  createAbstainedDocumentReadingOutcomeV1,
  createEphemeralDocumentContentV1,
  createReadableDocumentReadingOutcomeV1,
  DocumentReadingErrorV1,
  parseDocumentReadingPagesV1,
} from "./contracts.v1";
import { DOCUMENT_READING_LIMITS_V1 } from "./limits.v1";

const RAW_SENTINEL = "PRIVATE_RAW_DOCUMENT_SENTINEL";
const HASH = "a".repeat(64);

function pages(text = RAW_SENTINEL) {
  return [
    {
      pageNumber: 1,
      text,
      isBlank: text.length === 0,
      layoutRows: text
        ? [{ yMilli: 100, cells: [{ xMilli: 50, widthMilli: 80, text }] }]
        : [],
    },
  ];
}

describe("document-reading contracts v1", () => {
  it("mantiene texto y layout accesibles solo mediante contenido no enumerable", () => {
    const outcome = createReadableDocumentReadingOutcomeV1({
      source: { mimeType: "application/pdf", byteLength: 123, sha256: HASH },
      pages: pages(),
    });

    expect(outcome.ephemeralContent.pages[0]?.text).toBe(RAW_SENTINEL);
    expect(Object.keys(outcome)).not.toContain("ephemeralContent");
    expect(Object.keys(outcome.ephemeralContent)).toEqual([]);
    expect(JSON.stringify(outcome)).not.toContain(RAW_SENTINEL);
    expect(JSON.stringify(outcome)).not.toContain("layoutRows");
    expect(JSON.stringify(outcome.ephemeralContent)).toBeUndefined();
    expect(Object.isFrozen(outcome)).toBe(true);
    expect(Object.isFrozen(outcome.ephemeralContent.pages)).toBe(true);
  });

  it("rechaza páginas y celdas que exceden el contrato cerrado", () => {
    const tooManyPages = Array.from(
      { length: DOCUMENT_READING_LIMITS_V1.maxPdfPages + 1 },
      (_, index) => ({ pageNumber: index + 1, text: "", isBlank: true }),
    );
    expect(() => parseDocumentReadingPagesV1(tooManyPages)).toThrowError(
      expect.objectContaining<DocumentReadingErrorV1>({ code: "TOO_MANY_PAGES" }),
    );
    expect(() =>
      parseDocumentReadingPagesV1([
        {
          pageNumber: 1,
          text: "x",
          isBlank: false,
          layoutRows: [
            {
              yMilli: 1,
              cells: [
                {
                  xMilli: 1,
                  widthMilli: 1,
                  text: "x".repeat(
                    DOCUMENT_READING_LIMITS_V1.maxTextItemChars + 1,
                  ),
                },
              ],
            },
          ],
        },
      ]),
    ).toThrowError(
      expect.objectContaining<DocumentReadingErrorV1>({
        code: "INVALID_WORKER_RESPONSE",
      }),
    );
  });

  it("rechaza envelopes con campos desconocidos o blank incoherente", () => {
    expect(() =>
      parseDocumentReadingPagesV1([
        { pageNumber: 1, text: RAW_SENTINEL, isBlank: true },
      ]),
    ).toThrowError(
      expect.objectContaining<DocumentReadingErrorV1>({
        code: "INVALID_WORKER_RESPONSE",
      }),
    );
    expect(() =>
      createEphemeralDocumentContentV1([
        { pageNumber: 1, text: "", isBlank: true, extra: "not-allowed" },
      ]),
    ).toThrowError(DocumentReadingErrorV1);
  });

  it("serializa una abstención sin inventar contenido", () => {
    const outcome = createAbstainedDocumentReadingOutcomeV1({
      reason: "OCR_REQUIRED",
      source: { mimeType: "application/pdf", byteLength: 123, sha256: HASH },
      pageCount: 1,
    });
    expect(outcome).toMatchObject({
      status: "ABSTAINED",
      reason: "OCR_REQUIRED",
      providerCalled: false,
      retainedSourceContent: "NONE",
    });
    expect(JSON.stringify(outcome)).not.toContain(RAW_SENTINEL);
  });
});
