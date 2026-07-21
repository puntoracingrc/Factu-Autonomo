import {
  FISCAL_NOTIFICATION_DOCUMENT_FAMILY_IDS_V3,
  type FiscalNotificationDocumentFamilyIdV3,
} from "./knowledge/document-families.v3";
import {
  AEAT_OFFICIAL_CATALOG_PROFILE_IDS_V9,
  resolveAeatOfficialCatalogProfileV9,
  type AeatOfficialCatalogProfileIdV9,
} from "./knowledge/official-catalog-expansion.v9";
import {
  AEAT_P0_DEEP_PROFILES_V10,
  isAeatP0DeepProfileIdV10,
  resolveAeatP0DeepProfileV10,
} from "./knowledge/p0-deep-contracts.v10";
import {
  AEAT_P0_DEEP_REVIEW_CONTROLLED_LABELS_V10,
  AEAT_P0_DEEP_REVIEW_HUMAN_VALUES_V10,
} from "./p0-deep-review-labels.v10";
import {
  FISCAL_NOTIFICATION_INPUT_LIMITS,
  assertNonNegativeIntegerCents,
} from "./input-contract";
import {
  parseFiscalNotificationAmountReconciliationV1,
  type FiscalNotificationAmountReconciliationV1,
} from "./amount-reconciliation-contract.v1";
import {
  parseFiscalNotificationMathematicalIntegrityV11,
  type FiscalNotificationMathematicalIntegrityV11,
} from "./mathematical-integrity-contract.v11";
import type { PartyRoleV1 } from "./extractor-core/domain.v1";
import type { ExtractorOutputV1 } from "./extractor-core/extractor-contract.v1";
import type { MonetaryComponentTypeV1 } from "./extractor-core/monetary-component.v1";
import type { ProceduralDateTypeV1 } from "./extractor-core/procedural-date.v1";
import type { ReferenceTypeV1 } from "./extractor-core/reference.v1";
import type { PaymentEvidenceStateV1 } from "./extractor-core/payment-evidence-extractor.v1";
import type { NotificationEnvelopeStateV1 } from "./extractor-core/notification-envelope-extractor.v1";
import type {
  SeizureMoneyRoleV1,
  SeizurePrintedStateV1,
  SeizureRecipientRoleV1,
  SeizureSpecificFactV1,
  SeizureSpecificFieldIdV1,
} from "./extractor-core/seizure-extractor.v1";
import type {
  FiscalNotificationVerticalSliceAnalysisV1,
} from "./extractor-core/vertical-slice-orchestrator.v1";
import {
  BASE_EXTRACTOR_IDS_V1,
  type BaseExtractorIdV1,
} from "./extractor-core/extractor-contract.v1";
import { resolveFamilyRuleV2 } from "./extractor-core/family-rule-registry.v2";
import { PROFILE_FIELD_LABELS_V2 } from "./extractor-core/profile-field-labels.v2";
import { REAL_CORPUS_EXPLANATIONS_V4 } from "./extractor-core/real-corpus-extractor.v4";
import { REAL_CORPUS_EXPLANATIONS_V5 } from "./extractor-core/real-corpus-extractor.v5";
import { REAL_CORPUS_EXPLANATIONS_V6 } from "./extractor-core/real-corpus-extractor.v6";
import { REAL_CORPUS_EXPLANATIONS_V7 } from "./extractor-core/real-corpus-extractor.v7";

export const FISCAL_NOTIFICATION_VERTICAL_SLICE_REVIEW_VERSION_V1 =
  "1.0.0" as const;

export const FISCAL_NOTIFICATION_VERTICAL_SLICE_REVIEW_LIMITS_V1 =
  Object.freeze({
    maxDocuments: 16,
    maxFieldsPerDocument: 256,
    maxWarningsPerDocument: 64,
    maxLabelChars: 160,
    maxDisplayValueChars: 1_000,
    maxNormalizedValueChars: 500,
    maxSourceLabelChars: 240,
  } as const);

export const FISCAL_NOTIFICATION_VERTICAL_SLICE_FIELD_SEMANTICS_V1 =
  Object.freeze([
    "REFERENCE",
    "MONEY",
    "DATE",
    "PARTY",
    "STATUS",
    "DETAIL",
    "OBLIGATION",
    "MASKED_VALUE",
  ] as const);
export type FiscalNotificationVerticalSliceFieldSemanticV1 =
  (typeof FISCAL_NOTIFICATION_VERTICAL_SLICE_FIELD_SEMANTICS_V1)[number];

const DETAIL_CANONICAL_TYPES = Object.freeze([
  "DOCUMENT_STATUS",
  "REASON",
  "OBLIGATION",
  "RESPONSE_CHANNEL",
  "DOCUMENTATION_REQUIRED",
  "EXPLICIT_CONSEQUENCE",
  "FACT_OR_GROUND",
  "APPEAL_INFORMATION",
  "COLLABORATING_ENTITY",
  "PAYMENT_MEDIUM",
  "PAYMENT_RESULT",
  "REJECTION_REASON",
  "PAYMENT_SCOPE",
  "PAYMENT_TIME",
  "DEFERRAL_REASON",
  "DEBT_DESCRIPTION",
  "ORIGINAL_DEBT_DUE_DATE",
  "MASKED_ACCOUNT",
  "BARCODE_REFERENCE",
  "NOTIFICATION_SUBJECT",
  "NOTIFICATION_CHANNEL",
  "PRINTED_NOTIFICATION_STATE",
  "SEIZURE_INSTRUCTIONS",
  "PRINTED_RESOURCES",
  "SEIZURE_RECIPIENT_ROLE",
  "DEBTOR_TAX_ID",
  "RECIPIENT_TAX_ID",
  "THIRD_PARTY_TAX_ID",
  "FINANCIAL_ENTITY",
  "ACCOUNT_OR_DEPOSIT",
  "PAYER",
  "CREDIT_DEBTOR",
  "CONTRACT_OR_INVOICE",
  "CREDIT_PAYMENT_PERIODICITY",
  "PROHIBITION_TO_PAY_DEBTOR",
  "REMUNERATION_TYPE",
  "PRINTED_WITHHOLDING_LIMIT",
  "PAYMENT_SERVICE_PROVIDER",
  "TERMINAL_OR_MERCHANT",
  "COLLECTION_FLOW",
  "PRINTED_PERCENTAGE",
  "PROPERTY_HOLDER",
  "PROPERTY_ADDRESS",
  "CADASTRAL_REFERENCE",
  "LAND_REGISTRY",
  "PROPERTY_NUMBER",
  "SEIZED_RIGHT",
  "OWNERSHIP_SHARE",
  "VALUATION",
  "CHARGES",
  "RELEASED_ASSET_OR_RIGHT",
  "EXPLICIT_RELEASE_REASON",
  "RELEASE_EXTENT",
  "RELATIONSHIP_TO_DEBTOR",
  "CREDIT_OR_BALANCE_EXISTS",
  "THIRD_PARTY_RESPONSE",
  "TRANSFER_RECEIPT",
] as const);

export type FiscalNotificationVerticalSliceCanonicalFieldTypeV1 =
  | ReferenceTypeV1
  | MonetaryComponentTypeV1
  | SeizureMoneyRoleV1
  | ProceduralDateTypeV1
  | PartyRoleV1
  | (typeof DETAIL_CANONICAL_TYPES)[number];

export interface FiscalNotificationVerticalSliceReviewFieldV1 {
  readonly fieldId: string;
  readonly semantic: FiscalNotificationVerticalSliceFieldSemanticV1;
  readonly canonicalType: FiscalNotificationVerticalSliceCanonicalFieldTypeV1;
  readonly label: string;
  readonly displayValue: string;
  readonly normalizedValue: string | null;
  readonly amountCents: number | null;
  readonly currency: "EUR" | null;
  readonly sourcePageNumbers: readonly number[];
  readonly sourceLabel: string;
  readonly confidence: number;
  readonly reviewStatus: "REVIEW_REQUIRED";
}

export interface FiscalNotificationVerticalSliceReviewDocumentV1 {
  readonly reviewDocumentId: string;
  readonly extractorId: BaseExtractorIdV1;
  readonly familyId: FiscalNotificationReviewFamilyIdV9;
  readonly title: string;
  readonly subtitle: string;
  readonly pageFrom: number;
  readonly pageTo: number;
  readonly confidence: number;
  readonly fields: readonly FiscalNotificationVerticalSliceReviewFieldV1[];
  readonly warnings: readonly string[];
  readonly amountReconciliation?: FiscalNotificationAmountReconciliationV1;
  readonly mathematicalIntegrity?: FiscalNotificationMathematicalIntegrityV11;
  readonly requiresHumanReview: true;
}

export type FiscalNotificationReviewFamilyIdV9 =
  FiscalNotificationDocumentFamilyIdV3 | AeatOfficialCatalogProfileIdV9;

export interface FiscalNotificationVerticalSliceReviewV1 {
  readonly schemaVersion: 1;
  readonly reviewVersion: typeof FISCAL_NOTIFICATION_VERTICAL_SLICE_REVIEW_VERSION_V1;
  readonly status: "REVIEW_REQUIRED" | "INFORMATION_PENDING" | "BLOCKED";
  readonly documents: readonly FiscalNotificationVerticalSliceReviewDocumentV1[];
  readonly sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST";
  readonly retainedSourceContent: "NONE";
  readonly requiresHumanReview: true;
  readonly materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW";
  readonly permitsDebtCreation: false;
  readonly permitsDeadlineCreation: false;
  readonly permitsPaymentAction: false;
  readonly permitsAccountingAction: false;
}

const FAMILY_TITLE: Readonly<
  Partial<Record<FiscalNotificationReviewFamilyIdV9, string>>
> = Object.freeze({
  "notification.delivery_attempt": "Aviso o intento de notificación",
  "notification.publication_or_appearance":
    "Publicación o comparecencia para notificación",
  "notification.dehu_envelope": "Sobre o acuse de notificación electrónica",
  "compliance.formal_filing_requirement":
    "Requerimiento formal de presentación",
  "compliance.document_request": "Requerimiento de documentación",
  "assessment.allegations_and_proposal": "Propuesta de liquidación provisional",
  "assessment.final_provisional_assessment": "Liquidación provisional",
  "collection.deferral_denial": "Denegación de aplazamiento o fraccionamiento",
  "collection.deferral_grant": "Concesión de aplazamiento o fraccionamiento",
  "collection.deferral_modification":
    "Modificación de aplazamiento o fraccionamiento",
  "collection.enforcement_order": "Providencia de apremio",
  "collection.external_debt": "Deuda de otro organismo recaudada por la AEAT",
  "collection.offset_ex_officio": "Compensación de oficio",
  "collection.offset_requested": "Compensación solicitada",
  "payment.payment_form": "Carta o documento de pago",
  "payment.receipt": "Justificante de pago",
  "payment.failed_or_reversed": "Incidencia de pago",
  "seizure.bank_account": "Diligencia de embargo de cuenta bancaria",
  "seizure.commercial_credits":
    "Diligencia de embargo de créditos comerciales o arrendaticios",
  "seizure.wages_or_pensions":
    "Diligencia de embargo de sueldos, salarios o pensiones",
  "seizure.tpv_receipts": "Diligencia de embargo de cobros mediante TPV",
  "seizure.cash_or_refund":
    "Diligencia de embargo de efectivo, devoluciones o créditos públicos",
  "seizure.real_estate": "Diligencia de embargo de inmueble",
  "seizure.release": "Levantamiento de embargo",
  "seizure.third_party_response": "Contestación a diligencia de embargo",
  "seizure.third_party_payment": "Ingreso efectuado por tercero retenedor",
});

const REFERENCE_LABEL: Readonly<Record<ReferenceTypeV1, string>> =
  Object.freeze({
    PROCEDURE_ID: "Procedimiento",
    EXPEDIENTE_ID: "Expediente",
    ACT_ID: "Acto o requerimiento",
    NOTIFICATION_ID: "Notificación",
    LIQUIDATION_KEY: "Clave de liquidación",
    DEBT_KEY: "Clave de deuda",
    SEIZURE_ORDER_ID: "Diligencia de embargo",
    AGREEMENT_ID: "Acuerdo",
    REGISTRY_ID: "Registro",
    FILING_RECEIPT_ID: "Justificante de presentación",
    PAYMENT_RECEIPT_ID: "Justificante de pago",
    PAYMENT_FORM_REFERENCE: "Número de la carta de pago",
    PAYMENT_FORM_MODEL: "Modelo de ingreso",
    NRC: "NRC",
    CSV: "CSV",
    NIF: "NIF",
    MODEL: "Modelo",
    FISCAL_YEAR: "Ejercicio",
    TAX_PERIOD: "Periodo",
    BANK_REFERENCE: "Referencia bancaria",
    THIRD_PARTY_RESPONSE_ID: "Contestación de tercero",
    REQUEST_NUMBER: "Número de solicitud",
    REFUND_REFERENCE: "Referencia de devolución",
    VEHICLE_OR_FINE_REFERENCE: "Bien relacionado",
    OTHER_OFFICIAL_REFERENCE: "Referencia oficial",
  });

const MONEY_LABEL: Readonly<Record<MonetaryComponentTypeV1, string>> =
  Object.freeze({
    PRINCIPAL: "Principal",
    ORIGINAL_TAX_PRINCIPAL: "Principal tributario original",
    OUTSTANDING_PRINCIPAL: "Principal pendiente",
    TAX_QUOTA: "Cuota",
    PENALTY: "Sanción",
    SURCHARGE: "Recargo",
    EXECUTIVE_SURCHARGE: "Recargo ejecutivo",
    EXECUTIVE_SURCHARGE_5: "Recargo ejecutivo del 5 %",
    EXECUTIVE_SURCHARGE_10: "Recargo reducido del 10 %",
    EXECUTIVE_SURCHARGE_20: "Recargo de apremio ordinario del 20 %",
    DEFERRAL_INTEREST: "Intereses del aplazamiento",
    LATE_INTEREST: "Intereses",
    COSTS: "Costas",
    PAYMENT_ON_ACCOUNT: "Ingreso a cuenta",
    TOTAL_CLAIMED: "Total reclamado",
    TOTAL_PAID: "Total pagado",
    PARTIAL_PAYMENT: "Pago parcial",
    TOTAL_PENDING: "Total pendiente",
    REFUND_REQUESTED: "Devolución solicitada",
    REFUND_RECOGNIZED: "Devolución reconocida",
    REFUND_PAID: "Devolución pagada",
    CREDIT_APPLIED: "Crédito aplicado",
    COMPENSATED_AMOUNT: "Importe compensado",
    SEIZED_AMOUNT: "Importe embargado",
    RELEASED_AMOUNT: "Importe liberado",
    PAYMENT_OPTION_AMOUNT: "Importe de la carta de pago",
    OTHER: "Importe",
  });

const DATE_LABEL: Readonly<Record<ProceduralDateTypeV1, string>> =
  Object.freeze({
    ISSUE_DATE: "Fecha de emisión",
    SIGNING_DATE: "Fecha de firma",
    AVAILABILITY_DATE: "Puesta a disposición",
    ACCESS_DATE: "Fecha de acceso",
    REJECTION_DATE: "Fecha de rechazo",
    EXPIRATION_DATE: "Fecha de caducidad",
    EFFECTIVE_NOTIFICATION_DATE: "Fecha de notificación",
    ACTION_DATE: "Fecha del acto",
    VOLUNTARY_PAYMENT_DEADLINE: "Límite de pago",
    RESPONSE_DEADLINE: "Plazo de respuesta",
    APPEAL_DEADLINE: "Plazo de recurso",
    INSTALLMENT_DUE_DATE: "Vencimiento del plazo",
    INTEREST_START_DATE: "Inicio del período de intereses",
    INTEREST_END_DATE: "Fin del período de intereses",
    PAYMENT_FORM_DATE: "Fecha de la carta de pago",
    PAYMENT_DATE: "Fecha de pago",
    SEIZURE_DATE: "Fecha de embargo",
    RELEASE_DATE: "Fecha de levantamiento",
  });

const PARTY_LABEL: Readonly<Record<PartyRoleV1, string>> = Object.freeze({
  TAXPAYER: "Obligado tributario",
  PRIMARY_DEBTOR: "Deudor principal",
  LIABLE_PARTY: "Responsable",
  SUCCESSOR: "Sucesor",
  PAYER: "Pagador",
  GARNISHED_THIRD_PARTY: "Tercero embargado",
  TENANT: "Arrendatario",
  FINANCIAL_ENTITY: "Entidad financiera",
  REPRESENTATIVE: "Representante",
  ISSUING_AUTHORITY: "Órgano emisor",
});

