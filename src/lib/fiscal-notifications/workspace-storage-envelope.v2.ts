import { sha256Hex } from "../document-integrity/snapshot-hash";
import { resolveAeatDocumentProfileV1 } from "./knowledge/aeat-document-knowledge.v1";
import { resolveAeatOfficialCatalogProfileV9 } from "./knowledge/official-catalog-expansion.v9";
import {
  resolveProfileFieldLabelV2,
  type ProfileFieldKindV2,
} from "./extractor-core/profile-field-labels.v2";
import type { AdministrativeMoneyKind } from "./administrative-domain";
import {
  parseFiscalNotificationsWorkspaceForPersistenceV2,
  type DocumentDateKindV2,
  type FiscalNotificationsPersistedWorkspaceV2,
  type PersistedDocumentV2,
  type PersistedEvidenceV2,
  type PersistedReferenceV2,
} from "./persisted-workspace.v2";
import {
  canonicalFiscalNotificationOwnerScopeV2,
  sensitiveReferenceMemoryCarrierV2,
  sensitiveReferenceSafeLabelV2,
} from "./sensitive-reference.v2";
import type {
  AdministrativeDocument,
  AdministrativeDocumentType,
  AssertionType,
  ConfidenceBand,
  DocumentRelation,
  ExternalReference,
  ExtractionMethod,
  FiscalNotificationsWorkspace,
  MoneyComponentType,
} from "./types";
import { projectFiscalNotificationsWorkspacePrivacyV2 } from "./workspace-privacy-projection.v2";
import { parseFiscalNotificationsWorkspaceForPersistenceV1 } from "./workspace-persistence.v1";
import { appendWorkspaceGlobalReconciliationV8 } from "./workspace-global-reconciliation.v8";

export const FISCAL_NOTIFICATIONS_WORKSPACE_STORAGE_KIND_V2 =
  "FISCAL_NOTIFICATIONS_PRIVACY_WORKSPACE_V2" as const;
export const FISCAL_NOTIFICATIONS_WORKSPACE_STORAGE_VERSION_V2 = 1 as const;
export const FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V2 =
  "fiscal-notifications-workspace-v2" as const;

const SHA256 = /^[0-9a-f]{64}$/u;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_.:/\-]{0,159}$/u;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/u;
const TAX_ID =
  /(?:^|[^A-Z0-9])(?:\d{8}[A-Z]|[XYZ]\d{7}[A-Z]|[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J])(?=$|[^A-Z0-9])/iu;
const IBAN = /(?:^|[^A-Z0-9])ES\d{22}(?=$|[^A-Z0-9])/iu;
const PHONE = /(?:^|[^A-Z0-9])(?:34)?[6789]\d{8}(?=$|[^A-Z0-9])/iu;
const DATE_TIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/u;
const MAX_SOURCES = 5_000;
const memoryEnvelopeByWorkspace = new WeakMap<
  object,
  Readonly<FiscalNotificationsWorkspaceStorageEnvelopeV2>
>();

export interface FiscalNotificationPersistedSourceV2 {
  readonly fileId: string;
  readonly packageId: string;
  readonly ownerScope: string;
  readonly role: "PRIMARY" | "ANNEX" | "NOTIFICATION_PROOF";
  readonly mimeType: "application/pdf";
  readonly fileSize: number;
  readonly pageCount: number;
  readonly sha256: string;
  readonly contentFingerprint: string;
  readonly uploadedAt: string;
  readonly receivedAt?: string;
  readonly documentIds: readonly string[];
}

export type FiscalNotificationsWorkspaceTransitionV2 =
  | Readonly<{
      kind: "USER_CONFIRMED_DOCUMENT_REDUCTION_V1";
      ownerScope: string;
      confirmedAt: string;
      baseWorkspaceId: string;
      baseCreatedAt: string;
      baseRevision: number;
      baseUpdatedAt: string;
      baseDocumentIds?: readonly string[];
      removedDocumentIds: readonly string[];
    }>
  | Readonly<{
      kind: "USER_CONFIRMED_EMPTY_RESTART_V1";
      ownerScope: string;
      confirmedAt: string;
      baseWorkspaceId?: string;
      baseCreatedAt?: string;
      baseRevision?: number;
      baseUpdatedAt?: string;
      baseEnvelopeSha256?: string;
      lineageEnvelopeSha256s?: readonly string[];
    }>
  | Readonly<{
      kind: "AUTO_REPAIRED_EMPTY_HISTORY_V1";
      ownerScope: string;
      repairedAt: string;
    }>;

export interface FiscalNotificationsWorkspaceStorageEnvelopeV2 {
  readonly storageKind: typeof FISCAL_NOTIFICATIONS_WORKSPACE_STORAGE_KIND_V2;
  readonly storageVersion: typeof FISCAL_NOTIFICATIONS_WORKSPACE_STORAGE_VERSION_V2;
  readonly workspace: Readonly<FiscalNotificationsPersistedWorkspaceV2>;
  readonly sources: readonly Readonly<FiscalNotificationPersistedSourceV2>[];
  readonly transition?: FiscalNotificationsWorkspaceTransitionV2;
}

export type FiscalNotificationsWorkspaceStorageComparisonV2 =
  "EQUAL" | "INCOMING_ADVANCES" | "CURRENT_ADVANCES" | "DIVERGED";

type JsonRecord = Record<string, unknown>;

function plainRecord(
  value: unknown,
  allowedKeys: readonly string[],
): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    if (Object.getOwnPropertySymbols(value).length > 0) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Object.keys(descriptors);
    if (keys.some((key) => !allowedKeys.includes(key))) return null;
    const result: JsonRecord = Object.create(null) as JsonRecord;
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
        return null;
      }
      result[key] = descriptor.value;
    }
    return result;
  } catch {
    return null;
  }
}

function own(value: JsonRecord, key: string): unknown {
  return Object.prototype.hasOwnProperty.call(value, key)
    ? value[key]
    : undefined;
}

function safeId(value: unknown): string | null {
  return typeof value === "string" &&
    SAFE_ID.test(value) &&
    !CONTROL_CHARACTERS.test(value) &&
    !TAX_ID.test(value) &&
    !IBAN.test(value) &&
    !PHONE.test(value)
    ? value
    : null;
}

function safeTimestamp(value: unknown): string | null {
  return typeof value === "string" &&
    DATE_TIME.test(value) &&
    !Number.isNaN(Date.parse(value))
    ? value
    : null;
}

function safePositiveInteger(value: unknown): number | null {
  return Number.isSafeInteger(value) && Number(value) > 0
    ? Number(value)
    : null;
}

function safeNonNegativeInteger(value: unknown): number | null {
  return Number.isSafeInteger(value) && Number(value) >= 0
    ? Number(value)
    : null;
}

function parseTransition(
  value: unknown,
  expectedOwnerScope: string,
): FiscalNotificationsWorkspaceTransitionV2 | null {
  const candidate = plainRecord(value, [
    "kind",
    "ownerScope",
    "confirmedAt",
    "repairedAt",
    "baseWorkspaceId",
    "baseCreatedAt",
    "baseRevision",
    "baseUpdatedAt",
    "baseEnvelopeSha256",
    "lineageEnvelopeSha256s",
    "baseDocumentIds",
    "removedDocumentIds",
  ]);
  if (!candidate) return null;
  const kind = own(candidate, "kind");
  const ownerScope = canonicalFiscalNotificationOwnerScopeV2(
    own(candidate, "ownerScope"),
  );
  const confirmedAt = safeTimestamp(own(candidate, "confirmedAt"));
  if (ownerScope !== expectedOwnerScope) return null;
  if (kind === "AUTO_REPAIRED_EMPTY_HISTORY_V1") {
    const repairedAt = safeTimestamp(own(candidate, "repairedAt"));
    if (
      !repairedAt ||
      own(candidate, "confirmedAt") !== undefined ||
      own(candidate, "baseWorkspaceId") !== undefined ||
      own(candidate, "baseCreatedAt") !== undefined ||
      own(candidate, "baseRevision") !== undefined ||
      own(candidate, "baseUpdatedAt") !== undefined ||
      own(candidate, "baseEnvelopeSha256") !== undefined ||
      own(candidate, "lineageEnvelopeSha256s") !== undefined ||
      own(candidate, "baseDocumentIds") !== undefined ||
      own(candidate, "removedDocumentIds") !== undefined
    ) {
      return null;
    }
    return deepFreeze({ kind, ownerScope, repairedAt });
  }
  if (!confirmedAt || own(candidate, "repairedAt") !== undefined) return null;
  if (kind === "USER_CONFIRMED_EMPTY_RESTART_V1") {
    const rawBaseFields = [
      own(candidate, "baseWorkspaceId"),
      own(candidate, "baseCreatedAt"),
      own(candidate, "baseRevision"),
      own(candidate, "baseUpdatedAt"),
      own(candidate, "baseEnvelopeSha256"),
    ];
    const hasBoundBase = rawBaseFields.some((field) => field !== undefined);
    if (!hasBoundBase) {
      if (
        own(candidate, "lineageEnvelopeSha256s") !== undefined ||
        own(candidate, "baseDocumentIds") !== undefined ||
        own(candidate, "removedDocumentIds") !== undefined
      ) {
        return null;
      }
      return deepFreeze({ kind, ownerScope, confirmedAt });
    }
    const baseWorkspaceId = safeId(rawBaseFields[0]);
    const baseCreatedAt = safeTimestamp(rawBaseFields[1]);
    const baseRevision = safeNonNegativeInteger(rawBaseFields[2]);
    const baseUpdatedAt = safeTimestamp(rawBaseFields[3]);
    const baseEnvelopeSha256 = rawBaseFields[4];
    const rawLineageEnvelopeSha256s = own(
      candidate,
      "lineageEnvelopeSha256s",
    );
    const lineageEnvelopeSha256s = Array.isArray(
      rawLineageEnvelopeSha256s,
    )
      ? rawLineageEnvelopeSha256s.filter(
          (value): value is string =>
            typeof value === "string" && SHA256.test(value),
        )
      : undefined;
    if (
      !baseWorkspaceId ||
      !baseCreatedAt ||
      baseRevision === null ||
      !baseUpdatedAt ||
      typeof baseEnvelopeSha256 !== "string" ||
      !SHA256.test(baseEnvelopeSha256) ||
      (rawLineageEnvelopeSha256s !== undefined &&
        (!Array.isArray(rawLineageEnvelopeSha256s) ||
          lineageEnvelopeSha256s?.length !==
            rawLineageEnvelopeSha256s.length ||
          (lineageEnvelopeSha256s?.length ?? 0) > MAX_SOURCES ||
          new Set(lineageEnvelopeSha256s).size !==
            lineageEnvelopeSha256s?.length)) ||
      Date.parse(confirmedAt) <= Date.parse(baseUpdatedAt) ||
      own(candidate, "baseDocumentIds") !== undefined ||
      own(candidate, "removedDocumentIds") !== undefined
    ) {
      return null;
    }
    return deepFreeze({
      kind,
      ownerScope,
      confirmedAt,
      baseWorkspaceId,
      baseCreatedAt,
      baseRevision,
      baseUpdatedAt,
      baseEnvelopeSha256,
      ...(lineageEnvelopeSha256s
        ? { lineageEnvelopeSha256s }
        : {}),
    });
  }
  if (kind !== "USER_CONFIRMED_DOCUMENT_REDUCTION_V1") return null;
  const baseWorkspaceId = safeId(own(candidate, "baseWorkspaceId"));
  const baseCreatedAt = safeTimestamp(own(candidate, "baseCreatedAt"));
  const baseRevision = safeNonNegativeInteger(own(candidate, "baseRevision"));
  const baseUpdatedAt = safeTimestamp(own(candidate, "baseUpdatedAt"));
  if (
    own(candidate, "baseEnvelopeSha256") !== undefined ||
    own(candidate, "lineageEnvelopeSha256s") !== undefined
  ) {
    return null;
  }
  const rawBaseDocumentIds = own(candidate, "baseDocumentIds");
  const baseDocumentIds = Array.isArray(rawBaseDocumentIds)
    ? rawBaseDocumentIds.map(safeId)
    : undefined;
  const rawRemovedDocumentIds = own(candidate, "removedDocumentIds");
  const removedDocumentIds = Array.isArray(rawRemovedDocumentIds)
    ? rawRemovedDocumentIds.map(safeId)
    : [];
  if (
    !baseWorkspaceId ||
    !baseCreatedAt ||
    baseRevision === null ||
    !baseUpdatedAt ||
    !Array.isArray(rawRemovedDocumentIds) ||
    removedDocumentIds.length === 0 ||
    removedDocumentIds.length > MAX_SOURCES ||
    removedDocumentIds.some((id) => id === null) ||
    new Set(removedDocumentIds).size !== removedDocumentIds.length ||
    (rawBaseDocumentIds !== undefined &&
      (!Array.isArray(rawBaseDocumentIds) ||
        baseDocumentIds?.length === 0 ||
        (baseDocumentIds?.length ?? 0) > MAX_SOURCES ||
        baseDocumentIds?.some((id) => id === null) ||
        new Set(baseDocumentIds).size !== baseDocumentIds?.length ||
        removedDocumentIds.some(
          (id) => !baseDocumentIds?.includes(id as string),
        ))) ||
    Date.parse(confirmedAt) <= Date.parse(baseUpdatedAt)
  ) {
    return null;
  }
  return deepFreeze({
    kind,
    ownerScope,
    confirmedAt,
    baseWorkspaceId,
    baseCreatedAt,
    baseRevision,
    baseUpdatedAt,
    ...(baseDocumentIds
      ? { baseDocumentIds: baseDocumentIds as string[] }
      : {}),
    removedDocumentIds: removedDocumentIds as string[],
  });
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

function stableNormalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableNormalize);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value)
    .sort()
    .reduce<JsonRecord>(
      (result, key) => {
        const entry = (value as JsonRecord)[key];
        if (entry !== undefined) result[key] = stableNormalize(entry);
        return result;
      },
      Object.create(null) as JsonRecord,
    );
}

