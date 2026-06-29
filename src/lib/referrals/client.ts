import { getSupabaseClientAsync } from "@/lib/supabase/client";
import {
  clearPendingReferralCode,
  readPendingReferralCode,
} from "@/lib/referrals/storage";

export interface ReferralProfile {
  code: string | null;
  shareUrl: string | null;
  bonusPerReferral: number;
  referralsCount: number;
  scansEarned: number;
  hasRedeemed: boolean;
  referralsUnavailable?: boolean;
}

async function getAccessToken(): Promise<string | null> {
  const supabase = await getSupabaseClientAsync();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function fetchReferralProfile(): Promise<ReferralProfile | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const res = await fetch("/api/referrals/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as ReferralProfile;
}

export async function redeemReferralCodeApi(
  code: string,
): Promise<
  | { ok: true; bonusScans: number; alreadyRedeemed?: boolean }
  | { ok: false; error: string }
> {
  const token = await getAccessToken();
  if (!token) {
    return { ok: false, error: "Inicia sesión para usar un código de invitación." };
  }

  const res = await fetch("/api/referrals/redeem", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code }),
  });

  const body = (await res.json()) as {
    ok?: boolean;
    error?: string;
    bonusScans?: number;
    alreadyRedeemed?: boolean;
  };

  if (!res.ok || !body.ok) {
    return { ok: false, error: body.error ?? "No se pudo aplicar el código." };
  }

  return {
    ok: true,
    bonusScans: body.bonusScans ?? 0,
    alreadyRedeemed: body.alreadyRedeemed,
  };
}

export async function tryRedeemPendingReferral(): Promise<string | null> {
  const pending = readPendingReferralCode();
  if (!pending) return null;

  const result = await redeemReferralCodeApi(pending);
  clearPendingReferralCode();

  if (!result.ok) return result.error;
  if (result.alreadyRedeemed) return null;
  if (result.bonusScans > 0) {
    return `¡Invitación aplicada! Tú y quien te invitó recibís ${result.bonusScans} escaneos extra.`;
  }
  return null;
}
