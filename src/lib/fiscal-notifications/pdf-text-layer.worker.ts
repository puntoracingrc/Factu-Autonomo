import {
  FiscalNotificationPdfError,
  parseFiscalNotificationPdfTextLayerBytes,
  type FiscalNotificationPdfErrorCode,
} from "./pdf-text-layer-parser";
import { analyzeFiscalNotificationDocumentInput } from "./document-input-analysis";
import { projectFiscalNotificationPdfWorkerAnalysis } from "./pdf-worker-analysis-contract";

interface FiscalNotificationPdfWorkerScope {
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  postMessage(message: unknown): void;
}

const REQUEST_KEYS = new Set([
  "type",
  "requestId",
  "ownerScope",
  "fileId",
  "documentId",
  "sourceSha256",
  "bytes",
]);
const REQUEST_ID = "parse" as const;
const SHA256 = /^[a-f0-9]{64}$/u;
const workerScope = globalThis as unknown as FiscalNotificationPdfWorkerScope;

workerScope.onmessage = (event: MessageEvent<unknown>) => {
  void processMessage(event.data);
};

async function processMessage(value: unknown): Promise<void> {
  let responseIdentity: Readonly<{
    fileId: string;
    documentId: string;
    sourceSha256: string;
  }> | null = null;
  try {
    const request = snapshotRecord(value);
    if (!request) throw new FiscalNotificationPdfError("INVALID_PDF");
    for (const key of Reflect.ownKeys(request)) {
      if (typeof key !== "string" || !REQUEST_KEYS.has(key)) {
        throw new FiscalNotificationPdfError("INVALID_PDF");
      }
    }
    if (request.type !== "PARSE" || request.requestId !== REQUEST_ID) {
      throw new FiscalNotificationPdfError("INVALID_PDF");
    }
    if (!(request.bytes instanceof ArrayBuffer)) {
      throw new FiscalNotificationPdfError("INVALID_PDF");
    }
    if (
      typeof request.ownerScope !== "string" ||
      typeof request.fileId !== "string" ||
      typeof request.documentId !== "string" ||
      typeof request.sourceSha256 !== "string" ||
      !SHA256.test(request.sourceSha256)
    ) {
      throw new FiscalNotificationPdfError("INVALID_PDF");
    }
    responseIdentity = Object.freeze({
      fileId: request.fileId,
      documentId: request.documentId,
      sourceSha256: request.sourceSha256,
    });

    const documentInput = await parseFiscalNotificationPdfTextLayerBytes({
      ownerScope: request.ownerScope,
      documentId: request.documentId,
      bytes: new Uint8Array(request.bytes),
    });
    const projected = await analyzeFiscalNotificationDocumentInput(documentInput);
    const analysis = projectFiscalNotificationPdfWorkerAnalysis({
      textLayerStatus: projected.hasText
        ? "TEXT_LAYER_AVAILABLE"
        : "NO_EXTRACTABLE_TEXT",
      pageCount: projected.pageCount,
      familyAnalysis: projected.familyAnalysis,
      enforcementMoneyFacts: projected.enforcementMoneyFacts,
      enforcementExplicitFields: projected.enforcementExplicitFields,
      enforcementPartyFacts: projected.enforcementPartyFacts,
      deferralGrantFacts: projected.deferralGrantFacts,
      offsetAgreementFacts: projected.offsetAgreementFacts,
    });
    workerScope.postMessage({
      type: "RESULT",
      requestId: REQUEST_ID,
      fileId: responseIdentity.fileId,
      documentId: responseIdentity.documentId,
      sourceSha256: responseIdentity.sourceSha256,
      analysis,
      verticalSliceReview: projected.verticalSliceReview,
    });
  } catch (error) {
    workerScope.postMessage({
      type: "ERROR",
      requestId: REQUEST_ID,
      fileId: responseIdentity?.fileId ?? null,
      documentId: responseIdentity?.documentId ?? null,
      sourceSha256: responseIdentity?.sourceSha256 ?? null,
      code: safeErrorCode(error),
    });
  }
}

function safeErrorCode(error: unknown): FiscalNotificationPdfErrorCode {
  return error instanceof FiscalNotificationPdfError
    ? error.code
    : "INVALID_PDF";
}

function snapshotRecord(value: unknown): Record<string, unknown> | null {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const snapshot: Record<string, unknown> = Object.create(null);
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") return null;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor)) return null;
      snapshot[key] = descriptor.value;
    }
    return snapshot;
  } catch {
    return null;
  }
}
