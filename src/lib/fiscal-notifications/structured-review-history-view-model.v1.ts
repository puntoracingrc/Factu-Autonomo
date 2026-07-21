import type {
  AdministrativeMoneyFact,
  AdministrativeMoneyKind,
} from "./administrative-domain";
import type { FiscalNotificationAmountReconciliationV1 } from "./amount-reconciliation-contract.v1";
import type { FiscalNotificationMathematicalIntegrityV11 } from "./mathematical-integrity-contract.v11";
import {
  explainFiscalNotificationDocumentV1,
  type FiscalNotificationDocumentExplanationV1,
} from "./structured-document-explanation.v1";
import {
  explainFiscalNotificationDocumentV2,
  type FiscalNotificationDocumentEvidenceInputV2,
  type FiscalNotificationDocumentExplanationInputV2,
  type FiscalNotificationDocumentExplanationV2,
  type FiscalNotificationExplanationDateInputV2,
  type FiscalNotificationExplanationFactInputV2,
  type FiscalNotificationExplanationMoneyInputV2,
  type FiscalNotificationExplanationReferenceInputV2,
  type FiscalNotificationExplanationRoleInputV2,
  type FiscalNotificationPrintedEffectCodeV2,
  type FiscalNotificationPrintedEffectInputV2,
  resolveAllowedPrintedEffectCodesV2,
  resolveIntrinsicPrintedEffectCodeV2,
} from "./structured-document-explanation.v2";
import { AEAT_DOCUMENT_PROFILE_IDS_V1 } from "./knowledge/aeat-document-knowledge.v1";
import { isAeatOfficialCatalogProfileIdV9 } from "./knowledge/official-catalog-expansion.v9";
import { explainAeatOfficialCatalogDocumentV9 } from "./official-catalog-explanation.v9";
import { isAeatP0DeepProfileIdV10 } from "./knowledge/p0-deep-contracts.v10";
import { explainAeatP0DeepDocumentV10 } from "./p0-deep-explanation.v10";
import { parseFiscalNotificationsWorkspaceForPersistenceV1 } from "./workspace-persistence.v1";
import { isInternalFiscalNotificationFieldArtifact } from "./document-fact-observation.v1";
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
  readonly pageNumbers: readonly number[];
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
  readonly pageNumbers: readonly number[];
}

export interface FiscalNotificationStructuredHistoryInstallmentV1 {
  readonly key: string;
  readonly label: string;
  readonly amountCents: number | null;
  readonly dueDate: string | null;
  readonly dueDatePageNumbers: readonly number[];
  readonly totalPageNumbers: readonly number[];
  readonly components: readonly FiscalNotificationStructuredHistoryInstallmentComponentV1[];
  readonly pageNumbers: readonly number[];
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
  readonly amountReconciliation?: FiscalNotificationAmountReconciliationV1 | null;
  readonly mathematicalIntegrity?: FiscalNotificationMathematicalIntegrityV11 | null;
  readonly explanation: FiscalNotificationDocumentExplanationV1;
  readonly authenticityLabel: "Autenticidad no comprobada";
  readonly reviewStatus: "PENDING" | "REVIEWED";
  readonly reviewLabel:
    "Datos extraídos · revisa antes de actuar" | "Revisión completada";
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
  ORIGINAL_TAX_PRINCIPAL: "Principal tributario",
  OUTSTANDING_PRINCIPAL: "Principal pendiente",
  PROPOSED_QUOTA: "Cuota propuesta",
  FINAL_QUOTA: "Cuota definitiva",
  DEFERRAL_INTEREST: "Interés de aplazamiento",
  LATE_PAYMENT_INTEREST: "Interés de demora",
  EXECUTIVE_SURCHARGE_5: "Recargo ejecutivo del 5 %",
  EXECUTIVE_SURCHARGE_10: "Recargo reducido del 10 %",
  EXECUTIVE_SURCHARGE_20: "Recargo ordinario del 20 %",
  SANCTION_INITIAL: "Sanción inicial",
  SANCTION_REDUCTION: "Reducción de sanción",
  SANCTION_REDUCED: "Sanción reducida",
  COSTS: "Costas",
  REFUND_CREDIT: "Crédito a devolver",
  CREDIT_TOTAL: "Total del crédito",
  OFFSET_APPLIED: "Compensación aplicada",
  EXECUTIVE_SURCHARGE_PRINTED: "Recargo ejecutivo",
  TOTAL_BEFORE_OFFSET: "Total antes de compensar",
  REMAINING_AFTER_OFFSET: "Pendiente tras compensar",
  NET_REFUND_PAYMENT: "Devolución neta",
  SEIZED_AMOUNT: "Importe embargado",
  RETAINED_AMOUNT: "Importe retenido",
  REMITTED_AMOUNT: "Importe remitido",
  PAYMENT_ON_ACCOUNT: "Ingreso a cuenta",
  DOCUMENT_TOTAL: "Importe total",
  PAYMENT_CONFIRMED: "Pago confirmado",
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
  REFUND_REFERENCE: "Referencia de devolución",
};

const SENSITIVE_EXTERNAL_REFERENCE_TYPES = new Set<ExternalReferenceType>([
  "CSV",
  "NRC",
]);
const SENSITIVE_PROFILE_REFERENCE_FIELD_ID =
  /^profile:reference:(CSV|NRC|BANK_REFERENCE):\d+$/u;

