import {
  FISCAL_NOTIFICATION_DOCUMENT_FAMILY_IDS_V3,
  type FiscalNotificationDocumentFamilyIdV3,
} from "./knowledge/document-families.v3";
import {
  FISCAL_NOTIFICATION_INPUT_LIMITS,
  assertNonNegativeIntegerCents,
} from "./input-contract";
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
  FiscalNotificationVerticalSliceExtractorIdV1,
} from "./extractor-core/vertical-slice-orchestrator.v1";
import {
  BASE_EXTRACTOR_IDS_V1,
  type BaseExtractorIdV1,
} from "./extractor-core/extractor-contract.v1";
import { resolveFamilyRuleV2 } from "./extractor-core/family-rule-registry.v2";
import { PROFILE_FIELD_LABELS_V2 } from "./extractor-core/profile-field-labels.v2";
import { REAL_CORPUS_EXPLANATIONS_V4 } from "./extractor-core/real-corpus-extractor.v4";

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
  readonly familyId: FiscalNotificationDocumentFamilyIdV3;
  readonly title: string;
  readonly subtitle: string;
  readonly pageFrom: number;
  readonly pageTo: number;
  readonly confidence: number;
  readonly fields: readonly FiscalNotificationVerticalSliceReviewFieldV1[];
  readonly warnings: readonly string[];
  readonly requiresHumanReview: true;
}

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
  Partial<Record<FiscalNotificationDocumentFamilyIdV3, string>>
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
    NRC: "NRC",
    CSV: "CSV",
    NIF: "NIF",
    MODEL: "Modelo",
    FISCAL_YEAR: "Ejercicio",
    TAX_PERIOD: "Periodo",
    BANK_REFERENCE: "Referencia bancaria",
    THIRD_PARTY_RESPONSE_ID: "Contestación de tercero",
    OTHER_OFFICIAL_REFERENCE: "Referencia oficial",
  });

const MONEY_LABEL: Readonly<Record<MonetaryComponentTypeV1, string>> =
  Object.freeze({
    PRINCIPAL: "Principal",
    TAX_QUOTA: "Cuota",
    PENALTY: "Sanción",
    SURCHARGE: "Recargo",
    EXECUTIVE_SURCHARGE: "Recargo ejecutivo",
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

const FAMILY_IDS = new Set<FiscalNotificationDocumentFamilyIdV3>(
  FISCAL_NOTIFICATION_DOCUMENT_FAMILY_IDS_V3,
);
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
]);
const SHA256_FINGERPRINT = /^[0-9a-f]{64}$/u;
const ISO_DATE = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/u;
const CLOSED_WARNING_CODE =
  /^(?:[A-Z][A-Z0-9_]{0,159}|profile\.[A-Z][A-Z0-9_]{0,151})$/u;
const PII_LIKE_REFERENCE =
  /^(?:\d{8}[A-Z]|[XYZ]\d{7}[A-Z]|[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]|ES\d{22}|[6789]\d{8})$/u;
