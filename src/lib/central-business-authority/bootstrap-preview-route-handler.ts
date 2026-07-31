import {
  buildCentralBusinessBootstrapPreview,
  type CentralBusinessBootstrapCentralRow,
  type CentralBusinessBootstrapEntityInput,
} from "./bootstrap-preview";
import { decodeCentralBusinessBootstrapRequestBody } from "./bootstrap-request-body";

assertServerOnlyModule();

export const CENTRAL_BUSINESS_BOOTSTRAP_PREVIEW_ROUTE =
  "CENTRAL_BUSINESS_BOOTSTRAP_PREVIEW_ROUTE_V1";
const MAX_ENTITIES = 5_000;
const MAX_BODY_BYTES = 4 * 1024 * 1024;
const MAX_DECODED_BODY_BYTES = 16 * 1024 * 1024;

interface BootstrapPreviewBody {
  entities: CentralBusinessBootstrapEntityInput[];
}

export interface CentralBusinessBootstrapPreviewRouteRequest {
  method: string;
  headers: Headers;
  readBody?: () => Promise<string>;
}

export interface CentralBusinessBootstrapPreviewRouteResponse {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}

export interface CentralBusinessBootstrapPreviewRouteDependencies {
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
    request: CentralBusinessBootstrapPreviewRouteRequest,
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
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "La ruta de vista previa del bootstrap solo puede cargarse en servidor.",
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
): CentralBusinessBootstrapPreviewRouteResponse {
  return { status, body, headers: privateHeaders(extra) };
}

function parseBody(raw: string): BootstrapPreviewBody {
  const decoded = decodeCentralBusinessBootstrapRequestBody(raw, {
    maxRawBytes: MAX_BODY_BYTES,
    maxDecodedBytes: MAX_DECODED_BODY_BYTES,
  });
  if (!decoded.ok) throw new Error(decoded.code);
  let value: unknown;
  try {
    value = JSON.parse(decoded.body);
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
  return value as BootstrapPreviewBody;
}

export function createCentralBusinessBootstrapPreviewRouteHandler(
  dependencies: CentralBusinessBootstrapPreviewRouteDependencies,
) {
  return {
    async handle(
      request: CentralBusinessBootstrapPreviewRouteRequest,
    ): Promise<CentralBusinessBootstrapPreviewRouteResponse> {
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

      let body: BootstrapPreviewBody;
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

      try {
        return json(200, {
          ok: true,
          schema: CENTRAL_BUSINESS_BOOTSTRAP_PREVIEW_ROUTE,
          preview: buildCentralBusinessBootstrapPreview({
            localEntities: body.entities,
            centralEntities,
          }),
        });
      } catch (error) {
        return json(400, {
          ok: false,
          error: {
            code:
              error instanceof Error
                ? error.message
                : "INVALID_BOOTSTRAP_PREVIEW",
          },
        });
      }
    },
  };
}
