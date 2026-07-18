import { NextResponse } from "next/server";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { readJsonBody } from "@/lib/server/request-body";
import { checkRateLimit, rateLimitExceededResponse } from "@/lib/server/rate-limit";

const MAX_EVENT_BODY_BYTES = 1_024;
const EVENT_TYPES = new Set([
  "backup_local",
  "backup_drive",
  "cloud_pull",
]);

interface DataAccessBody {
  type?: unknown;
  itemCount?: unknown;
  byteLength?: unknown;
  automatic?: unknown;
}

function safeInteger(value: unknown, maximum: number): number | null {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0 || number > maximum) {
    return null;
  }
  return number;
}

function namespaceFor(body: {
  type: string;
  itemCount: number;
  byteLength: number;
  automatic: boolean;
}): string[] {
  const suffix =
    (body.type === "backup_drive" || body.type === "cloud_pull") &&
    body.automatic
      ? "_auto"
      : "";
  const namespaces = [`data_${body.type}${suffix}`];
  if (body.itemCount >= 5_000 || body.byteLength >= 10 * 1024 * 1024) {
    namespaces.push(`data_${body.type}${suffix}_large`);
  }
  return namespaces;
}

export async function POST(request: Request) {
  const user = await getUserFromBearer(request.headers.get("authorization"), {
    requireEmailConfirmed: true,
  });
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const bodyResult = await readJsonBody<DataAccessBody>(request, {
    maxBytes: MAX_EVENT_BODY_BYTES,
  });
  if (!bodyResult.ok) return bodyResult.response;

  const type =
    typeof bodyResult.data.type === "string"
      ? bodyResult.data.type.trim()
      : "";
  const itemCount = safeInteger(bodyResult.data.itemCount, 1_000_000);
  const byteLength = safeInteger(
    bodyResult.data.byteLength ?? 0,
    100 * 1024 * 1024,
  );
  if (!EVENT_TYPES.has(type) || itemCount === null || byteLength === null) {
    return NextResponse.json({ error: "Evento no válido" }, { status: 400 });
  }

  const generalLimit = await checkRateLimit(
    request,
    {
      namespace: "data_access_event",
      limit: 180,
      windowMs: 60 * 60_000,
    },
    user.id,
  );
  if (!generalLimit.allowed) {
    return rateLimitExceededResponse(
      generalLimit,
      "Demasiadas operaciones de datos en poco tiempo.",
    );
  }

  const namespaces = namespaceFor({
    type,
    itemCount,
    byteLength,
    automatic: bodyResult.data.automatic === true,
  });
  for (const namespace of namespaces) {
    await checkRateLimit(
      request,
      { namespace, limit: 180, windowMs: 60 * 60_000 },
      user.id,
    );
  }

  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
