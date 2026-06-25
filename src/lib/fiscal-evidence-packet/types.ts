import type { FiscalPayloadCandidate } from "@/lib/fiscal-payload-candidate";
import type { FiscalPayloadValidationResult } from "@/lib/fiscal-payload-validation";
import type {
  FiscalChainHeadState,
  FiscalRecordWithChainLocalStagingRecord,
} from "@/lib/fiscal-records";
import type { FiscalEvidencePacketErrorCode } from "./errors";

export interface FiscalEvidencePacket {
  readonly evidencePacketId: string;
  readonly recordId: string;
  readonly operationId: string;
  readonly recordSequence: number;
  readonly recordHash: string;
  readonly previousHash: string | null;
  readonly payloadCandidateId: string;
  readonly payloadValidationStatus: "valid";
  readonly generatedAt: string;
  readonly environment: "test" | "production";
  readonly finality: "internal_dry_run_evidence";
  readonly transportable: false;
  readonly payloadXmlDigest: string | null;
  readonly payloadXmlMarkerPresent: boolean;
  readonly safeMetadata: {
    readonly phase: "PHASE2B4P_Q_FISCAL_PAYLOAD_VALIDATION_EVIDENCE_V1";
    readonly source: "local_dry_run";
    readonly includesFullXml: false;
    readonly includesDocumentSnapshot: false;
    readonly signed: false;
    readonly aeatReady: false;
  };
}

export interface FiscalEvidencePacketBuildInput {
  readonly record: FiscalRecordWithChainLocalStagingRecord | null;
  readonly chain: FiscalChainHeadState | null;
  readonly payload: FiscalPayloadCandidate | null;
  readonly validation: FiscalPayloadValidationResult | null;
  readonly generatedAt?: Date | string;
}

export type FiscalEvidencePacketBuildResult =
  | {
      readonly status: "built";
      readonly packet: FiscalEvidencePacket;
    }
  | {
      readonly status: "rejected";
      readonly reason: FiscalEvidencePacketErrorCode;
      readonly message: string;
    };
