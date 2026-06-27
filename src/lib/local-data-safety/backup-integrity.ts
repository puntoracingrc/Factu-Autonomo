import { createHash } from "node:crypto";
import { LocalDataSafetyError } from "./errors";
import {
  counterCount,
  customersFrom,
  documentRef,
  documentsFrom,
  expensesFrom,
  isPlainObject,
  nowIso,
  projectDocumentForComparison,
  providersFrom,
  stringValue,
} from "./helpers";
import type {
  LocalDataBackupIntegrityDigest,
  LocalDataSafetyAppData,
  LocalDataSafetyEntityLike,
} from "./types";

// PHASE2D3_BACKUP_INTEGRITY_HASH_V1

function projectEntity(entity: LocalDataSafetyEntityLike): Record<string, unknown> {
  return {
    id: stringValue(entity.id) ?? stringValue(entity.localId),
    name: stringValue(entity.name) ?? stringValue(entity.displayName),
    nif: stringValue(entity.nif) ?? stringValue(entity.taxId),
  };
}

function projectCounters(appData: LocalDataSafetyAppData): Record<string, unknown> {
  const counters = {
    ...(isPlainObject(appData.counters) ? appData.counters : {}),
    ...(isPlainObject(appData.numbering) ? appData.numbering : {}),
  };
  return stableObject(counters);
}

function stableObject(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => [key, stableValue(entry)]),
  );
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (isPlainObject(value)) return stableObject(value);
  if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (value === null || value === undefined) return null;
  return String(value);
}

export function canonicalizeLocalDataBackupForHash(
  appData: LocalDataSafetyAppData,
): string {
  const canonical = {
    canonicalVersion: "local-data-backup-canonical-v1",
    totals: {
      documents: documentsFrom(appData).length,
      customers: customersFrom(appData).length,
      providers: providersFrom(appData).length,
      expenses: expensesFrom(appData).length,
      counters: counterCount(appData),
    },
    documents: documentsFrom(appData)
      .map(projectDocumentForComparison)
      .sort((a, b) => String(a.ref).localeCompare(String(b.ref))),
    customers: customersFrom(appData)
      .map(projectEntity)
      .sort((a, b) => String(a.id).localeCompare(String(b.id))),
    providers: providersFrom(appData)
      .map(projectEntity)
      .sort((a, b) => String(a.id).localeCompare(String(b.id))),
    expenses: expensesFrom(appData)
      .map(projectEntity)
      .sort((a, b) => String(a.id).localeCompare(String(b.id))),
    counters: projectCounters(appData),
  };

  return JSON.stringify(canonical);
}

export function buildLocalDataBackupIntegrityDigest(
  appData: LocalDataSafetyAppData,
  generatedAt = nowIso(),
): LocalDataBackupIntegrityDigest {
  const canonical = canonicalizeLocalDataBackupForHash(appData);
  return {
    marker: "PHASE2D3_BACKUP_INTEGRITY_HASH_V1",
    algorithm: "sha256",
    canonicalVersion: "local-data-backup-canonical-v1",
    value: createHash("sha256").update(canonical).digest("hex"),
    generatedAt,
  };
}

export function verifyLocalDataBackupIntegrity(
  appData: LocalDataSafetyAppData,
  digest: LocalDataBackupIntegrityDigest,
): boolean {
  if (digest.marker !== "PHASE2D3_BACKUP_INTEGRITY_HASH_V1") {
    throw new LocalDataSafetyError("INTEGRITY_MISMATCH", "Invalid integrity digest marker.");
  }
  if (digest.algorithm !== "sha256") {
    throw new LocalDataSafetyError("INTEGRITY_MISMATCH", "Unsupported integrity digest algorithm.");
  }
  const expected = buildLocalDataBackupIntegrityDigest(appData, digest.generatedAt);
  return expected.value === digest.value;
}

export function documentHashRefForTests(appData: LocalDataSafetyAppData): string[] {
  return documentsFrom(appData).map(documentRef).sort();
}
