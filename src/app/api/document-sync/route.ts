import { NextResponse } from "next/server";
import {
  buildDocumentSyncRouteDisabledResponse,
  buildDocumentSyncRouteErrorResponse,
  buildDocumentSyncRouteSafeResponse,
  parseDocumentSyncRouteEnvelope,
} from "@/lib/document-sync-integrity/route-envelope";
import {
  evaluateDocumentSyncRouteShellFlag,
} from "@/lib/document-sync-integrity/route-shell-flag";

// PHASE2C32_DISABLED_SYNC_ROUTE_SHELL_HTTP_V1
export const dynamic = "force-dynamic";

function toNextResponse(response: {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}) {
  return NextResponse.json(response.body, {
    status: response.status,
    headers: response.headers,
  });
}

function currentFlag() {
  return evaluateDocumentSyncRouteShellFlag(process.env);
}

export async function GET() {
  return toNextResponse(
    buildDocumentSyncRouteDisabledResponse(currentFlag(), "SYNTHETIC_ONLY_ROUTE_GET"),
  );
}

export async function POST(request: Request) {
  const flag = currentFlag();
  if (!flag.enabled) {
    return toNextResponse(
      buildDocumentSyncRouteDisabledResponse(
        flag,
        "SYNTHETIC_ONLY_ROUTE_POST_DISABLED",
      ),
    );
  }

  const rawBody = await request.text();
  const envelope = parseDocumentSyncRouteEnvelope({
    method: "POST",
    rawBody,
    requestId: request.headers.get("x-request-id") ?? undefined,
  });

  if (envelope.status === "rejected") {
    return toNextResponse(
      buildDocumentSyncRouteErrorResponse(envelope.code, envelope.requestId, 400),
    );
  }

  return toNextResponse(
    buildDocumentSyncRouteSafeResponse(
      "route_shell_enabled_but_operations_disabled",
      envelope.safeSummary,
      envelope.requestId,
    ),
  );
}
