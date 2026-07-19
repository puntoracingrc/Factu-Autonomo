import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin/access";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { deriveUserBackupKey } from "@/lib/security/backup-key-server";
import { checkRateLimit, rateLimitExceededResponse } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

const STANDARD_BACKUP_KEY_LIMIT = 60;
const ADMIN_BACKUP_KEY_LIMIT = 1_200;

export async function GET(request: Request) {
  const user = await getUserFromBearer(request.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const adminUser = isAdminUser(user);

  const limit = await checkRateLimit(
    request,
    {
      namespace: adminUser ? "admin_backup_key" : "backup_key",
      limit: adminUser ? ADMIN_BACKUP_KEY_LIMIT : STANDARD_BACKUP_KEY_LIMIT,
      windowMs: 60 * 60_000,
    },
    user.id,
  );
  if (!limit.allowed) {
    return rateLimitExceededResponse(
      limit,
      "Demasiadas solicitudes de cifrado en poco tiempo.",
    );
  }

  const url = new URL(request.url);
  const requestedVersion = url.searchParams.has("version")
    ? url.searchParams.get("version")
    : undefined;
  const key = deriveUserBackupKey(user.id, requestedVersion);
  if (!key.ok) {
    return NextResponse.json(
      {
        error:
          key.error === "invalid_version"
            ? "Versión de cifrado no válida"
            : "El cifrado de copias no está configurado",
      },
      {
        status: key.error === "invalid_version" ? 400 : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  return NextResponse.json(
    {
      algorithm: "AES-GCM",
      version: key.version,
      key: key.keyBase64,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
