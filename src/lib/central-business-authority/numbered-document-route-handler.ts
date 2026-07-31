import { evaluateCentralBusinessAuthorityActivation } from "./activation";
import type { CentralBusinessJson } from "./mutation-command";
import {
  CentralBusinessNumberedDocumentCommandError,
  type CentralBusinessDocumentSeriesReconciliationInput,
  type CentralBusinessNumberedDocumentCreateInput,
  type CentralBusinessNumberedDocumentEntityType,
} from "./numbered-document-command";
import {
  CentralBusinessNumberedDocumentRpcError,
  type CentralBusinessNumberedDocumentRpcClient,
} from "./numbered-document-rpc-adapter";
import {
  CentralBusinessNumberedDocumentServiceError,
  createCentralBusinessNumberedDocument,
  reconcileCentralBusinessDocumentSeries,
} from "./numbered-document-service";

assertServerOnlyModule();

export const CENTRAL_BUSINESS_NUMBERED_DOCUMENT_ROUTE =
  "CENTRAL_BUSINESS_NUMBERED_DOCUMENT_ROUTE_V1";
const MAX_BODY_BYTES = 512 * 1024;

export interface CentralBusinessNumberedDocumentRouteAuth {
  userId: string;
  sessionId: string;
  userEmail?: string | null;
}

export interface CentralBusinessNumberedDocumentRouteRequest {
  method: string;
  headers: Headers;
  readBody?: () => Promise<string>;
}

export interface CentralBusinessNumberedDocumentRouteResponse {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}

export interface CentralBusinessNumberedDocumentRouteDependencies {
  authenticate(
    authorization: string | null,
  ): Promise<CentralBusinessNumberedDocumentRouteAuth | null>;
  rateLimit(
    request: CentralBusinessNumberedDocumentRouteRequest,
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
  getRpcClient(): CentralBusinessNumberedDocumentRpcClient | null;
}

interface ReconcileSeriesBody {
  action: "reconcile_series";
  idempotencyKey: string;
  entityType: CentralBusinessNumberedDocumentEntityType;
  numberTemplate: string;
  fiscalYear: number;
  observedMaxSequence: number;
  sourceDocumentCount: number;
  sourceDigest: string;
}

interface CreateBody {
  action: "create";
  idempotencyKey: string;
  entityType: CentralBusinessNumberedDocumentEntityType;
  entityId: string;
  numberTemplate: string;
  padding: number;
  fiscalYear: number;
  payloadWithoutNumber: CentralBusinessJson;
}

type NumberedDocumentBody = ReconcileSeriesBody | CreateBody;

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "La ruta numerada de negocio solo puede cargarse en servidor.",
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
): CentralBusinessNumberedDocumentRouteResponse {
  return { status, body, headers: privateHeaders(extra) };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isJson(value: unknown): value is CentralBusinessJson {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    return true;
  }
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJson);
  return isObject(value) && Object.values(value).every(isJson);
}

function parseBody(raw: string): NumberedDocumentBody {
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    throw new Error("REQUEST_BODY_TOO_LARGE");
  }
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("INVALID_JSON");
  }
  if (
    !isObject(value) ||
    typeof value.action !== "string" ||
    typeof value.idempotencyKey !== "string" ||
    typeof value.entityType !== "string" ||
    typeof value.numberTemplate !== "string" ||
    typeof value.fiscalYear !== "number"
  ) {
    throw new Error("INVALID_BODY");
  }
  if (
    value.action === "reconcile_series" &&
    typeof value.observedMaxSequence === "number" &&
    typeof value.sourceDocumentCount === "number" &&
    typeof value.sourceDigest === "string"
  ) {
    return value as unknown as ReconcileSeriesBody;
  }
  if (
    value.action === "create" &&
    typeof value.entityId === "string" &&
    typeof value.padding === "number" &&
    isJson(value.payloadWithoutNumber)
  ) {
    return value as unknown as CreateBody;
  }
  throw new Error("INVALID_BODY");
}

