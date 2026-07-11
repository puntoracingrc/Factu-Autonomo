import { createHash, randomUUID } from "node:crypto";
import { isUserEmailConfirmed } from "@/lib/auth/email-confirmation";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "./send";
import { buildWelcomeEmail } from "./templates/welcome";

const WELCOME_SENT_KEY = "welcome_email_sent";
const WELCOME_DELIVERY_KEY = "welcome_email_delivery_v1";
export const WELCOME_RETRY_COOLDOWN_MS = 5 * 60_000;
// Resend retains idempotency keys for 24 hours. Stop uncertain automatic
// retries one hour early so clock/network skew cannot cross that guarantee.
export const WELCOME_SAFE_IDEMPOTENCY_WINDOW_MS = 23 * 60 * 60_000;

type WelcomeDeliveryState = {
  state: "claimed" | "dispatching" | "failed" | "sent";
  claimId: string;
  claimedAt: string;
  idempotencyStartedAt?: string;
  deliveryUncertain?: boolean;
  dispatchingAt?: string;
  failedAt?: string;
  sentAt?: string;
  failureKind?: "known" | "ambiguous";
  failureRetryable?: boolean;
};

export interface SendWelcomeEmailResult {
  ok: boolean;
  skipped?: boolean;
  retryable?: boolean;
  retryAfterSeconds?: number;
  error?: string;
}

type ExistingDeliveryDecision =
  | { kind: "available" }
  | { kind: "complete" | "conservative" }
  | { kind: "cooldown"; retryAfterSeconds: number };

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function welcomeDeliveryState(value: unknown): WelcomeDeliveryState | null {
  const record = asRecord(value);
  if (
    (record.state !== "claimed" &&
      record.state !== "dispatching" &&
      record.state !== "failed" &&
      record.state !== "sent") ||
    typeof record.claimId !== "string" ||
    typeof record.claimedAt !== "string"
  ) {
    return null;
  }
  return {
    state: record.state,
    claimId: record.claimId,
    claimedAt: record.claimedAt,
    ...(typeof record.idempotencyStartedAt === "string"
      ? { idempotencyStartedAt: record.idempotencyStartedAt }
      : {}),
    ...(record.deliveryUncertain === true ? { deliveryUncertain: true } : {}),
    ...(typeof record.dispatchingAt === "string"
      ? { dispatchingAt: record.dispatchingAt }
      : {}),
    ...(typeof record.failedAt === "string"
      ? { failedAt: record.failedAt }
      : {}),
    ...(typeof record.sentAt === "string" ? { sentAt: record.sentAt } : {}),
    ...(record.failureKind === "known" || record.failureKind === "ambiguous"
      ? { failureKind: record.failureKind }
      : {}),
    ...(typeof record.failureRetryable === "boolean"
      ? { failureRetryable: record.failureRetryable }
      : {}),
  };
}

function retryAfterSeconds(timestamp: string, now = Date.now()): number | null {
  const at = Date.parse(timestamp);
  if (!Number.isFinite(at)) return null;
  const remaining = at + WELCOME_RETRY_COOLDOWN_MS - now;
  return remaining > 0 ? Math.max(1, Math.ceil(remaining / 1000)) : 0;
}

function idempotencyWindowRemainingSeconds(
  delivery: WelcomeDeliveryState,
  now = Date.now(),
): number | null {
  const timestamp =
    delivery.idempotencyStartedAt ??
    delivery.dispatchingAt ??
    delivery.claimedAt;
  const at = Date.parse(timestamp);
  if (!Number.isFinite(at)) return null;
  const remaining = at + WELCOME_SAFE_IDEMPOTENCY_WINDOW_MS - now;
  return remaining > 0 ? Math.max(1, Math.ceil(remaining / 1000)) : 0;
}

function deliveryMayAlreadyExist(delivery: WelcomeDeliveryState): boolean {
  if (delivery.deliveryUncertain) return true;
  if (delivery.state === "dispatching") return true;
  return delivery.state === "failed" && delivery.failureKind !== "known";
}

function existingDeliveryDecision(user: {
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}): ExistingDeliveryDecision {
  // Keep honoring the legacy marker so already-welcomed accounts are not sent
  // another message. New state is stored in app_metadata, which users cannot
  // edit themselves.
  if (
    user.app_metadata?.[WELCOME_SENT_KEY] ||
    user.user_metadata?.[WELCOME_SENT_KEY]
  ) {
    return { kind: "complete" };
  }

  const delivery = welcomeDeliveryState(
    user.app_metadata?.[WELCOME_DELIVERY_KEY],
  );
  if (!delivery) return { kind: "available" };
  if (delivery.state === "sent") return { kind: "complete" };

  const uncertain = deliveryMayAlreadyExist(delivery);
  if (uncertain) {
    const safeWindowRemaining = idempotencyWindowRemainingSeconds(delivery);
    if (safeWindowRemaining === null || safeWindowRemaining === 0) {
      // After Resend's deduplication guarantee may have expired, favor
      // at-most-once over an unbounded retry of an uncertain transport.
      return { kind: "conservative" };
    }
  }

  if (delivery.state === "failed" && delivery.failureRetryable === false) {
    return { kind: "conservative" };
  }

  const stateTimestamp =
    delivery.state === "dispatching"
      ? (delivery.dispatchingAt ?? delivery.claimedAt)
      : delivery.state === "failed"
        ? (delivery.failedAt ?? delivery.claimedAt)
        : delivery.claimedAt;
  const remaining = retryAfterSeconds(stateTimestamp);
  if (remaining === null) return { kind: "conservative" };
  if (remaining > 0) {
    return { kind: "cooldown", retryAfterSeconds: remaining };
  }
  return { kind: "available" };
}

