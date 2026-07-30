"use client";

import { useCallback, useMemo } from "react";

import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
import type { CentralBusinessEntityMutationResult } from "@/lib/central-business-authority/entity-mutation-canary";
import { updateProfileWithCentralCanary } from "@/lib/central-business-authority/profile-mutation-canary";
import type { BusinessProfile } from "@/lib/types";

export function useCentralProfileMutation(): {
  updateProfile: (
    profile: BusinessProfile,
  ) => Promise<CentralBusinessEntityMutationResult<BusinessProfile>>;
} {
  const {
    getCurrentData,
    syncCentralBusinessEvents,
    updateProfile: updateProfileFallback,
    updateProfileDurably,
  } = useAppStore();
  const { user } = useCloudSync();
  const userId = user?.id;

  const dependencies = useMemo(
    () => ({
      getCurrentData,
      updateProfileFallback,
      updateProfileDurably,
      syncEventsBeforeWrite: userId
        ? () => syncCentralBusinessEvents(userId)
        : undefined,
    }),
    [
      getCurrentData,
      syncCentralBusinessEvents,
      updateProfileDurably,
      updateProfileFallback,
      userId,
    ],
  );

  const updateProfile = useCallback(
    (profile: BusinessProfile) =>
      updateProfileWithCentralCanary({
        userId,
        profile,
        dependencies,
      }),
    [dependencies, userId],
  );

  return { updateProfile };
}
