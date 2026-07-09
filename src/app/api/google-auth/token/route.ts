import { NextResponse } from "next/server";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";

export const runtime = "nodejs";

type GoogleTokenPayload = {
  access_token?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
};

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getGoogleAuthClientId(): string {
  return (
    process.env.GOOGLE_AUTH_CLIENT_ID?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_AUTH_CLIENT_ID?.trim() ||
    ""
  );
}

function getGoogleAuthClientSecret(): string {
  return process.env.GOOGLE_AUTH_CLIENT_SECRET?.trim() || "";
}

function getRedirectUri(request: Request, body: unknown): string {
  const redirectUri =
    body && typeof body === "object" && "redirectUri" in body
      ? safeString(body.redirectUri)
      : "";

  if (!redirectUri) return "postmessage";

  try {
    const requestUrl = new URL(request.url);
    const parsed = new URL(redirectUri);
    if (
      parsed.origin === requestUrl.origin &&
      parsed.pathname === "/google-auth/callback"
    ) {
      return redirectUri;
    }
  } catch {
    return "postmessage";
  }

  return "postmessage";
}

function googleErrorMessage(payload: GoogleTokenPayload): string {
  const description = safeString(payload.error_description);
  if (description) return description;

  const code = safeString(payload.error);
  if (code === "invalid_grant") {
    return "El permiso de Google ha caducado. Vuelve a intentarlo.";
  }

  return "Google no ha autorizado el inicio de sesión.";
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, {
    namespace: "google_auth_token",
    limit: 30,
    windowMs: 5 * 60_000,
  });
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);

  const clientId = getGoogleAuthClientId();
  const clientSecret = getGoogleAuthClientSecret();

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Google Login no está configurado en el servidor." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "La respuesta de Google no se pudo leer." },
      { status: 400 },
    );
  }

  const code =
    body && typeof body === "object" && "code" in body
      ? safeString(body.code)
      : "";

  if (!code) {
    return NextResponse.json(
      { error: "El retorno de Google no es válido." },
      { status: 400 },
    );
  }
  const redirectUri = getRedirectUri(request, body);

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
  if (!tokenResponse.ok || !payload.id_token) {
    return NextResponse.json(
      { error: googleErrorMessage(payload) },
      { status: 400 },
    );
  }

  return NextResponse.json({
    idToken: payload.id_token,
    accessToken: payload.access_token,
  });
}
