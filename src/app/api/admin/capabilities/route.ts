import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin/access";
import { adminMfaAccessFromAuthorization } from "@/lib/admin/server-access";
import { aiLearningAccountForEmail } from "@/lib/ai-learning";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");
  const user = await getUserFromBearer(authorization);
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const rateLimit = await checkRateLimit(
    request,
    {
      namespace: "admin_capabilities",
      limit: 180,
      windowMs: 10 * 60_000,
    },
    user.id,
  );
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);

  const learning = aiLearningAccountForEmail(user.email);
  const adminEmailAuthorized = isAdminUser(user);
  const adminMfa = adminMfaAccessFromAuthorization(authorization);

  return NextResponse.json({
    fullAdmin: adminEmailAuthorized && (!adminMfa.required || adminMfa.satisfied),
    adminEmailAuthorized,
    adminMfa,
    aiLearning: learning.allowed,
    learningLabel: learning.label,
  });
}
