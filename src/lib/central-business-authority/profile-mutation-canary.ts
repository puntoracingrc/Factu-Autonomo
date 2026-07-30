"use client";

import type { AppDataDurabilityResult } from "@/lib/app-data-durability";
import { normalizeLoadedData } from "@/lib/storage";
import type { AppData, BusinessProfile } from "@/lib/types";

import type { CentralBusinessQueueStorage } from "./durable-queue";
import {
  mutateCentralBusinessEntityWithCanary,
  type CentralBusinessEntityMutationResult,
} from "./entity-mutation-canary";
import type { CentralBusinessEventsAppDataSyncResult } from "./events-app-data-sync";
import {
  isCentralProfileCanaryEnabledForUser,
  type CentralExpenseProfileCanaryEnvironment,
} from "./expense-profile-canary";
import type { CentralBusinessBrowserMutationResult } from "./mutation-client";
import type { CentralBusinessJson } from "./mutation-command";
import type { CentralBusinessAuthorityStatusResult } from "./status-client";

export const CENTRAL_PROFILE_MUTATION_CANARY =
  "CENTRAL_PROFILE_MUTATION_CANARY_V1";

export type CentralProfileUpdate = (
  current: BusinessProfile,
) => BusinessProfile;

export interface CentralProfileMutationCanaryDependencies {
  getCurrentData(): AppData;
  updateProfileFallback(profile: BusinessProfile): void;
  updateProfileDurably(
    profile: BusinessProfile,
    expected: AppData,
  ): AppDataDurabilityResult<BusinessProfile>;
  syncEventsBeforeWrite?: () => Promise<CentralBusinessEventsAppDataSyncResult>;
  fetchStatus?: () => Promise<CentralBusinessAuthorityStatusResult>;
  mutate?: (
    input: Parameters<
      typeof import("./mutation-client").mutateCentralBusinessFromBrowser
    >[0],
  ) => Promise<CentralBusinessBrowserMutationResult>;
  storage?: CentralBusinessQueueStorage;
  createId?: () => string;
  now?: () => string;
  statusTimeoutMs?: number;
  environment?: CentralExpenseProfileCanaryEnvironment;
}

function jsonProfile(profile: BusinessProfile): CentralBusinessJson {
  return JSON.parse(JSON.stringify(profile)) as CentralBusinessJson;
}

function resolveProfileUpdate(
  update: CentralProfileUpdate,
  current: BusinessProfile,
): BusinessProfile {
  return normalizeLoadedData({
    profile: update(current),
  }).profile;
}

export async function updateProfileWithCentralCanary(input: {
  userId: string | null | undefined;
  profile: CentralProfileUpdate;
  dependencies: CentralProfileMutationCanaryDependencies;
}): Promise<CentralBusinessEntityMutationResult<BusinessProfile>> {
  const { dependencies } = input;
  return mutateCentralBusinessEntityWithCanary({
    enabled: isCentralProfileCanaryEnabledForUser(
      input.userId,
      dependencies.environment,
    ),
    userId: input.userId,
    entityType: "profile",
    entityId: "profile",
    operationKind: "upsert",
    operationIdPrefix: "CENTRAL_PROFILE_UPDATE",
    entityLabel: "el perfil del negocio",
    dependencies: {
      ...dependencies,
      fallback: () => {
        const profile = resolveProfileUpdate(
          input.profile,
          dependencies.getCurrentData().profile,
        );
        dependencies.updateProfileFallback(profile);
        return {
          ok: true,
          value: profile,
          delivery: "local",
        };
      },
      prepareLocal: ({ data }) => {
        const normalized = resolveProfileUpdate(input.profile, data.profile);
        return {
          ok: true,
          payload: jsonProfile(normalized),
          transition: {
            data: { ...data, profile: normalized },
            value: normalized,
          },
        };
      },
      commitLocal: (expected, transition) =>
        dependencies.updateProfileDurably(transition.value, expected),
    },
  });
}
