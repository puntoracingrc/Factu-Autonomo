import {
  evaluateCentralBusinessAuthorityActivation,
  type CentralBusinessAuthorityActivation,
} from "./activation";
import {
  probeCentralBusinessAuthorityStatusReadiness,
  type CentralBusinessAuthorityStatusProbeClient,
  type CentralBusinessAuthorityStatusReadiness,
} from "./status-readiness";

assertServerOnlyModule();

export const CENTRAL_BUSINESS_AUTHORITY_STATUS_ROUTE =
  "CENTRAL_BUSINESS_AUTHORITY_STATUS_ROUTE_V1";

export interface CentralBusinessAuthorityStatusRouteDependencies {
  authenticate(
    authorization: string | null,
  ): Promise<{
    userId: string;
    sessionId: string;
    userEmail?: string | null;
  } | null>;
  rateLimit(
    request: CentralBusinessAuthorityStatusRouteRequest,
    userId: string,
  ): Promise<
    | { allowed: true }
    | {
        allowed: false;
        status: number;
        body: unknown;
        headers?: Record<string, string>;
      }
  >;
  verifyDevice(input: {
    userId: string;
    sessionId: string;
    token: string | null;
    userAgent: string | null;
  }): Promise<
    | { allowed: true; deviceId: string }
    | { allowed: false; status: number; code: string; message: string }
  >;
  getProbeClient(): CentralBusinessAuthorityStatusProbeClient | null;
  evaluateActivation(input: {
    userId: string;
    userEmail?: string | null;
  }): CentralBusinessAuthorityActivation;
  now(): string;
}

export interface CentralBusinessAuthorityStatusRouteRequest {
  method: string;
  headers: Headers;
}

export interface CentralBusinessAuthorityStatusRouteResponse {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}

export interface CentralBusinessAuthorityStatusRouteBody {
  ok: true;
  schema: typeof CENTRAL_BUSINESS_AUTHORITY_STATUS_ROUTE;
  activation: CentralBusinessAuthorityActivation;
  readiness: CentralBusinessAuthorityStatusReadiness;
  summary: {
    writesPossible: boolean;
    modeAllowsWrites: boolean;
    serverSchemaReady: boolean;
    deviceVerified: true;
  };
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "La ruta de estado de datos de negocio solo puede cargarse en servidor.",
    );
  }
}

function json(
  status: number,
  body: unknown,
  extra: Record<string, string> = {},
): CentralBusinessAuthorityStatusRouteResponse {
  return {
    status,
    body,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "CDN-Cache-Control": "no-store",
      "Vercel-CDN-Cache-Control": "no-store",
      Pragma: "no-cache",
      Vary: "Authorization, X-Factu-Device-Token",
      ...extra,
    },
  };
}

export function createCentralBusinessAuthorityStatusRouteHandler(
  dependencies: CentralBusinessAuthorityStatusRouteDependencies,
) {
  return {
    async handle(
      request: CentralBusinessAuthorityStatusRouteRequest,
    ): Promise<CentralBusinessAuthorityStatusRouteResponse> {
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
      const limited = await dependencies.rateLimit(request, auth.userId);
      if (!limited.allowed) {
        return json(limited.status, limited.body, limited.headers);
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
        userEmail: auth.userEmail,
      });
      const readiness = await probeCentralBusinessAuthorityStatusReadiness({
        client: dependencies.getProbeClient(),
        checkedAt: dependencies.now(),
      });
      return json(200, {
        ok: true,
        schema: CENTRAL_BUSINESS_AUTHORITY_STATUS_ROUTE,
        activation,
        readiness,
        summary: {
          writesPossible: activation.writesEnabled && readiness.ready,
          modeAllowsWrites: activation.writesEnabled,
          serverSchemaReady: readiness.ready,
          deviceVerified: true,
        },
      } satisfies CentralBusinessAuthorityStatusRouteBody);
    },
  };
}

export const defaultCentralBusinessAuthorityStatusRouteDependencies = {
  evaluateActivation: evaluateCentralBusinessAuthorityActivation,
  now: () => new Date().toISOString(),
};