function stableJson(value: unknown): string {
  return JSON.stringify(stableNormalize(value));
}

function parseSource(
  value: unknown,
  expectedOwnerScope: string,
  documentIds: ReadonlySet<string>,
): Readonly<FiscalNotificationPersistedSourceV2> | null {
  const source = plainRecord(value, [
    "fileId",
    "packageId",
    "ownerScope",
    "role",
    "mimeType",
    "fileSize",
    "pageCount",
    "sha256",
    "contentFingerprint",
    "uploadedAt",
    "receivedAt",
    "documentIds",
  ]);
  if (!source) return null;
  const fileId = safeId(own(source, "fileId"));
  const packageId = safeId(own(source, "packageId"));
  const ownerScope = canonicalFiscalNotificationOwnerScopeV2(
    own(source, "ownerScope"),
  );
  const fileSize = safePositiveInteger(own(source, "fileSize"));
  const pageCount = safePositiveInteger(own(source, "pageCount"));
  const uploadedAt = safeTimestamp(own(source, "uploadedAt"));
  const receivedAtValue = own(source, "receivedAt");
  const receivedAt =
    receivedAtValue === undefined ? undefined : safeTimestamp(receivedAtValue);
  const rawDocumentIds = own(source, "documentIds");
  if (
    !fileId ||
    !packageId ||
    ownerScope !== expectedOwnerScope ||
    !["PRIMARY", "ANNEX", "NOTIFICATION_PROOF"].includes(
      String(own(source, "role")),
    ) ||
    own(source, "mimeType") !== "application/pdf" ||
    !fileSize ||
    !pageCount ||
    typeof own(source, "sha256") !== "string" ||
    !SHA256.test(String(own(source, "sha256"))) ||
    typeof own(source, "contentFingerprint") !== "string" ||
    !SHA256.test(String(own(source, "contentFingerprint"))) ||
    !uploadedAt ||
    (receivedAtValue !== undefined && !receivedAt) ||
    !Array.isArray(rawDocumentIds) ||
    rawDocumentIds.length === 0 ||
    rawDocumentIds.length > 256
  ) {
    return null;
  }
  const parsedDocumentIds = rawDocumentIds.map(safeId);
  if (
    parsedDocumentIds.some((id) => id === null || !documentIds.has(id)) ||
    new Set(parsedDocumentIds).size !== parsedDocumentIds.length
  ) {
    return null;
  }
  return deepFreeze({
    fileId,
    packageId,
    ownerScope,
    role: own(source, "role") as FiscalNotificationPersistedSourceV2["role"],
    mimeType: "application/pdf" as const,
    fileSize,
    pageCount,
    sha256: String(own(source, "sha256")),
    contentFingerprint: String(own(source, "contentFingerprint")),
    uploadedAt,
    ...(receivedAt ? { receivedAt } : {}),
    documentIds: parsedDocumentIds as string[],
  });
}

export function parseFiscalNotificationsWorkspaceStorageEnvelopeV2(
  value: unknown,
  expectedOwnerScope?: string,
): Readonly<FiscalNotificationsWorkspaceStorageEnvelopeV2> | null {
  const root = plainRecord(value, [
    "storageKind",
    "storageVersion",
    "workspace",
    "sources",
    "transition",
  ]);
  if (
    !root ||
    own(root, "storageKind") !==
      FISCAL_NOTIFICATIONS_WORKSPACE_STORAGE_KIND_V2 ||
    own(root, "storageVersion") !==
      FISCAL_NOTIFICATIONS_WORKSPACE_STORAGE_VERSION_V2
  ) {
    return null;
  }
  const workspaceRecord = plainRecord(own(root, "workspace"), [
    "schemaVersion",
    "workspaceId",
    "ownerScope",
    "revision",
    "createdAt",
    "updatedAt",
    "accountHolder",
    "documents",
    "references",
    "dates",
    "amounts",
    "facts",
    "evidence",
    "thirdParties",
    "relations",
    "driveArchives",
  ]);
  const candidateOwner = workspaceRecord
    ? canonicalFiscalNotificationOwnerScopeV2(
        own(workspaceRecord, "ownerScope"),
      )
    : null;
  const ownerScope = expectedOwnerScope ?? candidateOwner;
  if (!ownerScope || candidateOwner !== ownerScope) return null;
  const workspace = parseFiscalNotificationsWorkspaceForPersistenceV2(
    own(root, "workspace"),
    ownerScope,
  );
  if (!workspace) return null;
  const rawTransition = own(root, "transition");
  const transition =
    rawTransition === undefined
      ? undefined
      : parseTransition(rawTransition, ownerScope);
  if (rawTransition !== undefined && !transition) return null;
  if (
    transition?.kind === "USER_CONFIRMED_EMPTY_RESTART_V1" &&
    (workspace.createdAt !== transition.confirmedAt ||
      Date.parse(workspace.updatedAt) < Date.parse(transition.confirmedAt))
  ) {
    return null;
  }
  if (
    transition?.kind === "AUTO_REPAIRED_EMPTY_HISTORY_V1" &&
    (workspace.createdAt !== transition.repairedAt ||
      Date.parse(workspace.updatedAt) < Date.parse(transition.repairedAt))
  ) {
    return null;
  }
  if (
    transition?.kind === "USER_CONFIRMED_DOCUMENT_REDUCTION_V1" &&
    (workspace.workspaceId !== transition.baseWorkspaceId ||
      workspace.createdAt !== transition.baseCreatedAt ||
      workspace.revision <= transition.baseRevision ||
      Date.parse(workspace.updatedAt) < Date.parse(transition.confirmedAt))
  ) {
    return null;
  }
  const rawSources = own(root, "sources");
  if (!Array.isArray(rawSources) || rawSources.length > MAX_SOURCES) {
    return null;
  }
  const documentIds = new Set(workspace.documents.map((entry) => entry.id));
  if (
    transition?.kind === "USER_CONFIRMED_DOCUMENT_REDUCTION_V1" &&
    transition.removedDocumentIds.some((id) => documentIds.has(id))
  ) {
    return null;
  }
  const sources = rawSources.map((entry) =>
    parseSource(entry, ownerScope, documentIds),
  );
  if (sources.some((entry) => entry === null)) return null;
  const parsedSources =
    sources as Readonly<FiscalNotificationPersistedSourceV2>[];
  if (
    new Set(parsedSources.map((entry) => entry.fileId)).size !==
    parsedSources.length
  ) {
    return null;
  }
  const coveredDocuments = new Set<string>();
  for (const source of parsedSources) {
    for (const documentId of source.documentIds) {
      if (coveredDocuments.has(documentId)) return null;
      coveredDocuments.add(documentId);
    }
  }
  if (
    coveredDocuments.size !== documentIds.size ||
    [...documentIds].some((id) => !coveredDocuments.has(id))
  ) {
    return null;
  }
  const parsed = {
    storageKind: FISCAL_NOTIFICATIONS_WORKSPACE_STORAGE_KIND_V2,
    storageVersion: FISCAL_NOTIFICATIONS_WORKSPACE_STORAGE_VERSION_V2,
    workspace,
    sources: parsedSources,
    ...(transition ? { transition } : {}),
  } satisfies FiscalNotificationsWorkspaceStorageEnvelopeV2;
  const serialized = stableJson(parsed);
  if (/"(?:textSnippet|rawValue|valueRaw)"\s*:/u.test(serialized)) {
    return null;
  }
  return deepFreeze(parsed);
}

function buildPersistedSources(
  workspace: FiscalNotificationsWorkspace,
): FiscalNotificationPersistedSourceV2[] | null {
  const documentsByFile = new Map<string, string[]>();
  for (const document of workspace.documents) {
    const ids = documentsByFile.get(document.fileId) ?? [];
    ids.push(document.id);
    documentsByFile.set(document.fileId, ids);
  }
  const sources: FiscalNotificationPersistedSourceV2[] = [];
  for (const file of workspace.files) {
    const documentIds = documentsByFile.get(file.id);
    if (!documentIds || documentIds.length === 0) continue;
    if (
      file.sourceContentRetention !== "NOT_RETAINED" ||
      file.mimeType !== "application/pdf"
    ) {
      return null;
    }
    sources.push({
      fileId: file.id,
      packageId: file.packageId,
      ownerScope: file.ownerScope,
      role: file.role,
      mimeType: "application/pdf",
      fileSize: file.fileSize,
      pageCount: file.pageCount,
      sha256: file.sha256,
      contentFingerprint: file.contentFingerprint,
      uploadedAt: file.uploadedAt,
      ...(file.receivedAt ? { receivedAt: file.receivedAt } : {}),
      documentIds: [...documentIds],
    });
  }
  return sources;
}

function entitiesForDocuments<T extends { documentId: string }>(
  entries: readonly T[],
  documentIds: ReadonlySet<string>,
): T[] {
  return entries.filter((entry) => documentIds.has(entry.documentId));
}

function reconcileWithBase(
  projected: Readonly<FiscalNotificationsPersistedWorkspaceV2>,
  base: Readonly<FiscalNotificationsWorkspaceStorageEnvelopeV2> | null,
  allowBoundGenerationRestart: boolean,
): Readonly<FiscalNotificationsPersistedWorkspaceV2> | null {
  if (base && base.workspace.createdAt !== projected.createdAt) {
    return allowBoundGenerationRestart ? projected : null;
  }
  if (
    !base ||
    base.workspace.workspaceId !== projected.workspaceId ||
    base.workspace.ownerScope !== projected.ownerScope ||
    base.workspace.revision > projected.revision
  ) {
    return projected;
  }
  if (base.workspace.revision === projected.revision) return base.workspace;
  const liveDocumentIds = new Set(projected.documents.map((entry) => entry.id));
  const baseDocumentIds = new Set(
    base.workspace.documents.map((entry) => entry.id),
  );
  const retainedBaseDocumentIds = new Set(
    [...baseDocumentIds].filter((id) => liveDocumentIds.has(id)),
  );
  const newDocumentIds = new Set(
    [...liveDocumentIds].filter((id) => !baseDocumentIds.has(id)),
  );
  const documents = [
    ...base.workspace.documents.filter((entry) =>
      retainedBaseDocumentIds.has(entry.id),
    ),
    ...projected.documents.filter((entry) => newDocumentIds.has(entry.id)),
  ];
  const relationsById = new Map(
    base.workspace.relations
      .filter(
        (entry) =>
          liveDocumentIds.has(entry.sourceDocumentId) &&
          liveDocumentIds.has(entry.targetDocumentId),
      )
      .map((entry) => [entry.id, entry] as const),
  );
  for (const entry of projected.relations) {
    if (
      !liveDocumentIds.has(entry.sourceDocumentId) ||
      !liveDocumentIds.has(entry.targetDocumentId)
    )
      continue;
    const previous = relationsById.get(entry.id);
    if (
      !previous
        ? newDocumentIds.has(entry.sourceDocumentId) ||
          newDocumentIds.has(entry.targetDocumentId) ||
          entry.algorithmVersion === "global-reconcile-v8"
        : shouldReplacePersistedRelation(previous, entry)
    ) {
      relationsById.set(entry.id, entry);
    }
  }
  const relations = [...relationsById.values()].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
  return {
    ...projected,
    accountHolder:
      newDocumentIds.size === 0 &&
      projected.documents.length < base.workspace.documents.length
        ? base.workspace.accountHolder
        : projected.accountHolder,
    documents,
    references: [
      ...entitiesForDocuments(
        base.workspace.references,
        retainedBaseDocumentIds,
      ),
      ...entitiesForDocuments(projected.references, newDocumentIds),
    ],
    dates: [
      ...entitiesForDocuments(base.workspace.dates, retainedBaseDocumentIds),
      ...entitiesForDocuments(projected.dates, newDocumentIds),
    ],
    amounts: [
      ...entitiesForDocuments(base.workspace.amounts, retainedBaseDocumentIds),
      ...entitiesForDocuments(projected.amounts, newDocumentIds),
    ],
    facts: [
      ...entitiesForDocuments(base.workspace.facts, retainedBaseDocumentIds),
      ...entitiesForDocuments(projected.facts, newDocumentIds),
    ],
    evidence: [
      ...entitiesForDocuments(base.workspace.evidence, retainedBaseDocumentIds),
      ...entitiesForDocuments(projected.evidence, newDocumentIds),
    ],
    thirdParties: [
      ...entitiesForDocuments(
        base.workspace.thirdParties,
        retainedBaseDocumentIds,
      ),
      ...entitiesForDocuments(projected.thirdParties, newDocumentIds),
    ],
    relations,
    driveArchives: projected.driveArchives,
  };
}

