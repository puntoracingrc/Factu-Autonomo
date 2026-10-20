import { readJsonBody } from "@/lib/server/request-body";
import { listExpenseOriginalStatuses } from "@/lib/expense-originals/server";
import {
  originalRouteAuth,
  originalJson,
  originalErrorResponse,
  privateOriginalResponse,
} from "@/lib/expense-originals/route-auth";
import { EXPENSE_ORIGINAL_STATUS_LIMIT } from "@/lib/expense-originals/types";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const result = await originalRouteAuth(request);
    if (result.response) return result.response;
    const body = await readJsonBody<{ expenseIds?: unknown }>(request, {
      maxBytes: 50_000,
    });
    if (!body.ok) return privateOriginalResponse(body.response);
    const ids = body.data?.expenseIds;
    if (
      !Array.isArray(ids) ||
      ids.length > EXPENSE_ORIGINAL_STATUS_LIMIT ||
      ids.some((id) => typeof id !== "string" || !id || id.length > 200)
    )
      return originalJson({ error: "La lista de gastos no es válida." }, 400);
    return originalJson({
      originals: await listExpenseOriginalStatuses(result.auth.userId, [
        ...new Set(ids as string[]),
      ]),
    });
  } catch (error) {
    return originalErrorResponse(error);
  }
}
