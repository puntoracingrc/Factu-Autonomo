import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin/access";
import { aiLearningAccountForEmail } from "@/lib/ai-learning";
import { getUserSessionFromBearer } from "@/lib/billing/server-auth";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");
  const session = await getUserSessionFromBearer(authorization, {
    requireEmailConfirmed: true,
  });
  if (!session) {
    return NextResponse.json(
      { error: "No autorizado" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  const rateLimit = await checkRateLimit(
    request,
    {
      namespace: "admin_capabilities",
      limit: 180,
      windowMs: 10 * 60_000,
    },
    session.user.id,
  );
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);

  const learning = aiLearningAccountForEmail(session.user.email);
  const adminEmailAuthorized = isAdminUser(session.user);
  const mfaRequired = adminEmailAuthorized || learning.allowed;
  const mfaSatisfied = session.aal === "aal2";

  return NextResponse.json(
    {
      fullAdmin: adminEmailAuthorized && mfaSatisfied,
      adminEmailAuthorized,
      adminMfa: {
        required: mfaRequired,
        satisfied: mfaSatisfied,
        currentLevel: session.aal,
      },
      aiLearning: (adminEmailAuthorized || learning.allowed) && mfaSatisfied,
      learningLabel: adminEmailAuthorized ? "admin" : learning.label,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
