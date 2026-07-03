import type { AiLearningEvent } from "./ai-learning";
import { getSupabaseAdmin } from "./supabase/admin";

export async function persistAiLearningEvent(
  event: AiLearningEvent,
): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin) return false;

  const { error } = await admin.from("ai_learning_events").insert({
    user_id: event.userId,
    account_label: event.accountLabel,
    event_type: event.eventType,
    source: event.source,
    payload_schema_version: event.payloadSchemaVersion,
    payload: event.payload,
  });

  return !error;
}
