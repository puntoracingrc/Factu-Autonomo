import type { FiscalNotificationOfficialSourceIdV1 } from "./official-sources.v1";

export const FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_SCHEMA_VERSION_V1 =
  1 as const;
export const FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_RELEASE_ID_V1 =
  "fiscal-notification-document-families.2026-07-12.v1" as const;

export const FISCAL_NOTIFICATION_DOCUMENT_FAMILY_IDS_V1 = Object.freeze([
  "notification.delivery_attempt",
  "notification.publication_or_appearance",
  "notification.dehu_envelope",
  "information.tax_data_report",
  "information.regulatory_change",
  "information.model_filing_reminder",
  "identity.clave_registration_receipt",
  "certificate.tax_compliance",
  "registry.tax_registration_resolution",
  "compliance.informal_missing_return_notice",
  "compliance.formal_filing_requirement",
  "compliance.document_request",
  "assessment.allegations_and_proposal",
  "assessment.final_provisional_assessment",
  "sanction.initiation_and_hearing",
  "sanction.resolution",
  "sanction.loss_of_reduction",
  "collection.deferral_grant",
  "collection.deferral_modification",
  "collection.deferral_denial",
  "collection.interest_assessment",
  "collection.enforcement_order",
  "collection.offset_requested",
  "collection.offset_ex_officio",
  "refund.payment_communication",
  "seizure.bank_account",
  "seizure.movable_asset",
  "seizure.real_estate",
  "seizure.commercial_credits",
  "seizure.compliance_reiteration",
  "seizure.release",
  "payment.payment_form",
  "review.recurso_reposicion",
  "review.economic_administrative_claim",
  "liability.solidary",
  "liability.subsidiary",
  "liability.successors",
  "inspection.procedure",
  "refund.undue_payment",
  "collection.precautionary_measure",
  "collection.asset_sale",
] as const);

export type FiscalNotificationDocumentFamilyIdV1 =
  (typeof FISCAL_NOTIFICATION_DOCUMENT_FAMILY_IDS_V1)[number];

export type FiscalNotificationDocumentFamilyCategoryV1 =
  | "NOTIFICATION"
  | "INFORMATION"
  | "IDENTITY_AND_ACCESS"
  | "CERTIFICATE"
  | "TAX_PROFILE"
  | "COMPLIANCE"
  | "ASSESSMENT"
  | "SANCTION"
  | "COLLECTION"
  | "SETTLEMENT"
  | "REFUND"
  | "SEIZURE"
  | "PAYMENT_INSTRUMENT"
  | "REVIEW"
  | "LIABILITY"
  | "INSPECTION";

export type FiscalNotificationFamilyRecognitionStatusV1 =
  | "DISCOVERED"
  | "OFFICIAL_ONLY_PENDING_FIXTURE"
  | "OFFICIAL_SOURCE_PENDING_REGISTRATION"
  | "EXTRACTOR_IMPLEMENTED_REVIEW_ONLY";

export interface FiscalNotificationFamilyRecognitionV1 {
  readonly candidateHandlerId:
    | "aeat-enforcement-order-candidate"
    | "aeat-deferral-grant-candidate";
  readonly candidateHandlerVersion: "1.0.0";
  readonly outputPolicy: "CANDIDATE_ONLY_REVIEW_REQUIRED";
  readonly explicitFactExtractor: Readonly<{
    id: "aeat-enforcement-money-facts";
    version: "1.0.0";
  }> | null;
}

