import type { FiscalEvidenceIntegrityEvidenceRecord } from "@/lib/fiscal-evidence-integrity";
import { FiscalEvidenceOperationalSummaryError } from "./errors";
import {
  FISCAL_EVIDENCE_OPERATIONAL_SUMMARY_PHASE_MARKER,
  type FiscalEvidenceOperationalSummary,
  type FiscalEvidenceOperationalSummaryCheck,
  type FiscalEvidenceOperationalSummaryInput,
  type FiscalEvidenceOperationalSummaryIntegrityReader,
  type FiscalEvidenceOperationalSummaryStore,
} from "./types";

assertServerOnlyModule();

const DOCUMENT_METADATA_MARKER =
  /candidateXml|candidate_xml|xml_payload|candidate_xml_payload|documentSnapshot|document_snapshot|pdf_snapshot|payloadDocument|payload_document|<FiscalPayloadCandidate|PHASE2B4N_O_XML_CANDIDATE_NOT_AEAT_FINAL/i;

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El resumen operacional de evidencia fiscal solo puede cargarse en servidor.",
    );
  }
}

function isoDateTime(value: Date | string | undefined): string {
  if (!value) return new Date().toISOString();
  return typeof value === "string" ? value : value.toISOString();
}

function check(
  name: string,
  ok: boolean,
): FiscalEvidenceOperationalSummaryCheck {
  return { name, ok };
}

function assertInput(input: FiscalEvidenceOperationalSummaryInput): void {
  if (!input.userId.trim()) {
    throw new FiscalEvidenceOperationalSummaryError(
      "invalid_summary_input",
      "El resumen operacional necesita user_id.",
    );
  }
  if (input.environment !== "test" && input.environment !== "production") {
    throw new FiscalEvidenceOperationalSummaryError(
      "invalid_summary_input",
      "El resumen operacional necesita environment valido.",
    );
  }
}

function sequenceGaps(rows: readonly FiscalEvidenceIntegrityEvidenceRecord[]): number[] {
  const sequences = new Set(
    rows
      .map((row) => row.recordSequence)
      .filter((sequence) => Number.isInteger(sequence) && sequence > 0),
  );
  const latest = Math.max(0, ...sequences);
  const gaps: number[] = [];
  for (let sequence = 1; sequence <= latest; sequence += 1) {
    if (!sequences.has(sequence)) gaps.push(sequence);
  }
  return gaps;
}

function latestEvidence(
  rows: readonly FiscalEvidenceIntegrityEvidenceRecord[],
): FiscalEvidenceIntegrityEvidenceRecord | null {
  if (rows.length === 0) return null;
  return [...rows].sort((left, right) => {
    if (right.recordSequence !== left.recordSequence) {
      return right.recordSequence - left.recordSequence;
    }
    return right.createdAt.localeCompare(left.createdAt);
  })[0];
}

function hasDocumentMetadataMarker(
  rows: readonly FiscalEvidenceIntegrityEvidenceRecord[],
): boolean {
  return rows.some((row) => DOCUMENT_METADATA_MARKER.test(JSON.stringify(row.metadataSafe)));
}

export class FiscalEvidenceOperationalSummaryBuilder {
  constructor(
    private readonly store: FiscalEvidenceOperationalSummaryStore,
    private readonly integrityReader: FiscalEvidenceOperationalSummaryIntegrityReader,
  ) {}

  async buildFiscalEvidenceOperationalSummary(
    input: FiscalEvidenceOperationalSummaryInput,
  ): Promise<FiscalEvidenceOperationalSummary> {
    assertInput(input);

    const [evidenceRows, integrityResults, transportAttemptCount] =
      await Promise.all([
        this.store.findEvidencePackets(input),
        this.integrityReader.readFiscalEvidenceIntegrity(input),
        this.store.countFiscalTransportAttempts(input),
      ]);

    const evidenceResults = integrityResults.filter(
      (result) => "evidence" in result,
    );
    const gaps = sequenceGaps(evidenceRows);
    const latest = latestEvidence(evidenceRows);
    const validEvidenceCount = evidenceResults.filter(
      (result) => result.status === "valid",
    ).length;
    const mismatchEvidenceCount = evidenceResults.filter(
      (result) => result.status === "mismatch",
    ).length;
    const rejectedEvidenceCount = evidenceResults.filter(
      (result) => result.status === "rejected",
    ).length;
    const unsafeMetadataEvidenceCount = evidenceResults.filter(
      (result) => result.status === "unsafe_metadata",
    ).length;
    const missingRecordCount = evidenceResults.filter(
      (result) => result.status === "missing_record",
    ).length;
    const missingChainCount = evidenceResults.filter(
      (result) => result.status === "missing_chain",
    ).length;
    const hasTransportableNotFalse = evidenceRows.some(
      (row) => row.transportable !== false,
    );
    const hasFullXmlOrSnapshotMetadata = hasDocumentMetadataMarker(evidenceRows);
    const hasTransportAttempts = transportAttemptCount > 0;
    const checks = [
      check("evidence_packets_read", evidenceRows.length >= 0),
      check("integrity_results_read", integrityResults.length >= 0),
      check("sequence_without_gaps", gaps.length === 0),
      check("transportable_false", !hasTransportableNotFalse),
      check("metadata_without_full_xml_or_snapshot", !hasFullXmlOrSnapshotMetadata),
      check("no_transport_attempts", !hasTransportAttempts),
    ];
    const hasAttention =
      mismatchEvidenceCount > 0 ||
      rejectedEvidenceCount > 0 ||
      unsafeMetadataEvidenceCount > 0 ||
      missingRecordCount > 0 ||
      missingChainCount > 0 ||
      gaps.length > 0 ||
      hasTransportableNotFalse ||
      hasFullXmlOrSnapshotMetadata ||
      hasTransportAttempts;

    return {
      phase: FISCAL_EVIDENCE_OPERATIONAL_SUMMARY_PHASE_MARKER,
      status: hasAttention ? "attention" : "ok",
      userId: input.userId,
      environment: input.environment,
      generatedAt: isoDateTime(input.generatedAt),
      totalEvidencePackets: evidenceRows.length,
      totalCoveredRecords: new Set(evidenceRows.map((row) => row.recordId)).size,
      latestRecordSequence: latest?.recordSequence ?? null,
      latestRecordHash: latest?.recordHash ?? null,
      validEvidenceCount,
      mismatchEvidenceCount,
      rejectedEvidenceCount,
      unsafeMetadataEvidenceCount,
      missingRecordCount,
      missingChainCount,
      hasSequenceGaps: gaps.length > 0,
      sequenceGaps: gaps,
      hasTransportableNotFalse,
      hasFullXmlOrSnapshotMetadata,
      transportAttemptCount,
      hasTransportAttempts,
      checks,
    };
  }
}
