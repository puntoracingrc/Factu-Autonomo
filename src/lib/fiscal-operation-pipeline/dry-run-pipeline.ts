import { buildFiscalRecordMaterialDryRun } from "@/lib/fiscal-record-material";
import { FiscalRecordMaterialError } from "@/lib/fiscal-record-material/errors";
import {
  buildFiscalOperationTransactionPlan,
  validateFiscalOperationTransactionInput,
} from "@/lib/fiscal-operations/transaction-contract";
import {
  normalizeFiscalEnvironment,
  normalizeFiscalOperationType,
} from "@/lib/fiscal-operations/operation-guards";
import { FiscalOperationTransactionError } from "@/lib/fiscal-operations/transaction-errors";
import type { FiscalInvoiceIdentityRecord } from "@/lib/fiscal-operations/types";
import type { ServerDocumentRecord } from "@/lib/server-documents/types";
import { FiscalOperationDryRunPipelineError } from "./errors";
import type {
  FiscalOperationDryRunLookupStore,
  FiscalOperationDryRunMaterialSummary,
  FiscalOperationDryRunPipelineDependencies,
  FiscalOperationDryRunPipelineInput,
  FiscalOperationDryRunPipelineRejectionReason,
  FiscalOperationDryRunPipelineResult,
  FiscalOperationDryRunPlan,
} from "./types";

assertServerOnlyModule();

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error("El pipeline fiscal dry-run solo puede cargarse en servidor.");
  }
}

function rejected(
  reason: FiscalOperationDryRunPipelineRejectionReason,
  message: string,
  context: {
    operationId?: string;
    serverDocumentId?: string;
  } = {},
): FiscalOperationDryRunPipelineResult {
  return {
    status: "rejected",
    reason,
    message,
    operationId: context.operationId,
    serverDocumentId: context.serverDocumentId,
    dryRun: true,
  };
}

function summarizeMaterial(
  material: ReturnType<typeof buildFiscalRecordMaterialDryRun>,
): FiscalOperationDryRunMaterialSummary {
  return {
    operationId: material.operationId,
    invoiceIdentityId: material.invoiceIdentityId,
    serverDocumentId: material.serverDocumentId,
    operationType: material.operationType,
    dryRun: true,
    finality: material.finality,
    schemaVersionCandidate: material.schemaVersionCandidate,
    documentSnapshotHashPresent: material.documentSnapshotHash.length > 0,
    pdfContentHashPresent: Boolean(material.pdfContentHash),
    hashInputCandidateLength: material.hashInputCandidate.length,
  };
}

export function assertDryRunPipelineInput(
  input: FiscalOperationDryRunPipelineInput,
): void {
  try {
    validateFiscalOperationTransactionInput(input);
    normalizeFiscalOperationType(input.operationType);
    normalizeFiscalEnvironment(input.environment);
  } catch (error) {
    if (error instanceof FiscalOperationTransactionError) throw error;
    throw new FiscalOperationDryRunPipelineError("PIPELINE_INPUT_INVALID");
  }
}

export function buildFiscalOperationDryRunPlan(
  input: FiscalOperationDryRunPipelineInput,
): FiscalOperationDryRunPlan {
  assertDryRunPipelineInput(input);
  const plan = buildFiscalOperationTransactionPlan(input);

  return {
    userId: plan.userId,
    serverDocumentId: plan.serverDocumentId,
    operationType: plan.operationType,
    environment: plan.environment,
    expectedDocumentVersion: plan.expectedDocumentVersion,
    requestedBy: plan.requestedBy,
    dryRun: true,
  };
}