export interface FiscalNotificationDocumentFamilyV1 {
  readonly schemaVersion: 1;
  readonly releaseId: typeof FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_RELEASE_ID_V1;
  readonly id: FiscalNotificationDocumentFamilyIdV1;
  readonly nameEs: string;
  readonly category: FiscalNotificationDocumentFamilyCategoryV1;
  readonly evidenceOrigin:
    | "ANONYMIZED_PRIVATE_CORPUS_OBSERVATION"
    | "OFFICIAL_SOURCE_ONLY_VERIFIED_URL"
    | "OFFICIAL_SOURCE_REPORTED_PENDING_REGISTRATION";
  readonly recognitionStatus: FiscalNotificationFamilyRecognitionStatusV1;
  readonly fixtureStatus:
    | "SYNTHETIC_TEST_CASE_AVAILABLE"
    | "PENDING_SYNTHETIC_FIXTURE";
  readonly templateVariantStatus: "NOT_REGISTERED";
  readonly sourceIds: readonly FiscalNotificationOfficialSourceIdV1[];
  readonly recognition: FiscalNotificationFamilyRecognitionV1 | null;
  readonly legalReviewStatus: "LEGAL_REVIEW_PENDING";
  readonly operationalPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW";
  readonly permitsDebtCreation: false;
  readonly permitsDeadlineCreation: false;
  readonly permitsPaymentAction: false;
  readonly permitsAccountingAction: false;
}

const ENFORCEMENT_RECOGNITION = Object.freeze({
  candidateHandlerId: "aeat-enforcement-order-candidate" as const,
  candidateHandlerVersion: "1.0.0" as const,
  outputPolicy: "CANDIDATE_ONLY_REVIEW_REQUIRED" as const,
  explicitFactExtractor: Object.freeze({
    id: "aeat-enforcement-money-facts" as const,
    version: "1.0.0" as const,
  }),
});

const DEFERRAL_RECOGNITION = Object.freeze({
  candidateHandlerId: "aeat-deferral-grant-candidate" as const,
  candidateHandlerVersion: "1.0.0" as const,
  outputPolicy: "CANDIDATE_ONLY_REVIEW_REQUIRED" as const,
  explicitFactExtractor: null,
});

function family(
  id: FiscalNotificationDocumentFamilyIdV1,
  nameEs: string,
  category: FiscalNotificationDocumentFamilyCategoryV1,
  evidenceOrigin: FiscalNotificationDocumentFamilyV1["evidenceOrigin"],
  sourceIds: readonly FiscalNotificationOfficialSourceIdV1[] = [],
  recognition: FiscalNotificationFamilyRecognitionV1 | null = null,
): FiscalNotificationDocumentFamilyV1 {
  return Object.freeze({
    schemaVersion: FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_SCHEMA_VERSION_V1,
    releaseId: FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_RELEASE_ID_V1,
    id,
    nameEs,
    category,
    evidenceOrigin,
    recognitionStatus: recognition
      ? "EXTRACTOR_IMPLEMENTED_REVIEW_ONLY"
      : evidenceOrigin === "OFFICIAL_SOURCE_REPORTED_PENDING_REGISTRATION"
        ? "OFFICIAL_SOURCE_PENDING_REGISTRATION"
        : evidenceOrigin === "OFFICIAL_SOURCE_ONLY_VERIFIED_URL"
        ? "OFFICIAL_ONLY_PENDING_FIXTURE"
        : "DISCOVERED",
    fixtureStatus: recognition
      ? "SYNTHETIC_TEST_CASE_AVAILABLE"
      : "PENDING_SYNTHETIC_FIXTURE",
    templateVariantStatus: "NOT_REGISTERED",
    sourceIds: Object.freeze([...sourceIds]),
    recognition,
    legalReviewStatus: "LEGAL_REVIEW_PENDING",
    operationalPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
    permitsDebtCreation: false,
    permitsDeadlineCreation: false,
    permitsPaymentAction: false,
    permitsAccountingAction: false,
  });
}

const CORPUS = "ANONYMIZED_PRIVATE_CORPUS_OBSERVATION" as const;
const OFFICIAL_ONLY = "OFFICIAL_SOURCE_ONLY_VERIFIED_URL" as const;
const OFFICIAL_SOURCE_PENDING =
  "OFFICIAL_SOURCE_REPORTED_PENDING_REGISTRATION" as const;
