import type { SupabaseClient, User } from "@supabase/supabase-js";
import { buildReferralShareUrl, getOrCreateReferralCode } from "@/lib/billing/referrals";
import {
  PARTNER_COMMISSION_BPS,
  PARTNER_MAX_ACCOUNTS,
  PARTNER_MAX_REFERRALS,
  PARTNER_PAYOUT_THRESHOLD_CENTS,
  maskPartnerIban,
  normalizePartnerEmail,
  type AdminPartnerRow,
  type PartnerAccountStatus,
  type PartnerAccountSummary,
  type PartnerCommissionEntryView,
  type PartnerDashboard,
  type PartnerPayoutView,
} from "./contracts";
import {
  buildPartnerCommissionSummary,
  buildPartnerPlanCounts,
} from "./metrics";

export interface PartnerAccountRecord {
  user_id: string;
  email: string;
  status: PartnerAccountStatus;
  commission_bps: number;
  payout_threshold_cents: number;
  payout_holder_name: string | null;
  payout_iban: string | null;
  payout_details_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ReferralRow {
  referrer_user_id: string;
  referee_user_id: string;
}

interface SubscriptionRow {
  user_id: string;
  plan: unknown;
  status: unknown;
  current_period_end: unknown;
}

interface CommissionRow {
  id: string;
  partner_user_id: string;
  source_plan: "pro" | "pro_plus";
  source_amount_cents: number;
  commission_cents: number;
  status: "pending" | "available" | "paid" | "reversed";
  earned_at: string;
  available_at: string | null;
  paid_at: string | null;
}

interface PayoutRow {
  id: string;
  amount_cents: number;
  status: "draft" | "approved" | "paid" | "canceled";
  created_at: string;
  paid_at: string | null;
}

export class PartnerSchemaUnavailableError extends Error {
  constructor() {
    super("El programa Partners todavía no está disponible en la base de datos.");
  }
}

export class PartnerRepositoryError extends Error {
  constructor(
    readonly operation: string,
    readonly databaseCode: string | null,
  ) {
    super("No se pudieron consultar los datos del programa Partners.");
  }
}

function isMissingPartnerSchemaError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /relation .*partner_(accounts|commission_entries|payouts).* does not exist/i.test(
      error.message ?? "",
    ) ||
    /could not find the table .*partner_(accounts|commission_entries|payouts).*schema cache/i.test(
      error.message ?? "",
    )
  );
}

function throwPartnerQueryError(
  error: { code?: string; message?: string } | null,
  operation: string,
): void {
  if (!error) return;
  if (isMissingPartnerSchemaError(error)) throw new PartnerSchemaUnavailableError();
  throw new PartnerRepositoryError(operation, error.code ?? null);
}

function safeNonNegativeInteger(value: unknown, fallback: number): number {
  return Number.isSafeInteger(value) && Number(value) >= 0
    ? Number(value)
    : fallback;
}

