import type { SupabaseClient } from "@supabase/supabase-js";
import {
  maskPromoCode,
  type PromoBenefit,
  type PromoCampaignStatus,
  type PromoCampaignSummary,
  type PromoRedeemStatus,
} from "./contracts";
import { generatePromoCode, hashPromoCode } from "./server-code";

interface CampaignRow {
  id: string;
  name: string;
  code_masked: string;
  status: PromoCampaignStatus;
  benefit_kind: PromoBenefit["kind"];
  benefit_plan: "pro" | "pro_plus" | null;
  benefit_scan_credits: number | null;
  benefit_duration_days: number | null;
  benefit_module_key: string | null;
  starts_at: string;
  expires_at: string;
  max_redemptions: number;
  redeemed_count: number;
  created_at: string;
}

interface RedeemRow {
  result_status?: PromoRedeemStatus;
  campaign_name?: string | null;
  benefit_kind?: PromoBenefit["kind"] | null;
  benefit_plan?: "pro" | "pro_plus" | null;
  benefit_scan_credits?: number | null;
  benefit_duration_days?: number | null;
  benefit_module_key?: string | null;
  benefit_ends_at?: string | null;
}

export class PromotionRepositoryError extends Error {
  constructor(
    public readonly operation: string,
    public readonly databaseCode: string | null,
  ) {
    super(`Promotion repository failed: ${operation}`);
  }
}

function throwIfError(
  error: { code?: string | null } | null,
  operation: string,
): void {
  if (error) throw new PromotionRepositoryError(operation, error.code ?? null);
}

function rowBenefit(row: CampaignRow): PromoBenefit {
  if (row.benefit_kind === "ai_scans") {
    return { kind: "ai_scans", scanCredits: row.benefit_scan_credits ?? 0 };
  }
  if (row.benefit_kind === "plan_access") {
    return {
      kind: "plan_access",
      plan: row.benefit_plan ?? "pro",
      durationDays: row.benefit_duration_days ?? 0,
    };
  }
  return {
    kind: "module_access",
    moduleKey: row.benefit_module_key ?? "unavailable",
    durationDays: row.benefit_duration_days ?? 0,
  };
}

function campaignSummary(row: CampaignRow): PromoCampaignSummary {
  return {
    id: row.id,
    name: row.name,
    codeMasked: row.code_masked,
    status: row.status,
    benefit: rowBenefit(row),
    startsAt: row.starts_at,
    expiresAt: row.expires_at,
    maxRedemptions: row.max_redemptions,
    redeemedCount: row.redeemed_count,
    createdAt: row.created_at,
  };
}

function benefitColumns(benefit: PromoBenefit) {
  if (benefit.kind === "ai_scans") {
    return {
      benefit_kind: benefit.kind,
      benefit_scan_credits: benefit.scanCredits,
      benefit_plan: null,
      benefit_duration_days: null,
      benefit_module_key: null,
    };
  }
  if (benefit.kind === "plan_access") {
    return {
      benefit_kind: benefit.kind,
      benefit_scan_credits: null,
      benefit_plan: benefit.plan,
      benefit_duration_days: benefit.durationDays,
      benefit_module_key: null,
    };
  }
  return {
    benefit_kind: benefit.kind,
    benefit_scan_credits: null,
    benefit_plan: null,
    benefit_duration_days: benefit.durationDays,
    benefit_module_key: benefit.moduleKey,
  };
}

const CAMPAIGN_FIELDS =
  "id,name,code_masked,status,benefit_kind,benefit_plan,benefit_scan_credits,benefit_duration_days,benefit_module_key,starts_at,expires_at,max_redemptions,redeemed_count,created_at";

export async function listPromoCampaigns(
  admin: SupabaseClient,
): Promise<PromoCampaignSummary[]> {
  const { data, error } = await admin
    .from("promo_campaigns")
    .select(CAMPAIGN_FIELDS)
    .order("created_at", { ascending: false })
    .limit(200);
  throwIfError(error, "list_campaigns");
  return ((data ?? []) as CampaignRow[]).map(campaignSummary);
}

export async function createPromoCampaign(
  admin: SupabaseClient,
  input: {
    actorUserId: string;
    name: string;
    benefit: PromoBenefit;
    startsAt: string;
    expiresAt: string;
    maxRedemptions: number;
  },
): Promise<{ campaign: PromoCampaignSummary; code: string }> {
  const code = generatePromoCode();
  const { data, error } = await admin
    .from("promo_campaigns")
    .insert({
      name: input.name,
      code_hash: hashPromoCode(code),
      code_masked: maskPromoCode(code),
      status: "active",
      ...benefitColumns(input.benefit),
      starts_at: input.startsAt,
      expires_at: input.expiresAt,
      max_redemptions: input.maxRedemptions,
      created_by: input.actorUserId,
    })
    .select(CAMPAIGN_FIELDS)
    .single();
  throwIfError(error, "create_campaign");
  return { campaign: campaignSummary(data as CampaignRow), code };
}

export async function setPromoCampaignStatus(
  admin: SupabaseClient,
  campaignId: string,
  status: PromoCampaignStatus,
): Promise<PromoCampaignSummary> {
  const { data, error } = await admin
    .from("promo_campaigns")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", campaignId)
    .select(CAMPAIGN_FIELDS)
    .single();
  throwIfError(error, "set_campaign_status");
  return campaignSummary(data as CampaignRow);
}

export async function redeemPromoCode(
  admin: SupabaseClient,
  input: { userId: string; code: string },
): Promise<{
  status: PromoRedeemStatus;
  campaignName: string | null;
  benefit: PromoBenefit | null;
  benefitEndsAt: string | null;
}> {
  const { data, error } = await admin.rpc("redeem_promo_code", {
    p_user_id: input.userId,
    p_code_hash: hashPromoCode(input.code),
  });
  throwIfError(error, "redeem_code");
  const row = (Array.isArray(data) ? data[0] : data) as RedeemRow | null;
  const status = row?.result_status ?? "invalid_code";
  let benefit: PromoBenefit | null = null;
  if (row?.benefit_kind === "ai_scans" && row.benefit_scan_credits) {
    benefit = { kind: "ai_scans", scanCredits: row.benefit_scan_credits };
  } else if (
    row?.benefit_kind === "plan_access" &&
    row.benefit_plan &&
    row.benefit_duration_days
  ) {
    benefit = {
      kind: "plan_access",
      plan: row.benefit_plan,
      durationDays: row.benefit_duration_days,
    };
  } else if (
    row?.benefit_kind === "module_access" &&
    row.benefit_module_key &&
    row.benefit_duration_days
  ) {
    benefit = {
      kind: "module_access",
      moduleKey: row.benefit_module_key,
      durationDays: row.benefit_duration_days,
    };
  }
  return {
    status,
    campaignName: row?.campaign_name ?? null,
    benefit,
    benefitEndsAt: row?.benefit_ends_at ?? null,
  };
}
