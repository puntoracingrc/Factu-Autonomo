import { NextResponse } from "next/server";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import {
  EXPENSE_AGGREGATE_CONTRIBUTION_MAX_BODY_BYTES_V1,
  normalizeExpenseAggregateContributionV1,
} from "@/lib/expense-engine/aggregate-contribution.v1";
import {
  EXPENSE_LEARNING_CLAIM_HEADER_V1,
  EXPENSE_LEARNING_RPC_TIMEOUT_MS_V1,
  deriveExpenseLearningSubmissionDigestsV1,
  isCanonicalExpenseLearningClaimTokenV1,
} from "@/lib/expense-engine/learning-contribution-server.v1";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { readJsonBody } from "@/lib/server/request-body";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  Pragma: "no-cache",
  Vary: "Authorization",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
} as const;

function withPrivateHeaders<T extends Response>(response: T): T {
  for (const [key, value] of Object.entries(PRIVATE_RESPONSE_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

function privateJson(body: unknown, init?: ResponseInit): NextResponse {
  return withPrivateHeaders(NextResponse.json(body, init));
}

function routeIsEnabled(): boolean {
  return process.env.EXPENSE_LEARNING_INGESTION_ENABLED === "true";
}

function hiddenRouteResponse(): NextResponse {
  return privateJson({ error: "No encontrado" }, { status: 404 });
}

function unavailableResponse(): NextResponse {
  return privateJson({ error: "Aprendizaje no disponible" }, { status: 503 });
}

export async function POST(request: Request) {
  if (!routeIsEnabled()) return hiddenRouteResponse();

  try {
    return await handleEnabledPost(request);
  } catch {
    return unavailableResponse();
  }
}

async function handleEnabledPost(request: Request) {
  const user = await getUserFromBearer(request.headers.get("authorization"), {
    requireEmailConfirmed: true,
  });
  if (!user) {
    return privateJson({ error: "No autorizado" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(
    request,
    {
      namespace: "expense_learning_contribution_submit",
      limit: 30,
      windowMs: 10 * 60_000,
    },
    user.id,
  );
  if (!rateLimit.allowed) {
    return withPrivateHeaders(rateLimitExceededResponse(rateLimit));
  }

  const claimToken = request.headers.get(EXPENSE_LEARNING_CLAIM_HEADER_V1);
  if (!isCanonicalExpenseLearningClaimTokenV1(claimToken)) {
    return privateJson({ error: "Contribución no válida" }, { status: 400 });
  }

  const body = await readJsonBody(request, {
    maxBytes: EXPENSE_AGGREGATE_CONTRIBUTION_MAX_BODY_BYTES_V1,
    invalidMessage: "Contribución no válida.",
    tooLargeMessage: "La contribución es demasiado grande.",
  });
  if (!body.ok) return withPrivateHeaders(body.response);

  const contribution = normalizeExpenseAggregateContributionV1(body.data);
  if (!contribution) {
    return privateJson({ error: "Contribución no válida." }, { status: 400 });
  }

  const digests = deriveExpenseLearningSubmissionDigestsV1({
    claimToken,
    userId: user.id,
    claimSecret: process.env.EXPENSE_LEARNING_CLAIM_HMAC_SECRET_V1,
    contributorSecret: process.env.EXPENSE_LEARNING_CONTRIBUTOR_HMAC_SECRET_V1,
  });
  if (!digests) return unavailableResponse();

  const admin = getSupabaseAdmin();
  if (!admin) return unavailableResponse();

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    EXPENSE_LEARNING_RPC_TIMEOUT_MS_V1,
  );
  try {
    const { data, error } = await admin
      .rpc("submit_expense_learning_contribution_v1", {
        p_user_id: user.id,
        p_contribution: contribution,
        p_claim_token_digest: digests.claimTokenDigest,
        p_contributor_week_hmac: digests.contributorWeekHmac,
      })
      .abortSignal(controller.signal);

    if (error || data !== "DISABLED") return unavailableResponse();
    return unavailableResponse();
  } finally {
    clearTimeout(timeout);
  }
}
