import { getAppUrl } from "@/lib/billing/config";

/** URL a la que Supabase redirige tras confirmar el email (añádela en Redirect URLs). */
export function getAuthCallbackUrl(): string {
  return `${getAppUrl()}/auth/callback`;
}