export function encodeFiscalNotificationsWorkspaceForStorageV2(
  value: unknown,
  baseValue?: unknown,
): Readonly<FiscalNotificationsWorkspaceStorageEnvelopeV2> | null {
  const ownerScope =
    value && typeof value === "object"
      ? canonicalFiscalNotificationOwnerScopeV2(
          (value as { ownerScope?: unknown }).ownerScope,
        )
      : null;
  if (!ownerScope) return null;
  const workspace = parseFiscalNotificationsWorkspaceForPersistenceV1(
    value,
    ownerScope,
  );
  if (!workspace) return null;
  const projected = projectFiscalNotificationsWorkspacePrivacyV2(
    workspace,
    ownerScope,
  );
  const sources = buildPersistedSources(workspace);
  if (!projected || !sources) return null;
  const registered =
    value && typeof value === "object"
      ? (memoryEnvelopeByWorkspace.get(value as object) ?? null)
      : null;
  const base =
    parseFiscalNotificationsWorkspaceStorageEnvelopeV2(baseValue, ownerScope) ??
    registered;
  let transition = registered?.transition ?? base?.transition;
  const restartCandidate =
    base &&
    base.workspace.createdAt !== projected.createdAt &&
    registered?.transition?.kind === "USER_CONFIRMED_EMPTY_RESTART_V1"
      ? parseFiscalNotificationsWorkspaceStorageEnvelopeV2(
          {
            storageKind: FISCAL_NOTIFICATIONS_WORKSPACE_STORAGE_KIND_V2,
            storageVersion: FISCAL_NOTIFICATIONS_WORKSPACE_STORAGE_VERSION_V2,
            workspace: projected,
            sources,
            transition: registered.transition,
          },
          ownerScope,
        )
      : null;
  const allowBoundGenerationRestart = Boolean(
    base &&
      restartCandidate &&
      (followsBoundEmptyRestart(base, restartCandidate) ||
        followsObservedEmptyRestartBase(base, restartCandidate)),
  );
  const reconciledWorkspace = reconcileWithBase(
    projected,
    base,
    allowBoundGenerationRestart,
  );
  if (!reconciledWorkspace) return null;
  if (
    base &&
    transition?.kind === "USER_CONFIRMED_EMPTY_RESTART_V1" &&
    base.transition?.kind === "USER_CONFIRMED_EMPTY_RESTART_V1" &&
    sameBoundEmptyRestartRoot(base.transition, transition) &&
    reconciledWorkspace.workspaceId === base.workspace.workspaceId &&
    reconciledWorkspace.createdAt === base.workspace.createdAt &&
    reconciledWorkspace.revision > base.workspace.revision
  ) {
    transition = withObservedEmptyRestartBase(transition, base);
  }
  const envelope = parseFiscalNotificationsWorkspaceStorageEnvelopeV2(
    {
      storageKind: FISCAL_NOTIFICATIONS_WORKSPACE_STORAGE_KIND_V2,
      storageVersion: FISCAL_NOTIFICATIONS_WORKSPACE_STORAGE_VERSION_V2,
      workspace: reconciledWorkspace,
      sources,
      ...(transition ? { transition } : {}),
    },
    ownerScope,
  );
  if (envelope && value && typeof value === "object") {
    memoryEnvelopeByWorkspace.set(value as object, envelope);
  }
  return envelope;
}

function issuerAuthorityId(issuerCode: string): string {
  return `authority:privacy-v2:${issuerCode}`;
}

function legacyDocumentTitle(document: PersistedDocumentV2): string {
  const profile = document.familyId
    ? (resolveAeatDocumentProfileV1(document.familyId) ??
      resolveAeatOfficialCatalogProfileV9(document.familyId))
    : null;
  if (profile) return profile.nameEs;
  return document.legacyDocumentType === "UNKNOWN" ||
    !document.legacyDocumentType
    ? "Documento oficial pendiente de clasificar"
    : document.legacyDocumentType
        .toLocaleLowerCase("es")
        .replaceAll("_", " ")
        .replace(/^./u, (value) => value.toLocaleUpperCase("es"));
}

function legacyDocumentStatus(
  workspace: FiscalNotificationsPersistedWorkspaceV2,
  documentId: string,
): AdministrativeDocument["status"] {
  const state = workspace.facts.find(
    (entry) =>
      entry.documentId === documentId &&
      entry.fieldId === "DOCUMENT_STATE" &&
      entry.valueType === "STATE",
  );
  if (state?.valueType !== "STATE") return "UNKNOWN";
  if (state.stateValue === "ACTIVE") return "ACTIVE";
  if (state.stateValue === "CLOSED") return "CLOSED";
  if (state.stateValue === "REPLACED") return "REPLACED";
  return "UNKNOWN";
}

function legacyAssertion(value: string): AssertionType {
  if (value === "EXPLICIT_IN_DOCUMENT") return "EXPLICIT_IN_DOCUMENT";
  if (value === "CALCULATED_FROM_PRINTED_VALUES") return "CALCULATED";
  return "INFERRED";
}

function legacyConfidence(
  value: PersistedEvidenceV2["confidence"],
): ConfidenceBand {
  return value;
}

function legacyExtractionMethod(
  value: PersistedEvidenceV2["extractionMethod"],
): ExtractionMethod {
  return value;
}

function memoryReference(reference: PersistedReferenceV2): ExternalReference {
  const normalizedValue =
    reference.value.storage === "FINGERPRINT_ONLY"
      ? sensitiveReferenceMemoryCarrierV2(reference.value)
      : reference.value.normalizedValue;
  return {
    id: reference.id,
    ownerScope: reference.ownerScope,
    referenceType:
      reference.referenceType === "BANK_REFERENCE"
        ? "OTHER"
        : reference.referenceType,
    rawValue:
      reference.value.storage === "FINGERPRINT_ONLY"
        ? sensitiveReferenceSafeLabelV2(reference.value)
        : normalizedValue,
    normalizedValue,
    issuer: reference.issuerCode,
    scope: "DOCUMENT",
    documentId: reference.documentId,
    isPrimary: false,
    confidence: "EXACT",
    confirmationStatus: "PENDING",
    extractionMethod: "RULE",
    occurrenceIds: [...reference.evidenceIds],
    createdAt: "1970-01-01T00:00:00.000Z",
  };
}

const MONEY_COMPONENT_TYPES = new Set<MoneyComponentType>([
  "PRINCIPAL",
  "INTEREST",
  "EXECUTIVE_SURCHARGE_5",
  "REDUCED_SURCHARGE_10",
  "ORDINARY_SURCHARGE_20",
  "PENALTY",
  "COSTS",
  "PAYMENT_ON_ACCOUNT",
  "TOTAL_DEBT",
  "AMOUNT_TO_PAY",
  "OTHER",
]);

function memoryMoneyType(value: string): MoneyComponentType {
  return MONEY_COMPONENT_TYPES.has(value as MoneyComponentType)
    ? (value as MoneyComponentType)
    : "OTHER";
}

function memoryDocumentType(
  value: PersistedDocumentV2["legacyDocumentType"],
): AdministrativeDocumentType {
  return value ?? "UNKNOWN";
}

function documentDate(
  workspace: FiscalNotificationsPersistedWorkspaceV2,
  documentId: string,
  kind: DocumentDateKindV2,
): string | undefined {
  return workspace.dates.find(
    (entry) =>
      entry.documentId === documentId &&
      entry.kind === kind &&
      entry.assertionType === "EXPLICIT_IN_DOCUMENT" &&
      entry.evidenceIds.some((evidenceId) =>
        workspace.evidence.some(
          (evidence) =>
            evidence.id === evidenceId &&
            evidence.documentId === documentId &&
            evidence.assertionType === "EXPLICIT_IN_DOCUMENT",
        ),
      ),
  )?.value;
}

const ADMINISTRATIVE_MONEY_KINDS = new Set<AdministrativeMoneyKind>([
  "ORIGINAL_TAX_PRINCIPAL",
  "OUTSTANDING_PRINCIPAL",
  "PROPOSED_QUOTA",
  "FINAL_QUOTA",
  "DEFERRAL_INTEREST",
  "LATE_PAYMENT_INTEREST",
  "EXECUTIVE_SURCHARGE_5",
  "EXECUTIVE_SURCHARGE_10",
  "EXECUTIVE_SURCHARGE_20",
  "SANCTION_INITIAL",
  "SANCTION_REDUCTION",
  "SANCTION_REDUCED",
  "COSTS",
  "REFUND_CREDIT",
  "CREDIT_TOTAL",
  "OFFSET_APPLIED",
  "EXECUTIVE_SURCHARGE_PRINTED",
  "TOTAL_BEFORE_OFFSET",
  "REMAINING_AFTER_OFFSET",
  "NET_REFUND_PAYMENT",
  "SEIZED_AMOUNT",
  "RETAINED_AMOUNT",
  "REMITTED_AMOUNT",
  "PAYMENT_ON_ACCOUNT",
  "DOCUMENT_TOTAL",
  "PAYMENT_CONFIRMED",
]);

function memoryAdministrativeMoneyKind(value: string): AdministrativeMoneyKind {
  if (ADMINISTRATIVE_MONEY_KINDS.has(value as AdministrativeMoneyKind)) {
    return value as AdministrativeMoneyKind;
  }
  if (value === "PRINCIPAL") return "ORIGINAL_TAX_PRINCIPAL";
  if (value === "INTEREST") return "DEFERRAL_INTEREST";
  if (value === "EXECUTIVE_SURCHARGE_5") return "EXECUTIVE_SURCHARGE_5";
  if (value === "REDUCED_SURCHARGE_10") return "EXECUTIVE_SURCHARGE_10";
  if (value === "ORDINARY_SURCHARGE_20") return "EXECUTIVE_SURCHARGE_20";
  if (value === "PENALTY") return "SANCTION_INITIAL";
  if (value === "COSTS") return "COSTS";
  if (value === "PAYMENT_ON_ACCOUNT") return "PAYMENT_ON_ACCOUNT";
  return "DOCUMENT_TOTAL";
}

const DATE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  ISSUE_DATE: "Fecha de emisión",
  SIGNING_DATE: "Fecha de firma",
  ACTION_DATE: "Fecha del acto",
  EFFECTIVE_NOTIFICATION_DATE: "Fecha de notificación efectiva",
  AVAILABILITY_DATE: "Puesta a disposición",
  ACCESS_DATE: "Fecha de acceso",
  REJECTION_DATE: "Fecha de rechazo",
  EXPIRATION_DATE: "Fecha de vencimiento",
  RESPONSE_DEADLINE: "Plazo de respuesta",
  VOLUNTARY_PAYMENT_DEADLINE: "Límite de pago voluntario",
  APPEAL_DEADLINE: "Plazo de recurso",
  INSTALLMENT_DUE_DATE: "Vencimiento de la cuota",
  PAYMENT_DATE: "Fecha de pago",
  SEIZURE_DATE: "Fecha de embargo",
  RELEASE_DATE: "Fecha de levantamiento",
  FILING_DATE: "Fecha de presentación",
  START_DATE: "Fecha de inicio",
  END_DATE: "Fecha de fin",
  INTEREST_START_DATE: "Inicio del período de intereses",
  INTEREST_END_DATE: "Fin del período de intereses",
});

function safeFieldLabel(
  kind: ProfileFieldKindV2,
  code: string,
  fallback: string,
): string {
  return resolveProfileFieldLabelV2(kind, code)?.labelEs ?? fallback;
}

