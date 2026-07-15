import type {
  AdministrativeMoneyFact,
  AdministrativeMoneyKind,
} from "./administrative-domain";
import {
  explainFiscalNotificationDocumentV1,
  type FiscalNotificationDocumentExplanationV1,
} from "./structured-document-explanation.v1";
import { parseFiscalNotificationsWorkspaceForPersistenceV1 } from "./workspace-persistence.v1";
import type {
  AdministrativeDocumentType,
  ExternalReference,
  ExternalReferenceType,
  FieldEvidence,
  UnknownExtractedField,
} from "./types";

export interface FiscalNotificationStructuredHistoryMoneyV1 {
  readonly key: string;
  readonly label: string;
  readonly kind: AdministrativeMoneyKind;
  readonly amountCents: number;
  readonly currency: "EUR" | "UNKNOWN";
  readonly sourceReference: string | null;
  readonly sourceReferenceType: ExternalReferenceType | null;
}

export interface FiscalNotificationStructuredHistoryFactV1 {
  readonly label: string;
  readonly value: string;
}

export interface FiscalNotificationStructuredHistoryOrderedFactV1 {
  readonly key: string;
  readonly semantic:
    | "REFERENCE"
    | "MONEY"
    | "DATE"
    | "PARTY"
    | "STATUS"
    | "DETAIL"
    | "OBLIGATION"
    | "MASKED_VALUE";
  readonly label: string;
  readonly value: string;
  readonly pageNumber: number;
  readonly sourceReference: string | null;
}

export interface FiscalNotificationStructuredHistoryInstallmentComponentV1 {
  readonly label: string;
  readonly amountCents: number;
}

export interface FiscalNotificationStructuredHistoryInstallmentV1 {
  readonly key: string;
  readonly label: string;
  readonly amountCents: number | null;
  readonly dueDate: string | null;
  readonly components: readonly FiscalNotificationStructuredHistoryInstallmentComponentV1[];
}

export interface FiscalNotificationStructuredHistoryEntryV1 {
  readonly key: string;
  readonly documentType: AdministrativeDocumentType;
  readonly documentSubtype: string | null;
  readonly title: string;
  readonly authority: string;
  readonly documentDate: string | null;
  readonly documentDateBasis:
    | "Fecha de emision"
    | "Fecha de firma"
    | "Fecha del acto"
    | "Fecha de notificacion"
    | null;
  readonly createdAt: string;
  readonly pageCount: number;
  readonly byteLength: number;
  readonly subjectName: string | null;
  readonly subjectTaxId: string | null;
  readonly references: readonly FiscalNotificationStructuredHistoryFactV1[];
  readonly printedDates: readonly FiscalNotificationStructuredHistoryFactV1[];
  readonly orderedFacts: readonly FiscalNotificationStructuredHistoryOrderedFactV1[];
  readonly money: readonly FiscalNotificationStructuredHistoryMoneyV1[];
  readonly installments: readonly FiscalNotificationStructuredHistoryInstallmentV1[];
  readonly explanation: FiscalNotificationDocumentExplanationV1;
  readonly authenticityLabel: "Autenticidad no comprobada";
  readonly reviewLabel: "Datos extraídos · revisa antes de actuar";
  readonly sourceContentRetention: "NOT_RETAINED";
  readonly originalArchive: Readonly<{
    status: "ARCHIVED_VERIFIED";
    driveFileId: string;
    sourceSha256: string;
    documentIds: readonly string[];
    archivedAt: string;
  }> | null;
}

export type FiscalNotificationStructuredHistoryViewModelV1 =
  | {
      readonly status: "READY";
      readonly entries: readonly FiscalNotificationStructuredHistoryEntryV1[];
    }
  | {
      readonly status: "BLOCKED";
      readonly entries: readonly FiscalNotificationStructuredHistoryEntryV1[];
    };

