import {
  FISCAL_PAYLOAD_CANDIDATE_XML_MARKER,
  type FiscalPayloadCandidate,
} from "@/lib/fiscal-payload-candidate";
import { fiscalPayloadValidationErrorMessage } from "./errors";
import type {
  FiscalPayloadValidationIssue,
  FiscalPayloadValidationResult,
} from "./types";
import type { FiscalPayloadValidationErrorCode } from "./errors";

assertServerOnlyModule();

const NORMALIZED_SHA256_REGEX = /^sha256:[a-f0-9]{64}$/;

const FORBIDDEN_PATTERNS: ReadonlyArray<{
  code: FiscalPayloadValidationErrorCode;
  regex: RegExp;
}> = [
  {
    code: "signature_detected",
    regex: /<\s*(?:ds:)?Signature\b|SignatureValue|SignedInfo|SignedXml/i,
  },
  {
    code: "certificate_detected",
    regex:
      /BEGIN CERTIFICATE|BEGIN PRIVATE KEY|X509Certificate|private_key|cert_pem|pfx|pkcs12/i,
  },
  {
    code: "aeat_endpoint_detected",
    regex: /agenciatributaria|suministro(?:lr)?facturas|<\s*Suministro/i,
  },
  {
    code: "transport_metadata_detected",
    regex:
      /fiscal_transport_attempts|transportAttempt|transportStatus|transportEndpoint|aeatTransport|endpointUrl/i,
  },
  {
    code: "secret_detected",
    regex: /service_role|sb_secret_|sk-proj|Authorization|Bearer\s+|api[_-]?key|token/i,
  },
  {
    code: "document_snapshot_detected",
    regex:
      /documentSnapshot|document_snapshot|pdf_snapshot|payloadDocument|payload_document|snapshotPayload/i,
  },
];

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El validador semantico de payload fiscal solo puede cargarse en servidor.",
    );
  }
}

function checkedAt(value: Date | string | undefined): string {
  if (!value) return new Date().toISOString();
  return typeof value === "string" ? value : value.toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function textField(
  payload: Record<string, unknown>,
  key: string,
): string | null {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function addError(
  errors: FiscalPayloadValidationIssue[],
  code: FiscalPayloadValidationErrorCode,
  path?: string,
) {
  errors.push({
    code,
    message: fiscalPayloadValidationErrorMessage(code),
    path,
  });
}

function validateRequiredText(
  errors: FiscalPayloadValidationIssue[],
  payload: Record<string, unknown>,
  key: string,
  code: FiscalPayloadValidationErrorCode,
) {
  if (!textField(payload, key)) addError(errors, code, key);
}

function scanForbiddenContent(
  errors: FiscalPayloadValidationIssue[],
  payload: Record<string, unknown>,
) {
  const serialized = JSON.stringify(payload);
  for (const { code, regex } of FORBIDDEN_PATTERNS) {
    if (regex.test(serialized)) addError(errors, code);
  }
}

function validateCandidateXml(
  errors: FiscalPayloadValidationIssue[],
  payload: Record<string, unknown>,
) {
  const candidateXml = payload.candidateXml;
  if (candidateXml === undefined || candidateXml === null) return;
  if (
    typeof candidateXml !== "string" ||
    !candidateXml.includes(FISCAL_PAYLOAD_CANDIDATE_XML_MARKER) ||
    !candidateXml.includes("candidate_not_aeat")
  ) {
    addError(errors, "candidate_xml_unmarked", "candidateXml");
  }
}

function validateHashes(
  errors: FiscalPayloadValidationIssue[],
  payload: Record<string, unknown>,
) {
  const recordHash = textField(payload, "recordHash");
  if (!recordHash) {
    addError(errors, "record_hash_missing", "recordHash");
  } else if (!NORMALIZED_SHA256_REGEX.test(recordHash)) {
    addError(errors, "record_hash_not_normalized", "recordHash");
  }

  const sequence = payload.recordSequence;
  if (!Number.isInteger(sequence) || Number(sequence) < 1) {
    addError(errors, "record_sequence_invalid", "recordSequence");
    return;
  }

  const previousHash = payload.previousHash;
  const previousRecordId = payload.previousRecordId;
  if (sequence === 1) {
    if (previousHash !== null || previousRecordId !== null) {
      addError(errors, "first_record_previous_hash_present", "previousHash");
    }
    return;
  }

  if (typeof previousHash !== "string" || !previousHash.trim()) {
    addError(errors, "previous_hash_missing", "previousHash");
  } else if (!NORMALIZED_SHA256_REGEX.test(previousHash.trim())) {
    addError(errors, "previous_hash_not_normalized", "previousHash");
  }
}

export function validateFiscalPayloadCandidate(
  payload: unknown,
  options: { checkedAt?: Date | string } = {},
): FiscalPayloadValidationResult {
  const errors: FiscalPayloadValidationIssue[] = [];
  const warnings: string[] = [];
  const timestamp = checkedAt(options.checkedAt);

  if (!isRecord(payload)) {
    addError(errors, "payload_missing");
    return {
      status: "rejected",
      errors,
      warnings,
      checkedAt: timestamp,
    };
  }

  validateRequiredText(errors, payload, "issuerNif", "issuer_nif_missing");
  validateRequiredText(errors, payload, "numserie", "numserie_missing");
  validateRequiredText(
    errors,
    payload,
    "fechaExpedicion",
    "fecha_expedicion_missing",
  );
  validateRequiredText(errors, payload, "environment", "environment_missing");
  validateRequiredText(errors, payload, "recordId", "record_id_missing");
  validateRequiredText(errors, payload, "operationId", "operation_id_missing");

  if (payload.recordType !== "alta" && payload.recordType !== "anulacion") {
    addError(errors, "record_type_invalid", "recordType");
  }

  validateHashes(errors, payload);

  if (payload.finality !== "candidate_not_aeat") {
    addError(errors, "finality_invalid", "finality");
  }
  if (payload.transportable !== false) {
    addError(errors, "transportable_invalid", "transportable");
  }

  validateCandidateXml(errors, payload);
  scanForbiddenContent(errors, payload);

  if (errors.length > 0) {
    return {
      status: "rejected",
      errors,
      warnings,
      checkedAt: timestamp,
    };
  }

  return {
    status: "valid",
    payload: payload as unknown as FiscalPayloadCandidate,
    errors: [],
    warnings,
    checkedAt: timestamp,
  };
}