const SEIZURE_MONEY_LABEL: Readonly<Record<SeizureMoneyRoleV1, string>> =
  Object.freeze({
    PRINCIPAL: "Principal pendiente",
    EXECUTIVE_SURCHARGE: "Recargo ejecutivo",
    LATE_INTEREST: "Intereses de demora",
    COSTS: "Costas del procedimiento",
    TOTAL_PENDING: "Total pendiente",
    SEIZED_AMOUNT: "Importe embargado",
    SEIZURE_LIMIT: "Límite del embargo",
    RETAINED_AMOUNT: "Importe retenido",
    AVAILABLE_BALANCE: "Saldo disponible",
    THIRD_PARTY_TRANSFERRED: "Importe ingresado por el tercero",
    RELEASED_AMOUNT: "Importe liberado",
  });

const SEIZURE_SPECIFIC_LABEL: Readonly<
  Record<SeizureSpecificFieldIdV1, string>
> = Object.freeze({
  FINANCIAL_ENTITY: "Entidad financiera",
  MASKED_ACCOUNT: "Cuenta enmascarada",
  ACCOUNT_OR_DEPOSIT: "Cuenta o depósito",
  PAYER: "Pagador",
  CREDIT_DEBTOR: "Deudor del crédito",
  CONTRACT_OR_INVOICE: "Contrato o factura",
  CREDIT_PAYMENT_PERIODICITY: "Periodicidad del crédito",
  PROHIBITION_TO_PAY_DEBTOR: "Prohibición de pago al deudor",
  REMUNERATION_TYPE: "Tipo de retribución",
  PRINTED_WITHHOLDING_LIMIT: "Límite de retención",
  PAYMENT_SERVICE_PROVIDER: "Proveedor de servicios de pago",
  TERMINAL_OR_MERCHANT: "Terminal o comercio",
  COLLECTION_FLOW: "Flujo de cobros",
  PRINTED_PERCENTAGE: "Porcentaje",
  PROPERTY_HOLDER: "Titular del inmueble",
  PROPERTY_ADDRESS: "Dirección del inmueble",
  CADASTRAL_REFERENCE: "Referencia catastral",
  LAND_REGISTRY: "Registro de la Propiedad",
  PROPERTY_NUMBER: "Finca registral",
  SEIZED_RIGHT: "Bien o derecho embargado",
  OWNERSHIP_SHARE: "Cuota de titularidad",
  VALUATION: "Valoración",
  CHARGES: "Cargas registrales",
  RELEASED_ASSET_OR_RIGHT: "Bien o derecho liberado",
  EXPLICIT_RELEASE_REASON: "Motivo del levantamiento",
  RELEASE_EXTENT: "Alcance del levantamiento",
  RELATIONSHIP_TO_DEBTOR: "Relación con el deudor",
  CREDIT_OR_BALANCE_EXISTS: "Existencia de crédito o saldo",
  THIRD_PARTY_RESPONSE: "Respuesta del tercero",
  TRANSFER_RECEIPT: "Justificante del ingreso",
});

const FAMILY_IDS = new Set<FiscalNotificationReviewFamilyIdV9>([
  ...FISCAL_NOTIFICATION_DOCUMENT_FAMILY_IDS_V3,
  ...AEAT_OFFICIAL_CATALOG_PROFILE_IDS_V9,
]);
const EXTRACTOR_IDS = new Set<BaseExtractorIdV1>(BASE_EXTRACTOR_IDS_V1);
const REFERENCE_TYPES = new Set(Object.keys(REFERENCE_LABEL));
const MONEY_TYPES = new Set([
  ...Object.keys(MONEY_LABEL),
  ...Object.keys(SEIZURE_MONEY_LABEL),
]);
const DATE_TYPES = new Set(Object.keys(DATE_LABEL));
const PARTY_TYPES = new Set(Object.keys(PARTY_LABEL));
const DETAIL_TYPES = new Set<string>(DETAIL_CANONICAL_TYPES);
const FIELD_SEMANTICS = new Set<string>(
  FISCAL_NOTIFICATION_VERTICAL_SLICE_FIELD_SEMANTICS_V1,
);
const SENSITIVE_REFERENCE_TYPES = new Set<ReferenceTypeV1>([
  "CSV",
  "NRC",
  "BANK_REFERENCE",
  "VEHICLE_OR_FINE_REFERENCE",
]);
const SHA256_FINGERPRINT = /^[0-9a-f]{64}$/u;
const ISO_DATE = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/u;
const CLOSED_WARNING_CODE =
  /^(?:[A-Z][A-Z0-9_]{0,159}|profile\.[A-Z][A-Z0-9_]{0,151})$/u;
const PII_LIKE_REFERENCE =
  /^(?:\d{8}[A-Z]|[XYZ]\d{7}[A-Z]|[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]|ES\d{22}|[6789]\d{8})$/u;
const CLOSED_FACT_VALUE = "Detectado en el documento";
const OBSERVED_FACT_VALUE = "Consta en el documento";
const SAFE_STATUS_VALUES = new Set([
  "Pendiente de revisión",
  "Requerimiento pendiente de revisión",
  "Notificación puesta a disposición",
  "Notificación accedida o aceptada",
  "Notificación rechazada",
  "Notificación expirada",
  "Intento de notificación",
  "Notificación entregada",
  "Notificación publicada",
  "Estado de notificación pendiente de revisión",
  "Liquidación provisional emitida",
  "Propuesta de liquidación y alegaciones",
  "Solicitud de aplazamiento denegada",
  "Orden de pago",
  "Pago confirmado en el justificante",
  "Pago parcial confirmado en el justificante",
  "Intento de pago",
  "Pago rechazado",
  "Pago anulado",
  "Pago devuelto",
  "Resultado de pago pendiente de revisión",
  "Diligencia de embargo registrada",
  "Levantamiento de embargo registrado",
  "Contestación de tercero registrada",
  "Ingreso de tercero registrado",
  "Documento de embargo registrado",
]);
const OMITTED_PRIVATE_DETAIL_TYPES = new Set<string>([
  "MASKED_ACCOUNT",
  "DEBTOR_TAX_ID",
  "RECIPIENT_TAX_ID",
  "THIRD_PARTY_TAX_ID",
  "FINANCIAL_ENTITY",
  "ACCOUNT_OR_DEPOSIT",
  "PAYER",
  "CREDIT_DEBTOR",
  "PAYMENT_SERVICE_PROVIDER",
  "TERMINAL_OR_MERCHANT",
  "PROPERTY_HOLDER",
  "PROPERTY_ADDRESS",
  "LAND_REGISTRY",
]);
const SAFE_SUBTITLE_VALUES = new Set([
  ...SAFE_STATUS_VALUES,
  "Documentación solicitada pendiente de revisión",
  "Requerimiento formal de presentación",
  "La AEAT ha denegado la solicitud; revisa motivo, pago y recurso",
  "Orden de pago · no acredita pago",
  "Título, autoridad y estructura coinciden",
  "Datos observados en el documento",
  "Coincidencia oficial; revisión obligatoria",
  "Clasificación histórica amplia",
  "Datos estructurados listos para revisar",
  "Revisa los datos detectados y completa los que falten",
  "1 documento reconocido",
  "1 documento reconocido · incluye calendario",
  "1 documento reconocido · incluye anexo de intereses",
  "1 documento reconocido · incluye carta de pago",
  "1 documento reconocido · incluye calendario y anexo de intereses",
  "1 documento reconocido · incluye calendario y carta de pago",
  "1 documento reconocido · incluye anexo de intereses y carta de pago",
  "1 documento reconocido · incluye calendario, anexo de intereses y carta de pago",
]);

type ClosedHumanFactMatcherV1 = string | RegExp;

function assertClosedHumanRealCorpusDetailV1(input: {
  readonly fieldId: string;
  readonly prefix: string;
  readonly display: string;
  readonly normalized: string;
  readonly allowed: Readonly<Record<string, readonly ClosedHumanFactMatcherV1[]>>;
}): boolean {
  if (!input.fieldId.startsWith(input.prefix)) return false;
  const identity = input.fieldId.slice(input.prefix.length);
  const match = /^([A-Z0-9_]+):\d+$/u.exec(identity);
  if (!match) return false;
  const allowedValues = input.allowed[match[1]!];
  if (!allowedValues) return false;
  if (
    input.display !== input.normalized ||
    !allowedValues.some((candidate) =>
      typeof candidate === "string"
        ? candidate === input.display
        : candidate.test(input.display),
    )
  ) {
    throw invalidReview();
  }
  return true;
}

const REAL_CORPUS_CONTEXTUAL_DATE_CODES_V1 = new Set([
  "CAMPAIGN_END",
  "CAMPAIGN_ONLINE_START",
  "CAMPAIGN_OTHER_START",
  "CITED_SEIZURE_DATE",
  "DIRECT_DEBIT_END",
  "INTEREST_CALCULATION_END",
  "INTEREST_CALCULATION_START",
  "PRINTED_START_DATE",
  "PROPOSAL_NOTIFICATION_DATE",
  "PUBLICATION_CERTIFICATE_EFFECTIVE_DATE",
  "RECEIPT_DATE",
  "REQUEST_DATE",
  "SNAPSHOT_DATE",
  "SOURCE_SEIZURE_DATE",
]);

function assertClosedRealCorpusContextualDateV1(input: {
  readonly fieldId: string;
  readonly prefix: string;
  readonly display: string;
  readonly normalized: string;
}): boolean {
  if (!input.fieldId.startsWith(input.prefix)) return false;
  const identity = input.fieldId.slice(input.prefix.length);
  const match = /^([A-Z0-9_]+):\d+$/u.exec(identity);
  if (!match || !REAL_CORPUS_CONTEXTUAL_DATE_CODES_V1.has(match[1]!)) {
    return false;
  }
  if (
    !ISO_DATE.test(input.normalized) ||
    input.display !== formatIsoDate(input.normalized)
  ) {
    throw invalidReview();
  }
  return true;
}
const REAL_CORPUS_SAFE_LABELS_V2 = new Set([
  "Referencia",
  "Referencia del informe",
  "Referencia de devolución",
  "Referencia del acuerdo de devolución",
  "Referencia del acuerdo de compensación",
  "Identificador de la evidencia",
  "Referencia del acto citado",
  "Concepto tributario",
  "Ejercicio",
  "Fecha de emisión",
  "Datos a fecha de",
  "Inicio por internet",
  "Inicio por otros medios",
  "Fin de campaña",
  "Fin de domiciliación",
  "Resultado declarado",
  "Resultado propuesto",
  "Variación del resultado",
  "Cuota propuesta",
  "Saldo declarado a compensar",
  "Plazo de alegaciones",
  "Unidad del plazo",
  "Inicio del plazo",
  "Motivos",
  "La sanción se tramitaría por separado",
  "Borrador disponible",
  "Participantes",
  "Filas conservadas",
  "Compensación aplicada entre cónyuges",
  "Importe indicado",
  "Saldo restante indicado",
  "Devolución solicitada",
  "Devolución acordada",
  "Pago ordenado",
  "Deducciones",
  "Importe líquido de la devolución",
  "Tipo de compensación",
  "Abono bancario confirmado",
  "Tipo del acto citado",
  "Fecha de publicación",
  "Número de publicación",
  "Plazo de comparecencia",
  "Fecha efectiva de notificación",
  "Explica el contenido del acto citado",
  "Declaraciones no registradas",
  "Requerimiento formal",
  "Plazo de respuesta indicado",
  "Porcentaje histórico citado",
  "Declaración no registrada en el aviso",
  "Qué significa",
  "EMPLOYMENT INCOME",
  "ECONOMIC ACTIVITY INCOME",
  "BANK INTEREST",
  "ECONOMIC ACTIVITY CENSUS",
  "ATTRIBUTED ECONOMIC ACTIVITY INCOME",
  "ATTRIBUTED WITHHOLDINGS",
  "DONATIONS",
  "MORTGAGE LOAN",
  "INSTALLMENT PAYMENTS",
  "SOCIAL SECURITY CONTRIBUTIONS",
  "CADASTRAL PROPERTY",
  "ENTITY PARTICIPATION",
  "MATERNITY DEDUCTION CONTRIBUTIONS",
  "MATERNITY DEDUCTION",
  "Rendimientos del trabajo",
  "Rendimientos de actividades económicas",
  "Intereses bancarios",
  "Actividades económicas declaradas",
  "Rendimientos atribuidos de actividades económicas",
  "Retenciones atribuidas",
  "Donativos",
  "Préstamo hipotecario",
  "Pagos fraccionados",
  "Cotizaciones a la Seguridad Social",
  "Inmuebles catastrales",
  "Participaciones en entidades",
  "Cotizaciones para deducción por maternidad",
  "Deducción por maternidad",
  "Dato fiscal observado",
]);

export function projectFiscalNotificationVerticalSliceReviewV1(
  analysis: FiscalNotificationVerticalSliceAnalysisV1,
): FiscalNotificationVerticalSliceReviewV1 {
  const documents: FiscalNotificationVerticalSliceReviewDocumentV1[] = [];
  const { extractions } = analysis;
  if (extractions.notificationEnvelope) {
    documents.push(
      projectNotificationEnvelope(extractions.notificationEnvelope),
    );
  }
  if (extractions.formalFilingRequirement) {
    documents.push(projectRequirement(extractions.formalFilingRequirement));
  }
  if (extractions.assessment) {
    documents.push(projectAssessment(extractions.assessment));
  }
  if (extractions.deferralDenial) {
    documents.push(projectDeferralDenial(extractions.deferralDenial));
  }
  if (extractions.paymentOrder) {
    documents.push(projectPaymentOrder(extractions.paymentOrder));
  }
  if (extractions.paymentEvidence) {
    documents.push(projectPaymentEvidence(extractions.paymentEvidence));
  }
  if (extractions.seizure) {
    documents.push(
      projectSeizure(
        extractions.seizure,
        analysis.seizureAssetFingerprintSha256,
      ),
    );
  }
  return parseFiscalNotificationVerticalSliceReviewV1({
    schemaVersion: 1,
    reviewVersion: FISCAL_NOTIFICATION_VERTICAL_SLICE_REVIEW_VERSION_V1,
    status: analysis.status,
    documents,
    sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
    retainedSourceContent: "NONE",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
    permitsDebtCreation: false,
    permitsDeadlineCreation: false,
    permitsPaymentAction: false,
    permitsAccountingAction: false,
  });
}

/**
 * Projects an already validated observational extractor output into the same
 * review contract used by the vertical slice. This is the integration point
 * for the legacy structured adapters; direct identity remains filtered by
 * commonFields and an act without observable fields cannot create a card.
 */
export function projectFiscalNotificationExtractorOutputReviewV1(
  output: ExtractorOutputV1,
): FiscalNotificationVerticalSliceReviewV1 {
  const fields =
    output.status === "REVIEW_REQUIRED" &&
    output.familyCandidates.length === 1
      ? commonFields(output)
      : [];
  const documents =
    fields.length > 0
      ? [
          documentProjection(
            output.extractorId,
            output,
            fields,
            "Datos observados en el documento",
          ),
        ]
      : [];
  return parseFiscalNotificationVerticalSliceReviewV1({
    schemaVersion: 1,
    reviewVersion: FISCAL_NOTIFICATION_VERTICAL_SLICE_REVIEW_VERSION_V1,
    status: documents.length > 0 ? "REVIEW_REQUIRED" : "INFORMATION_PENDING",
    documents,
    sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
    retainedSourceContent: "NONE",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
    permitsDebtCreation: false,
    permitsDeadlineCreation: false,
    permitsPaymentAction: false,
    permitsAccountingAction: false,
  });
}

export function createEmptyFiscalNotificationVerticalSliceReviewV1(
  status: "INFORMATION_PENDING" | "BLOCKED" = "INFORMATION_PENDING",
): FiscalNotificationVerticalSliceReviewV1 {
  return parseFiscalNotificationVerticalSliceReviewV1({
    schemaVersion: 1,
    reviewVersion: FISCAL_NOTIFICATION_VERTICAL_SLICE_REVIEW_VERSION_V1,
    status,
    documents: [],
    sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
    retainedSourceContent: "NONE",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
    permitsDebtCreation: false,
    permitsDeadlineCreation: false,
    permitsPaymentAction: false,
    permitsAccountingAction: false,
  });
}

