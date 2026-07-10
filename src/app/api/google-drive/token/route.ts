import { NextResponse } from "next/server";
import { EMAIL_CONFIRMATION_REQUIRED_MESSAGE } from "@/lib/auth/email-confirmation";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { DRIVE_BACKUP_CALLBACK_PATH } from "@/lib/google-drive/backup";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { readJsonBody } from "@/lib/server/request-body";

export const runtime = "nodejs";

type GoogleTokenPayload = {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getGoogleDriveClientId(): string {
  return (
    process.env.GOOGLE_DRIVE_CLIENT_ID?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID?.trim() ||
    ""
  );
}

function allowedRedirectOrigins(): Set<string> {
  const origins = new Set(["http://localhost:3000", "http://localhost:3001"]);
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configuredAppUrl) {
    try {
      origins.add(new URL(configuredAppUrl).origin);
    } catch {
      // La validacion final fallara si la URL configurada no es valida.
    }
  }

  return origins;
}

function isAllowedRedirectUri(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.pathname === DRIVE_BACKUP_CALLBACK_PATH &&
      url.search === "" &&
      url.hash === "" &&
      allowedRedirectOrigins().has(url.origin)
    );
  } catch {
    return false;
  }
}

function googleErrorMessage(payload: GoogleTokenPayload): string {
  const description = safeString(payload.error_description);
  if (description) return description;

  const code = safeString(payload.error);
  if (code === "invalid_grant") {
    return "El permiso de Google ha caducado. Vuelve a conectar Drive.";
  }

  return "Google no ha autorizado el acceso a Drive.";
}

export async function POST(request: Request) {
  const user = await getUserFromBearer(request.headers.get("authorization"), {
    requireEmailConfirmed: true,
  });
  if (!user) {
    return NextResponse.json(
      { error: EMAIL_CONFIRMATION_REQUIRED_MESSAGE },
      { status: 401 },
    );
  }
  const rateLimit = await checkRateLimit(
    request,
    {
      namespace: "google_drive_token",
      limit: 30,
      windowMs: 5 * 60_000,
    },
    user.id,
  );
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);

  const clientId = getGoogleDriveClientId();
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET?.trim() ?? "";

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Google Drive no está configurado en el servidor." },
      { status: 503 },
    );
  }

  const bodyResult = await readJsonBody(request, {
    maxBytes: 16 * 1024,
    invalidMessage: "La respuesta de Google no se pudo leer.",
  });
  if (!bodyResult.ok) return bodyResult.response;
  const body = bodyResult.data;

  const code =
    body && typeof body === "object" && "code" in body
      ? safeString(body.code)
      : "";
  const redirectUri =
    body && typeof body === "object" && "redirectUri" in body
      ? safeString(body.redirectUri)
      : "";

  if (!code || !isAllowedRedirectUri(redirectUri)) {
    return NextResponse.json(
      { error: "El retorno de Google Drive no es válido." },
      { status: 400 },
    );
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const payload = (await tokenResponse.json()) as GoogleTokenPayload;
  if (!tokenResponse.ok || !payload.access_token) {
    return NextResponse.json(
      { error: googleErrorMessage(payload) },
      { status: 400 },
    );
  }

  return NextResponse.json({
    accessToken: payload.access_token,
    expiresIn: payload.expires_in ?? 3600,
  });
}