function visibleStoredReference(
  reference: ExternalReference,
  metadataByEvidence: ReadonlyMap<string, PersistedVerticalFieldLabelV1>,
): string {
  if (
    SENSITIVE_EXTERNAL_REFERENCE_TYPES.has(reference.referenceType) ||
    reference.occurrenceIds.some((evidenceId) => {
      const fieldId = metadataByEvidence.get(evidenceId)?.fieldId;
      return fieldId
        ? SENSITIVE_PROFILE_REFERENCE_FIELD_ID.test(fieldId)
        : false;
    })
  ) {
    return "Referencia protegida";
  }
  return reference.rawValue;
}

function isProfileControlField(fieldId: string | null): boolean {
  return (
    fieldId === "profile:recognition:document-type:0" ||
    (fieldId !== null && /^profile:effect:[A-Z0-9_]+:\d+$/u.test(fieldId))
  );
}

const DATE_LABELS: Readonly<Record<string, string>> = {
  PRINTED_ISSUE_DATE: "Fecha de emisión",
  PRINTED_SIGNATURE_DATE: "Fecha de firma",
  PRINTED_VOLUNTARY_PERIOD_END_DATE: "Fin del período voluntario",
  PRINTED_PAYMENT_ACCOUNT: "Cuenta de pago",
  PRINTED_DEBT_CONCEPT: "Concepto",
  PRINTED_INTEREST_START_DATE: "Fecha de intereses",
  PRINTED_LISTED_DEBT_AMOUNT: "Importe de deuda",
  PRINTED_OFFSET_REQUEST_DATE: "Fecha de solicitud",
  PRINTED_OFFSET_CREDIT_DESCRIPTION: "Descripción del crédito",
  PRINTED_OFFSET_CREDIT_RECOGNITION_DATE: "Fecha de reconocimiento del crédito",
  PRINTED_OFFSET_DEBT_DESCRIPTION: "Descripción de la deuda",
  PRINTED_OFFSET_EFFECT_DATE: "Fecha de efectos",
  PRINTED_OFFSET_EFFECT_CODE: "Código de efecto",
  OFFSET_EFFECT_MEANING: "Efecto indicado en el documento",
};

