// PHASE2D94_HIDDEN_UI_ENABLEMENT_ENVIRONMENT_CONTRACT_V1

export type HiddenUiEnablementRuntime = "local" | "test" | "development" | "production" | "staging" | "remote";

export type HiddenUiEnablementEnvironmentStatus =
  | "inactive_by_default"
  | "dry_run_requested"
  | "rejected_public_flag"
  | "rejected_production_or_remote"
  | "rejected_invalid_mode";

export interface HiddenUiEnablementEnvironmentInput {
  envLike?: Record<string, string | undefined>;
  runtime?: HiddenUiEnablementRuntime;
  generatedAt?: string;
}

export interface HiddenUiEnablementEnvironment {
  marker: "PHASE2D94_HIDDEN_UI_ENABLEMENT_ENVIRONMENT_CONTRACT_V1";
  generatedAt: string;
  status: HiddenUiEnablementEnvironmentStatus;
  requested: boolean;
  mode: "none" | "routeless_preview_only";
  ownerApprovedFlag: boolean;
  rejectedReasons: string[];
  documentedFutureKeys: [
    "IMPORT_RESTORE_HIDDEN_UI_ENABLEMENT_REQUESTED",
    "IMPORT_RESTORE_HIDDEN_UI_ENABLEMENT_MODE",
    "IMPORT_RESTORE_HIDDEN_UI_OWNER_APPROVED",
  ];
  publicFlagRejected: boolean;
  vercelConfigRequired: false;
  productionAllowed: false;
  remoteAllowed: false;
  enablementAllowed: false;
  safe: true;
}

export interface HiddenUiEnablementEnvironmentSummary {
  status: HiddenUiEnablementEnvironmentStatus;
  requested: boolean;
  mode: HiddenUiEnablementEnvironment["mode"];
  ownerApprovedFlag: boolean;
  rejectedReasons: string[];
  vercelConfigRequired: false;
  enablementAllowed: false;
  safe: true;
}

const requestedKey = "IMPORT_RESTORE_HIDDEN_UI_ENABLEMENT_REQUESTED";
const modeKey = "IMPORT_RESTORE_HIDDEN_UI_ENABLEMENT_MODE";
const ownerKey = "IMPORT_RESTORE_HIDDEN_UI_OWNER_APPROVED";

const documentedFutureKeys: HiddenUiEnablementEnvironment["documentedFutureKeys"] = [
  requestedKey,
  modeKey,
  ownerKey,
];

function hasPublicFlag(envLike: Record<string, string | undefined>): boolean {
  return Object.keys(envLike).some((key) => key.startsWith("NEXT_PUBLIC_"));
}

function remoteRuntime(runtime?: HiddenUiEnablementRuntime): boolean {
  return runtime === "production" || runtime === "staging" || runtime === "remote";
}

export function evaluateHiddenUiEnablementEnvironment(
  input: HiddenUiEnablementEnvironmentInput = {},
): HiddenUiEnablementEnvironment {
  const envLike = input.envLike ?? {};
  const rejectedReasons: string[] = [];
  const publicFlagRejected = hasPublicFlag(envLike);
  const requested = envLike[requestedKey] === "true";
  const ownerApprovedFlag = envLike[ownerKey] === "true";
  const mode = envLike[modeKey] === "routeless_preview_only" ? "routeless_preview_only" : "none";
  let status: HiddenUiEnablementEnvironmentStatus = "inactive_by_default";

  if (publicFlagRejected) {
    status = "rejected_public_flag";
    rejectedReasons.push("Public enablement flags are rejected.");
  } else if (remoteRuntime(input.runtime)) {
    status = "rejected_production_or_remote";
    rejectedReasons.push("Production, staging and remote runtimes are rejected.");
  } else if (requested && mode !== "routeless_preview_only") {
    status = "rejected_invalid_mode";
    rejectedReasons.push("Requested dry-run enablement must use routeless_preview_only mode.");
  } else if (requested) {
    status = "dry_run_requested";
  }

  return {
    marker: "PHASE2D94_HIDDEN_UI_ENABLEMENT_ENVIRONMENT_CONTRACT_V1",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    status,
    requested,
    mode,
    ownerApprovedFlag,
    rejectedReasons,
    documentedFutureKeys,
    publicFlagRejected,
    vercelConfigRequired: false,
    productionAllowed: false,
    remoteAllowed: false,
    enablementAllowed: false,
    safe: true,
  };
}

export function summarizeHiddenUiEnablementEnvironment(
  environment: HiddenUiEnablementEnvironment,
): HiddenUiEnablementEnvironmentSummary {
  return {
    status: environment.status,
    requested: environment.requested,
    mode: environment.mode,
    ownerApprovedFlag: environment.ownerApprovedFlag,
    rejectedReasons: [...environment.rejectedReasons],
    vercelConfigRequired: false,
    enablementAllowed: false,
    safe: true,
  };
}
