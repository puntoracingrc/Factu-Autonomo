import {
  DOCUMENT_SYNC_ROUTE_SHELL_ENABLED_KEY,
  DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_KEY,
  DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_LOCAL,
  evaluateDocumentSyncRouteShellFlag,
  type DocumentSyncRouteShellEnvLike,
} from "./route-shell-flag";

// PHASE2C37_PRIVATE_LOCAL_SYNC_ROUTE_EXECUTION_CONTRACT_V1
assertServerOnlyModule();

export const DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_ENABLED_KEY =
  "DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_ENABLED";
export const DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_MODE_KEY =
  "DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_MODE";
export const DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_MODE_IN_MEMORY =
  "in_memory_local_staging";

export type DocumentSyncLocalExecutionStatus =
  | "disabled"
  | "local_fake_execution_allowed";

export type DocumentSyncLocalExecutionReason =
  | "route_shell_disabled"
  | "fake_adapter_missing"
  | "fake_adapter_disabled"
  | "unsupported_fake_adapter_mode"
  | "production_environment"
  | "remote_environment"
  | "local_fake_execution_allowed";

export interface DocumentSyncLocalExecutionEvaluation {
  status: DocumentSyncLocalExecutionStatus;
  enabled: boolean;
  reason: DocumentSyncLocalExecutionReason;
  shellEnabled: boolean;
  fakeAdapterEnabled: boolean;
  adapterMode?: "in_memory_local_staging";
  productionBlocked: boolean;
  remoteBlocked: boolean;
}

export interface DocumentSyncLocalExecutionSafeSummary {
  status: DocumentSyncLocalExecutionStatus;
  enabled: boolean;
  reason: DocumentSyncLocalExecutionReason;
  shellEnabled: boolean;
  fakeAdapterEnabled: boolean;
  adapterMode?: "in_memory_local_staging";
  productionBlocked: boolean;
  remoteBlocked: boolean;
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El contrato local/fake de document sync route solo puede evaluarse en servidor.",
    );
  }
}

export function evaluateDocumentSyncLocalExecutionMode(
  envLike: DocumentSyncRouteShellEnvLike = {},
): DocumentSyncLocalExecutionEvaluation {
  const shell = evaluateDocumentSyncRouteShellFlag(envLike);
  const fakeEnabledValue = envLike[DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_ENABLED_KEY];
  const fakeMode = envLike[DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_MODE_KEY];

  if (shell.productionBlocked) {
    return {
      status: "disabled",
      enabled: false,
      reason: "production_environment",
      shellEnabled: shell.enabled,
      fakeAdapterEnabled: false,
      productionBlocked: true,
      remoteBlocked: shell.remoteBlocked,
    };
  }

  if (shell.remoteBlocked) {
    return {
      status: "disabled",
      enabled: false,
      reason: "remote_environment",
      shellEnabled: shell.enabled,
      fakeAdapterEnabled: false,
      productionBlocked: shell.productionBlocked,
      remoteBlocked: true,
    };
  }

  if (!shell.enabled) {
    return {
      status: "disabled",
      enabled: false,
      reason: "route_shell_disabled",
      shellEnabled: false,
      fakeAdapterEnabled: false,
      productionBlocked: shell.productionBlocked,
      remoteBlocked: shell.remoteBlocked,
    };
  }

  if (!fakeEnabledValue) {
    return {
      status: "disabled",
      enabled: false,
      reason: "fake_adapter_missing",
      shellEnabled: true,
      fakeAdapterEnabled: false,
      productionBlocked: false,
      remoteBlocked: false,
    };
  }

  if (fakeEnabledValue !== "true") {
    return {
      status: "disabled",
      enabled: false,
      reason: "fake_adapter_disabled",
      shellEnabled: true,
      fakeAdapterEnabled: false,
      productionBlocked: false,
      remoteBlocked: false,
    };
  }

  if (fakeMode !== DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_MODE_IN_MEMORY) {
    return {
      status: "disabled",
      enabled: false,
      reason: "unsupported_fake_adapter_mode",
      shellEnabled: true,
      fakeAdapterEnabled: true,
      productionBlocked: false,
      remoteBlocked: false,
    };
  }

  return {
    status: "local_fake_execution_allowed",
    enabled: true,
    reason: "local_fake_execution_allowed",
    shellEnabled:
      envLike[DOCUMENT_SYNC_ROUTE_SHELL_ENABLED_KEY] === "true" &&
      envLike[DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_KEY] ===
        DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_LOCAL,
    fakeAdapterEnabled: true,
    adapterMode: "in_memory_local_staging",
    productionBlocked: false,
    remoteBlocked: false,
  };
}

export function assertDocumentSyncLocalExecutionAllowed(
  envLike: DocumentSyncRouteShellEnvLike = {},
): DocumentSyncLocalExecutionEvaluation {
  const evaluation = evaluateDocumentSyncLocalExecutionMode(envLike);
  if (!evaluation.enabled) {
    throw new Error("Document sync local/fake execution is not enabled.");
  }
  return evaluation;
}

export function summarizeDocumentSyncLocalExecutionMode(
  evaluation: DocumentSyncLocalExecutionEvaluation,
): DocumentSyncLocalExecutionSafeSummary {
  return {
    status: evaluation.status,
    enabled: evaluation.enabled,
    reason: evaluation.reason,
    shellEnabled: evaluation.shellEnabled,
    fakeAdapterEnabled: evaluation.fakeAdapterEnabled,
    adapterMode: evaluation.adapterMode,
    productionBlocked: evaluation.productionBlocked,
    remoteBlocked: evaluation.remoteBlocked,
  };
}