const MONEY_LABELS: Readonly<Record<AdministrativeMoneyKind, string>> = {
  ORIGINAL_TAX_PRINCIPAL: "Principal tributario impreso",
  OUTSTANDING_PRINCIPAL: "Principal pendiente impreso",
  PROPOSED_QUOTA: "Cuota propuesta impresa",
  FINAL_QUOTA: "Cuota definitiva impresa",
  DEFERRAL_INTEREST: "Interés de aplazamiento impreso",
  LATE_PAYMENT_INTEREST: "Interés de demora impreso",
  EXECUTIVE_SURCHARGE_5: "Recargo ejecutivo del 5 % impreso",
  EXECUTIVE_SURCHARGE_10: "Recargo reducido del 10 % impreso",
  EXECUTIVE_SURCHARGE_20: "Recargo ordinario del 20 % impreso",
  SANCTION_INITIAL: "Sanción inicial impresa",
  SANCTION_REDUCTION: "Reducción de sanción impresa",
  SANCTION_REDUCED: "Sanción reducida impresa",
  COSTS: "Costas impresas",
  REFUND_CREDIT: "Crédito a devolver impreso",
  CREDIT_TOTAL: "Total del crédito impreso",
  OFFSET_APPLIED: "Compensación aplicada impresa",
  EXECUTIVE_SURCHARGE_PRINTED: "Recargo ejecutivo impreso",
  TOTAL_BEFORE_OFFSET: "Total antes de compensar impreso",
  REMAINING_AFTER_OFFSET: "Pendiente tras compensar impreso",
  NET_REFUND_PAYMENT: "Devolución neta impresa",
  SEIZED_AMOUNT: "Importe embargado impreso",
  RETAINED_AMOUNT: "Importe retenido impreso",
  REMITTED_AMOUNT: "Importe remitido impreso",
  PAYMENT_ON_ACCOUNT: "Ingreso a cuenta impreso",
  DOCUMENT_TOTAL: "Importe total impreso",
  PAYMENT_CONFIRMED: "Pago confirmado impreso",
};

const REFERENCE_LABELS: Readonly<Record<string, string>> = {
  DOCUMENT_REFERENCE: "Referencia del documento",
  EXPEDIENT_NUMBER: "Número de expediente",
  LIQUIDATION_KEY: "Clave de liquidación",
  DEBT_KEY: "Clave de deuda",
  PROCEDURE_NUMBER: "Número de procedimiento",
  PAYMENT_JUSTIFICANTE: "Número de justificante",
  CSV: "Código Seguro de Verificación (CSV)",
  NRC: "NRC",
  TAX_MODEL: "Modelo tributario",
  TAX_EXERCISE: "Ejercicio fiscal",
  TAX_PERIOD: "Periodo fiscal",
  PAYMENT_MODEL: "Modelo de pago",
  VTO_RAW: "Referencia Vto.",
  NOTIFICATION_ID: "Identificador de notificación",
  REQUEST_NUMBER: "Número de requerimiento",
};

const DATE_LABELS: Readonly<Record<string, string>> = {
  PRINTED_ISSUE_DATE: "Fecha de emisión impresa",
  PRINTED_SIGNATURE_DATE: "Fecha de firma impresa",
  PRINTED_VOLUNTARY_PERIOD_END_DATE: "Fin del período voluntario impreso",
  PRINTED_PAYMENT_ACCOUNT: "Cuenta de pago impresa",
  PRINTED_DEBT_CONCEPT: "Concepto impreso",
  PRINTED_INTEREST_START_DATE: "Fecha de intereses impresa",
  PRINTED_LISTED_DEBT_AMOUNT: "Importe de deuda impreso",
  PRINTED_OFFSET_REQUEST_DATE: "Fecha de solicitud impresa",
  PRINTED_OFFSET_CREDIT_DESCRIPTION: "Descripción del crédito",
  PRINTED_OFFSET_CREDIT_RECOGNITION_DATE: "Fecha de reconocimiento del crédito",
  PRINTED_OFFSET_DEBT_DESCRIPTION: "Descripción de la deuda",
  PRINTED_OFFSET_EFFECT_DATE: "Fecha de efectos impresa",
  PRINTED_OFFSET_EFFECT_CODE: "Código de efecto impreso",
  OFFSET_EFFECT_MEANING: "Efecto indicado en el documento",
};

