import {
  CENTRAL_INVOICE_AUTHORITY_CANARY_TEST_ONLY_KEY,
  evaluateCentralInvoiceAuthorityActivation,
  type CentralInvoiceAuthorityActivation,
} from "./activation";
import type { CentralInvoiceAuthorityAccountSeriesSummary } from "./account-series-inventory";
import {
  CENTRAL_INVOICE_AUTHORITY_ACCOUNT_SERIES_RECONCILIATION_RPC,
  CentralInvoiceAuthorityAccountSeriesReconciliationRpcError,
  reconcileCentralInvoiceAuthorityAccountSeriesThroughRpc,
  type CentralInvoiceAuthorityAccountSeriesReconciliationRpcClient,
  type CentralInvoiceAuthorityAccountSeriesReconciliationRpcResult,
} from "./account-series-reconciliation-rpc";

assertServerOnlyModule();

export const CENTRAL_INVOICE_AUTHORITY_ACCOUNT_SERIES_RECONCILIATION_ROUTE =
  "CENTRAL_INVOICE_AUTHORITY_ACCOUNT_SERIES_RECONCILIATION_ROUTE_V1";

const MAX_BODY_BYTES = 64 * 1024;
const MAX_SUMMARIES = 32;

export interface CentralInvoiceAuthorityAccountSeriesReconciliationRouteAuth {
  userId: string;
  sessionId: string;
  userEmail?: string | null;
}

export type CentralInvoiceAuthorityAccountSeriesReconciliationDeviceGateResult =
  | { allowed: true; deviceId: string }
  | { allowed: false; status: number; code: string; message: string };

export type CentralInvoiceAuthorityAccountSeriesReconciliationRateLimitResult =
  | { allowed: true }
  | {
      allowed: false;
      status: number;
      body: unknown;
      headers?: Record<string, string>;
    };

export interface CentralInvoiceAuthorityAccountSeriesReconciliationRouteDependencies {
  authenticate(
    authorization: string | null,
  ): Promise<CentralInvoiceAuthorityAccountSeriesReconciliationRouteAuth | null>;
  rateLimit(
    request: CentralInvoiceAuthorityAccountSeriesReconciliationRouteRequest,
    userId: string,
  ): Promise<CentralInvoiceAuthorityAccountSeriesReconciliationRateLimitResult>;
  verifyDevice(input: {
    userId: string;
    sessionId: string;
    token: string | null;
    userAgent: string | null;
  }): Promise<CentralInvoiceAuthorityAccountSeriesReconciliationDeviceGateResult>;
  getRpcClient(): CentralInvoiceAuthorityAccountSeriesReconciliationRpcClient | null;
  evaluateActivation(input: {
    userId: string;
    userEmail?: string | null;
  }): CentralInvoiceAuthorityActivation;
  env: Record<string, string | undefined>;
}

export interface CentralInvoiceAuthorityAccountSeriesReconciliationRouteRequest {
  method: string;
  headers: Headers;
  readBody?: () => Promise<string>;
}

export interface CentralInvoiceAuthorityAccountSeriesReconciliationRouteResponse {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}

interface ReconciliationBody {
  schema: "CENTRAL_INVOICE_AUTHORITY_ACCOUNT_SERIES_RECONCILIATION_REQUEST_V1";
  confirmed: true;
  summaries: CentralInvoiceAuthorityAccountSeriesSummary[];
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "La conciliacion de series centrales solo puede cargarse en servidor.",
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
): CentralInvoiceAuthorityAccountSeriesReconciliationRouteResponse {
  return { status, body, headers: privateHeaders(headers) };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isSummary(
  value: unknown,
): value is CentralInvoiceAuthorityAccountSeriesSummary {
  if (!isObject(value)) return false;
  return (
    (value.environment === "test" || value.environment === "production") &&
    typeof value.issuerNif === "string" &&
    typeof value.seriesCode === "string" &&
    typeof value.fiscalYear === "number" &&
    typeof value.observedMaxSequence === "number" &&
    typeof value.sourceDocumentCount === "number" &&
    typeof value.sourceDigest === "string"
  );
}

function parseBody(raw: string): ReconciliationBody {
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
    parsed.schema !==
      "CENTRAL_INVOICE_AUTHORITY_ACCOUNT_SERIES_RECONCILIATION_REQUEST_V1" ||
    parsed.confirmed !== true ||
    !Array.isArray(parsed.summaries) ||
    parsed.summaries.length === 0 ||
    parsed.summaries.length > MAX_SUMMARIES ||
    !parsed.summaries.every(isSummary)
  ) {
    throw new Error("INVALID_BODY");
  }
  return parsed as unknown as ReconciliationBody;
}

function activationError(activation: CentralInvoiceAuthorityActivation) {
  return json(409, {
    ok: false,
    error: {
      code: "CENTRAL_AUTHORITY_DISABLED",
      message:
        "La autoridad central no esta habilitada para conciliar esta cuenta.",
      activation,
    },
  });
}

export function createCentralInvoiceAuthorityAccountSeriesReconciliationRouteHandler(
  dependencies: CentralInvoiceAuthorityAccountSeriesReconciliationRouteDependencies,
) {
  return {
    async handle(
      request: CentralInvoiceAuthorityAccountSeriesReconciliationRouteRequest,
    ): Promise<CentralInvoiceAuthorityAccountSeriesReconciliationRouteResponse> {
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

      const activation = dependencies.evaluateActivation({
        userId: auth.userId,
        userEmail: auth.userEmail,
      });
      if (!activation.fiscalWritesEnabled) {
        return activationError(activation);
      }

      let body: ReconciliationBody;
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

      if (
        activation.effectiveMode === "canary" &&
        dependencies.env[
          CENTRAL_INVOICE_AUTHORITY_CANARY_TEST_ONLY_KEY
        ] === "true" &&
        body.summaries.some((summary) => summary.environment !== "test")
      ) {
        return json(409, {
          ok: false,
          error: {
            code: "CENTRAL_AUTHORITY_CANARY_TEST_ONLY",
            message:
              "El canario central solo puede conciliar series de pruebas.",
          },
        });
      }

      const rpcClient = dependencies.getRpcClient();
      if (!rpcClient) {
        return json(503, {
          ok: false,
          error: { code: "CENTRAL_AUTHORITY_RPC_UNAVAILABLE" },
        });
      }

      try {
        const results: CentralInvoiceAuthorityAccountSeriesReconciliationRpcResult[] =
          [];
        for (const summary of body.summaries) {
          results.push(
            await reconcileCentralInvoiceAuthorityAccountSeriesThroughRpc(
              rpcClient,
              {
                userId: auth.userId,
                deviceId: device.deviceId,
                sessionId: auth.sessionId,
                summary,
              },
            ),
          );
        }
        return json(200, {
          ok: true,
          schema:
            CENTRAL_INVOICE_AUTHORITY_ACCOUNT_SERIES_RECONCILIATION_ROUTE,
          rpcSchema:
            CENTRAL_INVOICE_AUTHORITY_ACCOUNT_SERIES_RECONCILIATION_RPC,
          results,
        });
      } catch (error) {
        if (
          error instanceof
          CentralInvoiceAuthorityAccountSeriesReconciliationRpcError
        ) {
          return json(error.code === "INVALID_RPC_INPUT" ? 400 : 502, {
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
          error: { code: "CENTRAL_AUTHORITY_RECONCILIATION_FAILED" },
        });
      }
    },
  };
}

export const defaultCentralInvoiceAuthorityAccountSeriesReconciliationRouteDependencies =
  {
    evaluateActivation: evaluateCentralInvoiceAuthorityActivation,
    env: process.env,
  };
