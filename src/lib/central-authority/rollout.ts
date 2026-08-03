export const CENTRAL_AUTHORITY_ROLLOUT_PERCENT_KEY =
  "CENTRAL_AUTHORITY_ROLLOUT_PERCENT";
export const CENTRAL_AUTHORITY_KILL_SWITCH_KEY =
  "CENTRAL_AUTHORITY_KILL_SWITCH";
export const CENTRAL_AUTHORITY_ROLLOUT_ELIGIBLE_USERS_KEY =
  "CENTRAL_AUTHORITY_ROLLOUT_ELIGIBLE_USERS";
export const CENTRAL_AUTHORITY_PUBLIC_ROLLOUT_PERCENT_KEY =
  "NEXT_PUBLIC_CENTRAL_AUTHORITY_ROLLOUT_PERCENT";
export const CENTRAL_AUTHORITY_PUBLIC_KILL_SWITCH_KEY =
  "NEXT_PUBLIC_CENTRAL_AUTHORITY_KILL_SWITCH";
export const CENTRAL_AUTHORITY_PUBLIC_ROLLOUT_ELIGIBLE_USERS_KEY =
  "NEXT_PUBLIC_CENTRAL_AUTHORITY_ROLLOUT_ELIGIBLE_USER_IDS";

export interface CentralAuthorityPublicRolloutEnvironment {
  rolloutPercent?: string;
  killSwitch?: string;
  eligibleUserIds?: string;
}

export interface CentralAuthorityPublicRolloutDecision {
  selected: boolean;
  writesEnabled: boolean;
  emergencyStopped: boolean;
  percent: number;
  bucket: number | null;
}

const publicRolloutEnvironment: CentralAuthorityPublicRolloutEnvironment = {
  rolloutPercent:
    process.env.NEXT_PUBLIC_CENTRAL_AUTHORITY_ROLLOUT_PERCENT,
  killSwitch: process.env.NEXT_PUBLIC_CENTRAL_AUTHORITY_KILL_SWITCH,
  eligibleUserIds:
    process.env.NEXT_PUBLIC_CENTRAL_AUTHORITY_ROLLOUT_ELIGIBLE_USER_IDS,
};

export function centralAuthorityRolloutPercent(
  value: string | undefined,
): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, parsed));
}

export function isCentralAuthorityEmergencyStopped(
  value: string | undefined,
): boolean {
  return value?.trim().toLowerCase() === "true";
}

export function centralAuthorityRolloutBucket(
  userId: string | null | undefined,
): number | null {
  const normalized = userId?.trim().toLowerCase();
  if (!normalized) return null;
  let hash = 2_166_136_261;
  const input = `central-authority-rollout-v1:${normalized}`;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0) % 10_000;
}

export function isCentralAuthorityRolloutSelected(
  userId: string | null | undefined,
  percentValue: string | undefined,
  eligibleUserIds: string | undefined,
): boolean {
  const percent = centralAuthorityRolloutPercent(percentValue);
  const bucket = centralAuthorityRolloutBucket(userId);
  const normalizedUserId = userId?.trim().toLowerCase();
  const eligible = new Set(
    (eligibleUserIds ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
  if (
    bucket === null ||
    !normalizedUserId ||
    (!eligible.has("*") && !eligible.has(normalizedUserId)) ||
    percent <= 0
  ) {
    return false;
  }
  if (percent >= 100) return true;
  return bucket < Math.round(percent * 100);
}

export function evaluateCentralAuthorityPublicRollout(
  userId: string | null | undefined,
  environment: CentralAuthorityPublicRolloutEnvironment,
): CentralAuthorityPublicRolloutDecision {
  const percent = centralAuthorityRolloutPercent(environment.rolloutPercent);
  const bucket = centralAuthorityRolloutBucket(userId);
  const selected = isCentralAuthorityRolloutSelected(
    userId,
    environment.rolloutPercent,
    environment.eligibleUserIds,
  );
  const emergencyStopped = isCentralAuthorityEmergencyStopped(
    environment.killSwitch,
  );
  return {
    selected,
    writesEnabled: selected && !emergencyStopped,
    emergencyStopped,
    percent,
    bucket,
  };
}

export function isCentralAuthorityPublicRolloutUser(
  userId: string | null | undefined,
  environment: CentralAuthorityPublicRolloutEnvironment = publicRolloutEnvironment,
): boolean {
  return evaluateCentralAuthorityPublicRollout(userId, environment).selected;
}

export function isCentralAuthorityPublicWriteRolloutUser(
  userId: string | null | undefined,
  environment: CentralAuthorityPublicRolloutEnvironment = publicRolloutEnvironment,
): boolean {
  return evaluateCentralAuthorityPublicRollout(userId, environment)
    .writesEnabled;
}
