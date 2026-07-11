import { NextResponse } from "next/server";
import { EMAIL_CONFIRMATION_REQUIRED_MESSAGE } from "@/lib/auth/email-confirmation";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { isEmailConfigured } from "@/lib/email/config";
import { sendWelcomeEmailForUser } from "@/lib/email/welcome";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { rejectOversizedContentLength } from "@/lib/server/request-body";

export const runtime = "nodejs";

function protectWelcomeResponse<T extends Response>(response: T): T {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Vary", "Authorization");
  return response;
}

export async function POST(request: Request) {
  const user = await getUserFromBearer(request.headers.get("authorization"), {
    requireEmailConfirmed: true,
  });
  if (!user) {
    return protectWelcomeResponse(
      NextResponse.json(
        { ok: false, error: EMAIL_CONFIRMATION_REQUIRED_MESSAGE },
        { status: 401 },
      ),
    );
  }

  const rateLimit = await checkRateLimit(
    request,
    {
      namespace: "email_welcome",
      limit: 12,
      windowMs: 5 * 60_000,
    },
    user.id,
  );
  if (!rateLimit.allowed) {
    return protectWelcomeResponse(rateLimitExceededResponse(rateLimit));
  }

  // No public identity input is accepted. The recipient is derived on the
  // server from the verified bearer user.
  const declaredBody = rejectOversizedContentLength(
    request,
    0,
    "La petición de bienvenida no admite datos públicos.",
  );
  if (declaredBody) return protectWelcomeResponse(declaredBody);
  if (request.body) {
    return protectWelcomeResponse(
      NextResponse.json(
        { error: "La petición de bienvenida no admite datos públicos." },
        { status: 400 },
      ),
    );
  }

  if (!isEmailConfigured()) {
    return protectWelcomeResponse(
      NextResponse.json(
        { ok: false, skipped: true, error: "Email no configurado" },
        { status: 503, headers: { "Retry-After": "60" } },
      ),
    );
  }

  const result = await sendWelcomeEmailForUser({
    userId: user.id,
  });

  if (!result.ok && result.retryable) {
    return protectWelcomeResponse(
      NextResponse.json(
        {
          ok: false,
          skipped: result.skipped ?? false,
          retryable: true,
          error: "Email de bienvenida pendiente",
        },
        {
          status: 503,
          headers: {
            "Retry-After": String(
              Math.max(1, Math.ceil(result.retryAfterSeconds ?? 60)),
            ),
          },
        },
      ),
    );
  }

  if (!result.ok && !result.skipped) {
    return protectWelcomeResponse(
      NextResponse.json(
        { ok: false, skipped: false, error: "Email de bienvenida pendiente" },
        { status: 202 },
      ),
    );
  }

  return protectWelcomeResponse(
    NextResponse.json({
      ok: true,
      skipped: result.skipped ?? false,
    }),
  );
}