export function parseFiscalNotificationVerticalSliceReviewV1(
  value: unknown,
): FiscalNotificationVerticalSliceReviewV1 {
  try {
    const root = snapshotRecord(value);
    assertKeys(root, [
      "schemaVersion",
      "reviewVersion",
      "status",
      "documents",
      "sourceContentPolicy",
      "retainedSourceContent",
      "requiresHumanReview",
      "materializationPolicy",
      "permitsDebtCreation",
      "permitsDeadlineCreation",
      "permitsPaymentAction",
      "permitsAccountingAction",
    ]);
    if (
      root.schemaVersion !== 1 ||
      root.reviewVersion !==
        FISCAL_NOTIFICATION_VERTICAL_SLICE_REVIEW_VERSION_V1 ||
      !["REVIEW_REQUIRED", "INFORMATION_PENDING", "BLOCKED"].includes(
        String(root.status),
      ) ||
      root.sourceContentPolicy !== "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST" ||
      root.retainedSourceContent !== "NONE" ||
      root.requiresHumanReview !== true ||
      root.materializationPolicy !== "PROHIBITED_UNTIL_HUMAN_REVIEW" ||
      root.permitsDebtCreation !== false ||
      root.permitsDeadlineCreation !== false ||
      root.permitsPaymentAction !== false ||
      root.permitsAccountingAction !== false
    )
      throw invalidReview();
    const documentValues = snapshotArray(
      root.documents,
      FISCAL_NOTIFICATION_VERTICAL_SLICE_REVIEW_LIMITS_V1.maxDocuments,
    );
    if ((root.status === "REVIEW_REQUIRED") !== documentValues.length > 0) {
      throw invalidReview();
    }
    const seenDocuments = new Set<string>();
    const documents = documentValues.map((item) => {
      const document = parseReviewDocument(item);
      if (seenDocuments.has(document.reviewDocumentId)) throw invalidReview();
      seenDocuments.add(document.reviewDocumentId);
      return document;
    });
    return Object.freeze({
      schemaVersion: 1,
      reviewVersion: FISCAL_NOTIFICATION_VERTICAL_SLICE_REVIEW_VERSION_V1,
      status: root.status as FiscalNotificationVerticalSliceReviewV1["status"],
      documents: Object.freeze(documents),
      sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
      retainedSourceContent: "NONE",
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
      permitsDebtCreation: false,
      permitsDeadlineCreation: false,
      permitsPaymentAction: false,
      permitsAccountingAction: false,
    });
  } catch (error) {
    if (error instanceof FiscalNotificationVerticalSliceReviewErrorV1)
      throw error;
    throw invalidReview();
  }
}

export class FiscalNotificationVerticalSliceReviewErrorV1 extends Error {
  constructor(readonly code: "INVALID" | "PRIVACY_REJECTED" = "INVALID") {
    super(`FISCAL_NOTIFICATION_VERTICAL_SLICE_REVIEW_${code}`);
    this.name = "FiscalNotificationVerticalSliceReviewErrorV1";
  }
}

function projectRequirement(
  output: NonNullable<
    FiscalNotificationVerticalSliceAnalysisV1["extractions"]["formalFilingRequirement"]
  >,
) {
  const documentationRequest =
    output.familyCandidates[0]?.familyId === "compliance.document_request";
  const fields = commonFields(output);
  addStatus(
    fields,
    "Requerimiento pendiente de revisión",
    pagesForOutput(output),
  );
  addTextFact(fields, "REASON", "Motivo", output.requirementFacts.reason);
  output.requirementFacts.obligations.forEach((item, index) => {
    fields.push(
      field({
        fieldId: `obligation:${index + 1}`,
        semantic: "OBLIGATION",
        canonicalType: "OBLIGATION",
        label: "Obligación solicitada",
        displayValue: CLOSED_FACT_VALUE,
        normalizedValue: "MODEL_PERIOD_OBLIGATION",
        sourcePageNumbers: [item.sourcePage],
        sourceLabel: "Obligación solicitada",
      }),
    );
  });
  addTextFact(
    fields,
    "RESPONSE_CHANNEL",
    "Canal de respuesta",
    output.requirementFacts.responseChannel,
  );
  output.requirementFacts.documentationRequired.forEach((item, index) =>
    addTextFact(
      fields,
      "DOCUMENTATION_REQUIRED",
      `Documentación ${index + 1}`,
      item,
    ),
  );
  output.requirementFacts.explicitConsequences.forEach((item, index) =>
    addTextFact(
      fields,
      "EXPLICIT_CONSEQUENCE",
      `Consecuencia indicada ${index + 1}`,
      item,
    ),
  );
  return documentProjection(
    "requirement",
    output,
    fields,
    documentationRequest
      ? "Documentación solicitada pendiente de revisión"
      : "Requerimiento formal de presentación",
  );
}

function projectNotificationEnvelope(
  output: NonNullable<
    FiscalNotificationVerticalSliceAnalysisV1["extractions"]["notificationEnvelope"]
  >,
) {
  const fields = commonFields(output);
  const state = notificationStateLabel(
    output.notificationEnvelopeFacts.notificationState,
  );
  addStatus(fields, state, pagesForOutput(output));
  addTextFact(
    fields,
    "PRINTED_NOTIFICATION_STATE",
    "Estado",
    output.notificationEnvelopeFacts.printedState,
  );
  addTextFact(
    fields,
    "NOTIFICATION_SUBJECT",
    "Asunto",
    output.notificationEnvelopeFacts.subject,
  );
  addTextFact(
    fields,
    "NOTIFICATION_CHANNEL",
    "Canal",
    output.notificationEnvelopeFacts.channel,
  );
  return documentProjection("notification-envelope", output, fields, state);
}

function projectAssessment(
  output: NonNullable<
    FiscalNotificationVerticalSliceAnalysisV1["extractions"]["assessment"]
  >,
) {
  const fields = commonFields(output);
  const stage =
    output.assessmentFacts.stage === "FINAL_PROVISIONAL_ASSESSMENT"
      ? "Liquidación provisional emitida"
      : "Propuesta de liquidación y alegaciones";
  addStatus(fields, stage, pagesForOutput(output));
  addTextFact(fields, "REASON", "Motivo", output.assessmentFacts.reason);
  output.assessmentFacts.factsAndGrounds.forEach((item, index) =>
    addTextFact(
      fields,
      "FACT_OR_GROUND",
      `Hecho o fundamento ${index + 1}`,
      item,
    ),
  );
  output.assessmentFacts.printedAppealInformation.forEach((item, index) =>
    addTextFact(
      fields,
      "APPEAL_INFORMATION",
      `Recurso indicado ${index + 1}`,
      item,
    ),
  );
  return documentProjection("assessment", output, fields, stage);
}

function projectDeferralDenial(
  output: NonNullable<
    FiscalNotificationVerticalSliceAnalysisV1["extractions"]["deferralDenial"]
  >,
) {
  const fields = commonFields(output, { includeMoney: false });
  addStatus(
    fields,
    "Solicitud de aplazamiento denegada",
    pagesForOutput(output),
  );
  const facts = output.deferralDenialFacts;
  addTextFact(
    fields,
    "DEFERRAL_REASON",
    "Motivo de la denegación",
    facts.reason,
  );
  facts.debtDescriptions.forEach((item, index) =>
    addTextFact(
      fields,
      "DEBT_DESCRIPTION",
      `Deuda afectada ${index + 1}`,
      item,
    ),
  );
  facts.originalDebtDueDates.forEach((item, index) =>
    addTextFact(
      fields,
      "ORIGINAL_DEBT_DUE_DATE",
      `Vencimiento original ${index + 1}`,
      item,
    ),
  );
  addTextFact(
    fields,
    "PAYMENT_MEDIUM",
    "Dónde indica que puede pagarse",
    facts.paymentChannel,
  );
  facts.explicitConsequences.forEach((item, index) =>
    addTextFact(
      fields,
      "EXPLICIT_CONSEQUENCE",
      `Consecuencia indicada ${index + 1}`,
      item,
    ),
  );
  addTextFact(
    fields,
    "PRINTED_RESOURCES",
    "Recursos indicados",
    facts.printedAppealInformation,
  );
  output.monetaryComponents.forEach((item) =>
    fields.push(
      field({
        fieldId: `money:${item.componentId}`,
        semantic: "MONEY",
        canonicalType: item.componentType,
        label: MONEY_LABEL[item.componentType],
        displayValue: formatCents(item.amountCents, item.sign),
        amountCents: item.amountCents,
        currency: "EUR",
        sourcePageNumbers: [item.sourcePage],
        sourceLabel: MONEY_LABEL[item.componentType],
        confidence: item.extractionConfidence,
      }),
    ),
  );
  return documentProjection(
    "deferral",
    output,
    fields,
    "La AEAT ha denegado la solicitud; revisa motivo, pago y recurso",
  );
}

function projectPaymentOrder(
  output: NonNullable<
    FiscalNotificationVerticalSliceAnalysisV1["extractions"]["paymentOrder"]
  >,
) {
  const fields = commonFields(output);
  addStatus(fields, "Orden de pago", pagesForOutput(output));
  addTextFact(
    fields,
    "PAYMENT_MEDIUM",
    "Medio o lugar de pago",
    output.paymentOrderFacts.paymentChannel,
  );
  addTextFact(
    fields,
    "COLLABORATING_ENTITY",
    "Entidad colaboradora",
    output.paymentOrderFacts.collaboratingEntity,
  );
  addMaskedFact(fields, output.paymentOrderFacts.maskedBankAccount);
  addTextFact(
    fields,
    "BARCODE_REFERENCE",
    "Código de barras o referencia",
    output.paymentOrderFacts.barcodeReference,
  );
  return documentProjection(
    "payment-order",
    output,
    fields,
    "Orden de pago · no acredita pago",
  );
}

function projectPaymentEvidence(
  output: NonNullable<
    FiscalNotificationVerticalSliceAnalysisV1["extractions"]["paymentEvidence"]
  >,
) {
  const fields = commonFields(output);
  addStatus(
    fields,
    paymentStateLabel(output.paymentEvidenceFacts.paymentState),
    pagesForOutput(output),
  );
  addTextFact(
    fields,
    "PAYMENT_TIME",
    "Hora del pago",
    output.paymentEvidenceFacts.paymentTime,
  );
  addTextFact(
    fields,
    "COLLABORATING_ENTITY",
    "Entidad",
    output.paymentEvidenceFacts.collaboratingEntity,
  );
  addTextFact(
    fields,
    "PAYMENT_MEDIUM",
    "Medio de pago",
    output.paymentEvidenceFacts.paymentMedium,
  );
  addTextFact(
    fields,
    "PAYMENT_RESULT",
    "Resultado",
    output.paymentEvidenceFacts.result,
  );
  addTextFact(
    fields,
    "REJECTION_REASON",
    "Motivo del rechazo",
    output.paymentEvidenceFacts.rejectionReason,
  );
  addMaskedFact(fields, output.paymentEvidenceFacts.maskedBankAccount);
  addTextFact(
    fields,
    "PAYMENT_SCOPE",
    "Alcance del pago",
    output.paymentEvidenceFacts.paymentScope,
  );
  return documentProjection(
    "payment-evidence",
    output,
    fields,
    paymentStateLabel(output.paymentEvidenceFacts.paymentState),
  );
}

function projectSeizure(
  output: NonNullable<
    FiscalNotificationVerticalSliceAnalysisV1["extractions"]["seizure"]
  >,
  assetFingerprintSha256: string | null,
) {
  const fields = commonFields(output, { includeMoney: false });
  if (assetFingerprintSha256) {
    fields.push(
      field({
        fieldId: "reference:asset-fingerprint",
        semantic: "REFERENCE",
        canonicalType: "VEHICLE_OR_FINE_REFERENCE",
        label: REFERENCE_LABEL.VEHICLE_OR_FINE_REFERENCE,
        displayValue: `Huella protegida ${assetFingerprintSha256.slice(0, 12)}…`,
        normalizedValue: assetFingerprintSha256,
        sourcePageNumbers: pagesForOutput(output),
        sourceLabel: REFERENCE_LABEL.VEHICLE_OR_FINE_REFERENCE,
        confidence: 1,
      }),
    );
  }
  const state = seizureStateLabel(output.seizureFacts.printedState);
  addStatus(fields, state, pagesForOutput(output));
  if (output.seizureFacts.recipientRole !== "UNKNOWN") {
    const recipientRole = seizureRecipientRoleLabel(
      output.seizureFacts.recipientRole,
    );
    fields.push(
      field({
        fieldId: "detail:SEIZURE_RECIPIENT_ROLE",
        semantic: "DETAIL",
        canonicalType: "SEIZURE_RECIPIENT_ROLE",
        label: "Papel del destinatario",
        displayValue: recipientRole,
        normalizedValue: recipientRole,
        sourcePageNumbers: pagesForOutput(output),
        sourceLabel: "Tipo exacto del documento",
      }),
    );
  }
  output.seizureFacts.moneyFacts.forEach((item, index) =>
    fields.push(
      field({
        fieldId: `seizure-money:${index + 1}:${item.role}`,
        semantic: "MONEY",
        canonicalType:
          item.role === "PRINCIPAL" ? "OUTSTANDING_PRINCIPAL" : item.role,
        label: SEIZURE_MONEY_LABEL[item.role],
        displayValue: formatCents(item.amountCents, item.sign),
        amountCents: item.amountCents,
        currency: "EUR",
        sourcePageNumbers: [item.sourcePage],
        sourceLabel: SEIZURE_MONEY_LABEL[item.role],
      }),
    ),
  );
  addTextFact(
    fields,
    "SEIZURE_INSTRUCTIONS",
    "Instrucciones",
    output.seizureFacts.instructions,
  );
  addTextFact(
    fields,
    "PRINTED_RESOURCES",
    "Recursos indicados en el documento",
    output.seizureFacts.printedResources,
  );
  output.seizureFacts.specificFacts.forEach((item, index) =>
    addSeizureSpecificFact(fields, item, index),
  );
  return documentProjection("seizure", output, fields, state);
}

function commonFields(
  output: ExtractorOutputV1,
  options: Readonly<{ includeMoney: boolean }> = { includeMoney: true },
): FiscalNotificationVerticalSliceReviewFieldV1[] {
  const fields: FiscalNotificationVerticalSliceReviewFieldV1[] = [];
  output.references.forEach((item, index) => {
    if (item.referenceType === "NIF") return;
    const normalized = safeOfficialReference(
      item.referenceType,
      item.normalizedValue,
    );
    if (!normalized) return;
    fields.push(
      field({
        fieldId: `reference:${index + 1}:${item.referenceType}`,
        semantic: "REFERENCE",
        canonicalType: item.referenceType,
        label: REFERENCE_LABEL[item.referenceType],
        displayValue: SENSITIVE_REFERENCE_TYPES.has(item.referenceType)
          ? `Huella protegida ${normalized.slice(0, 12)}…`
          : normalized,
        normalizedValue: normalized,
        sourcePageNumbers: [item.sourcePage],
        sourceLabel: REFERENCE_LABEL[item.referenceType],
        confidence: item.confidence,
      }),
    );
  });
  if (options.includeMoney) {
    output.monetaryComponents.forEach((item) =>
      fields.push(
        field({
          fieldId: `money:${item.componentId}`,
          semantic: "MONEY",
          canonicalType: item.componentType,
          label: MONEY_LABEL[item.componentType],
          displayValue: formatCents(item.amountCents, item.sign),
          amountCents: item.amountCents,
          currency: "EUR",
          sourcePageNumbers: [item.sourcePage],
          sourceLabel: MONEY_LABEL[item.componentType],
          confidence: item.extractionConfidence,
        }),
      ),
    );
  }
  output.proceduralDates.forEach((item) => {
    if (!item.parsedDate || !isValidIsoDate(item.parsedDate)) return;
    fields.push(
      field({
        fieldId: `date:${item.proceduralDateId}`,
        semantic: "DATE",
        canonicalType: item.dateType,
        label: DATE_LABEL[item.dateType],
        displayValue: formatIsoDate(item.parsedDate),
        normalizedValue: item.parsedDate,
        sourcePageNumbers: [item.sourcePage],
        sourceLabel: DATE_LABEL[item.dateType],
        confidence: item.extractionConfidence,
      }),
    );
  });
  output.entities.forEach((entity, entityIndex) => {
    if (entity.entityKind !== "PARTY" || entity.displayName === null) return;
    entity.roles.forEach((role, roleIndex) =>
      fields.push(
        field({
          fieldId: `party:${entityIndex + 1}:${roleIndex + 1}`,
          semantic: "PARTY",
          canonicalType: role,
          label: PARTY_LABEL[role],
          displayValue:
            role === "ISSUING_AUTHORITY"
              ? safeAuthorityRole(entity.displayName!)
              : PARTY_LABEL[role],
          normalizedValue:
            role === "ISSUING_AUTHORITY"
              ? safeAuthorityRole(entity.displayName!) === "AEAT"
                ? "AEAT"
                : "OTHER_AUTHORITY"
              : PARTY_LABEL[role],
          sourcePageNumbers: pagesFromEvidence(
            entity.evidence.sourceSegmentIds,
            output,
          ),
          sourceLabel: PARTY_LABEL[role],
          confidence: entity.evidence.confidence,
        }),
      ),
    );
  });
  return fields;
}

