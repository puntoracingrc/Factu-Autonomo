import { assertBoundedOwnerScope } from "./input-contract";
import { canonicalFiscalNotificationOwnerScopeV2 } from "./sensitive-reference.v2";
import type { FiscalNotificationsWorkspace } from "./types";
import { validateFiscalNotificationsWorkspaceIntegrity } from "./workspace-integrity";

export const FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V1 =
  "fiscal-notifications-workspace-v1" as const;

export const FISCAL_NOTIFICATIONS_WORKSPACE_MAX_SERIALIZED_BYTES_V1 =
  4 * 1024 * 1024;

export type FiscalNotificationsWorkspaceComparisonV1 =
  | "EQUAL"
  | "INCOMING_ADVANCES"
  | "CURRENT_ADVANCES"
  | "DIVERGED";

const COLLECTIONS = [
  "packages",
  "files",
  "documents",
  "parts",
  "authorities",
  "references",
  "evidence",
  "debts",
  "debtObservations",
  "cases",
  "relations",
  "analysisSnapshots",
  "paymentOptions",
  "paymentPlans",
  "installments",
  "interestCalculations",
  "deadlineRules",
  "obligations",
  "timeline",
  "accountingDrafts",
  "auditEvents",
  "driveArchives",
] as const satisfies readonly (keyof FiscalNotificationsWorkspace)[];

type JsonRecord = Record<string, unknown>;
const MAX_PERSISTED_FACT_TEXT_CHARS = 2_000;

function stableNormalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableNormalize);
  if (!value || typeof value !== "object") return value;
  const record = value as JsonRecord;
  return Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort()
    .reduce<JsonRecord>((result, key) => {
      result[key] = stableNormalize(record[key]);
      return result;
    }, Object.create(null) as JsonRecord);
}

function stableJson(value: unknown): string {
  return JSON.stringify(stableNormalize(value));
}

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function readOwnerScope(value: unknown): string | null {
  try {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const descriptor = Object.getOwnPropertyDescriptor(value, "ownerScope");
    if (!descriptor || !("value" in descriptor)) return null;
    assertBoundedOwnerScope(descriptor.value, "workspace.ownerScope");
    return canonicalFiscalNotificationOwnerScopeV2(descriptor.value);
  } catch {
    return null;
  }
}

function hasPersistenceSafeSourceContent(
  workspace: FiscalNotificationsWorkspace,
): boolean {
  if (workspace.parts.length > 0) return false;
  if (
    workspace.files.some(
      (file) =>
        file.sourceContentRetention !== "NOT_RETAINED" ||
        "originalFilename" in file ||
        "storageReference" in file ||
        "isImmutableOriginal" in file,
    )
  ) {
    return false;
  }
  const bounded = (value: string | undefined): boolean =>
    value === undefined || value.length <= MAX_PERSISTED_FACT_TEXT_CHARS;
  if (
    workspace.documents.some(
      (document) =>
        !bounded(document.titleRaw) || !bounded(document.titleNormalized),
    ) ||
    workspace.references.some(
      (reference) =>
        !bounded(reference.rawValue) || !bounded(reference.normalizedValue),
    ) ||
    workspace.evidence.some(
      (evidence) =>
        !bounded(evidence.textSnippet) || !bounded(evidence.rawValue),
    ) ||
    workspace.analysisSnapshots.some(
      (snapshot) =>
        snapshot.plainLanguageExplanation.some((line) => !bounded(line)) ||
        snapshot.validationWarnings.some((line) => !bounded(line)),
    )
  ) {
    return false;
  }
  return true;
}

/**
 * Valida y copia defensivamente el workspace antes de cruzar un límite de
 * persistencia. Nunca devuelve el objeto recibido ni conserva valores que el
 * contrato de integridad no reconozca.
 */
