import type {
  OfflineXsdValidationInput,
  OfflineXsdValidationResult,
  OfflineXsdValidatorAdapter,
  OfflineXsdValidatorBlocker,
} from "./types";

export const PHASE2B7M_OFFLINE_XSD_VALIDATOR_CONTRACT_MARKER =
  "PHASE2B7M_OFFLINE_XSD_VALIDATOR_CONTRACT_V1";

const BLOCKED_VALIDATOR_BLOCKERS = [
  "BLOCKED_NO_SAFE_OFFLINE_XSD_VALIDATOR",
  "BLOCKED_XSD_NOT_COMMITTED",
] as const satisfies readonly OfflineXsdValidatorBlocker[];

export function createBlockedOfflineXsdValidator(): OfflineXsdValidatorAdapter {
  return {
    marker: PHASE2B7M_OFFLINE_XSD_VALIDATOR_CONTRACT_MARKER,
    status: "blocked",
    capabilities: {
      canValidateOffline: false,
      usesNetwork: false,
      usesJava: false,
      usesNativeBinary: false,
      printsXml: false,
    },
    blockers: BLOCKED_VALIDATOR_BLOCKERS,
    validate(input: OfflineXsdValidationInput): OfflineXsdValidationResult {
      void input;

      return {
        status: "blocked",
        accepted: false,
        blockers: BLOCKED_VALIDATOR_BLOCKERS,
        errors: [
          {
            code: "OFFLINE_XSD_VALIDATOR_BLOCKED",
            blocker: "BLOCKED_NO_SAFE_OFFLINE_XSD_VALIDATOR",
            message: "No safe offline XSD validator is selected.",
          },
          {
            code: "OFFLINE_XSD_VALIDATOR_BLOCKED",
            blocker: "BLOCKED_XSD_NOT_COMMITTED",
            message: "Official XSD fixtures are not committed for offline validation.",
          },
        ],
      };
    },
  };
}
