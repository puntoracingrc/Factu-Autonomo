import { FiscalRecordMaterialError } from "./errors";
import type {
  FiscalRecordMaterialCandidate,
  FiscalRecordMaterialDryRunInput,
  FiscalRecordMaterialHashInputCandidate,
} from "./types";

export const FISCAL_RECORD_MATERIAL_DRY_RUN_SCHEMA_VERSION =
  "phase2b4g-dry-run-v1";

function defaultNow(): string {
  return new Date().toISOString();
}

function isoDateTime(value: Date | string | undefined): string {
  if (!value) return defaultNow();
  return typeof value === "string" ? value : value.toISOString();
}

function requiredText(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`)
    .join(",")}}`;
}

export function buildFiscalRecordMaterialDryRun(
  input: FiscalRecordMaterialDryRunInput,
): FiscalRecordMaterialCandidate {
  const { operation, invoiceIdentity, serverDocument } = input;

  if (operation.status !== "processing") {
    throw new FiscalRecordMaterialError("OPERATION_NOT_PROCESSING");
  }

  if (!invoiceIdentity) {
    throw new FiscalRecordMaterialError("INVOICE_IDENTITY_MISSING");
  }

  const documentSnapshotHash = requiredText(operation.documentSnapshotHash);
  if (!documentSnapshotHash) {
    throw new FiscalRecordMaterialError("SNAPSHOT_HASH_MISSING");
  }

  const issuerNif = requiredText(invoiceIdentity.issuerNif);
  if (!issuerNif) {
    throw new FiscalRecordMaterialError("ISSUER_NIF_MISSING");
  }

  const numserie = requiredText(invoiceIdentity.numserie);
  if (!numserie) {
    throw new FiscalRecordMaterialError("NUMSERIE_MISSING");
  }

  const fechaExpedicion = requiredText(invoiceIdentity.fechaExpedicion);
  if (!fechaExpedicion) {
    throw new FiscalRecordMaterialError("FECHA_EXPEDICION_MISSING");
  }

  const pdfContentHash =
    requiredText(serverDocument?.pdfContentHash) ??
    null;
  const hashInputCandidate: FiscalRecordMaterialHashInputCandidate = {
    marker: "PHASE2B4G_DRY_RUN_CANDIDATE",
    operationId: operation.id,
    invoiceIdentityId: invoiceIdentity.id,
    serverDocumentId: operation.serverDocumentId,
    operationType: operation.operationType,
    recordTypeCandidate: operation.operationType,
    environment: operation.environment,
    issuerNif,
    numserie,
    fechaExpedicion,
    documentSnapshotHash,
    pdfContentHash,
    schemaVersionCandidate: FISCAL_RECORD_MATERIAL_DRY_RUN_SCHEMA_VERSION,
  };

  return {
    dryRun: true,
    finality: "preliminary_not_aeat",
    operationId: operation.id,
    invoiceIdentityId: invoiceIdentity.id,
    serverDocumentId: operation.serverDocumentId,
    operationType: operation.operationType,
    recordTypeCandidate: operation.operationType,
    issuerNif,
    numserie,
    fechaExpedicion,
    documentSnapshotHash,
    pdfContentHash,
    schemaVersionCandidate: FISCAL_RECORD_MATERIAL_DRY_RUN_SCHEMA_VERSION,
    hashInputCandidate: stableStringify(hashInputCandidate),
    createdAtCandidate: isoDateTime(input.createdAt),
  };
}