function welcomeClaimIdentifier(userId: string): string {
  const salt =
    process.env.SERVER_RATE_LIMIT_SALT ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "facturacion-autonomos";
  return createHash("sha256")
    .update(`${salt}:email_welcome_delivery:${userId}`)
    .digest("hex");
}

function welcomeProviderIdempotencyKey(userId: string): string {
  return `welcome-user-v1/${userId}`;
}

function firstClaimRow(
  data: unknown,
): { allowed?: boolean; retry_after_seconds?: number } | null {
  if (Array.isArray(data)) {
    return (
      (data[0] as
        { allowed?: boolean; retry_after_seconds?: number } | undefined) ?? null
    );
  }
  return data && typeof data === "object"
    ? (data as { allowed?: boolean; retry_after_seconds?: number })
    : null;
}

function claimRetryAfterSeconds(
  row: { retry_after_seconds?: number } | null,
): number {
  const value = Number(row?.retry_after_seconds);
  return Number.isFinite(value) && value > 0
    ? Math.ceil(value)
    : Math.ceil(WELCOME_RETRY_COOLDOWN_MS / 1000);
}

export async function sendWelcomeEmailForUser(input: {
  userId: string;
  recipientName?: string;
}): Promise<SendWelcomeEmailResult> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      ok: false,
      retryable: true,
      retryAfterSeconds: 60,
      error: "Supabase admin no configurado",
    };
  }

  const { data: userData, error: userError } =
    await admin.auth.admin.getUserById(input.userId);

  if (userError || !userData.user) {
    return {
      ok: false,
      retryable: true,
      retryAfterSeconds: 60,
      error: "Usuario no encontrado",
    };
  }

  const user = userData.user;
  const email = user.email?.trim();
  if (!email || !isUserEmailConfirmed(user)) {
    return {
      ok: false,
      retryable: true,
      retryAfterSeconds: 60,
      error: "Usuario sin email confirmado",
    };
  }

  const previousDelivery = welcomeDeliveryState(
    user.app_metadata?.[WELCOME_DELIVERY_KEY],
  );
  const existingDelivery = existingDeliveryDecision(user);
  if (
    existingDelivery.kind === "complete" ||
    existingDelivery.kind === "conservative"
  ) {
    return { ok: true, skipped: true };
  }
  if (existingDelivery.kind === "cooldown") {
    return {
      ok: false,
      skipped: true,
      retryable: true,
      retryAfterSeconds: existingDelivery.retryAfterSeconds,
      error: "El email de bienvenida está en periodo de espera",
    };
  }

  // This existing atomic RPC provides a short distributed single-winner
  // window. Unlike the general rate-limit helper, delivery claims fail closed
  // instead of degrading to per-instance memory.
  const { data: claimData, error: claimError } = await admin.rpc(
    "claim_rate_limit_bucket",
    {
      p_identifier_hash: welcomeClaimIdentifier(user.id),
      p_limit: 1,
      p_namespace: "email_welcome_delivery",
      p_window_ms: WELCOME_RETRY_COOLDOWN_MS,
    },
  );
  const claimRow = firstClaimRow(claimData);
  if (claimError || typeof claimRow?.allowed !== "boolean") {
    return {
      ok: false,
      retryable: true,
      retryAfterSeconds: 60,
      error: "No se pudo reservar el email de bienvenida",
    };
  }
  if (!claimRow.allowed) {
    return {
      ok: false,
      skipped: true,
      retryable: true,
      retryAfterSeconds: claimRetryAfterSeconds(claimRow),
      error: "El email de bienvenida ya está en curso",
    };
  }

  const claimedAt = new Date().toISOString();
  const preserveUncertainDelivery = Boolean(
    previousDelivery && deliveryMayAlreadyExist(previousDelivery),
  );
  const idempotencyStartedAt = preserveUncertainDelivery
    ? (previousDelivery?.idempotencyStartedAt ??
      previousDelivery?.dispatchingAt ??
      previousDelivery?.claimedAt ??
      claimedAt)
    : claimedAt;
  const claim: WelcomeDeliveryState = {
    state: "claimed",
    claimId: randomUUID(),
    claimedAt,
    idempotencyStartedAt,
    ...(preserveUncertainDelivery ? { deliveryUncertain: true } : {}),
  };
  const { data: claimedUserData, error: claimMetadataError } =
    await admin.auth.admin.updateUserById(user.id, {
      // GoTrue merges top-level app_metadata keys. Sending only the welcome
      // key avoids reverting a concurrent provider/admin metadata change.
      app_metadata: { [WELCOME_DELIVERY_KEY]: claim },
    });
  const persistedClaim = welcomeDeliveryState(
    claimedUserData.user?.app_metadata?.[WELCOME_DELIVERY_KEY],
  );
  if (
    claimMetadataError ||
    !claimedUserData.user ||
    persistedClaim?.state !== "claimed" ||
    persistedClaim.claimId !== claim.claimId
  ) {
    return {
      ok: false,
      retryable: true,
      retryAfterSeconds: claimRetryAfterSeconds(claimRow),
      error: "No se pudo registrar el envío de bienvenida",
    };
  }

  // Persist the transport boundary before calling Resend. A later invocation
  // may retry `dispatching` only while the provider idempotency key is still
  // inside its documented retention window.
  const dispatching: WelcomeDeliveryState = {
    ...claim,
    state: "dispatching",
    dispatchingAt: new Date().toISOString(),
  };
  const { data: dispatchingUserData, error: dispatchingMetadataError } =
    await admin.auth.admin.updateUserById(user.id, {
      app_metadata: { [WELCOME_DELIVERY_KEY]: dispatching },
    });
  const persistedDispatch = welcomeDeliveryState(
    dispatchingUserData.user?.app_metadata?.[WELCOME_DELIVERY_KEY],
  );
  if (
    dispatchingMetadataError ||
    !dispatchingUserData.user ||
    persistedDispatch?.state !== "dispatching" ||
    persistedDispatch.claimId !== claim.claimId
  ) {
    return {
      ok: false,
      retryable: true,
      retryAfterSeconds: claimRetryAfterSeconds(claimRow),
      error: "No se pudo confirmar el inicio del envío de bienvenida",
    };
  }

  const safeWindowRemaining = idempotencyWindowRemainingSeconds(dispatching);
  if (safeWindowRemaining === null || safeWindowRemaining === 0) {
    // A suspended invocation must not start transport after the provider-side
    // deduplication guarantee has already elapsed.
    return { ok: true, skipped: true };
  }

  const content = buildWelcomeEmail({
    email,
    recipientName: input.recipientName,
  });

  let result: Awaited<ReturnType<typeof sendEmail>>;
  try {
    result = await sendEmail({
      to: email,
      subject: content.subject,
      html: content.html,
      text: content.text,
      idempotencyKey: welcomeProviderIdempotencyKey(user.id),
    });
  } catch {
    result = {
      ok: false,
      failureKind: "ambiguous",
      retryable: true,
      error: "No se pudo confirmar el envío de bienvenida",
    };
  }

  if (!result.ok) {
    const failureKind = result.failureKind ?? "ambiguous";
    const failureRetryable = result.retryable ?? failureKind === "ambiguous";
    const deliveryUncertain =
      claim.deliveryUncertain === true || failureKind === "ambiguous";
    const failedAt = new Date().toISOString();
    const { error: failedMetadataError } =
      await admin.auth.admin.updateUserById(user.id, {
        app_metadata: {
          [WELCOME_DELIVERY_KEY]: {
            ...claim,
            state: "failed",
            failedAt,
            failureKind,
            failureRetryable,
            ...(deliveryUncertain ? { deliveryUncertain: true } : {}),
          } satisfies WelcomeDeliveryState,
        },
      });
    const providerRetryAfter = result.retryAfterSeconds ?? 0;
    const nextRetryAfter = Math.max(
      claimRetryAfterSeconds(claimRow),
      providerRetryAfter,
    );

    if (failedMetadataError) {
      // The durable state is still `dispatching`. A stable provider key makes
      // a bounded retry safe; after the provider window the state fails closed.
      return {
        ok: false,
        skipped: result.skipped,
        retryable: true,
        retryAfterSeconds: nextRetryAfter,
        error: "No se pudo registrar el resultado del envío de bienvenida",
      };
    }

    return {
      ok: false,
      skipped: result.skipped,
      retryable: failureRetryable,
      ...(failureRetryable ? { retryAfterSeconds: nextRetryAfter } : {}),
      error: result.error,
    };
  }

  const sentAt = new Date().toISOString();
  const { error: sentMetadataError } = await admin.auth.admin.updateUserById(
    user.id,
    {
      app_metadata: {
        [WELCOME_SENT_KEY]: sentAt,
        [WELCOME_DELIVERY_KEY]: {
          ...claim,
          state: "sent",
          sentAt,
        } satisfies WelcomeDeliveryState,
      },
    },
  );

  if (sentMetadataError) {
    // The persisted transport boundary remains active. Avoid an immediate
    // client loop; a later reconciliation uses the same provider key.
    return {
      ok: true,
      error: "Email enviado; confirmación de metadata pendiente",
    };
  }

  return { ok: true };
}
