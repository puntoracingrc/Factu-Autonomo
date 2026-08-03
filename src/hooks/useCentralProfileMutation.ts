"use client";

import { useCallback, useMemo, useRef } from "react";

import { useAppStore } from "@/context/AppStore";
import {
  centralAuthorityPlanLoadingFailure,
  useCentralAuthorityPlanGate,
} from "@/hooks/useCentralAuthorityPlanGate";
import type { CentralBusinessEntityMutationResult } from "@/lib/central-business-authority/entity-mutation-canary";
import {
  updateProfileWithCentralCanary,
  type CentralProfileUpdate,
} from "@/lib/central-business-authority/profile-mutation-canary";
import { createSerialMutationRunner } from "@/lib/central-business-authority/serial-mutation";
import type { BusinessProfile } from "@/lib/types";

export function useCentralProfileMutation(): {
  updateProfile: (
    profile: CentralProfileUpdate,
  ) => Promise<CentralBusinessEntityMutationResult<BusinessProfile>>;
} {
  const {
    getCurrentData,
    syncCentralBusinessEvents,
    updateProfile: updateProfileFallback,
    updateProfileDurably,
  } = useAppStore();
  const planGate = useCentralAuthorityPlanGate();
  const userId = planGate.centralUserId;
  const runSerialMutation = useRef(createSerialMutationRunner()).current;

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
    (profile: CentralProfileUpdate) => {
      if (planGate.mode === "loading") {
        return Promise.resolve(centralAuthorityPlanLoadingFailure());
      }
      return runSerialMutation(() =>
        updateProfileWithCentralCanary({
          userId,
          profile,
          dependencies,
        }),
      );
    },
    [dependencies, planGate.mode, runSerialMutation, userId],
  );

  return { updateProfile };
}