function addSeizureSpecificFact(
  fields: FiscalNotificationVerticalSliceReviewFieldV1[],
  factValue: SeizureSpecificFactV1,
  index: number,
): void {
  if (OMITTED_PRIVATE_DETAIL_TYPES.has(factValue.fieldId)) return;
  fields.push(
    field({
      fieldId: `seizure-specific:${index + 1}:${factValue.fieldId}`,
      semantic: "DETAIL",
      canonicalType: factValue.fieldId,
      label: SEIZURE_SPECIFIC_LABEL[factValue.fieldId],
      displayValue: CLOSED_FACT_VALUE,
      normalizedValue: factValue.fieldId,
      sourcePageNumbers: factValue.pageNumbers,
      sourceLabel: SEIZURE_SPECIFIC_LABEL[factValue.fieldId],
    }),
  );
}

function documentProjection(
  extractorId: BaseExtractorIdV1,
  output: ExtractorOutputV1,
  fields: FiscalNotificationVerticalSliceReviewFieldV1[],
  subtitle: string,
): FiscalNotificationVerticalSliceReviewDocumentV1 {
  const candidate = output.familyCandidates[0];
  if (!candidate || !FAMILY_TITLE[candidate.familyId]) throw invalidReview();
  const pages = Object.freeze(
    [
      ...new Set([
        ...pagesForOutput(output),
        ...fields.flatMap((item) => item.sourcePageNumbers),
      ]),
    ].sort((left, right) => left - right),
  );
  return Object.freeze({
    reviewDocumentId: `review-document:${extractorId}`,
    extractorId,
    familyId: candidate.familyId,
    title: FAMILY_TITLE[candidate.familyId]!,
    subtitle,
    pageFrom: pages[0]!,
    pageTo: pages.at(-1)!,
    confidence: candidate.confidence,
    fields: Object.freeze(fields),
    warnings: Object.freeze(
      [...new Set(output.warnings)].filter((warning) =>
        CLOSED_WARNING_CODE.test(warning),
      ),
    ),
    requiresHumanReview: true,
  });
}

function addStatus(
  fields: FiscalNotificationVerticalSliceReviewFieldV1[],
  value: string,
  pages: readonly number[],
): void {
  fields.unshift(
    field({
      fieldId: "status:document",
      semantic: "STATUS",
      canonicalType: "DOCUMENT_STATUS",
      label: "Estado del documento",
      displayValue: value,
      sourcePageNumbers: pages,
      sourceLabel: "Estado extraído del documento",
    }),
  );
}

type PrintedTextFact = Readonly<{
  printedValue: string;
  pageNumbers: readonly number[];
  sourceLabel: string;
}>;

function addTextFact(
  fields: FiscalNotificationVerticalSliceReviewFieldV1[],
  canonicalType: Extract<(typeof DETAIL_CANONICAL_TYPES)[number], string>,
  label: string,
  fact: PrintedTextFact | null,
): void {
  if (!fact || OMITTED_PRIVATE_DETAIL_TYPES.has(canonicalType)) return;
  fields.push(
    field({
      fieldId: `detail:${canonicalType}:${fields.length + 1}`,
      semantic: "DETAIL",
      canonicalType,
      label,
      displayValue: OBSERVED_FACT_VALUE,
      normalizedValue: canonicalType,
      sourcePageNumbers: fact.pageNumbers,
      sourceLabel: label,
    }),
  );
}

function addMaskedFact(
  fields: FiscalNotificationVerticalSliceReviewFieldV1[],
  fact: Readonly<{
    maskedValue: string;
    sourcePage: number;
    sourceLabel: string;
  }> | null,
): void {
  // Even a partially masked account is personal financial data. The legacy
  // extractor may use it ephemerally, but this serializable review boundary
  // deliberately drops it.
  void fact;
}

function field(input: {
  fieldId: string;
  semantic: FiscalNotificationVerticalSliceFieldSemanticV1;
  canonicalType: FiscalNotificationVerticalSliceCanonicalFieldTypeV1;
  label: string;
  displayValue: string;
  normalizedValue?: string | null;
  amountCents?: number | null;
  currency?: "EUR" | null;
  sourcePageNumbers: readonly number[];
  sourceLabel: string;
  confidence?: number;
}): FiscalNotificationVerticalSliceReviewFieldV1 {
  return Object.freeze({
    ...input,
    sourceLabel: input.label,
    normalizedValue: input.normalizedValue ?? null,
    amountCents: input.amountCents ?? null,
    currency: input.currency ?? null,
    sourcePageNumbers: Object.freeze([...input.sourcePageNumbers]),
    confidence: input.confidence ?? 1,
    reviewStatus: "REVIEW_REQUIRED",
  });
}

function pagesForOutput(output: ExtractorOutputV1): readonly number[] {
  const pages = new Set<number>();
  output.familyCandidates.forEach((candidate) => {
    candidate.matchingEvidenceIds.forEach((segmentId) => {
      const match = /:(\d+)-(\d+)$/u.exec(segmentId);
      if (!match) return;
      for (let page = Number(match[1]); page <= Number(match[2]); page += 1) {
        pages.add(page);
      }
    });
  });
  output.references.forEach((item) => pages.add(item.sourcePage));
  output.monetaryComponents.forEach((item) => pages.add(item.sourcePage));
  output.proceduralDates.forEach((item) => pages.add(item.sourcePage));
  output.entities.forEach((entity) => {
    entity.evidence.sourceSegmentIds.forEach((segmentId) => {
      const match = /:(\d+)-(\d+)$/u.exec(segmentId);
      if (!match) return;
      for (let page = Number(match[1]); page <= Number(match[2]); page += 1)
        pages.add(page);
    });
  });
  if (pages.size === 0) throw invalidReview();
  return Object.freeze([...pages].sort((left, right) => left - right));
}

function pagesFromEvidence(
  segmentIds: readonly string[],
  output: ExtractorOutputV1,
): readonly number[] {
  const pages = new Set<number>();
  segmentIds.forEach((segmentId) => {
    const match = /:(\d+)-(\d+)$/u.exec(segmentId);
    if (!match) return;
    for (let page = Number(match[1]); page <= Number(match[2]); page += 1)
      pages.add(page);
  });
  return pages.size > 0
    ? Object.freeze([...pages].sort((a, b) => a - b))
    : pagesForOutput(output);
}

function safeOfficialReference(
  referenceType: ReferenceTypeV1,
  value: string,
): string | null {
  if (referenceType === "NIF") return null;
  if (SENSITIVE_REFERENCE_TYPES.has(referenceType)) {
    return SHA256_FINGERPRINT.test(value) ? value : null;
  }
  let normalized: string;
  try {
    normalized = value
      .normalize("NFKC")
      .toLocaleUpperCase("es")
      .replace(/[\t \u00a0]+/gu, "");
  } catch {
    return null;
  }
  return normalized.length > 0 &&
    normalized.length <=
      FISCAL_NOTIFICATION_VERTICAL_SLICE_REVIEW_LIMITS_V1.maxNormalizedValueChars &&
    /^[A-Z0-9][A-Z0-9./:_-]*$/u.test(normalized) &&
    /\d/u.test(normalized) &&
    !PII_LIKE_REFERENCE.test(normalized)
    ? normalized
    : null;
}

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString().slice(0, 10) === value
  );
}

function formatIsoDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function safeAuthorityRole(value: string): "AEAT" | "Otra autoridad" {
  let normalized: string;
  try {
    normalized = value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/gu, "")
      .toLocaleUpperCase("es")
      .trim();
  } catch {
    return "Otra autoridad";
  }
  return normalized === "AEAT" ||
    normalized === "AGENCIA TRIBUTARIA" ||
    normalized === "AGENCIA ESTATAL DE ADMINISTRACION TRIBUTARIA" ||
    normalized.startsWith("AGENCIA ESTATAL DE ADMINISTRACION TRIBUTARIA ")
    ? "AEAT"
    : "Otra autoridad";
}

function formatCents(
  amountCents: number,
  sign: "POSITIVE" | "NEGATIVE",
): string {
  const euros = String(Math.floor(amountCents / 100)).replace(
    /\B(?=(\d{3})+(?!\d))/gu,
    ".",
  );
  const cents = String(amountCents % 100).padStart(2, "0");
  return `${sign === "NEGATIVE" ? "−" : ""}${euros},${cents} €`;
}

function paymentStateLabel(state: PaymentEvidenceStateV1): string {
  const labels: Readonly<Record<PaymentEvidenceStateV1, string>> =
    Object.freeze({
      CONFIRMED: "Pago confirmado en el justificante",
      PARTIAL: "Pago parcial confirmado en el justificante",
      ATTEMPTED: "Intento de pago",
      REJECTED: "Pago rechazado",
      CANCELLED: "Pago anulado",
      RETURNED: "Pago devuelto",
      UNKNOWN: "Resultado de pago pendiente de revisión",
    });
  return labels[state];
}

function notificationStateLabel(state: NotificationEnvelopeStateV1): string {
  const labels: Readonly<Record<NotificationEnvelopeStateV1, string>> =
    Object.freeze({
      AVAILABLE: "Notificación puesta a disposición",
      ACCESSED: "Notificación accedida o aceptada",
      REJECTED: "Notificación rechazada",
      EXPIRED: "Notificación expirada",
      ATTEMPTED: "Intento de notificación",
      DELIVERED: "Notificación entregada",
      PUBLISHED: "Notificación publicada",
      UNKNOWN: "Estado de notificación pendiente de revisión",
    });
  return labels[state];
}

function seizureStateLabel(state: SeizurePrintedStateV1 | null): string {
  const labels: Readonly<Record<SeizurePrintedStateV1, string>> = Object.freeze(
    {
      SEIZURE_ORDER_RECORDED_REVIEW_REQUIRED:
        "Diligencia de embargo registrada",
      RELEASE_RECORDED_REVIEW_REQUIRED: "Levantamiento de embargo registrado",
      THIRD_PARTY_RESPONSE_RECORDED_REVIEW_REQUIRED:
        "Contestación de tercero registrada",
      THIRD_PARTY_PAYMENT_RECORDED_REVIEW_REQUIRED:
        "Ingreso de tercero registrado",
    },
  );
  return state ? labels[state] : "Documento de embargo registrado";
}

function seizureRecipientRoleLabel(role: SeizureRecipientRoleV1): string {
  const labels: Readonly<Record<SeizureRecipientRoleV1, string>> =
    Object.freeze({
      DEBTOR: "Deudor",
      FINANCIAL_ENTITY: "Entidad financiera destinataria",
      COMMERCIAL_OR_RENT_PAYER: "Pagador comercial o arrendaticio",
      EMPLOYER_OR_PENSION_PAYER: "Empleador o pagador de pensión",
      PAYMENT_SERVICE_PROVIDER: "Proveedor de servicios de pago",
      GARNISHED_THIRD_PARTY: "Tercero obligado por el embargo",
      UNKNOWN: "Papel pendiente de revisión",
    });
  return labels[role];
}

function parseReviewDocument(
  value: unknown,
): FiscalNotificationVerticalSliceReviewDocumentV1 {
  const item = snapshotRecord(value);
  const documentKeys = [
    "reviewDocumentId",
    "extractorId",
    "familyId",
    "title",
    "subtitle",
    "pageFrom",
    "pageTo",
    "confidence",
    "fields",
    "warnings",
    "requiresHumanReview",
    ...(Object.hasOwn(item, "amountReconciliation")
      ? ["amountReconciliation"]
      : []),
    ...(Object.hasOwn(item, "mathematicalIntegrity")
      ? ["mathematicalIntegrity"]
      : []),
  ];
  assertKeys(item, documentKeys);
  assertBoundedString(item.reviewDocumentId, 160);
  if (!EXTRACTOR_IDS.has(item.extractorId as BaseExtractorIdV1))
    throw invalidReview();
  if (!FAMILY_IDS.has(item.familyId as FiscalNotificationReviewFamilyIdV9))
    throw invalidReview();
  assertBoundedString(
    item.title,
    FISCAL_NOTIFICATION_VERTICAL_SLICE_REVIEW_LIMITS_V1.maxLabelChars,
  );
  assertBoundedString(
    item.subtitle,
    FISCAL_NOTIFICATION_VERTICAL_SLICE_REVIEW_LIMITS_V1.maxLabelChars,
  );
  const familyId = item.familyId as FiscalNotificationReviewFamilyIdV9;
  const canonicalTitle =
    resolveFamilyRuleV2(familyId)?.canonicalTitle ??
    resolveAeatP0DeepProfileV10(familyId)?.titleEs ??
    resolveAeatOfficialCatalogProfileV9(familyId)?.nameEs;
  if (
    (item.title !== FAMILY_TITLE[familyId] &&
      item.title !== canonicalTitle &&
      item.title !== "Documento de recaudación" &&
      item.title !== "Liquidación de intereses de demora") ||
    !SAFE_SUBTITLE_VALUES.has(item.subtitle as string)
  ) {
    throw invalidReview();
  }
  assertPage(item.pageFrom);
  assertPage(item.pageTo);
  if (Number(item.pageTo) < Number(item.pageFrom)) throw invalidReview();
  assertConfidence(item.confidence);
  if (item.requiresHumanReview !== true) throw invalidReview();
  const fieldValues = snapshotArray(
    item.fields,
    FISCAL_NOTIFICATION_VERTICAL_SLICE_REVIEW_LIMITS_V1.maxFieldsPerDocument,
  );
  if (fieldValues.length === 0) throw invalidReview();
  const seenFields = new Set<string>();
  const fields = fieldValues.map((fieldValue) => {
    const reviewField = parseReviewField(
      fieldValue,
      Number(item.pageFrom),
      Number(item.pageTo),
    );
    if (seenFields.has(reviewField.fieldId)) throw invalidReview();
    seenFields.add(reviewField.fieldId);
    return reviewField;
  });
  const warnings = snapshotArray(
    item.warnings,
    FISCAL_NOTIFICATION_VERTICAL_SLICE_REVIEW_LIMITS_V1.maxWarningsPerDocument,
  ).map((warning) => {
    assertBoundedString(warning, 240);
    if (!CLOSED_WARNING_CODE.test(warning as string)) throw invalidReview();
    return warning as string;
  });
  const amountReconciliation = Object.hasOwn(item, "amountReconciliation")
    ? parseFiscalNotificationAmountReconciliationV1(
        item.amountReconciliation,
        Number(item.pageFrom),
        Number(item.pageTo),
      )
    : null;
  const mathematicalIntegrity = Object.hasOwn(item, "mathematicalIntegrity")
    ? parseFiscalNotificationMathematicalIntegrityV11(
        item.mathematicalIntegrity,
        Number(item.pageFrom),
        Number(item.pageTo),
      )
    : null;
  return Object.freeze({
    reviewDocumentId: item.reviewDocumentId as string,
    extractorId: item.extractorId as BaseExtractorIdV1,
    familyId: item.familyId as FiscalNotificationReviewFamilyIdV9,
    title: item.title as string,
    subtitle: item.subtitle as string,
    pageFrom: Number(item.pageFrom),
    pageTo: Number(item.pageTo),
    confidence: Number(item.confidence),
    fields: Object.freeze(fields),
    warnings: Object.freeze(warnings),
    ...(amountReconciliation ? { amountReconciliation } : {}),
    ...(mathematicalIntegrity ? { mathematicalIntegrity } : {}),
    requiresHumanReview: true,
  });
}

