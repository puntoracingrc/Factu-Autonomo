import {
  CentralInvoiceAuthorityIssueCommandError,
  type CentralInvoiceAuthorityIssueDraftRef,
  type CentralInvoiceAuthorityIssueInput,
  type CentralInvoiceAuthorityIssueKind,
  type CentralInvoiceAuthoritySeriesRef,
} from "./issue-command";
import {
  CentralInvoiceAuthorityIssueRpcAdapterError,
  type CentralInvoiceAuthorityIssueRpcClient,
  type CentralInvoiceAuthorityJson,
} from "./issue-rpc-adapter";
import {
  CentralInvoiceAuthorityIssueServiceError,
  issueCentralInvoiceWithAuthority,
} from "./issue-service";

assertServerOnlyModule();

export const CENTRAL_INVOICE_AUTHORITY_ISSUE_ROUTE =
  "CENTRAL_INVOICE_AUTHORITY_ISSUE_ROUTE_V1";

const MAX_BODY_BYTES = 512 * 1024;

export interface CentralInvoiceAuthorityRouteAuth {
  userId: string;
  sessionId: string;
  userEmail?: string | null;
}

export type CentralInvoiceAuthorityRouteDeviceGateResult =
  | { allowed: true; deviceId: string }
  | { allowed: false; status: number; code: string; message: string };

export type CentralInvoiceAuthorityRouteRateLimitResult =
  | { allowed: true }
  | {
      allowed: false;
      status: number;
      body: unknown;
      headers?: Record<string, string>;
    };

export interface CentralInvoiceAuthorityIssueRouteDependencies {
  authenticate(authorization: string | null): Promise<CentralInvoiceAuthorityRouteAuth | null>;
  rateLimit(
    request: CentralInvoiceAuthorityIssueRouteRequest,
    userId: string,
  ): Promise<CentralInvoiceAuthorityRouteRateLimitResult>;
  verifyDevice(input: {
    userId: string;
    sessionId: string;
    token: string | null;
    userAgent: string | null;
  }): Promise<CentralInvoiceAuthorityRouteDeviceGateResult>;
  getRpcClient(): CentralInvoiceAuthorityIssueRpcClient | null;
}

export interface CentralInvoiceAuthorityIssueRouteRequest {
  method: string;
  headers: Headers;
  readBody?: () => Promise<string>;
}

export interface CentralInvoiceAuthorityIssueRouteResponse {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}

interface CentralInvoiceAuthorityIssueRouteBody {
  kind: CentralInvoiceAuthorityIssueKind;
  idempotencyKey: string;
  draft: CentralInvoiceAuthorityIssueDraftRef;
  series: CentralInvoiceAuthoritySeriesRef;
  issuedAt: string;
  rectifiesIdentityId?: string;
  documentPayload: CentralInvoiceAuthorityJson;
  emittedSnapshot: CentralInvoiceAuthorityJson;
  emittedHash: string;
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "La ruta de emision con autoridad central solo puede cargarse en servidor.",
    );
  }
}

function privateHeaders(extra: Record<string, string> = {}) {
  return {
    "Cache-Control": "private, no-store, max-age=0",
    Pragma: "no-cache",
    Vary: "Authorization, X-Factu-Device-Token",
    ...extra,
  };
}

function json(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): CentralInvoiceAuthorityIssueRouteResponse {
  return { status, body, headers: privateHeaders(headers) };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isJsonObjectOrArray(value: unknown): value is CentralInvoiceAuthorityJson {
  return isObject(value) || Array.isArray(value);
}

function parseBody(raw: string): CentralInvoiceAuthorityIssueRouteBody {
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    throw new Error("REQUEST_BODY_TOO_LARGE");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("INVALID_JSON");
  }

  if (!isObject(parsed)) {
    throw new Error("INVALID_BODY");
  }

  const body = parsed as Record<string, unknown>;
  if (
    (body.kind !== "invoice" && body.kind !== "rectification") ||
    typeof body.idempotencyKey !== "string" ||
    !isObject(body.draft) ||
    !isObject(body.series) ||
    typeof body.issuedAt !== "string" ||
    (body.rectifiesIdentityId !== undefined &&
      typeof body.rectifiesIdentityId !== "string") ||
    !isJsonObjectOrArray(body.documentPayload) ||
    !isJsonObjectOrArray(body.emittedSnapshot) ||
    typeof body.emittedHash !== "string"
  ) {
    throw new Error("INVALID_BODY");
  }

  return {
    kind: body.kind,
    idempotencyKey: body.idempotencyKey,
    draft: body.draft as unknown as CentralInvoiceAuthorityIssueDraftRef,
    series: body.series as unknown as CentralInvoiceAuthoritySeriesRef,
    issuedAt: body.issuedAt,
    rectifiesIdentityId: body.rectifiesIdentityId,
    documentPayload: body.documentPayload,
    emittedSnapshot: body.emittedSnapshot,
    emittedHash: body.emittedHash,
  };
}

