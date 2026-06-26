import type {
  DocumentSyncRouteShellFlagEvaluation,
  DocumentSyncRouteShellFlagSafeSummary,
} from "./route-shell-flag";
import { summarizeDocumentSyncRouteShellFlag } from "./route-shell-flag";

// PHASE2C34_SYNC_ROUTE_SAFE_ENVELOPE_V1
assertServerOnlyModule();

export const DOCUMENT_SYNC_ROUTE_ENVELOPE_MAX_BYTES = 8 * 1024;

export type DocumentSyncRouteEnvelopeStatus = "accepted" | "rejected";

export interface DocumentSyncRouteEnvelopeInput {
  rawBody?: string | null;
  requestId?: string;
  method?: string;
  maxBytes?: number;
}

export interface DocumentSyncRouteEnvelopeSafeSummary {
  status: DocumentSyncRouteEnvelopeStatus;
  requestId: string;
  method?: string;
  bodyPresent: boolean;
  bodyBytes: number;
  topLevelKeyCount: number;
}

export type DocumentSyncRouteEnvelopeResult =
  | {
      status: "accepted";
      requestId: string;
      safeSummary: DocumentSyncRouteEnvelopeSafeSummary;
    }
  | {
      status: "rejected";
      requestId: string;
      code: string;
      safeSummary: DocumentSyncRouteEnvelopeSafeSummary;
    };

export interface DocumentSyncRouteSafeResponseBody {
  ok: false;
  code: string;
  requestId?: string;
  status: "disabled" | "error" | "safe";
  routeShell: "disabled_by_default" | "operations_disabled";
  flag?: DocumentSyncRouteShellFlagSafeSummary;
  summary?: unknown;
}

export interface DocumentSyncRouteSafeResponse {
  status: number;
  body: DocumentSyncRouteSafeResponseBody;
  headers: Record<string, string>;
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El envelope seguro de document sync route shell solo puede cargarse en servidor.",
    );
  }
}

function safeRequestId(value: string | undefined): string {
  if (value && /^[a-zA-Z0-9:_-]{1,96}$/.test(value)) return value;
  return "SYNTHETIC_ONLY_ROUTE_REQUEST";
}

function forbiddenFragments(): string[] {
  return [
    "document" + "snapshot",
    "pdf" + "body",
    "pdf" + "snapshot",
    "raw" + "payload",
    "full" + "payload",
    "snapshot" + "body",
    "xm" + "l",
    "tok" + "en",
    "sec" + "ret",
    "service" + "_role",
    "authorization",
    "cookie",
    "fiscal" + "_transport",
  ];
}

function unsafeString(value: string): boolean {
  const normalized = value.toLowerCase();
  return forbiddenFragments().some((fragment) =>
    normalized.includes(fragment.toLowerCase()),
  );
}

function assertSafeEnvelopeValue(value: unknown, key = ""): void {
  if (unsafeString(key)) {
    throw new Error("UNSAFE_ROUTE_ENVELOPE");
  }

  if (typeof value === "string" && unsafeString(value)) {
    throw new Error("UNSAFE_ROUTE_ENVELOPE");
  }

  if (Array.isArray(value)) {
    for (const entry of value) assertSafeEnvelopeValue(entry);
    return;
  }

  if (value && typeof value === "object") {
    for (const [entryKey, entryValue] of Object.entries(value)) {
      assertSafeEnvelopeValue(entryValue, entryKey);
    }
  }
}

function topLevelKeyCount(value: unknown): number {
  return value && typeof value === "object" && !Array.isArray(value)
    ? Object.keys(value).length
    : 0;
}

export function parseDocumentSyncRouteEnvelope(
  input: DocumentSyncRouteEnvelopeInput = {},
): DocumentSyncRouteEnvelopeResult {
  const requestId = safeRequestId(input.requestId);
  const rawBody = input.rawBody ?? "";
  const bodyBytes = Buffer.byteLength(rawBody, "utf8");
  const maxBytes = input.maxBytes ?? DOCUMENT_SYNC_ROUTE_ENVELOPE_MAX_BYTES;
  const baseSummary = {
    requestId,
    method: input.method,
    bodyPresent: bodyBytes > 0,
    bodyBytes,
    topLevelKeyCount: 0,
  };

  if (bodyBytes > maxBytes) {
    return {
      status: "rejected",
      requestId,
      code: "PAYLOAD_TOO_LARGE",
      safeSummary: {
        ...baseSummary,
        status: "rejected",
      },
    };
  }

  if (!rawBody.trim()) {
    return {
      status: "accepted",
      requestId,
      safeSummary: {
        ...baseSummary,
        status: "accepted",
      },
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return {
      status: "rejected",
      requestId,
      code: "MALFORMED_BODY",
      safeSummary: {
        ...baseSummary,
        status: "rejected",
      },
    };
  }

  try {
    assertSafeEnvelopeValue(parsed);
  } catch {
    return {
      status: "rejected",
      requestId,
      code: "UNSAFE_BODY",
      safeSummary: {
        ...baseSummary,
        status: "rejected",
        topLevelKeyCount: topLevelKeyCount(parsed),
      },
    };
  }

  return {
    status: "accepted",
    requestId,
    safeSummary: {
      ...baseSummary,
      status: "accepted",
      topLevelKeyCount: topLevelKeyCount(parsed),
    },
  };
}

function safeHeaders(): Record<string, string> {
  return {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
  };
}

export function buildDocumentSyncRouteDisabledResponse(
  evaluation: DocumentSyncRouteShellFlagEvaluation,
  requestId?: string,
): DocumentSyncRouteSafeResponse {
  const enabledLocalShell =
    evaluation.status === "enabled_for_local_staging_shell_only";
  return {
    status: enabledLocalShell ? 501 : 404,
    headers: safeHeaders(),
    body: {
      ok: false,
      code: enabledLocalShell
        ? "route_shell_enabled_but_operations_disabled"
        : "document_sync_route_disabled",
      requestId: safeRequestId(requestId),
      status: "disabled",
      routeShell: enabledLocalShell
        ? "operations_disabled"
        : "disabled_by_default",
      flag: summarizeDocumentSyncRouteShellFlag(evaluation),
    },
  };
}

export function buildDocumentSyncRouteErrorResponse(
  code: string,
  requestId?: string,
  status = 400,
): DocumentSyncRouteSafeResponse {
  return {
    status,
    headers: safeHeaders(),
    body: {
      ok: false,
      code,
      requestId: safeRequestId(requestId),
      status: "error",
      routeShell: "operations_disabled",
    },
  };
}

export function buildDocumentSyncRouteSafeResponse(
  code: string,
  summary: unknown,
  requestId?: string,
): DocumentSyncRouteSafeResponse {
  return {
    status: 501,
    headers: safeHeaders(),
    body: {
      ok: false,
      code,
      requestId: safeRequestId(requestId),
      status: "safe",
      routeShell: "operations_disabled",
      summary,
    },
  };
}
