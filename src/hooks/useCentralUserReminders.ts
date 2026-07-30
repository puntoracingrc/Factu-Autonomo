"use client";

import { useCallback, useMemo } from "react";

import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
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
  const { user } = useCloudSync();
  const userId = user?.id;

  const syncEventsBeforeWrite = useMemo(
    () => (userId ? () => syncCentralBusinessEvents(userId) : undefined),
    [syncCentralBusinessEvents, userId],
  );

  const createReminder = useCallback(
    (draft: UserReminderDraft) =>
      createReminderWithCentralCanary({
        userId,
        draft,
        dependencies: {
          getCurrentData,
          addUserReminderFallback: addUserReminder,
          addUserReminderDurably,
          syncEventsBeforeWrite,
        },
      }),
    [
      addUserReminder,
      addUserReminderDurably,
      getCurrentData,
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
    (reminderId: string, completed: boolean) =>
      setReminderCompletedWithCentralCanary({
        userId,
        reminderId,
        completed,
        dependencies: mutationDependencies,
      }),
    [mutationDependencies, userId],
  );

  const deleteReminder = useCallback(
    (reminderId: string) =>
      deleteReminderWithCentralCanary({
        userId,
        reminderId,
        dependencies: mutationDependencies,
      }),
    [mutationDependencies, userId],
  );

  return { createReminder, setReminderCompleted, deleteReminder };
}
