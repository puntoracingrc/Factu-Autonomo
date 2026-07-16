import { createHash } from "node:crypto";
import type { TaxProductEvent } from "./contracts";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

assertServerOnly();

function assertServerOnly() {
  if (typeof window !== "undefined") {
    throw new Error("Tax product events can only be stored on the server.");
  }
}

export function pseudonymizeTaxProductSubject(subject: string): string {
  const salt =
    process.env.TAX_PRODUCT_ANALYTICS_SALT ||
    process.env.SERVER_RATE_LIMIT_SALT ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "facturacion-autonomos-tax-product";
  return createHash("sha256").update(`${salt}:${subject}`).digest("hex");
}

export async function persistTaxProductEvent(
  event: TaxProductEvent,
  subject: string,
): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin) return false;
  const { error } = await admin.from("tax_product_events").upsert(
    {
      id: event.id,
      occurred_at: event.occurredAt,
      anonymous_subject_id: pseudonymizeTaxProductSubject(subject),
      session_id: event.sessionId,
      event_type: event.eventType,
      page: event.page ?? null,
      device_category: event.deviceCategory ?? null,
      question_id: event.questionId ?? null,
      question_group: event.questionGroup ?? null,
      risk_tag: event.riskTag ?? null,
      model_number: event.modelNumber ?? null,
      recommendation_status: event.recommendationStatus ?? null,
      document_family: event.documentFamily ?? null,
      extraction_method: event.extractionMethod ?? null,
      confidence_bucket: event.confidenceBucket ?? null,
      fiscal_year: event.fiscalYear ?? null,
      engine_version: event.engineVersion ?? null,
      ruleset_version: event.rulesetVersion ?? null,
      layout_version: event.layoutVersion ?? null,
      properties: event.properties,
      contract_version: event.contractVersion,
    },
    { onConflict: "id", ignoreDuplicates: true },
  );
  return !error;
}
