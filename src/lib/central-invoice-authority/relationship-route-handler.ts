import type {
  CentralInvoiceAuthorityRelationshipRpcClient,
  CentralInvoiceAuthorityRelationshipRpcInput,
} from "./relationship-rpc-adapter";
import {
  CentralInvoiceAuthorityRelationshipRpcAdapterError,
  unlinkCentralInvoiceQuoteThroughRpc,
} from "./relationship-rpc-adapter";

assertServerOnlyModule();

export const CENTRAL_INVOICE_AUTHORITY_RELATIONSHIP_ROUTE =
  "CENTRAL_INVOICE_AUTHORITY_RELATIONSHIP_ROUTE_V1";

const MAX_BODY_BYTES = 8 * 1024;

export interface CentralInvoiceAuthorityRelationshipRouteAuth {
  userId: string;
  sessionId: string;
  userEmail?: string | null;
}

export type CentralInvoiceAuthorityRelationshipRouteDeviceGateResult =
  | { allowed: true; deviceId: string }
  | { allowed: false; status: number; code: string; message: string };

export type CentralInvoiceAuthorityRelationshipRouteRateLimitResult =
  | { allowed: true }
  | {
      allowed: false;
      status: number;
      body: unknown;
      headers?: Record<string, string>;
    };

export interface CentralInvoiceAuthorityRelationshipRouteDependencies {
  authenticate(
    authorization: string | null,
  ): Promise<CentralInvoiceAuthorityRelationshipRouteAuth | null>;
  rateLimit(
    request: CentralInvoiceAuthorityRelationshipRouteRequest,
    userId: string,
  ): Promise<CentralInvoiceAuthorityRelationshipRouteRateLimitResult>;
  verifyDevice(input: {
    userId: string;
    sessionId: string;
    token: string | null;
    userAgent: string | null;
  }): Promise<CentralInvoiceAuthorityRelationshipRouteDeviceGateResult>;
  getRpcClient(): CentralInvoiceAuthorityRelationshipRpcClient | null;
}

export interface CentralInvoiceAuthorityRelationshipRouteRequest {
  method: string;
  headers: Headers;
  readBody?: () => Promise<string>;
}

export interface CentralInvoiceAuthorityRelationshipRouteResponse {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}

interface CentralInvoiceAuthorityRelationshipRouteBody {
  idempotencyKey: string;
  documentRef: {
    serverDocumentId: string;
    identityId: string;
    expectedVersion: number;
  };
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "La ruta de relaciones centrales solo puede cargarse en servidor.",
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
): CentralInvoiceAuthorityRelationshipRouteResponse {
  return { status, body, headers: privateHeaders(headers) };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseBody(raw: string): CentralInvoiceAuthorityRelationshipRouteBody {
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    throw new Error("REQUEST_BODY_TOO_LARGE");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("INVALID_JSON");
  }
  if (
    !isObject(parsed) ||
    typeof parsed.idempotencyKey !== "string" ||
    !isObject(parsed.documentRef) ||
    typeof parsed.documentRef.serverDocumentId !== "string" ||
    typeof parsed.documentRef.identityId !== "string" ||
    typeof parsed.documentRef.expectedVersion !== "number"
  ) {
    throw new Error("INVALID_BODY");
  }
  return parsed as unknown as CentralInvoiceAuthorityRelationshipRouteBody;
}

export function createCentralInvoiceAuthorityRelationshipRouteHandler(
  dependencies: CentralInvoiceAuthorityRelationshipRouteDependencies,
) {
  return {
    async handle(
      request: CentralInvoiceAuthorityRelationshipRouteRequest,
    ): Promise<CentralInvoiceAuthorityRelationshipRouteResponse> {
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

      let body: CentralInvoiceAuthorityRelationshipRouteBody;
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
          error: { code: "CENTRAL_AUTHORITY_RELATIONSHIP_RPC_UNAVAILABLE" },
        });
      }

      const rpcInput: CentralInvoiceAuthorityRelationshipRpcInput = {
        auth: {
          userId: auth.userId,
          deviceId: device.deviceId,
          sessionId: auth.sessionId,
        },
        idempotencyKey: body.idempotencyKey,
        documentRef: body.documentRef,
      };

      try {
        const rpcResult = await unlinkCentralInvoiceQuoteThroughRpc(
          rpcClient,
          rpcInput,
        );
        return json(200, {
          ok: true,
          schema: CENTRAL_INVOICE_AUTHORITY_RELATIONSHIP_ROUTE,
          rpcResult,
        });
      } catch (error) {
        if (error instanceof CentralInvoiceAuthorityRelationshipRpcAdapterError) {
          return json(error.code === "RELATIONSHIP_RPC_REJECTED" ? 409 : 400, {
            ok: false,
            error: {
              code: error.code,
              message: error.message,
              causeCode: error.causeCode,
              causeMessage: error.causeMessage,
            },
          });
        }
        return json(500, {
          ok: false,
          error: { code: "CENTRAL_AUTHORITY_RELATIONSHIP_UPDATE_FAILED" },
        });
      }
    },
  };
}
