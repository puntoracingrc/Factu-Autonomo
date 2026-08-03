import { isCentralAuthorityRolloutSelected } from "@/lib/central-authority/rollout";

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

export interface LegacyCloudRetirementEnvironment {
  userIds?: string;
  rolloutPercent?: string;
  rolloutEligibleUserIds?: string;
}

const legacyCloudRetirementEnvironment: LegacyCloudRetirementEnvironment = {
  userIds:
    process.env.NEXT_PUBLIC_CENTRAL_AUTHORITY_LEGACY_SYNC_RETIRED_USER_IDS,
  rolloutPercent: process.env.NEXT_PUBLIC_CENTRAL_AUTHORITY_ROLLOUT_PERCENT,
  rolloutEligibleUserIds:
    process.env.NEXT_PUBLIC_CENTRAL_AUTHORITY_ROLLOUT_ELIGIBLE_USER_IDS,
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isLegacyCloudExplicitlyRetiredForUser(
  userId: string | null | undefined,
  environment: LegacyCloudRetirementEnvironment = legacyCloudRetirementEnvironment,
): boolean {
  const normalizedUserId = userId?.trim().toLowerCase();
  if (!normalizedUserId || !UUID_PATTERN.test(normalizedUserId)) return false;

  return (environment.userIds ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => UUID_PATTERN.test(entry))
    .includes(normalizedUserId);
}

export function isLegacyCloudRetiredForUser(
  userId: string | null | undefined,
  environment: LegacyCloudRetirementEnvironment = legacyCloudRetirementEnvironment,
): boolean {
  if (isLegacyCloudExplicitlyRetiredForUser(userId, environment)) return true;
  return isCentralAuthorityRolloutSelected(
    userId,
    environment.rolloutPercent,
    environment.rolloutEligibleUserIds,
  );
}

export function isGoogleAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";
}
