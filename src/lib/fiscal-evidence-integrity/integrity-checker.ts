import {
  FISCAL_EVIDENCE_INTEGRITY_PHASE_MARKER,
  FISCAL_EVIDENCE_PERSISTENCE_PHASE_MARKER,
  type FiscalEvidenceIntegrityCheck,
  type FiscalEvidenceIntegrityEvidenceRecord,
  type FiscalEvidenceIntegrityEvidenceSummary,
  type FiscalEvidenceIntegrityFiscalRecord,
  type FiscalEvidenceIntegrityMetadataSummary,
  type FiscalEvidenceIntegrityMismatch,
  type FiscalEvidenceIntegrityReadInput,
  type FiscalEvidenceIntegrityRejectedResult,
  type FiscalEvidenceIntegrityResult,
  type FiscalEvidenceIntegrityStore,
  type FiscalEvidenceIntegrityUnsafeReason,
} from "./types";

assertServerOnlyModule();

const SHA256_DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/;
const SENSITIVE_METADATA_PATTERN =
  /candidateXml|candidate_xml|xml_payload|candidate_xml_payload|documentSnapshot|document_snapshot|pdf_snapshot|payloadDocument|payload_document|service_role|sb_secret|sk-proj|token|secret|BEGIN CERTIFICATE|BEGIN PRIVATE KEY|private_key|cert_pem|pfx|pkcs12|agenciatributaria|Suministro|fiscal_transport_attempts/i;

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El verificador de integridad de evidencia fiscal solo puede cargarse en servidor.",
    );
  }
}

function check(name: string, ok: boolean): FiscalEvidenceIntegrityCheck {
  return { name, ok };
}

function normalizedMetadata(
  value: unknown,
): FiscalEvidenceIntegrityMetadataSummary {
  const metadata = value as Record<string, unknown>;
  return {
    phase: FISCAL_EVIDENCE_PERSISTENCE_PHASE_MARKER,
    evidencePacketPhase:
      metadata.evidencePacketPhase ===
      "PHASE2B4P_Q_FISCAL_PAYLOAD_VALIDATION_EVIDENCE_V1"
        ? "PHASE2B4P_Q_FISCAL_PAYLOAD_VALIDATION_EVIDENCE_V1"
        : null,
    source:
      metadata.source === "local_staging_internal_evidence"
        ? "local_staging_internal_evidence"
        : null,
    includesFullXml: false,
    includesDocumentMaterial: false,
    signed: false,
    aeatReady: false,
    payloadXmlMarkerPresent:
      typeof metadata.payloadXmlMarkerPresent === "boolean"
        ? metadata.payloadXmlMarkerPresent
        : null,
  };
}

function summarizeEvidence(
  evidence: FiscalEvidenceIntegrityEvidenceRecord,
  includeMetadata: boolean,
): FiscalEvidenceIntegrityEvidenceSummary {
  return {
    id: evidence.id,
    userId: evidence.userId,
    environment: evidence.environment,
    recordId: evidence.recordId,
    operationId: evidence.operationId,
    recordSequence: evidence.recordSequence,
    recordHash: evidence.recordHash,
    previousHash: evidence.previousHash,
    payloadCandidateId: evidence.payloadCandidateId,
    payloadValidationStatus: evidence.payloadValidationStatus,
    xmlCandidateDigest: evidence.xmlCandidateDigest,
    evidenceFinality: evidence.evidenceFinality,
    transportable: evidence.transportable,
    createdAt: evidence.createdAt,
    ...(includeMetadata
      ? { metadata: normalizedMetadata(evidence.metadataSafe) }
      : {}),
  };
}

function unsafeMetadataReasons(value: unknown): FiscalEvidenceIntegrityUnsafeReason[] {
  const reasons: FiscalEvidenceIntegrityUnsafeReason[] = [];

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return ["metadata_not_object"];
  }

  const serialized = JSON.stringify(value);
  if (SENSITIVE_METADATA_PATTERN.test(serialized)) {
    reasons.push("metadata_sensitive_marker");
  }

  const metadata = value as Record<string, unknown>;
  if (metadata.phase !== FISCAL_EVIDENCE_PERSISTENCE_PHASE_MARKER) {
    reasons.push("metadata_phase_invalid");
  }

  if (
    metadata.includesFullXml !== false ||
    metadata.includesDocumentMaterial !== false ||
    metadata.signed !== false ||
    metadata.aeatReady !== false
  ) {
    reasons.push("metadata_flags_invalid");
  }

  return reasons;
}