function parseReviewField(
  value: unknown,
  pageFrom: number,
  pageTo: number,
): FiscalNotificationVerticalSliceReviewFieldV1 {
  const item = snapshotRecord(value);
  assertKeys(item, [
    "fieldId",
    "semantic",
    "canonicalType",
    "label",
    "displayValue",
    "normalizedValue",
    "amountCents",
    "currency",
    "sourcePageNumbers",
    "sourceLabel",
    "confidence",
    "reviewStatus",
  ]);
  assertBoundedString(item.fieldId, 160);
  if (!FIELD_SEMANTICS.has(String(item.semantic))) throw invalidReview();
  if (!isCanonicalTypeValid(String(item.semantic), item.canonicalType))
    throw invalidReview();
  assertBoundedString(
    item.label,
    FISCAL_NOTIFICATION_VERTICAL_SLICE_REVIEW_LIMITS_V1.maxLabelChars,
  );
  if (!isControlledFieldLabel(item.label as string)) throw invalidReview();
  assertBoundedString(
    item.displayValue,
    FISCAL_NOTIFICATION_VERTICAL_SLICE_REVIEW_LIMITS_V1.maxDisplayValueChars,
  );
  if (item.normalizedValue !== null) {
    assertBoundedString(
      item.normalizedValue,
      FISCAL_NOTIFICATION_VERTICAL_SLICE_REVIEW_LIMITS_V1.maxNormalizedValueChars,
    );
  }
  const money = item.semantic === "MONEY";
  if (money) {
    assertNonNegativeIntegerCents(
      item.amountCents,
      "verticalSliceReview.amountCents",
    );
    if (item.currency !== "EUR") throw invalidReview();
  } else if (item.amountCents !== null || item.currency !== null) {
    throw invalidReview();
  }
  const pageValues = snapshotArray(
    item.sourcePageNumbers,
    FISCAL_NOTIFICATION_INPUT_LIMITS.maxPages,
  );
  if (pageValues.length === 0) throw invalidReview();
  const seenPages = new Set<number>();
  const sourcePageNumbers = pageValues.map((page) => {
    assertPage(page);
    const pageNumber = Number(page);
    if (
      pageNumber < pageFrom ||
      pageNumber > pageTo ||
      seenPages.has(pageNumber)
    )
      throw invalidReview();
    seenPages.add(pageNumber);
    return pageNumber;
  });
  assertBoundedString(
    item.sourceLabel,
    FISCAL_NOTIFICATION_VERTICAL_SLICE_REVIEW_LIMITS_V1.maxSourceLabelChars,
  );
  if (!isControlledFieldLabel(item.sourceLabel as string)) {
    throw invalidReview();
  }
  assertConfidence(item.confidence);
  if (item.reviewStatus !== "REVIEW_REQUIRED") throw invalidReview();
  try {
    assertSerializableFieldPrivacy(item);
  } catch (error) {
    if (error instanceof FiscalNotificationVerticalSliceReviewErrorV1) {
      throw new FiscalNotificationVerticalSliceReviewErrorV1(
        "PRIVACY_REJECTED",
      );
    }
    throw error;
  }
  return Object.freeze({
    fieldId: item.fieldId as string,
    semantic: item.semantic as FiscalNotificationVerticalSliceFieldSemanticV1,
    canonicalType:
      item.canonicalType as FiscalNotificationVerticalSliceCanonicalFieldTypeV1,
    label: item.label as string,
    displayValue: item.displayValue as string,
    normalizedValue: item.normalizedValue as string | null,
    amountCents: money ? Number(item.amountCents) : null,
    currency: money ? "EUR" : null,
    sourcePageNumbers: Object.freeze(sourcePageNumbers),
    sourceLabel: item.sourceLabel as string,
    confidence: Number(item.confidence),
    reviewStatus: "REVIEW_REQUIRED",
  });
}

function isControlledFieldLabel(value: string): boolean {
  if (
    AEAT_P0_DEEP_REVIEW_CONTROLLED_LABELS_V10.includes(value) ||
    value === "Título y anclas estructurales" ||
    AEAT_P0_DEEP_PROFILES_V10.some((profile) =>
      profile.canonicalFields.some((field) =>
        field.labelVariants.includes(value),
      ),
    )
  )
    return true;
  if (REAL_CORPUS_SAFE_LABELS_V2.has(value)) return true;
  if (
    [
      ...Object.values(REFERENCE_LABEL),
      ...Object.values(MONEY_LABEL),
      ...Object.values(DATE_LABEL),
      ...Object.values(PARTY_LABEL),
      ...Object.values(SEIZURE_MONEY_LABEL),
      ...Object.values(SEIZURE_SPECIFIC_LABEL),
      ...PROFILE_FIELD_LABELS_V2.map((entry) => entry.labelEs),
      "Estado del documento",
      "Obligación solicitada",
      "Motivo",
      "Canal de respuesta",
      "Estado",
      "Asunto",
      "Canal",
      "Motivo de la denegación",
      "Dónde indica que puede pagarse",
      "Recursos indicados",
      "Medio o lugar de pago",
      "Entidad colaboradora",
      "Código de barras o referencia",
      "Hora del pago",
      "Entidad",
      "Medio de pago",
      "Resultado",
      "Motivo del rechazo",
      "Alcance del pago",
      "Papel del destinatario",
      "Instrucciones",
      "Recursos indicados en el documento",
      "Reconocimiento documental",
      "Título del documento",
      "Total",
      "Fecha del documento",
      "Clave de liquidación",
      "Modelo",
      "Ejercicio",
      "Período",
      "Periodo fiscal",
      "Recargo ordinario del 20 %",
      "Total con recargo ordinario",
      "Importe con recargo reducido",
      "Recargo del 5 % si el principal ya se pagó",
      "Referencia de la carta de pago",
      "Importe de la carta de pago",
      "Referencia del acuerdo",
      "Principal concedido",
      "Intereses del plan",
      "Total del plan",
      "Forma prevista de pago",
      "Referencia de la diligencia",
      "Número de liquidación",
      "Fecha de la diligencia",
      "Fecha del embargo",
      "Deuda pendiente",
      "Importe embargado",
      "Total pendiente",
      "Límite del embargo",
      "Importe remitido al Tesoro",
      "Destinatario",
      "Bien afectado",
      "Destinatario operativo",
      "Modelo periódico citado",
      "Modelo anual esperado",
      "Inicio impreso del período",
      "Canal indicado",
      "Estructura lingüística",
      "Referencia de la devolución",
      "Devolución solicitada",
      "Devolución acordada",
      "Devolución ordenada",
      "Total deducciones",
      "Líquido cuya transferencia se ordena",
      "Estado de la devolución",
      "Modelo afectado",
      "Ejercicios afectados",
      "Canal retirado",
      "Canal disponible",
      "Referencia del embargo anterior",
      "Fecha del embargo anterior",
      "Fecha del levantamiento",
      "Tipo de bien",
      "Alcance",
      "Cancelación registral ordenada",
      "Referencia del certificado",
      "Fecha del certificado",
      "Motivo indicado",
      "Carta de pago adjunta",
      "Referencia del documento",
      "Referencia del procedimiento",
      "Referencia del acto",
      "Referencia de notificación",
      "Notificación anterior",
      "Número de diligencia",
      "Clave de deuda",
      "Fecha de firma",
      "Fecha del acto",
      "Fecha de la diligencia citada",
      "Fecha de notificación de la propuesta",
      "Fin del período voluntario",
      "Principal pendiente",
      "Cuota final",
      "Cuota propuesta",
      "Intereses de demora",
      "Total del documento",
      "Retenciones anuales declaradas",
      "Pagos periódicos declarados",
      "Principal original",
      "Intereses del aplazamiento",
      "Modelo tributario",
      "Modelo relacionado",
      "Ejercicio fiscal",
      "Estado del alta",
      "Nivel de registro",
      "Método de registro",
      "Fecha de alta",
      "Términos adjuntos",
      "Tipo de bien o derecho",
      "Alcance del levantamiento",
      "Regla del plazo",
      "Papel del tercero",
      "Cuenta o depósito",
      "Forma de pago",
      "Garantía",
      "Documentación necesaria",
      "Aviso sancionador",
      "Obligación de contestar",
      "Obligación si existe crédito",
      "Momento del ingreso",
      "Alcance de los créditos",
      "Motivo de la reiteración",
      "Consecuencia indicada",
      "Espera antes del ingreso bancario",
      "Estado de la notificación anterior",
      "Clave de la deuda denegada",
      "Principal denegado",
      "Regla del plazo tras denegación",
      "Estado de la retención",
      "Estado del ingreso al Tesoro",
      "Referencia del expediente sancionador",
      "Clave de la sanción",
      "Sanción inicial",
      "Porcentaje histórico de reducción",
      "Reducción aplicada",
      "Sanción reducida",
      "Tratamiento del porcentaje",
      "Clave de la sanción de origen",
      "Clave de la reducción exigida",
      "Reducción perdida exigida",
      "Alcance de la exigencia",
      "Clave de la liquidación de intereses",
      "Referencia de la solicitud",
      "Clave de la deuda principal",
      "Principal de la deuda de origen",
      "Intereses liquidados",
      "Inicio del cálculo de intereses",
      "Fin del cálculo de intereses",
      "Alcance de los intereses",
      "Subtotal de deudas",
      "Intereses indicados",
      "Costas indicadas",
      "Límite del embargo",
      "Total indicado en la carta",
      "Comparación de importes",
      "Sanción propuesta",
      "Reducción propuesta",
      "Sanción reducida propuesta",
      "Días hábiles para alegaciones",
      "Estado del procedimiento sancionador",
      "Estado del formulario de respuesta",
      "Días hábiles para responder",
      "Efecto del requerimiento",
      "Total de la deuda",
      "Importe anterior",
      "Compensación aplicada",
      "Saldo pendiente",
      "Crédito aplicado",
      "Fecha de publicación",
      "Fecha efectiva de notificación",
      "Fecha de solicitud",
      "Fecha de efectos",
      "Estado actual",
      "Principal del plan",
      "Intereses del plan",
      "Acuerdo sustituido",
      "Estado del calendario",
      "Organismo de origen",
      "Organismo recaudador",
      "Inicio de comprobación",
      "Saldo declarado rechazado",
      "Estado del procedimiento",
      "Modelo y período",
      "Ejercicio solicitado",
      "Qué es",
      "Qué resultado muestra",
      "Qué conviene hacer",
      "Cómo se cuenta el plazo",
      "Qué puede ocurrir",
    ].includes(value)
  ) {
    return true;
  }
  return /^(?:Documentación|Consecuencia indicada|Hecho o fundamento|Recurso indicado|Deuda afectada|Vencimiento original|Cuota|Organismo público|Deducción|Referencia de la deducción|Deuda ejecutiva citada|Importe de deuda ejecutiva citada|Deuda incluida|Importe de deuda incluida|Importe anterior|Compensación aplicada|Saldo pendiente) [1-9]\d*$/u.test(
    value,
  );
}

function assertSerializableFieldPrivacy(
  item: Readonly<Record<string, unknown>>,
): void {
  const semantic = String(item.semantic);
  const canonicalType = String(item.canonicalType);
  const displayValue = item.displayValue as string;
  const normalizedValue = item.normalizedValue as string | null;
  if (assertAeatP0DeepSerializableFieldPrivacyV10(item)) return;
  if (
    (semantic === "DETAIL" || semantic === "OBLIGATION") &&
    (assertRealCorpusSerializableFieldPrivacyV2(item) ||
      assertRealCorpusSerializableFieldPrivacyV3(item) ||
      assertRealCorpusSerializableFieldPrivacyV4(item) ||
      assertRealCorpusSerializableFieldPrivacyV5(item) ||
      assertRealCorpusSerializableFieldPrivacyV6(item) ||
      assertRealCorpusSerializableFieldPrivacyV7(item))
  ) {
    return;
  }
  switch (semantic) {
    case "REFERENCE": {
      if (canonicalType === "NIF" || normalizedValue === null) {
        throw invalidReview();
      }
      const safe = safeOfficialReference(
        canonicalType as ReferenceTypeV1,
        normalizedValue,
      );
      if (!safe || safe !== normalizedValue) throw invalidReview();
      if (SENSITIVE_REFERENCE_TYPES.has(canonicalType as ReferenceTypeV1)) {
        if (displayValue !== `Huella protegida ${safe.slice(0, 12)}…`) {
          throw invalidReview();
        }
      } else if (displayValue !== safe) {
        throw invalidReview();
      }
      return;
    }
    case "DATE":
      if (
        normalizedValue === null ||
        !isValidIsoDate(normalizedValue) ||
        displayValue !== formatIsoDate(normalizedValue)
      ) {
        throw invalidReview();
      }
      return;
    case "PARTY": {
      if (normalizedValue === null) throw invalidReview();
      if (canonicalType === "ISSUING_AUTHORITY") {
        if (!(
          (displayValue === "AEAT" && normalizedValue === "AEAT") ||
          (displayValue === "Otra autoridad" &&
            normalizedValue === "OTHER_AUTHORITY")
        )) {
          throw invalidReview();
        }
        return;
      }
      const humanRole = PARTY_LABEL[canonicalType as PartyRoleV1];
      const legacyMatch = /^Interviniente ([1-9]\d*)$/u.exec(displayValue);
      if (
        !(
          humanRole &&
          displayValue === humanRole &&
          normalizedValue === humanRole
        ) &&
        (!legacyMatch ||
          normalizedValue !== `ROLE:${canonicalType}:${legacyMatch[1]}`)
      ) {
        throw invalidReview();
      }
      return;
    }
    case "MASKED_VALUE":
      throw invalidReview();
    case "DETAIL":
    case "OBLIGATION":
      if (
        canonicalType === "SEIZURE_RECIPIENT_ROLE" &&
        normalizedValue !== null &&
        displayValue === normalizedValue &&
        [
          "Deudor",
          "Entidad financiera destinataria",
          "Pagador comercial o arrendaticio",
          "Empleador o pagador de pensión",
          "Proveedor de servicios de pago",
          "Tercero obligado por el embargo",
          "Papel pendiente de revisión",
        ].includes(displayValue)
      ) {
        return;
      }
      if (
        displayValue !== CLOSED_FACT_VALUE &&
        displayValue !== OBSERVED_FACT_VALUE &&
        displayValue !== "Título y autoridad coinciden" &&
        !/^Interviniente [1-9]\d*$/u.test(displayValue) &&
        ![
          "Deudor",
          "Entidad financiera destinataria",
          "Pagador comercial o arrendaticio",
          "Empleador o pagador de pensión",
          "Proveedor de servicios de pago",
          "Tercero obligado por el embargo",
          "Papel pendiente de revisión",
        ].includes(displayValue)
      ) {
        throw invalidReview();
      }
      if (
        normalizedValue === null ||
        !/^[A-Z][A-Z0-9_:.-]{0,159}$/u.test(normalizedValue)
      ) {
        throw invalidReview();
      }
      return;
    case "MONEY":
      if (
        normalizedValue !== null &&
        normalizedValue !== String(item.amountCents)
      ) {
        throw invalidReview();
      }
      return;
    case "STATUS":
      if (normalizedValue !== null || !SAFE_STATUS_VALUES.has(displayValue)) {
        throw invalidReview();
      }
      return;
    default:
      throw invalidReview();
  }
}

