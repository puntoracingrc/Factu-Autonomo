import {
  evaluateCentralInvoiceAuthorityActivation,
  type CentralInvoiceAuthorityActivation,
} from "./activation";
import {
  probeCentralInvoiceAuthorityStatusReadiness,
  type CentralInvoiceAuthorityStatusProbeClient,
  type CentralInvoiceAuthorityStatusReadiness,
} from "./status-readiness";

// CENTRAL_INVOICE_AUTHORITY_STATUS_ROUTE_V1
assertServerOnlyModule();

export const CENTRAL_INVOICE_AUTHORITY_STATUS_ROUTE =
  "CENTRAL_INVOICE_AUTHORITY_STATUS_ROUTE_V1";

export interface CentralInvoiceAuthorityStatusRouteAuth {
  userId: string;
  sessionId: string;
}

export type CentralInvoiceAuthorityStatusRouteDeviceGateResult =
  | { allowed: true; deviceId: string }
  | { allowed: false; status: number; code: string; message: string };

export type CentralInvoiceAuthorityStatusRouteRateLimitResult =
  | { allowed: true }
  | {
      allowed: false;
      status: number;
      body: unknown;
      headers?: Record<string, string>;
    };

export interface CentralInvoiceAuthorityStatusRouteDependencies {
  authenticate(authorization: string | null): Promise<CentralInvoiceAuthorityStatusRouteAuth | null>;
  rateLimit(
    request: CentralInvoiceAuthorityStatusRouteRequest,
    userId: string,
  ): Promise<CentralInvoiceAuthorityStatusRouteRateLimitResult>;
  verifyDevice(input: {
    userId: string;
    sessionId: string;
    token: string | null;
    userAgent: string | null;
  }): Promise<CentralInvoiceAuthorityStatusRouteDeviceGateResult>;
  getProbeClient(): CentralInvoiceAuthorityStatusProbeClient | null;
  evaluateActivation(input: { userId: string }): CentralInvoiceAuthorityActivation;
  now(): string;
}

export interface CentralInvoiceAuthorityStatusRouteRequest {
  method: string;
  headers: Headers;
  url?: string;
}

export interface CentralInvoiceAuthorityStatusRouteResponse {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}

export interface CentralInvoiceAuthorityStatusRouteBody {
  ok: true;
  schema: typeof CENTRAL_INVOICE_AUTHORITY_STATUS_ROUTE;
  activation: CentralInvoiceAuthorityActivation;
  readiness: CentralInvoiceAuthorityStatusReadiness;
  summary: {
    fiscalWritesPossible: boolean;
    modeAllowsWrites: boolean;
    serverSchemaReady: boolean;
    deviceVerified: true;
  };
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "La ruta de estado de autoridad central solo puede cargarse en servidor.",
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
): CentralInvoiceAuthorityStatusRouteResponse {
  return { status, body, headers: privateHeaders(headers) };
}

export function createCentralInvoiceAuthorityStatusRouteHandler(
  dependencies: CentralInvoiceAuthorityStatusRouteDependencies,
) {
  return {
    async handle(
      request: CentralInvoiceAuthorityStatusRouteRequest,
    ): Promise<CentralInvoiceAuthorityStatusRouteResponse> {
      if (request.method === "OPTIONS") {
        return json(204, { ok: true }, { Allow: "GET, OPTIONS" });
      }
      if (request.method !== "GET") {
        return json(
          405,
          { ok: false, error: { code: "METHOD_NOT_ALLOWED" } },
          { Allow: "GET, OPTIONS" },
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

      const activation = dependencies.evaluateActivation({
        userId: auth.userId,
      });
      const readiness = await probeCentralInvoiceAuthorityStatusReadiness({
        client: dependencies.getProbeClient(),
        checkedAt: dependencies.now(),
      });

      return json(200, {
        ok: true,
        schema: CENTRAL_INVOICE_AUTHORITY_STATUS_ROUTE,
        activation,
        readiness,
        summary: {
          fiscalWritesPossible:
            activation.fiscalWritesEnabled && readiness.ready,
          modeAllowsWrites: activation.fiscalWritesEnabled,
          serverSchemaReady: readiness.ready,
          deviceVerified: true,
        },
      } satisfies CentralInvoiceAuthorityStatusRouteBody);
    },
  };
}

export const defaultCentralInvoiceAuthorityStatusRouteDependencies = {
  evaluateActivation: evaluateCentralInvoiceAuthorityActivation,
  now: () => new Date().toISOString(),
};
