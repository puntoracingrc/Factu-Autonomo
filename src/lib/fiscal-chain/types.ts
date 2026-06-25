import type { FiscalRecordCandidate, FiscalRecordType } from "@/lib/fiscal-records/types";
import type { FiscalChainErrorReason } from "./errors";

export type FiscalHashAlgorithmCandidate = "sha256-candidate";

export interface FiscalChainStateCandidate {
  readonly candidate: true;
  readonly environment: "test" | "production";
  readonly issuerNif: string;
  readonly previousRecordId: string | null;
  readonly previousHash: string | null;
  readonly recordCountCandidate: number;
}

export interface FiscalHashInputCandidate {
  readonly marker: "PHASE2B4K_HASH_INPUT_CANDIDATE";
  readonly issuerNif: string;
  readonly environment: "test" | "production";
  readonly recordTypeCandidate: FiscalRecordType;
  readonly numserie: string;
  readonly fechaExpedicion: string;
  readonly operationId: string;
  readonly documentSnapshotHash: string;
  readonly recordTimestampCandidate: string;
  readonly previousRecordId: string | null;
  readonly previousHash: string | null;
  readonly hashAlgorithmCandidate: FiscalHashAlgorithmCandidate;
}

export interface FiscalHashInputBuildInput {
  readonly record: Pick<
    FiscalRecordCandidate,
    | "issuerNif"
    | "environment"
    | "recordTypeCandidate"
    | "numserie"
    | "fechaExpedicion"
    | "operationId"
    | "documentSnapshotHash"
    | "recordTimestampCandidate"
  >;
  readonly previousRecordId?: string | null;
  readonly previousHash?: string | null;
  readonly hashAlgorithmCandidate?: FiscalHashAlgorithmCandidate | string;
}

export interface FiscalChainLinkCandidate {
  readonly candidate: true;
  readonly finality: "candidate_not_final";
  readonly operationId: string;
  readonly recordTypeCandidate: FiscalRecordType;
  readonly previousRecordId: string | null;
  readonly previousHash: string | null;
  readonly hashAlgorithmCandidate: FiscalHashAlgorithmCandidate;
  readonly canonicalHashInput: string;
  readonly technicalHashCandidate: string;
}

export type FiscalChainLinkBuildInput = FiscalHashInputBuildInput;

export type FiscalChainBuildResult =
  | {
      status: "built";
      link: FiscalChainLinkCandidate;
    }
  | {
      status: "rejected";
      reason: FiscalChainErrorReason;
      message: string;
    };
