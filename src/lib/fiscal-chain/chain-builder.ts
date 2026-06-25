import { FiscalChainError } from "./errors";
import { buildFiscalChainLinkCandidate } from "./hash-input";
import type {
  FiscalChainBuildResult,
  FiscalChainLinkBuildInput,
  FiscalChainLinkCandidate,
} from "./types";

export function buildFiscalChainLinkCandidateResult(
  input: FiscalChainLinkBuildInput,
): FiscalChainBuildResult {
  try {
    return {
      status: "built",
      link: buildFiscalChainLinkCandidate(input),
    };
  } catch (error) {
    if (error instanceof FiscalChainError) {
      return {
        status: "rejected",
        reason: error.reason,
        message: error.message,
      };
    }
    throw error;
  }
}

export function buildFiscalChainStateCandidate(input: {
  environment: "test" | "production";
  issuerNif: string;
  previousRecordId?: string | null;
  previousHash?: string | null;
  recordCountCandidate?: number;
}): {
  candidate: true;
  environment: "test" | "production";
  issuerNif: string;
  previousRecordId: string | null;
  previousHash: string | null;
  recordCountCandidate: number;
} {
  const issuerNif = input.issuerNif.trim();
  if (!issuerNif) throw new FiscalChainError("issuer_nif_missing");

  return {
    candidate: true,
    environment: input.environment,
    issuerNif,
    previousRecordId: input.previousRecordId?.trim() || null,
    previousHash: input.previousHash?.trim() || null,
    recordCountCandidate: input.recordCountCandidate ?? 0,
  };
}

export type { FiscalChainLinkCandidate };