const COMPONENT_LABELS: Readonly<Record<string, string>> = {
  PRINCIPAL: "Principal impreso",
  INTEREST: "Intereses impresos",
  EXECUTIVE_SURCHARGE_5: "Recargo ejecutivo impreso",
  REDUCED_SURCHARGE_10: "Recargo reducido impreso",
  ORDINARY_SURCHARGE_20: "Recargo ordinario impreso",
  PENALTY: "Sanción impresa",
  COSTS: "Costas impresas",
  PAYMENT_ON_ACCOUNT: "Ingreso a cuenta impreso",
  TOTAL_DEBT: "Deuda total impresa",
  AMOUNT_TO_PAY: "Importe de cuota impreso",
  OTHER: "Recargo impreso",
};

export function projectFiscalNotificationStructuredHistoryV1(
  value: unknown,
  ownerScope: string,
): FiscalNotificationStructuredHistoryViewModelV1 {
  if (value === undefined || value === null) {
    return Object.freeze({ status: "READY", entries: Object.freeze([]) });
  }
  const workspace = parseFiscalNotificationsWorkspaceForPersistenceV1(
    value,
    ownerScope,
  );
  if (!workspace) {
    return Object.freeze({ status: "BLOCKED", entries: Object.freeze([]) });
  }

  const authorities = new Map(
    workspace.authorities.map((item) => [item.id, item]),
  );
  const files = new Map(workspace.files.map((item) => [item.id, item]));
  const references = new Map(
    workspace.references.map((item) => [item.id, item]),
  );
  const evidence = new Map(workspace.evidence.map((item) => [item.id, item]));
  const evidenceOrder = new Map(
    workspace.evidence.map((item, index) => [item.id, index]),
  );
  const snapshots = new Map(
    workspace.analysisSnapshots.map((item) => [item.id, item]),
  );
  const paymentOptions = new Map(
    workspace.paymentOptions.map((item) => [item.id, item]),
  );
  const driveArchiveByDocumentId = new Map(
    (workspace.driveArchives ?? []).flatMap((archive) =>
      archive.documentIds.map(
        (documentId) =>
          [
            documentId,
            Object.freeze({
              status: archive.archiveStatus,
              driveFileId: archive.driveFileId,
              sourceSha256: archive.sourceSha256,
              documentIds: Object.freeze([...archive.documentIds]),
              archivedAt: archive.archivedAt,
            }),
          ] as const,
      ),
    ),
  );

  const entries = workspace.documents
    .map((document): FiscalNotificationStructuredHistoryEntryV1 | null => {
      const authority = authorities.get(document.authorityId);
      const file = files.get(document.fileId);
      const snapshotId = document.analysisSnapshotIds.at(-1);
      const snapshot = snapshotId ? snapshots.get(snapshotId) : undefined;
      if (!authority || !file || !snapshot) return null;

      const domain = snapshot.structuredData.administrativeDomain;
      const verticalFieldsByEvidence = new Map(
        snapshot.structuredData.unknownFields.flatMap((field) => {
          const metadata = parseVerticalFieldLabel(field.labelRaw);
          return metadata && field.evidenceId
            ? [[field.evidenceId, metadata] as const]
            : [];
        }),
      );
      const money = (domain?.moneyFacts ?? []).map((fact) =>
        {
          const sourceReference = fact.sourceActRefId
            ? references.get(fact.sourceActRefId)
            : undefined;
          return Object.freeze({
            key: fact.id,
            label:
              fact.evidenceIds
                .map((id) => verticalFieldsByEvidence.get(id))
                .find((metadata) => metadata?.semantic === "MONEY")?.label ??
              MONEY_LABELS[fact.kind],
            kind: fact.kind,
            amountCents: fact.amountCents,
            currency: fact.currency,
            sourceReference: sourceReference?.rawValue ?? null,
            sourceReferenceType: sourceReference?.referenceType ?? null,
          });
        },
      );
      const documentReferences = deduplicateFacts(document.referenceIds
        .map((id) => references.get(id))
        .filter((item) => item !== undefined)
        .map((item) =>
          Object.freeze({
            label:
              item.occurrenceIds
                .map((id) => verticalFieldsByEvidence.get(id))
                .find((metadata) => metadata?.semantic === "REFERENCE")
                ?.label ??
              REFERENCE_LABELS[item.referenceType] ??
              "Referencia impresa",
            value: item.rawValue,
          }),
        ));
      const explanationFacts = snapshot.structuredData.unknownFields.flatMap(
        (field) => {
          const metadata = parseVerticalFieldLabel(field.labelRaw);
          if (
            metadata?.semantic === "MONEY" ||
            metadata?.semantic === "REFERENCE"
          ) {
            return [];
          }
          return [
            Object.freeze({
              label:
                metadata?.label ??
                DATE_LABELS[field.labelRaw] ??
                "Dato impreso",
              value: field.valueRaw,
            }),
          ];
        },
      );
      const printedDates = deduplicateFacts(explanationFacts);
      const installments = snapshot.structuredData.paymentOptionIds
        .map((id) => paymentOptions.get(id))
        .filter((item) => item !== undefined)
        .map((item) =>
          Object.freeze({
            key: item.id,
            label: item.title,
            amountCents: item.totalCents ?? null,
            dueDate: item.deadline ?? null,
            components: Object.freeze(
              item.components.map((component) =>
                Object.freeze({
                  label:
                    COMPONENT_LABELS[component.type] ?? "Componente impreso",
                  amountCents: component.amountCents,
                }),
              ),
            ),
          }),
        );

      const selectedDocumentDate = selectExplicitDocumentDate({
        documentIssueDate: document.issueDate,
        documentSignatureDate: document.signatureDate,
        documentEffectiveNotificationDate:
          document.notificationDates.effectiveAt?.slice(0, 10) ??
          document.notificationDates.accessedAt?.slice(0, 10),
        snapshotIssueDate: snapshot.structuredData.documentFields.issueDate,
        snapshotEffectiveNotificationDate:
          snapshot.structuredData.documentFields.effectiveNotificationDate,
        unknownFields: snapshot.structuredData.unknownFields,
      });
      const documentDate = selectedDocumentDate?.value ?? null;
      const receiptDate =
        normalizeCalendarDate(document.notificationDates.accessedAt?.slice(0, 10)) ??
        normalizeCalendarDate(document.notificationDates.effectiveAt?.slice(0, 10));
      const orderedFacts = projectOrderedFacts({
        references: document.referenceIds
          .map((id) => references.get(id))
          .filter((item) => item !== undefined),
        moneyFacts: domain?.moneyFacts ?? [],
        unknownFields: snapshot.structuredData.unknownFields,
        referencesById: references,
        evidenceById: evidence,
        evidenceOrder,
      });
      const explanation = explainFiscalNotificationDocumentV1({
        documentType: document.documentType,
        documentSubtype: document.documentSubtype ?? null,
        documentDate,
        receiptDate,
        facts: explanationFacts,
        money,
      });

      return Object.freeze({
        key: document.id,
        documentType: document.documentType,
        documentSubtype: document.documentSubtype ?? null,
        title: document.titleRaw,
        authority: authority.nameRaw,
        documentDate,
        documentDateBasis: selectedDocumentDate?.basis ?? null,
        createdAt: document.createdAt,
        pageCount: file.pageCount,
        byteLength: file.fileSize,
        subjectName: document.subjectParty?.displayName ?? null,
        subjectTaxId: document.subjectParty?.taxIdNormalized ?? null,
        references: Object.freeze(documentReferences),
        printedDates: Object.freeze(printedDates),
        orderedFacts,
        money: Object.freeze(money),
        installments: Object.freeze(installments),
        explanation,
        authenticityLabel: "Autenticidad no comprobada" as const,
        reviewLabel: "Datos extraídos · revisa antes de actuar" as const,
        sourceContentRetention: "NOT_RETAINED" as const,
        originalArchive: driveArchiveByDocumentId.get(document.id) ?? null,
      });
    })
    .filter((entry) => entry !== null)
    .sort(
      (left, right) =>
        chronologyKey(right).localeCompare(chronologyKey(left)) ||
        left.key.localeCompare(right.key),
    );

  return Object.freeze({
    status: "READY",
    entries: Object.freeze(entries),
  });
}

