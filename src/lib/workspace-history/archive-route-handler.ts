import type { Document } from "@/lib/types";

import {
  historicalWorkspaceDocumentHash,
  type HistoricalWorkspaceArchiveDocument,
} from "./archive";

assertServerOnlyModule();

export const CENTRAL_WORKSPACE_HISTORICAL_ARCHIVE_ROUTE =
  "CENTRAL_WORKSPACE_HISTORICAL_ARCHIVE_ROUTE_V1";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/u;

export interface HistoricalWorkspaceArchiveStatusRow {
  archiveId: string;
  status: "uploading" | "ready";
  expectedDocumentCount: number;
  storedDocumentCount: number;
  manifestHash: string;
  completedAt: string | null;
}

export interface HistoricalWorkspaceArchiveRouteRequest {
  method: string;
  headers: Headers;
  url?: string;
  readBody?: () => Promise<string>;
}

export interface HistoricalWorkspaceArchiveRouteResponse {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}

interface AuthenticatedArchiveUser {
  userId: string;
  sessionId: string;
}

export interface HistoricalWorkspaceArchiveRouteDependencies {
  authenticate(
    authorization: string | null,
  ): Promise<AuthenticatedArchiveUser | null>;
  rateLimit(
    request: HistoricalWorkspaceArchiveRouteRequest,
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
  readStatus(userId: string): Promise<HistoricalWorkspaceArchiveStatusRow | null>;
  readPage(input: {
    userId: string;
    archiveId: string;
    after: string;
    limit: number;
  }): Promise<HistoricalWorkspaceArchiveDocument[]>;
  begin(input: {
    userId: string;
    archiveId: string;
    expectedDocumentCount: number;
    manifestHash: string;
  }): Promise<HistoricalWorkspaceArchiveStatusRow>;
  append(input: {
    userId: string;
    archiveId: string;
    documents: HistoricalWorkspaceArchiveDocument[];
  }): Promise<{ archiveId: string; storedDocumentCount: number }>;
  finalize(input: {
    userId: string;
    archiveId: string;
  }): Promise<HistoricalWorkspaceArchiveStatusRow>;
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error("El archivo histórico solo puede servirse desde el servidor.");
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
): HistoricalWorkspaceArchiveRouteResponse {
  return { status, body, headers: privateHeaders(extra) };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validStatus(value: HistoricalWorkspaceArchiveStatusRow): boolean {
  const completionIsValid =
    value.status === "uploading"
      ? value.completedAt === null
      : value.storedDocumentCount === value.expectedDocumentCount &&
        typeof value.completedAt === "string" &&
        Number.isFinite(Date.parse(value.completedAt));
  return Boolean(
    UUID_PATTERN.test(value.archiveId) &&
      (value.status === "uploading" || value.status === "ready") &&
      Number.isInteger(value.expectedDocumentCount) &&
      value.expectedDocumentCount >= 1 &&
      value.expectedDocumentCount <= 10_000 &&
      Number.isInteger(value.storedDocumentCount) &&
      value.storedDocumentCount >= 0 &&
      value.storedDocumentCount <= value.expectedDocumentCount &&
      SHA256_PATTERN.test(value.manifestHash) &&
      completionIsValid,
  );
}

function parsePullQuery(url: string | undefined) {
  const parsed = new URL(
    url ?? "http://localhost/api/workspace-history/archive",
  );
  const action = parsed.searchParams.get("action")?.trim() || "status";
  if (action === "status") return { action } as const;
  if (action !== "pull") throw new Error("INVALID_ACTION");
  const after = parsed.searchParams.get("after")?.trim() ?? "";
  const rawLimit = parsed.searchParams.get("limit")?.trim() || "50";
  if (after.length > 200 || !/^\d+$/u.test(rawLimit)) {
    throw new Error("INVALID_CURSOR");
  }
  const limit = Number(rawLimit);
  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new Error("INVALID_CURSOR");
  }
  return { action, after, limit: Math.min(limit, 100) } as const;
}

function parseBody(raw: string): Record<string, unknown> {
  const parsed = JSON.parse(raw) as unknown;
  if (!isObject(parsed)) throw new Error("INVALID_JSON");
  return parsed;
}

function archiveDocument(value: unknown): HistoricalWorkspaceArchiveDocument {
  if (!isObject(value) || !isObject(value.payload)) {
    throw new Error("INVALID_DOCUMENT");
  }
  const localDocumentId = value.localDocumentId;
  const documentKind = value.documentKind;
  const contentHash = value.contentHash;
  const payload = value.payload;
  if (
    typeof localDocumentId !== "string" ||
    localDocumentId.length < 1 ||
    localDocumentId.length > 200 ||
    (documentKind !== "factura" &&
      documentKind !== "factura_rectificativa") ||
    typeof contentHash !== "string" ||
    !SHA256_PATTERN.test(contentHash) ||
    payload.id !== localDocumentId ||
    payload.type !== "factura" ||
    Object.prototype.hasOwnProperty.call(payload, "centralInvoiceAuthority") ||
    (documentKind === "factura_rectificativa") !==
      isObject(payload.rectification) ||
    historicalWorkspaceDocumentHash(payload as unknown as Document) !== contentHash
  ) {
    throw new Error("INVALID_DOCUMENT");
  }
  return value as unknown as HistoricalWorkspaceArchiveDocument;
}

function parsePostCommand(raw: string) {
  const body = parseBody(raw);
  const action = body.action;
  if (action === "begin") {
    if (
      typeof body.archiveId !== "string" ||
      !UUID_PATTERN.test(body.archiveId) ||
      typeof body.expectedDocumentCount !== "number" ||
      !Number.isInteger(body.expectedDocumentCount) ||
      body.expectedDocumentCount < 1 ||
      body.expectedDocumentCount > 10_000 ||
      typeof body.manifestHash !== "string" ||
      !SHA256_PATTERN.test(body.manifestHash)
    ) {
      throw new Error("INVALID_MANIFEST");
    }
    return {
      action,
      archiveId: body.archiveId,
      expectedDocumentCount: body.expectedDocumentCount,
      manifestHash: body.manifestHash,
    } as const;
  }
  if (action === "append") {
    if (
      typeof body.archiveId !== "string" ||
      !UUID_PATTERN.test(body.archiveId) ||
      !Array.isArray(body.documents) ||
      body.documents.length < 1 ||
      body.documents.length > 100
    ) {
      throw new Error("INVALID_BATCH");
    }
    return {
      action,
      archiveId: body.archiveId,
      documents: body.documents.map(archiveDocument),
    } as const;
  }
  if (action === "finalize") {
    if (
      typeof body.archiveId !== "string" ||
      !UUID_PATTERN.test(body.archiveId)
    ) {
      throw new Error("INVALID_FINALIZATION");
    }
    return { action, archiveId: body.archiveId } as const;
  }
  throw new Error("INVALID_ACTION");
}

export function createHistoricalWorkspaceArchiveRouteHandler(
  dependencies: HistoricalWorkspaceArchiveRouteDependencies,
) {
  return {
    async handle(
      request: HistoricalWorkspaceArchiveRouteRequest,
    ): Promise<HistoricalWorkspaceArchiveRouteResponse> {
      if (request.method === "OPTIONS") {
        return json(204, { ok: true }, { Allow: "GET, POST, OPTIONS" });
      }
      if (request.method !== "GET" && request.method !== "POST") {
        return json(
          405,
          { ok: false, error: { code: "METHOD_NOT_ALLOWED" } },
          { Allow: "GET, POST, OPTIONS" },
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

      try {
        if (request.method === "GET") {
          const query = parsePullQuery(request.url);
          const status = await dependencies.readStatus(auth.userId);
          if (status && !validStatus(status)) throw new Error("INVALID_STORAGE");
          if (query.action === "status") {
            return json(200, {
              ok: true,
              schema: CENTRAL_WORKSPACE_HISTORICAL_ARCHIVE_ROUTE,
              archive: status,
            });
          }
          if (!status || status.status !== "ready") {
            return json(409, {
              ok: false,
              error: { code: "ARCHIVE_NOT_READY" },
            });
          }
          const documents = await dependencies.readPage({
            userId: auth.userId,
            archiveId: status.archiveId,
            after: query.after,
            limit: query.limit,
          });
          if (documents.some((entry) => !archiveDocument(entry))) {
            throw new Error("INVALID_STORAGE");
          }
          return json(200, {
            ok: true,
            schema: CENTRAL_WORKSPACE_HISTORICAL_ARCHIVE_ROUTE,
            archive: status,
            documents,
            nextAfter: documents.at(-1)?.localDocumentId ?? query.after,
            hasMore: documents.length === query.limit,
          });
        }

        const command = parsePostCommand(await request.readBody!());
        if (command.action === "begin") {
          const archive = await dependencies.begin({
            userId: auth.userId,
            ...command,
          });
          if (!validStatus(archive)) throw new Error("INVALID_STORAGE");
          return json(200, {
            ok: true,
            schema: CENTRAL_WORKSPACE_HISTORICAL_ARCHIVE_ROUTE,
            archive,
          });
        }
        if (command.action === "append") {
          const progress = await dependencies.append({
            userId: auth.userId,
            archiveId: command.archiveId,
            documents: command.documents,
          });
          return json(200, {
            ok: true,
            schema: CENTRAL_WORKSPACE_HISTORICAL_ARCHIVE_ROUTE,
            progress,
          });
        }
        const archive = await dependencies.finalize({
          userId: auth.userId,
          archiveId: command.archiveId,
        });
        if (!validStatus(archive) || archive.status !== "ready") {
          throw new Error("INVALID_STORAGE");
        }
        return json(200, {
          ok: true,
          schema: CENTRAL_WORKSPACE_HISTORICAL_ARCHIVE_ROUTE,
          archive,
        });
      } catch (error) {
        const code = error instanceof Error ? error.message : "ARCHIVE_FAILED";
        if (
          code.startsWith("INVALID_") ||
          code === "Unexpected end of JSON input"
        ) {
          return json(400, { ok: false, error: { code } });
        }
        return json(409, {
          ok: false,
          error: {
            code: "HISTORICAL_ARCHIVE_REJECTED",
            message:
              "La recuperación histórica no se pudo confirmar. No se ha reemplazado ningún dato local.",
          },
        });
      }
    },
  };
}
