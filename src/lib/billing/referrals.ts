import { randomBytes } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  normalizeReferralCode,
  REFERRAL_BONUS_SCANS,
} from "./referral-codes";
import { grantBonusScans } from "./grant-bonus-scans";

export {
  REFERRAL_BONUS_SCANS,
  buildReferralShareUrl,
  normalizeReferralCode,
} from "./referral-codes";

export function generateReferralCodeValue(length = 8): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += alphabet[bytes[i]! % alphabet.length];
  }
  return code;
}

export async function getOrCreateReferralCode(userId: string): Promise<string | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data: existing } = await admin
    .from("referral_codes")
    .select("code")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing?.code) return String(existing.code);

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateReferralCodeValue();
    const { error } = await admin.from("referral_codes").insert({
      user_id: userId,
      code,
    });
    if (!error) return code;
  }

  return null;
}

async function findReferrerUserId(code: string): Promise<string | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const normalized = normalizeReferralCode(code);
  if (normalized.length < 6) return null;

  const { data } = await admin
    .from("referral_codes")
    .select("user_id, code")
    .ilike("code", normalized)
    .maybeSingle();

  return data?.user_id ? String(data.user_id) : null;
}

export type ReferralRedeemResult =
  | {
      ok: true;
      bonusScans: number;
      alreadyRedeemed?: boolean;
    }
  | { ok: false; error: string };

export async function redeemReferralCode(
  refereeUserId: string,
  rawCode: string,
): Promise<ReferralRedeemResult> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: "El servidor de referidos no está disponible." };
  }

  const code = normalizeReferralCode(rawCode);
  if (code.length < 6) {
    return { ok: false, error: "Código de invitación no válido." };
  }

  const { data: existingRedemption } = await admin
    .from("referral_redemptions")
    .select("id")
    .eq("referee_user_id", refereeUserId)
    .maybeSingle();

  if (existingRedemption) {
    return { ok: true, bonusScans: 0, alreadyRedeemed: true };
  }

  const referrerUserId = await findReferrerUserId(code);
  if (!referrerUserId) {
    return { ok: false, error: "No encontramos ese código de invitación." };
  }

  if (referrerUserId === refereeUserId) {
    return { ok: false, error: "No puedes usar tu propio código de invitación." };
  }

  const { error: insertError } = await admin.from("referral_redemptions").insert({
    referrer_user_id: referrerUserId,
    referee_user_id: refereeUserId,
    referral_code: code,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return { ok: true, bonusScans: 0, alreadyRedeemed: true };
    }
    return { ok: false, error: "No se pudo aplicar la invitación." };
  }

  const refereeGranted = await grantBonusScans(
    refereeUserId,
    REFERRAL_BONUS_SCANS,
  );
  const referrerGranted = await grantBonusScans(
    referrerUserId,
    REFERRAL_BONUS_SCANS,
  );

  await admin
    .from("referral_redemptions")
    .update({
      referee_bonus_granted: refereeGranted,
      referrer_bonus_granted: referrerGranted,
    })
    .eq("referee_user_id", refereeUserId);

  if (!refereeGranted) {
    return {
      ok: false,
      error: "Invitación registrada, pero no se pudieron añadir los escaneos. Contacta con soporte.",
    };
  }

  return { ok: true, bonusScans: REFERRAL_BONUS_SCANS };
}

export async function getReferralStats(userId: string): Promise<{
  referralsCount: number;
  scansEarned: number;
  hasRedeemed: boolean;
}> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { referralsCount: 0, scansEarned: 0, hasRedeemed: false };
  }

  const { count } = await admin
    .from("referral_redemptions")
    .select("id", { count: "exact", head: true })
    .eq("referrer_user_id", userId)
    .eq("referrer_bonus_granted", true);

  const { data: redeemed } = await admin
    .from("referral_redemptions")
    .select("id")
    .eq("referee_user_id", userId)
    .maybeSingle();

  return {
    referralsCount: count ?? 0,
    scansEarned: (count ?? 0) * REFERRAL_BONUS_SCANS,
    hasRedeemed: Boolean(redeemed),
  };
}