function assertAeatP0DeepSerializableFieldPrivacyV10(
  item: Readonly<Record<string, unknown>>,
): boolean {
  const fieldId = String(item.fieldId);
  if (!fieldId.startsWith("p0-v10:")) return false;
  const semantic = String(item.semantic);
  const canonicalType = String(item.canonicalType);
  const display = String(item.displayValue);
  const normalized =
    typeof item.normalizedValue === "string" ? item.normalizedValue : null;
  if (fieldId === "p0-v10:recognition:0") {
    const familyId = normalized?.slice("P0_V10:".length) ?? null;
    if (
      semantic !== "DETAIL" ||
      canonicalType !== "FACT_OR_GROUND" ||
      display !== "Estructura oficial reconocida" ||
      !normalized?.startsWith("P0_V10:") ||
      !isAeatP0DeepProfileIdV10(familyId)
    )
      throw invalidReview();
    return true;
  }
  const match = /^p0-v10:([A-Z][A-Z0-9_]{0,159}):\d+$/u.exec(fieldId);
  if (
    !match ||
    !AEAT_P0_DEEP_PROFILES_V10.some((profile) =>
      profile.canonicalFields.some((field) => field.id === match[1]),
    )
  ) {
    throw invalidReview();
  }
  if (semantic === "REFERENCE") {
    if (
      normalized === null ||
      display !== normalized ||
      safeOfficialReference(canonicalType as ReferenceTypeV1, normalized) !==
        normalized
    )
      throw invalidReview();
    return true;
  }
  if (semantic === "MASKED_VALUE") {
    if (
      canonicalType !== "MASKED_ACCOUNT" ||
      display !== "CSV protegido" ||
      !/^sha256:[0-9a-f]{64}$/u.test(normalized ?? "")
    )
      throw invalidReview();
    return true;
  }
  if (semantic === "DATE") {
    if (
      normalized === null ||
      !isValidIsoDate(normalized) ||
      display !== formatIsoDate(normalized)
    )
      throw invalidReview();
    return true;
  }
  if (semantic === "MONEY") {
    if (normalized !== null || !/^-?\d{1,3}(?:\.\d{3})*,\d{2}\s€$/u.test(display))
      throw invalidReview();
    return true;
  }
  if (semantic === "STATUS") {
    if (
      canonicalType !== "DOCUMENT_STATUS" ||
      normalized === null ||
      !/^[A-Z][A-Z0-9_]{0,159}$/u.test(normalized)
    )
      throw invalidReview();
    return true;
  }
  if (semantic === "DETAIL") {
    if (canonicalType !== "FACT_OR_GROUND" || normalized === null)
      throw invalidReview();
    if (
      display === normalized &&
      Object.values(AEAT_P0_DEEP_REVIEW_HUMAN_VALUES_V10).includes(display)
    ) {
      return true;
    }
    if (isValidIsoDate(normalized) && display === formatIsoDate(normalized)) {
      return true;
    }
    if (/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/u.test(normalized)) {
      if (display !== normalized) throw invalidReview();
      return true;
    }
    if (/^P(?:\d{1,4}[DM]|T\d{1,4}H)$/u.test(normalized)) {
      if (!/^\d{1,4} (?:día|días|mes|meses|hora|horas)$/u.test(display))
        throw invalidReview();
      return true;
    }
    if (display === normalized && /^(?:Sí|No|\d{1,6})$/u.test(display)) {
      return true;
    }
    if (/^P0_V10_ENUM:[A-Z][A-Z0-9_]{0,159}$/u.test(normalized)) {
      const expected = normalized
        .slice("P0_V10_ENUM:".length)
        .replaceAll("_", " ")
        .toLocaleLowerCase("es-ES");
      if (display !== expected) throw invalidReview();
      return true;
    }
    if (
      /^P0_V10_TIME:(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/u.test(normalized)
    ) {
      if (display !== normalized.slice("P0_V10_TIME:".length))
        throw invalidReview();
      return true;
    }
    if (/^P0_V10_DURATION:P(?:\d{1,4}[DM]|T\d{1,4}H)$/u.test(normalized)) {
      if (!/^\d{1,4} (?:día|días|mes|meses|hora|horas)$/u.test(display))
        throw invalidReview();
      return true;
    }
    if (
      !/^(?:P0_V10:[A-Z][A-Z0-9_]{0,159}|TRUE|FALSE|\d{1,6})$/u.test(normalized)
    )
      throw invalidReview();
    if (!(
      display === "Detectado en el documento" ||
      display === "Sí" ||
      display === "No" ||
      /^\d{1,6}$/u.test(display)
    ))
      throw invalidReview();
    return true;
  }
  throw invalidReview();
}

const REAL_CORPUS_EXPLANATION_PATTERNS_V2 = Object.freeze([
  /^La AEAT propone cambiar un saldo de \d{1,3}(?:\.\d{3})*,\d{2}\s€ a compensar por \d{1,3}(?:\.\d{3})*,\d{2}\s€ a ingresar; todavía no es liquidación final y abre 10 días hábiles desde la recepción\.$/u,
  /^La AEAT formula una propuesta de liquidación y abre un trámite de alegaciones; todavía no es una liquidación final ni una orden de pago\.$/u,
  /^Informe informativo de datos fiscales del IRPF (?:19|20)\d{2}; no es declaración, deuda ni liquidación\. Debe mostrar la causa por la que no se pudo elaborar el borrador y los plazos de campaña como información\.$/u,
  /^Informe informativo de datos fiscales del IRPF; no es declaración, deuda ni liquidación\.$/u,
  /^La AEAT confirma que aplicó la devolución del cónyuge al ingreso suspendido, pero sin importe no puede afirmar cobertura total ni saldo cero\.$/u,
  /^La devolución se aplicó (?:íntegramente a deudas y no queda importe líquido para transferir|parcialmente a deudas y queda un importe líquido cuya transferencia fue ordenada)\.$/u,
  /^(?:La diligencia acredita la publicación, pero no permite afirmar la fecha efectiva de notificación|El certificado acredita la fecha efectiva de notificación del acto citado, pero no es el acto subyacente|La comunicación anuncia una futura publicación; todavía no acredita publicación ni notificación efectiva)\.$/u,
  /^Es una carta de aviso sobre (?:\d+|dos) modelos no registrados; no es requerimiento formal, deuda ni sanción y no tiene plazo impreso\.$/u,
]);
const REAL_CORPUS_DETAIL_VALUE_PATTERNS_V2 = Object.freeze([
  /^IVA$/u,
  /^(?:BUSINESS_DAYS|CALENDAR_DAYS|RECEIPT_DATE|REQUESTED|EX_OFFICIO)$/u,
  /^(?:EXECUTIVE_LIQUIDATION|BANK_ACCOUNT_SEIZURE|DEFERRAL_OR_INSTALLMENT_RESOLUTION|SANCTION_REDUCTION_CLAWBACK)$/u,
]);
const REAL_CORPUS_HUMAN_DETAIL_VALUES_V2 = new Set([
  "Días hábiles",
  "Fecha de recepción",
  "Compensación solicitada",
  "Compensación de oficio",
  "Liquidación",
  "Diligencia de embargo",
  "Acuerdo de aplazamiento o fraccionamiento",
  "Exigencia de reducción de sanción",
  "Providencia de apremio",
]);
const REAL_CORPUS_SECTION_DISPLAY_V2 =
  /^Fila [1-9]\d*(?: · (?:Titular|Cónyuge))?(?: · modelo \d{3})?(?: · periodo (?:0A|[1-4]T|0[1-9]|1[0-2]))?(?: · -?\d{1,3}(?:\.\d{3})*,\d{2}\s€)?(?: · retención -?\d{1,3}(?:\.\d{3})*,\d{2}\s€)?$/u;

/**
 * Closed exception for V2 corpus fields. It permits only human row summaries,
 * observed numbers and source-controlled explanation sentences; arbitrary OCR
 * text, personal identifiers and account data remain invalid.
 */
function assertRealCorpusSerializableFieldPrivacyV2(
  item: Readonly<Record<string, unknown>>,
): boolean {
  const fieldId = String(item.fieldId);
  if (!fieldId.startsWith("real-corpus:")) return false;
  const display = String(item.displayValue);
  const normalized =
    typeof item.normalizedValue === "string" ? item.normalizedValue : "";
  if (
    assertClosedRealCorpusContextualDateV1({
      fieldId,
      prefix: "real-corpus:",
      display,
      normalized,
    })
  ) {
    return true;
  }
  if (fieldId === "real-corpus:recognized-family") return false;
  if (fieldId === "real-corpus:plain-explanation") {
    if (
      !/^EXPLANATION:(?:assessment\.allegations_and_proposal|information\.tax_data_report|irpf\.spouse_refund_suspension|refund\.payment_communication|notification\.publication_or_appearance|compliance\.informal_missing_return_notice):[A-Z0-9_]+$/u.test(
        normalized,
      ) ||
      !REAL_CORPUS_EXPLANATION_PATTERNS_V2.some((pattern) =>
        pattern.test(display),
      )
    ) {
      throw invalidReview();
    }
    return true;
  }
  if (/^real-corpus:section:\d+$/u.test(fieldId)) {
    if (
      !REAL_CORPUS_SECTION_DISPLAY_V2.test(display) ||
      normalized !== display
    ) {
      throw invalidReview();
    }
    return true;
  }
  if (/^real-corpus:missing-return:\d+$/u.test(fieldId)) {
    if (
      !/^Modelo \d{3} · (?:19|20)\d{2} · (?:0A|[1-4]T|0[1-9]|1[0-2])$/u.test(
        display,
      ) ||
      !/^\d{3}:(?:19|20)\d{2}:(?:0A|[1-4]T|0[1-9]|1[0-2])$/u.test(normalized)
    ) {
      throw invalidReview();
    }
    return true;
  }
  if (/^real-corpus:[A-Z0-9_]+:\d+$/u.test(fieldId)) {
    if (
      normalized === display &&
      /^-\d{1,3}(?:\.\d{3})*,\d{2}\s€$/u.test(display)
    ) {
      return true;
    }
    if (
      /^(?:BOOLEAN|INTEGER):[A-Z0-9_]+:(?:TRUE|FALSE|\d+)$/u.test(normalized)
    ) {
      if (!/^(?:Sí|No|\d+)$/u.test(display)) throw invalidReview();
      return true;
    }
    const closedText = /^TEXT:[A-Z0-9_]+:(.+)$/u.exec(normalized);
    if (
      normalized === display &&
      REAL_CORPUS_HUMAN_DETAIL_VALUES_V2.has(display)
    ) {
      return true;
    }
    if (
      ((closedText &&
        REAL_CORPUS_DETAIL_VALUE_PATTERNS_V2.some((pattern) =>
          pattern.test(closedText[1]!),
        ) &&
        normalizeClosedRealCorpusDisplayV2(display) === closedText[1]) ||
        (!closedText &&
          REAL_CORPUS_DETAIL_VALUE_PATTERNS_V2.some((pattern) =>
            pattern.test(normalized),
          ) &&
          normalizeClosedRealCorpusDisplayV2(display) === normalized))
    ) {
      return true;
    }
  }
  throw invalidReview();
}

function normalizeClosedRealCorpusDisplayV2(value: string): string {
  try {
    return value
      .normalize("NFKD")
      .replace(/\p{M}+/gu, "")
      .toLocaleUpperCase("es-ES");
  } catch {
    return "";
  }
}

const REAL_CORPUS_EXPLANATIONS_V3 = new Set([
  "Es una providencia de apremio: una cuota o deuda no se pagó en período voluntario y pasa a vía ejecutiva.",
  "Muestra el principal pendiente y tres escenarios de recargo condicionados por cuándo se pague.",
  "Comprueba la fecha real de recepción antes de elegir el importe aplicable. La carta de pago adjunta sirve para ingresar, pero no acredita que ya se haya pagado.",
  "Depende de la quincena en que se recibió; sin fecha de recepción no se calcula el último día.",
  "Si no se paga en el plazo abierto por la providencia, puede continuar el embargo y devengarse intereses y costas.",
  "La AEAT ha concedido pagar la deuda mediante las cuotas y fechas del Anexo I.",
  "La deuda principal no desaparece: queda sometida al calendario concedido y genera los intereses detallados.",
  "Mantén saldo suficiente para cada vencimiento y revisa por separado cualquier cuota que ya estuviera vencida al notificarse el acuerdo.",
  "Cada cuota tiene su propia fecha. El plazo de diez días del texto solo aplica a cuotas ya vencidas o que venzan dentro de ese período y no hayan podido cargarse.",
  "El impago de una cuota puede iniciar o continuar el apremio y, según el caso, anticipar el vencimiento de cuotas pendientes.",
  "La AEAT ha ordenado embargar dinero de una o varias cuentas o depósitos para cobrar una deuda que ya está en vía ejecutiva.",
  "La tabla identifica la deuda pendiente; el límite indica cuánto puede alcanzar la orden y cada fila de cuenta muestra cuánto declara embargado el documento.",
  "Comprueba que reconoces la deuda y los importes. Si ya estaba pagada, suspendida, aplazada o existe otra causa de oposición, revisa el expediente antes de actuar.",
  "El plazo para recurrir empieza con la notificación efectiva, no con la fecha impresa, la firma ni el día en que subiste el PDF.",
  "El banco puede retener fondos hasta el límite ordenado. Esta diligencia no demuestra por sí sola que el banco ya los haya transferido al Tesoro ni que la deuda haya quedado extinguida.",
  "Es un recordatorio informativo sobre una declaración anual que la AEAT espera por los modelos periódicos presentados.",
  "Indica el modelo y ejercicio, pero no acredita que falte la presentación ni que exista una sanción o deuda.",
  "Comprueba si el modelo anual ya fue presentado y conserva su justificante.",
  "Solo muestra el comienzo del período. Si no imprime la fecha final, no debe inventarse.",
  "El documento no declara una consecuencia concreta ni abre por sí solo un procedimiento sancionador.",
  "Es el desglose de una devolución: cuánto se reconoció, cuánto se descontó para otras deudas públicas y qué líquido se ordenó transferir.",
  "La suma de las deducciones y el líquido debe cuadrar con el importe ordenado.",
  "Comprueba el abono bancario y consulta con cada organismo público si no reconoces una deducción.",
  "No abre por sí sola un plazo de pago.",
  "Las deducciones reducen el efectivo de la devolución, pero este documento no demuestra que las deudas externas quedaran totalmente extinguidas.",
  "Es una comunicación general sobre un cambio de canal de presentación del modelo 303.",
  "Desde el ejercicio indicado ya no se permite imprimir la predeclaración para presentarla en papel.",
  "Utiliza la presentación electrónica o un tercero autorizado; el pago puede seguir realizándose con el documento de ingreso cuando proceda.",
  "No crea un vencimiento individual.",
  "No es un requerimiento, liquidación ni sanción.",
  "La AEAT levanta un embargo anterior sobre un bien mueble y ordena cancelar la anotación correspondiente.",
  "El anexo identifica el bien afectado por el levantamiento.",
  "Conserva el documento y verifica la cancelación registral si necesitas disponer del bien.",
  "No muestra una actuación obligatoria inmediata.",
  "El bien deja de estar afectado por esa diligencia en el alcance indicado.",
  "Es un certificado negativo de estar al corriente, emitido a petición del interesado.",
  "A la fecha del certificado constaban deudas o sanciones en ejecutiva no suspendidas ni aplazadas.",
  "Consulta las deudas vigentes. Si los datos del certificado son incorrectos, el contexto oficial prevé un escrito de disconformidad, no un recurso ordinario.",
  "La disconformidad se cuenta desde la recepción; sin esa fecha no se calcula el último día.",
  "Puede impedir acreditar estar al corriente para la finalidad solicitada.",
]);

const REAL_CORPUS_CLOSED_VALUES_V3 = new Set([
  "DIRECT_DEBIT_PRESENT",
  "PAYMENT_CHANNEL_NOT_PRINTED",
  "FINANCIAL_ENTITY",
  "ELECTRONIC_CHANNEL",
  "SPANISH_CATALAN_SAME_ACT",
  "PUBLIC_AUTHORITY_1",
  "PUBLIC_AUTHORITY_2",
  "SOCIAL_SECURITY",
  "REGIONAL_TAX_AUTHORITY",
  "OTHER_PUBLIC_AUTHORITY",
  "TRANSFER_ORDERED_NOT_BANK_CREDIT",
  "FROM_2023_ONWARDS",
  "PAPER_PREDECLARATION_REMOVED",
  "ELECTRONIC_FILING",
  "MOTOR_VEHICLE",
  "PRINTED_SEIZURE_RELEASE",
  "NEGATIVE",
  "EXECUTIVE_DEBTS_OR_SANCTIONS_NOT_SUSPENDED_OR_DEFERRED",
]);

const REAL_CORPUS_HUMAN_DETAILS_V3 = Object.freeze({
  DIRECT_DEBIT_EXISTS: ["Domiciliación bancaria"],
  RECIPIENT_ROLE: ["Obligado al pago", "Entidad financiera destinataria"],
  ASSET_KIND: ["Cuenta o depósito bancario", "Vehículo o bien mueble"],
  ELECTRONIC_CHANNEL: ["Presentación electrónica"],
  EFFECTIVE_EXERCISES: ["Ejercicio 2023 y siguientes"],
  REMOVED_CHANNEL: ["Predeclaración en papel retirada"],
  ALLOWED_IDENTITY_METHODS: ["Presentación electrónica"],
  RELEASE_EXTENT: ["Levantamiento del embargo"],
  REGISTRY_CANCELLATION_ORDERED: ["Sí"],
  CERTIFICATE_RESULT: ["Denegado", "Negativo"],
  NEGATIVE_REASON: [
    "Deudas o sanciones en vía ejecutiva",
    "Deudas o sanciones indicadas en el certificado",
  ],
} satisfies Readonly<Record<string, readonly ClosedHumanFactMatcherV1[]>>);

/** Closed V3 exception. Only synthetic enums and source-controlled prose pass. */
function assertRealCorpusSerializableFieldPrivacyV3(
  item: Readonly<Record<string, unknown>>,
): boolean {
  const fieldId = String(item.fieldId);
  if (!fieldId.startsWith("real-corpus-v3:")) return false;
  const display = String(item.displayValue);
  const normalized =
    typeof item.normalizedValue === "string" ? item.normalizedValue : "";
  if (
    assertClosedRealCorpusContextualDateV1({
      fieldId,
      prefix: "real-corpus-v3:",
      display,
      normalized,
    })
  ) {
    return true;
  }
  if (fieldId === "real-corpus-v3:recognized-family") {
    if (
      display !== "Título, autoridad y estructura coinciden" ||
      normalized !== "V3:EXACT_TITLE_AUTHORITY_STRUCTURE"
    ) {
      throw invalidReview();
    }
    return true;
  }
  if (fieldId === "real-corpus-v3:payment-form-status") {
    if (
      display !==
        "Sirve para pagar; no acredita que el pago se haya realizado" ||
      normalized !== "V3:PAYMENT_FORM_ONLY"
    ) {
      throw invalidReview();
    }
    return true;
  }
  if (
    /^real-corpus-v3:explanation:(?:what_is|result|action|deadline|consequence)$/u.test(
      fieldId,
    )
  ) {
    if (
      !/^V3:EXPLANATION:(?:collection\.enforcement_order|collection\.deferral_grant|seizure\.bank_account|information\.model_filing_reminder|refund\.payment_communication|information\.regulatory_change|seizure\.release|certificate\.tax_compliance):(?:WHAT_IS|RESULT|ACTION|DEADLINE|CONSEQUENCE)$/u.test(
        normalized,
      ) ||
      !REAL_CORPUS_EXPLANATIONS_V3.has(display)
    ) {
      throw invalidReview();
    }
    return true;
  }
  if (/^real-corpus-v3:installment:\d+$/u.test(fieldId)) {
    const humanDisplay =
      /^Vence (?:0[1-9]|[12]\d|3[01])\/(?:0[1-9]|1[0-2])\/(?:19|20)\d{2} · base \d{1,3}(?:\.\d{3})*,\d{2}\s€ · interés \d{1,3}(?:\.\d{3})*,\d{2}\s€ · total \d{1,3}(?:\.\d{3})*,\d{2}\s€$/u.test(
        display,
      );
    if (
      !humanDisplay ||
      normalized !== display
    ) {
      throw invalidReview();
    }
    return true;
  }
  if (/^real-corpus-v3:PUBLIC_AUTHORITY_ROLE_[1-9]\d*:\d+$/u.test(fieldId)) {
    if (
      normalized !== display ||
      !["Seguridad Social", "Hacienda autonómica"].includes(display)
    ) {
      throw invalidReview();
    }
    return true;
  }
  if (
    assertClosedHumanRealCorpusDetailV1({
      fieldId,
      prefix: "real-corpus-v3:",
      display,
      normalized,
      allowed: REAL_CORPUS_HUMAN_DETAILS_V3,
    })
  ) {
    return true;
  }
  if (/^real-corpus-v3:RECIPIENT_ROLE:\d+$/u.test(fieldId)) {
    const role =
      /^V3:TEXT:RECIPIENT_ROLE:(PRIMARY_DEBTOR|FINANCIAL_ENTITY)$/u.exec(
        normalized,
      )?.[1];
    if (
      !role ||
      display !==
        (role === "PRIMARY_DEBTOR" ? "Obligado al pago" : "Entidad financiera")
    ) {
      throw invalidReview();
    }
    return true;
  }
  if (/^real-corpus-v3:ASSET_KIND:\d+$/u.test(fieldId)) {
    if (
      normalized !== "V3:TEXT:ASSET_KIND:BANK_ACCOUNT_OR_DEPOSIT" ||
      display !== "Cuenta o depósito"
    ) {
      throw invalidReview();
    }
    return true;
  }
  if (/^real-corpus-v3:OPAQUE_ASSET_ORDINAL:\d+$/u.test(fieldId)) {
    const ordinal = /^V3:INTEGER:OPAQUE_ASSET_ORDINAL:([1-9]\d*)$/u.exec(
      normalized,
    )?.[1];
    if (!ordinal || display !== `Cuenta o depósito ${ordinal}`) {
      throw invalidReview();
    }
    return true;
  }
  const closed = /^V3:TEXT:[A-Z0-9_]+:([A-Z0-9_]+)$/u.exec(normalized);
  if (closed) {
    if (
      !REAL_CORPUS_CLOSED_VALUES_V3.has(closed[1]!) ||
      display !== closed[1]
    ) {
      throw invalidReview();
    }
    return true;
  }
  if (/^V3:BOOLEAN:[A-Z0-9_]+:(?:TRUE|FALSE)$/u.test(normalized)) {
    if (display !== "Sí" && display !== "No") throw invalidReview();
    return true;
  }
  throw invalidReview();
}

const REAL_CORPUS_EXPLANATION_TEXT_V4 = new Set(
  Object.values(REAL_CORPUS_EXPLANATIONS_V4).flatMap((explanation) => [
    explanation.whatIs,
    explanation.action,
    explanation.deadline,
    explanation.consequence,
  ]),
);

const REAL_CORPUS_CLOSED_VALUES_V4 = new Set([
  "REGISTERED",
  "HIGH",
  "CERTIFICATE_OR_IN_PERSON",
  "MOVABLE_VEHICLE",
  "REAL_ESTATE",
  "COMMERCIAL_CREDITS",
  "TOTAL_IF_PRINTED",
  "AS_PRINTED",
  "FINAL_PROVISIONAL_ASSESSMENT",
  "10_BUSINESS_DAYS_FROM_RECEIPT",
  "PAYER_WITHOUT_IDENTITY",
  "EXISTS_WITHOUT_DIGITS",
  "DIRECT_DEBIT",
  "NO_GUARANTEE",
  "DOCUMENTATION_REQUIRED_AS_PRINTED",
  "SEPARATE_SANCTION_PROCEDURE_WARNING",
  "RESPOND",
  "WITHHOLD_AND_REMIT_IF_CREDIT_EXISTS",
  "WHEN_CREDIT_BECOMES_DUE",
  "COMMERCIAL_CREDITS_UP_TO_PRINTED_LIMIT",
  "ANNEX_NOT_RECEIVED",
  "SECOND_REQUEST_PRINTED_CONSEQUENCE",
  "PREVIOUS_DELIVERY_FAILED",
]);

const REAL_CORPUS_HUMAN_DETAILS_V4 = Object.freeze({
  REGISTRATION_STATUS: ["Alta confirmada"],
  REGISTRATION_LEVEL: ["Nivel alto"],
  REGISTRATION_METHOD: ["Presencial", "Certificado electrónico"],
  TERMS_ATTACHED: ["Sí"],
  ASSET_KIND: ["Inmueble", "Créditos comerciales", "Vehículo o bien mueble"],
  RELEASE_EXTENT: ["Levantamiento total"],
  REGISTRY_CANCELLATION_ORDERED: ["Sí"],
  RESPONSE_BUSINESS_DAYS: [/^10$/u],
  DOCUMENTATION_REQUIRED: ["Documentación requerida"],
  SANCTION_WARNING: ["Posible procedimiento sancionador separado"],
  THIRD_PARTY_ROLE: ["Tercero pagador", "Tercero destinatario"],
  OBLIGATION_RESPOND: ["Debe contestar"],
  OBLIGATION_WITHHOLD_AND_REMIT: ["Retener e ingresar si existe crédito"],
  PAYMENT_TIME: ["Cuando venza el crédito"],
  REJECTION_REASON: ["No consta la recepción del anexo"],
  EXPLICIT_CONSEQUENCE: ["Segundo requerimiento"],
  ACCOUNT_OR_DEPOSIT: ["Cuenta bancaria"],
  TRANSFER_WAIT_DAYS: [/^20$/u],
  PAYMENT_METHOD: ["Domiciliación bancaria"],
  GUARANTEE_TYPE: ["Sin garantía"],
  NOTIFICATION_STATE: ["Entrega anterior fallida"],
} satisfies Readonly<Record<string, readonly ClosedHumanFactMatcherV1[]>>);

/** Closed V4 exception. Raw text, PII and arbitrary values are rejected. */
function assertRealCorpusSerializableFieldPrivacyV4(
  item: Readonly<Record<string, unknown>>,
): boolean {
  const fieldId = String(item.fieldId);
  if (!fieldId.startsWith("real-corpus-v4:")) return false;
  const display = String(item.displayValue);
  const normalized =
    typeof item.normalizedValue === "string" ? item.normalizedValue : "";
  if (
    assertClosedRealCorpusContextualDateV1({
      fieldId,
      prefix: "real-corpus-v4:",
      display,
      normalized,
    })
  ) {
    return true;
  }
  if (fieldId === "real-corpus-v4:recognized-family") {
    if (
      display !== "Título, autoridad y estructura coinciden" ||
      normalized !== "V4:EXACT_TITLE_AUTHORITY_STRUCTURE"
    )
      throw invalidReview();
    return true;
  }
  if (fieldId === "real-corpus-v4:payment-form-status") {
    if (
      display !==
        "Sirve para pagar; no acredita que el pago se haya realizado" ||
      normalized !== "V4:PAYMENT_FORM_ONLY"
    )
      throw invalidReview();
    return true;
  }
  if (
    /^real-corpus-v4:explanation:(?:what_is|action|deadline|consequence)$/u.test(
      fieldId,
    )
  ) {
    if (
      !/^V4:EXPLANATION:(?:identity\.clave_registration_receipt|seizure\.release|assessment\.final_provisional_assessment|seizure\.compliance_reiteration|assessment\.allegations_and_proposal|seizure\.commercial_credits|seizure\.bank_account|collection\.enforcement_order|collection\.deferral_grant|seizure\.movable_asset):(?:WHAT_IS|ACTION|DEADLINE|CONSEQUENCE)$/u.test(
        normalized,
      ) ||
      !REAL_CORPUS_EXPLANATION_TEXT_V4.has(display)
    )
      throw invalidReview();
    return true;
  }
  if (/^real-corpus-v4:installment:\d+$/u.test(fieldId)) {
    const humanDisplay =
      /^Vence (?:0[1-9]|[12]\d|3[01])\/(?:0[1-9]|1[0-2])\/(?:19|20)\d{2} · principal -?\d{1,3}(?:\.\d{3})*,\d{2}\s€ · interés -?\d{1,3}(?:\.\d{3})*,\d{2}\s€ · total -?\d{1,3}(?:\.\d{3})*,\d{2}\s€$/u.test(
        display,
      );
    if (
      !humanDisplay ||
      normalized !== display
    )
      throw invalidReview();
    return true;
  }
  if (
    assertClosedHumanRealCorpusDetailV1({
      fieldId,
      prefix: "real-corpus-v4:",
      display,
      normalized,
      allowed: REAL_CORPUS_HUMAN_DETAILS_V4,
    })
  ) {
    return true;
  }
  const closed = /^V4:TEXT:[A-Z0-9_]+:([A-Z0-9_]+)$/u.exec(normalized);
  if (closed) {
    if (!REAL_CORPUS_CLOSED_VALUES_V4.has(closed[1]!) || display !== closed[1])
      throw invalidReview();
    return true;
  }
  if (/^V4:BOOLEAN:[A-Z0-9_]+:(?:TRUE|FALSE)$/u.test(normalized)) {
    if (display !== "Sí" && display !== "No") throw invalidReview();
    return true;
  }
  const integer = /^V4:INTEGER:[A-Z0-9_]+:(\d+)$/u.exec(normalized);
  if (integer) {
    if (display !== integer[1]) throw invalidReview();
    return true;
  }
  throw invalidReview();
}

const REAL_CORPUS_EXPLANATION_TEXT_V5 = new Set(
  Object.values(REAL_CORPUS_EXPLANATIONS_V5).flatMap((explanation) => [
    explanation.whatIs,
    explanation.action,
    explanation.deadline,
    explanation.consequence,
  ]),
);

const REAL_CORPUS_CLOSED_VALUES_V5 = new Set([
  ...REAL_CORPUS_CLOSED_VALUES_V4,
  "DEPENDS_ON_EFFECTIVE_RECEIPT",
  "PRIMARY_DEBTOR",
  "GARNISHED_THIRD_PARTY_WITHOUT_IDENTITY",
  "THIRD_PARTY_ONLY",
  "NOT_CONFIRMED",
]);

const REAL_CORPUS_HUMAN_DETAILS_V5 = Object.freeze({
  ...REAL_CORPUS_HUMAN_DETAILS_V4,
  RECIPIENT_ROLE: ["Obligado al pago"],
  THIRD_PARTY_ROLE: ["Tercero pagador"],
  RESPONSE_OBLIGATION: ["Debe contestar"],
} satisfies Readonly<Record<string, readonly ClosedHumanFactMatcherV1[]>>);

/** Closed V5 exception. Raw text, PII and arbitrary values are rejected. */
function assertRealCorpusSerializableFieldPrivacyV5(
  item: Readonly<Record<string, unknown>>,
): boolean {
  const fieldId = String(item.fieldId);
  if (!fieldId.startsWith("real-corpus-v5:")) return false;
  const display = String(item.displayValue);
  const normalized =
    typeof item.normalizedValue === "string" ? item.normalizedValue : "";
  if (
    assertClosedRealCorpusContextualDateV1({
      fieldId,
      prefix: "real-corpus-v5:",
      display,
      normalized,
    })
  ) {
    return true;
  }
  if (fieldId === "real-corpus-v5:recognized-family") {
    if (
      display !== "Título, autoridad y estructura coinciden" ||
      normalized !== "V5:EXACT_TITLE_AUTHORITY_STRUCTURE"
    ) {
      throw invalidReview();
    }
    return true;
  }
  if (fieldId === "real-corpus-v5:payment-form-status") {
    if (
      display !==
        "Sirve para pagar; sus copias son una sola operación y no acreditan el pago" ||
      normalized !== "V5:PAYMENT_FORM_ONLY"
    ) {
      throw invalidReview();
    }
    return true;
  }
  if (
    /^real-corpus-v5:explanation:(?:what_is|action|deadline|consequence)$/u.test(
      fieldId,
    )
  ) {
    if (
      !/^V5:EXPLANATION:(?:collection\.enforcement_order|collection\.deferral_grant|collection\.deferral_denial|seizure\.commercial_credits):(?:WHAT_IS|ACTION|DEADLINE|CONSEQUENCE)$/u.test(
        normalized,
      ) ||
      !REAL_CORPUS_EXPLANATION_TEXT_V5.has(display)
    ) {
      throw invalidReview();
    }
    return true;
  }
  if (/^real-corpus-v5:installment:\d+$/u.test(fieldId)) {
    const humanDisplay =
      /^Vence (?:0[1-9]|[12]\d|3[01])\/(?:0[1-9]|1[0-2])\/(?:19|20)\d{2} · principal \d{1,3}(?:\.\d{3})*,\d{2}\s€ · interés \d{1,3}(?:\.\d{3})*,\d{2}\s€ · total \d{1,3}(?:\.\d{3})*,\d{2}\s€$/u.test(
        display,
      );
    if (
      !humanDisplay ||
      normalized !== display
    ) {
      throw invalidReview();
    }
    return true;
  }
  if (
    assertClosedHumanRealCorpusDetailV1({
      fieldId,
      prefix: "real-corpus-v5:",
      display,
      normalized,
      allowed: REAL_CORPUS_HUMAN_DETAILS_V5,
    })
  ) {
    return true;
  }
  const closed = /^V5:TEXT:[A-Z0-9_]+:([A-Z0-9_]+)$/u.exec(normalized);
  if (closed) {
    if (
      !REAL_CORPUS_CLOSED_VALUES_V5.has(closed[1]!) ||
      display !== closed[1]
    ) {
      throw invalidReview();
    }
    return true;
  }
  if (/^V5:BOOLEAN:[A-Z0-9_]+:(?:TRUE|FALSE)$/u.test(normalized)) {
    if (display !== "Sí" && display !== "No") throw invalidReview();
    return true;
  }
  const integer = /^V5:INTEGER:[A-Z0-9_]+:(\d+)$/u.exec(normalized);
  if (integer) {
    if (display !== integer[1]) throw invalidReview();
    return true;
  }
  throw invalidReview();
}

const REAL_CORPUS_EXPLANATION_TEXT_V6 = new Set(
  Object.values(REAL_CORPUS_EXPLANATIONS_V6).flatMap((explanation) => [
    explanation.whatIs,
    explanation.action,
    explanation.deadline,
    explanation.consequence,
  ]),
);

const REAL_CORPUS_CLOSED_VALUES_V6 = new Set([
  ...REAL_CORPUS_CLOSED_VALUES_V5,
  "DEPENDS_ON_EFFECTIVE_RECEIPT",
  "HISTORICAL_PRINTED_VALUE",
  "REDUCTION_ONLY_NOT_FULL_SANCTION",
  "SEPARATE_FROM_PRINCIPAL",
  "COMMERCIAL_CREDITS",
  "MOVABLE_ASSET",
  "REAL_ESTATE",
  "DISCREPANCY_PRESERVED_WITH_EVIDENCE",
  "PRINTED_AMOUNTS_MATCH",
]);

const REAL_CORPUS_CLOSED_VALUE_LABELS_V6: Readonly<Record<string, string>> =
  Object.freeze({
    DIRECT_DEBIT: "Domiciliación bancaria",
    NO_GUARANTEE: "Sin garantía",
    PRIMARY_DEBTOR: "Obligado al pago",
    HISTORICAL_PRINTED_VALUE: "Porcentaje indicado en el documento",
    REDUCTION_ONLY_NOT_FULL_SANCTION:
      "Solo se reclama la reducción perdida, no la sanción completa",
    SEPARATE_FROM_PRINCIPAL: "Importe separado de la deuda principal",
    COMMERCIAL_CREDITS: "Créditos comerciales o arrendaticios",
    MOVABLE_ASSET: "Bien mueble",
    REAL_ESTATE: "Inmueble",
    DISCREPANCY_PRESERVED_WITH_EVIDENCE:
      "Los importes de las partes del documento no coinciden y se muestran por separado",
    PRINTED_AMOUNTS_MATCH: "Los importes coinciden",
    DEPENDS_ON_EFFECTIVE_RECEIPT:
      "El plazo depende de la fecha efectiva de recepción",
  });

const REAL_CORPUS_HUMAN_DETAILS_V6 = Object.freeze({
  ...REAL_CORPUS_HUMAN_DETAILS_V5,
  HISTORICAL_REDUCTION_PERCENT: [/^\d{1,3}$/u],
  ASSET_KIND: [
    "Bien mueble",
    "Bien inmueble",
    "Créditos comerciales o arrendaticios",
  ],
} satisfies Readonly<Record<string, readonly ClosedHumanFactMatcherV1[]>>);

/** Closed V6 exception. Raw text, PII and arbitrary OCR values are rejected. */
function assertRealCorpusSerializableFieldPrivacyV6(
  item: Readonly<Record<string, unknown>>,
): boolean {
  const fieldId = String(item.fieldId);
  if (!fieldId.startsWith("real-corpus-v6:")) return false;
  const display = String(item.displayValue);
  const normalized =
    typeof item.normalizedValue === "string" ? item.normalizedValue : "";
  if (
    assertClosedRealCorpusContextualDateV1({
      fieldId,
      prefix: "real-corpus-v6:",
      display,
      normalized,
    })
  ) {
    return true;
  }
  if (fieldId === "real-corpus-v6:recognized-family") {
    if (
      display !== "Título, autoridad y estructura coinciden" ||
      normalized !== "V6:EXACT_TITLE_AUTHORITY_STRUCTURE"
    )
      throw invalidReview();
    return true;
  }
  if (fieldId === "real-corpus-v6:payment-form-status") {
    if (
      display !==
        "Sirve para pagar; sus copias son una sola operación y no acreditan el pago" ||
      normalized !== "V6:PAYMENT_FORM_ONLY"
    )
      throw invalidReview();
    return true;
  }
  if (
    /^real-corpus-v6:explanation:(?:what_is|action|deadline|consequence)$/u.test(
      fieldId,
    )
  ) {
    if (
      !/^V6:EXPLANATION:(?:collection\.enforcement_order|collection\.deferral_grant|collection\.deferral_denial|collection\.interest_assessment|sanction\.resolution|sanction\.loss_of_reduction|seizure\.movable_asset|seizure\.real_estate):(?:WHAT_IS|ACTION|DEADLINE|CONSEQUENCE)$/u.test(
        normalized,
      ) ||
      !REAL_CORPUS_EXPLANATION_TEXT_V6.has(display)
    )
      throw invalidReview();
    return true;
  }
  if (/^real-corpus-v6:installment:\d+$/u.test(fieldId)) {
    const humanDisplay =
      /^Vence (?:0[1-9]|[12]\d|3[01])\/(?:0[1-9]|1[0-2])\/(?:19|20)\d{2} · principal \d{1,3}(?:\.\d{3})*,\d{2}\s€ · interés \d{1,3}(?:\.\d{3})*,\d{2}\s€ · total \d{1,3}(?:\.\d{3})*,\d{2}\s€$/u.test(
        display,
      );
    if (
      !humanDisplay ||
      normalized !== display
    )
      throw invalidReview();
    return true;
  }
  if (
    assertClosedHumanRealCorpusDetailV1({
      fieldId,
      prefix: "real-corpus-v6:",
      display,
      normalized,
      allowed: REAL_CORPUS_HUMAN_DETAILS_V6,
    })
  ) {
    return true;
  }
  const closed = /^V6:TEXT:[A-Z0-9_]+:([A-Z0-9_]+)$/u.exec(normalized);
  if (closed) {
    const value = closed[1]!;
    if (
      !REAL_CORPUS_CLOSED_VALUES_V6.has(value) ||
      display !== (REAL_CORPUS_CLOSED_VALUE_LABELS_V6[value] ?? value)
    )
      throw invalidReview();
    return true;
  }
  if (/^V6:BOOLEAN:[A-Z0-9_]+:(?:TRUE|FALSE)$/u.test(normalized)) {
    if (display !== "Sí" && display !== "No") throw invalidReview();
    return true;
  }
  const integer = /^V6:INTEGER:[A-Z0-9_]+:(\d+)$/u.exec(normalized);
  if (integer) {
    if (display !== integer[1]) throw invalidReview();
    return true;
  }
  throw invalidReview();
}

const REAL_CORPUS_EXPLANATION_TEXT_V7 = new Set(
  Object.values(REAL_CORPUS_EXPLANATIONS_V7).flatMap((explanation) => [
    explanation.whatIs,
    explanation.action,
    explanation.deadline,
    explanation.consequence,
  ]),
);

const REAL_CORPUS_CLOSED_VALUES_V7 = new Set([
  "PROPOSAL_NOT_FINAL",
  "BLANK_FORM_NOT_SUBMITTED",
  "NOT_DEBT_NOT_SANCTION",
  "NOT_EVIDENCED",
  "REMAINING_PLAN_PRINCIPAL",
  "SINGLE_INSTALLMENT_OR_DEBT",
  "REGISTERED",
  "NOT_INFERRED",
  "MODIFIED_SCHEDULE_REPLACES_ORIGINAL",
  "EXTERNAL_PUBLIC_BODY",
  "AEAT",
  "EXPLICITLY_NOT_STARTED",
  "POSSIBLE_LATER_SANCTION_ONLY",
  "FINAL_FOR_CURRENT_PROCEDURE",
  "ONE_OPERATION_NOT_PAYMENT_EVIDENCE",
  "INVOICES",
  "RECORD_BOOKS",
  "BANK_RECORDS",
  "SUPPORTING_DOCUMENTS",
  "REJECTED_CARRYFORWARD",
]);

const REAL_CORPUS_HUMAN_DETAILS_V7 = Object.freeze({
  ...REAL_CORPUS_HUMAN_DETAILS_V6,
  SANCTION_STAGE: ["Inicio del procedimiento con trámite de audiencia"],
  ALLEGATION_BUSINESS_DAYS: [/^\d{1,3}$/u],
  RESPONSE_BUSINESS_DAYS: [/^\d{1,3}$/u],
  LEGAL_EFFECT: ["No constituye deuda ni sanción"],
  OPAQUE_ASSET_ORDINAL: [/^[1-9]\d*$/u],
  ENFORCEMENT_SCOPE: ["Principal restante del plan"],
  ROI_STATUS: ["Alta en el Registro de Operadores Intracomunitarios"],
  SCHEDULE_STATE: ["Calendario modificado", "Modificación del aplazamiento"],
  ORIGINATING_AUTHORITY: ["Otro organismo público"],
  COLLECTION_AUTHORITY: ["AEAT"],
  ASSESSMENT_START: ["No inicia procedimiento de comprobación"],
  DOCUMENT_CATEGORY_1: ["Facturas", "Libros registro", "Documentación bancaria", "Justificantes"],
  DOCUMENT_CATEGORY_2: ["Facturas", "Libros registro", "Documentación bancaria", "Justificantes"],
  DOCUMENT_CATEGORY_3: ["Facturas", "Libros registro", "Documentación bancaria", "Justificantes"],
  DOCUMENT_CATEGORY_4: ["Facturas", "Libros registro", "Documentación bancaria", "Justificantes"],
  REQUESTED_YEAR: [/^(?:19|20|21)\d{2}$/u],
  ASSESSMENT_REASON: ["Saldo declarado de otro ejercicio no admitido"],
  PROCEDURE_STAGE: ["Resolución final del procedimiento"],
  PAYMENT_FORM_STATUS: ["Carta de pago adjunta"],
} satisfies Readonly<Record<string, readonly ClosedHumanFactMatcherV1[]>>);

/** Closed V7 exception. It accepts only enumerated explanations and facts. */
function assertRealCorpusSerializableFieldPrivacyV7(
  item: Readonly<Record<string, unknown>>,
): boolean {
  const fieldId = String(item.fieldId);
  if (!fieldId.startsWith("real-corpus-v7:")) return false;
  const display = String(item.displayValue);
  const normalized =
    typeof item.normalizedValue === "string" ? item.normalizedValue : "";
  if (
    assertClosedRealCorpusContextualDateV1({
      fieldId,
      prefix: "real-corpus-v7:",
      display,
      normalized,
    })
  ) {
    return true;
  }
  if (fieldId === "real-corpus-v7:recognized-family") {
    if (
      display !== "Título, autoridad y estructura coinciden" ||
      normalized !== "V7:EXACT_TITLE_AUTHORITY_STRUCTURE"
    )
      throw invalidReview();
    return true;
  }
  if (fieldId === "real-corpus-v7:payment-form-status") {
    if (
      display !==
        "Las copias representan una sola operación y no acreditan el pago" ||
      normalized !== "V7:PAYMENT_FORM_ONE_OPERATION_NOT_PAYMENT"
    )
      throw invalidReview();
    return true;
  }
  if (
    /^real-corpus-v7:explanation:(?:what_is|action|deadline|consequence)$/u.test(
      fieldId,
    )
  ) {
    if (
      !/^V7:EXPLANATION:(?:sanction\.initiation_and_hearing|compliance\.formal_filing_requirement|seizure\.bank_account|collection\.enforcement_order|collection\.offset_ex_officio|registry\.tax_registration_resolution|collection\.deferral_grant|collection\.offset_requested|collection\.deferral_modification|collection\.external_debt|compliance\.document_request|assessment\.final_provisional_assessment):(?:WHAT_IS|ACTION|DEADLINE|CONSEQUENCE)$/u.test(
        normalized,
      ) ||
      !REAL_CORPUS_EXPLANATION_TEXT_V7.has(display)
    )
      throw invalidReview();
    return true;
  }
  if (/^real-corpus-v7:installment:\d+$/u.test(fieldId)) {
    const humanDisplay =
      /^Vence (?:0[1-9]|[12]\d|3[01])\/(?:0[1-9]|1[0-2])\/(?:19|20)\d{2} · principal \d+(?:\.\d{3})*,\d{2}\s€ · interés \d+(?:\.\d{3})*,\d{2}\s€ · recargo \d+(?:\.\d{3})*,\d{2}\s€ · total \d+(?:\.\d{3})*,\d{2}\s€$/u.test(
        display,
      );
    if (
      !humanDisplay ||
      normalized !== display
    )
      throw invalidReview();
    return true;
  }
  if (
    assertClosedHumanRealCorpusDetailV1({
      fieldId,
      prefix: "real-corpus-v7:",
      display,
      normalized,
      allowed: REAL_CORPUS_HUMAN_DETAILS_V7,
    })
  ) {
    return true;
  }
  const syntheticReference = /^V7:SYNTHETIC_REFERENCE:(SYN-[A-Z0-9-]+)$/u.exec(
    normalized,
  );
  if (syntheticReference) {
    if (display !== syntheticReference[1]) throw invalidReview();
    return true;
  }
  const closed = /^V7:TEXT:[A-Z0-9_]+:([A-Z0-9_]+)$/u.exec(normalized);
  if (closed) {
    if (!REAL_CORPUS_CLOSED_VALUES_V7.has(closed[1]!) || display !== closed[1])
      throw invalidReview();
    return true;
  }
  if (/^V7:BOOLEAN:[A-Z0-9_]+:(?:TRUE|FALSE)$/u.test(normalized)) {
    if (display !== "Sí" && display !== "No") throw invalidReview();
    return true;
  }
  const integer = /^V7:INTEGER:[A-Z0-9_]+:(\d+)$/u.exec(normalized);
  if (integer) {
    if (display !== integer[1]) throw invalidReview();
    return true;
  }
  throw invalidReview();
}

function isCanonicalTypeValid(semantic: string, value: unknown): boolean {
  if (typeof value !== "string") return false;
  switch (semantic) {
    case "REFERENCE":
      return REFERENCE_TYPES.has(value);
    case "MONEY":
      return MONEY_TYPES.has(value);
    case "DATE":
      return DATE_TYPES.has(value);
    case "PARTY":
      return PARTY_TYPES.has(value);
    case "STATUS":
      return value === "DOCUMENT_STATUS";
    case "OBLIGATION":
      return value === "OBLIGATION";
    case "MASKED_VALUE":
      return value === "MASKED_ACCOUNT";
    case "DETAIL":
      return DETAIL_TYPES.has(value);
    default:
      return false;
  }
}

function snapshotRecord(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    throw invalidReview();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null)
    throw invalidReview();
  const copy: Record<string, unknown> = Object.create(null);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") throw invalidReview();
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor)) throw invalidReview();
    copy[key] = descriptor.value;
  }
  return copy;
}

function snapshotArray(value: unknown, max: number): readonly unknown[] {
  if (!Array.isArray(value) || value.length > max) throw invalidReview();
  return [...value];
}

function assertKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): void {
  const allowed = new Set(keys);
  if (Reflect.ownKeys(value).length !== allowed.size) throw invalidReview();
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string" || !allowed.has(key)) throw invalidReview();
  }
}

function assertBoundedString(value: unknown, max: number): void {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > max ||
    value !== value.trim() ||
    /[\u0000-\u001f\u007f-\u009f]/u.test(value)
  )
    throw invalidReview();
}

function assertPage(value: unknown): void {
  if (
    !Number.isSafeInteger(value) ||
    Number(value) < 1 ||
    Number(value) > FISCAL_NOTIFICATION_INPUT_LIMITS.maxPages
  ) {
    throw invalidReview();
  }
}

function assertConfidence(value: unknown): void {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  )
    throw invalidReview();
}

function invalidReview(): FiscalNotificationVerticalSliceReviewErrorV1 {
  return new FiscalNotificationVerticalSliceReviewErrorV1();
}
