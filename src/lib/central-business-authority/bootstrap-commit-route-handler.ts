import {
  buildCentralBusinessBootstrapCommitCommand,
  CentralBusinessBootstrapCommitError,
  type CentralBusinessBootstrapCommitCommand,
} from "./bootstrap-commit";
import {
  CentralBusinessBootstrapCommitRpcError,
  type CentralBusinessBootstrapCommitRpcResult,
} from "./bootstrap-commit-rpc-adapter";
import {
  buildCentralBusinessBootstrapPreview,
  type CentralBusinessBootstrapCentralRow,
  type CentralBusinessBootstrapEntityInput,
} from "./bootstrap-preview";

assertServerOnlyModule();

export const CENTRAL_BUSINESS_BOOTSTRAP_COMMIT_ROUTE =
  "CENTRAL_BUSINESS_BOOTSTRAP_COMMIT_ROUTE_V1";
const MAX_ENTITIES = 5_000;
const MAX_BODY_BYTES = 4 * 1024 * 1024;

interface BootstrapCommitBody {
  idempotencyKey: string;
  confirmation: string;
  snapshotDigest: string;
  centralStateDigest: string;
  previewDigest: string;
  entities: CentralBusinessBootstrapEntityInput[];
}

export interface CentralBusinessBootstrapCommitRouteRequest {
  method: string;
  headers: Headers;
  readBody?: () => Promise<string>;
}

export interface CentralBusinessBootstrapCommitRouteResponse {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}

export interface CentralBusinessBootstrapCommitRouteDependencies {
  authenticate(
    authorization: string | null,
  ): Promise<{
    userId: string;
    sessionId: string;
    userEmail?: string | null;
  } | null>;
  authorize(input: {
    userId: string;
    userEmail?: string | null;
  }): boolean | Promise<boolean>;
  rateLimit(
    request: CentralBusinessBootstrapCommitRouteRequest,
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
  listCentralEntities(
    userId: string,
  ): Promise<CentralBusinessBootstrapCentralRow[] | null>;
  commit(
    command: CentralBusinessBootstrapCommitCommand,
  ): Promise<CentralBusinessBootstrapCommitRpcResult>;
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "La ruta de commit del bootstrap solo puede cargarse en servidor.",
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
): CentralBusinessBootstrapCommitRouteResponse {
  return { status, body, headers: privateHeaders(extra) };
}

function parseBody(raw: string): BootstrapCommitBody {
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
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !Array.isArray((value as { entities?: unknown }).entities) ||
    (value as { entities: unknown[] }).entities.length > MAX_ENTITIES
  ) {
    throw new Error("INVALID_BODY");
  }
  const body = value as Partial<BootstrapCommitBody>;
  if (
    typeof body.idempotencyKey !== "string" ||
    typeof body.confirmation !== "string" ||
    typeof body.snapshotDigest !== "string" ||
    typeof body.centralStateDigest !== "string" ||
    typeof body.previewDigest !== "string"
  ) {
    throw new Error("INVALID_BODY");
  }
  return body as BootstrapCommitBody;
}

export function createCentralBusinessBootstrapCommitRouteHandler(
  dependencies: CentralBusinessBootstrapCommitRouteDependencies,
) {
  return {
    async handle(
      request: CentralBusinessBootstrapCommitRouteRequest,
    ): Promise<CentralBusinessBootstrapCommitRouteResponse> {
      if (request.method !== "POST") {
        return json(
          405,
          { ok: false, error: { code: "METHOD_NOT_ALLOWED" } },
          { Allow: "POST" },
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
      if (
        !(await dependencies.authorize({
          userId: auth.userId,
          userEmail: auth.userEmail,
        }))
      ) {
        return json(403, {
          ok: false,
          error: { code: "CENTRAL_BUSINESS_BOOTSTRAP_NOT_ALLOWED" },
        });
      }

      let body: BootstrapCommitBody;
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

      const centralEntities = await dependencies.listCentralEntities(
        auth.userId,
      );
      if (centralEntities === null) {
        return json(503, {
          ok: false,
          error: { code: "CENTRAL_BUSINESS_BOOTSTRAP_UNAVAILABLE" },
        });
      }

      let preview;
      try {
        preview = buildCentralBusinessBootstrapPreview({
          localEntities: body.entities,
          centralEntities,
        });
      } catch (error) {
        return json(400, {
          ok: false,
          error: {
            code:
              error instanceof CentralBusinessBootstrapCommitError
                ? error.code
                : "INVALID_BOOTSTRAP_COMMIT",
          },
        });
      }

      const matchesPreview =
        body.snapshotDigest === preview.snapshotDigest &&
        body.centralStateDigest === preview.centralStateDigest &&
        body.previewDigest === preview.previewDigest;
      if (!matchesPreview || !preview.canCommit) {
        return json(409, {
          ok: false,
          error: {
            code: matchesPreview
              ? "BOOTSTRAP_CONFLICT"
              : "BOOTSTRAP_PREVIEW_STALE",
          },
          preview,
        });
      }

      let command: CentralBusinessBootstrapCommitCommand;
      try {
        command = buildCentralBusinessBootstrapCommitCommand({
          userId: auth.userId,
          deviceId: device.deviceId,
          sessionId: auth.sessionId,
          idempotencyKey: body.idempotencyKey,
          confirmation: body.confirmation,
          entities: body.entities,
          preview,
        });
      } catch (error) {
        return json(400, {
          ok: false,
          error: {
            code:
              error instanceof Error
                ? error.message
                : "INVALID_BOOTSTRAP_COMMIT",
          },
        });
      }

      try {
        const result = await dependencies.commit(command);
        return json(200, {
          ok: true,
          schema: CENTRAL_BUSINESS_BOOTSTRAP_COMMIT_ROUTE,
          result,
        });
      } catch (error) {
        if (error instanceof CentralBusinessBootstrapCommitRpcError) {
          if (error.causeCode === "P4112") {
            return json(409, {
              ok: false,
              error: { code: "BOOTSTRAP_IDEMPOTENCY_CONFLICT" },
            });
          }
          if (error.causeCode === "P4113") {
            return json(409, {
              ok: false,
              error: { code: "BOOTSTRAP_PREVIEW_STALE" },
            });
          }
          if (error.causeCode === "P4110") {
            return json(400, {
              ok: false,
              error: { code: "INVALID_BOOTSTRAP_COMMIT" },
            });
          }
        }
        return json(503, {
          ok: false,
          error: { code: "CENTRAL_BUSINESS_BOOTSTRAP_UNAVAILABLE" },
        });
      }
    },
  };
}
