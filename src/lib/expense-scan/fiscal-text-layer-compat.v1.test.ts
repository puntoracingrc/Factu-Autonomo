import { describe, expect, it, vi } from "vitest";
import { DocumentReadingErrorV1 } from "@/lib/document-reading/contracts.v1";
import type { FiscalNotificationPdfJsAdapter } from "@/lib/fiscal-notifications/pdf-text-layer-parser";
import { readExpensePdfTextLayerThroughFiscalCompatV1 } from "./fiscal-text-layer-compat.v1";

const RAW_SENTINEL = "PRIVATE_EXPENSE_TEXT_SENTINEL";

function pdfBytes(): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode("%PDF-1.7\nsynthetic");
}

function pdfjs(
  itemsByPage: readonly (readonly unknown[])[],
  numPages = itemsByPage.length,
): FiscalNotificationPdfJsAdapter {
  return {
    getDocument: vi.fn(() => ({
      promise: Promise.resolve({
        numPages,
        getPage: async (pageNumber: number) => ({
          getTextContent: async () => ({
            items: itemsByPage[pageNumber - 1] ?? [],
          }),
          cleanup: vi.fn(),
        }),
        destroy: vi.fn(async () => undefined),
      }),
      destroy: vi.fn(async () => undefined),
    })),
  };
}

describe("expense fiscal text-layer compatibility v1", () => {
  it("reutiliza el parser existente y devuelve contenido efímero neutral", async () => {
    const content = await readExpensePdfTextLayerThroughFiscalCompatV1(
      {
        ownerScope: "user:synthetic",
        documentId: "expense:synthetic",
        bytes: pdfBytes(),
      },
      {
        pdfjs: pdfjs([
          [
            {
              str: RAW_SENTINEL,
              hasEOL: false,
              transform: [1, 0, 0, 1, 20, 100],
              width: 50,
            },
          ],
        ]),
      },
    );

    expect(content.pages[0]).toMatchObject({
      pageNumber: 1,
      text: RAW_SENTINEL,
      isBlank: false,
    });
    expect(content.pages[0]?.layoutRows?.[0]?.cells[0]?.text).toBe(RAW_SENTINEL);
    expect(JSON.stringify(content)).toBeUndefined();
  });

  it("conserva un PDF digital sin texto como lectura vacía para abstención posterior", async () => {
    const content = await readExpensePdfTextLayerThroughFiscalCompatV1(
      {
        ownerScope: "user:synthetic",
        documentId: "expense:blank",
        bytes: pdfBytes(),
      },
      { pdfjs: pdfjs([[]]) },
    );
    expect(content.pages).toEqual([
      { pageNumber: 1, text: "", isBlank: true },
    ]);
  });

  it("traduce fallos fiscales a códigos neutrales cerrados", async () => {
    await expect(
      readExpensePdfTextLayerThroughFiscalCompatV1(
        {
          ownerScope: "user:synthetic",
          documentId: "expense:oversized-pages",
          bytes: pdfBytes(),
        },
        { pdfjs: pdfjs([], 81) },
      ),
    ).rejects.toEqual(
      expect.objectContaining<DocumentReadingErrorV1>({ code: "TOO_MANY_PAGES" }),
    );
  });
});