const PROFILE_REFERENCE_CODES_BY_PERSISTED_TYPE: Readonly<
  Record<string, readonly string[]>
> = Object.freeze({
  DOCUMENT_REFERENCE: ["ACT_ID", "SEIZURE_ORDER_ID", "AGREEMENT_ID"],
  EXPEDIENT_NUMBER: ["EXPEDIENTE_ID"],
  LIQUIDATION_KEY: ["LIQUIDATION_KEY"],
  DEBT_KEY: ["DEBT_KEY"],
  PROCEDURE_NUMBER: ["PROCEDURE_ID"],
  PAYMENT_JUSTIFICANTE: [
    "PAYMENT_RECEIPT_ID",
    "PAYMENT_FORM_REFERENCE",
    "BANK_REFERENCE",
  ],
  CSV: ["CSV"],
  NRC: ["NRC"],
  BANK_REFERENCE: ["BANK_REFERENCE"],
  TAX_MODEL: ["MODEL"],
  TAX_EXERCISE: ["FISCAL_YEAR"],
  TAX_PERIOD: ["TAX_PERIOD"],
  NOTIFICATION_ID: ["NOTIFICATION_ID"],
  REQUEST_NUMBER: ["REQUEST_NUMBER"],
  REFUND_REFERENCE: ["REFUND_REFERENCE"],
  OFFICIAL_REGISTRY_NUMBER: [
    "REGISTRY_ID",
    "FILING_RECEIPT_ID",
    "THIRD_PARTY_RESPONSE_ID",
  ],
  VEHICLE_OR_FINE_REFERENCE: ["VEHICLE_OR_FINE_REFERENCE"],
});

function allowedProfileFieldCodes(
  document: PersistedDocumentV2,
  kind: "references" | "dates" | "money" | "facts",
): ReadonlySet<string> {
  const profile = document.familyId
    ? (resolveAeatDocumentProfileV1(document.familyId) ??
      resolveAeatOfficialCatalogProfileV9(document.familyId))
    : null;
  return new Set(profile?.mustExtract[kind] ?? []);
}

function profileReferenceCode(
  document: PersistedDocumentV2,
  referenceType: string,
): string | null {
  const allowed = allowedProfileFieldCodes(document, "references");
  const candidates = (
    PROFILE_REFERENCE_CODES_BY_PERSISTED_TYPE[referenceType] ?? []
  ).filter((code) => allowed.has(code));
  return candidates.length === 1 ? candidates[0]! : null;
}

function memoryAnalysisSnapshots(
  persisted: FiscalNotificationsPersistedWorkspaceV2,
  visibleDocumentIds: ReadonlySet<string>,
): FiscalNotificationsWorkspace["analysisSnapshots"] {
  const evidenceById = new Map(
    persisted.evidence.map((entry) => [entry.id, entry] as const),
  );
  const memoryReferencesById = new Map(
    persisted.references.map((entry) => [entry.id, memoryReference(entry)]),
  );
  return persisted.documents
    .filter((document) => visibleDocumentIds.has(document.id))
    .map((document) => {
      const allowedDates = allowedProfileFieldCodes(document, "dates");
      const allowedMoney = allowedProfileFieldCodes(document, "money");
      const allowedFacts = allowedProfileFieldCodes(document, "facts");
      const unknownFields: FiscalNotificationsWorkspace["analysisSnapshots"][number]["structuredData"]["unknownFields"] = [];
      const addObservedField = (input: {
        fieldId: string;
        semantic: "REFERENCE" | "DATE" | "MONEY" | "DETAIL";
        canonicalType: string;
        label: string;
        value: string;
        evidenceIds: readonly string[];
      }) => {
        const evidence = input.evidenceIds
          .map((id) => evidenceById.get(id))
          .find(
            (entry) =>
              entry?.documentId === document.id &&
              entry.assertionType === "EXPLICIT_IN_DOCUMENT",
          );
        if (!evidence) return;
        unknownFields.push({
          labelRaw: `VSR2|${input.fieldId}|${input.semantic}|${input.canonicalType}|${input.label}`,
          valueRaw: input.value,
          page: evidence.page,
          evidenceId: evidence.id,
          confidence: legacyConfidence(evidence.confidence),
        });
      };
      document.referenceIds.forEach((referenceId, index) => {
        const persistedReference = persisted.references.find(
          (entry) => entry.id === referenceId,
        );
        const reference = memoryReferencesById.get(referenceId);
        if (
          !persistedReference ||
          !reference ||
          persistedReference.assertionType !== "EXPLICIT_IN_DOCUMENT"
        ) {
          return;
        }
        const code = profileReferenceCode(
          document,
          persistedReference.referenceType,
        );
        addObservedField({
          fieldId: code
            ? `profile:reference:${code}:${index}`
            : `persisted:reference:${persistedReference.id}`,
          semantic: "REFERENCE",
          canonicalType: code ?? persistedReference.referenceType,
          label: code
            ? safeFieldLabel("REFERENCE", code, "Referencia del documento")
            : "Referencia del documento",
          value: reference.rawValue,
          evidenceIds: persistedReference.evidenceIds,
        });
      });
      document.dateFactIds.forEach((dateId, index) => {
        const date = persisted.dates.find((entry) => entry.id === dateId);
        if (!date || date.assertionType !== "EXPLICIT_IN_DOCUMENT") return;
        const profileDateCode = allowedDates.has(date.fieldId)
          ? date.fieldId
          : allowedDates.has(date.kind)
            ? date.kind
            : null;
        addObservedField({
          fieldId: profileDateCode
            ? `profile:date:${profileDateCode}:${index}`
            : `persisted:date:${date.id}`,
          semantic: "DATE",
          canonicalType: date.kind,
          label: profileDateCode
            ? safeFieldLabel(
                "DATE",
                profileDateCode,
                DATE_LABELS[date.kind] ?? "Fecha del documento",
              )
            : (DATE_LABELS[date.kind] ?? "Fecha del documento"),
          value: date.value,
          evidenceIds: date.evidenceIds,
        });
      });
      document.amountFactIds.forEach((amountId, index) => {
        const amount = persisted.amounts.find((entry) => entry.id === amountId);
        if (!amount || amount.assertionType !== "EXPLICIT_IN_DOCUMENT") return;
        const code = ADMINISTRATIVE_MONEY_KINDS.has(
          amount.componentType as AdministrativeMoneyKind,
        )
          ? amount.componentType
          : "DOCUMENT_TOTAL";
        const profileMoney =
          amount.fieldId.startsWith("OBSERVED_MONEY_") &&
          allowedMoney.has(code) &&
          ADMINISTRATIVE_MONEY_KINDS.has(
            amount.componentType as AdministrativeMoneyKind,
          );
        addObservedField({
          fieldId: profileMoney
            ? `profile:money:${code}:${index}`
            : `persisted:money:${amount.id}`,
          semantic: "MONEY",
          canonicalType: memoryMoneyType(amount.componentType),
          label: safeFieldLabel("MONEY", code, "Importe del documento"),
          value: String(amount.amountCents),
          evidenceIds: amount.evidenceIds,
        });
      });
      document.factIds.forEach((factId, index) => {
        const fact = persisted.facts.find((entry) => entry.id === factId);
        if (
          !fact ||
          fact.assertionType !== "EXPLICIT_IN_DOCUMENT" ||
          fact.valueType !== "BOOLEAN" ||
          fact.booleanValue !== true
        ) {
          return;
        }
        const profileCode = fact.fieldId.startsWith("PROFILE_FACT_")
          ? fact.fieldId.slice("PROFILE_FACT_".length)
          : null;
        const allowedProfileCode =
          profileCode && allowedFacts.has(profileCode) ? profileCode : null;
        addObservedField({
          fieldId: allowedProfileCode
            ? `profile:fact:${allowedProfileCode}:${index}`
            : `persisted:fact:${fact.fieldId}`,
          semantic: "DETAIL",
          canonicalType: "FACT_OR_GROUND",
          label: allowedProfileCode
            ? safeFieldLabel("FACT", allowedProfileCode, "Dato observado")
            : "Dato observado",
          value: "Consta en el documento",
          evidenceIds: fact.evidenceIds,
        });
      });
      const moneyFacts = document.amountFactIds.flatMap((amountId) => {
        const amount = persisted.amounts.find((entry) => entry.id === amountId);
        if (
          !amount ||
          amount.assertionType !== "EXPLICIT_IN_DOCUMENT" ||
          !amount.evidenceIds.some((evidenceId) => {
            const evidence = evidenceById.get(evidenceId);
            return (
              evidence?.documentId === document.id &&
              evidence.assertionType === "EXPLICIT_IN_DOCUMENT"
            );
          })
        ) {
          return [];
        }
        return [
          {
            id: amount.id,
            ownerScope: amount.ownerScope,
            documentId: amount.documentId,
            kind: memoryAdministrativeMoneyKind(amount.componentType),
            amountCents: amount.amountCents,
            currency: "EUR" as const,
            assertionType: legacyAssertion(amount.assertionType),
            evidenceIds: [...amount.evidenceIds],
            lineageParentIds: [],
            status: "PROPOSED" as const,
            createdAt: document.updatedAt,
          },
        ];
      });
      const snapshotId = `analysis:privacy-v2:${document.id}`;
      return {
        id: snapshotId,
        ownerScope: document.ownerScope,
        documentId: document.id,
        version: 1,
        extractorVersion: "privacy-workspace-v2-memory-view",
        rulesVersion: "privacy-workspace-v2",
        structuredData: {
          schemaVersion: 1,
          documentType: memoryDocumentType(document.legacyDocumentType),
          administrativeDomain: {
            schemaVersion: 1,
            ownerScope: document.ownerScope,
            documentId: document.id,
            extractorId: "privacy-workspace-v2",
            extractorVersion: "2.0.0",
            createdAt: document.updatedAt,
            familyId: document.familyId,
            status: "REVIEW_REQUIRED",
            roleAssertions: [],
            moneyFacts,
            missingFieldIds: [],
            alternativeFamilyIds: [],
            validationIssues: [],
            materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
            requiresHumanReview: true,
          },
          paymentOptionIds: [],
          unknownFields,
          validationCodes: [],
          factSummary: [],
          calculatedSummary: [],
          inferenceSummary: [],
          userConfirmedSummary: [],
          documentFields: {
            title: legacyDocumentTitle(document),
            ...(documentDate(persisted, document.id, "ISSUE_DATE")
              ? {
                  issueDate: documentDate(
                    persisted,
                    document.id,
                    "ISSUE_DATE",
                  ),
                }
              : {}),
            ...(documentDate(
              persisted,
              document.id,
              "EFFECTIVE_NOTIFICATION_DATE",
            )
              ? {
                  effectiveNotificationDate: documentDate(
                    persisted,
                    document.id,
                    "EFFECTIVE_NOTIFICATION_DATE",
                  ),
                }
              : {}),
          },
        },
        plainLanguageExplanation: [],
        validationWarnings: [],
        evidenceIds: [...document.evidenceIds],
        confidenceBand: "HIGH",
        requiresHumanReview: true,
        createdAt: document.createdAt,
        createdBySystem: true,
      };
    });
}

