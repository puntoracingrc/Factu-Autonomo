import { canPhysicallyDeleteDocument } from "@/lib/document-integrity/deletion";
import {
  businessProfileMissingDocumentLabels,
  hasUsualSpanishTaxIdShape,
} from "@/lib/business-profile";
import { isDraftInvoiceNumber } from "@/lib/documents";
import { validateDocumentEmission } from "@/lib/invoice-compliance";
import { inspectLegacyImportAttestation } from "@/lib/document-integrity/legacy-import-attestation";
import type { Document } from "@/lib/types";
import { DEFAULT_PROFILE } from "@/lib/types";

function normalizedIdentityText(value: string | undefined): string {
  return value?.replace(/[\s.-]/g, "").toUpperCase() ?? "";
}

function normalizedText(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizedNumber(value: number | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? Number(value.toFixed(8))
    : null;
}

/**
 * Contenido documental que una reimportación nunca puede reescribir una vez
 * emitido. Se omiten IDs técnicos, timestamps y estados operativos (pago,
 * entrega, aceptación), que pueden variar sin cambiar el justificante fiscal.
 */
function protectedImportFingerprint(
  document: Document,
  compareIssuer: boolean,
): string {
  const snapshot = document.documentSnapshot;
  const customer = snapshot?.customer ?? document.client;
  const issuer = snapshot?.issuer ?? document.issuer;
  const items = snapshot?.items ?? document.items;
  const rectification = snapshot?.rectification ?? document.rectification;

  return JSON.stringify({
    type: snapshot?.documentType ?? document.type,
    number: normalizedText(snapshot?.number ?? document.number),
    date: snapshot?.date ?? document.date,
    dueDate: normalizedText(snapshot?.dueDate ?? document.dueDate),
    customer: {
      customerType: customer.customerType ?? null,
      residenceType: customer.residenceType ?? null,
      firstName: normalizedText(customer.firstName),
      lastName: normalizedText(customer.lastName),
      name: normalizedText(customer.name),
      contactName: normalizedText(customer.contactName),
      nif: normalizedText(customer.nif)?.toUpperCase() ?? null,
      email: normalizedText(customer.email)?.toLowerCase() ?? null,
      phone: normalizedText(customer.phone),
      streetType: normalizedText(customer.streetType),
      address: normalizedText(customer.address),
      addressExtra: normalizedText(customer.addressExtra),
      city: normalizedText(customer.city),
      postalCode: normalizedText(customer.postalCode),
    },
    issuer: compareIssuer && issuer
      ? {
          name: normalizedText(issuer.name),
          commercialName: normalizedText(issuer.commercialName),
          nif: normalizedText(issuer.nif)?.toUpperCase() ?? null,
          vatId: normalizedText(issuer.vatId)?.toUpperCase() ?? null,
          address: normalizedText(issuer.address),
          city: normalizedText(issuer.city),
          postalCode: normalizedText(issuer.postalCode),
          province: normalizedText(issuer.province),
          country: normalizedText(issuer.country),
          phone: normalizedText(issuer.phone),
          email: normalizedText(issuer.email)?.toLowerCase() ?? null,
          website: normalizedText(issuer.website)?.toLowerCase() ?? null,
          iban: normalizedText(issuer.iban)?.replace(/\s+/g, "").toUpperCase() ?? null,
          logoUrl: normalizedText(issuer.logoUrl),
        }
      : null,
    items: items.map((item) => ({
      description: normalizedText(item.description),
      quantity: normalizedNumber(item.quantity),
      unit: normalizedText(item.unit),
      unitPrice: normalizedNumber(item.unitPrice),
      ivaPercent: normalizedNumber(item.ivaPercent),
    })),
    notes: normalizedText(snapshot?.notes ?? document.notes),
    paymentTerms: normalizedText(
      snapshot?.paymentTerms ?? document.paymentTerms,
    ),
    rectification: rectification
      ? {
          originalNumber: normalizedText(rectification.originalNumber),
          originalDate: rectification.originalDate,
          reason: normalizedText(rectification.reason),
          type: rectification.type,
        }
      : null,
  });
}

function hasEquivalentProtectedContent(
  current: Document,
  imported: Document,
  compareIssuer: boolean,
): boolean {
  return (
    protectedImportFingerprint(current, compareIssuer) ===
    protectedImportFingerprint(imported, compareIssuer)
  );
}

function importedIntroducesProtectedFiscalState(
  current: Document,
  imported: Document,
): boolean {
  if (current.type !== "factura" || imported.type !== "factura") return false;
  const currentClaimsCancellation =
    current.status === "anulada" ||
    current.status === "rectificada" ||
    Boolean(current.rectifiedById);
  const importedClaimsCancellation =
    imported.status === "anulada" ||
    imported.status === "rectificada" ||
    Boolean(imported.rectifiedById);
  return importedClaimsCancellation && !currentClaimsCancellation;
}

function relatedDocumentIds(document: Document): string[] {
  return [
    document.sourceQuoteDocumentId,
    document.sourceDocumentId,
    document.receiptDocumentId,
    document.rectifiedById,
    document.rectification?.originalDocumentId,
    document.documentSnapshot?.rectification?.originalDocumentId,
  ].filter((value): value is string => Boolean(value?.trim()));
}

function protectedIdsIncludingRelationshipEndpoints(
  documents: Document[],
): Set<string> {
  const existingIds = new Set(documents.map((document) => document.id));
  const adjacency = new Map<string, Set<string>>();
  const connect = (left: string, right: string) => {
    const neighbors = adjacency.get(left);
    if (neighbors) neighbors.add(right);
    else adjacency.set(left, new Set([right]));
  };
  for (const document of documents) {
    for (const relatedId of relatedDocumentIds(document)) {
      if (!existingIds.has(relatedId)) continue;
      connect(document.id, relatedId);
      connect(relatedId, document.id);
    }
  }
  const protectedIds = new Set(
    documents
      .filter((document) => !canPhysicallyDeleteDocument(document))
      .map((document) => document.id),
  );
  const pending = [...protectedIds];
  for (let index = 0; index < pending.length; index += 1) {
    const id = pending[index];
    for (const neighbor of adjacency.get(id) ?? []) {
      if (!protectedIds.has(neighbor)) {
        protectedIds.add(neighbor);
        pending.push(neighbor);
      }
    }
  }

  return protectedIds;
}

interface DocumentImportIdentity {
  key: string;
  issuerNif: string;
}

function documentImportIdentity(
  document: Document,
): DocumentImportIdentity | null {
  if (isDraftInvoiceNumber(document)) return null;
  const snapshot = document.documentSnapshot;
  const snapshotKind = snapshot?.documentKind;
  const liveKind =
    document.type === "factura" && document.rectification
      ? "factura_rectificativa"
      : document.type;
  const kind = snapshotKind ?? liveKind;
  if (kind !== "factura" && kind !== "factura_rectificativa") return null;
  const number = (snapshot?.number ?? document.number)?.trim().toUpperCase();
  const date = snapshot?.date ?? document.date;
  const year = /^\d{4}-\d{2}-\d{2}$/.test(date ?? "")
    ? date.slice(0, 4)
    : "";
  if (!number || !year) return null;
  const identityType =
    kind === "factura_rectificativa" ? "factura" : kind;
  const issuerNif = normalizedIdentityText(
    snapshot?.issuer.nif ?? document.issuer?.nif,
  );
  return {
    key: `${identityType}|${year}|${number}`,
    issuerNif: hasUsualSpanishTaxIdShape(issuerNif) ? issuerNif : "",
  };
}

function duplicateIds(documents: Document[]): string[] {
  const counts = new Map<string, number>();
  for (const document of documents) {
    counts.set(document.id, (counts.get(document.id) ?? 0) + 1);
  }
  return [...counts]
    .filter(([, count]) => count > 1)
    .map(([id]) => id);
}

function fiscalIdentityConflicts(input: {
  protectedCurrent: Document[];
  imported: Document[];
}): string[] {
  const conflicts = new Set<string>();
  type IdentityEntry = {
    document: Document;
    identity: DocumentImportIdentity;
  };
  const groupByKey = (documents: Document[]) => {
    const groups = new Map<string, IdentityEntry[]>();
    for (const document of documents) {
      const identity = documentImportIdentity(document);
      if (!identity) continue;
      const entry = { document, identity };
      const group = groups.get(identity.key);
      if (group) group.push(entry);
      else groups.set(identity.key, [entry]);
    }
    return groups;
  };
  const currentGroups = groupByKey(input.protectedCurrent);
  const importedGroups = groupByKey(input.imported);

  const identityIds = (entries: IdentityEntry[]) => {
    const all = new Set<string>();
    const blank = new Set<string>();
    const byIssuer = new Map<string, Set<string>>();
    for (const entry of entries) {
      const id = entry.document.id;
      const issuer = entry.identity.issuerNif;
      all.add(id);
      if (!issuer) {
        blank.add(id);
        continue;
      }
      const ids = byIssuer.get(issuer);
      if (ids) ids.add(id);
      else byIssuer.set(issuer, new Set([id]));
    }
    return { all, blank, byIssuer };
  };
  const containsDifferentId = (ids: Set<string>, id: string) =>
    ids.size > 1 || (ids.size === 1 && !ids.has(id));
  const markWithin = (entries: IdentityEntry[]) => {
    if (entries.length < 2) return;
    const ids = identityIds(entries);
    if (ids.blank.size > 0 && ids.all.size > 1) {
      ids.all.forEach((id) => conflicts.add(id));
      return;
    }
    ids.byIssuer.forEach((issuerIds) => {
      if (issuerIds.size > 1) {
        issuerIds.forEach((id) => conflicts.add(id));
      }
    });
  };
  const markAcross = (left: IdentityEntry[], right: IdentityEntry[]) => {
    const rightIds = identityIds(right);
    const emptyIds = new Set<string>();
    for (const entry of left) {
      const hasCompatibleDifferentId = entry.identity.issuerNif
        ? containsDifferentId(rightIds.blank, entry.document.id) ||
          containsDifferentId(
            rightIds.byIssuer.get(entry.identity.issuerNif) ?? emptyIds,
            entry.document.id,
          )
        : containsDifferentId(rightIds.all, entry.document.id);
      if (hasCompatibleDifferentId) {
        conflicts.add(entry.document.id);
      }
    }
  };

  currentGroups.forEach(markWithin);
  importedGroups.forEach(markWithin);
  for (const [key, currentEntries] of currentGroups) {
    const importedEntries = importedGroups.get(key);
    if (importedEntries) {
      markAcross(currentEntries, importedEntries);
      markAcross(importedEntries, currentEntries);
    }
  }

  return [...conflicts];
}

export function mergeImportedDocumentsPreservingProtected(input: {
  current: Document[];
  imported: Document[];
  belongsToSource: (document: Document) => boolean;
  compareImportedIssuer?: boolean;
}): {
  documents: Document[];
  acceptedImported: Document[];
  preservedDocumentIds: string[];
  conflictingDocumentIds: string[];
  duplicateImportedDocumentIds: string[];
  fiscalIdentityConflictDocumentIds: string[];
  duplicateCurrentDocumentIds: string[];
} {
  const protectedIds = protectedIdsIncludingRelationshipEndpoints(
    input.current,
  );
  const protectedSourceDocuments = new Map(
    input.current
      .filter(
        (document) =>
          input.belongsToSource(document) &&
          protectedIds.has(document.id),
      )
      .map((document) => [document.id, document] as const),
  );
  const protectedSourceIds = new Set(protectedSourceDocuments.keys());
  const kept = input.current.filter(
    (document) =>
      !input.belongsToSource(document) || protectedSourceIds.has(document.id),
  );
  const acceptedImported = input.imported.filter(
    (document) => !protectedSourceIds.has(document.id),
  );
  const conflictingDocumentIds = input.imported.flatMap((document) => {
    const current = protectedSourceDocuments.get(document.id);
    return current &&
      (!hasEquivalentProtectedContent(
          current,
          document,
          input.compareImportedIssuer === true,
        ) ||
        importedIntroducesProtectedFiscalState(current, document))
      ? [document.id]
      : [];
  });
  const duplicateImportedDocumentIds = duplicateIds(input.imported);
  const duplicateCurrentDocumentIds = duplicateIds(input.current);
  const fiscalIdentityConflictDocumentIds = fiscalIdentityConflicts({
    protectedCurrent: kept,
    imported: input.imported,
  });

  return {
    documents: [...kept, ...acceptedImported],
    acceptedImported,
    preservedDocumentIds: [...protectedSourceIds],
    conflictingDocumentIds,
    duplicateImportedDocumentIds,
    duplicateCurrentDocumentIds,
    fiscalIdentityConflictDocumentIds,
  };
}

export function assertNoProtectedImportReplacements(result: {
  conflictingDocumentIds: string[];
  duplicateImportedDocumentIds?: string[];
  duplicateCurrentDocumentIds?: string[];
  fiscalIdentityConflictDocumentIds?: string[];
}): void {
  const conflicts = new Set([
    ...result.conflictingDocumentIds,
    ...(result.duplicateImportedDocumentIds ?? []),
    ...(result.duplicateCurrentDocumentIds ?? []),
    ...(result.fiscalIdentityConflictDocumentIds ?? []),
  ]);
  if (conflicts.size === 0) return;
  throw new Error(
    `La reimportación contiene ${conflicts.size} documento(s) duplicado(s), fiscalmente ambiguo(s) o con contenido diferente de la evidencia protegida. No se aplicó ningún cambio; conserva esos documentos y revisa el lote por separado.`,
  );
}

export function assertAcceptedImportedDocumentsNormalized(input: {
  normalized: Document[];
  acceptedImported: Document[];
}): string[] {
  const normalizedById = new Map<string, Document[]>();
  for (const document of input.normalized) {
    const matching = normalizedById.get(document.id);
    if (matching) matching.push(document);
    else normalizedById.set(document.id, [document]);
  }

  const rejectedIds = new Set<string>();
  const unpairedLegacyCancellationIds: string[] = [];
  const invalidIssuerIds = new Set<string>();
  const invalidCompliance = new Map<string, string>();
  for (const imported of input.acceptedImported) {
    const matching = normalizedById.get(imported.id) ?? [];
    if (matching.length !== 1 || matching[0].integrityQuarantine) {
      rejectedIds.add(imported.id);
      continue;
    }
    const normalized = matching[0];
    const issues = normalized.snapshotIntegrity?.issues ?? [];
    const legacyInspection = inspectLegacyImportAttestation(normalized);
    const acceptsAttestedHistoricalCompleteness = Boolean(
      legacyInspection.ok &&
        normalized.legacyImportAttestation?.schemaVersion === 2 &&
        normalized.legacyImportAttestation.acceptedContentPolicy.kind ===
          "stored_fiscal_content_user_authoritative",
    );
    const isExpectedUnpairedLegacyCancellation =
      normalized.type === "factura" &&
      normalized.status === "anulada" &&
      !normalized.rectifiedById &&
      (normalized.documentSnapshot?.source === "legacy_backfill" ||
        normalized.documentSnapshot?.source === "legacy_import_attested") &&
      issues.length === 1 &&
      issues[0] === "document_relationship_invalid";
    const hasInvalidIssuer =
      (normalized.type === "factura" || normalized.type === "recibo") &&
      (normalized.documentSnapshot?.source === "legacy_backfill" ||
        normalized.documentSnapshot?.source === "legacy_import_attested") &&
      (businessProfileMissingDocumentLabels(
        normalized.documentSnapshot.issuer,
      ).length > 0 ||
        !hasUsualSpanishTaxIdShape(
          normalized.documentSnapshot.issuer.nif,
        ));
    if (isExpectedUnpairedLegacyCancellation) {
      unpairedLegacyCancellationIds.push(normalized.id);
    }
    if (
      hasInvalidIssuer &&
      !acceptsAttestedHistoricalCompleteness &&
      !isExpectedUnpairedLegacyCancellation
    ) {
      invalidIssuerIds.add(normalized.id);
    }
    if (
      normalized.type === "factura" &&
      (normalized.documentSnapshot?.source === "legacy_backfill" ||
        normalized.documentSnapshot?.source === "legacy_import_attested") &&
      !acceptsAttestedHistoricalCompleteness &&
      !isExpectedUnpairedLegacyCancellation
    ) {
      const compliance = validateDocumentEmission(
        normalized,
        {
          ...DEFAULT_PROFILE,
          ...normalized.documentSnapshot.issuer,
        },
        "factura",
      );
      if (!compliance.ok) {
        invalidCompliance.set(
          normalized.id,
          compliance.message ?? "Datos de emisión incompletos.",
        );
      }
    }
    if (
      normalized.snapshotIntegrity?.status === "blocked" &&
      !isExpectedUnpairedLegacyCancellation
    ) {
      rejectedIds.add(imported.id);
    }
  }
  if (invalidIssuerIds.size > 0) {
    throw new Error(
      `La importación contiene ${invalidIssuerIds.size} documento(s) emitido(s) sin todos los datos obligatorios del emisor o con un NIF no válido. No se aplicó ningún cambio; completa nombre fiscal, NIF, dirección, código postal y ciudad del negocio y vuelve a analizar el lote.`,
    );
  }
  if (invalidCompliance.size > 0) {
    const firstReason = invalidCompliance.values().next().value;
    throw new Error(
      `La importación contiene ${invalidCompliance.size} factura(s) que no cumplen los datos mínimos de emisión del cliente o de los conceptos. ${firstReason} No se aplicó ningún cambio; corrige el archivo de origen y vuelve a analizarlo.`,
    );
  }
  if (rejectedIds.size === 0) {
    return unpairedLegacyCancellationIds;
  }
  throw new Error(
    `La importación generó ${rejectedIds.size} documento(s) que no superan la validación de integridad posterior. No se aplicó ningún cambio; revisa el lote antes de volver a intentarlo.`,
  );
}

export async function reanalyzeImportAgainstCurrent<
  TData extends object,
  TResult,
>(input: {
  getCurrentData: () => TData;
  analyze: (current: TData) => Promise<TResult>;
}): Promise<TResult> {
  const analyzedData = input.getCurrentData();
  const result = await input.analyze(analyzedData);
  if (input.getCurrentData() !== analyzedData) {
    throw new Error(
      "Los datos cambiaron mientras se comprobaba la importación. No se aplicó ningún cambio; vuelve a analizar el archivo.",
    );
  }
  return result;
}
