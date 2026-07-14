import type { AdministrativeMoneyKind } from "./administrative-domain";
import { parseFiscalNotificationsWorkspaceForPersistenceV1 } from "./workspace-persistence.v1";

export interface FiscalNotificationStructuredHistoryMoneyV1 {
  readonly label: string;
  readonly amountCents: number;
  readonly currency: "EUR" | "UNKNOWN";
}

export interface FiscalNotificationStructuredHistoryFactV1 {
  readonly label: string;
  readonly value: string;
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
  readonly title: string;
  readonly authority: string;
  readonly createdAt: string;
  readonly pageCount: number;
  readonly byteLength: number;
  readonly subjectName: string | null;
  readonly subjectTaxId: string | null;
  readonly references: readonly FiscalNotificationStructuredHistoryFactV1[];
  readonly printedDates: readonly FiscalNotificationStructuredHistoryFactV1[];
  readonly money: readonly FiscalNotificationStructuredHistoryMoneyV1[];
  readonly installments: readonly FiscalNotificationStructuredHistoryInstallmentV1[];
  readonly authenticityLabel: "Autenticidad no comprobada";
  readonly reviewLabel: "Datos extraídos · revisa antes de actuar";
  readonly sourceContentRetention: "NOT_RETAINED";
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
  OFFSET_APPLIED: "Compensación aplicada impresa",
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
  VTO_RAW: "Referencia Vto.",
  NOTIFICATION_ID: "Identificador de notificación",
  REQUEST_NUMBER: "Número de requerimiento",
};

const DATE_LABELS: Readonly<Record<string, string>> = {
  PRINTED_ISSUE_DATE: "Fecha de emisión impresa",
  PRINTED_SIGNATURE_DATE: "Fecha de firma impresa",
  PRINTED_VOLUNTARY_PERIOD_END_DATE:
    "Fin del período voluntario impreso",
  PRINTED_PAYMENT_ACCOUNT: "Cuenta de pago impresa",
  PRINTED_DEBT_CONCEPT: "Concepto impreso",
  PRINTED_INTEREST_START_DATE: "Fecha de intereses impresa",
  PRINTED_LISTED_DEBT_AMOUNT: "Importe de deuda impreso",
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

  const authorities = new Map(workspace.authorities.map((item) => [item.id, item]));
  const files = new Map(workspace.files.map((item) => [item.id, item]));
  const references = new Map(workspace.references.map((item) => [item.id, item]));
  const snapshots = new Map(
    workspace.analysisSnapshots.map((item) => [item.id, item]),
  );
  const paymentOptions = new Map(
    workspace.paymentOptions.map((item) => [item.id, item]),
  );

  const entries = workspace.documents
    .map((document): FiscalNotificationStructuredHistoryEntryV1 | null => {
      const authority = authorities.get(document.authorityId);
      const file = files.get(document.fileId);
      const snapshotId = document.analysisSnapshotIds.at(-1);
      const snapshot = snapshotId ? snapshots.get(snapshotId) : undefined;
      if (!authority || !file || !snapshot) return null;

      const domain = snapshot.structuredData.administrativeDomain;
      const money = (domain?.moneyFacts ?? []).map((fact) =>
        Object.freeze({
          label: MONEY_LABELS[fact.kind],
          amountCents: fact.amountCents,
          currency: fact.currency,
        }),
      );
      const documentReferences = document.referenceIds
        .map((id) => references.get(id))
        .filter((item) => item !== undefined)
        .map((item) =>
          Object.freeze({
            label: REFERENCE_LABELS[item.referenceType] ?? "Referencia impresa",
            value: item.rawValue,
          }),
        );
      const printedDates = snapshot.structuredData.unknownFields.map((field) =>
        Object.freeze({
          label: DATE_LABELS[field.labelRaw] ?? "Fecha impresa",
          value: field.valueRaw,
        }),
      );
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

      return Object.freeze({
        key: document.id,
        title: document.titleRaw,
        authority: authority.nameRaw,
        createdAt: document.createdAt,
        pageCount: file.pageCount,
        byteLength: file.fileSize,
        subjectName: document.subjectParty?.displayName ?? null,
        subjectTaxId: document.subjectParty?.taxIdNormalized ?? null,
        references: Object.freeze(documentReferences),
        printedDates: Object.freeze(printedDates),
        money: Object.freeze(money),
        installments: Object.freeze(installments),
        authenticityLabel: "Autenticidad no comprobada" as const,
        reviewLabel: "Datos extraídos · revisa antes de actuar" as const,
        sourceContentRetention: "NOT_RETAINED" as const,
      });
    })
    .filter((entry) => entry !== null)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return Object.freeze({
    status: "READY",
    entries: Object.freeze(entries),
  });
}