function deduplicateFacts<T extends FiscalNotificationStructuredHistoryFactV1>(
  facts: readonly T[],
): readonly T[] {
  const unique = new Map<string, T>();
  for (const fact of facts) {
    const key = `${fact.label}\u0000${fact.value}`;
    if (!unique.has(key)) unique.set(key, fact);
  }
  return Object.freeze([...unique.values()]);
}

interface ExplicitDocumentDateInputV1 {
  readonly documentIssueDate?: string;
  readonly documentSignatureDate?: string;
  readonly documentEffectiveNotificationDate?: string;
  readonly snapshotIssueDate?: string;
  readonly snapshotEffectiveNotificationDate?: string;
  readonly unknownFields: readonly {
    readonly labelRaw: string;
    readonly valueRaw: string;
    readonly confidence: string;
  }[];
}

interface SelectedDocumentDateV1 {
  readonly value: string;
  readonly basis:
    | "Fecha de emision"
    | "Fecha de firma"
    | "Fecha del acto"
    | "Fecha de notificacion";
}

function selectExplicitDocumentDate(
  input: ExplicitDocumentDateInputV1,
): SelectedDocumentDateV1 | null {
  for (const value of [input.documentIssueDate, input.snapshotIssueDate]) {
    const normalized = normalizeCalendarDate(value);
    if (normalized) {
      return Object.freeze({ value: normalized, basis: "Fecha de emision" });
    }
  }
  const normalizedSignature = normalizeCalendarDate(
    input.documentSignatureDate,
  );
  if (normalizedSignature) {
    return Object.freeze({
      value: normalizedSignature,
      basis: "Fecha de firma",
    });
  }

  const datedFields = input.unknownFields.filter(
    (field) => field.confidence === "EXACT",
  );
  for (const [preferredKind, basis] of [
    ["ISSUE_DATE", "Fecha de emision"],
    ["SIGNATURE_DATE", "Fecha de firma"],
    ["ACTION_DATE", "Fecha del acto"],
  ] as const) {
    const field = datedFields.find((candidate) => {
      const metadata = parseVerticalFieldLabel(candidate.labelRaw);
      if (metadata?.semantic === "DATE") {
        return metadata.canonicalType === preferredKind;
      }
      return candidate.labelRaw === `PRINTED_${preferredKind}`;
    });
    const normalized = normalizeCalendarDate(field?.valueRaw);
    if (normalized) return Object.freeze({ value: normalized, basis });
  }

  for (const value of [
    input.snapshotEffectiveNotificationDate,
    input.documentEffectiveNotificationDate,
  ]) {
    const normalized = normalizeCalendarDate(value);
    if (normalized) {
      return Object.freeze({
        value: normalized,
        basis: "Fecha de notificacion",
      });
    }
  }
  const notificationField = datedFields.find((candidate) => {
    const metadata = parseVerticalFieldLabel(candidate.labelRaw);
    return (
      metadata?.semantic === "DATE" &&
      metadata.canonicalType === "EFFECTIVE_NOTIFICATION_DATE"
    );
  });
  const notificationDate = normalizeCalendarDate(notificationField?.valueRaw);
  if (notificationDate) {
    return Object.freeze({
      value: notificationDate,
      basis: "Fecha de notificacion",
    });
  }

  return null;
}

