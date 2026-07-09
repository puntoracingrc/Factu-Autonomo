import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin/access";
import { aiLearningAccountForEmail } from "@/lib/ai-learning";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";

export async function GET(request: Request) {
  const user = await getUserFromBearer(request.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const rateLimit = checkRateLimit(
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

  return NextResponse.json({
    fullAdmin: isAdminUser(user),
    aiLearning: learning.allowed,
    learningLabel: learning.label,
  });
}