export function restoreFiscalNotificationsWorkspaceFromStorageV2(
  value: unknown,
  expectedOwnerScope?: string,
): FiscalNotificationsWorkspace | null {
  const envelope = parseFiscalNotificationsWorkspaceStorageEnvelopeV2(
    value,
    expectedOwnerScope,
  );
  if (!envelope) return null;
  const persisted = envelope.workspace;
  const sourceByDocument = new Map<
    string,
    FiscalNotificationPersistedSourceV2
  >();
  for (const source of envelope.sources) {
    for (const documentId of source.documentIds) {
      sourceByDocument.set(documentId, source);
    }
  }
  const packageGroups = new Map<
    string,
    FiscalNotificationPersistedSourceV2[]
  >();
  for (const source of envelope.sources) {
    const group = packageGroups.get(source.packageId) ?? [];
    group.push(source);
    packageGroups.set(source.packageId, group);
  }
  const issuerCodes = new Set(
    persisted.documents.map((entry) => entry.issuerCode),
  );
  const datesById = new Map(persisted.dates.map((entry) => [entry.id, entry]));
  const amountsById = new Map(
    persisted.amounts.map((entry) => [entry.id, entry]),
  );
  const referencesById = new Map(
    persisted.references.map((entry) => [entry.id, entry]),
  );
  const visibleReferenceIds = new Set(
    persisted.references.flatMap((reference) =>
      reference.assertionType === "EXPLICIT_IN_DOCUMENT" &&
      reference.evidenceIds.some((evidenceId) =>
        persisted.evidence.some(
          (evidence) =>
            evidence.id === evidenceId &&
            evidence.documentId === reference.documentId &&
            evidence.assertionType === "EXPLICIT_IN_DOCUMENT",
        ),
      )
        ? [reference.id]
        : [],
    ),
  );
  const references = persisted.references
    .filter((entry) => visibleReferenceIds.has(entry.id))
    .map(memoryReference);
  const hasExplicitEvidence = (
    documentId: string,
    evidenceIds: readonly string[],
  ): boolean =>
    evidenceIds.some((evidenceId) =>
      persisted.evidence.some(
        (evidence) =>
          evidence.id === evidenceId &&
          evidence.documentId === documentId &&
          evidence.assertionType === "EXPLICIT_IN_DOCUMENT",
      ),
    );
  const visibleDocumentIds = new Set(
    persisted.documents.flatMap((document) => {
      const hasReference = document.referenceIds.some((id) =>
        visibleReferenceIds.has(id),
      );
      const hasDate = document.dateFactIds.some((id) => {
        const date = datesById.get(id);
        return Boolean(
          date &&
            date.assertionType === "EXPLICIT_IN_DOCUMENT" &&
            hasExplicitEvidence(document.id, date.evidenceIds),
        );
      });
      const hasAmount = document.amountFactIds.some((id) => {
        const amount = amountsById.get(id);
        return Boolean(
          amount &&
            amount.assertionType === "EXPLICIT_IN_DOCUMENT" &&
            hasExplicitEvidence(document.id, amount.evidenceIds),
        );
      });
      const hasFact = document.factIds.some((id) => {
        const fact = persisted.facts.find((entry) => entry.id === id);
        return Boolean(
          fact &&
            fact.assertionType === "EXPLICIT_IN_DOCUMENT" &&
            hasExplicitEvidence(document.id, fact.evidenceIds),
        );
      });
      return hasReference || hasDate || hasAmount || hasFact
        ? [document.id]
        : [];
    }),
  );
  const evidence = persisted.evidence.map((entry) => ({
    id: entry.id,
    ownerScope: entry.ownerScope,
    documentId: entry.documentId,
    pageNumber: entry.page,
    ...(entry.locator.kind === "BOUNDING_BOX"
      ? {
          boundingBox: {
            x: entry.locator.x,
            y: entry.locator.y,
            width: entry.locator.width,
            height: entry.locator.height,
            ...(entry.locator.pageWidth === undefined
              ? {}
              : { pageWidth: entry.locator.pageWidth }),
            ...(entry.locator.pageHeight === undefined
              ? {}
              : { pageHeight: entry.locator.pageHeight }),
          },
        }
      : {}),
    textSnippet: entry.fieldId,
    extractionMethod: legacyExtractionMethod(entry.extractionMethod),
    confidence: legacyConfidence(entry.confidence),
    assertionType: legacyAssertion(entry.assertionType),
  }));
  const analysisSnapshots = memoryAnalysisSnapshots(
    persisted,
    visibleDocumentIds,
  );
  const snapshotIdByDocument = new Map(
    analysisSnapshots.map((entry) => [entry.documentId, entry.id] as const),
  );
  const workspace: FiscalNotificationsWorkspace = {
    schemaVersion: 1,
    workspaceId: persisted.workspaceId,
    ownerScope: persisted.ownerScope,
    revision: persisted.revision,
    createdAt: persisted.createdAt,
    updatedAt: persisted.updatedAt,
    packages: [...packageGroups.entries()].map(([packageId, sources]) => ({
      id: packageId,
      ownerScope: persisted.ownerScope,
      fileIds: sources.map((entry) => entry.fileId),
      sourceChannel: "MANUAL_UPLOAD",
      processingStatus: "NEEDS_REVIEW",
      securityScanStatus: "NOT_AVAILABLE",
      uploadedAt: sources.map((entry) => entry.uploadedAt).sort()[0]!,
    })),
    files: envelope.sources.map((source) => ({
      id: source.fileId,
      packageId: source.packageId,
      ownerScope: source.ownerScope,
      role: source.role,
      mimeType: "application/pdf",
      fileSize: source.fileSize,
      pageCount: source.pageCount,
      sha256: source.sha256,
      contentFingerprint: source.contentFingerprint,
      sourceContentRetention: "NOT_RETAINED",
      uploadedAt: source.uploadedAt,
      ...(source.receivedAt ? { receivedAt: source.receivedAt } : {}),
    })),
    documents: persisted.documents.map((document) => {
      const source = sourceByDocument.get(document.id)!;
      const title = legacyDocumentTitle(document);
      const issueDate = documentDate(persisted, document.id, "ISSUE_DATE");
      const signatureDate = documentDate(
        persisted,
        document.id,
        "SIGNING_DATE",
      );
      const effectiveAt = documentDate(
        persisted,
        document.id,
        "EFFECTIVE_NOTIFICATION_DATE",
      );
      return {
        id: document.id,
        packageId: source.packageId,
        fileId: source.fileId,
        ownerScope: document.ownerScope,
        documentType: memoryDocumentType(document.legacyDocumentType),
        ...(document.familyId ? { documentSubtype: document.familyId } : {}),
        titleRaw: title,
        titleNormalized: title.toLocaleUpperCase("es"),
        authorityId: issuerAuthorityId(document.issuerCode),
        ...(issueDate ? { issueDate } : {}),
        ...(signatureDate ? { signatureDate } : {}),
        notificationDates: effectiveAt
          ? { effectiveAt: `${effectiveAt}T00:00:00.000Z` }
          : {},
        subjectParty: {
          matchesBusinessProfile: persisted.accountHolder.identityMatchStatus,
        },
        status: legacyDocumentStatus(persisted, document.id),
        urgency: "REVIEW",
        extractionVersion: "privacy-workspace-v2-memory-view",
        analysisStatus:
          document.reviewStatus === "PENDING" ? "NEEDS_REVIEW" : "CONFIRMED",
        humanReviewStatus: document.reviewStatus,
        authenticityStatus: "NOT_CHECKED",
        partIds: [],
        referenceIds: document.referenceIds.filter((id) =>
          visibleReferenceIds.has(id),
        ),
        debtIds: [],
        caseIds: [],
        analysisSnapshotIds: snapshotIdByDocument.has(document.id)
          ? [snapshotIdByDocument.get(document.id)!]
          : [],
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      };
    }),
    parts: [],
    authorities: [...issuerCodes].map((issuerCode) => ({
      id: issuerAuthorityId(issuerCode),
      ownerScope: persisted.ownerScope,
      administrationType: issuerCode,
      nameRaw: issuerCode === "AEAT" ? "Agencia Tributaria" : issuerCode,
      nameNormalized: issuerCode,
    })),
    references,
    evidence,
    debts: [],
    debtObservations: [],
    cases: [],
    relations: persisted.relations.flatMap((relation) => {
      const visibleExactReferenceIds = relation.exactReferenceIds.filter((id) => {
        const reference = referencesById.get(id);
        return (
          visibleReferenceIds.has(id) &&
          reference?.referenceType !== "BANK_REFERENCE"
        );
      });
      const referenceIdentity = (
        reference: FiscalNotificationsPersistedWorkspaceV2["references"][number],
      ): string =>
        `${reference.referenceType}\u0000${reference.issuerCode}\u0000${
          reference.value.storage === "NORMALIZED_REFERENCE"
            ? reference.value.normalizedValue
            : reference.value.fingerprintSha256
        }`;
      const sourceKeys = new Set(
        visibleExactReferenceIds
          .map((id) => referencesById.get(id))
          .filter(
            (entry): entry is NonNullable<typeof entry> =>
              entry?.documentId === relation.sourceDocumentId,
          )
          .map(referenceIdentity),
      );
      const hasStrongVisibleMatch = visibleExactReferenceIds
        .map((id) => referencesById.get(id))
        .filter(
          (entry): entry is NonNullable<typeof entry> =>
            entry?.documentId === relation.targetDocumentId,
        )
        .some((entry) => sourceKeys.has(referenceIdentity(entry)));
      if (!hasStrongVisibleMatch) return [];
      const matchingReferences = visibleExactReferenceIds
        .map((id) => referencesById.get(id)?.referenceType)
        .filter((entry): entry is ExternalReference["referenceType"] =>
          Boolean(entry && entry !== "BANK_REFERENCE"),
        );
      const matchingDates = relation.contextualDateFactIds
        .map((id) => datesById.get(id))
        .filter(
          (entry): entry is NonNullable<typeof entry> =>
            Boolean(
              entry &&
                entry.assertionType === "EXPLICIT_IN_DOCUMENT" &&
                hasExplicitEvidence(entry.documentId, entry.evidenceIds),
            ),
        )
        .map((entry) => entry.value);
      const exactReferencesRemainVisible =
        visibleExactReferenceIds.length === relation.exactReferenceIds.length;
      const status =
        relation.status === "SYSTEM_CONFIRMED_EXACT" &&
        !exactReferencesRemainVisible
          ? ("SUGGESTED" as const)
          : relation.status;
      return [
        {
          id: relation.id,
          ownerScope: relation.ownerScope,
          sourceDocumentId: relation.sourceDocumentId,
          targetDocumentId: relation.targetDocumentId,
          relationType:
            relation.relationType as DocumentRelation["relationType"],
          confidenceBand:
            status === "SYSTEM_CONFIRMED_EXACT" ? "EXACT" : "HIGH",
          score: status === "SYSTEM_CONFIRMED_EXACT" ? 100 : 80,
          evidence: {
            matchingReferenceTypes: [...new Set(matchingReferences)],
            matchingAmountTypes: [],
            matchingDates: [...new Set(matchingDates)],
            differences: [],
          },
          algorithmVersion: relation.algorithmVersion,
          status,
          createdAt: relation.createdAt,
          ...(relation.reconciliationHistory
            ? {
                reconciliationHistory: relation.reconciliationHistory.map(
                  (entry) => ({
                    ...entry,
                    evidenceKinds: [...entry.evidenceKinds],
                  }),
                ),
              }
            : {}),
        },
      ];
    }),
    analysisSnapshots,
    paymentOptions: [],
    paymentPlans: [],
    installments: [],
    interestCalculations: [],
    deadlineRules: [],
    obligations: [],
    timeline: [],
    accountingDrafts: [],
    auditEvents: [],
    driveArchives: persisted.driveArchives.map((archive) => ({
      id: archive.id,
      ownerScope: archive.ownerScope,
      fileId: sourceByDocument.get(archive.documentIds[0]!)!.fileId,
      documentIds: [...archive.documentIds],
      sourceSha256: archive.sourceSha256,
      driveFileId: archive.driveFileId,
      driveFolderId: archive.driveFolderId,
      documentDate: archive.documentDate,
      archiveStatus: archive.archiveStatus,
      reviewStatus: archive.reviewStatus,
      verificationMethod: archive.verificationMethod,
      recordVersion: 1,
      workspaceRevision: persisted.revision,
      archivedAt: archive.archivedAt,
    })),
  };
  const parsed = parseFiscalNotificationsWorkspaceForPersistenceV1(
    workspace,
    persisted.ownerScope,
  );
  if (!parsed) return null;
  const reconciled = appendWorkspaceGlobalReconciliationV8({
    ownerScope: persisted.ownerScope,
    workspace: parsed,
    reevaluatedAt: persisted.updatedAt,
  });
  const restored =
    reconciled.status === "APPLIED" ? reconciled.workspace : parsed;
  memoryEnvelopeByWorkspace.set(restored, envelope);
  return restored;
}

function shouldReplacePersistedRelation(
  previous: FiscalNotificationsPersistedWorkspaceV2["relations"][number],
  next: FiscalNotificationsPersistedWorkspaceV2["relations"][number],
): boolean {
  if (
    previous.ownerScope !== next.ownerScope ||
    previous.sourceDocumentId !== next.sourceDocumentId ||
    previous.targetDocumentId !== next.targetDocumentId ||
    previous.status === "USER_CONFIRMED" ||
    previous.status === "USER_REJECTED" ||
    (previous.status === "SYSTEM_CONFIRMED_EXACT" &&
      next.status === "SUGGESTED")
  )
    return false;
  const previousRank = previous.status === "SYSTEM_CONFIRMED_EXACT" ? 2 : 1;
  const nextRank = next.status === "SYSTEM_CONFIRMED_EXACT" ? 2 : 1;
  if (nextRank > previousRank) return true;
  return (
    nextRank === previousRank &&
    next.algorithmVersion === "global-reconcile-v8" &&
    (next.reconciliationHistory?.length ?? 0) >
      (previous.reconciliationHistory?.length ?? 0)
  );
}