function projectOrderedFacts(input: {
  readonly references: readonly ExternalReference[];
  readonly moneyFacts: readonly AdministrativeMoneyFact[];
  readonly unknownFields: readonly UnknownExtractedField[];
  readonly referencesById: ReadonlyMap<string, ExternalReference>;
  readonly evidenceById: ReadonlyMap<string, FieldEvidence>;
  readonly evidenceOrder: ReadonlyMap<string, number>;
}): readonly FiscalNotificationStructuredHistoryOrderedFactV1[] {
  const candidates: Array<
    FiscalNotificationStructuredHistoryOrderedFactV1 & { readonly order: number }
  > = [];
  const firstEvidence = (ids: readonly string[]): FieldEvidence | undefined =>
    ids.map((id) => input.evidenceById.get(id)).find((item) => item !== undefined);
  const firstOrder = (ids: readonly string[]): number =>
    Math.min(
      ...ids.map((id) => input.evidenceOrder.get(id) ?? Number.MAX_SAFE_INTEGER),
    );
  const verticalMetadataByEvidence = new Map(
    input.unknownFields.flatMap((field) => {
      const metadata = parseVerticalFieldLabel(field.labelRaw);
      return metadata && field.evidenceId
        ? [[field.evidenceId, metadata] as const]
        : [];
    }),
  );
  const verticalFieldByEvidence = new Map(
    input.unknownFields.flatMap((field) =>
      field.evidenceId ? [[field.evidenceId, field] as const] : [],
    ),
  );

  for (const reference of input.references) {
    const source = firstEvidence(reference.occurrenceIds);
    if (!source) continue;
    candidates.push({
      key: reference.id,
      semantic: "REFERENCE",
      label:
        reference.occurrenceIds
          .map((id) => verticalMetadataByEvidence.get(id))
          .find((metadata) => metadata?.semantic === "REFERENCE")?.label ??
        REFERENCE_LABELS[reference.referenceType] ??
        "Referencia impresa",
      value: reference.rawValue,
      pageNumber: source.pageNumber,
      sourceReference: null,
      order: firstOrder(reference.occurrenceIds),
    });
  }

  for (const fact of input.moneyFacts) {
    const source = firstEvidence(fact.evidenceIds);
    if (!source) continue;
    const sourceField = fact.evidenceIds
      .map((id) => verticalFieldByEvidence.get(id))
      .find((field) => parseVerticalFieldLabel(field?.labelRaw ?? "")?.semantic === "MONEY");
    const sourceReference = fact.sourceActRefId
      ? input.referencesById.get(fact.sourceActRefId)?.rawValue ?? null
      : null;
    candidates.push({
      key: fact.id,
      semantic: "MONEY",
      label:
        fact.evidenceIds
          .map((id) => verticalMetadataByEvidence.get(id))
          .find((metadata) => metadata?.semantic === "MONEY")?.label ??
        MONEY_LABELS[fact.kind],
      value:
        sourceField?.valueRaw ??
        formatOrderedMoney(fact.amountCents, fact.currency),
      pageNumber: source.pageNumber,
      sourceReference,
      order: firstOrder(fact.evidenceIds),
    });
  }

  input.unknownFields.forEach((fact, index) => {
    const metadata = parseVerticalFieldLabel(fact.labelRaw);
    if (
      metadata?.semantic === "MONEY" ||
      metadata?.semantic === "REFERENCE"
    ) {
      return;
    }
    const sourceOrder = fact.evidenceId
      ? input.evidenceOrder.get(fact.evidenceId) ?? Number.MAX_SAFE_INTEGER
      : Number.MAX_SAFE_INTEGER - input.unknownFields.length + index;
    candidates.push({
      key: fact.evidenceId ?? `printed:${fact.page}:${index}`,
      semantic: orderedSemantic(metadata?.semantic, fact.labelRaw),
      label: metadata?.label ?? DATE_LABELS[fact.labelRaw] ?? "Dato impreso",
      value: fact.valueRaw,
      pageNumber: fact.page,
      sourceReference: null,
      order: sourceOrder,
    });
  });

  const unique = new Map<string, (typeof candidates)[number]>();
  candidates
    .sort(
      (left, right) =>
        left.pageNumber - right.pageNumber ||
        left.order - right.order ||
        left.key.localeCompare(right.key),
    )
    .forEach((fact) => {
      const key = `${fact.pageNumber}\u0000${fact.label}\u0000${fact.value}`;
      if (!unique.has(key)) unique.set(key, fact);
    });
  return Object.freeze(
    [...unique.values()].map((fact) =>
      Object.freeze({
        key: fact.key,
        semantic: fact.semantic,
        label: fact.label,
        value: fact.value,
        pageNumber: fact.pageNumber,
        sourceReference: fact.sourceReference,
      }),
    ),
  );
}