function commandErrorResponse(error: CentralInvoiceAuthorityIssueCommandError) {
  return json(400, {
    ok: false,
    error: {
      code: error.code,
      message: error.message,
    },
  });
}

function serviceErrorResponse(error: CentralInvoiceAuthorityIssueServiceError) {
  return json(409, {
    ok: false,
    error: {
      code: error.code,
      message: error.message,
      activation: error.activation,
    },
  });
}

function rpcErrorResponse(error: CentralInvoiceAuthorityIssueRpcAdapterError) {
  return json(error.code === "RPC_REJECTED" ? 502 : 500, {
    ok: false,
    error: {
      code: error.code,
      message: error.message,
      causeCode: error.causeCode,
    },
  });
}

export function createCentralInvoiceAuthorityIssueRouteHandler(
  dependencies: CentralInvoiceAuthorityIssueRouteDependencies,
) {
  return {
    async handle(
      request: CentralInvoiceAuthorityIssueRouteRequest,
    ): Promise<CentralInvoiceAuthorityIssueRouteResponse> {
      if (request.method === "OPTIONS") {
        return json(204, { ok: true }, { Allow: "POST, OPTIONS" });
      }
      if (request.method !== "POST") {
        return json(
          405,
          { ok: false, error: { code: "METHOD_NOT_ALLOWED" } },
          { Allow: "POST, OPTIONS" },
        );
      }

      const auth = await dependencies.authenticate(
        request.headers.get("authorization"),
      );
      if (!auth) {
        return json(401, { ok: false, error: { code: "UNAUTHORIZED" } });
      }

      const rateLimit = await dependencies.rateLimit(request, auth.userId);
      if (!rateLimit.allowed) {
        return json(rateLimit.status, rateLimit.body, rateLimit.headers);
      }

      const device = await dependencies.verifyDevice({
        userId: auth.userId,
        sessionId: auth.sessionId,
        token: request.headers.get("x-factu-device-token"),
        userAgent: request.headers.get("user-agent"),
      });
      if (!device.allowed) {
        return json(device.status, {
          ok: false,
          error: { code: device.code, message: device.message },
        });
      }

      let body: CentralInvoiceAuthorityIssueRouteBody;
      try {
        body = parseBody(await (request.readBody?.() ?? Promise.resolve("")));
      } catch (error) {
        return json(
          error instanceof Error && error.message === "REQUEST_BODY_TOO_LARGE"
            ? 413
            : 400,
          {
            ok: false,
            error: {
              code:
                error instanceof Error ? error.message : "INVALID_REQUEST_BODY",
            },
          },
        );
      }

      const rpcClient = dependencies.getRpcClient();
      if (!rpcClient) {
        return json(503, {
          ok: false,
          error: { code: "CENTRAL_AUTHORITY_RPC_UNAVAILABLE" },
        });
      }

      const issueInput: CentralInvoiceAuthorityIssueInput = {
        kind: body.kind,
        auth: {
          userId: auth.userId,
          deviceId: device.deviceId,
          sessionId: auth.sessionId,
          userIdSource: "server",
        },
        idempotencyKey: body.idempotencyKey,
        draft: body.draft,
        series: body.series,
        issuedAt: body.issuedAt,
        rectifiesIdentityId: body.rectifiesIdentityId,
      };

      try {
        const result = await issueCentralInvoiceWithAuthority({
          issueInput,
          documentPayload: body.documentPayload,
          emittedSnapshot: body.emittedSnapshot,
          emittedHash: body.emittedHash,
          rpcClient,
          userEmail: auth.userEmail,
        });

        return json(200, {
          ok: true,
          schema: CENTRAL_INVOICE_AUTHORITY_ISSUE_ROUTE,
          activation: result.activation,
          commandSafeSummary: result.commandSafeSummary,
          transactionStepIds: result.transactionStepIds,
          rpcResult: result.rpcResult,
        });
      } catch (error) {
        if (error instanceof CentralInvoiceAuthorityIssueCommandError) {
          return commandErrorResponse(error);
        }
        if (error instanceof CentralInvoiceAuthorityIssueServiceError) {
          return serviceErrorResponse(error);
        }
        if (error instanceof CentralInvoiceAuthorityIssueRpcAdapterError) {
          return rpcErrorResponse(error);
        }
        return json(500, {
          ok: false,
          error: { code: "CENTRAL_AUTHORITY_ISSUE_FAILED" },
        });
      }
    },
  };
}