const COMPONENT_LABELS: Readonly<Record<string, string>> = {
  PRINCIPAL: "Principal",
  INTEREST: "Intereses",
  EXECUTIVE_SURCHARGE_5: "Recargo ejecutivo",
  REDUCED_SURCHARGE_10: "Recargo reducido",
  ORDINARY_SURCHARGE_20: "Recargo ordinario",
  PENALTY: "Sanción",
  COSTS: "Costas",
  PAYMENT_ON_ACCOUNT: "Ingreso a cuenta",
  TOTAL_DEBT: "Deuda total",
  AMOUNT_TO_PAY: "Importe de cuota",
  OTHER: "Recargo",
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
      const observedUnknownFields = observedUnknownFieldsWithPageProvenance({
        fields: snapshot.structuredData.unknownFields,
        evidenceById: evidence,
        ownerScope,
        documentId: document.id,
      });
      const interpretedExplanationFields = unknownFieldsWithPageProvenance(
        {
          fields: snapshot.structuredData.unknownFields.filter(
            (field) => field.labelRaw === "OFFSET_EFFECT_MEANING",
          ),
          evidenceById: evidence,
          ownerScope,
          documentId: document.id,
        },
        "INFERRED",
      );

      const domain = snapshot.structuredData.administrativeDomain;
      const verticalFieldsByEvidence = new Map(
        observedUnknownFields.flatMap((field) => {
          const metadata = parseVerticalFieldLabel(field.labelRaw);
          return metadata && field.evidenceId
            ? [[field.evidenceId, metadata] as const]
            : [];
        }),
      );
      const money = deduplicateHistoryMoney(
        (domain?.moneyFacts ?? []).map((fact) => {
          const sourceReference = fact.sourceActRefId
            ? references.get(fact.sourceActRefId)
            : undefined;
          const protectedSourceReference = sourceReference
            ? visibleStoredReference(sourceReference, verticalFieldsByEvidence)
            : null;
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
            sourceReference: protectedSourceReference,
            sourceReferenceType: sourceReference?.referenceType ?? null,
            pageNumbers: Object.freeze(
              [
                ...new Set(
                  fact.evidenceIds.flatMap((id) => {
                    const source = evidence.get(id);
                    return source ? [source.pageNumber] : [];
                  }),
                ),
              ].sort((left, right) => left - right),
            ),
          });
        }),
      );
      const documentReferences = deduplicateKnownSemanticDuplicates(
        document.referenceIds
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
                "Referencia",
              value: visibleStoredReference(item, verticalFieldsByEvidence),
            }),
          ),
      );
      const explanationFacts = [
        ...observedUnknownFields,
        ...interpretedExplanationFields,
      ].flatMap((field) => {
        const metadata = parseVerticalFieldLabel(field.labelRaw);
        if (
          metadata?.semantic === "MONEY" ||
          metadata?.semantic === "REFERENCE" ||
          /^real-corpus-v[3-7]:installment:\d+$/u.test(
            metadata?.fieldId ?? "",
          ) ||
          field.valueRaw === "Consta en el documento" ||
          isProfileControlField(metadata?.fieldId ?? null) ||
          isInternalFiscalNotificationFieldArtifact({
            fieldId: metadata?.fieldId ?? null,
            label: metadata?.label ?? field.labelRaw,
            value: field.valueRaw,
            semantic: metadata?.semantic ?? null,
            canonicalType: metadata?.canonicalType ?? null,
          })
        ) {
          return [];
        }
        return [
          Object.freeze({
            label: observedFieldLabel(field.labelRaw, metadata?.label, "Dato"),
            value: field.valueRaw,
          }),
        ];
      });
      const printedDates = deduplicateKnownSemanticDuplicates(
        observedUnknownFields.flatMap((field) => {
          const metadata = parseVerticalFieldLabel(field.labelRaw);
          const legacyDateLabel = legacyDateFieldLabel(field.labelRaw);
          if (
            (metadata?.semantic !== "DATE" && !legacyDateLabel) ||
            isInternalFiscalNotificationFieldArtifact({
              fieldId: metadata?.fieldId ?? null,
              label: metadata?.label ?? legacyDateLabel ?? field.labelRaw,
              value: field.valueRaw,
              semantic: metadata?.semantic ?? "DATE",
              canonicalType: metadata?.canonicalType ?? field.labelRaw,
            })
          ) {
            return [];
          }
          return [
            Object.freeze({
              label: metadata?.label ?? legacyDateLabel ?? "Fecha",
              value: field.valueRaw,
            }),
          ];
        }),
      );
      const paymentOptionInstallments = snapshot.structuredData.paymentOptionIds
        .map((id) => paymentOptions.get(id))
        .filter((item) => item !== undefined)
        .map((item) => {
          const dateEvidenceIds = item.evidenceIds.filter((id) =>
            evidenceContainsCalendarDate(
              evidence.get(id),
              verticalFieldsByEvidence.get(id),
            ),
          );
          const dueDateEvidenceIds = item.deadline
            ? dateEvidenceIds.filter((id) =>
                evidenceSupportsDeadline(evidence.get(id), item.deadline!),
              )
            : [];
          const dateEvidenceSet = new Set(dateEvidenceIds);
          const componentEvidenceIds = item.components.flatMap(
            (component) => component.evidenceIds,
          );
          const totalEvidenceIds =
            item.totalCents === undefined
              ? []
              : [
                  ...componentEvidenceIds,
                  ...item.evidenceIds.filter((id) => !dateEvidenceSet.has(id)),
                ];
          return Object.freeze({
            key: item.id,
            label: item.title,
            amountCents: item.totalCents ?? null,
            dueDate: item.deadline ?? null,
            dueDatePageNumbers: evidencePageNumbers(
              dueDateEvidenceIds,
              evidence,
            ),
            totalPageNumbers: evidencePageNumbers(totalEvidenceIds, evidence),
            components: Object.freeze(
              item.components.map((component) =>
                Object.freeze({
                  label: COMPONENT_LABELS[component.type] ?? "Componente",
                  amountCents: component.amountCents,
                  pageNumbers: evidencePageNumbers(
                    component.evidenceIds,
                    evidence,
                  ),
                }),
              ),
            ),
            pageNumbers: evidencePageNumbers(
              [...item.evidenceIds, ...componentEvidenceIds],
              evidence,
            ),
          });
        });
      const installments =
        paymentOptionInstallments.length > 0
          ? paymentOptionInstallments
          : (snapshot.structuredData.amountReconciliation?.installments.map(
              (installment) =>
                Object.freeze({
                  key: `reconciled-installment:${document.id}:${installment.sequence}`,
                  label: `Cuota ${installment.sequence}`,
                  amountCents: installment.totalCents,
                  dueDate: installment.dueDate,
                  dueDatePageNumbers: Object.freeze([
                    ...installment.sourcePageNumbers,
                  ]),
                  totalPageNumbers: Object.freeze([
                    ...installment.sourcePageNumbers,
                  ]),
                  components: Object.freeze([
                    Object.freeze({
                      label: "Principal",
                      amountCents: installment.principalCents,
                      pageNumbers: Object.freeze([
                        ...installment.sourcePageNumbers,
                      ]),
                    }),
                    Object.freeze({
                      label: "Intereses",
                      amountCents: installment.interestCents,
                      pageNumbers: Object.freeze([
                        ...installment.sourcePageNumbers,
                      ]),
                    }),
                    Object.freeze({
                      label: "Recargo",
                      amountCents: installment.surchargeCents,
                      pageNumbers: Object.freeze([
                        ...installment.sourcePageNumbers,
                      ]),
                    }),
                  ]),
                  pageNumbers: Object.freeze([
                    ...installment.sourcePageNumbers,
                  ]),
                }),
            ) ?? []);

      const selectedDocumentDate = selectExplicitDocumentDate({
        documentFamilyId: document.documentSubtype,
        documentIssueDate: document.issueDate,
        documentSignatureDate: document.signatureDate,
        documentEffectiveNotificationDate:
          document.notificationDates.effectiveAt?.slice(0, 10) ??
          document.notificationDates.accessedAt?.slice(0, 10),
        snapshotIssueDate: snapshot.structuredData.documentFields.issueDate,
        snapshotEffectiveNotificationDate:
          snapshot.structuredData.documentFields.effectiveNotificationDate,
        unknownFields: observedUnknownFields,
      });
      const documentDate = selectedDocumentDate?.value ?? null;
      const receiptDate =
        normalizeCalendarDate(
          document.notificationDates.accessedAt?.slice(0, 10),
        ) ??
        normalizeCalendarDate(
          document.notificationDates.effectiveAt?.slice(0, 10),
        );
      const orderedFacts = projectOrderedFacts({
        references: document.referenceIds
          .map((id) => references.get(id))
          .filter((item) => item !== undefined),
        moneyFacts: domain?.moneyFacts ?? [],
        unknownFields: observedUnknownFields,
        referencesById: references,
        evidenceById: evidence,
        evidenceOrder,
      });
      const explanation = explainStoredFiscalNotification({
        documentType: document.documentType,
        documentSubtype: document.documentSubtype ?? null,
        documentDate,
        receiptDate,
        facts: explanationFacts,
        money,
        profileInput: buildStoredProfileExplanationInputV2({
          documentSubtype: document.documentSubtype ?? null,
          unknownFields: observedUnknownFields,
          evidenceById: evidence,
        }),
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
        // Legacy workspaces may contain identity fields. They are deliberately
        // not projected into the document library or explanation surface.
        subjectName: null,
        subjectTaxId: null,
        references: Object.freeze(documentReferences),
        printedDates: Object.freeze(printedDates),
        orderedFacts,
        money: Object.freeze(money),
        installments: Object.freeze(installments),
        amountReconciliation:
          snapshot.structuredData.amountReconciliation ?? null,
        mathematicalIntegrity:
          snapshot.structuredData.mathematicalIntegrity ?? null,
        explanation,
        authenticityLabel: "Autenticidad no comprobada" as const,
        reviewStatus:
          document.humanReviewStatus === "PENDING"
            ? ("PENDING" as const)
            : ("REVIEWED" as const),
        reviewLabel:
          document.humanReviewStatus === "PENDING"
            ? ("Datos extraídos · revisa antes de actuar" as const)
            : ("Revisión completada" as const),
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

const STORED_PROFILE_FIELD_ID =
  /^profile:(reference|date|money|fact|participant_role):([A-Z0-9_]+):\d+$/u;
const STORED_PROFILE_EFFECT_FIELD_ID = /^profile:effect:([A-Z0-9_]+):\d+$/u;
const STORED_PROFILE_RECOGNITION_FIELD_ID =
  "profile:recognition:document-type:0";
const SENSITIVE_STORED_PROFILE_REFERENCES = new Set([
  "CSV",
  "NRC",
  "BANK_REFERENCE",
]);

/**
 * Reconstructs only the closed typed profile fields retained by VSR2. It never
 * reads a PDF snippet, person name, tax id, account number or other free text.
 */
function buildStoredProfileExplanationInputV2(input: {
  readonly documentSubtype: string | null;
  readonly unknownFields: readonly UnknownExtractedField[];
  readonly evidenceById: ReadonlyMap<string, FieldEvidence>;
}): FiscalNotificationDocumentExplanationInputV2 | null {
  if (!isAeatProfileId(input.documentSubtype)) return null;

  const documentEvidence: FiscalNotificationDocumentEvidenceInputV2[] = [];
  const references: FiscalNotificationExplanationReferenceInputV2[] = [];
  const dates: FiscalNotificationExplanationDateInputV2[] = [];
  const money: FiscalNotificationExplanationMoneyInputV2[] = [];
  const factCodes: FiscalNotificationExplanationFactInputV2[] = [];
  const roleCodes: FiscalNotificationExplanationRoleInputV2[] = [];
  const printedEffects: FiscalNotificationPrintedEffectInputV2[] = [];
  const allowedEffects = new Set(
    resolveAllowedPrintedEffectCodesV2(input.documentSubtype),
  );
  const seenEffects = new Set<FiscalNotificationPrintedEffectCodeV2>();
  const seenEvidence = new Set<string>();
  let recognitionEvidenceId: string | null = null;

  for (const field of input.unknownFields) {
    const metadata = parseVerticalFieldLabel(field.labelRaw);
    const profileMatch = metadata?.fieldId
      ? STORED_PROFILE_FIELD_ID.exec(metadata.fieldId)
      : null;
    const effectMatch = metadata?.fieldId
      ? STORED_PROFILE_EFFECT_FIELD_ID.exec(metadata.fieldId)
      : null;
    const recognition =
      metadata?.fieldId === STORED_PROFILE_RECOGNITION_FIELD_ID;
    if ((!profileMatch && !effectMatch && !recognition) || !field.evidenceId) {
      continue;
    }
    const source = input.evidenceById.get(field.evidenceId);
    if (
      !source ||
      source.pageNumber !== field.page ||
      source.assertionType !== "EXPLICIT_IN_DOCUMENT"
    ) {
      continue;
    }
    if (!seenEvidence.has(source.id)) {
      seenEvidence.add(source.id);
      documentEvidence.push({
        evidenceId: source.id,
        pageNumber: source.pageNumber,
        extractionMethod:
          source.extractionMethod === "USER"
            ? "USER_CONFIRMED"
            : source.extractionMethod === "OCR"
              ? "OCR"
              : "RULE",
        confidence: confidenceNumber(source.confidence),
        assertionType: "EXPLICIT_IN_DOCUMENT",
        ruleId: "profile-driven-family-v2",
        ruleVersion: "2026-07-16.v2",
      });
    }

    if (recognition) {
      if (field.valueRaw === "EXACT_TITLE_AND_AUTHORITY") {
        recognitionEvidenceId = source.id;
      }
      continue;
    }

    if (effectMatch) {
      const effectCode =
        effectMatch[1] as FiscalNotificationPrintedEffectCodeV2;
      if (
        allowedEffects.has(effectCode) &&
        field.valueRaw === `EFFECT:${effectCode}` &&
        !seenEffects.has(effectCode)
      ) {
        seenEffects.add(effectCode);
        printedEffects.push({ effectCode, evidenceId: source.id });
      }
      continue;
    }
    if (!profileMatch) continue;

    const kind = profileMatch[1];
    const code = profileMatch[2];
    if (kind === "reference") {
      if (SENSITIVE_STORED_PROFILE_REFERENCES.has(code)) continue;
      references.push({
        referenceType:
          code as FiscalNotificationExplanationReferenceInputV2["referenceType"],
        value: field.valueRaw,
        evidenceId: source.id,
      });
    } else if (kind === "date") {
      if (!normalizeCalendarDate(field.valueRaw)) continue;
      dates.push({
        dateType: code as FiscalNotificationExplanationDateInputV2["dateType"],
        value: field.valueRaw,
        evidenceId: source.id,
      });
    } else if (kind === "money") {
      const amountCents = Number(field.valueRaw);
      if (!Number.isSafeInteger(amountCents) || amountCents < 0) continue;
      money.push({
        moneyType:
          code as FiscalNotificationExplanationMoneyInputV2["moneyType"],
        amountCents,
        currency: "EUR",
        evidenceId: source.id,
      });
    } else if (kind === "fact") {
      factCodes.push({
        factCode: code as FiscalNotificationExplanationFactInputV2["factCode"],
        evidenceId: source.id,
      });
    } else if (kind === "participant_role") {
      roleCodes.push({
        roleCode: code as FiscalNotificationExplanationRoleInputV2["roleCode"],
        evidenceId: source.id,
      });
    }
  }

  const intrinsicEffect = resolveIntrinsicPrintedEffectCodeV2(
    input.documentSubtype,
  );
  if (
    intrinsicEffect &&
    recognitionEvidenceId &&
    !seenEffects.has(intrinsicEffect)
  ) {
    printedEffects.unshift({
      effectCode: intrinsicEffect,
      evidenceId: recognitionEvidenceId,
    });
  }

  return Object.freeze({
    familyId: input.documentSubtype,
    documentEvidence: Object.freeze(documentEvidence),
    references: Object.freeze(references),
    dates: Object.freeze(dates),
    money: Object.freeze(money),
    factCodes: Object.freeze(factCodes),
    roleCodes: Object.freeze(roleCodes),
    printedEffects: Object.freeze(printedEffects),
  });
}

function confidenceNumber(value: FieldEvidence["confidence"]): number {
  switch (value) {
    case "EXACT":
      return 1;
    case "HIGH":
      return 0.9;
    case "MEDIUM":
      return 0.7;
    case "LOW":
      return 0.4;
  }
}

function explainStoredFiscalNotification(input: {
  readonly documentType: AdministrativeDocumentType;
  readonly documentSubtype: string | null;
  readonly documentDate: string | null;
  readonly receiptDate: string | null;
  readonly facts: readonly { readonly label: string; readonly value: string }[];
  readonly money: readonly FiscalNotificationStructuredHistoryMoneyV1[];
  readonly profileInput: FiscalNotificationDocumentExplanationInputV2 | null;
}): FiscalNotificationDocumentExplanationV1 {
  if (isAeatP0DeepProfileIdV10(input.documentSubtype)) {
    return projectExplanationV2ForHistory(
      explainAeatP0DeepDocumentV10(input.documentSubtype),
    );
  }
  if (isAeatOfficialCatalogProfileIdV9(input.documentSubtype)) {
    return projectExplanationV2ForHistory(
      explainAeatOfficialCatalogDocumentV9(input.documentSubtype),
    );
  }
  const familyId = isAeatProfileId(input.documentSubtype)
    ? input.documentSubtype
    : null;
  if (!familyId) {
    return explainFiscalNotificationDocumentV1(input);
  }
  return projectExplanationV2ForHistory(
    explainFiscalNotificationDocumentV2(input.profileInput ?? { familyId }),
  );
}

function projectExplanationV2ForHistory(
  explanation: FiscalNotificationDocumentExplanationV2,
): FiscalNotificationDocumentExplanationV1 {
  const sectionText = (
    id: FiscalNotificationDocumentExplanationV2["sections"][number]["id"],
  ): string =>
    explanation.sections
      .find((section) => section.id === id)
      ?.assertions.map((assertion) => assertion.text)
      .join(" ") ?? "Información pendiente de revisión.";
  const deadlineDetail = sectionText("DEADLINE");
  const keyFacts =
    explanation.sections
      .find((section) => section.id === "KEY_DATA")
      ?.assertions.filter(
        (assertion) =>
          assertion.level === "EXPLICIT_IN_DOCUMENT" ||
          assertion.level === "CALCULATED_FROM_PRINTED_VALUES",
      )
      .map((assertion) =>
        Object.freeze({
          label: "Dato del documento",
          value: assertion.text,
          basis:
            assertion.level === "CALCULATED_FROM_PRINTED_VALUES"
              ? ("CALCULATED_FROM_PRINTED_VALUES" as const)
              : ("PRINTED" as const),
        }),
      ) ?? [];
  const officialSources = explanation.officialSources.flatMap((source) =>
    source.canonicalUrl !== null &&
    (source.authority === "AEAT" || source.authority === "BOE")
      ? [
          Object.freeze({
            id: source.id,
            title: source.title,
            authority: source.authority,
            canonicalUrl: source.canonicalUrl,
          }),
        ]
      : [],
  );

  return Object.freeze({
    schemaVersion: 1,
    engineId: "fiscal-notification-document-explanation",
    engineVersion: "1.1.0",
    knowledgeSnapshotId: "official-context.2026-07-16.v2",
    ruleId: `profile.${explanation.familyId ?? "unknown"}.explanation.v2`,
    ruleVersion: explanation.engineVersion,
    status: explanation.status === "EXPLAINED" ? "EXPLAINED" : "PARTIAL",
    whatItIs: sectionText("WHAT_DOCUMENT_SAYS"),
    whyReceived: sectionText("WHY_RECEIVED"),
    result: sectionText("RESULT"),
    nextStep: Object.freeze({
      status: "REVIEW_DOCUMENT_ACTION" as const,
      title: "Revisa qué te pide o comunica el documento",
      detail: sectionText("NEXT_STEP"),
    }),
    deadline: Object.freeze({
      status: explanation.deadlineTriggerAvailable
        ? ("DOCUMENT_STATED" as const)
        : ("NOT_IDENTIFIED" as const),
      title:
        explanation.deadlineTrigger === null
          ? "Comprueba si el documento fija algún plazo"
          : "Localiza la fecha que inicia el plazo",
      detail: deadlineDetail,
    }),
    keyFacts: Object.freeze(keyFacts),
    officialSources: Object.freeze(officialSources),
    documentFactsPolicy: "DOCUMENT_IS_PRIMARY",
    legalContextPolicy: "OFFICIAL_CONTEXT_DOES_NOT_OVERRIDE_DOCUMENT",
    networkPolicy: "NO_NETWORK",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
  });
}

type AeatDocumentProfileIdV1 = (typeof AEAT_DOCUMENT_PROFILE_IDS_V1)[number];

function isAeatProfileId(
  value: string | null,
): value is AeatDocumentProfileIdV1 {
  return (
    value !== null &&
    (AEAT_DOCUMENT_PROFILE_IDS_V1 as readonly string[]).includes(value)
  );
}

function deduplicateKnownSemanticDuplicates<
  T extends FiscalNotificationStructuredHistoryFactV1,
>(facts: readonly T[]): readonly T[] {
  const unique = new Map<string, T>();
  for (const fact of facts) {
    const label = fact.label
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/gu, "")
      .toLocaleLowerCase("es-ES");
    const group = /vencimiento de la cuota|limite de pago voluntario/u.test(
      label,
    )
      ? "INSTALLMENT_DEADLINE"
      : /numero de expediente|identificador del acuerdo/u.test(label)
        ? "CASE_OR_AGREEMENT"
        : /clave de liquidacion|clave de deuda/u.test(label)
          ? "DEBT_OR_LIQUIDATION"
          : label;
    const key = `${group}\u0000${fact.value.normalize("NFKC").toLocaleLowerCase("es-ES")}`;
    if (!unique.has(key)) unique.set(key, fact);
  }
  return Object.freeze([...unique.values()]);
}

function deduplicateHistoryMoney(
  facts: readonly FiscalNotificationStructuredHistoryMoneyV1[],
): readonly FiscalNotificationStructuredHistoryMoneyV1[] {
  const unique = new Map<string, FiscalNotificationStructuredHistoryMoneyV1>();
  for (const fact of facts) {
    const key = [
      fact.label.normalize("NFKC").toLocaleLowerCase("es-ES"),
      fact.kind,
      fact.amountCents,
      fact.currency,
      fact.sourceReferenceType ?? "",
      fact.sourceReference ?? "",
      [...fact.pageNumbers].sort((left, right) => left - right).join(","),
    ].join("\u0000");
    if (!unique.has(key)) unique.set(key, fact);
  }
  return Object.freeze([...unique.values()]);
}

function legacyDateFieldLabel(labelRaw: string): string | null {
  const specialized = /^SPECIALIZED\|ENFORCEMENT\|DATE\|([A-Z0-9_]+)$/u.exec(
    labelRaw,
  );
  return DATE_LABELS[specialized?.[1] ?? labelRaw] ?? null;
}

function observedFieldLabel(
  labelRaw: string,
  structuredLabel: string | undefined,
  fallback: string,
): string {
  return structuredLabel ?? legacyDateFieldLabel(labelRaw) ?? fallback;
}

export interface ExplicitDocumentDateInputV1 {
  readonly documentFamilyId?: string;
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

export interface SelectedDocumentDateV1 {
  readonly value: string;
  readonly basis:
    | "Fecha de emision"
    | "Fecha de firma"
    | "Fecha del acto"
    | "Fecha de notificacion";
}

export function observedUnknownFieldsWithPageProvenance(input: {
  readonly fields: readonly UnknownExtractedField[];
  readonly evidenceById: ReadonlyMap<string, FieldEvidence>;
  readonly ownerScope: string;
  readonly documentId: string;
}): readonly UnknownExtractedField[] {
  return unknownFieldsWithPageProvenance(input, "EXPLICIT_IN_DOCUMENT");
}

function unknownFieldsWithPageProvenance(
  input: {
    readonly fields: readonly UnknownExtractedField[];
    readonly evidenceById: ReadonlyMap<string, FieldEvidence>;
    readonly ownerScope: string;
    readonly documentId: string;
  },
  assertionType: FieldEvidence["assertionType"],
): readonly UnknownExtractedField[] {
  return Object.freeze(
    input.fields.filter((field) => {
      if (!field.evidenceId) return false;
      const source = input.evidenceById.get(field.evidenceId);
      return (
        source?.ownerScope === input.ownerScope &&
        source.documentId === input.documentId &&
        source.pageNumber === field.page &&
        source.assertionType === assertionType
      );
    }),
  );
}

export function selectExplicitDocumentDate(
  input: ExplicitDocumentDateInputV1,
): SelectedDocumentDateV1 | null {
  const datedFields = input.unknownFields.filter(
    (field) => field.confidence === "EXACT",
  );

  const storedDate = (
    preferredKind: StoredChronologyDateKindV1,
  ): string | undefined =>
    datedFields.find((candidate) => {
      const metadata = parseVerticalFieldLabel(candidate.labelRaw);
      if (metadata) {
        return storedChronologyDateKind(metadata) === preferredKind;
      }
      return LEGACY_PRINTED_CHRONOLOGY_LABELS[preferredKind].has(
        candidate.labelRaw,
      );
    })?.valueRaw;

  const actionDateValues = preferredActionDateKinds(input.documentFamilyId).map(
    storedDate,
  );
  const candidates = [
    [
      "Fecha de emision",
      [
        input.documentIssueDate,
        input.snapshotIssueDate,
        storedDate("ISSUE_DATE"),
      ],
    ],
    [
      "Fecha de firma",
      [input.documentSignatureDate, storedDate("SIGNING_DATE")],
    ],
    ["Fecha del acto", actionDateValues],
    [
      "Fecha de notificacion",
      [
        input.snapshotEffectiveNotificationDate,
        input.documentEffectiveNotificationDate,
        storedDate("EFFECTIVE_NOTIFICATION_DATE"),
      ],
    ],
  ] as const;

  for (const [basis, values] of candidates) {
    for (const value of values) {
      const normalized = normalizeCalendarDate(value);
      if (normalized) return Object.freeze({ value: normalized, basis });
    }
  }

  return null;
}

type StoredChronologyDateKindV1 =
  | "ISSUE_DATE"
  | "SIGNING_DATE"
  | "ACTION_DATE"
  | "SEIZURE_DATE"
  | "RELEASE_DATE"
  | "EFFECTIVE_NOTIFICATION_DATE";

const LEGACY_PRINTED_CHRONOLOGY_LABELS: Readonly<
  Record<StoredChronologyDateKindV1, ReadonlySet<string>>
> = Object.freeze({
  ISSUE_DATE: new Set(["PRINTED_ISSUE_DATE"]),
  SIGNING_DATE: new Set(["PRINTED_SIGNING_DATE", "PRINTED_SIGNATURE_DATE"]),
  ACTION_DATE: new Set(["PRINTED_ACTION_DATE"]),
  SEIZURE_DATE: new Set<string>(),
  RELEASE_DATE: new Set<string>(),
  EFFECTIVE_NOTIFICATION_DATE: new Set(["PRINTED_EFFECTIVE_NOTIFICATION_DATE"]),
});

const PROFILE_DATE_FIELD_ID = /^profile:date:([A-Z0-9_]+):\d+$/u;

/**
 * VSR2 keeps the original profile date code in fieldId. That code is the
 * chronology authority: some profile dates use ACTION_DATE only as a legacy
 * storage carrier because VSR1 has no START/END/INTEREST/FILING variants.
 * Those dates remain visible facts, but must never become the document date.
 */
function storedChronologyDateKind(
  metadata: PersistedVerticalFieldLabelV1,
): StoredChronologyDateKindV1 | null {
  if (metadata.semantic !== "DATE") return null;
  const profileDateCode = metadata.fieldId
    ? (PROFILE_DATE_FIELD_ID.exec(metadata.fieldId)?.[1] ?? null)
    : null;
  const dateCode = profileDateCode ?? metadata.canonicalType;
  switch (dateCode) {
    case "ISSUE_DATE":
    case "SIGNING_DATE":
    case "ACTION_DATE":
    case "EFFECTIVE_NOTIFICATION_DATE":
      return dateCode;
    case "SIGNATURE_DATE":
      return "SIGNING_DATE";
    case "SEIZURE_DATE":
    case "RELEASE_DATE":
      return dateCode;
    default:
      return null;
  }
}

const PRIMARY_SEIZURE_ACTION_FAMILIES = new Set([
  "seizure.bank_account",
  "seizure.movable_asset",
  "seizure.real_estate",
  "seizure.commercial_credits",
  "seizure.wages_or_pensions",
  "seizure.securities_or_financial_assets",
  "seizure.cash_or_refund",
  "seizure.tpv_receipts",
  "seizure.business_income_or_rents",
]);

function preferredActionDateKinds(
  familyId: string | undefined,
): readonly StoredChronologyDateKindV1[] {
  if (familyId === "seizure.release") {
    return Object.freeze(["RELEASE_DATE", "ACTION_DATE"]);
  }
  if (familyId && PRIMARY_SEIZURE_ACTION_FAMILIES.has(familyId)) {
    return Object.freeze(["SEIZURE_DATE", "ACTION_DATE"]);
  }
  return Object.freeze(["ACTION_DATE"]);
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
    FiscalNotificationStructuredHistoryOrderedFactV1 & {
      readonly order: number;
    }
  > = [];
  const firstEvidence = (ids: readonly string[]): FieldEvidence | undefined =>
    ids
      .map((id) => input.evidenceById.get(id))
      .find((item) => item !== undefined);
  const firstOrder = (ids: readonly string[]): number =>
    Math.min(
      ...ids.map(
        (id) => input.evidenceOrder.get(id) ?? Number.MAX_SAFE_INTEGER,
      ),
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
        "Referencia",
      value: visibleStoredReference(reference, verticalMetadataByEvidence),
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
      .find(
        (field) =>
          parseVerticalFieldLabel(field?.labelRaw ?? "")?.semantic === "MONEY",
      );
    const sourceReferenceValue = fact.sourceActRefId
      ? input.referencesById.get(fact.sourceActRefId)
      : undefined;
    const sourceReference = sourceReferenceValue
      ? visibleStoredReference(sourceReferenceValue, verticalMetadataByEvidence)
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
    const visibleValue =
      humanizeLegacyInstallmentToken(fact.valueRaw) ?? fact.valueRaw;
    if (
      metadata?.semantic === "MONEY" ||
      metadata?.semantic === "REFERENCE" ||
      isProfileControlField(metadata?.fieldId ?? null) ||
      isInternalFiscalNotificationFieldArtifact({
        fieldId: metadata?.fieldId ?? null,
        label: metadata?.label ?? fact.labelRaw,
        value: visibleValue,
        semantic: metadata?.semantic ?? null,
        canonicalType: metadata?.canonicalType ?? null,
      })
    ) {
      return;
    }
    const sourceOrder = fact.evidenceId
      ? (input.evidenceOrder.get(fact.evidenceId) ?? Number.MAX_SAFE_INTEGER)
      : Number.MAX_SAFE_INTEGER - input.unknownFields.length + index;
    candidates.push({
      key: fact.evidenceId ?? `printed:${fact.page}:${index}`,
      semantic: orderedSemantic(metadata?.semantic, fact.labelRaw),
      label: observedFieldLabel(fact.labelRaw, metadata?.label, "Dato"),
      value: visibleValue,
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

function humanizeLegacyInstallmentToken(value: string): string | null {
  const match =
    /^V([3-7]):INSTALLMENT:([1-9]\d*):((?:19|20)\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]):(-?\d+):(-?\d+):(-?\d+)$/u.exec(
      value,
    );
  if (!match) return null;
  const amounts = [match[6], match[7], match[8]].map(Number);
  if (!amounts.every(Number.isSafeInteger)) return null;
  const principalLabel = match[1] === "3" ? "base" : "principal";
  return `Vence ${match[5]}/${match[4]}/${match[3]} · ${principalLabel} ${formatOrderedMoney(amounts[0]!, "EUR")} · interés ${formatOrderedMoney(amounts[1]!, "EUR")} · total ${formatOrderedMoney(amounts[2]!, "EUR")}`;
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

function evidenceSupportsDeadline(
  source: FieldEvidence | undefined,
  deadline: string,
): boolean {
  if (!source) return false;
  const expected = normalizeCalendarDate(deadline);
  if (!expected) return false;
  return [source.rawValue, source.textSnippet].some((value) =>
    value
      ? (
          value.match(
            /\b(?:\d{4}-\d{2}-\d{2}|\d{2}[-/]\d{2}[-/]\d{4})\b/gu,
          ) ?? [value]
        ).some((candidate) => normalizeCalendarDate(candidate) === expected)
      : false,
  );
}

function evidenceContainsCalendarDate(
  source: FieldEvidence | undefined,
  metadata: PersistedVerticalFieldLabelV1 | undefined,
): boolean {
  if (metadata?.semantic === "DATE") return true;
  if (!source) return false;
  return [source.rawValue, source.textSnippet].some((value) =>
    value
      ? (
          value.match(/\b(?:\d{4}-\d{2}-\d{2}|\d{2}[-/]\d{2}[-/]\d{4})\b/gu) ??
          []
        ).some((candidate) => normalizeCalendarDate(candidate) !== null)
      : false,
  );
}

function evidencePageNumbers(
  evidenceIds: readonly string[],
  evidenceById: ReadonlyMap<string, FieldEvidence>,
): readonly number[] {
  return Object.freeze(
    [
      ...new Set(
        evidenceIds.flatMap((id) => {
          const source = evidenceById.get(id);
          return source ? [source.pageNumber] : [];
        }),
      ),
    ].sort((left, right) => left - right),
  );
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
  readonly fieldId: string | null;
  readonly semantic: string;
  readonly canonicalType: string;
  readonly label: string;
}

function parseVerticalFieldLabel(
  value: string,
): PersistedVerticalFieldLabelV1 | null {
  const parts = value.split("|");
  if (parts[0] !== "VSR1" && parts[0] !== "VSR2") return null;
  const isV2 = parts[0] === "VSR2";
  if (parts.length < (isV2 ? 5 : 4)) return null;
  const fieldId = isV2 ? parts[1] : null;
  const semantic = parts[isV2 ? 2 : 1];
  const canonicalType = parts[isV2 ? 3 : 2];
  const label = parts.slice(isV2 ? 4 : 3).join("|");
  if (fieldId !== null && !fieldId) return null;
  if (!semantic || !canonicalType || !label) return null;
  return Object.freeze({ fieldId, semantic, canonicalType, label });
}
