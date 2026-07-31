export const TEMPORARY_CLOUD_SYNC_PAUSE_MESSAGE =
  "Copia completa entre dispositivos pausada temporalmente. Las acciones confirmadas por el servidor central se sincronizan; las demás se guardan solo en este dispositivo hasta reactivar la copia completa.";

export function isCloudEnabled(): boolean {
  const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasSupabaseAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return hasSupabaseUrl && hasSupabaseAnonKey;
}

export function isCloudSyncTemporarilyPaused(): boolean {
  return process.env.NEXT_PUBLIC_CLOUD_SYNC_TEMPORARILY_PAUSED !== "false";
}

export function isGoogleAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";
}
