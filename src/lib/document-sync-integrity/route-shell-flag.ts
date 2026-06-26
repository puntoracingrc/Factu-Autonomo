// PHASE2C31_DISABLED_SYNC_ROUTE_PRIVATE_FLAG_CONTRACT_V1
assertServerOnlyModule();

export const DOCUMENT_SYNC_ROUTE_SHELL_ENABLED_KEY =
  "DOCUMENT_SYNC_ROUTE_SHELL_ENABLED";
export const DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_KEY =
  "DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE";
export const DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_LOCAL =
  "local_staging_only";

export type DocumentSyncRouteShellFlagStatus =
  | "disabled"
  | "enabled_for_local_staging_shell_only";

export type DocumentSyncRouteShellFlagReason =
  | "missing_enabled_flag"
  | "explicit_disabled"
  | "missing_private_mode"
  | "unsupported_private_mode"
  | "production_environment"
  | "remote_environment"
  | "enabled_local_staging_shell_only";

export type DocumentSyncRouteShellEnvLike = Record<string, string | undefined>;

export interface DocumentSyncRouteShellFlagEvaluation {
  status: DocumentSyncRouteShellFlagStatus;
  enabled: boolean;
  reason: DocumentSyncRouteShellFlagReason;
  localStagingOnly: boolean;
  productionBlocked: boolean;
  remoteBlocked: boolean;
}

export interface DocumentSyncRouteShellFlagSafeSummary {
  status: DocumentSyncRouteShellFlagStatus;
  enabled: boolean;
  reason: DocumentSyncRouteShellFlagReason;
  localStagingOnly: boolean;
  productionBlocked: boolean;
  remoteBlocked: boolean;
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "La flag privada de document sync route shell solo puede evaluarse en servidor.",
    );
  }
}

function isProductionEnv(envLike: DocumentSyncRouteShellEnvLike): boolean {
  return (
    envLike.NODE_ENV === "production" ||
    envLike.VERCEL_ENV === "production" ||
    envLike.APP_ENV === "production" ||
    envLike.DEPLOY_ENV === "production"
  );
}

function isRemoteEnv(envLike: DocumentSyncRouteShellEnvLike): boolean {
  return (
    envLike.VERCEL === "1" ||
    envLike.VERCEL_ENV === "preview" ||
    envLike.VERCEL_ENV === "staging" ||
    envLike.APP_ENV === "staging" ||
    envLike.DEPLOY_ENV === "staging" ||
    envLike.SUPABASE_ENV === "remote"
  );
}

export function evaluateDocumentSyncRouteShellFlag(
  envLike: DocumentSyncRouteShellEnvLike = {},
): DocumentSyncRouteShellFlagEvaluation {
  const productionBlocked = isProductionEnv(envLike);
  const remoteBlocked = isRemoteEnv(envLike);

  if (productionBlocked) {
    return {
      status: "disabled",
      enabled: false,
      reason: "production_environment",
      localStagingOnly: false,
      productionBlocked,
      remoteBlocked,
    };
  }

  if (remoteBlocked) {
    return {
      status: "disabled",
      enabled: false,
      reason: "remote_environment",
      localStagingOnly: false,
      productionBlocked,
      remoteBlocked,
    };
  }

  const enabledValue = envLike[DOCUMENT_SYNC_ROUTE_SHELL_ENABLED_KEY];
  const privateMode = envLike[DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_KEY];

  if (!enabledValue) {
    return {
      status: "disabled",
      enabled: false,
      reason: "missing_enabled_flag",
      localStagingOnly: false,
      productionBlocked,
      remoteBlocked,
    };
  }

  if (enabledValue !== "true") {
    return {
      status: "disabled",
      enabled: false,
      reason: "explicit_disabled",
      localStagingOnly: false,
      productionBlocked,
      remoteBlocked,
    };
  }

  if (!privateMode) {
    return {
      status: "disabled",
      enabled: false,
      reason: "missing_private_mode",
      localStagingOnly: false,
      productionBlocked,
      remoteBlocked,
    };
  }

  if (privateMode !== DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_LOCAL) {
    return {
      status: "disabled",
      enabled: false,
      reason: "unsupported_private_mode",
      localStagingOnly: false,
      productionBlocked,
      remoteBlocked,
    };
  }

  return {
    status: "enabled_for_local_staging_shell_only",
    enabled: true,
    reason: "enabled_local_staging_shell_only",
    localStagingOnly: true,
    productionBlocked,
    remoteBlocked,
  };
}

export function assertDocumentSyncRouteShellDisabledByDefault(
  envLike: DocumentSyncRouteShellEnvLike = {},
): DocumentSyncRouteShellFlagEvaluation {
  const evaluation = evaluateDocumentSyncRouteShellFlag(envLike);
  if (Object.keys(envLike).length === 0 && evaluation.enabled) {
    throw new Error("Document sync route shell must be disabled by default.");
  }
  return evaluation;
}

export function summarizeDocumentSyncRouteShellFlag(
  evaluation: DocumentSyncRouteShellFlagEvaluation,
): DocumentSyncRouteShellFlagSafeSummary {
  return {
    status: evaluation.status,
    enabled: evaluation.enabled,
    reason: evaluation.reason,
    localStagingOnly: evaluation.localStagingOnly,
    productionBlocked: evaluation.productionBlocked,
    remoteBlocked: evaluation.remoteBlocked,
  };
}