function rpcRejection(error: CentralBusinessNumberedDocumentRpcError) {
  switch (error.causeCode) {
    case "P4102":
      return {
        status: 409,
        code: "CENTRAL_BUSINESS_IDEMPOTENCY_CONFLICT",
        message:
          "La clave de operacion ya se utilizo para un documento diferente.",
      };
    case "P4103":
      return {
        status: 409,
        code: "CENTRAL_BUSINESS_DOCUMENT_ALREADY_EXISTS",
        message:
          "Ese documento ya existe en el servidor central. Sincroniza antes de repetir la creacion.",
      };
    case "P4131":
      return {
        status: 400,
        code: "CENTRAL_BUSINESS_SERIES_RECONCILIATION_INVALID",
        message: "El inventario de numeracion no es valido.",
      };
    case "P4132":
      return {
        status: 409,
        code: "CENTRAL_BUSINESS_SERIES_UNAVAILABLE",
        message: "La serie central no esta disponible.",
      };
    case "P4133":
      return {
        status: 400,
        code: "CENTRAL_BUSINESS_NUMBERED_DOCUMENT_INVALID",
        message: "El documento numerado no es valido.",
      };
    case "P4134":
      return {
        status: 409,
        code: "CENTRAL_BUSINESS_SERIES_RECONCILIATION_REQUIRED",
        message:
          "Compara y concilia primero la numeracion existente antes de crear el documento.",
      };
    case "P4135":
      return {
        status: 409,
        code: "CENTRAL_BUSINESS_SERIES_EXHAUSTED",
        message: "La serie central ha alcanzado su limite.",
      };
    default:
      return {
        status: error.code === "RPC_REJECTED" ? 409 : 502,
        code: error.code,
        message: error.message,
      };
  }
}

export function createCentralBusinessNumberedDocumentRouteHandler(
  dependencies: CentralBusinessNumberedDocumentRouteDependencies,
) {
  return {
    async handle(
      request: CentralBusinessNumberedDocumentRouteRequest,
    ): Promise<CentralBusinessNumberedDocumentRouteResponse> {
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
      if (!activation.writesEnabled) {
        return json(409, {
          ok: false,
          error: {
            code:
              activation.effectiveMode === "shadow"
                ? "CENTRAL_BUSINESS_AUTHORITY_SHADOW_ONLY"
                : "CENTRAL_BUSINESS_AUTHORITY_DISABLED",
            activation,
          },
        });
      }

      let body: NumberedDocumentBody;
      try {
        body = parseBody(await (request.readBody?.() ?? Promise.resolve("")));
      } catch (error) {
        const code =
          error instanceof Error ? error.message : "INVALID_REQUEST_BODY";
        return json(code === "REQUEST_BODY_TOO_LARGE" ? 413 : 400, {
          ok: false,
          error: { code },
        });
      }

      const rpcClient = dependencies.getRpcClient();
      if (!rpcClient) {
        return json(503, {
          ok: false,
          error: { code: "CENTRAL_BUSINESS_RPC_UNAVAILABLE" },
        });
      }

      const serverAuth = {
        userId: auth.userId,
        deviceId: device.deviceId,
        sessionId: auth.sessionId,
        userIdSource: "server" as const,
      };
      try {
        const result =
          body.action === "reconcile_series"
            ? await reconcileCentralBusinessDocumentSeries({
                reconciliation: {
                  ...body,
                  auth: serverAuth,
                } satisfies CentralBusinessDocumentSeriesReconciliationInput,
                rpcClient,
                userEmail: auth.userEmail,
                activation,
              })
            : await createCentralBusinessNumberedDocument({
                creation: {
                  ...body,
                  auth: serverAuth,
                } satisfies CentralBusinessNumberedDocumentCreateInput,
                rpcClient,
                userEmail: auth.userEmail,
                activation,
              });
        return json(200, {
          ok: true,
          schema: CENTRAL_BUSINESS_NUMBERED_DOCUMENT_ROUTE,
          result: result.rpcResult,
        });
      } catch (error) {
        if (error instanceof CentralBusinessNumberedDocumentCommandError) {
          return json(400, {
            ok: false,
            error: { code: error.code, message: error.message },
          });
        }
        if (error instanceof CentralBusinessNumberedDocumentServiceError) {
          return json(409, {
            ok: false,
            error: {
              code: error.code,
              message: error.message,
              activation: error.activation,
            },
          });
        }
        if (error instanceof CentralBusinessNumberedDocumentRpcError) {
          const rejected = rpcRejection(error);
          return json(rejected.status, {
            ok: false,
            error: {
              code: rejected.code,
              message: rejected.message,
              causeCode: error.causeCode,
            },
          });
        }
        return json(500, {
          ok: false,
          error: { code: "CENTRAL_BUSINESS_NUMBERED_DOCUMENT_FAILED" },
        });
      }
    },
  };
}