function accountSummary(row: PartnerAccountRecord): PartnerAccountSummary {
  const ibanMasked = maskPartnerIban(row.payout_iban);
  return {
    userId: row.user_id,
    email: row.email,
    status: row.status,
    commissionBps: safeNonNegativeInteger(
      row.commission_bps,
      PARTNER_COMMISSION_BPS,
    ),
    payoutThresholdCents: safeNonNegativeInteger(
      row.payout_threshold_cents,
      PARTNER_PAYOUT_THRESHOLD_CENTS,
    ),
    payoutProfile: {
      holderName: row.payout_holder_name?.trim() ?? "",
      ibanMasked,
      configured: Boolean(row.payout_holder_name?.trim() && ibanMasked),
      updatedAt: row.payout_details_updated_at ?? null,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getPartnerAccountRecord(
  admin: SupabaseClient,
  userId: string,
): Promise<PartnerAccountRecord | null> {
  const { data, error } = await admin
    .from("partner_accounts")
    .select(
      "user_id,email,status,commission_bps,payout_threshold_cents,payout_holder_name,payout_iban,payout_details_updated_at,created_at,updated_at",
    )
    .eq("user_id", userId)
    .maybeSingle();
  throwPartnerQueryError(error, "partner_account");
  return (data as PartnerAccountRecord | null) ?? null;
}

async function referralRowsForPartners(
  admin: SupabaseClient,
  partnerUserIds: readonly string[],
): Promise<ReferralRow[]> {
  if (partnerUserIds.length === 0) return [];
  const { data, error } = await admin
    .from("referral_redemptions")
    .select("referrer_user_id,referee_user_id")
    .in("referrer_user_id", partnerUserIds)
    .limit(PARTNER_MAX_REFERRALS);
  throwPartnerQueryError(error, "partner_referrals");
  return (data ?? []) as ReferralRow[];
}

async function subscriptionRowsForUsers(
  admin: SupabaseClient,
  userIds: readonly string[],
): Promise<SubscriptionRow[]> {
  if (userIds.length === 0) return [];
  const { data, error } = await admin
    .from("user_subscriptions")
    .select("user_id,plan,status,current_period_end")
    .in("user_id", userIds.slice(0, PARTNER_MAX_REFERRALS));
  throwPartnerQueryError(error, "partner_subscriptions");
  return (data ?? []) as SubscriptionRow[];
}

async function commissionRowsForPartners(
  admin: SupabaseClient,
  partnerUserIds: readonly string[],
): Promise<CommissionRow[]> {
  if (partnerUserIds.length === 0) return [];
  const { data, error } = await admin
    .from("partner_commission_entries")
    .select(
      "id,partner_user_id,source_plan,source_amount_cents,commission_cents,status,earned_at,available_at,paid_at",
    )
    .in("partner_user_id", partnerUserIds)
    .order("earned_at", { ascending: false })
    .limit(PARTNER_MAX_REFERRALS);
  throwPartnerQueryError(error, "partner_commissions");
  return (data ?? []) as CommissionRow[];
}

export async function buildPartnerDashboard(
  admin: SupabaseClient,
  input: {
    role: "admin" | "partner";
    account: PartnerAccountRecord | null;
    origin: string;
  },
): Promise<PartnerDashboard> {
  if (!input.account) {
    return {
      role: input.role,
      account: null,
      referral: {
        code: null,
        shareUrl: null,
        registeredCount: 0,
        payingCount: 0,
        inactiveCount: 0,
        planCounts: [],
        paidModules: [],
      },
      commissions: buildPartnerCommissionSummary([], {
        payoutConfigured: false,
      }),
      recentCommissions: [],
      recentPayouts: [],
    };
  }

  const referrals = await referralRowsForPartners(admin, [input.account.user_id]);
  const referredUserIds = referrals.map((row) => row.referee_user_id);
  const [subscriptions, commissions, payoutResult, code] = await Promise.all([
    subscriptionRowsForUsers(admin, referredUserIds),
    commissionRowsForPartners(admin, [input.account.user_id]),
    admin
      .from("partner_payouts")
      .select("id,amount_cents,status,created_at,paid_at")
      .eq("partner_user_id", input.account.user_id)
      .order("created_at", { ascending: false })
      .limit(20),
    getOrCreateReferralCode(input.account.user_id),
  ]);
  throwPartnerQueryError(payoutResult.error, "partner_payouts");

  const safeAccount = accountSummary(input.account);
  const metrics = buildPartnerPlanCounts(
    referredUserIds,
    subscriptions.map((row) => ({
      userId: row.user_id,
      plan: row.plan,
      status: row.status,
      currentPeriodEnd: row.current_period_end,
    })),
  );
  const commissionSummary = buildPartnerCommissionSummary(
    commissions.map((row) => ({
      status: row.status,
      commissionCents: row.commission_cents,
    })),
    {
      thresholdCents: safeAccount.payoutThresholdCents,
      payoutConfigured: safeAccount.payoutProfile.configured,
    },
  );

  return {
    role: input.role,
    account: safeAccount,
    referral: {
      code,
      shareUrl: code ? buildReferralShareUrl(input.origin, code) : null,
      registeredCount: metrics.registeredCount,
      payingCount: metrics.payingCount,
      inactiveCount: metrics.inactiveCount,
      planCounts: metrics.planCounts,
      paidModules: [],
    },
    commissions: commissionSummary,
    recentCommissions: commissions.slice(0, 20).map(
      (row): PartnerCommissionEntryView => ({
        id: row.id,
        plan: row.source_plan,
        sourceAmountCents: row.source_amount_cents,
        commissionCents: row.commission_cents,
        status: row.status,
        earnedAt: row.earned_at,
        availableAt: row.available_at,
        paidAt: row.paid_at,
      }),
    ),
    recentPayouts: ((payoutResult.data ?? []) as PayoutRow[]).map(
      (row): PartnerPayoutView => ({
        id: row.id,
        amountCents: row.amount_cents,
        status: row.status,
        createdAt: row.created_at,
        paidAt: row.paid_at,
      }),
    ),
  };
}

async function findAuthUserByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<User | null> {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw new Error("No se pudo buscar el usuario.");
    const match = data.users.find(
      (user) => normalizePartnerEmail(user.email) === email,
    );
    if (match) return match;
    if (data.users.length < 200) break;
  }
  return null;
}

export async function grantPartnerAccess(
  admin: SupabaseClient,
  input: { email: string; actorUserId: string },
): Promise<PartnerAccountSummary> {
  const email = normalizePartnerEmail(input.email);
  if (!email) throw new Error("Introduce un email válido.");
  const user = await findAuthUserByEmail(admin, email);
  if (!user) throw new Error("No existe una cuenta registrada con ese email.");

  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("partner_accounts")
    .upsert(
      {
        user_id: user.id,
        email,
        status: "active",
        commission_bps: PARTNER_COMMISSION_BPS,
        payout_threshold_cents: PARTNER_PAYOUT_THRESHOLD_CENTS,
        created_by: input.actorUserId,
        updated_at: now,
      },
      { onConflict: "user_id" },
    )
    .select(
      "user_id,email,status,commission_bps,payout_threshold_cents,payout_holder_name,payout_iban,payout_details_updated_at,created_at,updated_at",
    )
    .single();
  throwPartnerQueryError(error, "partner_grant");
  await getOrCreateReferralCode(user.id);
  return accountSummary(data as PartnerAccountRecord);
}

export async function setPartnerAccountStatus(
  admin: SupabaseClient,
  input: { userId: string; status: PartnerAccountStatus },
): Promise<PartnerAccountSummary> {
  const { data, error } = await admin
    .from("partner_accounts")
    .update({ status: input.status, updated_at: new Date().toISOString() })
    .eq("user_id", input.userId)
    .select(
      "user_id,email,status,commission_bps,payout_threshold_cents,payout_holder_name,payout_iban,payout_details_updated_at,created_at,updated_at",
    )
    .single();
  throwPartnerQueryError(error, "partner_status");
  return accountSummary(data as PartnerAccountRecord);
}

export async function updatePartnerPayoutProfile(
  admin: SupabaseClient,
  input: { userId: string; holderName: string; iban: string },
): Promise<PartnerAccountSummary> {
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("partner_accounts")
    .update({
      payout_holder_name: input.holderName,
      payout_iban: input.iban,
      payout_details_updated_at: now,
      updated_at: now,
    })
    .eq("user_id", input.userId)
    .select(
      "user_id,email,status,commission_bps,payout_threshold_cents,payout_holder_name,payout_iban,payout_details_updated_at,created_at,updated_at",
    )
    .single();
  throwPartnerQueryError(error, "partner_payout_profile");
  return accountSummary(data as PartnerAccountRecord);
}

export async function listAdminPartners(
  admin: SupabaseClient,
): Promise<AdminPartnerRow[]> {
  const { data, error } = await admin
    .from("partner_accounts")
    .select(
      "user_id,email,status,commission_bps,payout_threshold_cents,payout_holder_name,payout_iban,payout_details_updated_at,created_at,updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(PARTNER_MAX_ACCOUNTS);
  throwPartnerQueryError(error, "partner_list");
  const accounts = (data ?? []) as PartnerAccountRecord[];
  const partnerIds = accounts.map((row) => row.user_id);
  const referrals = await referralRowsForPartners(admin, partnerIds);
  const subscriptions = await subscriptionRowsForUsers(
    admin,
    referrals.map((row) => row.referee_user_id),
  );
  const commissions = await commissionRowsForPartners(admin, partnerIds);

  return accounts.map((account) => {
    const referredIds = referrals
      .filter((row) => row.referrer_user_id === account.user_id)
      .map((row) => row.referee_user_id);
    const metrics = buildPartnerPlanCounts(
      referredIds,
      subscriptions.map((row) => ({
        userId: row.user_id,
        plan: row.plan,
        status: row.status,
        currentPeriodEnd: row.current_period_end,
      })),
    );
    const safeAccount = accountSummary(account);
    const commissionSummary = buildPartnerCommissionSummary(
      commissions
        .filter((row) => row.partner_user_id === account.user_id)
        .map((row) => ({
          status: row.status,
          commissionCents: row.commission_cents,
        })),
      {
        thresholdCents: safeAccount.payoutThresholdCents,
        payoutConfigured: safeAccount.payoutProfile.configured,
      },
    );
    return {
      ...safeAccount,
      registeredCount: metrics.registeredCount,
      payingCount: metrics.payingCount,
      availableCents: commissionSummary.availableCents,
      paidCents: commissionSummary.paidCents,
    };
  });
}
