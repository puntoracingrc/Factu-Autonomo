import {
  WORKSPACE_STORAGE_GUEST_PREFIX,
  WORKSPACE_STORAGE_USER_PREFIX,
} from "./workspace-storage";

export type PersistedAppEntityShadowCanaryReason =
  | "kill_switch"
  | "invalid_storage_key"
  | "enabled_globally"
  | "enabled_for_owner"
  | "owner_not_allowed";

export interface PersistedAppEntityShadowCanaryEnvironment {
  enabled?: string;
  killSwitch?: string;
  ownerIds?: string;
}

export interface PersistedAppEntityShadowCanaryDecision {
  enabled: boolean;
  ownerId: string | null;
  reason: PersistedAppEntityShadowCanaryReason;
}

const DEFAULT_ENVIRONMENT: PersistedAppEntityShadowCanaryEnvironment = {
  enabled: process.env.NEXT_PUBLIC_ENTITY_SHADOW_ENABLED,
  killSwitch: process.env.NEXT_PUBLIC_ENTITY_SHADOW_KILL_SWITCH,
  ownerIds: process.env.NEXT_PUBLIC_ENTITY_SHADOW_CANARY_OWNER_IDS,
};

function ownerIdFromStorageKey(storageKey: string): string | null {
  const prefix = [
    WORKSPACE_STORAGE_USER_PREFIX,
    WORKSPACE_STORAGE_GUEST_PREFIX,
  ].find((candidate) => storageKey.startsWith(candidate));
  if (!prefix) return null;

  const encodedOwnerId = storageKey.slice(prefix.length);
  if (!encodedOwnerId) return null;
  try {
    const ownerId = decodeURIComponent(encodedOwnerId);
    if (
      !ownerId ||
      ownerId.trim() !== ownerId ||
      ownerId.length > 200 ||
      /[\u0000-\u001f\u007f]/u.test(ownerId)
    ) {
      return null;
    }
    return ownerId;
  } catch {
    return null;
  }
}

function allowedOwnerIds(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((candidate) => candidate.trim())
      .filter((candidate) => candidate.length > 0 && candidate !== "*"),
  );
}

export function evaluatePersistedAppEntityShadowCanary(
  storageKey: string,
  environment: PersistedAppEntityShadowCanaryEnvironment = DEFAULT_ENVIRONMENT,
): PersistedAppEntityShadowCanaryDecision {
  if (environment.killSwitch !== "false") {
    return { enabled: false, ownerId: null, reason: "kill_switch" };
  }

  const ownerId = ownerIdFromStorageKey(storageKey);
  if (!ownerId) {
    return { enabled: false, ownerId: null, reason: "invalid_storage_key" };
  }

  if (environment.enabled === "true") {
    return { enabled: true, ownerId, reason: "enabled_globally" };
  }

  if (allowedOwnerIds(environment.ownerIds).has(ownerId)) {
    return { enabled: true, ownerId, reason: "enabled_for_owner" };
  }

  return { enabled: false, ownerId, reason: "owner_not_allowed" };
}
