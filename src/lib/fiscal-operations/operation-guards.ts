import { FiscalOperationError } from "./errors";
import type {
  FiscalEnvironment,
  FiscalOperationType,
} from "./types";
import type { ServerDocumentRecord } from "@/lib/server-documents/types";

const SUPPORTED_OPERATION_TYPES = new Set<FiscalOperationType>([
  "alta_inicial",
  "alta_subsanacion",
  "anulacion",
]);

function nonEmpty(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function normalizeFiscalEnvironment(
  environment: FiscalEnvironment | string,
): FiscalEnvironment {
  const normalized = environment.trim().toLowerCase();

  if (normalized === "test" || normalized === "production") {
    return normalized;
  }

  throw new FiscalOperationError("INVALID_ENVIRONMENT");
}

export function normalizeFiscalOperationType(
  operationType: FiscalOperationType | string,
): FiscalOperationType {
  if (SUPPORTED_OPERATION_TYPES.has(operationType as FiscalOperationType)) {
    return operationType as FiscalOperationType;
  }

  throw new FiscalOperationError("UNSUPPORTED_OPERATION");
}

export function assertDocumentIsEligibleForFiscalOperation(
  document: ServerDocumentRecord,
): void {
  if (
    document.documentType !== "factura" ||
    document.documentLifecycle === "draft" ||
    document.integrityLock !== "locked"
  ) {
    throw new FiscalOperationError("DOCUMENT_NOT_ELIGIBLE");
  }
}

export function assertSnapshotHashExists(
  document: ServerDocumentRecord,
): string {
  const snapshotHash = nonEmpty(document.snapshotHash);

  if (!snapshotHash) {
    throw new FiscalOperationError("SNAPSHOT_HASH_MISSING");
  }

  return snapshotHash;
}

export function assertIssuerAndNumSerieExist(
  document: ServerDocumentRecord,
): { issuerNif: string; numserie: string } {
  const issuerNif = nonEmpty(document.issuerNif);
  if (!issuerNif) {
    throw new FiscalOperationError("ISSUER_NIF_MISSING");
  }

  const numserie = nonEmpty(document.numserie);
  if (!numserie) {
    throw new FiscalOperationError("NUMSERIE_MISSING");
  }

  return { issuerNif, numserie };
}

export function assertIssueDateExists(
  document: ServerDocumentRecord,
): string {
  const issueDate = nonEmpty(document.issueDate);

  if (!issueDate) {
    throw new FiscalOperationError("ISSUE_DATE_MISSING");
  }

  return issueDate;
}

export function assertExpectedDocumentVersionExists(
  expectedDocumentVersion: number | undefined,
): number {
  if (
    typeof expectedDocumentVersion !== "number" ||
    !Number.isInteger(expectedDocumentVersion) ||
    expectedDocumentVersion < 1
  ) {
    throw new FiscalOperationError("EXPECTED_DOCUMENT_VERSION_MISSING");
  }

  return expectedDocumentVersion;
}
