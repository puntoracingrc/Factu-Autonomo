import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { AI_UNITS_PER_SCAN } from "./scan-limits";

export type StripeEventStatus = "processing" | "processed" | "failed";
export type StripeEventFailureCode =
  | "handler_failed"
  | "invalid_checkout_state"
  | "legacy_checkout_unresolved"
  | "scan_pack_conflict";

export interface StripeEventReservation {
  reserved: boolean;
  duplicate: boolean;
  busy: boolean;
  manualReview: boolean;
  status: StripeEventStatus;
  attemptToken?: string;
  attemptCount: number;
  leaseExpiresAt?: string;
}

export interface CompleteStripeScanPackInput {
  eventId: string;
  attemptToken: string;
  userId: string;
  checkoutSessionId: string;
  scanCredits: number;
  paymentStatus: "paid";
  fulfillmentContract: string;
  completedAt?: string;
}

export type StripeScanPackCompletion =
  | { status: "applied"; creditedScanCredits: number }
  | { status: "already_applied"; creditedScanCredits: 0 };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return String(error ?? "Error desconocido");
}

function requireAdmin() {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Supabase admin no disponible");
  return admin;
}

function firstRpcRow(value: unknown): Record<string, unknown> | null {
  if (!Array.isArray(value) || value.length !== 1) return null;
  const row = value[0];
  return row && typeof row === "object"
    ? (row as Record<string, unknown>)
    : null;
}

export async function reserveStripeEvent(
  eventId: string,
  eventType: string,
  options: { leaseSeconds?: number; claimedAt?: string } = {},
): Promise<StripeEventReservation> {
  const admin = requireAdmin();
  const { data, error } = await admin.rpc("reserve_stripe_event_attempt", {
    p_event_id: eventId,
    p_event_type: eventType,
    p_lease_seconds: options.leaseSeconds ?? 300,
    p_claimed_at: options.claimedAt ?? null,
  });
  if (error) throw new Error(errorMessage(error));

  const row = firstRpcRow(data);
  const resultStatus = row?.result_status;
  const eventStatus = row?.event_status;
  const attemptCount = row?.attempt_number;
  const leaseToken = row?.lease_token;
  const leaseUntil = row?.lease_until;
  if (
    typeof resultStatus !== "string" ||
    (eventStatus !== "processing" &&
      eventStatus !== "processed" &&
      eventStatus !== "failed") ||
    typeof attemptCount !== "number" ||
    !Number.isInteger(attemptCount) ||
    attemptCount < 0
  ) {
    throw new Error("Respuesta inválida al reservar el evento Stripe");
  }

  if (resultStatus === "acquired") {
    if (
      typeof leaseToken !== "string" ||
      !UUID_PATTERN.test(leaseToken) ||
      typeof leaseUntil !== "string" ||
      !Number.isFinite(Date.parse(leaseUntil))
    ) {
      throw new Error("Lease inválido al reservar el evento Stripe");
    }
    return {
      reserved: true,
      duplicate: false,
      busy: false,
      manualReview: false,
      status: "processing",
      attemptToken: leaseToken,
      attemptCount,
      leaseExpiresAt: leaseUntil,
    };
  }

  if (resultStatus === "processed") {
    return {
      reserved: false,
      duplicate: true,
      busy: false,
      manualReview: false,
      status: "processed",
      attemptCount,
    };
  }

  if (resultStatus === "busy") {
    return {
      reserved: false,
      duplicate: false,
      busy: true,
      manualReview: false,
      status: "processing",
      attemptCount,
      leaseExpiresAt: typeof leaseUntil === "string" ? leaseUntil : undefined,
    };
  }

  if (resultStatus === "manual_review") {
    return {
      reserved: false,
      duplicate: false,
      busy: false,
      manualReview: true,
      status: "failed",
      attemptCount,
    };
  }

  throw new Error("Conflicto de identidad en el evento Stripe");
}

export async function markStripeEventProcessed(
  eventId: string,
  attemptToken: string,
): Promise<void> {
  const admin = requireAdmin();
  const { data, error } = await admin.rpc("complete_stripe_event_attempt", {
    p_event_id: eventId,
    p_attempt_token: attemptToken,
    p_completed_at: null,
  });
  if (error) throw new Error(errorMessage(error));
  if (data !== "processed") {
    throw new Error("El intento Stripe ya no conserva su lease");
  }
}

export async function markStripeEventFailed(
  eventId: string,
  attemptToken: string,
  failureCode: StripeEventFailureCode,
): Promise<"failed" | "manual_review" | "stale_attempt"> {
  const admin = requireAdmin();
  const { data, error } = await admin.rpc("fail_stripe_event_attempt", {
    p_event_id: eventId,
    p_attempt_token: attemptToken,
    p_error_code: failureCode,
    p_failed_at: null,
  });
  if (error) throw new Error(errorMessage(error));
  if (
    data !== "failed" &&
    data !== "manual_review" &&
    data !== "stale_attempt"
  ) {
    throw new Error("Respuesta inválida al fallar el evento Stripe");
  }
  return data;
}

export async function completeStripeScanPackEvent(
  input: CompleteStripeScanPackInput,
): Promise<StripeScanPackCompletion> {
  const admin = requireAdmin();
  const { data, error } = await admin.rpc("complete_stripe_scan_pack_event", {
    p_event_id: input.eventId,
    p_attempt_token: input.attemptToken,
    p_user_id: input.userId,
    p_checkout_session_id: input.checkoutSessionId,
    p_scan_credits: input.scanCredits,
    p_units_per_scan: AI_UNITS_PER_SCAN,
    p_payment_status: input.paymentStatus,
    p_fulfillment_contract: input.fulfillmentContract,
    p_completed_at: input.completedAt ?? null,
  });
  if (error) throw new Error(errorMessage(error));

  const row = firstRpcRow(data);
  const status = row?.result_status;
  const credited = row?.credited_scan_credits;
  if (
    (status !== "applied" && status !== "already_applied") ||
    typeof credited !== "number"
  ) {
    if (status === "effect_conflict") {
      throw new Error("Conflicto en la concesión del pack Stripe");
    }
    if (status === "stale_attempt") {
      throw new Error("El intento Stripe ya no conserva su lease");
    }
    throw new Error("Respuesta inválida al completar el pack Stripe");
  }

  if (status === "applied" && credited !== input.scanCredits) {
    throw new Error("Importe acreditado incoherente para el pack Stripe");
  }
  if (status === "already_applied" && credited !== 0) {
    throw new Error("Un pack repetido no puede añadir créditos");
  }
  return status === "applied"
    ? { status, creditedScanCredits: credited }
    : { status, creditedScanCredits: 0 };
}
