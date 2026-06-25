import { FiscalOperationError } from "./errors";
import { buildFiscalOperationDraft } from "./operation-builder";
import {
  normalizeFiscalEnvironment,
  normalizeFiscalOperationType,
} from "./operation-guards";
import { FiscalOperationTransactionError } from "./transaction-errors";
import type {
  FiscalOperationTransactionInput,
  FiscalOperationTransactionOptions,
  FiscalOperationTransactionPlan,
  FiscalOperationTransactionResult,
  FiscalOperationTransactionScope,
  FiscalOperationTransactionStore,
} from "./transaction-types";
import type {
  FiscalInvoiceIdentityRecord,
  FiscalOperationRecord,
} from "./types";
import type { ServerDocumentRecord } from "@/lib/server-documents/types";

type OperationCreationOutcome =
  | { status: "created"; operation: FiscalOperationRecord }
  | { status: "existing"; operation: FiscalOperationRecord };

function nowIso(now: Date | string | undefined, fallback: () => string): string {
  if (!now) return fallback();
  return typeof now === "string" ? now : now.toISOString();
}

function defaultNow(): string {
  return new Date().toISOString();
}

function mapFiscalOperationReason(
  error: FiscalOperationError,
): FiscalOperationTransactionError["reason"] {
  switch (error.reason) {
    case "expected_document_version_missing":
      return "missing_expected_document_version";
    case "document_not_eligible":
    case "snapshot_hash_missing":
    case "issuer_nif_missing":
    case "numserie_missing":
    case "issue_date_missing":
    case "unsupported_operation":
    case "invalid_environment":
      return error.reason;
  }
}

function isRaceError(error: unknown, code: "23505" | string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "causeCode" in error &&
    (error as { causeCode?: unknown }).causeCode === code
  );
}

function resultRejected(
  error: FiscalOperationTransactionError,
): FiscalOperationTransactionResult {
  return {
    status: "rejected",
    reason: error.reason,
    message: error.message,
  };
}

export function validateFiscalOperationTransactionInput(
  input: FiscalOperationTransactionInput,
): void {
  if (
    !Number.isInteger(input.expectedDocumentVersion) ||
    (input.expectedDocumentVersion ?? 0) < 1
  ) {
    throw new FiscalOperationTransactionError(
      "missing_expected_document_version",
    );
  }
}

export function assertExpectedDocumentVersionForFiscalOperation(
  document: ServerDocumentRecord,
  expectedDocumentVersion: number,
): void {
  if (document.version !== expectedDocumentVersion) {
    throw new FiscalOperationTransactionError("document_version_conflict");
  }
}

export function buildFiscalOperationTransactionPlan(
  input: FiscalOperationTransactionInput,
): FiscalOperationTransactionPlan {
  validateFiscalOperationTransactionInput(input);
  const operationType = normalizeFiscalOperationType(input.operationType);
  const environment = normalizeFiscalEnvironment(input.environment);

  return {
    userId: input.userId,
    serverDocumentId: input.serverDocumentId,
    operationType,
    environment,
    expectedDocumentVersion: input.expectedDocumentVersion ?? 0,
    idempotencyKey: input.idempotencyKey ?? "",
    requestedBy: input.requestedBy,
    requestedAt: input.requestedAt,
  };
}

async function ensureInvoiceIdentity(
  transaction: FiscalOperationTransactionScope,
  draft: ReturnType<typeof buildFiscalOperationDraft>,
): Promise<FiscalInvoiceIdentityRecord> {
  const existing = await transaction.findInvoiceIdentity(
    draft.userId,
    draft.environment,
    draft.invoiceIdentity.issuerNif,
    draft.invoiceIdentity.numserie,
    draft.invoiceIdentity.fechaExpedicion,
  );
  if (existing) return existing;

  try {
    return await transaction.createInvoiceIdentity({
      userId: draft.userId,
      serverDocumentId: draft.serverDocumentId,
      environment: draft.invoiceIdentity.environment,
      issuerNif: draft.invoiceIdentity.issuerNif,
      numserie: draft.invoiceIdentity.numserie,
      fechaExpedicion: draft.invoiceIdentity.fechaExpedicion,
    });
  } catch (error) {
    if (isRaceError(error, "23505")) {
      const raced = await transaction.findInvoiceIdentity(
        draft.userId,
        draft.environment,
        draft.invoiceIdentity.issuerNif,
        draft.invoiceIdentity.numserie,
        draft.invoiceIdentity.fechaExpedicion,
      );
      if (raced) return raced;
      throw new FiscalOperationTransactionError("identity_race");
    }
    throw error;
  }
}

