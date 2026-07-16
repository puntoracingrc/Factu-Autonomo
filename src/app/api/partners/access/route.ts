import { getPartnerAccessFromRequest } from "@/lib/partners/server-access";
import {
  partnerJsonResponse,
  withPartnerPrivateHeaders,
} from "@/lib/partners/private-response";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";

export async function GET(request: Request) {
  const access = await getPartnerAccessFromRequest(request);
  if (!access.ok) return withPartnerPrivateHeaders(access.response);
  const rateLimit = await checkRateLimit(
    request,
    { namespace: "partners_access", limit: 120, windowMs: 10 * 60_000 },
    access.user.id,
  );
  if (!rateLimit.allowed) {
    return withPartnerPrivateHeaders(rateLimitExceededResponse(rateLimit));
  }

  return partnerJsonResponse({
    authorized: true,
    role: access.role,
    hasPartnerAccount: Boolean(access.account),
  });
}
