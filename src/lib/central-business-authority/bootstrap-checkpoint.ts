"use client";

import type {
  CentralBusinessBootstrapBrowserEntity,
  CentralBusinessBootstrapBrowserPreview,
} from "./bootstrap-client";
import {
  recordCentralBusinessEntityVersionCheckpoint,
  type CentralBusinessQueueStorage,
} from "./durable-queue";

export const CENTRAL_BUSINESS_BOOTSTRAP_CHECKPOINT =
  "CENTRAL_BUSINESS_BOOTSTRAP_CHECKPOINT_V1";

function stableJson(
  value: CentralBusinessBootstrapBrowserEntity["payload"],
): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
    .join(",")}}`;
}

async function payloadHash(
  payload: CentralBusinessBootstrapBrowserEntity["payload"],
) {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(stableJson(payload)),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function entityKey(entityType: string, entityId: string) {
  return `${entityType}:${entityId}`;
}

export async function recordCentralBusinessBootstrapCheckpoint(input: {
  ownerScope: string;
  entities: CentralBusinessBootstrapBrowserEntity[];
  preview: CentralBusinessBootstrapBrowserPreview;
  storage?: CentralBusinessQueueStorage;
  verifyCurrentSnapshot?: () => boolean;
}) {
  if (!input.preview.canCommit) {
    throw new Error("CENTRAL_BUSINESS_BOOTSTRAP_CHECKPOINT_NOT_IDENTICAL");
  }
  const previewByKey = new Map(
    input.preview.entries.map((entry) => [
      entityKey(entry.entityType, entry.entityId),
      entry,
    ]),
  );
  if (
    input.preview.entries.length !== input.entities.length ||
    input.preview.entries.some(
      (entry) =>
        entry.centralDeleted ||
        (entry.status !== "create" && entry.status !== "identical"),
    )
  ) {
    throw new Error("CENTRAL_BUSINESS_BOOTSTRAP_CHECKPOINT_INVALID_PREVIEW");
  }

  const checkpoint = await Promise.all(
    input.entities.map(async (entity) => {
      const entry = previewByKey.get(
        entityKey(entity.entityType, entity.entityId),
      );
      const version =
        entry?.status === "create"
          ? 1
          : entry?.status === "identical"
            ? entry.centralVersion
            : null;
      if (!entry || !version) {
        throw new Error("CENTRAL_BUSINESS_BOOTSTRAP_CHECKPOINT_ENTITY_MISSING");
      }
      return {
        entityType: entity.entityType,
        entityId: entity.entityId,
        version,
        contentHash: await payloadHash(entity.payload),
      };
    }),
  );
  if (input.verifyCurrentSnapshot && !input.verifyCurrentSnapshot()) {
    throw new Error("CENTRAL_BUSINESS_BOOTSTRAP_CHECKPOINT_LOCAL_CHANGED");
  }

  return {
    schema: CENTRAL_BUSINESS_BOOTSTRAP_CHECKPOINT,
    state: recordCentralBusinessEntityVersionCheckpoint({
      ownerScope: input.ownerScope,
      entities: checkpoint,
      storage: input.storage,
    }),
  } as const;
}
