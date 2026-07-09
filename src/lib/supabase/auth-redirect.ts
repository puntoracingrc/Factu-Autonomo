import { getAppUrl } from "@/lib/billing/config";

/** URL a la que Supabase redirige tras confirmar el email (añádela en Redirect URLs). */
export function getAuthCallbackUrl(): string {
  const origin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : getAppUrl();
  return `${origin.replace(/\/$/, "")}/auth/callback`;
}

/** URL a la que Supabase redirige tras pedir recuperacion de contraseña. */
export function getPasswordRecoveryCallbackUrl(): string {
  return `${getAuthCallbackUrl()}?type=recovery`;
}