function orderedSemantic(
  semantic: string | undefined,
  legacyLabel: string,
): FiscalNotificationStructuredHistoryOrderedFactV1["semantic"] {
  if (
    semantic === "REFERENCE" ||
    semantic === "MONEY" ||
    semantic === "DATE" ||
    semantic === "PARTY" ||
    semantic === "STATUS" ||
    semantic === "DETAIL" ||
    semantic === "OBLIGATION" ||
    semantic === "MASKED_VALUE"
  ) {
    return semantic;
  }
  return legacyLabel.includes("DATE") ? "DATE" : "DETAIL";
}

function formatOrderedMoney(
  amountCents: number,
  currency: "EUR" | "UNKNOWN",
): string {
  const absoluteCents = Math.abs(amountCents);
  const whole = Math.floor(absoluteCents / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const decimals = String(absoluteCents % 100).padStart(2, "0");
  const amount = `${amountCents < 0 ? "-" : ""}${whole},${decimals}`;
  return currency === "EUR" ? `${amount} €` : `${amount} · moneda no indicada`;
}

function normalizeCalendarDate(value: string | undefined): string | null {
  if (!value) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (iso) return isValidCalendarDate(...toDateParts(iso)) ? value : null;

  const spanish = /^(\d{2})([-/])(\d{2})\2(\d{4})$/.exec(value);
  if (!spanish) return null;
  const normalized = `${spanish[4]}-${spanish[3]}-${spanish[1]}`;
  return isValidCalendarDate(
    Number(spanish[4]),
    Number(spanish[3]),
    Number(spanish[1]),
  )
    ? normalized
    : null;
}

function toDateParts(match: RegExpExecArray): [number, number, number] {
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function isValidCalendarDate(
  year: number,
  month: number,
  day: number,
): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const value = new Date(Date.UTC(year, month - 1, day));
  return (
    value.getUTCFullYear() === year &&
    value.getUTCMonth() === month - 1 &&
    value.getUTCDate() === day
  );
}

function chronologyKey(
  entry: FiscalNotificationStructuredHistoryEntryV1,
): string {
  return entry.documentDate ? `${entry.documentDate}T00:00:00.000Z` : "";
}

interface PersistedVerticalFieldLabelV1 {
  readonly semantic: string;
  readonly canonicalType: string;
  readonly label: string;
}

function parseVerticalFieldLabel(
  value: string,
): PersistedVerticalFieldLabelV1 | null {
  const parts = value.split("|");
  if (parts.length < 4 || parts[0] !== "VSR1") return null;
  const semantic = parts[1];
  const canonicalType = parts[2];
  const label = parts.slice(3).join("|");
  if (!semantic || !canonicalType || !label) return null;
  return Object.freeze({ semantic, canonicalType, label });
}
