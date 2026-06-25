import { createHash } from "node:crypto";
import { FiscalChainError } from "./errors";
import type {
  FiscalChainLinkBuildInput,
  FiscalChainLinkCandidate,
  FiscalHashAlgorithmCandidate,
  FiscalHashInputBuildInput,
  FiscalHashInputCandidate,
} from "./types";

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El builder de cadena fiscal candidata solo puede cargarse en servidor.",
    );
  }
}

assertServerOnlyModule();

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

function requiredText(
  value: string | null | undefined,
  reason: ConstructorParameters<typeof FiscalChainError>[0],
): string {
  const normalized = value?.trim();
  if (!normalized) throw new FiscalChainError(reason);
  return normalized;
}

function normalizePreviousHash(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.toLowerCase();
  if (trimmed !== normalized || !/^sha256:[a-f0-9]{64}$/.test(normalized)) {
    throw new FiscalChainError("previous_hash_not_normalized");
  }
  return normalized;
}

export function normalizeFiscalHashAlgorithmCandidate(
  value: string | null | undefined = "sha256-candidate",
): FiscalHashAlgorithmCandidate {
  const normalized = value?.trim().toLowerCase();
  if (!normalized || normalized === "sha256-candidate") {
    return "sha256-candidate";
  }
  throw new FiscalChainError("unsupported_hash_algorithm");
}

export function assertPreviousHashConsistency(input: {
  previousRecordId?: string | null;
  previousHash?: string | null;
}): string | null {
  const previousRecordId = input.previousRecordId?.trim() || null;
  const previousHash = normalizePreviousHash(input.previousHash);

  if (previousRecordId && !previousHash) {
    throw new FiscalChainError("previous_hash_missing");
  }

  return previousHash;
}

export function buildFiscalHashInputCandidate(
  input: FiscalHashInputBuildInput,
): {
  input: FiscalHashInputCandidate;
  canonicalInput: string;
} {
  const previousRecordId = input.previousRecordId?.trim() || null;
  const previousHash = assertPreviousHashConsistency(input);
  const hashAlgorithmCandidate = normalizeFiscalHashAlgorithmCandidate(
    input.hashAlgorithmCandidate,
  );
  const recordTimestampCandidate = requiredText(
    input.record.recordTimestampCandidate,
    "record_timestamp_missing",
  );

  const hashInput: FiscalHashInputCandidate = {
    marker: "PHASE2B4K_HASH_INPUT_CANDIDATE",
    issuerNif: requiredText(input.record.issuerNif, "issuer_nif_missing"),
    environment: requiredText(input.record.environment, "environment_missing") as
      | "test"
      | "production",
    recordTypeCandidate: requiredText(
      input.record.recordTypeCandidate,
      "record_type_missing",
    ) as FiscalHashInputCandidate["recordTypeCandidate"],
    numserie: requiredText(input.record.numserie, "numserie_missing"),
    fechaExpedicion: requiredText(
      input.record.fechaExpedicion,
      "fecha_expedicion_missing",
    ),
    operationId: requiredText(input.record.operationId, "operation_id_missing"),
    documentSnapshotHash: requiredText(
      input.record.documentSnapshotHash,
      "document_snapshot_hash_missing",
    ),
    recordTimestampCandidate,
    previousRecordId,
    previousHash,
    hashAlgorithmCandidate,
  };

  return {
    input: hashInput,
    canonicalInput: stableStringify(hashInput),
  };
}

export function buildFiscalChainLinkCandidate(
  input: FiscalChainLinkBuildInput,
): FiscalChainLinkCandidate {
  const { input: hashInput, canonicalInput } =
    buildFiscalHashInputCandidate(input);
  const digest = createHash("sha256").update(canonicalInput).digest("hex");

  return {
    candidate: true,
    finality: "candidate_not_final",
    operationId: hashInput.operationId,
    recordTypeCandidate: hashInput.recordTypeCandidate,
    previousRecordId: hashInput.previousRecordId,
    previousHash: hashInput.previousHash,
    hashAlgorithmCandidate: hashInput.hashAlgorithmCandidate,
    canonicalHashInput: canonicalInput,
    technicalHashCandidate: `candidate_not_final:sha256:${digest}`,
  };
}
