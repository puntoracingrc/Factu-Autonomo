"use client";

import { hasVerifiedCentralBusinessAutomaticBootstrap } from "@/lib/central-business-authority/automatic-bootstrap-state";
import {
  buildCentralBusinessBootstrapBrowserSnapshot,
  type CentralBusinessBootstrapBrowserEntity,
} from "@/lib/central-business-authority/bootstrap-client";
import { centralBusinessBootstrapEntityContentHash } from "@/lib/central-business-authority/bootstrap-checkpoint";
import {
  loadCentralBusinessDurableQueue,
  type CentralBusinessQueueStorage,
} from "@/lib/central-business-authority/durable-queue";
import type { AppData } from "@/lib/types";

function meaningfulIssuerIdentity(data: AppData): boolean {
  return Boolean(
    data.profile.nif.trim() ||
      data.profile.name.trim() ||
      data.profile.email.trim(),
  );
}

function profileEntity(
  data: AppData,
): CentralBusinessBootstrapBrowserEntity | null {
  try {
    return (
      buildCentralBusinessBootstrapBrowserSnapshot(data).find(
        (entity) =>
          entity.entityType === "profile" && entity.entityId === "profile",
      ) ?? null
    );
  } catch {
    return null;
  }
}

/**
 * Solo permite una migracion silenciosa cuando este navegador ya verifico el
 * bootstrap del mismo usuario y el perfil local conserva el hash central que
 * quedo registrado en su checkpoint durable.
 */
export async function legacyWorkspaceMatchesVerifiedOwner(input: {
  data: AppData;
  ownerScope: string;
  storage: CentralBusinessQueueStorage;
}): Promise<boolean> {
  if (!meaningfulIssuerIdentity(input.data)) return false;
  if (
    !hasVerifiedCentralBusinessAutomaticBootstrap(
      input.ownerScope,
      input.storage,
    )
  ) {
    return false;
  }

  let checkpointHash: string | undefined;
  try {
    checkpointHash = loadCentralBusinessDurableQueue(
      input.ownerScope,
      input.storage,
    ).entityVersions["profile:profile"]?.contentHash;
  } catch {
    return false;
  }
  if (!checkpointHash) return false;

  const entity = profileEntity(input.data);
  if (!entity) return false;
  try {
    return (
      (await centralBusinessBootstrapEntityContentHash(entity.payload)) ===
      checkpointHash
    );
  } catch {
    return false;
  }
}