function rejected(
  reason: FiscalEvidenceIntegrityRejectedResult["reason"],
  message: string,
  evidence?: FiscalEvidenceIntegrityEvidenceRecord,
  checks: readonly FiscalEvidenceIntegrityCheck[] = [],
): FiscalEvidenceIntegrityRejectedResult {
  return {
    phase: FISCAL_EVIDENCE_INTEGRITY_PHASE_MARKER,
    status: "rejected",
    reason,
    message,
    ...(evidence ? { evidence: summarizeEvidence(evidence, false) } : {}),
    checks,
  };
}

function controlFieldRejection(
  evidence: FiscalEvidenceIntegrityEvidenceRecord,
): FiscalEvidenceIntegrityRejectedResult | null {
  const checks = [
    check("payload_validation_status_valid", evidence.payloadValidationStatus === "valid"),
    check("transportable_false", evidence.transportable === false),
    check(
      "evidence_finality_internal_dry_run",
      evidence.evidenceFinality === "internal_dry_run_evidence",
    ),
    check("xml_candidate_digest_present", evidence.xmlCandidateDigest !== null),
    check(
      "xml_candidate_digest_sha256",
      evidence.xmlCandidateDigest !== null &&
        SHA256_DIGEST_PATTERN.test(evidence.xmlCandidateDigest),
    ),
  ];

  if (evidence.payloadValidationStatus !== "valid") {
    return rejected(
      "payload_validation_status_invalid",
      "La evidencia persistida no esta marcada como payload valid.",
      evidence,
      checks,
    );
  }
  if (evidence.transportable !== false) {
    return rejected(
      "transportable_not_false",
      "La evidencia persistida de lectura interna no puede ser transportable.",
      evidence,
      checks,
    );
  }
  if (evidence.evidenceFinality !== "internal_dry_run_evidence") {
    return rejected(
      "evidence_finality_invalid",
      "La evidencia persistida debe ser internal_dry_run_evidence.",
      evidence,
      checks,
    );
  }
  if (evidence.xmlCandidateDigest === null) {
    return rejected(
      "xml_candidate_digest_missing",
      "La evidencia persistida necesita digest del XML candidato, no XML completo.",
      evidence,
      checks,
    );
  }
  if (!SHA256_DIGEST_PATTERN.test(evidence.xmlCandidateDigest)) {
    return rejected(
      "xml_candidate_digest_invalid",
      "El digest del XML candidato no tiene formato sha256 valido.",
      evidence,
      checks,
    );
  }

  return null;
}

function compare(
  mismatches: FiscalEvidenceIntegrityMismatch[],
  field: FiscalEvidenceIntegrityMismatch["field"],
  source: FiscalEvidenceIntegrityMismatch["source"],
  evidenceValue: string | number | null,
  referenceValue: string | number | null,
): void {
  if (evidenceValue !== referenceValue) {
    mismatches.push({ field, source, evidenceValue, referenceValue });
  }
}

function recordMismatches(
  evidence: FiscalEvidenceIntegrityEvidenceRecord,
  record: FiscalEvidenceIntegrityFiscalRecord,
): FiscalEvidenceIntegrityMismatch[] {
  const mismatches: FiscalEvidenceIntegrityMismatch[] = [];
  compare(mismatches, "user_id", "fiscal_records", evidence.userId, record.userId);
  compare(
    mismatches,
    "environment",
    "fiscal_records",
    evidence.environment,
    record.environment,
  );
  compare(mismatches, "record_id", "fiscal_records", evidence.recordId, record.id);
  compare(
    mismatches,
    "operation_id",
    "fiscal_records",
    evidence.operationId,
    record.operationId,
  );
  compare(
    mismatches,
    "record_sequence",
    "fiscal_records",
    evidence.recordSequence,
    record.recordSequence,
  );
  compare(
    mismatches,
    "record_hash",
    "fiscal_records",
    evidence.recordHash,
    record.recordHash,
  );
  compare(
    mismatches,
    "previous_hash",
    "fiscal_records",
    evidence.previousHash,
    record.previousHash,
  );
  return mismatches;
}

