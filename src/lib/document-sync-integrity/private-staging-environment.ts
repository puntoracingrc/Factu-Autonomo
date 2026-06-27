// PHASE2C58_PRIVATE_STAGING_ENVIRONMENT_CONTRACT_V1
assertServerOnlyModule();

export const DOCUMENT_SYNC_PRIVATE_STAGING_ENABLED_KEY =
  "DOCUMENT_SYNC_PRIVATE_STAGING_ENABLED";
export const DOCUMENT_SYNC_PRIVATE_STAGING_MODE_KEY =
  "DOCUMENT_SYNC_PRIVATE_STAGING_MODE";
export const DOCUMENT_SYNC_PRIVATE_STAGING_AUDIENCE_KEY =
  "DOCUMENT_SYNC_PRIVATE_STAGING_AUDIENCE";
export const DOCUMENT_SYNC_PRIVATE_STAGING_KILL_SWITCH_KEY =
  "DOCUMENT_SYNC_PRIVATE_STAGING_KILL_SWITCH";

export const DOCUMENT_SYNC_PRIVATE_STAGING_MODE_REVIEW =
  "private_review_only";
export const DOCUMENT_SYNC_PRIVATE_STAGING_AUDIENCE_INTERNAL =
  "internal_review_only";

export type DocumentSyncPrivateStagingEnvironmentStatus =
  | "inactive"
  | "ready_for_review"
  | "rejected";

export type DocumentSyncPrivateStagingEnvironmentReason =
  | "missing_private_staging_flag"
  | "explicitly_disabled"
  | "kill_switch_engaged"
  | "public_variable_rejected"
  | "production_environment"
  | "remote_environment"
  | "unsupported_private_staging_mode"
  | "missing_internal_audience"
  | "unsafe_variable_value"
  | "private_review_environment_contract_ready";

export type DocumentSyncPrivateStagingEnvLike =
  Record<string, string | undefined>;

export interface DocumentSyncPrivateStagingEnvironmentEvaluation {
  status: DocumentSyncPrivateStagingEnvironmentStatus;
  enabled: boolean;
  reason: DocumentSyncPrivateStagingEnvironmentReason;
  productionBlocked: boolean;
  remoteBlocked: boolean;
  publicVariableBlocked: boolean;
  killSwitch: boolean;
  checkedKeys: string[];
  rejectedKeys: string[];
}

export interface DocumentSyncPrivateStagingEnvironmentSafeSummary {
  status: DocumentSyncPrivateStagingEnvironmentStatus;
  enabled: boolean;
  reason: DocumentSyncPrivateStagingEnvironmentReason;
  productionBlocked: boolean;
  remoteBlocked: boolean;
  publicVariableBlocked: boolean;
  killSwitch: boolean;
  checkedKeys: string[];
  rejectedKeys: string[];
}

const contractKeys = [
  DOCUMENT_SYNC_PRIVATE_STAGING_ENABLED_KEY,
  DOCUMENT_SYNC_PRIVATE_STAGING_MODE_KEY,
  DOCUMENT_SYNC_PRIVATE_STAGING_AUDIENCE_KEY,
  DOCUMENT_SYNC_PRIVATE_STAGING_KILL_SWITCH_KEY,
] as const;

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "Document sync private staging environment contract is server-only.",
    );
  }
}

function isProductionEnv(envLike: DocumentSyncPrivateStagingEnvLike): boolean {
  return (
    envLike.NODE_ENV === "production" ||
    envLike.VERCEL_ENV === "production" ||
    envLike.APP_ENV === "production" ||
    envLike.DEPLOY_ENV === "production"
  );
}

function isRemoteEnv(envLike: DocumentSyncPrivateStagingEnvLike): boolean {
  return (
    envLike.VERCEL === "1" ||
    envLike.VERCEL_ENV === "preview" ||
    envLike.VERCEL_ENV === "staging" ||
    envLike.APP_ENV === "staging" ||
    envLike.DEPLOY_ENV === "staging" ||
    envLike.SUPABASE_ENV === "remote"
  );
}

function publicDocumentSyncKey(key: string): boolean {
  return key.startsWith("NEXT_PUBLIC_") && key.includes("DOCUMENT_SYNC");
}

function hasUnsafeValue(value: string | undefined): boolean {
  if (!value) return false;
  return /bearer|token|password|private[_-]?key|credential|authorization|cookie/i
    .test(value);
}

function sortedContractKeys(
  envLike: DocumentSyncPrivateStagingEnvLike,
): string[] {
  return Object.keys(envLike)
    .filter((key) => key.includes("DOCUMENT_SYNC_PRIVATE_STAGING"))
    .sort();
}

function result(
  input: Omit<
    DocumentSyncPrivateStagingEnvironmentEvaluation,
    "checkedKeys" | "rejectedKeys"
  > & {
    envLike: DocumentSyncPrivateStagingEnvLike;
    rejectedKeys?: string[];
  },
): DocumentSyncPrivateStagingEnvironmentEvaluation {
  return {
    status: input.status,
    enabled: input.enabled,
    reason: input.reason,
    productionBlocked: input.productionBlocked,
    remoteBlocked: input.remoteBlocked,
    publicVariableBlocked: input.publicVariableBlocked,
    killSwitch: input.killSwitch,
    checkedKeys: sortedContractKeys(input.envLike),
    rejectedKeys: [...(input.rejectedKeys ?? [])].sort(),
  };
}

