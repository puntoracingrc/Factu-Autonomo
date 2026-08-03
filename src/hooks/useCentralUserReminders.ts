"use client";

import { useCallback, useMemo } from "react";

import { useAppStore } from "@/context/AppStore";
import {
  centralAuthorityPlanLoadingFailure,
  useCentralAuthorityPlanGate,
} from "@/hooks/useCentralAuthorityPlanGate";
import {
  createReminderWithCentralCanary,
  type CentralReminderCreateResult,
} from "@/lib/central-business-authority/reminder-create-canary";
import {
  deleteReminderWithCentralCanary,
  setReminderCompletedWithCentralCanary,
} from "@/lib/central-business-authority/reminder-mutation-canary";
import type { CentralBusinessEntityMutationResult } from "@/lib/central-business-authority/entity-mutation-canary";
import type { UserReminderDraft } from "@/lib/user-reminder-mutations";
import type { UserReminder } from "@/lib/types";

export function useCentralUserReminders(): {
  createReminder: (
    draft: UserReminderDraft,
  ) => Promise<CentralReminderCreateResult>;
  setReminderCompleted: (
    reminderId: string,
    completed: boolean,
  ) => Promise<CentralBusinessEntityMutationResult<UserReminder>>;
  deleteReminder: (
    reminderId: string,
  ) => Promise<CentralBusinessEntityMutationResult<string>>;
} {
  const {
    addUserReminder,
    addUserReminderDurably,
    completeUserReminder,
    deleteUserReminder,
    deleteUserReminderDurably,
    getCurrentData,
    reopenUserReminder,
    syncCentralBusinessEvents,
    updateUserReminderDurably,
  } = useAppStore();
  const planGate = useCentralAuthorityPlanGate();
  const userId = planGate.centralUserId;

  const syncEventsBeforeWrite = useMemo(
    () => (userId ? () => syncCentralBusinessEvents(userId) : undefined),
    [syncCentralBusinessEvents, userId],
  );

  const createReminder = useCallback(
    async (draft: UserReminderDraft) => {
      if (planGate.mode === "loading") {
        return centralAuthorityPlanLoadingFailure();
      }
      return createReminderWithCentralCanary({
        userId,
        draft,
        dependencies: {
          getCurrentData,
          addUserReminderFallback: addUserReminder,
          addUserReminderDurably,
          syncEventsBeforeWrite,
        },
      });
    },
    [
      addUserReminder,
      addUserReminderDurably,
      getCurrentData,
      planGate.mode,
      syncEventsBeforeWrite,
      userId,
    ],
  );

  const mutationDependencies = useMemo(
    () => ({
      getCurrentData,
      completeUserReminderFallback: completeUserReminder,
      reopenUserReminderFallback: reopenUserReminder,
      deleteUserReminderFallback: deleteUserReminder,
      updateUserReminderDurably,
      deleteUserReminderDurably,
      syncEventsBeforeWrite,
    }),
    [
      completeUserReminder,
      deleteUserReminder,
      deleteUserReminderDurably,
      getCurrentData,
      reopenUserReminder,
      syncEventsBeforeWrite,
      updateUserReminderDurably,
    ],
  );

  const setReminderCompleted = useCallback(
    async (reminderId: string, completed: boolean) => {
      if (planGate.mode === "loading") {
        return centralAuthorityPlanLoadingFailure();
      }
      return setReminderCompletedWithCentralCanary({
        userId,
        reminderId,
        completed,
        dependencies: mutationDependencies,
      });
    },
    [mutationDependencies, planGate.mode, userId],
  );

  const deleteReminder = useCallback(
    async (reminderId: string) => {
      if (planGate.mode === "loading") {
        return centralAuthorityPlanLoadingFailure();
      }
      return deleteReminderWithCentralCanary({
        userId,
        reminderId,
        dependencies: mutationDependencies,
      });
    },
    [mutationDependencies, planGate.mode, userId],
  );

  return { createReminder, setReminderCompleted, deleteReminder };
}
