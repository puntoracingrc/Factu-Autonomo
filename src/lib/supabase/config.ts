export const TEMPORARY_CLOUD_SYNC_PAUSE_MESSAGE =
  "Sincronizacion pausada temporalmente. Los cambios se guardan solo en este dispositivo y se subiran cuando se reactive la nube.";

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
