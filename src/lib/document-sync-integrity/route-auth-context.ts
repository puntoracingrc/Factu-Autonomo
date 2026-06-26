import type { DocumentSyncServerAuthContext } from "./server-sync-command";

// PHASE2C33_SYNC_ROUTE_AUTH_CONTEXT_ADAPTER_V1
assertServerOnlyModule();

export type DocumentSyncRouteAuthContextStatus =
  | "disabled_auth_context"
  | "missing_auth_context"
  | "synthetic_local_context";

export type DocumentSyncRouteAuthContextReason =
  | "route_shell_disabled"
  | "auth_not_wired"
  | "payload_identity_rejected"
  | "synthetic_local_test_context";

export interface DocumentSyncRouteAuthContextInput {
  mode?: "disabled" | "synthetic_local_test";
  requestId?: string;
  syntheticUserId?: string;
  syntheticScopeId?: string;
  payload?: unknown;
}

export interface DocumentSyncRouteAuthContextSafeSummary {
  status: DocumentSyncRouteAuthContextStatus;
  reason: DocumentSyncRouteAuthContextReason;
  requestId?: string;
  serverDerivedUserId?: string;
  serverDerivedScopeId?: string;
  payloadIdentityRejected: boolean;
}

export type DocumentSyncRouteAuthContextResult =
  | {
      status: "synthetic_local_context";
      auth: DocumentSyncServerAuthContext;
      safeSummary: DocumentSyncRouteAuthContextSafeSummary;
    }
  | {
      status: "disabled_auth_context" | "missing_auth_context";
      auth?: undefined;
      safeSummary: DocumentSyncRouteAuthContextSafeSummary;
    };

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El adaptador auth de document sync route shell solo puede cargarse en servidor.",
    );
  }
}

function hasPayloadIdentity(value: unknown): boolean {
  if (Array.isArray(value)) return value.some((entry) => hasPayloadIdentity(entry));
  if (!value || typeof value !== "object") return false;

  for (const [key, entry] of Object.entries(value)) {
    const normalized = key.toLowerCase();
    if (
      normalized === "userid" ||
      normalized === "scopeid" ||
      normalized === "payloaduserid" ||
      normalized === "payloadscopeid" ||
      normalized === "authorization" ||
      normalized === "cookie" ||
      normalized.includes("tok" + "en") ||
      normalized.includes("service" + "_role")
    ) {
      return true;
    }
    if (hasPayloadIdentity(entry)) return true;
  }

  return false;
}

function isSyntheticId(value: string | undefined): value is string {
  return typeof value === "string" && value.startsWith("SYNTHETIC_ONLY_");
}

export function rejectMissingRouteAuthContext(
  requestId?: string,
  reason: DocumentSyncRouteAuthContextReason = "auth_not_wired",
): DocumentSyncRouteAuthContextResult {
  return {
    status: "missing_auth_context",
    safeSummary: {
      status: "missing_auth_context",
      reason,
      requestId,
      payloadIdentityRejected: reason === "payload_identity_rejected",
    },
  };
}

export function buildDisabledRouteAuthContext(
  input: DocumentSyncRouteAuthContextInput = {},
): DocumentSyncRouteAuthContextResult {
  if (hasPayloadIdentity(input.payload)) {
    return rejectMissingRouteAuthContext(
      input.requestId,
      "payload_identity_rejected",
    );
  }

  if (input.mode === "synthetic_local_test") {
    if (
      isSyntheticId(input.syntheticUserId) &&
      (!input.syntheticScopeId || isSyntheticId(input.syntheticScopeId))
    ) {
      const auth: DocumentSyncServerAuthContext = {
        userId: input.syntheticUserId,
        scopeId: input.syntheticScopeId,
        requestId: input.requestId,
        userIdSource: "test",
      };
      return {
        status: "synthetic_local_context",
        auth,
        safeSummary: {
          status: "synthetic_local_context",
          reason: "synthetic_local_test_context",
          requestId: input.requestId,
          serverDerivedUserId: input.syntheticUserId,
          serverDerivedScopeId: input.syntheticScopeId,
          payloadIdentityRejected: false,
        },
      };
    }
    return rejectMissingRouteAuthContext(input.requestId);
  }

  return {
    status: "disabled_auth_context",
    safeSummary: {
      status: "disabled_auth_context",
      reason: "route_shell_disabled",
      requestId: input.requestId,
      payloadIdentityRejected: false,
    },
  };
}

export function summarizeRouteAuthContext(
  result: DocumentSyncRouteAuthContextResult,
): DocumentSyncRouteAuthContextSafeSummary {
  return { ...result.safeSummary };
}
