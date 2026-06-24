import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type StripeEventStatus = "processing" | "processed" | "failed";

export interface StripeEventReservation {
  reserved: boolean;
  duplicate: boolean;
  status?: StripeEventStatus;
}

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

export async function reserveStripeEvent(
  eventId: string,
  eventType: string,
): Promise<StripeEventReservation> {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Supabase admin no disponible");

  const now = new Date().toISOString();
  const { error } = await admin.from("stripe_events").insert({
    stripe_event_id: eventId,
    event_type: eventType,
    status: "processing",
    updated_at: now,
  });

  if (!error) {
    return { reserved: true, duplicate: false, status: "processing" };
  }

  if ((error as { code?: string }).code !== "23505") {
    throw new Error(errorMessage(error));
  }

  const { data, error: readError } = await admin
    .from("stripe_events")
    .select("status")
    .eq("stripe_event_id", eventId)
    .maybeSingle();

  if (readError) throw new Error(errorMessage(readError));

  const status = data?.status as StripeEventStatus | undefined;
  if (status === "failed") {
    const { data: updated, error: updateError } = await admin
      .from("stripe_events")
      .update({
        status: "processing",
        error_message: null,
        updated_at: now,
      })
      .eq("stripe_event_id", eventId)
      .eq("status", "failed")
      .select("stripe_event_id")
      .maybeSingle();

    if (updateError) throw new Error(errorMessage(updateError));
    if (updated) {
      return { reserved: true, duplicate: false, status: "processing" };
    }
  }

  return {
    reserved: false,
    duplicate: true,
    status: status ?? "processing",
  };
}

export async function markStripeEventProcessed(eventId: string): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Supabase admin no disponible");

  const now = new Date().toISOString();
  const { error } = await admin
    .from("stripe_events")
    .update({
      status: "processed",
      processed_at: now,
      updated_at: now,
      error_message: null,
    })
    .eq("stripe_event_id", eventId);

  if (error) throw new Error(errorMessage(error));
}

export async function markStripeEventFailed(
  eventId: string,
  error: unknown,
): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Supabase admin no disponible");

  const { error: updateError } = await admin
    .from("stripe_events")
    .update({
      status: "failed",
      error_message: errorMessage(error).slice(0, 1000),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_event_id", eventId);

  if (updateError) throw new Error(errorMessage(updateError));
}
