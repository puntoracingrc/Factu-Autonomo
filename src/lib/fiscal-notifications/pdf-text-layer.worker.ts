import {
  FiscalNotificationPdfError,
  parseFiscalNotificationPdfTextLayerBytes,
  type FiscalNotificationPdfErrorCode,
} from "./pdf-text-layer-parser";
import { extractFiscalNotificationCandidates } from "./extraction-dispatcher";
import { extractAeatEnforcementExplicitFieldsV2 } from "./aeat-enforcement-explicit-fields.v2";
import { extractAeatEnforcementPartyFactsV1 } from "./aeat-enforcement-party-facts.v1";
import { extractAeatEnforcementMoneyFacts } from "./aeat-enforcement-money-facts";
import { extractAeatDeferralGrantFactsV1 } from "./aeat-deferral-grant-facts.v1";
import { extractAeatOffsetAgreementFactsV1 } from "./aeat-offset-agreement-facts.v1";
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
    const pageCount = documentInput.pages.length;
    const hasText = documentInput.pages.some(
      (page) => page.text.trim().length > 0,
    );
    const familyAnalysis = hasText
      ? extractFiscalNotificationCandidates(documentInput)
      : null;
    const enforcementCandidate =
      familyAnalysis?.reason === "SUPPORTED_FAMILY_CANDIDATE" &&
      familyAnalysis.candidates.length === 1 &&
      familyAnalysis.candidates[0]?.familyId ===
        "AEAT_ENFORCEMENT_ORDER_CANDIDATE" &&
      familyAnalysis.candidates[0].signalStatus ===
        "COMPLETE_REQUIRED_ANCHORS" &&
      familyAnalysis.candidates[0].conflictingAnchorIds.length === 0;
    const enforcementMoneyFacts = enforcementCandidate
      ? extractAeatEnforcementMoneyFacts(documentInput)
      : null;
    const enforcementExplicitFields = enforcementCandidate
      ? extractAeatEnforcementExplicitFieldsV2(documentInput)
      : null;
    const enforcementPartyFacts = enforcementCandidate
      ? extractAeatEnforcementPartyFactsV1(documentInput)
      : null;
    const deferralCandidate =
      familyAnalysis?.reason === "SUPPORTED_FAMILY_CANDIDATE" &&
      familyAnalysis.candidates.length === 1 &&
      familyAnalysis.candidates[0]?.familyId ===
        "AEAT_DEFERRAL_GRANT_CANDIDATE" &&
      familyAnalysis.candidates[0].signalStatus ===
        "COMPLETE_REQUIRED_ANCHORS" &&
      familyAnalysis.candidates[0].conflictingAnchorIds.length === 0;
    const deferralGrantFacts = deferralCandidate
      ? extractAeatDeferralGrantFactsV1(documentInput)
      : null;
    const offsetCandidate =
      familyAnalysis?.reason === "SUPPORTED_FAMILY_CANDIDATE" &&
      familyAnalysis.candidates.length === 1 &&
      familyAnalysis.candidates[0]?.familyId ===
        "AEAT_OFFSET_AGREEMENT_CANDIDATE" &&
      familyAnalysis.candidates[0].signalStatus ===
        "COMPLETE_REQUIRED_ANCHORS" &&
      familyAnalysis.candidates[0].conflictingAnchorIds.length === 0;
    const extractedOffsetAgreementFacts = offsetCandidate
      ? extractAeatOffsetAgreementFactsV1(documentInput)
      : null;
    const offsetAgreementFacts =
      extractedOffsetAgreementFacts?.documentType === "AEAT_OFFSET_AGREEMENT"
        ? extractedOffsetAgreementFacts
        : null;
    const analysis = projectFiscalNotificationPdfWorkerAnalysis({
      textLayerStatus: hasText
        ? "TEXT_LAYER_AVAILABLE"
        : "NO_EXTRACTABLE_TEXT",
      pageCount,
      familyAnalysis,
      enforcementMoneyFacts,
      enforcementExplicitFields,
      enforcementPartyFacts,
      deferralGrantFacts,
      offsetAgreementFacts,
    });
    workerScope.postMessage({
      type: "RESULT",
      requestId: REQUEST_ID,
      analysis,
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