async function resolveMaterialInputs(
  lookupStore: FiscalOperationDryRunLookupStore,
  input: FiscalOperationDryRunPipelineInput,
  reservationIdentity: FiscalInvoiceIdentityRecord | null | undefined,
  operation: Parameters<typeof buildFiscalRecordMaterialDryRun>[0]["operation"],
): Promise<{
  serverDocument: Pick<
    ServerDocumentRecord,
    "id" | "snapshotHash" | "pdfContentHash"
  >;
  invoiceIdentity: FiscalInvoiceIdentityRecord | null;
}> {
  const serverDocument = await lookupStore.findServerDocumentForFiscalOperation(
    input.userId,
    input.serverDocumentId,
  );
  if (!serverDocument) {
    throw new FiscalOperationDryRunPipelineError("MATERIAL_DOCUMENT_NOT_FOUND");
  }

  const invoiceIdentity =
    reservationIdentity ??
    (await lookupStore.findInvoiceIdentityForMaterial({
      operation,
      serverDocument,
    }));
  if (!invoiceIdentity) {
    throw new FiscalOperationDryRunPipelineError("MATERIAL_IDENTITY_NOT_FOUND");
  }

  return { serverDocument, invoiceIdentity };
}

export function classifyDryRunPipelineResult(
  result: FiscalOperationDryRunPipelineResult,
): FiscalOperationDryRunPipelineResult["status"] {
  return result.status;
}

export async function runFiscalOperationDryRunPipeline(
  input: FiscalOperationDryRunPipelineInput,
  dependencies: FiscalOperationDryRunPipelineDependencies,
): Promise<FiscalOperationDryRunPipelineResult> {
  try {
    assertDryRunPipelineInput(input);
  } catch (error) {
    if (error instanceof FiscalOperationTransactionError) {
      return rejected(error.reason, error.message, {
        serverDocumentId: input.serverDocumentId,
      });
    }
    throw error;
  }

  const reservation = await dependencies.reservationStore.reserveFiscalOperation(
    input,
  );

  if (reservation.status === "rejected") {
    return {
      status: "rejected",
      reason: reservation.reason,
      message: reservation.message,
      serverDocumentId: input.serverDocumentId,
      dryRun: true,
    };
  }

  if (reservation.status === "conflict") {
    return {
      status: "conflict",
      reason: reservation.reason,
      message: reservation.message,
      dryRun: true,
    };
  }

  const processing =
    await dependencies.processingStore.markFiscalOperationProcessing({
      userId: input.userId,
      operationId: reservation.operation.id,
      markedAt: input.processingAt,
    });

  if (processing.status === "rejected") {
    return {
      status: "rejected",
      reason: processing.reason,
      message: processing.message,
      operationId: processing.operation?.id ?? reservation.operation.id,
      serverDocumentId: reservation.operation.serverDocumentId,
      dryRun: true,
    };
  }

  if (processing.status === "conflict") {
    return {
      status: "conflict",
      reason: "operation_processing_race",
      message: processing.message,
      dryRun: true,
    };
  }

  try {
    const { serverDocument, invoiceIdentity } = await resolveMaterialInputs(
      dependencies.lookupStore,
      input,
      reservation.invoiceIdentity,
      processing.operation,
    );
    const material = buildFiscalRecordMaterialDryRun({
      operation: processing.operation,
      invoiceIdentity,
      serverDocument,
      createdAt: input.materialCreatedAt,
    });
    const summary = summarizeMaterial(material);

    return {
      status: "material_built",
      reservation: reservation.status === "created" ? "reserved" : "existing",
      processing: processing.status,
      operationId: processing.operation.id,
      invoiceIdentityId: summary.invoiceIdentityId,
      serverDocumentId: processing.operation.serverDocumentId,
      operationType: processing.operation.operationType,
      dryRun: true,
      material: summary,
    };
  } catch (error) {
    if (error instanceof FiscalOperationDryRunPipelineError) {
      if (error.code === "MATERIAL_DOCUMENT_NOT_FOUND") {
        return rejected("material_document_not_found", error.message, {
          operationId: processing.operation.id,
          serverDocumentId: processing.operation.serverDocumentId,
        });
      }
      if (error.code === "MATERIAL_IDENTITY_NOT_FOUND") {
        return rejected("material_identity_not_found", error.message, {
          operationId: processing.operation.id,
          serverDocumentId: processing.operation.serverDocumentId,
        });
      }
    }

    if (error instanceof FiscalRecordMaterialError) {
      const message = new FiscalOperationDryRunPipelineError(
        "MATERIAL_BUILD_FAILED",
        error.message,
      ).message;
      return rejected("material_build_failed", message, {
        operationId: processing.operation.id,
        serverDocumentId: processing.operation.serverDocumentId,
      });
    }

    throw error;
  }
}
