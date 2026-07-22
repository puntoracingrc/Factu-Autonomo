"use client";

import {
  EXPENSE_AGGREGATE_CONTRIBUTION_MAX_BODY_BYTES_V1,
  createExpenseAggregateContributionV1,
  isExpenseAggregateContributionBodySizeAllowedV1,
  type ExpenseAggregateContributionV1,
} from "@/lib/expense-engine/aggregate-contribution.v1";
import type { ExpenseEngineObservationV1 } from "@/lib/expense-engine/contracts";
import { EXPENSE_LEARNING_CLAIM_HEADER_V1 } from "@/lib/expense-engine/learning-contribution-protocol.v1";
import { getSupabaseClientAsync } from "@/lib/supabase/client";

export const EXPENSE_LEARNING_CONTRIBUTION_CLIENT_TIMEOUT_MS_V1 = 8_000;

const ENDPOINT = "/api/expenses/learning-contribution";
const CLAIM_TOKEN_BYTES = 32;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export interface ExpenseLearningContributionAttemptV1 {
  readonly schemaVersion: 1;
  readonly persistencePolicy: "DO_NOT_PERSIST";
  readonly deliveryPolicy: "BEST_EFFORT_SINGLE_ATTEMPT";
  submit(observation: ExpenseEngineObservationV1): void;
  toJSON(): undefined;
}

export function createExpenseLearningContributionAttemptV1(
  subject: unknown,
): ExpenseLearningContributionAttemptV1 | null {
  const capturedSubject = normalizeUuid(subject);
  if (!capturedSubject) return null;

  let submitted = false;
  const attempt = Object.create(null) as ExpenseLearningContributionAttemptV1;
  define(attempt, "schemaVersion", 1);
  define(attempt, "persistencePolicy", "DO_NOT_PERSIST");
  define(attempt, "deliveryPolicy", "BEST_EFFORT_SINGLE_ATTEMPT");
  define(attempt, "submit", (observation: ExpenseEngineObservationV1) => {
    if (process.env.NEXT_PUBLIC_EXPENSE_LEARNING_WIRING_ENABLED !== "true") {
      return;
    }
    if (submitted) return;
    submitted = true;

    let contribution: ExpenseAggregateContributionV1 | null = null;
    try {
      contribution = createExpenseAggregateContributionV1(observation);
    } catch {
      return;
    }
    if (!contribution) return;

    void deliverContribution(capturedSubject, contribution).catch(() => {});
  });
  define(attempt, "toJSON", () => undefined);
  return Object.freeze(attempt);
}

async function deliverContribution(
  capturedSubject: string,
  contribution: ExpenseAggregateContributionV1,
): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    EXPENSE_LEARNING_CONTRIBUTION_CLIENT_TIMEOUT_MS_V1,
  );
  let unsubscribe: (() => void) | null = null;
  let authGeneration = 0;

  try {
    const supabase = await waitForAbort(
      getSupabaseClientAsync(),
      controller.signal,
    );
    if (!supabase || controller.signal.aborted) return;

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (normalizeUuid(session?.user.id) === capturedSubject) return;
        authGeneration += 1;
        controller.abort();
      },
    );
    unsubscribe = () => listener.subscription.unsubscribe();
    const expectedGeneration = authGeneration;

    const firstSession = await waitForAbort(
      supabase.auth.getSession(),
      controller.signal,
    );
    if (
      authGeneration !== expectedGeneration ||
      !sessionAccessToken(firstSession, capturedSubject)
    ) {
      return;
    }

    const body = JSON.stringify(contribution);
    const bodyBytes = new TextEncoder().encode(body).byteLength;
    if (
      bodyBytes > EXPENSE_AGGREGATE_CONTRIBUTION_MAX_BODY_BYTES_V1 ||
      !isExpenseAggregateContributionBodySizeAllowedV1(bodyBytes)
    ) {
      return;
    }

    const claimToken = randomClaimToken();
    if (!claimToken) return;

    const preflightSession = await waitForAbort(
      supabase.auth.getSession(),
      controller.signal,
    );
    const accessToken = sessionAccessToken(preflightSession, capturedSubject);
    if (
      !accessToken ||
      authGeneration !== expectedGeneration ||
      controller.signal.aborted
    ) {
      return;
    }

    await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        [EXPENSE_LEARNING_CLAIM_HEADER_V1]: claimToken,
      },
      body,
      cache: "no-store",
      credentials: "omit",
      keepalive: true,
      redirect: "error",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
    });

    const finalSession = await waitForAbort(
      supabase.auth.getSession(),
      controller.signal,
    );
    if (
      authGeneration !== expectedGeneration ||
      !sessionAccessToken(finalSession, capturedSubject)
    ) {
      return;
    }
  } catch {
    return;
  } finally {
    clearTimeout(timeout);
    try {
      unsubscribe?.();
    } catch {
      // Best-effort cleanup must not escape into the expense flow.
    }
  }
}

function randomClaimToken(): string | null {
  if (
    typeof globalThis.crypto?.getRandomValues !== "function" ||
    typeof globalThis.btoa !== "function"
  ) {
    return null;
  }

  const bytes = new Uint8Array(CLAIM_TOKEN_BYTES);
  globalThis.crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const encoded = globalThis
    .btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
  return encoded.length === 43 ? encoded : null;
}

function sessionAccessToken(value: unknown, subject: string): string | null {
  const root = record(value);
  const data = record(root?.data);
  const session = record(data?.session);
  const user = record(session?.user);
  const accessToken = session?.access_token;
  if (
    normalizeUuid(user?.id) !== subject ||
    typeof accessToken !== "string" ||
    accessToken.length === 0
  ) {
    return null;
  }
  return accessToken;
}

function waitForAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(new Error("aborted"));

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      cleanup();
      reject(new Error("aborted"));
    };
    const cleanup = () => signal.removeEventListener("abort", onAbort);
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        cleanup();
        resolve(value);
      },
      (error: unknown) => {
        cleanup();
        reject(error);
      },
    );
  });
}

function normalizeUuid(value: unknown): string | null {
  return typeof value === "string" && UUID_PATTERN.test(value)
    ? value.toLowerCase()
    : null;
}

function record(value: unknown): Record<PropertyKey, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<PropertyKey, unknown>)
    : null;
}

function define(object: object, key: PropertyKey, value: unknown): void {
  Object.defineProperty(object, key, {
    value,
    enumerable: false,
    writable: false,
    configurable: false,
  });
}
