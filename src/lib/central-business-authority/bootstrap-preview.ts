import { createHash } from "node:crypto";

import {
  stableCentralBusinessJson,
  type CentralBusinessJson,
} from "./mutation-command";

assertServerOnlyModule();

export const CENTRAL_BUSINESS_BOOTSTRAP_PREVIEW =
  "CENTRAL_BUSINESS_BOOTSTRAP_PREVIEW_V1";

export type CentralBusinessBootstrapEntityType =
  "customer" | "supplier" | "product";

export interface CentralBusinessBootstrapEntityInput {
  entityType: CentralBusinessBootstrapEntityType;
  entityId: string;
  payload: CentralBusinessJson;
}

export interface CentralBusinessBootstrapCentralRow {
  entityType: CentralBusinessBootstrapEntityType;
  entityId: string;
  currentVersion: number;
  deleted: boolean;
  contentHash: string;
}

export interface CentralBusinessBootstrapPreviewEntry {
  entityType: CentralBusinessBootstrapEntityType;
  entityId: string;
  status: "create" | "identical" | "conflict" | "central_only";
  centralVersion: number | null;
  centralDeleted: boolean;
}

export interface CentralBusinessBootstrapPreview {
  schema: typeof CENTRAL_BUSINESS_BOOTSTRAP_PREVIEW;
  snapshotDigest: string;
  centralStateDigest: string;
  previewDigest: string;
  summary: {
    local: number;
    centralActive: number;
    centralDeleted: number;
    create: number;
    identical: number;
    conflict: number;
    centralOnly: number;
  };
  entries: CentralBusinessBootstrapPreviewEntry[];
  canCommit: boolean;
}

const ENTITY_TYPES = new Set<CentralBusinessBootstrapEntityType>([
  "customer",
  "supplier",
  "product",
]);

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "La vista previa de bootstrap central solo puede calcularse en servidor.",
    );
  }
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function key(entityType: string, entityId: string): string {
  return `${entityType}:${entityId}`;
}

function compareEntries(
  left: Pick<CentralBusinessBootstrapPreviewEntry, "entityType" | "entityId">,
  right: Pick<CentralBusinessBootstrapPreviewEntry, "entityType" | "entityId">,
): number {
  return (
    left.entityType.localeCompare(right.entityType) ||
    left.entityId.localeCompare(right.entityId)
  );
}

function payloadHash(payload: CentralBusinessJson): string {
  return sha256(stableCentralBusinessJson(payload));
}

function validateLocalEntity(
  entity: CentralBusinessBootstrapEntityInput,
): void {
  if (
    !ENTITY_TYPES.has(entity.entityType) ||
    !entity.entityId ||
    entity.entityId.length > 200 ||
    entity.payload === null ||
    typeof entity.payload !== "object" ||
    Array.isArray(entity.payload) ||
    entity.payload.id !== entity.entityId
  ) {
    throw new Error("INVALID_BOOTSTRAP_ENTITY");
  }
}

export function buildCentralBusinessBootstrapPreview(input: {
  localEntities: CentralBusinessBootstrapEntityInput[];
  centralEntities: CentralBusinessBootstrapCentralRow[];
}): CentralBusinessBootstrapPreview {
  const local = [...input.localEntities];
  const central = [...input.centralEntities];
  const localKeys = new Set<string>();
  const centralKeys = new Set<string>();

  for (const entity of local) {
    validateLocalEntity(entity);
    const entityKey = key(entity.entityType, entity.entityId);
    if (localKeys.has(entityKey)) throw new Error("DUPLICATE_BOOTSTRAP_ENTITY");
    localKeys.add(entityKey);
  }
  for (const entity of central) {
    if (
      !ENTITY_TYPES.has(entity.entityType) ||
      !entity.entityId ||
      !Number.isInteger(entity.currentVersion) ||
      entity.currentVersion < 1 ||
      !entity.contentHash
    ) {
      throw new Error("INVALID_CENTRAL_BOOTSTRAP_ENTITY");
    }
    const entityKey = key(entity.entityType, entity.entityId);
    if (centralKeys.has(entityKey)) {
      throw new Error("DUPLICATE_CENTRAL_BOOTSTRAP_ENTITY");
    }
    centralKeys.add(entityKey);
  }

  const centralByKey = new Map(
    central.map((entity) => [key(entity.entityType, entity.entityId), entity]),
  );
  const entries: CentralBusinessBootstrapPreviewEntry[] = [];

  for (const entity of local) {
    const current = centralByKey.get(key(entity.entityType, entity.entityId));
    if (!current) {
      entries.push({
        entityType: entity.entityType,
        entityId: entity.entityId,
        status: "create",
        centralVersion: null,
        centralDeleted: false,
      });
      continue;
    }
    const identical =
      !current.deleted && current.contentHash === payloadHash(entity.payload);
    entries.push({
      entityType: entity.entityType,
      entityId: entity.entityId,
      status: identical ? "identical" : "conflict",
      centralVersion: current.currentVersion,
      centralDeleted: current.deleted,
    });
  }

  for (const entity of central) {
    if (
      !entity.deleted &&
      !localKeys.has(key(entity.entityType, entity.entityId))
    ) {
      entries.push({
        entityType: entity.entityType,
        entityId: entity.entityId,
        status: "central_only",
        centralVersion: entity.currentVersion,
        centralDeleted: false,
      });
    }
  }

  entries.sort(compareEntries);
  const sortedLocal = local
    .map((entity) => ({
      contentHash: payloadHash(entity.payload),
      entityId: entity.entityId,
      entityType: entity.entityType,
    }))
    .sort(compareEntries);
  const sortedCentral = central
    .map((entity) => ({
      contentHash: entity.contentHash,
      currentVersion: entity.currentVersion,
      deleted: entity.deleted,
      entityId: entity.entityId,
      entityType: entity.entityType,
    }))
    .sort(compareEntries);
  const snapshotDigest = sha256(stableCentralBusinessJson(sortedLocal));
  const centralStateDigest = sha256(stableCentralBusinessJson(sortedCentral));
  const previewDigest = sha256(
    stableCentralBusinessJson({ centralStateDigest, snapshotDigest }),
  );
  const count = (status: CentralBusinessBootstrapPreviewEntry["status"]) =>
    entries.filter((entry) => entry.status === status).length;

  return {
    schema: CENTRAL_BUSINESS_BOOTSTRAP_PREVIEW,
    snapshotDigest,
    centralStateDigest,
    previewDigest,
    summary: {
      local: local.length,
      centralActive: central.filter((entity) => !entity.deleted).length,
      centralDeleted: central.filter((entity) => entity.deleted).length,
      create: count("create"),
      identical: count("identical"),
      conflict: count("conflict"),
      centralOnly: count("central_only"),
    },
    entries,
    canCommit: count("conflict") === 0 && count("central_only") === 0,
  };
}