export function parseFiscalNotificationsWorkspaceForPersistenceV1(
  value: unknown,
  expectedOwnerScope?: string,
): FiscalNotificationsWorkspace | null {
  const ownerScope = expectedOwnerScope ?? readOwnerScope(value);
  if (!ownerScope || !canonicalFiscalNotificationOwnerScopeV2(ownerScope))
    return null;
  try {
    assertBoundedOwnerScope(ownerScope, "expectedOwnerScope");
  } catch {
    return null;
  }
  const validation = validateFiscalNotificationsWorkspaceIntegrity(
    value,
    ownerScope,
  );
  if (!validation.valid) return null;

  let copy: FiscalNotificationsWorkspace;
  try {
    copy = structuredClone(value) as FiscalNotificationsWorkspace;
  } catch {
    return null;
  }
  const copiedValidation = validateFiscalNotificationsWorkspaceIntegrity(
    copy,
    ownerScope,
  );
  if (!copiedValidation.valid) return null;
  if (!hasPersistenceSafeSourceContent(copy)) return null;
  try {
    if (
      utf8ByteLength(stableJson(copy)) >
      FISCAL_NOTIFICATIONS_WORKSPACE_MAX_SERIALIZED_BYTES_V1
    ) {
      return null;
    }
  } catch {
    return null;
  }
  return copy;
}

function collectionContainsExactPrefix(
  smaller: FiscalNotificationsWorkspace,
  larger: FiscalNotificationsWorkspace,
): boolean {
  for (const collection of COLLECTIONS) {
    const largerById = new Map(
      ((larger[collection] ?? []) as readonly { id: string }[]).map((entry) => [
        entry.id,
        entry,
      ]),
    );
    for (const entry of (smaller[collection] ?? []) as readonly {
      id: string;
    }[]) {
      const candidate = largerById.get(entry.id);
      if (!candidate || stableJson(candidate) !== stableJson(entry)) return false;
    }
  }
  return true;
}

/**
 * Compara dos revisiones sin LWW silencioso. En V1 solo es un avance válido
 * añadir entidades dejando intactas las anteriores; una edición o pérdida de
 * hechos se considera divergencia y exige una reconciliación posterior.
 */
export function compareFiscalNotificationsWorkspacesV1(
  currentValue: unknown,
  incomingValue: unknown,
  expectedOwnerScope: string,
): FiscalNotificationsWorkspaceComparisonV1 {
  const current = parseFiscalNotificationsWorkspaceForPersistenceV1(
    currentValue,
    expectedOwnerScope,
  );
  const incoming = parseFiscalNotificationsWorkspaceForPersistenceV1(
    incomingValue,
    expectedOwnerScope,
  );
  if (!current || !incoming) return "DIVERGED";
  if (
    current.workspaceId !== incoming.workspaceId ||
    current.createdAt !== incoming.createdAt
  ) {
    return "DIVERGED";
  }
  const currentJson = stableJson(current);
  const incomingJson = stableJson(incoming);
  if (currentJson === incomingJson) return "EQUAL";
  if (
    incoming.revision > current.revision &&
    incoming.updatedAt > current.updatedAt &&
    collectionContainsExactPrefix(current, incoming)
  ) {
    return "INCOMING_ADVANCES";
  }
  if (
    current.revision > incoming.revision &&
    current.updatedAt > incoming.updatedAt &&
    collectionContainsExactPrefix(incoming, current)
  ) {
    return "CURRENT_ADVANCES";
  }
  return "DIVERGED";
}

export function mergeFiscalNotificationsWorkspacesV1(
  currentValue: unknown,
  incomingValue: unknown,
  expectedOwnerScope?: string,
): FiscalNotificationsWorkspace | null {
  const currentOwner = expectedOwnerScope ?? readOwnerScope(currentValue);
  const incomingOwner = readOwnerScope(incomingValue);
  const ownerScope = currentOwner ?? incomingOwner;
  if (!ownerScope || (incomingOwner && incomingOwner !== ownerScope)) return null;

  const current = parseFiscalNotificationsWorkspaceForPersistenceV1(
    currentValue,
    ownerScope,
  );
  const incoming = parseFiscalNotificationsWorkspaceForPersistenceV1(
    incomingValue,
    ownerScope,
  );
  if (!incoming) return current;
  if (!current) return incoming;
  const comparison = compareFiscalNotificationsWorkspacesV1(
    current,
    incoming,
    ownerScope,
  );
  if (comparison === "INCOMING_ADVANCES") return incoming;
  if (comparison === "EQUAL" || comparison === "CURRENT_ADVANCES") {
    return current;
  }
  return null;
}

export function fiscalNotificationsOwnerScopeForUserIdV1(
  userId: string,
): string | null {
  const ownerScope = `user:${userId}`;
  if (!canonicalFiscalNotificationOwnerScopeV2(ownerScope)) return null;
  try {
    assertBoundedOwnerScope(ownerScope, "userId");
  } catch {
    return null;
  }
  return ownerScope;
}
