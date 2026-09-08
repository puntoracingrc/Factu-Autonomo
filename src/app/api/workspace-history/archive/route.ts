import { NextResponse } from "next/server";

import { getUserSessionFromBearer } from "@/lib/billing/server-auth";
import {
  ensureCloudDeviceAccess,
  hashCloudDeviceToken,
  normalizeCloudDeviceToken,
} from "@/lib/cloud/devices";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { readTextBody } from "@/lib/server/request-body";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { HistoricalWorkspaceArchiveDocument } from "@/lib/workspace-history/archive";
import {
  createHistoricalWorkspaceArchiveRouteHandler,
  type HistoricalWorkspaceArchiveStatusRow,
} from "@/lib/workspace-history/archive-route-handler";

export const dynamic = "force-dynamic";

const MAX_ARCHIVE_BODY_BYTES = 2 * 1024 * 1024;

interface ArchiveDatabaseRow {
  archive_id: string;
  status: "uploading" | "ready";
  expected_document_count: number;
  stored_document_count: number;
  manifest_hash: string;
  completed_at: string | null;
}

interface ArchiveDocumentDatabaseRow {
  local_document_id: string;
  document_kind: "factura" | "factura_rectificativa";
  content_hash: string;
  payload: HistoricalWorkspaceArchiveDocument["payload"];
}

function archiveStatus(
  row: ArchiveDatabaseRow | null,
): HistoricalWorkspaceArchiveStatusRow | null {
  if (!row) return null;
  return {
    archiveId: row.archive_id,
    status: row.status,
    expectedDocumentCount: row.expected_document_count,
    storedDocumentCount: row.stored_document_count,
    manifestHash: row.manifest_hash,
    completedAt: row.completed_at,
  };
}

