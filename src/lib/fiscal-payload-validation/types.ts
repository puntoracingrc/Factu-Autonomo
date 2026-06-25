import type { FiscalPayloadCandidate } from "@/lib/fiscal-payload-candidate";
import type { FiscalPayloadValidationErrorCode } from "./errors";

export interface FiscalPayloadValidationIssue {
  readonly code: FiscalPayloadValidationErrorCode;
  readonly message: string;
  readonly path?: string;
}

export type FiscalPayloadValidationStatus = "valid" | "rejected";

export type FiscalPayloadValidationResult =
  | {
      readonly status: "valid";
      readonly payload: FiscalPayloadCandidate;
      readonly errors: [];
      readonly warnings: string[];
      readonly checkedAt: string;
    }
  | {
      readonly status: "rejected";
      readonly errors: FiscalPayloadValidationIssue[];
      readonly warnings: string[];
      readonly checkedAt: string;
    };