function chainMismatches(
  record: FiscalEvidenceIntegrityFiscalRecord,
  chain: {
    userId: string;
    environment: string;
    issuerNif: string;
    recordCount: number;
    lastRecordId: string | null;
    lastHash: string | null;
  },
): FiscalEvidenceIntegrityMismatch[] {
  const mismatches: FiscalEvidenceIntegrityMismatch[] = [];
  compare(mismatches, "user_id", "fiscal_chain_state", record.userId, chain.userId);
  compare(
    mismatches,
    "environment",
    "fiscal_chain_state",
    record.environment,
    chain.environment,
  );
  compare(
    mismatches,
    "issuer_nif",
    "fiscal_chain_state",
    record.issuerNif,
    chain.issuerNif,
  );

  if (chain.recordCount < record.recordSequence) {
    mismatches.push({
      field: "chain_record_count",
      source: "fiscal_chain_state",
      evidenceValue: record.recordSequence,
      referenceValue: chain.recordCount,
    });
  }

  if (chain.recordCount === record.recordSequence) {
    compare(
      mismatches,
      "chain_last_record_id",
      "fiscal_chain_state",
      record.id,
      chain.lastRecordId,
    );
    compare(
      mismatches,
      "chain_last_hash",
      "fiscal_chain_state",
      record.recordHash,
      chain.lastHash,
    );
  }

  return mismatches;
}

export class FiscalEvidenceIntegrityChecker {
  constructor(private readonly store: FiscalEvidenceIntegrityStore) {}

  async readFiscalEvidenceIntegrity(
    input: FiscalEvidenceIntegrityReadInput,
  ): Promise<readonly FiscalEvidenceIntegrityResult[]> {
    if (!input.userId.trim()) {
      return [
        rejected(
          "user_id_missing",
          "La lectura de evidencia fiscal necesita user_id.",
        ),
      ];
    }

    const evidenceRows = await this.store.findEvidencePackets(input);
    if (evidenceRows.length === 0) {
      return [
        rejected(
          "evidence_not_found",
          "No existe evidencia fiscal persistida para los filtros solicitados.",
        ),
      ];
    }

    const results: FiscalEvidenceIntegrityResult[] = [];
    for (const evidence of evidenceRows) {
      results.push(await this.checkOne(evidence));
    }
    return results;
  }

  private async checkOne(
    evidence: FiscalEvidenceIntegrityEvidenceRecord,
  ): Promise<FiscalEvidenceIntegrityResult> {
    const controlRejection = controlFieldRejection(evidence);
    if (controlRejection) return controlRejection;

    const unsafeReasons = unsafeMetadataReasons(evidence.metadataSafe);
    const metadataChecks = [
      check("metadata_safe_object", unsafeReasons.length === 0),
    ];
    if (unsafeReasons.length > 0) {
      return {
        phase: FISCAL_EVIDENCE_INTEGRITY_PHASE_MARKER,
        status: "unsafe_metadata",
        evidence: summarizeEvidence(evidence, false),
        reasons: unsafeReasons,
        checks: metadataChecks,
      };
    }

    const record = await this.store.findFiscalRecord({
      userId: evidence.userId,
      recordId: evidence.recordId,
    });
    if (!record) {
      return {
        phase: FISCAL_EVIDENCE_INTEGRITY_PHASE_MARKER,
        status: "missing_record",
        evidence: summarizeEvidence(evidence, true),
        checks: [
          ...metadataChecks,
          check("fiscal_record_exists", false),
        ],
      };
    }

    const chain = await this.store.findFiscalChainState({
      userId: record.userId,
      environment: record.environment,
      issuerNif: record.issuerNif,
    });
    if (!chain) {
      return {
        phase: FISCAL_EVIDENCE_INTEGRITY_PHASE_MARKER,
        status: "missing_chain",
        evidence: summarizeEvidence(evidence, true),
        checks: [
          ...metadataChecks,
          check("fiscal_record_exists", true),
          check("fiscal_chain_state_exists", false),
        ],
      };
    }

    const mismatches = [
      ...recordMismatches(evidence, record),
      ...chainMismatches(record, chain),
    ];
    const checks = [
      ...metadataChecks,
      check("fiscal_record_exists", true),
      check("fiscal_chain_state_exists", true),
      check("record_fields_match", recordMismatches(evidence, record).length === 0),
      check("chain_covers_record", chain.recordCount >= record.recordSequence),
      check(
        "chain_head_matches_when_current_record",
        chain.recordCount !== record.recordSequence ||
          (chain.lastRecordId === record.id && chain.lastHash === record.recordHash),
      ),
    ];

    if (mismatches.length > 0) {
      return {
        phase: FISCAL_EVIDENCE_INTEGRITY_PHASE_MARKER,
        status: "mismatch",
        evidence: summarizeEvidence(evidence, true),
        mismatches,
        checks,
      };
    }

    return {
      phase: FISCAL_EVIDENCE_INTEGRITY_PHASE_MARKER,
      status: "valid",
      evidence: summarizeEvidence(evidence, true),
      checks,
    };
  }
}
