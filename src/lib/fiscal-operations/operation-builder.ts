import { FiscalOperationError } from "./errors";
import { buildFiscalOperationIdempotencyKey } from "./idempotency";
import { buildFiscalInvoiceIdentity } from "./identity";
import {
  assertDocumentIsEligibleForFiscalOperation,
  assertExpectedDocumentVersionExists,
  assertIssueDateExists,
  assertIssuerAndNumSerieExist,
  assertSnapshotHashExists,
  normalizeFiscalEnvironment,
  normalizeFiscalOperationType,
} from "./operation-guards";
import type {
  FiscalOperationBuildInput,
  FiscalOperationDecision,
  FiscalOperationDraft,
} from "./types";

function nowIso(now: Date | string = new Date()): string {
  return typeof now === "string" ? now : now.toISOString();
}

export function buildFiscalOperationDraft(
  input: FiscalOperationBuildInput,
): FiscalOperationDraft {
  const operationType = normalizeFiscalOperationType(input.operationType);
  const environment = normalizeFiscalEnvironment(input.environment);
  const expectedDocumentVersion = assertExpectedDocumentVersionExists(
    input.expectedDocumentVersion,
  );

  assertDocumentIsEligibleForFiscalOperation(input.serverDocument);
  const documentSnapshotHash = assertSnapshotHashExists(input.serverDocument);
  assertIssuerAndNumSerieExist(input.serverDocument);
  assertIssueDateExists(input.serverDocument);

  const invoiceIdentity = buildFiscalInvoiceIdentity(
    input.serverDocument,
    environment,
  );
  const idempotencyKey = buildFiscalOperationIdempotencyKey({
    userId: input.serverDocument.userId,
    serverDocumentId: input.serverDocument.id,
    operationType,
    invoiceIdentity,
    expectedDocumentVersion,
    documentSnapshotHash,
  });

  return {
    userId: input.serverDocument.userId,
    serverDocumentId: input.serverDocument.id,
    operationType,
    environment,
    invoiceIdentity,
    idempotencyKey,
    requestedBy: input.requestedBy,
    requestedAt: nowIso(input.requestedAt),
    expectedDocumentVersion,
    documentSnapshotHash,
    status: "requested",
    authority: "server_document",
  };
}

export function decideFiscalOperationDraft(
  input: FiscalOperationBuildInput,
): FiscalOperationDecision {
  try {
    return {
      status: "accepted",
      operation: buildFiscalOperationDraft(input),
    };
  } catch (error) {
    if (error instanceof FiscalOperationError) {
      return {
        status: "rejected",
        reason: error.reason,
        message: error.message,
      };
    }

    throw error;
  }
}
