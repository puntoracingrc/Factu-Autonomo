import type {
  LocalDataDocumentSafeSummary,
  LocalDataRiskFlag,
  LocalDataSafetyAppData,
  LocalDataSafetyDocumentLike,
  LocalDataSafetyEntityLike,
} from "./types";

// PHASE2D1_10_LOCAL_DATA_BACKUP_RESTORE_SAFETY_V1

export function nowIso(): string {
  return new Date().toISOString();
}

export function asArray<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

export function documentsFrom(appData: LocalDataSafetyAppData): LocalDataSafetyDocumentLike[] {
  return asArray(appData.documents);
}

export function customersFrom(appData: LocalDataSafetyAppData): LocalDataSafetyEntityLike[] {
  return [...asArray(appData.customers), ...asArray(appData.clients)];
}

export function providersFrom(appData: LocalDataSafetyAppData): LocalDataSafetyEntityLike[] {
  return asArray(appData.providers);
}

export function expensesFrom(appData: LocalDataSafetyAppData): LocalDataSafetyEntityLike[] {
  return asArray(appData.expenses);
}

export function counterCount(appData: LocalDataSafetyAppData): number {
  return Object.keys({
    ...(isPlainObject(appData.counters) ? appData.counters : {}),
    ...(isPlainObject(appData.numbering) ? appData.numbering : {}),
  }).length;
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function stringValue(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return undefined;
}

export function documentRef(document: LocalDataSafetyDocumentLike): string {
  return (
    stringValue(document.id) ??
    stringValue(document.localId) ??
    [
      stringValue(document.kind) ?? stringValue(document.type) ?? "document",
      stringValue(document.number) ?? "without_number",
      stringValue(document.year) ?? "without_year",
    ].join(":")
  );
}

export function documentKind(document: LocalDataSafetyDocumentLike): string {
  return stringValue(document.kind) ?? stringValue(document.type) ?? "unknown";
}

export function documentStatus(document: LocalDataSafetyDocumentLike): string | undefined {
  return stringValue(document.status);
}

export function documentLifecycle(document: LocalDataSafetyDocumentLike): string | undefined {
  return stringValue(document.documentLifecycle);
}

export function documentIntegrityLock(document: LocalDataSafetyDocumentLike): string | undefined {
  return stringValue(document.integrityLock);
}

export function isProtectedDocument(document: LocalDataSafetyDocumentLike): boolean {
  const lifecycle = documentLifecycle(document);
  const lock = documentIntegrityLock(document);
  const status = documentStatus(document);
  return (
    lifecycle === "issued" ||
    lifecycle === "canceled" ||
    lock === "locked" ||
    Boolean(status && status !== "borrador")
  );
}

export function documentRiskFlags(document: LocalDataSafetyDocumentLike): LocalDataRiskFlag[] {
  const flags = new Set<LocalDataRiskFlag>();
  const lifecycle = documentLifecycle(document);
  const lock = documentIntegrityLock(document);
  const status = documentStatus(document);

  if (lifecycle === "issued") flags.add("protected_issued_document");
  if (lifecycle === "canceled") flags.add("protected_canceled_document");
  if (lock === "locked") flags.add("protected_locked_document");
  if (status && status !== "borrador") flags.add("protected_legacy_non_draft");
  if (document.snapshotHash) flags.add("snapshot_hash_present");
  if (document.pdfSnapshotHash) flags.add("pdf_snapshot_hash_present");
  if (document.documentSnapshot !== undefined) flags.add("snapshot_body_present");
  if (document.pdfSnapshot !== undefined) flags.add("pdf_snapshot_body_present");
  if (document.number !== undefined || document.year !== undefined) {
    flags.add("numbering_present");
  }

  return [...flags];
}

export function uniqueRiskFlags(flags: LocalDataRiskFlag[]): LocalDataRiskFlag[] {
  return [...new Set(flags)];
}

export function buildDocumentSafeSummary(
  document: LocalDataSafetyDocumentLike,
): LocalDataDocumentSafeSummary {
  return {
    documentRef: documentRef(document),
    kind: documentKind(document),
    status: documentStatus(document),
    lifecycle: documentLifecycle(document),
    integrityLock: documentIntegrityLock(document),
    number: stringValue(document.number),
    year: stringValue(document.year),
    customerRef: stringValue(document.customerId),
    snapshotHashPresent: Boolean(document.snapshotHash),
    pdfSnapshotHashPresent: Boolean(document.pdfSnapshotHash),
  };
}

export function indexDocumentsByRef(
  documents: LocalDataSafetyDocumentLike[],
): Map<string, LocalDataSafetyDocumentLike> {
  const map = new Map<string, LocalDataSafetyDocumentLike>();
  for (const document of documents) map.set(documentRef(document), document);
  return map;
}

export function increment(map: Record<string, number>, key: string): void {
  map[key] = (map[key] ?? 0) + 1;
}

export function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function equivalentSafeDocument(
  a: LocalDataSafetyDocumentLike | undefined,
  b: LocalDataSafetyDocumentLike | undefined,
): boolean {
  if (!a || !b) return a === b;
  return JSON.stringify(projectDocumentForComparison(a)) === JSON.stringify(projectDocumentForComparison(b));
}

export function projectDocumentForComparison(
  document: LocalDataSafetyDocumentLike,
): Record<string, unknown> {
  return {
    ref: documentRef(document),
    kind: documentKind(document),
    status: documentStatus(document),
    lifecycle: documentLifecycle(document),
    integrityLock: documentIntegrityLock(document),
    number: stringValue(document.number),
    year: stringValue(document.year),
    customerId: stringValue(document.customerId),
    snapshotHash: stringValue(document.snapshotHash),
    pdfSnapshotHash: stringValue(document.pdfSnapshotHash),
  };
}