function collectionContainsPrefix<T>(
  smaller: readonly T[],
  larger: readonly T[],
  key: (entry: T) => string = (entry) => (entry as { id: string }).id,
): boolean {
  const byId = new Map(larger.map((entry) => [key(entry), entry] as const));
  return smaller.every((entry) => {
    const candidate = byId.get(key(entry));
    return (
      candidate !== undefined && stableJson(candidate) === stableJson(entry)
    );
  });
}

function envelopeCollectionsAreExactSubset(
  smaller: FiscalNotificationsWorkspaceStorageEnvelopeV2,
  larger: FiscalNotificationsWorkspaceStorageEnvelopeV2,
): boolean {
  return (
    collectionContainsPrefix(
      smaller.workspace.documents,
      larger.workspace.documents,
    ) &&
    collectionContainsPrefix(
      smaller.workspace.references,
      larger.workspace.references,
    ) &&
    collectionContainsPrefix(smaller.workspace.dates, larger.workspace.dates) &&
    collectionContainsPrefix(
      smaller.workspace.amounts,
      larger.workspace.amounts,
    ) &&
    collectionContainsPrefix(smaller.workspace.facts, larger.workspace.facts) &&
    collectionContainsPrefix(
      smaller.workspace.evidence,
      larger.workspace.evidence,
    ) &&
    collectionContainsPrefix(
      smaller.workspace.thirdParties,
      larger.workspace.thirdParties,
    ) &&
    collectionContainsPrefix(
      smaller.workspace.relations,
      larger.workspace.relations,
    ) &&
    collectionContainsPrefix(
      smaller.workspace.driveArchives,
      larger.workspace.driveArchives,
    ) &&
    collectionContainsPrefix(
      smaller.sources,
      larger.sources,
      (entry) => entry.fileId,
    )
  );
}

export function isFiscalNotificationsWorkspaceStorageEnvelopeEmptyV2(
  envelope: FiscalNotificationsWorkspaceStorageEnvelopeV2,
): boolean {
  return (
    envelope.sources.length === 0 &&
    envelope.workspace.documents.length === 0 &&
    envelope.workspace.references.length === 0 &&
    envelope.workspace.dates.length === 0 &&
    envelope.workspace.amounts.length === 0 &&
    envelope.workspace.facts.length === 0 &&
    envelope.workspace.evidence.length === 0 &&
    envelope.workspace.thirdParties.length === 0 &&
    envelope.workspace.relations.length === 0 &&
    envelope.workspace.driveArchives.length === 0
  );
}

function transitionBaseMatches(
  envelope: FiscalNotificationsWorkspaceStorageEnvelopeV2,
  transition: Extract<
    FiscalNotificationsWorkspaceTransitionV2,
    { kind: "USER_CONFIRMED_DOCUMENT_REDUCTION_V1" }
  >,
): boolean {
  return (
    envelope.workspace.workspaceId === transition.baseWorkspaceId &&
    envelope.workspace.createdAt === transition.baseCreatedAt &&
    envelope.workspace.revision === transition.baseRevision &&
    envelope.workspace.updatedAt === transition.baseUpdatedAt
  );
}

function documentScopedCollectionFollowsReduction<
  T extends { readonly id: string; readonly documentId: string },
>(
  baseEntries: readonly T[],
  candidateEntries: readonly T[],
  droppedBaseDocumentIds: ReadonlySet<string>,
  newDocumentIds: ReadonlySet<string>,
): boolean {
  const scopedKey = (entry: T): string =>
    `${entry.documentId}\u0000${entry.id}`;
  const baseById = new Map(
    baseEntries.map((entry) => [scopedKey(entry), entry]),
  );
  const candidateById = new Map(
    candidateEntries.map((entry) => [scopedKey(entry), entry]),
  );
  for (const baseEntry of baseEntries) {
    const candidate = candidateById.get(scopedKey(baseEntry));
    if (candidate) {
      if (stableJson(candidate) !== stableJson(baseEntry)) return false;
    } else if (!droppedBaseDocumentIds.has(baseEntry.documentId)) {
      return false;
    }
  }
  return candidateEntries.every((entry) => {
    const baseEntry = baseById.get(scopedKey(entry));
    return baseEntry
      ? stableJson(baseEntry) === stableJson(entry)
      : newDocumentIds.has(entry.documentId);
  });
}

function sourcesFollowReduction(
  base: FiscalNotificationsWorkspaceStorageEnvelopeV2,
  candidate: FiscalNotificationsWorkspaceStorageEnvelopeV2,
  liveBaseDocumentIds: ReadonlySet<string>,
  newDocumentIds: ReadonlySet<string>,
): boolean {
  const baseById = new Map(base.sources.map((entry) => [entry.fileId, entry]));
  const candidateById = new Map(
    candidate.sources.map((entry) => [entry.fileId, entry]),
  );
  for (const source of base.sources) {
    const expectedDocumentIds = source.documentIds.filter((id) =>
      liveBaseDocumentIds.has(id),
    );
    const candidateSource = candidateById.get(source.fileId);
    if (expectedDocumentIds.length === 0) {
      if (candidateSource) return false;
      continue;
    }
    if (!candidateSource) return false;
    const baseMetadata = { ...source, documentIds: undefined };
    const candidateMetadata = {
      ...candidateSource,
      documentIds: undefined,
    };
    const candidateDocumentIds = candidateSource.documentIds;
    if (
      stableJson(baseMetadata) !== stableJson(candidateMetadata) ||
      stableJson(expectedDocumentIds) !== stableJson(candidateDocumentIds)
    ) {
      return false;
    }
  }
  return candidate.sources.every((source) => {
    if (baseById.has(source.fileId)) return true;
    return source.documentIds.every((id) => newDocumentIds.has(id));
  });
}

function relationsFollowReduction(
  base: FiscalNotificationsWorkspaceStorageEnvelopeV2,
  candidate: FiscalNotificationsWorkspaceStorageEnvelopeV2,
  droppedBaseDocumentIds: ReadonlySet<string>,
  newDocumentIds: ReadonlySet<string>,
): boolean {
  const relationKey = (entry: (typeof base.workspace.relations)[number]) =>
    `${entry.sourceDocumentId}\u0000${entry.targetDocumentId}\u0000${entry.id}`;
  const baseById = new Map(
    base.workspace.relations.map((entry) => [relationKey(entry), entry]),
  );
  const candidateById = new Map(
    candidate.workspace.relations.map((entry) => [relationKey(entry), entry]),
  );
  for (const relation of base.workspace.relations) {
    const candidateRelation = candidateById.get(relationKey(relation));
    if (candidateRelation) {
      if (stableJson(candidateRelation) !== stableJson(relation)) return false;
    } else if (
      !droppedBaseDocumentIds.has(relation.sourceDocumentId) &&
      !droppedBaseDocumentIds.has(relation.targetDocumentId)
    ) {
      return false;
    }
  }
  return candidate.workspace.relations.every((relation) => {
    const baseRelation = baseById.get(relationKey(relation));
    return baseRelation
      ? stableJson(baseRelation) === stableJson(relation)
      : newDocumentIds.has(relation.sourceDocumentId) ||
          newDocumentIds.has(relation.targetDocumentId);
  });
}

function driveArchivesFollowReduction(
  base: FiscalNotificationsWorkspaceStorageEnvelopeV2,
  candidate: FiscalNotificationsWorkspaceStorageEnvelopeV2,
  liveBaseDocumentIds: ReadonlySet<string>,
  newDocumentIds: ReadonlySet<string>,
): boolean {
  const baseById = new Map(
    base.workspace.driveArchives.map((entry) => [entry.id, entry]),
  );
  const candidateById = new Map(
    candidate.workspace.driveArchives.map((entry) => [entry.id, entry]),
  );
  for (const archive of base.workspace.driveArchives) {
    const expectedDocumentIds = archive.documentIds.filter((id) =>
      liveBaseDocumentIds.has(id),
    );
    const candidateArchive = candidateById.get(archive.id);
    if (expectedDocumentIds.length === 0) {
      if (candidateArchive) return false;
      continue;
    }
    if (!candidateArchive) return false;
    const baseMetadata = { ...archive, documentIds: undefined };
    const candidateMetadata = {
      ...candidateArchive,
      documentIds: undefined,
    };
    const candidateDocumentIds = candidateArchive.documentIds;
    if (
      stableJson(baseMetadata) !== stableJson(candidateMetadata) ||
      stableJson(expectedDocumentIds) !== stableJson(candidateDocumentIds)
    ) {
      return false;
    }
  }
  return candidate.workspace.driveArchives.every((archive) => {
    if (baseById.has(archive.id)) return true;
    return archive.documentIds.every((id) => newDocumentIds.has(id));
  });
}

function followsDeclaredDocumentReduction(
  base: FiscalNotificationsWorkspaceStorageEnvelopeV2,
  candidate: FiscalNotificationsWorkspaceStorageEnvelopeV2,
  transition: Extract<
    FiscalNotificationsWorkspaceTransitionV2,
    { kind: "USER_CONFIRMED_DOCUMENT_REDUCTION_V1" }
  >,
): boolean {
  if (!transitionBaseMatches(base, transition)) return false;
  if (
    stableJson(base.workspace.accountHolder) !==
    stableJson(candidate.workspace.accountHolder)
  ) {
    return false;
  }
  const baseDocumentsById = new Map(
    base.workspace.documents.map((entry) => [entry.id, entry]),
  );
  const candidateDocumentsById = new Map(
    candidate.workspace.documents.map((entry) => [entry.id, entry]),
  );
  const declaredRemovedDocumentIds = new Set(transition.removedDocumentIds);
  if (transition.removedDocumentIds.some((id) => !baseDocumentsById.has(id))) {
    return false;
  }
  const droppedBaseDocumentIds = new Set(
    base.workspace.documents
      .filter((entry) => !candidateDocumentsById.has(entry.id))
      .map((entry) => entry.id),
  );
  if (
    droppedBaseDocumentIds.size === 0 ||
    droppedBaseDocumentIds.size !== declaredRemovedDocumentIds.size ||
    [...droppedBaseDocumentIds].some(
      (id) => !declaredRemovedDocumentIds.has(id),
    )
  ) {
    return false;
  }
  const liveBaseDocumentIds = new Set(
    base.workspace.documents
      .filter((entry) => candidateDocumentsById.has(entry.id))
      .map((entry) => entry.id),
  );
  for (const documentId of liveBaseDocumentIds) {
    if (
      stableJson(baseDocumentsById.get(documentId)) !==
      stableJson(candidateDocumentsById.get(documentId))
    ) {
      return false;
    }
  }
  const newDocumentIds = new Set(
    candidate.workspace.documents
      .filter((entry) => !baseDocumentsById.has(entry.id))
      .map((entry) => entry.id),
  );
  const reductionChecks = {
    references: documentScopedCollectionFollowsReduction(
      base.workspace.references,
      candidate.workspace.references,
      droppedBaseDocumentIds,
      newDocumentIds,
    ),
    dates: documentScopedCollectionFollowsReduction(
      base.workspace.dates,
      candidate.workspace.dates,
      droppedBaseDocumentIds,
      newDocumentIds,
    ),
    amounts: documentScopedCollectionFollowsReduction(
      base.workspace.amounts,
      candidate.workspace.amounts,
      droppedBaseDocumentIds,
      newDocumentIds,
    ),
    facts: documentScopedCollectionFollowsReduction(
      base.workspace.facts,
      candidate.workspace.facts,
      droppedBaseDocumentIds,
      newDocumentIds,
    ),
    evidence: documentScopedCollectionFollowsReduction(
      base.workspace.evidence,
      candidate.workspace.evidence,
      droppedBaseDocumentIds,
      newDocumentIds,
    ),
    thirdParties: documentScopedCollectionFollowsReduction(
      base.workspace.thirdParties,
      candidate.workspace.thirdParties,
      droppedBaseDocumentIds,
      newDocumentIds,
    ),
    sources: sourcesFollowReduction(
      base,
      candidate,
      liveBaseDocumentIds,
      newDocumentIds,
    ),
    relations: relationsFollowReduction(
      base,
      candidate,
      droppedBaseDocumentIds,
      newDocumentIds,
    ),
    driveArchives: driveArchivesFollowReduction(
      base,
      candidate,
      liveBaseDocumentIds,
      newDocumentIds,
    ),
  };
  return Object.values(reductionChecks).every(Boolean);
}

type DocumentReductionTransitionV2 = Extract<
  FiscalNotificationsWorkspaceTransitionV2,
  { kind: "USER_CONFIRMED_DOCUMENT_REDUCTION_V1" }
>;