const CLOSED_FACT_VALUE = "Detectado en el documento";
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
  "Clasificación histórica amplia",
]);
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
    documents.push(projectSeizure(extractions.seizure));
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
  constructor() {
    super("FISCAL_NOTIFICATION_VERTICAL_SLICE_REVIEW_INVALID");
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
) {
  const fields = commonFields(output, { includeMoney: false });
  const state = seizureStateLabel(output.seizureFacts.printedState);
  addStatus(fields, state, pagesForOutput(output));
  if (output.seizureFacts.recipientRole !== "UNKNOWN") {
    fields.push(
      field({
        fieldId: "detail:SEIZURE_RECIPIENT_ROLE",
        semantic: "DETAIL",
        canonicalType: "SEIZURE_RECIPIENT_ROLE",
        label: "Papel del destinatario",
        displayValue: seizureRecipientRoleLabel(
          output.seizureFacts.recipientRole,
        ),
        normalizedValue: `SEIZURE_RECIPIENT_ROLE:${output.seizureFacts.recipientRole}`,
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
        canonicalType: item.role,
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
              : `Interviniente ${entityIndex + 1}`,
          normalizedValue:
            role === "ISSUING_AUTHORITY"
              ? safeAuthorityRole(entity.displayName!) === "AEAT"
                ? "AEAT"
                : "OTHER_AUTHORITY"
              : `ROLE:${role}:${entityIndex + 1}`,
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
  extractorId: FiscalNotificationVerticalSliceExtractorIdV1,
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
      displayValue: CLOSED_FACT_VALUE,
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
  assertKeys(item, [
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
  ]);
  assertBoundedString(item.reviewDocumentId, 160);
  if (!EXTRACTOR_IDS.has(item.extractorId as BaseExtractorIdV1))
    throw invalidReview();
  if (!FAMILY_IDS.has(item.familyId as FiscalNotificationDocumentFamilyIdV3))
    throw invalidReview();
  assertBoundedString(
    item.title,
    FISCAL_NOTIFICATION_VERTICAL_SLICE_REVIEW_LIMITS_V1.maxLabelChars,
  );
  assertBoundedString(
    item.subtitle,
    FISCAL_NOTIFICATION_VERTICAL_SLICE_REVIEW_LIMITS_V1.maxLabelChars,
  );
  const familyId = item.familyId as FiscalNotificationDocumentFamilyIdV3;
  const canonicalTitle = resolveFamilyRuleV2(familyId)?.canonicalTitle;
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
  return Object.freeze({
    reviewDocumentId: item.reviewDocumentId as string,
    extractorId: item.extractorId as BaseExtractorIdV1,
    familyId: item.familyId as FiscalNotificationDocumentFamilyIdV3,
    title: item.title as string,
    subtitle: item.subtitle as string,
    pageFrom: Number(item.pageFrom),
    pageTo: Number(item.pageTo),
    confidence: Number(item.confidence),
    fields: Object.freeze(fields),
    warnings: Object.freeze(warnings),
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
  assertSerializableFieldPrivacy(item);
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
      "Fecha del embargo",
      "Deuda pendiente",
      "Importe embargado",
      "Total pendiente",
      "Importe remitido al Tesoro",
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
      "Qué es",
      "Qué resultado muestra",
      "Qué conviene hacer",
      "Cómo se cuenta el plazo",
      "Qué puede ocurrir",
    ].includes(value)
  ) {
    return true;
  }
  return /^(?:Documentación|Consecuencia indicada|Hecho o fundamento|Recurso indicado|Deuda afectada|Vencimiento original|Cuota|Organismo público|Deducción|Referencia de la deducción) [1-9]\d*$/u.test(
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
  if (
    (semantic === "DETAIL" || semantic === "OBLIGATION") &&
    (assertRealCorpusSerializableFieldPrivacyV2(item) ||
      assertRealCorpusSerializableFieldPrivacyV3(item) ||
      assertRealCorpusSerializableFieldPrivacyV4(item))
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
      const match = /^Interviniente ([1-9]\d*)$/u.exec(displayValue);
      if (!match || normalizedValue !== `ROLE:${canonicalType}:${match[1]}`) {
        throw invalidReview();
      }
      return;
    }
    case "MASKED_VALUE":
      throw invalidReview();
    case "DETAIL":
    case "OBLIGATION":
      if (
        displayValue !== CLOSED_FACT_VALUE &&
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
const REAL_CORPUS_SECTION_DISPLAY_V2 =
  /^(?:Titular|Cónyuge) · fila [1-9]\d*(?: · modelo \d{3})?(?: · periodo (?:0A|[1-4]T|0[1-9]|1[0-2]))?(?: · -?\d{1,3}(?:\.\d{3})*,\d{2}\s€)?(?: · retención -?\d{1,3}(?:\.\d{3})*,\d{2}\s€)?$/u;
const REAL_CORPUS_SECTION_NORMALIZED_V2 =
  /^(?:EMPLOYMENT_INCOME|ECONOMIC_ACTIVITY_INCOME|BANK_INTEREST|ECONOMIC_ACTIVITY_CENSUS|ATTRIBUTED_ECONOMIC_ACTIVITY_INCOME|ATTRIBUTED_WITHHOLDINGS|DONATIONS|MORTGAGE_LOAN|INSTALLMENT_PAYMENTS|SOCIAL_SECURITY_CONTRIBUTIONS|CADASTRAL_PROPERTY|ENTITY_PARTICIPATION|MATERNITY_DEDUCTION_CONTRIBUTIONS|MATERNITY_DEDUCTION):(?:ACCOUNT_HOLDER|SPOUSE):[1-9]\d*:(?:\d{3}|-):(?:(?:0A|[1-4]T|0[1-9]|1[0-2])|-):(?:-?\d+|-):(?:-?\d+|-)$/u;

/**
 * Closed exception for V2 corpus fields. It permits only generated enums,
 * numbers and source-controlled explanation sentences; arbitrary OCR text,
 * personal identifiers and account data remain invalid.
 */
function assertRealCorpusSerializableFieldPrivacyV2(
  item: Readonly<Record<string, unknown>>,
): boolean {
  const fieldId = String(item.fieldId);
  if (!fieldId.startsWith("real-corpus:")) return false;
  const display = String(item.displayValue);
  const normalized =
    typeof item.normalizedValue === "string" ? item.normalizedValue : "";
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
      !REAL_CORPUS_SECTION_NORMALIZED_V2.test(normalized)
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
    if (/^SIGNED_CENTS:-\d+$/u.test(normalized)) {
      if (!/^-\d{1,3}(?:\.\d{3})*,\d{2}\s€$/u.test(display)) {
        throw invalidReview();
      }
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
      closedText &&
      REAL_CORPUS_DETAIL_VALUE_PATTERNS_V2.some((pattern) =>
        pattern.test(closedText[1]!),
      ) &&
      normalizeClosedRealCorpusDisplayV2(display) === closedText[1]
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
  "La AEAT ha dictado una diligencia que afecta saldos bancarios para cobrar una deuda en ejecutiva.",
  "El anexo identifica la deuda y el importe que el documento declara embargado.",
  "Comprueba la deuda de origen, el importe y la fecha de recepción. Los motivos de oposición a la diligencia son limitados.",
  "El recurso se cuenta desde la recepción, no desde la fecha de la diligencia ni la firma.",
  "La entidad puede retener e ingresar fondos hasta el límite indicado, pero la diligencia no prueba que ya se hayan remitido al Tesoro.",
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

/** Closed V3 exception. Only synthetic enums and source-controlled prose pass. */
function assertRealCorpusSerializableFieldPrivacyV3(
  item: Readonly<Record<string, unknown>>,
): boolean {
  const fieldId = String(item.fieldId);
  if (!fieldId.startsWith("real-corpus-v3:")) return false;
  const display = String(item.displayValue);
  const normalized =
    typeof item.normalizedValue === "string" ? item.normalizedValue : "";
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
    if (
      !/^V3:INSTALLMENT:[1-9]\d*:(?:19|20)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01]):\d+:\d+:\d+$/u.test(
        normalized,
      ) ||
      !/^Vence (?:0[1-9]|[12]\d|3[01])\/(?:0[1-9]|1[0-2])\/(?:19|20)\d{2} · base \d{1,3}(?:\.\d{3})*,\d{2}\s€ · interés \d{1,3}(?:\.\d{3})*,\d{2}\s€ · total \d{1,3}(?:\.\d{3})*,\d{2}\s€$/u.test(
        display,
      )
    ) {
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

/** Closed V4 exception. Raw text, PII and arbitrary values are rejected. */
function assertRealCorpusSerializableFieldPrivacyV4(
  item: Readonly<Record<string, unknown>>,
): boolean {
  const fieldId = String(item.fieldId);
  if (!fieldId.startsWith("real-corpus-v4:")) return false;
  const display = String(item.displayValue);
  const normalized =
    typeof item.normalizedValue === "string" ? item.normalizedValue : "";
  if (fieldId === "real-corpus-v4:recognized-family") {
    if (
      display !== "Título, autoridad y estructura coinciden" ||
      normalized !== "V4:EXACT_TITLE_AUTHORITY_STRUCTURE"
    ) throw invalidReview();
    return true;
  }
  if (fieldId === "real-corpus-v4:payment-form-status") {
    if (
      display !== "Sirve para pagar; no acredita que el pago se haya realizado" ||
      normalized !== "V4:PAYMENT_FORM_ONLY"
    ) throw invalidReview();
    return true;
  }
  if (/^real-corpus-v4:explanation:(?:what_is|action|deadline|consequence)$/u.test(fieldId)) {
    if (
      !/^V4:EXPLANATION:(?:identity\.clave_registration_receipt|seizure\.release|assessment\.final_provisional_assessment|seizure\.compliance_reiteration|assessment\.allegations_and_proposal|seizure\.commercial_credits|seizure\.bank_account|collection\.enforcement_order|collection\.deferral_grant|seizure\.movable_asset):(?:WHAT_IS|ACTION|DEADLINE|CONSEQUENCE)$/u.test(normalized) ||
      !REAL_CORPUS_EXPLANATION_TEXT_V4.has(display)
    ) throw invalidReview();
    return true;
  }
  if (/^real-corpus-v4:installment:\d+$/u.test(fieldId)) {
    if (
      !/^V4:INSTALLMENT:[1-9]\d*:(?:19|20)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01]):-?\d+:-?\d+:-?\d+$/u.test(normalized) ||
      !/^Vence (?:0[1-9]|[12]\d|3[01])\/(?:0[1-9]|1[0-2])\/(?:19|20)\d{2} · principal -?\d{1,3}(?:\.\d{3})*,\d{2}\s€ · interés -?\d{1,3}(?:\.\d{3})*,\d{2}\s€ · total -?\d{1,3}(?:\.\d{3})*,\d{2}\s€$/u.test(display)
    ) throw invalidReview();
    return true;
  }
  const closed = /^V4:TEXT:[A-Z0-9_]+:([A-Z0-9_]+)$/u.exec(normalized);
  if (closed) {
    if (!REAL_CORPUS_CLOSED_VALUES_V4.has(closed[1]!) || display !== closed[1]) throw invalidReview();
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
