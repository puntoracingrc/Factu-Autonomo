import {
  CentralInvoiceAuthorityEventsRpcAdapterError,
  listCentralInvoiceAuthorityEventsThroughRpc,
  type CentralInvoiceAuthorityEventsRpcClient,
  type CentralInvoiceAuthorityPulledEvent,
} from "./events-rpc-adapter";

// CENTRAL_INVOICE_AUTHORITY_EVENTS_ROUTE_V1
assertServerOnlyModule();

export const CENTRAL_INVOICE_AUTHORITY_EVENTS_ROUTE =
  "CENTRAL_INVOICE_AUTHORITY_EVENTS_ROUTE_V1";

export interface CentralInvoiceAuthorityEventsRouteAuth {
  userId: string;
  sessionId: string;
}

export type CentralInvoiceAuthorityEventsRouteDeviceGateResult =
  | { allowed: true; deviceId: string }
  | { allowed: false; status: number; code: string; message: string };

export type CentralInvoiceAuthorityEventsRouteRateLimitResult =
  | { allowed: true }
  | {
      allowed: false;
      status: number;
      body: unknown;
      headers?: Record<string, string>;
    };

export interface CentralInvoiceAuthorityEventsRouteDependencies {
  authenticate(authorization: string | null): Promise<CentralInvoiceAuthorityEventsRouteAuth | null>;
  rateLimit(
    request: CentralInvoiceAuthorityEventsRouteRequest,
    userId: string,
  ): Promise<CentralInvoiceAuthorityEventsRouteRateLimitResult>;
  verifyDevice(input: {
    userId: string;
    sessionId: string;
    token: string | null;
    userAgent: string | null;
  }): Promise<CentralInvoiceAuthorityEventsRouteDeviceGateResult>;
  getRpcClient(): CentralInvoiceAuthorityEventsRpcClient | null;
}

export interface CentralInvoiceAuthorityEventsRouteRequest {
  method: string;
  headers: Headers;
  url?: string;
}

export interface CentralInvoiceAuthorityEventsRouteResponse {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}

interface EventsQuery {
  afterCreatedAt: string | null;
  afterEventId: string | null;
  limit: number;
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "La ruta de eventos de autoridad central solo puede cargarse en servidor.",
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
): CentralInvoiceAuthorityEventsRouteResponse {
  return { status, body, headers: privateHeaders(headers) };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function parseQuery(url: string | undefined): EventsQuery {
  const parsed = new URL(url ?? "http://localhost/api/central-invoice-authority/events");
  const afterCreatedAt = parsed.searchParams.get("afterCreatedAt")?.trim() || null;
  const afterEventId = parsed.searchParams.get("afterEventId")?.trim() || null;
  const rawLimit = parsed.searchParams.get("limit")?.trim() || "";
  const limit = rawLimit ? Number.parseInt(rawLimit, 10) : 50;

  if (afterCreatedAt && Number.isNaN(Date.parse(afterCreatedAt))) {
    throw new Error("INVALID_AFTER_CREATED_AT");
  }
  if (afterEventId && !isUuid(afterEventId)) {
    throw new Error("INVALID_AFTER_EVENT_ID");
  }
  if ((rawLimit && !/^\d+$/.test(rawLimit)) || !Number.isInteger(limit)) {
    throw new Error("INVALID_LIMIT");
  }

  return {
    afterCreatedAt,
    afterEventId,
    limit: Math.min(Math.max(limit, 1), 100),
  };
}

function nextCursor(events: readonly CentralInvoiceAuthorityPulledEvent[]) {
  const last = events.at(-1);
  if (!last) return null;
  return {
    afterCreatedAt: last.createdAt,
    afterEventId: last.eventId,
  };
}

function rpcErrorResponse(error: CentralInvoiceAuthorityEventsRpcAdapterError) {
  return json(error.code === "EVENTS_RPC_REJECTED" ? 502 : 500, {
    ok: false,
    error: {
      code: error.code,
      message: error.message,
      causeCode: error.causeCode,
    },
  });
}

export function createCentralInvoiceAuthorityEventsRouteHandler(
  dependencies: CentralInvoiceAuthorityEventsRouteDependencies,
) {
  return {
    async handle(
      request: CentralInvoiceAuthorityEventsRouteRequest,
    ): Promise<CentralInvoiceAuthorityEventsRouteResponse> {
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

      let query: EventsQuery;
      try {
        query = parseQuery(request.url);
      } catch (error) {
        return json(400, {
          ok: false,
          error: {
            code: error instanceof Error ? error.message : "INVALID_QUERY",
          },
        });
      }

      const rpcClient = dependencies.getRpcClient();
      if (!rpcClient) {
        return json(503, {
          ok: false,
          error: { code: "CENTRAL_AUTHORITY_EVENTS_RPC_UNAVAILABLE" },
        });
      }

      try {
        const events = await listCentralInvoiceAuthorityEventsThroughRpc(
          rpcClient,
          {
            userId: auth.userId,
            deviceId: device.deviceId,
            afterCreatedAt: query.afterCreatedAt,
            afterEventId: query.afterEventId,
            limit: query.limit,
          },
        );

        return json(200, {
          ok: true,
          schema: CENTRAL_INVOICE_AUTHORITY_EVENTS_ROUTE,
          events,
          nextCursor: nextCursor(events),
        });
      } catch (error) {
        if (error instanceof CentralInvoiceAuthorityEventsRpcAdapterError) {
          return rpcErrorResponse(error);
        }
        return json(500, {
          ok: false,
          error: { code: "CENTRAL_AUTHORITY_EVENTS_PULL_FAILED" },
        });
      }
    },
  };
}