function sameDocumentReductionBase(
  left: DocumentReductionTransitionV2,
  right: DocumentReductionTransitionV2,
): boolean {
  return (
    left.ownerScope === right.ownerScope &&
    left.baseWorkspaceId === right.baseWorkspaceId &&
    left.baseCreatedAt === right.baseCreatedAt &&
    left.baseRevision === right.baseRevision &&
    left.baseUpdatedAt === right.baseUpdatedAt &&
    (!left.baseDocumentIds ||
      !right.baseDocumentIds ||
      stableJson(left.baseDocumentIds) === stableJson(right.baseDocumentIds))
  );
}

function idsAreSubset(
  smaller: readonly string[],
  larger: readonly string[],
): boolean {
  const largerIds = new Set(larger);
  return smaller.every((id) => largerIds.has(id));
}

function immediateReductionTransition(
  base: FiscalNotificationsWorkspaceStorageEnvelopeV2,
  candidate: FiscalNotificationsWorkspaceStorageEnvelopeV2,
): DocumentReductionTransitionV2 | null {
  if (
    candidate.workspace.revision <= base.workspace.revision ||
    candidate.workspace.updatedAt <= base.workspace.updatedAt
  ) {
    return null;
  }
  const candidateDocumentIds = new Set(
    candidate.workspace.documents.map((entry) => entry.id),
  );
  const removedDocumentIds = base.workspace.documents
    .map((entry) => entry.id)
    .filter((id) => !candidateDocumentIds.has(id))
    .sort();
  if (removedDocumentIds.length === 0) return null;
  return {
    kind: "USER_CONFIRMED_DOCUMENT_REDUCTION_V1",
    ownerScope: base.workspace.ownerScope,
    confirmedAt: candidate.workspace.updatedAt,
    baseWorkspaceId: base.workspace.workspaceId,
    baseCreatedAt: base.workspace.createdAt,
    baseRevision: base.workspace.revision,
    baseUpdatedAt: base.workspace.updatedAt,
    baseDocumentIds: base.workspace.documents.map((entry) => entry.id).sort(),
    removedDocumentIds,
  };
}

function cumulativeTransitionCoversImmediateBaseReduction(
  current: DocumentReductionTransitionV2,
  incoming: DocumentReductionTransitionV2,
  immediate: DocumentReductionTransitionV2,
): boolean {
  const baseDocumentIds =
    incoming.baseDocumentIds ?? current.baseDocumentIds ?? null;
  if (!baseDocumentIds) return false;
  const originalIds = new Set(baseDocumentIds);
  const cumulativeRemovedIds = new Set(incoming.removedDocumentIds);
  return immediate.removedDocumentIds.every(
    (id) => !originalIds.has(id) || cumulativeRemovedIds.has(id),
  );
}

function compareChainedDocumentReductions(
  current: FiscalNotificationsWorkspaceStorageEnvelopeV2,
  incoming: FiscalNotificationsWorkspaceStorageEnvelopeV2,
): FiscalNotificationsWorkspaceStorageComparisonV2 | null {
  const currentTransition = current.transition;
  const incomingTransition = incoming.transition;
  if (
    currentTransition?.kind !== "USER_CONFIRMED_DOCUMENT_REDUCTION_V1" ||
    incomingTransition?.kind !== "USER_CONFIRMED_DOCUMENT_REDUCTION_V1" ||
    !sameDocumentReductionBase(currentTransition, incomingTransition)
  ) {
    return null;
  }

  const incomingImmediate = immediateReductionTransition(current, incoming);
  if (
    idsAreSubset(
      currentTransition.removedDocumentIds,
      incomingTransition.removedDocumentIds,
    ) &&
    incomingImmediate &&
    cumulativeTransitionCoversImmediateBaseReduction(
      currentTransition,
      incomingTransition,
      incomingImmediate,
    ) &&
    followsDeclaredDocumentReduction(current, incoming, incomingImmediate)
  ) {
    return "INCOMING_ADVANCES";
  }

  const currentImmediate = immediateReductionTransition(incoming, current);
  if (
    idsAreSubset(
      incomingTransition.removedDocumentIds,
      currentTransition.removedDocumentIds,
    ) &&
    currentImmediate &&
    cumulativeTransitionCoversImmediateBaseReduction(
      incomingTransition,
      currentTransition,
      currentImmediate,
    ) &&
    followsDeclaredDocumentReduction(incoming, current, currentImmediate)
  ) {
    return "CURRENT_ADVANCES";
  }
  return null;
}

function emptyRestartHasBoundBase(
  transition: Extract<
    FiscalNotificationsWorkspaceTransitionV2,
    { kind: "USER_CONFIRMED_EMPTY_RESTART_V1" }
  >,
): transition is typeof transition & {
  readonly baseWorkspaceId: string;
  readonly baseCreatedAt: string;
  readonly baseRevision: number;
  readonly baseUpdatedAt: string;
  readonly baseEnvelopeSha256: string;
} {
  return (
    transition.baseWorkspaceId !== undefined &&
    transition.baseCreatedAt !== undefined &&
    transition.baseRevision !== undefined &&
    transition.baseUpdatedAt !== undefined &&
    transition.baseEnvelopeSha256 !== undefined
  );
}

function sameBoundEmptyRestartRoot(
  left: Extract<
    FiscalNotificationsWorkspaceTransitionV2,
    { kind: "USER_CONFIRMED_EMPTY_RESTART_V1" }
  >,
  right: Extract<
    FiscalNotificationsWorkspaceTransitionV2,
    { kind: "USER_CONFIRMED_EMPTY_RESTART_V1" }
  >,
): boolean {
  return (
    emptyRestartHasBoundBase(left) &&
    emptyRestartHasBoundBase(right) &&
    left.ownerScope === right.ownerScope &&
    left.baseWorkspaceId === right.baseWorkspaceId &&
    left.baseCreatedAt === right.baseCreatedAt &&
    left.baseRevision === right.baseRevision &&
    left.baseUpdatedAt === right.baseUpdatedAt &&
    left.baseEnvelopeSha256 === right.baseEnvelopeSha256
  );
}

function withObservedEmptyRestartBase(
  transition: Extract<
    FiscalNotificationsWorkspaceTransitionV2,
    { kind: "USER_CONFIRMED_EMPTY_RESTART_V1" }
  >,
  base: FiscalNotificationsWorkspaceStorageEnvelopeV2,
): FiscalNotificationsWorkspaceTransitionV2 {
  if (!emptyRestartHasBoundBase(transition)) return transition;
  return {
    ...transition,
    lineageEnvelopeSha256s: appendObservedEnvelopeSha256(
      transition.lineageEnvelopeSha256s,
      sha256Hex(stableJson(base)),
    ),
  };
}

function appendObservedEnvelopeSha256(
  values: readonly string[] | undefined,
  value: string,
): readonly string[] {
  return [...(values ?? []).filter((entry) => entry !== value), value].slice(
    -MAX_SOURCES,
  );
}

function followsObservedEmptyRestartBase(
  base: FiscalNotificationsWorkspaceStorageEnvelopeV2,
  candidate: FiscalNotificationsWorkspaceStorageEnvelopeV2,
): boolean {
  const baseTransition = base.transition;
  const candidateTransition = candidate.transition;
  if (
    baseTransition?.kind !== "USER_CONFIRMED_EMPTY_RESTART_V1" ||
    candidateTransition?.kind !== "USER_CONFIRMED_EMPTY_RESTART_V1" ||
    !sameBoundEmptyRestartRoot(baseTransition, candidateTransition) ||
    !candidateTransition.lineageEnvelopeSha256s?.includes(
      sha256Hex(stableJson(base)),
    )
  ) {
    return false;
  }
  const sameGeneration =
    candidate.workspace.workspaceId === base.workspace.workspaceId &&
    candidate.workspace.createdAt === base.workspace.createdAt;
  if (
    !sameGeneration &&
    !isFiscalNotificationsWorkspaceStorageEnvelopeEmptyV2(base)
  ) {
    return false;
  }
  return sameGeneration
    ? candidate.workspace.revision > base.workspace.revision &&
      candidate.workspace.updatedAt > base.workspace.updatedAt
    : Date.parse(candidateTransition.confirmedAt) >
        Date.parse(base.workspace.updatedAt) &&
      candidate.workspace.updatedAt > base.workspace.updatedAt;
}

function followsBoundEmptyRestart(
  base: FiscalNotificationsWorkspaceStorageEnvelopeV2,
  candidate: FiscalNotificationsWorkspaceStorageEnvelopeV2,
): boolean {
  const transition = candidate.transition;
  return Boolean(
    transition?.kind === "USER_CONFIRMED_EMPTY_RESTART_V1" &&
      emptyRestartHasBoundBase(transition) &&
      isFiscalNotificationsWorkspaceStorageEnvelopeEmptyV2(base) &&
      base.workspace.workspaceId === transition.baseWorkspaceId &&
      base.workspace.createdAt === transition.baseCreatedAt &&
      base.workspace.revision === transition.baseRevision &&
      base.workspace.updatedAt === transition.baseUpdatedAt &&
      sha256Hex(stableJson(base)) === transition.baseEnvelopeSha256 &&
      Date.parse(transition.confirmedAt) >
        Date.parse(base.workspace.updatedAt),
  );
}

function compareDeclaredTransitions(
  current: FiscalNotificationsWorkspaceStorageEnvelopeV2,
  incoming: FiscalNotificationsWorkspaceStorageEnvelopeV2,
): FiscalNotificationsWorkspaceStorageComparisonV2 | null {
  const chainedReductionComparison = compareChainedDocumentReductions(
    current,
    incoming,
  );
  if (chainedReductionComparison) return chainedReductionComparison;
  if (followsObservedEmptyRestartBase(current, incoming)) {
    return "INCOMING_ADVANCES";
  }
  if (followsObservedEmptyRestartBase(incoming, current)) {
    return "CURRENT_ADVANCES";
  }
  if (stableJson(current.transition) === stableJson(incoming.transition)) {
    return null;
  }
  if (
    incoming.transition?.kind === "USER_CONFIRMED_DOCUMENT_REDUCTION_V1" &&
    followsDeclaredDocumentReduction(current, incoming, incoming.transition)
  ) {
    return "INCOMING_ADVANCES";
  }
  if (
    current.transition?.kind === "USER_CONFIRMED_DOCUMENT_REDUCTION_V1" &&
    followsDeclaredDocumentReduction(incoming, current, current.transition)
  ) {
    return "CURRENT_ADVANCES";
  }
  if (
    incoming.transition?.kind === "USER_CONFIRMED_EMPTY_RESTART_V1" &&
    emptyRestartHasBoundBase(incoming.transition)
  ) {
    return followsBoundEmptyRestart(current, incoming)
      ? "INCOMING_ADVANCES"
      : "DIVERGED";
  }
  if (
    current.transition?.kind === "USER_CONFIRMED_EMPTY_RESTART_V1" &&
    emptyRestartHasBoundBase(current.transition)
  ) {
    return followsBoundEmptyRestart(incoming, current)
      ? "CURRENT_ADVANCES"
      : "DIVERGED";
  }
  if (
    incoming.transition?.kind === "USER_CONFIRMED_EMPTY_RESTART_V1" &&
    isFiscalNotificationsWorkspaceStorageEnvelopeEmptyV2(incoming) &&
    Date.parse(incoming.transition.confirmedAt) >
      Date.parse(current.workspace.updatedAt)
  ) {
    return "INCOMING_ADVANCES";
  }
  if (
    current.transition?.kind === "USER_CONFIRMED_EMPTY_RESTART_V1" &&
    isFiscalNotificationsWorkspaceStorageEnvelopeEmptyV2(current) &&
    Date.parse(current.transition.confirmedAt) >
      Date.parse(incoming.workspace.updatedAt)
  ) {
    return "CURRENT_ADVANCES";
  }
  return current.transition || incoming.transition ? "DIVERGED" : null;
}

