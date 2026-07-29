import { evaluateCentralBusinessAuthorityActivation } from "./activation";
import {
  CentralBusinessEventsRpcError,
  listCentralBusinessEventsThroughRpc,
  type CentralBusinessEventsRpcClient,
} from "./events-rpc-adapter";

assertServerOnlyModule();

export const CENTRAL_BUSINESS_EVENTS_ROUTE =
  "CENTRAL_BUSINESS_EVENTS_ROUTE_V1";

export interface CentralBusinessEventsRouteDependencies {
  authenticate(
    authorization: string | null,
  ): Promise<{
    userId: string;
    sessionId: string;
    userEmail?: string | null;
  } | null>;
  rateLimit(
    request: CentralBusinessEventsRouteRequest,
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
  getRpcClient(): CentralBusinessEventsRpcClient | null;
}

export interface CentralBusinessEventsRouteRequest {
  method: string;
  headers: Headers;
  url?: string;
}

export interface CentralBusinessEventsRouteResponse {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "La ruta de eventos de negocio solo puede cargarse en servidor.",
    );
  }
}

function privateHeaders(extra: Record<string, string> = {}) {
  return {
    "Cache-Control": "private, no-store, max-age=0",
    "CDN-Cache-Control": "no-store",
    "Vercel-CDN-Cache-Control": "no-store",
    Pragma: "no-cache",
    Vary: "Authorization, X-Factu-Device-Token",
    ...extra,
  };
}

function json(
  status: number,
  body: unknown,
  extra: Record<string, string> = {},
): CentralBusinessEventsRouteResponse {
  return { status, body, headers: privateHeaders(extra) };
}

function query(url: string | undefined) {
  const parsed = new URL(
    url ?? "http://localhost/api/central-business-authority/events",
  );
  const rawAfter = parsed.searchParams.get("afterSequence")?.trim() || "0";
  const rawLimit = parsed.searchParams.get("limit")?.trim() || "100";
  if (!/^\d+$/.test(rawAfter) || !/^\d+$/.test(rawLimit)) {
    throw new Error("INVALID_CURSOR");
  }
  const afterSequence = Number(rawAfter);
  const limit = Number(rawLimit);
  if (
    !Number.isSafeInteger(afterSequence) ||
    !Number.isSafeInteger(limit) ||
    limit < 1
  ) {
    throw new Error("INVALID_CURSOR");
  }
  return { afterSequence, limit: Math.min(limit, 500) };
}

export function createCentralBusinessEventsRouteHandler(
  dependencies: CentralBusinessEventsRouteDependencies,
) {
  return {
    async handle(
      request: CentralBusinessEventsRouteRequest,
    ): Promise<CentralBusinessEventsRouteResponse> {
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

      const activation = evaluateCentralBusinessAuthorityActivation({
        userId: auth.userId,
        userEmail: auth.userEmail,
      });
      if (!activation.enabled) {
        return json(409, {
          ok: false,
          error: {
            code: "CENTRAL_BUSINESS_AUTHORITY_DISABLED",
            activation,
          },
        });
      }

      let cursor: ReturnType<typeof query>;
      try {
        cursor = query(request.url);
      } catch (error) {
        return json(400, {
          ok: false,
          error: {
            code: error instanceof Error ? error.message : "INVALID_CURSOR",
          },
        });
      }

      const rpcClient = dependencies.getRpcClient();
      if (!rpcClient) {
        return json(503, {
          ok: false,
          error: { code: "CENTRAL_BUSINESS_EVENTS_RPC_UNAVAILABLE" },
        });
      }

      try {
        const events = await listCentralBusinessEventsThroughRpc(rpcClient, {
          userId: auth.userId,
          deviceId: device.deviceId,
          ...cursor,
        });
        return json(200, {
          ok: true,
          schema: CENTRAL_BUSINESS_EVENTS_ROUTE,
          activation,
          events,
          nextSequence:
            events.at(-1)?.eventSequence ?? cursor.afterSequence,
          hasMore: events.length === cursor.limit,
        });
      } catch (error) {
        if (error instanceof CentralBusinessEventsRpcError) {
          return json(error.code === "EVENTS_RPC_REJECTED" ? 502 : 500, {
            ok: false,
            error: {
              code: error.code,
              message: error.message,
              causeCode: error.causeCode,
            },
          });
        }
        return json(500, {
          ok: false,
          error: { code: "CENTRAL_BUSINESS_EVENTS_PULL_FAILED" },
        });
      }
    },
  };
}
