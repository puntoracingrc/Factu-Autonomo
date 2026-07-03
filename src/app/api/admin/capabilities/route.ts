import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin/access";
import { aiLearningAccountForEmail } from "@/lib/ai-learning";
import { getUserFromBearer } from "@/lib/billing/server-auth";

export async function GET(request: Request) {
  const user = await getUserFromBearer(request.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const learning = aiLearningAccountForEmail(user.email);

  return NextResponse.json({
    fullAdmin: isAdminUser(user),
    aiLearning: learning.allowed,
    learningLabel: learning.label,
  });
}