const ASSESSMENT_SOURCES = Object.freeze([
  "aeat.assessment.irpf",
  "aeat.assessment.vat",
] as const);

export const FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V1 = Object.freeze([
  family(
    "notification.delivery_attempt",
    "Intento, reenvío o carátula de notificación",
    "NOTIFICATION",
    CORPUS,
  ),
  family(
    "notification.publication_or_appearance",
    "Publicación o comparecencia para notificación",
    "NOTIFICATION",
    CORPUS,
  ),
  family(
    "notification.dehu_envelope",
    "Sobre, acuse o evidencia DEHú/Notific@",
    "NOTIFICATION",
    OFFICIAL_SOURCE_PENDING,
  ),
  family("information.tax_data_report", "Datos fiscales", "INFORMATION", CORPUS),
  family(
    "information.regulatory_change",
    "Comunicación informativa de cambio normativo o de canal",
    "INFORMATION",
    CORPUS,
  ),
  family(
    "information.model_filing_reminder",
    "Recordatorio de obligación de presentar un modelo",
    "INFORMATION",
    CORPUS,
  ),
  family(
    "identity.clave_registration_receipt",
    "Justificante de alta en Cl@ve",
    "IDENTITY_AND_ACCESS",
    CORPUS,
  ),
  family(
    "certificate.tax_compliance",
    "Certificado de estar al corriente",
    "CERTIFICATE",
    CORPUS,
    ["aeat.certificate.compliance"],
  ),
  family(
    "registry.tax_registration_resolution",
    "Resolución censal o registral",
    "TAX_PROFILE",
    CORPUS,
  ),
  family(
    "compliance.informal_missing_return_notice",
    "Carta de aviso por declaraciones no registradas",
    "COMPLIANCE",
    CORPUS,
  ),
  family(
    "compliance.formal_filing_requirement",
    "Requerimiento formal de presentación",
    "COMPLIANCE",
    CORPUS,
  ),
  family(
    "compliance.document_request",
    "Requerimiento de documentación",
    "COMPLIANCE",
    CORPUS,
    ASSESSMENT_SOURCES,
  ),
  family(
    "assessment.allegations_and_proposal",
    "Trámite de alegaciones y propuesta de liquidación",
    "ASSESSMENT",
    CORPUS,
    ASSESSMENT_SOURCES,
  ),
  family(
    "assessment.final_provisional_assessment",
    "Resolución con liquidación provisional",
    "ASSESSMENT",
    CORPUS,
    ASSESSMENT_SOURCES,
  ),
  family(
    "sanction.initiation_and_hearing",
    "Inicio de expediente sancionador y audiencia",
    "SANCTION",
    CORPUS,
    ["aeat.sanction.general"],
  ),
  family(
    "sanction.resolution",
    "Resolución sancionadora",
    "SANCTION",
    CORPUS,
    ["aeat.sanction.general"],
  ),
  family(
    "sanction.loss_of_reduction",
    "Exigencia de reducción de sanción perdida",
    "SANCTION",
    CORPUS,
  ),
  family(
    "collection.deferral_grant",
    "Concesión de aplazamiento o fraccionamiento",
    "COLLECTION",
    CORPUS,
    ["aeat.collection.deferral"],
    DEFERRAL_RECOGNITION,
  ),
  family(
    "collection.deferral_modification",
    "Modificación de aplazamiento o fraccionamiento",
    "COLLECTION",
    CORPUS,
    ["aeat.collection.deferral"],
  ),
  family(
    "collection.deferral_denial",
    "Denegación de aplazamiento o fraccionamiento",
    "COLLECTION",
    CORPUS,
    ["aeat.collection.deferral"],
  ),
  family(
    "collection.interest_assessment",
    "Liquidación independiente de intereses de demora",
    "COLLECTION",
    CORPUS,
  ),
  family(
    "collection.enforcement_order",
    "Providencia de apremio",
    "COLLECTION",
    CORPUS,
    ["aeat.collection.enforcement"],
    ENFORCEMENT_RECOGNITION,
  ),
  family(
    "collection.offset_requested",
    "Compensación a instancia del obligado",
    "SETTLEMENT",
    CORPUS,
    ["aeat.collection.offset.requested"],
  ),
  family(
    "collection.offset_ex_officio",
    "Compensación de oficio",
    "SETTLEMENT",
    CORPUS,
    ["aeat.collection.offset.exofficio"],
  ),
  family(
    "refund.payment_communication",
    "Comunicación de pago de devolución",
    "REFUND",
    CORPUS,
  ),
  family("seizure.bank_account", "Embargo de cuenta o depósito", "SEIZURE", CORPUS),
  family("seizure.movable_asset", "Embargo de bien mueble", "SEIZURE", CORPUS),
  family("seizure.real_estate", "Embargo de inmueble", "SEIZURE", CORPUS),
  family(
    "seizure.commercial_credits",
    "Embargo de créditos comerciales o arrendaticios",
    "SEIZURE",
    CORPUS,
  ),
  family(
    "seizure.compliance_reiteration",
    "Reiteración de obligaciones de embargo de créditos",
    "SEIZURE",
    CORPUS,
  ),
  family("seizure.release", "Levantamiento de embargo", "SEIZURE", CORPUS),
  family(
    "payment.payment_form",
    "Carta o documento de pago",
    "PAYMENT_INSTRUMENT",
    CORPUS,
  ),
  family(
    "review.recurso_reposicion",
    "Recurso de reposición",
    "REVIEW",
    OFFICIAL_ONLY,
    ["aeat.review.reconsideration"],
  ),
  family(
    "review.economic_administrative_claim",
    "Reclamación económico-administrativa",
    "REVIEW",
    OFFICIAL_ONLY,
    ["aeat.review.economic_administrative"],
  ),
  family(
    "liability.solidary",
    "Declaración de responsabilidad solidaria",
    "LIABILITY",
    OFFICIAL_ONLY,
    ["aeat.liability.solidary"],
  ),
  family(
    "liability.subsidiary",
    "Declaración de responsabilidad subsidiaria",
    "LIABILITY",
    OFFICIAL_ONLY,
    ["aeat.liability.subsidiary"],
  ),
  family(
    "liability.successors",
    "Recaudación frente a sucesores",
    "LIABILITY",
    OFFICIAL_ONLY,
    ["aeat.liability.successors"],
  ),
  family(
    "inspection.procedure",
    "Procedimiento inspector",
    "INSPECTION",
    OFFICIAL_ONLY,
    ["aeat.inspection.general"],
  ),
  family(
    "refund.undue_payment",
    "Devolución de ingresos indebidos",
    "REFUND",
    OFFICIAL_ONLY,
    ["aeat.refund.undue"],
  ),
  family(
    "collection.precautionary_measure",
    "Medida cautelar de recaudación",
    "COLLECTION",
    OFFICIAL_ONLY,
    ["aeat.collection.precautionary"],
  ),
  family(
    "collection.asset_sale",
    "Enajenación o subasta de bienes",
    "COLLECTION",
    OFFICIAL_ONLY,
    ["aeat.collection.auction"],
  ),
] as const) satisfies readonly FiscalNotificationDocumentFamilyV1[];

const familyById = new Map(
  FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V1.map((entry) => [
    entry.id,
    entry,
  ] as const),
);
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;

export function resolveFiscalNotificationDocumentFamilyV1(
  id: unknown,
): FiscalNotificationDocumentFamilyV1 | null {
  return typeof id === "string" &&
    id.length > 0 &&
    id.length <= 160 &&
    !CONTROL_CHARACTER_PATTERN.test(id)
    ? (familyById.get(id as FiscalNotificationDocumentFamilyIdV1) ?? null)
    : null;
}
