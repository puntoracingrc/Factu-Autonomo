import { NextResponse } from "next/server";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import {
  EXPENSE_LEARNING_CONSENT_DECISION_MAX_BODY_BYTES_V1,
  EXPENSE_LEARNING_CONSENT_NOTICE_VERSION_V1,
  EXPENSE_LEARNING_CONSENT_PURPOSE_V1,
  EXPENSE_LEARNING_CONSENT_SCHEMA_VERSION_V1,
  normalizeExpenseLearningConsentDecisionV1,
} from "@/lib/expense-engine/learning-consent.v1";
import { EXPENSE_ENGINE_PRIVACY_POLICY_VERSION } from "@/lib/expense-engine/contracts";
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

const CONSENT_STATE_KEYS = [
  "state",
  "schemaVersion",
  "noticeVersion",
  "purpose",
  "privacyPolicyVersion",
  "decidedAt",
] as const;

type ConsentState = "UNDECIDED" | "GRANTED" | "REVOKED";

interface ExpenseLearningConsentStateV1 {
  readonly state: ConsentState;
  readonly schemaVersion: typeof EXPENSE_LEARNING_CONSENT_SCHEMA_VERSION_V1;
  readonly noticeVersion: typeof EXPENSE_LEARNING_CONSENT_NOTICE_VERSION_V1;
  readonly purpose: typeof EXPENSE_LEARNING_CONSENT_PURPOSE_V1;
  readonly privacyPolicyVersion: typeof EXPENSE_ENGINE_PRIVACY_POLICY_VERSION;
  readonly decidedAt: string | null;
}

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
  return process.env.EXPENSE_LEARNING_CONSENT_ENABLED === "true";
}

function hiddenRouteResponse(): NextResponse {
  return privateJson({ error: "No encontrado" }, { status: 404 });
}

function unavailableResponse(): NextResponse {
  return privateJson(
    { error: "Consentimiento no disponible" },
    { status: 503 },
  );
}

function strictRecord(
  value: unknown,
  allowedKeys: readonly string[],
): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const keys = Object.keys(value);
  if (
    keys.length !== allowedKeys.length ||
    keys.some((key) => !allowedKeys.includes(key))
  ) {
    return null;
  }
  return value as Record<string, unknown>;
}

function normalizeConsentState(
  value: unknown,
): ExpenseLearningConsentStateV1 | null {
  const input = strictRecord(value, CONSENT_STATE_KEYS);
  if (
    !input ||
    (input.state !== "UNDECIDED" &&
      input.state !== "GRANTED" &&
      input.state !== "REVOKED") ||
    input.schemaVersion !== EXPENSE_LEARNING_CONSENT_SCHEMA_VERSION_V1 ||
    input.noticeVersion !== EXPENSE_LEARNING_CONSENT_NOTICE_VERSION_V1 ||
    input.purpose !== EXPENSE_LEARNING_CONSENT_PURPOSE_V1 ||
    input.privacyPolicyVersion !== EXPENSE_ENGINE_PRIVACY_POLICY_VERSION
  ) {
    return null;
  }

  const decidedAt = normalizeDecidedAt(input.state, input.decidedAt);
  if (decidedAt === undefined) return null;

  return Object.freeze({
    state: input.state,
    schemaVersion: EXPENSE_LEARNING_CONSENT_SCHEMA_VERSION_V1,
    noticeVersion: EXPENSE_LEARNING_CONSENT_NOTICE_VERSION_V1,
    purpose: EXPENSE_LEARNING_CONSENT_PURPOSE_V1,
    privacyPolicyVersion: EXPENSE_ENGINE_PRIVACY_POLICY_VERSION,
    decidedAt,
  });
}

function normalizeDecidedAt(
  state: ConsentState,
  value: unknown,
): string | null | undefined {
  if (state === "UNDECIDED") return value === null ? null : undefined;
  if (typeof value !== "string" || value.length > 64) return undefined;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : undefined;
}

async function authenticatedUser(request: Request) {
  return getUserFromBearer(request.headers.get("authorization"), {
    requireEmailConfirmed: true,
  });
}

export async function GET(request: Request) {
  if (!routeIsEnabled()) return hiddenRouteResponse();

  const user = await authenticatedUser(request);
  if (!user) {
    return privateJson({ error: "No autorizado" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(
    request,
    {
      namespace: "expense_learning_consent_read",
      limit: 120,
      windowMs: 10 * 60_000,
    },
    user.id,
  );
  if (!rateLimit.allowed) {
    return withPrivateHeaders(rateLimitExceededResponse(rateLimit));
  }

  const admin = getSupabaseAdmin();
  if (!admin) return unavailableResponse();

  try {
    const { data, error } = await admin.rpc(
      "get_expense_learning_consent_v1",
      { p_user_id: user.id },
    );
    const consent = error ? null : normalizeConsentState(data);
    return consent ? privateJson({ consent }) : unavailableResponse();
  } catch {
    return unavailableResponse();
  }
}

export async function PUT(request: Request) {
  if (!routeIsEnabled()) return hiddenRouteResponse();

  const user = await authenticatedUser(request);
  if (!user) {
    return privateJson({ error: "No autorizado" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(
    request,
    {
      namespace: "expense_learning_consent_write",
      limit: 30,
      windowMs: 10 * 60_000,
    },
    user.id,
  );
  if (!rateLimit.allowed) {
    return withPrivateHeaders(rateLimitExceededResponse(rateLimit));
  }

  const body = await readJsonBody(request, {
    maxBytes: EXPENSE_LEARNING_CONSENT_DECISION_MAX_BODY_BYTES_V1,
    invalidMessage: "Decisión de consentimiento no válida.",
    tooLargeMessage: "La decisión de consentimiento es demasiado grande.",
  });
  if (!body.ok) return withPrivateHeaders(body.response);

  const decision = normalizeExpenseLearningConsentDecisionV1(body.data);
  if (!decision) {
    return privateJson(
      { error: "Decisión de consentimiento no válida." },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  if (!admin) return unavailableResponse();

  try {
    const { data, error } = await admin.rpc(
      "set_expense_learning_consent_v1",
      {
        p_user_id: user.id,
        p_decision: decision,
      },
    );
    const consent = error ? null : normalizeConsentState(data);
    return consent ? privateJson({ consent }) : unavailableResponse();
  } catch {
    return unavailableResponse();
  }
}
