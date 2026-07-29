import {
  evaluateCentralBusinessAuthorityActivation,
} from "./activation";
import {
  CentralBusinessMutationCommandError,
  type CentralBusinessEntityType,
  type CentralBusinessJson,
  type CentralBusinessOperationKind,
} from "./mutation-command";
import {
  CentralBusinessMutationRpcError,
  type CentralBusinessMutationRpcClient,
} from "./mutation-rpc-adapter";
import {
  CentralBusinessMutationServiceError,
  mutateCentralBusinessEntity,
} from "./mutation-service";

assertServerOnlyModule();

export const CENTRAL_BUSINESS_MUTATION_ROUTE =
  "CENTRAL_BUSINESS_MUTATION_ROUTE_V1";
const MAX_BODY_BYTES = 256 * 1024;

export interface CentralBusinessMutationRouteAuth {
  userId: string;
  sessionId: string;
  userEmail?: string | null;
}

export interface CentralBusinessMutationRouteRequest {
  method: string;
  headers: Headers;
  readBody?: () => Promise<string>;
}

export interface CentralBusinessMutationRouteResponse {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}

export interface CentralBusinessMutationRouteDependencies {
  authenticate(
    authorization: string | null,
  ): Promise<CentralBusinessMutationRouteAuth | null>;
  rateLimit(
    request: CentralBusinessMutationRouteRequest,
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
  getRpcClient(): CentralBusinessMutationRpcClient | null;
}

interface MutationBody {
  idempotencyKey: string;
  operationKind: CentralBusinessOperationKind;
  entityType: CentralBusinessEntityType;
  entityId: string;
  expectedVersion: number;
  payload: CentralBusinessJson | null;
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "La ruta central de datos de negocio solo puede cargarse en servidor.",
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
): CentralBusinessMutationRouteResponse {
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

function parseBody(raw: string): MutationBody {
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
    typeof value.idempotencyKey !== "string" ||
    typeof value.operationKind !== "string" ||
    typeof value.entityType !== "string" ||
    typeof value.entityId !== "string" ||
    typeof value.expectedVersion !== "number" ||
    !isJson(value.payload)
  ) {
    throw new Error("INVALID_BODY");
  }
  return value as unknown as MutationBody;
}

function rpcRejection(error: CentralBusinessMutationRpcError) {
  if (error.causeCode === "P4102") {
    return {
      status: 409,
      code: "CENTRAL_BUSINESS_IDEMPOTENCY_CONFLICT",
      message:
        "La clave de operacion ya se utilizo para un cambio diferente.",
    };
  }
  if (error.causeCode === "P4103") {
    return {
      status: 409,
      code: "CENTRAL_BUSINESS_VERSION_CONFLICT",
      message:
        "El registro cambio en otro dispositivo. Revisa la version central antes de continuar.",
    };
  }
  if (error.causeCode === "P4104") {
    return {
      status: 404,
      code: "CENTRAL_BUSINESS_ENTITY_NOT_FOUND",
      message: "El registro central ya no existe.",
    };
  }
  return {
    status: error.code === "RPC_REJECTED" ? 409 : 502,
    code: error.code,
    message: error.message,
  };
}

export function createCentralBusinessMutationRouteHandler(
  dependencies: CentralBusinessMutationRouteDependencies,
) {
  return {
    async handle(
      request: CentralBusinessMutationRouteRequest,
    ): Promise<CentralBusinessMutationRouteResponse> {
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

      let body: MutationBody;
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

      try {
        const result = await mutateCentralBusinessEntity({
          mutation: {
            auth: {
              userId: auth.userId,
              deviceId: device.deviceId,
              sessionId: auth.sessionId,
              userIdSource: "server",
            },
            ...body,
          },
          rpcClient,
          userEmail: auth.userEmail,
          activation,
        });
        return json(200, {
          ok: true,
          schema: CENTRAL_BUSINESS_MUTATION_ROUTE,
          activation: result.activation,
          result: result.rpcResult,
        });
      } catch (error) {
        if (error instanceof CentralBusinessMutationCommandError) {
          return json(400, {
            ok: false,
            error: { code: error.code, message: error.message },
          });
        }
        if (error instanceof CentralBusinessMutationServiceError) {
          return json(409, {
            ok: false,
            error: {
              code: error.code,
              message: error.message,
              activation: error.activation,
            },
          });
        }
        if (error instanceof CentralBusinessMutationRpcError) {
          const rejection = rpcRejection(error);
          return json(rejection.status, {
            ok: false,
            error: {
              code: rejection.code,
              message: rejection.message,
              causeCode: error.causeCode,
            },
          });
        }
        return json(500, {
          ok: false,
          error: { code: "CENTRAL_BUSINESS_MUTATION_FAILED" },
        });
      }
    },
  };
}