async function readStatus(userId: string) {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("ARCHIVE_DATABASE_UNAVAILABLE");
  const result = await admin
    .from("central_workspace_historical_archives")
    .select(
      "archive_id,status,expected_document_count,stored_document_count,manifest_hash,completed_at",
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (result.error) throw new Error("ARCHIVE_STATUS_FAILED");
  return archiveStatus(result.data as ArchiveDatabaseRow | null);
}

const handler = createHistoricalWorkspaceArchiveRouteHandler({
  async authenticate(authorization) {
    const identity = await getUserSessionFromBearer(authorization, {
      requireEmailConfirmed: true,
    });
    if (!identity) return null;
    return { userId: identity.user.id, sessionId: identity.sessionId };
  },
  async rateLimit(request, userId) {
    const result = await checkRateLimit(
      { headers: request.headers } as Request,
      {
        namespace: "central_workspace_historical_archive",
        limit: 240,
        windowMs: 10 * 60_000,
      },
      userId,
    );
    if (result.allowed) return { allowed: true };
    return {
      allowed: false,
      status: 429,
      body: {
        ok: false,
        error: {
          code: "RATE_LIMITED",
          retryAfterSeconds: result.retryAfterSeconds,
        },
      },
      headers: { "Retry-After": String(result.retryAfterSeconds) },
    };
  },
  async verifyDevice({ userId, sessionId, token, userAgent }) {
    const normalized = normalizeCloudDeviceToken(token);
    if (!normalized) {
      return {
        allowed: false,
        status: 400,
        code: "INVALID_DEVICE_TOKEN",
        message: "Identificador de dispositivo no válido.",
      };
    }
    const access = await ensureCloudDeviceAccess({
      userId,
      sessionId,
      token: normalized,
      userAgent: userAgent ?? undefined,
    });
    if (!access.allowed) {
      return {
        allowed: false,
        status: 403,
        code: access.reason,
        message: access.message,
      };
    }
    return { allowed: true, deviceId: hashCloudDeviceToken(normalized) };
  },
  readStatus,
  async readPage({ userId, archiveId, after, limit }) {
    const admin = getSupabaseAdmin();
    if (!admin) throw new Error("ARCHIVE_DATABASE_UNAVAILABLE");
    let query = admin
      .from("central_workspace_historical_documents")
      .select("local_document_id,document_kind,content_hash,payload")
      .eq("user_id", userId)
      .eq("archive_id", archiveId)
      .order("local_document_id", { ascending: true })
      .limit(limit);
    if (after) query = query.gt("local_document_id", after);
    const result = await query;
    if (result.error) throw new Error("ARCHIVE_PULL_FAILED");
    return (result.data as ArchiveDocumentDatabaseRow[]).map((row) => ({
      localDocumentId: row.local_document_id,
      documentKind: row.document_kind,
      contentHash: row.content_hash,
      payload: row.payload,
    }));
  },
  async begin(input) {
    const admin = getSupabaseAdmin();
    if (!admin) throw new Error("ARCHIVE_DATABASE_UNAVAILABLE");
    const result = await admin.rpc(
      "begin_central_workspace_historical_archive_v1",
      {
        p_user_id: input.userId,
        p_archive_id: input.archiveId,
        p_expected_document_count: input.expectedDocumentCount,
        p_manifest_hash: input.manifestHash,
      },
    );
    if (result.error || !Array.isArray(result.data) || !result.data[0]) {
      throw new Error("ARCHIVE_BEGIN_FAILED");
    }
    const row = result.data[0] as {
      archive_id: string;
      result_status: "uploading" | "ready";
      expected_document_count: number;
      stored_document_count: number;
      manifest_hash: string;
      completed_at: string | null;
    };
    return {
      archiveId: row.archive_id,
      status: row.result_status,
      expectedDocumentCount: row.expected_document_count,
      storedDocumentCount: row.stored_document_count,
      manifestHash: row.manifest_hash,
      completedAt: row.completed_at,
    };
  },
  async append(input) {
    const admin = getSupabaseAdmin();
    if (!admin) throw new Error("ARCHIVE_DATABASE_UNAVAILABLE");
    const result = await admin.rpc(
      "append_central_workspace_historical_archive_v1",
      {
        p_user_id: input.userId,
        p_archive_id: input.archiveId,
        p_documents: input.documents,
      },
    );
    if (result.error || !Array.isArray(result.data) || !result.data[0]) {
      throw new Error("ARCHIVE_APPEND_FAILED");
    }
    const row = result.data[0] as {
      archive_id: string;
      stored_document_count: number;
    };
    return {
      archiveId: row.archive_id,
      storedDocumentCount: row.stored_document_count,
    };
  },
  async finalize(input) {
    const admin = getSupabaseAdmin();
    if (!admin) throw new Error("ARCHIVE_DATABASE_UNAVAILABLE");
    const result = await admin.rpc(
      "finalize_central_workspace_historical_archive_v1",
      { p_user_id: input.userId, p_archive_id: input.archiveId },
    );
    if (result.error) throw new Error("ARCHIVE_FINALIZE_FAILED");
    const status = await readStatus(input.userId);
    if (!status) throw new Error("ARCHIVE_STATUS_FAILED");
    return status;
  },
});

function response(result: {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}) {
  if (result.status === 204) {
    return new NextResponse(null, {
      status: result.status,
      headers: result.headers,
    });
  }
  return NextResponse.json(result.body, {
    status: result.status,
    headers: result.headers,
  });
}

export async function GET(request: Request) {
  return response(
    await handler.handle({
      method: "GET",
      headers: request.headers,
      url: request.url,
    }),
  );
}

export async function POST(request: Request) {
  return response(
    await handler.handle({
      method: "POST",
      headers: request.headers,
      url: request.url,
      readBody: async () => {
        const body = await readTextBody(request, {
          maxBytes: MAX_ARCHIVE_BODY_BYTES,
          invalidMessage: "JSON inválido",
          tooLargeMessage: "Lote histórico demasiado grande",
        });
        if (!body.ok) {
          throw new Error(
            body.response.status === 413
              ? "REQUEST_BODY_TOO_LARGE"
              : "INVALID_JSON",
          );
        }
        return body.data;
      },
    }),
  );
}

export async function OPTIONS(request: Request) {
  return response(
    await handler.handle({
      method: "OPTIONS",
      headers: request.headers,
      url: request.url,
    }),
  );
}
