import type {
  FiscalInvoiceIdentity,
  FiscalOperationType,
} from "./types";

interface FiscalOperationIdempotencyInput {
  userId: string;
  serverDocumentId: string;
  operationType: FiscalOperationType;
  invoiceIdentity: FiscalInvoiceIdentity;
  expectedDocumentVersion: number;
  documentSnapshotHash: string;
}

type JsonRecord = Record<string, unknown>;

function stableNormalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableNormalize);
  }

  if (value && typeof value === "object") {
    const record = value as JsonRecord;
    return Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort()
      .reduce<JsonRecord>((acc, key) => {
        acc[key] = stableNormalize(record[key]);
        return acc;
      }, {});
  }

  return value;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(stableNormalize(value));
}

function hashStableValue(value: unknown): string {
  const input = stableStringify(value);
  let hash = 0x811c9dc5;

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function buildFiscalOperationIdempotencyKey(
  input: FiscalOperationIdempotencyInput,
): string {
  return `fiscal-operation-v1:${hashStableValue({
    documentSnapshotHash: input.documentSnapshotHash,
    expectedDocumentVersion: input.expectedDocumentVersion,
    invoiceIdentity: input.invoiceIdentity,
    operationType: input.operationType,
    serverDocumentId: input.serverDocumentId,
    userId: input.userId,
  })}`;
}
