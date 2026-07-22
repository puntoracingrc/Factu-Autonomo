import { createHmac } from "node:crypto";
import { EXPENSE_AGGREGATE_CONTRIBUTION_SCHEMA_VERSION_V1 } from "./aggregate-contribution.v1";
import {
  EXPENSE_ENGINE_OBSERVATION_SCHEMA_VERSION,
  EXPENSE_ENGINE_PRIVACY_POLICY_VERSION,
  EXPENSE_ENGINE_VERSION,
} from "./contracts";
import { EXPENSE_LEARNING_CLAIM_HEADER_V1 } from "./learning-contribution-protocol.v1";

assertServerOnlyModule();

export { EXPENSE_LEARNING_CLAIM_HEADER_V1 };
export const EXPENSE_LEARNING_WEEK_BOUNDARY_GUARD_MS_V1 = 5 * 60 * 1_000;
export const EXPENSE_LEARNING_RPC_TIMEOUT_MS_V1 = 10_000;

const WEEK_MS = 7 * 24 * 60 * 60 * 1_000;
const CLAIM_TOKEN_BYTES = 32;
const MIN_SECRET_BYTES = 32;
const MAX_SECRET_BYTES = 64;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/u;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const CLAIM_HMAC_DOMAIN = "expense-learning-claim-token-hmac.v1\0";
const CONTRIBUTOR_HMAC_DOMAIN = "expense-learning-contributor-week-hmac.v1\0";

interface ExpenseLearningSubmissionDigestInputV1 {
  readonly claimToken: string;
  readonly userId: string;
  readonly claimSecret: string | undefined;
  readonly contributorSecret: string | undefined;
  readonly now?: () => Date;
}

export interface ExpenseLearningSubmissionDigestsV1 {
  readonly claimTokenDigest: string;
  readonly contributorWeekHmac: string;
}

interface WeekContextV1 {
  readonly weekStart: string;
  readonly startMs: number;
  readonly currentMs: number;
}

function assertServerOnlyModule(): void {
  if (typeof window !== "undefined") {
    throw new Error(
      "Expense learning contribution protocol can only run on the server.",
    );
  }
}

export function isCanonicalExpenseLearningClaimTokenV1(
  value: unknown,
): value is string {
  return (
    decodeCanonicalBase64Url(value, CLAIM_TOKEN_BYTES, CLAIM_TOKEN_BYTES) !==
    null
  );
}

export function isCanonicalExpenseLearningHmacSecretV1(
  value: unknown,
): value is string {
  return (
    decodeCanonicalBase64Url(value, MIN_SECRET_BYTES, MAX_SECRET_BYTES) !== null
  );
}

export function deriveExpenseLearningSubmissionDigestsV1(
  input: ExpenseLearningSubmissionDigestInputV1,
): ExpenseLearningSubmissionDigestsV1 | null {
  const claimToken = decodeCanonicalBase64Url(
    input.claimToken,
    CLAIM_TOKEN_BYTES,
    CLAIM_TOKEN_BYTES,
  );
  const claimSecret = decodeCanonicalBase64Url(
    input.claimSecret,
    MIN_SECRET_BYTES,
    MAX_SECRET_BYTES,
  );
  const contributorSecret = decodeCanonicalBase64Url(
    input.contributorSecret,
    MIN_SECRET_BYTES,
    MAX_SECRET_BYTES,
  );
  const userId = normalizeUuid(input.userId);
  if (
    !claimToken ||
    !claimSecret ||
    !contributorSecret ||
    claimSecret.equals(contributorSecret) ||
    !userId
  ) {
    return null;
  }

  const clock = input.now ?? (() => new Date());
  const before = weekContext(clock());
  if (!before || isInsideWeekBoundaryGuard(before)) return null;

  const claimTokenDigest = createHmac("sha256", claimSecret)
    .update(CLAIM_HMAC_DOMAIN, "utf8")
    .update(claimToken)
    .digest("hex");
  const contributorWeekHmac = createHmac("sha256", contributorSecret)
    .update(CONTRIBUTOR_HMAC_DOMAIN, "utf8")
    .update(EXPENSE_AGGREGATE_CONTRIBUTION_SCHEMA_VERSION_V1, "utf8")
    .update("\0", "utf8")
    .update(EXPENSE_ENGINE_OBSERVATION_SCHEMA_VERSION, "utf8")
    .update("\0", "utf8")
    .update(EXPENSE_ENGINE_VERSION, "utf8")
    .update("\0", "utf8")
    .update(EXPENSE_ENGINE_PRIVACY_POLICY_VERSION, "utf8")
    .update("\0", "utf8")
    .update(before.weekStart, "utf8")
    .update("\0", "utf8")
    .update(userId, "utf8")
    .digest("hex");

  const after = weekContext(clock());
  if (
    !after ||
    after.weekStart !== before.weekStart ||
    isInsideWeekBoundaryGuard(after)
  ) {
    return null;
  }

  return Object.freeze({ claimTokenDigest, contributorWeekHmac });
}

function decodeCanonicalBase64Url(
  value: unknown,
  minBytes: number,
  maxBytes: number,
): Buffer | null {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 86 ||
    !BASE64URL_PATTERN.test(value)
  ) {
    return null;
  }

  try {
    const decoded = Buffer.from(value, "base64url");
    if (
      decoded.byteLength < minBytes ||
      decoded.byteLength > maxBytes ||
      decoded.toString("base64url") !== value
    ) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

function normalizeUuid(value: unknown): string | null {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) return null;
  return value.toLowerCase();
}

function weekContext(value: Date): WeekContextV1 | null {
  const timestamp = value.getTime();
  if (!Number.isFinite(timestamp)) return null;

  const midnightUtc = Date.UTC(
    value.getUTCFullYear(),
    value.getUTCMonth(),
    value.getUTCDate(),
  );
  const daysSinceMonday = (value.getUTCDay() + 6) % 7;
  const startMs = midnightUtc - daysSinceMonday * 24 * 60 * 60 * 1_000;
  return {
    weekStart: new Date(startMs).toISOString().slice(0, 10),
    startMs,
    currentMs: timestamp,
  };
}

function isInsideWeekBoundaryGuard(context: WeekContextV1): boolean {
  const elapsed = context.currentMs - context.startMs;
  const remaining = WEEK_MS - elapsed;
  return (
    elapsed < 0 ||
    elapsed <= EXPENSE_LEARNING_WEEK_BOUNDARY_GUARD_MS_V1 ||
    remaining <= EXPENSE_LEARNING_WEEK_BOUNDARY_GUARD_MS_V1
  );
}
