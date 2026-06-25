import type {
  FiscalEvidenceIntegrityEnvironment,
  FiscalEvidenceIntegrityEvidenceRecord,
  FiscalEvidenceIntegrityResult,
} from "@/lib/fiscal-evidence-integrity";

export const FISCAL_EVIDENCE_OPERATIONAL_SUMMARY_PHASE_MARKER =
  "PHASE2B4U_FISCAL_EVIDENCE_OPERATIONAL_SUMMARY_CHECKPOINT_V1";

export type FiscalEvidenceOperationalSummaryEnvironment =
  FiscalEvidenceIntegrityEnvironment;

export type FiscalEvidenceOperationalSummaryStatus = "ok" | "attention";

export interface FiscalEvidenceOperationalSummaryInput {
  readonly userId: string;
  readonly environment: FiscalEvidenceOperationalSummaryEnvironment;
  readonly generatedAt?: Date | string;
}

export interface FiscalEvidenceOperationalSummaryStore {
  findEvidencePackets(input: {
    readonly userId: string;
    readonly environment: FiscalEvidenceOperationalSummaryEnvironment;
  }): Promise<readonly FiscalEvidenceIntegrityEvidenceRecord[]>;
  countFiscalTransportAttempts(input: {
    readonly userId: string;
    readonly environment: FiscalEvidenceOperationalSummaryEnvironment;
  }): Promise<number>;
}

export interface FiscalEvidenceOperationalSummaryIntegrityReader {
  readFiscalEvidenceIntegrity(input: {
    readonly userId: string;
    readonly environment: FiscalEvidenceOperationalSummaryEnvironment;
  }): Promise<readonly FiscalEvidenceIntegrityResult[]>;
}

export interface FiscalEvidenceOperationalSummaryCheck {
  readonly name: string;
  readonly ok: boolean;
}

export interface FiscalEvidenceOperationalSummary {
  readonly phase: typeof FISCAL_EVIDENCE_OPERATIONAL_SUMMARY_PHASE_MARKER;
  readonly status: FiscalEvidenceOperationalSummaryStatus;
  readonly userId: string;
  readonly environment: FiscalEvidenceOperationalSummaryEnvironment;
  readonly generatedAt: string;
  readonly totalEvidencePackets: number;
  readonly totalCoveredRecords: number;
  readonly latestRecordSequence: number | null;
  readonly latestRecordHash: string | null;
  readonly validEvidenceCount: number;
  readonly mismatchEvidenceCount: number;
  readonly rejectedEvidenceCount: number;
  readonly unsafeMetadataEvidenceCount: number;
  readonly missingRecordCount: number;
  readonly missingChainCount: number;
  readonly hasSequenceGaps: boolean;
  readonly sequenceGaps: readonly number[];
  readonly hasTransportableNotFalse: boolean;
  readonly hasFullXmlOrSnapshotMetadata: boolean;
  readonly transportAttemptCount: number;
  readonly hasTransportAttempts: boolean;
  readonly checks: readonly FiscalEvidenceOperationalSummaryCheck[];
}
