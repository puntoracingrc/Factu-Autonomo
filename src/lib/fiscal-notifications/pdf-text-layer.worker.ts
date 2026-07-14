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

const REQUEST_KEYS = new Set(["type", "requestId", "bytes"]);
const REQUEST_ID = "parse" as const;
const EPHEMERAL_WORKER_OWNER_SCOPE = "worker:ephemeral" as const;
const EPHEMERAL_WORKER_DOCUMENT_ID = "document:ephemeral" as const;
const workerScope = globalThis as unknown as FiscalNotificationPdfWorkerScope;

workerScope.onmessage = (event: MessageEvent<unknown>) => {
  void processMessage(event.data);
};

async function processMessage(value: unknown): Promise<void> {
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

    const documentInput = await parseFiscalNotificationPdfTextLayerBytes({
      ownerScope: EPHEMERAL_WORKER_OWNER_SCOPE,
      documentId: EPHEMERAL_WORKER_DOCUMENT_ID,
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
      analysis,
      verticalSliceReview: projected.verticalSliceReview,
    });
  } catch (error) {
    workerScope.postMessage({
      type: "ERROR",
      requestId: REQUEST_ID,
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
