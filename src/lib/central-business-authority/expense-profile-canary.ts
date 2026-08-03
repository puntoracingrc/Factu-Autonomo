"use client";

import { isCentralAuthorityPublicRolloutUser } from "@/lib/central-authority/rollout";

export const CENTRAL_EXPENSE_PROFILE_CANARY =
  "CENTRAL_EXPENSE_PROFILE_CANARY_V1";

export interface CentralExpenseProfileCanaryEnvironment {
  expenseEnabled?: string;
  expenseUserIds?: string;
  profileEnabled?: string;
  profileUserIds?: string;
}

const publicEnvironment: CentralExpenseProfileCanaryEnvironment = {
  expenseEnabled:
    process.env.NEXT_PUBLIC_CENTRAL_BUSINESS_EXPENSE_CANARY_ENABLED,
  expenseUserIds:
    process.env.NEXT_PUBLIC_CENTRAL_BUSINESS_EXPENSE_CANARY_USER_IDS,
  profileEnabled:
    process.env.NEXT_PUBLIC_CENTRAL_BUSINESS_PROFILE_CANARY_ENABLED,
  profileUserIds:
    process.env.NEXT_PUBLIC_CENTRAL_BUSINESS_PROFILE_CANARY_USER_IDS,
};

function values(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
}

function enabledForUser(
  enabled: string | undefined,
  userIds: string | undefined,
  userId: string | null | undefined,
): boolean {
  return (
    enabled?.trim().toLowerCase() === "true" &&
    typeof userId === "string" &&
    values(userIds).has(userId)
  );
}

export function isCentralExpenseCanaryEnabledForUser(
  userId: string | null | undefined,
  environment: CentralExpenseProfileCanaryEnvironment = publicEnvironment,
): boolean {
  return (
    enabledForUser(
      environment.expenseEnabled,
      environment.expenseUserIds,
      userId,
    ) || isCentralAuthorityPublicRolloutUser(userId)
  );
}

export function isCentralProfileCanaryEnabledForUser(
  userId: string | null | undefined,
  environment: CentralExpenseProfileCanaryEnvironment = publicEnvironment,
): boolean {
  return (
    enabledForUser(
      environment.profileEnabled,
      environment.profileUserIds,
      userId,
    ) || isCentralAuthorityPublicRolloutUser(userId)
  );
}