export function registerFiscalNotificationDocumentReductionTransitionV2(
  resultWorkspaceValue: unknown,
  baseWorkspaceValue: unknown,
  expectedOwnerScope: string,
  confirmedAt: string,
): FiscalNotificationsWorkspace | null {
  const ownerScope =
    canonicalFiscalNotificationOwnerScopeV2(expectedOwnerScope);
  const confirmedTimestamp = safeTimestamp(confirmedAt);
  if (!ownerScope || ownerScope !== expectedOwnerScope || !confirmedTimestamp) {
    return null;
  }
  const base =
    encodeFiscalNotificationsWorkspaceForStorageV2(baseWorkspaceValue);
  const result = encodeFiscalNotificationsWorkspaceForStorageV2(
    resultWorkspaceValue,
    base,
  );
  if (
    !base ||
    !result ||
    base.workspace.ownerScope !== ownerScope ||
    result.workspace.ownerScope !== ownerScope ||
    result.workspace.documents.length >= base.workspace.documents.length ||
    result.workspace.revision !== base.workspace.revision + 1 ||
    Date.parse(confirmedTimestamp) <= Date.parse(base.workspace.updatedAt) ||
    !envelopeCollectionsAreExactSubset(result, base)
  ) {
    return null;
  }
  const resultDocumentIds = new Set(
    result.workspace.documents.map((entry) => entry.id),
  );
  const removedDocumentIds = base.workspace.documents
    .map((entry) => entry.id)
    .filter((id) => !resultDocumentIds.has(id))
    .sort();
  if (
    removedDocumentIds.length === 0 ||
    removedDocumentIds.length !==
      base.workspace.documents.length - result.workspace.documents.length
  ) {
    return null;
  }
  const previousEmptyRestart =
    base.transition?.kind === "USER_CONFIRMED_EMPTY_RESTART_V1" &&
    emptyRestartHasBoundBase(base.transition)
      ? base.transition
      : null;
  if (previousEmptyRestart) {
    const continuedTransition = withObservedEmptyRestartBase(
      previousEmptyRestart,
      base,
    );
    const marked = parseFiscalNotificationsWorkspaceStorageEnvelopeV2(
      {
        ...result,
        transition: continuedTransition,
      },
      ownerScope,
    );
    return marked
      ? restoreFiscalNotificationsWorkspaceFromStorageV2(marked, ownerScope)
      : null;
  }
  const previousReduction =
    base.transition?.kind === "USER_CONFIRMED_DOCUMENT_REDUCTION_V1"
      ? base.transition
      : null;
  const baseDocumentIds = previousReduction
    ? (previousReduction.baseDocumentIds ??
      (base.workspace.revision === previousReduction.baseRevision + 1
        ? [
            ...new Set([
              ...base.workspace.documents.map((entry) => entry.id),
              ...previousReduction.removedDocumentIds,
            ]),
          ].sort()
        : null))
    : base.workspace.documents.map((entry) => entry.id).sort();
  if (!baseDocumentIds) return null;
  const originalDocumentIds = new Set(baseDocumentIds);
  const cumulativeRemovedDocumentIds = [
    ...new Set([
      ...(previousReduction?.removedDocumentIds ?? []),
      ...removedDocumentIds.filter((id) => originalDocumentIds.has(id)),
    ]),
  ].sort();
  const reductionAdvanced =
    !previousReduction ||
    cumulativeRemovedDocumentIds.length >
      previousReduction.removedDocumentIds.length;
  const marked = parseFiscalNotificationsWorkspaceStorageEnvelopeV2(
    {
      ...result,
      transition: {
        kind: "USER_CONFIRMED_DOCUMENT_REDUCTION_V1",
        ownerScope,
        confirmedAt:
          previousReduction && !reductionAdvanced
            ? previousReduction.confirmedAt
            : confirmedTimestamp,
        baseWorkspaceId:
          previousReduction?.baseWorkspaceId ?? base.workspace.workspaceId,
        baseCreatedAt:
          previousReduction?.baseCreatedAt ?? base.workspace.createdAt,
        baseRevision:
          previousReduction?.baseRevision ?? base.workspace.revision,
        baseUpdatedAt:
          previousReduction?.baseUpdatedAt ?? base.workspace.updatedAt,
        baseDocumentIds,
        removedDocumentIds: cumulativeRemovedDocumentIds,
      },
    },
    ownerScope,
  );
  return marked
    ? restoreFiscalNotificationsWorkspaceFromStorageV2(marked, ownerScope)
    : null;
}

export function registerFiscalNotificationEmptyRestartTransitionV2(
  emptyWorkspaceValue: unknown,
  expectedOwnerScope: string,
  confirmedAt: string,
): FiscalNotificationsWorkspace | null {
  const ownerScope =
    canonicalFiscalNotificationOwnerScopeV2(expectedOwnerScope);
  const confirmedTimestamp = safeTimestamp(confirmedAt);
  const envelope =
    encodeFiscalNotificationsWorkspaceForStorageV2(emptyWorkspaceValue);
  if (
    !ownerScope ||
    ownerScope !== expectedOwnerScope ||
    !confirmedTimestamp ||
    !envelope ||
    envelope.workspace.ownerScope !== ownerScope ||
    envelope.workspace.createdAt !== confirmedTimestamp ||
    envelope.workspace.updatedAt !== confirmedTimestamp ||
    !isFiscalNotificationsWorkspaceStorageEnvelopeEmptyV2(envelope)
  ) {
    return null;
  }
  const marked = parseFiscalNotificationsWorkspaceStorageEnvelopeV2(
    {
      ...envelope,
      transition: {
        kind: "USER_CONFIRMED_EMPTY_RESTART_V1",
        ownerScope,
        confirmedAt: confirmedTimestamp,
      },
    },
    ownerScope,
  );
  return marked
    ? restoreFiscalNotificationsWorkspaceFromStorageV2(marked, ownerScope)
    : null;
}

/**
 * Marca el primer descendiente no vacío de una generación reiniciada. El
 * comando de guardado crea antes un workspace nuevo con createdAt igual a la
 * confirmación; el marcador evita heredar una reducción de la generación
 * anterior cuando el usuario vuelve a añadir documentos tras borrar todos.
 */
export function registerFiscalNotificationEmptyRestartDescendantTransitionV2(
  workspaceValue: unknown,
  emptyBaseWorkspaceValue: unknown,
  expectedOwnerScope: string,
  confirmedAt: string,
): FiscalNotificationsWorkspace | null {
  const ownerScope =
    canonicalFiscalNotificationOwnerScopeV2(expectedOwnerScope);
  const confirmedTimestamp = safeTimestamp(confirmedAt);
  const workspace = parseFiscalNotificationsWorkspaceForPersistenceV1(
    workspaceValue,
    ownerScope ?? undefined,
  );
  const baseEnvelope = encodeFiscalNotificationsWorkspaceForStorageV2(
    emptyBaseWorkspaceValue,
  );
  const envelope = encodeFiscalNotificationsWorkspaceForStorageV2(workspace);
  if (
    !ownerScope ||
    ownerScope !== expectedOwnerScope ||
    !confirmedTimestamp ||
    !workspace ||
    !baseEnvelope ||
    !envelope ||
    baseEnvelope.workspace.ownerScope !== ownerScope ||
    !isFiscalNotificationsWorkspaceStorageEnvelopeEmptyV2(baseEnvelope) ||
    Date.parse(confirmedTimestamp) <=
      Date.parse(baseEnvelope.workspace.updatedAt) ||
    envelope.workspace.ownerScope !== ownerScope ||
    envelope.workspace.createdAt !== confirmedTimestamp ||
    Date.parse(envelope.workspace.updatedAt) < Date.parse(confirmedTimestamp) ||
    envelope.workspace.documents.length === 0
  ) {
    return null;
  }
  const inheritedRestart =
    baseEnvelope.transition?.kind === "USER_CONFIRMED_EMPTY_RESTART_V1" &&
    emptyRestartHasBoundBase(baseEnvelope.transition)
      ? baseEnvelope.transition
      : null;
  const rootBase = inheritedRestart
    ? {
        baseWorkspaceId: inheritedRestart.baseWorkspaceId,
        baseCreatedAt: inheritedRestart.baseCreatedAt,
        baseRevision: inheritedRestart.baseRevision,
        baseUpdatedAt: inheritedRestart.baseUpdatedAt,
        baseEnvelopeSha256: inheritedRestart.baseEnvelopeSha256,
        lineageEnvelopeSha256s: appendObservedEnvelopeSha256(
          inheritedRestart.lineageEnvelopeSha256s,
          sha256Hex(stableJson(baseEnvelope)),
        ),
      }
    : {
        baseWorkspaceId: baseEnvelope.workspace.workspaceId,
        baseCreatedAt: baseEnvelope.workspace.createdAt,
        baseRevision: baseEnvelope.workspace.revision,
        baseUpdatedAt: baseEnvelope.workspace.updatedAt,
        baseEnvelopeSha256: sha256Hex(stableJson(baseEnvelope)),
      };
  const marked = parseFiscalNotificationsWorkspaceStorageEnvelopeV2(
    {
      ...envelope,
      transition: {
        kind: "USER_CONFIRMED_EMPTY_RESTART_V1",
        ownerScope,
        confirmedAt: confirmedTimestamp,
        ...rootBase,
      },
    },
    ownerScope,
  );
  if (!marked) return null;
  memoryEnvelopeByWorkspace.set(workspace, marked);
  return workspace;
}

export function registerFiscalNotificationAutomaticEmptyRepairTransitionV2(
  emptyWorkspaceValue: unknown,
  expectedOwnerScope: string,
  repairedAt: string,
): FiscalNotificationsWorkspace | null {
  const ownerScope =
    canonicalFiscalNotificationOwnerScopeV2(expectedOwnerScope);
  const repairedTimestamp = safeTimestamp(repairedAt);
  const envelope =
    encodeFiscalNotificationsWorkspaceForStorageV2(emptyWorkspaceValue);
  if (
    !ownerScope ||
    ownerScope !== expectedOwnerScope ||
    !repairedTimestamp ||
    !envelope ||
    envelope.workspace.ownerScope !== ownerScope ||
    envelope.workspace.createdAt !== repairedTimestamp ||
    envelope.workspace.updatedAt !== repairedTimestamp ||
    !isFiscalNotificationsWorkspaceStorageEnvelopeEmptyV2(envelope)
  ) {
    return null;
  }
  const marked = parseFiscalNotificationsWorkspaceStorageEnvelopeV2(
    {
      ...envelope,
      transition: {
        kind: "AUTO_REPAIRED_EMPTY_HISTORY_V1",
        ownerScope,
        repairedAt: repairedTimestamp,
      },
    },
    ownerScope,
  );
  return marked
    ? restoreFiscalNotificationsWorkspaceFromStorageV2(marked, ownerScope)
    : null;
}

export function compareFiscalNotificationsWorkspaceStorageEnvelopesV2(
  currentValue: unknown,
  incomingValue: unknown,
  expectedOwnerScope: string,
): FiscalNotificationsWorkspaceStorageComparisonV2 {
  const current = parseFiscalNotificationsWorkspaceStorageEnvelopeV2(
    currentValue,
    expectedOwnerScope,
  );
  const incoming = parseFiscalNotificationsWorkspaceStorageEnvelopeV2(
    incomingValue,
    expectedOwnerScope,
  );
  if (!current || !incoming) return "DIVERGED";
  if (stableJson(current) === stableJson(incoming)) return "EQUAL";
  const declaredTransitionComparison = compareDeclaredTransitions(
    current,
    incoming,
  );
  if (declaredTransitionComparison) return declaredTransitionComparison;
  if (
    current.workspace.workspaceId !== incoming.workspace.workspaceId ||
    current.workspace.createdAt !== incoming.workspace.createdAt
  ) {
    return "DIVERGED";
  }
  if (
    incoming.workspace.revision > current.workspace.revision &&
    incoming.workspace.updatedAt > current.workspace.updatedAt &&
    envelopeCollectionsAreExactSubset(current, incoming)
  ) {
    return "INCOMING_ADVANCES";
  }
  if (
    current.workspace.revision > incoming.workspace.revision &&
    current.workspace.updatedAt > incoming.workspace.updatedAt &&
    envelopeCollectionsAreExactSubset(incoming, current)
  ) {
    return "CURRENT_ADVANCES";
  }
  return "DIVERGED";
}

export function mergeFiscalNotificationsWorkspaceStorageEnvelopesV2(
  currentValue: unknown,
  incomingValue: unknown,
  expectedOwnerScope: string,
): Readonly<FiscalNotificationsWorkspaceStorageEnvelopeV2> | null {
  const current = parseFiscalNotificationsWorkspaceStorageEnvelopeV2(
    currentValue,
    expectedOwnerScope,
  );
  const incoming = parseFiscalNotificationsWorkspaceStorageEnvelopeV2(
    incomingValue,
    expectedOwnerScope,
  );
  if (!incoming) return current;
  if (!current) return incoming;
  const comparison = compareFiscalNotificationsWorkspaceStorageEnvelopesV2(
    current,
    incoming,
    expectedOwnerScope,
  );
  if (comparison === "INCOMING_ADVANCES") return incoming;
  if (comparison === "EQUAL" || comparison === "CURRENT_ADVANCES")
    return current;
  return null;
}

export function registeredFiscalNotificationsWorkspaceEnvelopeV2(
  workspace: unknown,
): Readonly<FiscalNotificationsWorkspaceStorageEnvelopeV2> | null {
  return workspace && typeof workspace === "object"
    ? (memoryEnvelopeByWorkspace.get(workspace as object) ?? null)
    : null;
}
