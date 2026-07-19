import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin/access";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { readJsonBody } from "@/lib/server/request-body";
import { checkRateLimit, rateLimitExceededResponse } from "@/lib/server/rate-limit";

const MAX_EVENT_BODY_BYTES = 1_024;
const STANDARD_DATA_OPERATION_LIMIT = 180;
const ADMIN_DATA_OPERATION_LIMIT = 1_200;
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
  adminAutomatic: boolean;
}): string[] {
  const suffix =
    (body.type === "backup_drive" || body.type === "cloud_pull") &&
    body.automatic
      ? "_auto"
      : "";
  const prefix = body.adminAutomatic ? "data_admin_" : "data_";
  const namespaces = [`${prefix}${body.type}${suffix}`];
  if (body.itemCount >= 5_000 || body.byteLength >= 10 * 1024 * 1024) {
    namespaces.push(`${prefix}${body.type}${suffix}_large`);
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
  const adminUser = isAdminUser(user);

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
  const automatic = bodyResult.data.automatic === true;
  const adminAutomatic =
    adminUser &&
    automatic &&
    (type === "backup_drive" || type === "cloud_pull");
  const operationLimit = adminAutomatic
    ? ADMIN_DATA_OPERATION_LIMIT
    : STANDARD_DATA_OPERATION_LIMIT;

  const generalLimit = await checkRateLimit(
    request,
    {
      namespace: adminAutomatic
        ? "admin_data_access_event"
        : "data_access_event",
      limit: operationLimit,
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
    automatic,
    adminAutomatic,
  });
  for (const namespace of namespaces) {
    await checkRateLimit(
      request,
      { namespace, limit: operationLimit, windowMs: 60 * 60_000 },
      user.id,
    );
  }

  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