async function createOperation(
  transaction: FiscalOperationTransactionScope,
  draft: ReturnType<typeof buildFiscalOperationDraft>,
): Promise<OperationCreationOutcome> {
  try {
    return {
      status: "created",
      operation: await transaction.createFiscalOperation({
        userId: draft.userId,
        serverDocumentId: draft.serverDocumentId,
        operationType: draft.operationType,
        environment: draft.environment,
        idempotencyKey: draft.idempotencyKey,
        requestedBy: draft.requestedBy,
        requestedAt: draft.requestedAt,
        expectedDocumentVersion: draft.expectedDocumentVersion,
        documentSnapshotHash: draft.documentSnapshotHash,
        status: "requested",
        completedAt: null,
        failedAt: null,
        failureCode: null,
        failureMessage: null,
      }),
    };
  } catch (error) {
    if (isRaceError(error, "23505")) {
      const existing = await transaction.findOperationByIdempotencyKey(
        draft.userId,
        draft.idempotencyKey,
      );
      if (existing) {
        return {
          status: "existing",
          operation: existing,
        };
      }
      throw new FiscalOperationTransactionError("operation_race");
    }
    throw error;
  }
}

export async function resolveFiscalOperationReservation(
  transaction: FiscalOperationTransactionScope,
  document: ServerDocumentRecord,
  input: FiscalOperationTransactionInput,
  options: FiscalOperationTransactionOptions = {},
): Promise<FiscalOperationTransactionResult> {
  assertExpectedDocumentVersionForFiscalOperation(
    document,
    input.expectedDocumentVersion ?? 0,
  );

  const draft = buildFiscalOperationDraft({
    serverDocument: document,
    operationType: input.operationType,
    environment: input.environment,
    expectedDocumentVersion: input.expectedDocumentVersion,
    requestedBy: input.requestedBy,
    requestedAt: nowIso(input.requestedAt, options.now ?? defaultNow),
  });
  const idempotencyKey = input.idempotencyKey || draft.idempotencyKey;
  const existing = await transaction.findOperationByIdempotencyKey(
    input.userId,
    idempotencyKey,
  );

  if (existing) {
    return {
      status: "existing",
      operation: existing,
      invoiceIdentity: null,
      atomicity: "simulated_local",
    };
  }

  const effectiveDraft = {
    ...draft,
    idempotencyKey,
  };
  const invoiceIdentity = await ensureInvoiceIdentity(
    transaction,
    effectiveDraft,
  );
  const operationOutcome = await createOperation(transaction, effectiveDraft);

  if (operationOutcome.status === "existing") {
    return {
      status: "existing",
      operation: operationOutcome.operation,
      invoiceIdentity,
      atomicity: "simulated_local",
    };
  }

  return {
    status: "created",
    operation: operationOutcome.operation,
    invoiceIdentity,
    atomicity: "simulated_local",
  };
}

export function classifyFiscalOperationTransactionResult(
  result: FiscalOperationTransactionResult,
): FiscalOperationTransactionResult["status"] {
  return result.status;
}

export async function executeFiscalOperationTransactionContract(
  store: FiscalOperationTransactionStore,
  input: FiscalOperationTransactionInput,
  options: FiscalOperationTransactionOptions = {},
): Promise<FiscalOperationTransactionResult> {
  try {
    validateFiscalOperationTransactionInput(input);

    return await store.withFiscalOperationTransaction(async (transaction) => {
      const document = await transaction.findServerDocumentForFiscalOperation(
        input.userId,
        input.serverDocumentId,
      );

      if (!document) {
        return resultRejected(
          new FiscalOperationTransactionError("document_not_found"),
        );
      }

      return resolveFiscalOperationReservation(
        transaction,
        document,
        input,
        options,
      );
    });
  } catch (error) {
    if (error instanceof FiscalOperationTransactionError) {
      if (
        error.reason === "document_version_conflict" ||
        error.reason === "operation_race" ||
        error.reason === "identity_race"
      ) {
        return {
          status: "conflict",
          reason: error.reason,
          message: error.message,
        };
      }
      return resultRejected(error);
    }

    if (error instanceof FiscalOperationError) {
      return resultRejected(
        new FiscalOperationTransactionError(mapFiscalOperationReason(error)),
      );
    }

    throw error;
  }
}
