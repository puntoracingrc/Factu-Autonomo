import {
  createEphemeralDocumentContentV1,
  DocumentReadingErrorV1,
  type DocumentReadingErrorCodeV1,
  type EphemeralDocumentContentV1,
} from "@/lib/document-reading/contracts.v1";
import {
  FiscalNotificationPdfError,
  parseFiscalNotificationPdfTextLayerBytes,
  type FiscalNotificationPdfErrorCode,
  type FiscalNotificationPdfJsAdapter,
} from "@/lib/fiscal-notifications/pdf-text-layer-parser";

export interface ExpenseFiscalTextLayerCompatRequestV1 {
  readonly ownerScope: string;
  readonly documentId: string;
  readonly bytes: Uint8Array;
  readonly signal?: AbortSignal;
}

export interface ExpenseFiscalTextLayerCompatDependenciesV1 {
  readonly pdfjs?: FiscalNotificationPdfJsAdapter;
}

export async function readExpensePdfTextLayerThroughFiscalCompatV1(
  request: ExpenseFiscalTextLayerCompatRequestV1,
  dependencies: ExpenseFiscalTextLayerCompatDependenciesV1 = {},
): Promise<EphemeralDocumentContentV1> {
  try {
    const input = await parseFiscalNotificationPdfTextLayerBytes({
      ownerScope: request.ownerScope,
      documentId: request.documentId,
      bytes: request.bytes,
      ...(request.signal ? { signal: request.signal } : {}),
      ...(dependencies.pdfjs ? { pdfjs: dependencies.pdfjs } : {}),
    });
    return createEphemeralDocumentContentV1(input.pages);
  } catch (error) {
    if (error instanceof FiscalNotificationPdfError) {
      throw new DocumentReadingErrorV1(mapFiscalPdfError(error.code));
    }
    if (error instanceof DocumentReadingErrorV1) throw error;
    throw new DocumentReadingErrorV1("INVALID_PDF");
  }
}

function mapFiscalPdfError(
  code: FiscalNotificationPdfErrorCode,
): DocumentReadingErrorCodeV1 {
  switch (code) {
    case "UNSUPPORTED_FILE":
      return "UNSUPPORTED_MIME";
    case "FILE_TOO_LARGE":
    case "INVALID_PDF":
    case "TOO_MANY_PAGES":
    case "TOO_MANY_TEXT_ITEMS":
    case "TEXT_ITEM_TOO_LARGE":
    case "TEXT_TOO_LARGE":
    case "TIMEOUT":
    case "ABORTED":
    case "WORKER_UNAVAILABLE":
    case "INVALID_WORKER_RESPONSE":
    case "HASH_UNAVAILABLE":
      return code;
  }
}