export function evaluatePrivateStagingEnvironmentContract(
  envLike: DocumentSyncPrivateStagingEnvLike = {},
): DocumentSyncPrivateStagingEnvironmentEvaluation {
  const productionBlocked = isProductionEnv(envLike);
  const remoteBlocked = isRemoteEnv(envLike);
  const publicRejectedKeys = Object.keys(envLike).filter(publicDocumentSyncKey);
  const unsafeValueKeys = contractKeys.filter((key) => hasUnsafeValue(envLike[key]));
  const killSwitch = envLike[DOCUMENT_SYNC_PRIVATE_STAGING_KILL_SWITCH_KEY] === "true";

  if (publicRejectedKeys.length > 0) {
    return result({
      envLike,
      status: "rejected",
      enabled: false,
      reason: "public_variable_rejected",
      productionBlocked,
      remoteBlocked,
      publicVariableBlocked: true,
      killSwitch,
      rejectedKeys: publicRejectedKeys,
    });
  }

  if (productionBlocked) {
    return result({
      envLike,
      status: "rejected",
      enabled: false,
      reason: "production_environment",
      productionBlocked,
      remoteBlocked,
      publicVariableBlocked: false,
      killSwitch,
      rejectedKeys: ["NODE_ENV", "VERCEL_ENV", "APP_ENV", "DEPLOY_ENV"],
    });
  }

  if (remoteBlocked) {
    return result({
      envLike,
      status: "rejected",
      enabled: false,
      reason: "remote_environment",
      productionBlocked,
      remoteBlocked,
      publicVariableBlocked: false,
      killSwitch,
      rejectedKeys: ["VERCEL", "VERCEL_ENV", "APP_ENV", "DEPLOY_ENV", "SUPABASE_ENV"],
    });
  }

  if (unsafeValueKeys.length > 0) {
    return result({
      envLike,
      status: "rejected",
      enabled: false,
      reason: "unsafe_variable_value",
      productionBlocked,
      remoteBlocked,
      publicVariableBlocked: false,
      killSwitch,
      rejectedKeys: unsafeValueKeys,
    });
  }

  if (killSwitch) {
    return result({
      envLike,
      status: "inactive",
      enabled: false,
      reason: "kill_switch_engaged",
      productionBlocked,
      remoteBlocked,
      publicVariableBlocked: false,
      killSwitch,
    });
  }

  const enabled = envLike[DOCUMENT_SYNC_PRIVATE_STAGING_ENABLED_KEY];
  if (!enabled) {
    return result({
      envLike,
      status: "inactive",
      enabled: false,
      reason: "missing_private_staging_flag",
      productionBlocked,
      remoteBlocked,
      publicVariableBlocked: false,
      killSwitch,
    });
  }

  if (enabled !== "true") {
    return result({
      envLike,
      status: "inactive",
      enabled: false,
      reason: "explicitly_disabled",
      productionBlocked,
      remoteBlocked,
      publicVariableBlocked: false,
      killSwitch,
    });
  }

  if (
    envLike[DOCUMENT_SYNC_PRIVATE_STAGING_MODE_KEY] !==
    DOCUMENT_SYNC_PRIVATE_STAGING_MODE_REVIEW
  ) {
    return result({
      envLike,
      status: "rejected",
      enabled: false,
      reason: "unsupported_private_staging_mode",
      productionBlocked,
      remoteBlocked,
      publicVariableBlocked: false,
      killSwitch,
      rejectedKeys: [DOCUMENT_SYNC_PRIVATE_STAGING_MODE_KEY],
    });
  }

  if (
    envLike[DOCUMENT_SYNC_PRIVATE_STAGING_AUDIENCE_KEY] !==
    DOCUMENT_SYNC_PRIVATE_STAGING_AUDIENCE_INTERNAL
  ) {
    return result({
      envLike,
      status: "rejected",
      enabled: false,
      reason: "missing_internal_audience",
      productionBlocked,
      remoteBlocked,
      publicVariableBlocked: false,
      killSwitch,
      rejectedKeys: [DOCUMENT_SYNC_PRIVATE_STAGING_AUDIENCE_KEY],
    });
  }

  return result({
    envLike,
    status: "ready_for_review",
    enabled: true,
    reason: "private_review_environment_contract_ready",
    productionBlocked,
    remoteBlocked,
    publicVariableBlocked: false,
    killSwitch,
  });
}

export function summarizePrivateStagingEnvironmentContract(
  evaluation: DocumentSyncPrivateStagingEnvironmentEvaluation,
): DocumentSyncPrivateStagingEnvironmentSafeSummary {
  return {
    status: evaluation.status,
    enabled: evaluation.enabled,
    reason: evaluation.reason,
    productionBlocked: evaluation.productionBlocked,
    remoteBlocked: evaluation.remoteBlocked,
    publicVariableBlocked: evaluation.publicVariableBlocked,
    killSwitch: evaluation.killSwitch,
    checkedKeys: [...evaluation.checkedKeys],
    rejectedKeys: [...evaluation.rejectedKeys],
  };
}
