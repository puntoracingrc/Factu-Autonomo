import type {
  CentralInvoiceAuthorityCollectionDocumentStatus,
  CentralInvoiceAuthorityCollectionPaymentStatus,
  CentralInvoiceAuthorityCollectionRpcClient,
  CentralInvoiceAuthorityCollectionRpcInput,
} from "./collection-rpc-adapter";
import {
  CentralInvoiceAuthorityCollectionRpcAdapterError,
  updateCentralInvoiceCollectionThroughRpc,
} from "./collection-rpc-adapter";
import type { CentralInvoiceAuthorityJson } from "./issue-rpc-adapter";

assertServerOnlyModule();

export const CENTRAL_INVOICE_AUTHORITY_COLLECTION_ROUTE =
  "CENTRAL_INVOICE_AUTHORITY_COLLECTION_ROUTE_V1";

const MAX_BODY_BYTES = 512 * 1024;

export interface CentralInvoiceAuthorityCollectionRouteAuth {
  userId: string;
  sessionId: string;
  userEmail?: string | null;
}

export type CentralInvoiceAuthorityCollectionRouteDeviceGateResult =
  | { allowed: true; deviceId: string }
  | { allowed: false; status: number; code: string; message: string };

export type CentralInvoiceAuthorityCollectionRouteRateLimitResult =
  | { allowed: true }
  | {
      allowed: false;
      status: number;
      body: unknown;
      headers?: Record<string, string>;
    };

export interface CentralInvoiceAuthorityCollectionRouteDependencies {
  authenticate(authorization: string | null): Promise<CentralInvoiceAuthorityCollectionRouteAuth | null>;
  rateLimit(
    request: CentralInvoiceAuthorityCollectionRouteRequest,
    userId: string,
  ): Promise<CentralInvoiceAuthorityCollectionRouteRateLimitResult>;
  verifyDevice(input: {
    userId: string;
    sessionId: string;
    token: string | null;
    userAgent: string | null;
  }): Promise<CentralInvoiceAuthorityCollectionRouteDeviceGateResult>;
  getRpcClient(): CentralInvoiceAuthorityCollectionRpcClient | null;
}

export interface CentralInvoiceAuthorityCollectionRouteRequest {
  method: string;
  headers: Headers;
  readBody?: () => Promise<string>;
}

export interface CentralInvoiceAuthorityCollectionRouteResponse {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}

interface CentralInvoiceAuthorityCollectionRouteBody {
  idempotencyKey: string;
  documentRef: {
    serverDocumentId: string;
    identityId: string;
    expectedVersion: number;
  };
  status: CentralInvoiceAuthorityCollectionDocumentStatus;
  paymentStatus: CentralInvoiceAuthorityCollectionPaymentStatus;
  paidAt: string | null;
  documentPayload: CentralInvoiceAuthorityJson;
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "La ruta de cobro central solo puede cargarse en servidor.",
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
): CentralInvoiceAuthorityCollectionRouteResponse {
  return { status, body, headers: privateHeaders(headers) };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isJsonObjectOrArray(value: unknown): value is CentralInvoiceAuthorityJson {
  return isObject(value) || Array.isArray(value);
}

function isCollectionBody(value: Record<string, unknown>): boolean {
  return (
    typeof value.idempotencyKey === "string" &&
    isObject(value.documentRef) &&
    typeof value.documentRef.serverDocumentId === "string" &&
    typeof value.documentRef.identityId === "string" &&
    typeof value.documentRef.expectedVersion === "number" &&
    (value.status === "enviado" ||
      value.status === "pagado" ||
      value.status === "vencido") &&
    (value.paymentStatus === "pending" ||
      value.paymentStatus === "paid" ||
      value.paymentStatus === "overdue") &&
    (value.paidAt === null || typeof value.paidAt === "string") &&
    isJsonObjectOrArray(value.documentPayload)
  );
}

function parseBody(raw: string): CentralInvoiceAuthorityCollectionRouteBody {
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    throw new Error("REQUEST_BODY_TOO_LARGE");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("INVALID_JSON");
  }

  if (!isObject(parsed) || !isCollectionBody(parsed)) {
    throw new Error("INVALID_BODY");
  }

  return parsed as unknown as CentralInvoiceAuthorityCollectionRouteBody;
}

function rpcErrorResponse(error: CentralInvoiceAuthorityCollectionRpcAdapterError) {
  return json(error.code === "COLLECTION_RPC_REJECTED" ? 409 : 400, {
    ok: false,
    error: {
      code: error.code,
      message: error.message,
      causeCode: error.causeCode,
    },
  });
}

export function createCentralInvoiceAuthorityCollectionRouteHandler(
  dependencies: CentralInvoiceAuthorityCollectionRouteDependencies,
) {
  return {
    async handle(
      request: CentralInvoiceAuthorityCollectionRouteRequest,
    ): Promise<CentralInvoiceAuthorityCollectionRouteResponse> {
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

      let body: CentralInvoiceAuthorityCollectionRouteBody;
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
          error: { code: "CENTRAL_AUTHORITY_COLLECTION_RPC_UNAVAILABLE" },
        });
      }

      const rpcInput: CentralInvoiceAuthorityCollectionRpcInput = {
        auth: {
          userId: auth.userId,
          deviceId: device.deviceId,
          sessionId: auth.sessionId,
        },
        idempotencyKey: body.idempotencyKey,
        documentRef: body.documentRef,
        status: body.status,
        paymentStatus: body.paymentStatus,
        paidAt: body.paidAt,
        documentPayload: body.documentPayload,
      };

      try {
        const rpcResult = await updateCentralInvoiceCollectionThroughRpc(
          rpcClient,
          rpcInput,
        );

        return json(200, {
          ok: true,
          schema: CENTRAL_INVOICE_AUTHORITY_COLLECTION_ROUTE,
          rpcResult,
        });
      } catch (error) {
        if (error instanceof CentralInvoiceAuthorityCollectionRpcAdapterError) {
          return rpcErrorResponse(error);
        }
        return json(500, {
          ok: false,
          error: { code: "CENTRAL_AUTHORITY_COLLECTION_UPDATE_FAILED" },
        });
      }
    },
  };
}
