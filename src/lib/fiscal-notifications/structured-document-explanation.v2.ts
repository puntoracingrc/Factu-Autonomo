import type { AdministrativeDocumentType } from "./types";
import { normalizeFiscalNotificationReferenceV2 } from "./exact-reference-index.v2";
import {
  AEAT_DOCUMENT_KNOWLEDGE_RELEASE_ID_V1,
  AEAT_DOCUMENT_KNOWLEDGE_V1,
  AEAT_DOCUMENT_PROFILE_IDS_V1,
  AEAT_NOTIFICATIONS_CANONICAL_URL_V1,
  resolveAeatDocumentProfileV1,
  type AeatDocumentProfileV1,
} from "./knowledge/aeat-document-knowledge.v1";
import {
  explainFiscalNotificationRelationV2,
  type ExplainFiscalNotificationRelationInputV2,
  type FiscalNotificationRelationExplanationV2,
} from "./relation-explanation.v2";
import {
  FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_ENGINE_ID_V1,
  FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_ENGINE_VERSION_V1,
  FISCAL_NOTIFICATION_DOCUMENT_KNOWLEDGE_SNAPSHOT_V1,
  type FiscalNotificationDocumentExplanationInputV1,
  type FiscalNotificationDocumentExplanationV1,
} from "./structured-document-explanation.v1";
import type { AeatOfficialCatalogProfileIdV9 } from "./knowledge/official-catalog-expansion.v9";
import {
  resolveProfileFieldLabelV2,
  type ProfileFieldKindV2,
} from "./extractor-core/profile-field-labels.v2";

export const FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_ENGINE_ID_V2 =
  "fiscal-notification-document-explanation" as const;
export const FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_ENGINE_VERSION_V2 =
  "2.0.0" as const;
export const FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_SCHEMA_VERSION_V2 =
  2 as const;

export const FISCAL_NOTIFICATION_EXPLANATION_ASSERTION_LEVELS_V2 =
  Object.freeze([
    "EXPLICIT_IN_DOCUMENT",
    "CALCULATED_FROM_PRINTED_VALUES",
    "OFFICIAL_CONTEXT",
    "NOT_PROVEN_BY_DOCUMENT",
  ] as const);

export type FiscalNotificationExplanationAssertionLevelV2 =
  (typeof FISCAL_NOTIFICATION_EXPLANATION_ASSERTION_LEVELS_V2)[number];

export const FISCAL_NOTIFICATION_EXPLANATION_SECTION_IDS_V2 = Object.freeze([
  "WHAT_DOCUMENT_SAYS",
  "WHY_RECEIVED",
  "RESULT",
  "KEY_DATA",
  "NEXT_STEP",
  "DEADLINE",
  "CONSEQUENCE",
  "NOT_PROVEN",
  "RELATIONSHIPS",
  "OFFICIAL_SOURCES",
] as const);
export const FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_V2_CANONICAL_SECTIONS =
  FISCAL_NOTIFICATION_EXPLANATION_SECTION_IDS_V2;

export type FiscalNotificationExplanationSectionIdV2 =
  (typeof FISCAL_NOTIFICATION_EXPLANATION_SECTION_IDS_V2)[number];
export type FiscalNotificationDocumentFamilyIdV2 =
  (typeof AEAT_DOCUMENT_PROFILE_IDS_V1)[number];
export type FiscalNotificationReferenceCodeV2 =
  AeatDocumentProfileV1["mustExtract"]["references"][number];
export type FiscalNotificationDateCodeV2 =
  AeatDocumentProfileV1["mustExtract"]["dates"][number];
export type FiscalNotificationMoneyCodeV2 =
  AeatDocumentProfileV1["mustExtract"]["money"][number];
export type FiscalNotificationFactCodeV2 =
  AeatDocumentProfileV1["mustExtract"]["facts"][number];
export type FiscalNotificationRoleCodeV2 =
  AeatDocumentProfileV1["mustExtract"]["participantRoles"][number];

export const FISCAL_NOTIFICATION_PRINTED_EFFECT_CODES_V2 = Object.freeze([
  "ASSESSMENT_PROPOSED",
  "ASSESSMENT_FINAL",
  "SANCTION_INITIATED",
  "SANCTION_RESOLVED",
  "SANCTION_REDUCTION_LOST",
  "DEFERRAL_REQUESTED",
  "DEFERRAL_SUBSTANTIATION_REQUIRED",
  "DEFERRAL_GRANTED",
  "DEFERRAL_MODIFIED",
  "DEFERRAL_DENIED",
  "DEFERRAL_INADMISSIBLE_OR_ARCHIVED",
  "DEFERRAL_BREACHED",
  "INTEREST_ASSESSED",
  "OFFSET_REQUESTED",
  "OFFSET_EX_OFFICIO",
  "OFFSET_TOTAL",
  "OFFSET_PARTIAL",
  "OFFSET_DENIED",
  "OFFSET_RESIDUAL",
  "EXTINCTION_CONFIRMED",
  "REFUND_RECOGNIZED",
  "REFUND_WITHHELD_OR_OFFSET",
  "REFUND_PAYMENT_CONFIRMED",
  "PAYMENT_FORM_ISSUED",
  "PAYMENT_CONFIRMED",
  "PAYMENT_FAILED_OR_REVERSED",
  "ENFORCEMENT_INITIATED",
  "SEIZURE_ORDERED",
  "SEIZURE_OBLIGATION_REITERATED",
  "THIRD_PARTY_RESPONSE_RECORDED",
  "SEIZED_FUNDS_TRANSFERRED",
  "SEIZURE_RELEASED",
  "APPEAL_FILED",
  "SUSPENSION_REQUESTED",
  "SUSPENSION_GRANTED",
  "SUSPENSION_DENIED",
  "REVIEW_REQUESTED",
  "REVIEW_RESOLVED",
  "ACT_CORRECTED",
  "ACT_CANCELLED",
  "LESIVITY_DECLARED",
  "LIABILITY_PROPOSED",
  "LIABILITY_DECLARED",
  "SUCCESSOR_COLLECTION_CONTINUED",
  "INSPECTION_INITIATED",
  "INSPECTION_ACTION_RECORDED",
  "INSPECTION_RESULT_PROPOSED",
  "INSPECTION_ASSESSED",
  "CENSUS_CHANGE_PROPOSED",
  "CENSUS_CHANGE_RESOLVED",
  "TAX_DOMICILE_DECIDED",
  "NIF_REVOKED",
  "NIF_REHABILITATED",
  "NOTIFICATION_EFFECTIVE",
  "FILING_CONFIRMED",
] as const);

export type FiscalNotificationPrintedEffectCodeV2 =
  (typeof FISCAL_NOTIFICATION_PRINTED_EFFECT_CODES_V2)[number];

export const FISCAL_NOTIFICATION_CALCULATION_IDS_V2 = Object.freeze([
  "SUM_OF_PRINTED_AMOUNTS",
  "DIFFERENCE_OF_PRINTED_AMOUNTS",
  "RESIDUAL_FROM_PRINTED_AMOUNTS",
] as const);

export type FiscalNotificationCalculationIdV2 =
  (typeof FISCAL_NOTIFICATION_CALCULATION_IDS_V2)[number];

export interface FiscalNotificationExplanationReferenceInputV2 {
  readonly referenceType: FiscalNotificationReferenceCodeV2;
  readonly value: string;
  readonly evidenceId: string;
}

export interface FiscalNotificationExplanationDateInputV2 {
  readonly dateType: FiscalNotificationDateCodeV2;
  readonly value: string;
  readonly evidenceId: string;
}

export interface FiscalNotificationExplanationMoneyInputV2 {
  readonly moneyType: FiscalNotificationMoneyCodeV2;
  readonly amountCents: number;
  readonly currency: "EUR";
  readonly evidenceId: string;
}

export interface FiscalNotificationExplanationFactInputV2 {
  readonly factCode: FiscalNotificationFactCodeV2;
  readonly evidenceId: string;
}

export interface FiscalNotificationExplanationRoleInputV2 {
  readonly roleCode: FiscalNotificationRoleCodeV2;
  readonly evidenceId: string;
}

export interface FiscalNotificationDocumentEvidenceInputV2 {
  readonly evidenceId: string;
  readonly pageNumber: number;
  readonly extractionMethod: "TEXT_LAYER" | "OCR" | "RULE" | "USER_CONFIRMED";
  readonly confidence: number;
  readonly assertionType: "EXPLICIT_IN_DOCUMENT";
  readonly ruleId: string;
  readonly ruleVersion: string;
}

export interface FiscalNotificationCalculatedValueInputV2 {
  readonly calculationId: FiscalNotificationCalculationIdV2;
  readonly resultMoneyType: FiscalNotificationMoneyCodeV2;
  readonly amountCents: number;
  readonly currency: "EUR";
  readonly operandMoneyTypes: readonly FiscalNotificationMoneyCodeV2[];
}

export interface FiscalNotificationPrintedEffectInputV2 {
  readonly effectCode: FiscalNotificationPrintedEffectCodeV2;
  readonly evidenceId: string;
}

export interface FiscalNotificationDocumentExplanationInputV2 {
  readonly familyId: FiscalNotificationDocumentFamilyIdV2 | "UNKNOWN" | null;
  readonly documentEvidence?: readonly FiscalNotificationDocumentEvidenceInputV2[];
  readonly references?: readonly FiscalNotificationExplanationReferenceInputV2[];
  readonly dates?: readonly FiscalNotificationExplanationDateInputV2[];
  readonly money?: readonly FiscalNotificationExplanationMoneyInputV2[];
  readonly factCodes?: readonly FiscalNotificationExplanationFactInputV2[];
  readonly roleCodes?: readonly FiscalNotificationExplanationRoleInputV2[];
  readonly relations?: readonly ExplainFiscalNotificationRelationInputV2[];
  readonly printedEffects?: readonly FiscalNotificationPrintedEffectInputV2[];
  readonly calculatedFromPrintedValues?: readonly FiscalNotificationCalculatedValueInputV2[];
}

export interface FiscalNotificationExplanationAssertionV2 {
  readonly code: string;
  readonly level: FiscalNotificationExplanationAssertionLevelV2;
  readonly text: string;
  /** V10 closed rules attach the exact official-source snapshot used. */
  readonly sourceVersion?: Readonly<{
    sourceId: string;
    lastChecked: string;
    effectiveFrom: string | null;
    effectiveTo: string | null;
    legalVersion: string | null;
  }>;
}

export interface FiscalNotificationExplanationSectionV2 {
  readonly id: FiscalNotificationExplanationSectionIdV2;
  readonly title: string;
  readonly assertions: readonly FiscalNotificationExplanationAssertionV2[];
}

export interface FiscalNotificationExplanationOfficialSourceV2 {
  readonly id: string;
  readonly title: string;
  readonly authority: "DOCUMENT" | "BOE" | "AEAT" | "Gobierno de España";
  readonly canonicalUrl: string | null;
  readonly assertionLevel: "EXPLICIT_IN_DOCUMENT" | "OFFICIAL_CONTEXT";
  readonly sourceVersion?: Readonly<{
    lastChecked: string;
    effectiveFrom: string | null;
    effectiveTo: string | null;
    legalVersion: string | null;
  }>;
}

export interface FiscalNotificationDocumentExplanationV2 {
  readonly schemaVersion: typeof FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_SCHEMA_VERSION_V2;
  readonly engineId: typeof FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_ENGINE_ID_V2;
  readonly engineVersion: typeof FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_ENGINE_VERSION_V2;
  readonly knowledgeReleaseId:
    | typeof AEAT_DOCUMENT_KNOWLEDGE_RELEASE_ID_V1
    | "aeat-official-catalog-expansion.2026-07-17.v9"
    | "aeat-p0-deep-contracts.2026-07-17.v10";
  readonly status: "EXPLAINED" | "INFORMATION_PENDING" | "REVIEW_REQUIRED";
  readonly familyId:
    | FiscalNotificationDocumentFamilyIdV2
    | AeatOfficialCatalogProfileIdV9
    | null;
  readonly familyName: string | null;
  readonly specializationId: string;
  readonly fallbackUsed: boolean;
  readonly sections: readonly FiscalNotificationExplanationSectionV2[];
  readonly relationships: readonly FiscalNotificationRelationExplanationV2[];
  readonly officialSources: readonly FiscalNotificationExplanationOfficialSourceV2[];
  readonly deadlineTrigger:
    | AeatDocumentProfileV1["plainLanguage"]["deadlineRule"]["trigger"]
    | string;
  readonly deadlineTriggerAvailable: boolean;
  readonly missingData: readonly (
    | "STRUCTURED_FACTS"
    | "REQUIRED_PROFILE_FIELDS"
    | "PRINTED_EFFECT"
    | "DEADLINE_TRIGGER"
  )[];
  readonly missingProfileFields: Readonly<{
    references: readonly string[];
    dates: readonly string[];
    money: readonly string[];
    facts: readonly string[];
    participantRoles: readonly string[];
  }>;
  readonly ambiguities: readonly (
    | "CONFLICTING_EFFECT_CODES"
    | "INCOMPATIBLE_EFFECT_CODE"
  )[];
  readonly documentFactsPolicy: "DOCUMENT_IS_PRIMARY";
  readonly legalContextPolicy: "OFFICIAL_CONTEXT_SEPARATE";
  readonly privacyPolicy: "NO_FREE_TEXT_PII_OR_SENSITIVE_REFERENCE_VALUES";
  readonly networkPolicy: "NO_NETWORK";
  readonly requiresHumanReview: true;
  readonly materializationPolicy: "PROHIBITED_UNTIL_REVIEW";
}

export class FiscalNotificationDocumentExplanationErrorV2 extends Error {
  readonly code = "INVALID_FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_V2" as const;

  constructor(readonly path: string) {
    super(`Invalid fiscal notification document explanation at ${path}`);
    this.name = "FiscalNotificationDocumentExplanationErrorV2";
  }
}

type NormalizedInput = Readonly<{
  familyId: FiscalNotificationDocumentFamilyIdV2 | null;
  explicitUnknown: boolean;
  references: readonly FiscalNotificationExplanationReferenceInputV2[];
  dates: readonly FiscalNotificationExplanationDateInputV2[];
  money: readonly FiscalNotificationExplanationMoneyInputV2[];
  factCodes: readonly FiscalNotificationExplanationFactInputV2[];
  roleCodes: readonly FiscalNotificationExplanationRoleInputV2[];
  relations: readonly ExplainFiscalNotificationRelationInputV2[];
  printedEffects: readonly FiscalNotificationPrintedEffectInputV2[];
  documentEvidence: readonly FiscalNotificationDocumentEvidenceInputV2[];
  calculatedFromPrintedValues: readonly FiscalNotificationCalculatedValueInputV2[];
}>;

const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const PROFILE_ID_SET = new Set<string>(AEAT_DOCUMENT_PROFILE_IDS_V1);
const REFERENCE_CODE_SET = new Set<string>(
  AEAT_DOCUMENT_KNOWLEDGE_V1.profiles.flatMap(
    (profile) => profile.mustExtract.references,
  ),
);
const DATE_CODE_SET = new Set<string>(
  AEAT_DOCUMENT_KNOWLEDGE_V1.profiles.flatMap(
    (profile) => profile.mustExtract.dates,
  ),
);
const MONEY_CODE_SET = new Set<string>(
  AEAT_DOCUMENT_KNOWLEDGE_V1.profiles.flatMap(
    (profile) => profile.mustExtract.money,
  ),
);
const FACT_CODE_SET = new Set<string>(
  AEAT_DOCUMENT_KNOWLEDGE_V1.profiles.flatMap(
    (profile) => profile.mustExtract.facts,
  ),
);
const ROLE_CODE_SET = new Set<string>(
  AEAT_DOCUMENT_KNOWLEDGE_V1.profiles.flatMap(
    (profile) => profile.mustExtract.participantRoles,
  ),
);
const PRINTED_EFFECT_CODE_SET = new Set<string>(
  FISCAL_NOTIFICATION_PRINTED_EFFECT_CODES_V2,
);
const CALCULATION_ID_SET = new Set<string>(
  FISCAL_NOTIFICATION_CALCULATION_IDS_V2,
);
const MAX_ITEMS = 200;
const MAX_REFERENCE_LENGTH = 256;
const MAX_EVIDENCE = 400;
const SIMPLE_VISIBLE_REFERENCE_TYPES = new Set<string>([
  "ACT_ID",
  "AGREEMENT_ID",
  "DEBT_KEY",
  "EXPEDIENTE_ID",
  "FILING_RECEIPT_ID",
  "FISCAL_YEAR",
  "LIQUIDATION_KEY",
  "MODEL",
  "NOTIFICATION_ID",
  "PAYMENT_RECEIPT_ID",
  "PROCEDURE_ID",
  "REGISTRY_ID",
  "REQUEST_NUMBER",
  "SEIZURE_ORDER_ID",
  "TAX_PERIOD",
  "THIRD_PARTY_RESPONSE_ID",
]);
const TAX_ID_LIKE_REFERENCE = /(?:^|[^A-Z0-9])(?:\d{8}[\s._-]?[A-Z]|[XYZ][\s._-]?\d{7}[\s._-]?[A-Z]|[ABCDEFGHJNPQRSUVW][\s._-]?\d{7}[\s._-]?[0-9A-J])(?=$|[^A-Z0-9])/iu;
const IBAN_LIKE_REFERENCE = /(?:^|[^A-Z0-9])ES(?:[\s._-]?\d){22}(?=$|[^A-Z0-9])/iu;
const PHONE_LIKE_REFERENCE = /(?:^|\D)(?:\+?34[\s._-]?)?[6789](?:[\s._-]?\d){8}(?:$|\D)/u;

const SECTION_TITLES = Object.freeze({
  WHAT_DOCUMENT_SAYS: "Qué te está diciendo este documento",
  WHY_RECEIVED: "Por qué lo has recibido",
  RESULT: "Resultado",
  KEY_DATA: "Datos clave",
  NEXT_STEP: "Qué tienes que hacer",
  DEADLINE: "Plazo y disparador",
  CONSEQUENCE: "Qué puede pasar si no se atiende",
  NOT_PROVEN: "Qué no demuestra este documento",
  RELATIONSHIPS: "Cómo encaja con tus otros documentos",
  OFFICIAL_SOURCES: "Fuentes oficiales",
} as const satisfies Readonly<
  Record<FiscalNotificationExplanationSectionIdV2, string>
>);

const EFFECT_PHRASES = Object.freeze({
  ASSESSMENT_PROPOSED:
    "El documento imprime una propuesta; no se trata como liquidación final.",
  ASSESSMENT_FINAL:
    "El documento imprime el resultado final de la liquidación identificada.",
  SANCTION_INITIATED:
    "El documento imprime el inicio o propuesta del procedimiento sancionador.",
  SANCTION_RESOLVED:
    "El documento imprime una resolución del procedimiento sancionador.",
  SANCTION_REDUCTION_LOST:
    "El documento imprime la pérdida de una reducción vinculada a la sanción original.",
  DEFERRAL_REQUESTED:
    "El documento acredita que se presentó una solicitud de aplazamiento o fraccionamiento.",
  DEFERRAL_SUBSTANTIATION_REQUIRED:
    "El documento imprime una subsanación o garantía pendiente para tramitar la solicitud.",
  DEFERRAL_GRANTED:
    "El documento imprime la concesión del calendario de aplazamiento o fraccionamiento.",
  DEFERRAL_MODIFIED:
    "El documento imprime una modificación del calendario o de sus condiciones.",
  DEFERRAL_DENIED:
    "El documento imprime la denegación de la solicitud de aplazamiento o fraccionamiento.",
  DEFERRAL_INADMISSIBLE_OR_ARCHIVED:
    "El documento imprime la inadmisión, el desistimiento o el archivo de la solicitud.",
  DEFERRAL_BREACHED:
    "El documento identifica una cuota o condición del plan como incumplida.",
  INTEREST_ASSESSED:
    "El documento imprime una liquidación separada de intereses.",
  OFFSET_REQUESTED:
    "El documento acredita una solicitud de compensación; no prueba todavía su aplicación.",
  OFFSET_EX_OFFICIO:
    "El documento imprime que la compensación se tramita de oficio.",
  OFFSET_TOTAL:
    "El documento imprime una compensación total para las partidas identificadas.",
  OFFSET_PARTIAL:
    "El documento imprime una compensación parcial y mantiene separado el saldo indicado.",
  OFFSET_DENIED:
    "El documento imprime que la compensación solicitada fue denegada.",
  OFFSET_RESIDUAL:
    "El documento imprime o permite identificar un crédito residual sin confirmar su transferencia.",
  EXTINCTION_CONFIRMED:
    "El documento imprime la extinción en el alcance y para las partidas identificadas.",
  REFUND_RECOGNIZED:
    "El documento imprime el reconocimiento de una devolución; no confirma todavía su pago.",
  REFUND_WITHHELD_OR_OFFSET:
    "El documento imprime una retención, aplicación o compensación sobre la devolución.",
  REFUND_PAYMENT_CONFIRMED:
    "El documento imprime la confirmación del pago de la devolución identificada.",
  PAYMENT_FORM_ISSUED:
    "El documento permite realizar un ingreso, pero no acredita que se haya efectuado.",
  PAYMENT_CONFIRMED:
    "El documento imprime la confirmación del ingreso identificado.",
  PAYMENT_FAILED_OR_REVERSED:
    "El documento imprime que el intento de pago falló, fue rechazado, anulado o devuelto.",
  ENFORCEMENT_INITIATED:
    "El documento imprime el inicio o continuación del cobro ejecutivo identificado.",
  SEIZURE_ORDERED:
    "El documento imprime una orden de embargo sobre el bien, crédito o derecho identificado.",
  SEIZURE_OBLIGATION_REITERATED:
    "El documento reitera una obligación impresa vinculada a una diligencia anterior.",
  THIRD_PARTY_RESPONSE_RECORDED:
    "El documento acredita una respuesta del tercero; no acredita por sí solo un ingreso.",
  SEIZED_FUNDS_TRANSFERRED:
    "El documento imprime el ingreso de fondos retenidos por la diligencia identificada.",
  SEIZURE_RELEASED:
    "El documento imprime un levantamiento total o parcial del embargo identificado.",
  APPEAL_FILED:
    "El documento acredita la presentación del recurso o reclamación identificados.",
  SUSPENSION_REQUESTED:
    "El documento acredita una solicitud de suspensión; no demuestra que haya sido concedida.",
  SUSPENSION_GRANTED:
    "El documento imprime que la suspensión solicitada fue concedida en el alcance indicado.",
  SUSPENSION_DENIED:
    "El documento imprime que la suspensión solicitada fue denegada.",
  REVIEW_REQUESTED:
    "El documento acredita una solicitud de revisión; no demuestra por sí solo un cambio del acto.",
  REVIEW_RESOLVED:
    "El documento imprime la resolución del recurso, reclamación o revisión identificados.",
  ACT_CORRECTED:
    "El documento imprime una corrección limitada a los extremos que identifica.",
  ACT_CANCELLED:
    "El documento imprime que el acto identificado queda sin efecto en el alcance indicado.",
  LESIVITY_DECLARED:
    "El documento imprime una declaración de lesividad; no anula por sí sola el acto favorable.",
  LIABILITY_PROPOSED:
    "El documento imprime una propuesta de responsabilidad y su trámite de audiencia.",
  LIABILITY_DECLARED:
    "El documento imprime una declaración de responsabilidad en el alcance identificado.",
  SUCCESSOR_COLLECTION_CONTINUED:
    "El documento imprime la continuación de la recaudación frente al sucesor identificado.",
  INSPECTION_INITIATED:
    "El documento imprime el inicio o ampliación de actuaciones inspectoras.",
  INSPECTION_ACTION_RECORDED:
    "El documento deja constancia impresa de una actuación inspectora concreta.",
  INSPECTION_RESULT_PROPOSED:
    "El documento imprime una propuesta de resultado inspector; no se trata como liquidación final.",
  INSPECTION_ASSESSED:
    "El documento imprime una liquidación derivada de las actuaciones inspectoras.",
  CENSUS_CHANGE_PROPOSED:
    "El documento imprime una modificación censal propuesta; no actualiza por sí sola el dato maestro.",
  CENSUS_CHANGE_RESOLVED:
    "El documento imprime una resolución censal en el alcance indicado.",
  TAX_DOMICILE_DECIDED:
    "El documento imprime una decisión sobre el domicilio fiscal.",
  NIF_REVOKED:
    "El documento imprime la revocación del NIF en el alcance y desde los efectos indicados.",
  NIF_REHABILITATED:
    "El documento imprime la rehabilitación del NIF en el alcance indicado.",
  NOTIFICATION_EFFECTIVE:
    "El documento imprime una fecha efectiva de notificación para el acto identificado.",
  FILING_CONFIRMED:
    "El documento acredita la presentación identificada mediante un justificante específico.",
} as const satisfies Readonly<Record<FiscalNotificationPrintedEffectCodeV2, string>>);

const EFFECTS_BY_FAMILY = Object.freeze({
  "notification.delivery_attempt": ["NOTIFICATION_EFFECTIVE"],
  "notification.publication_or_appearance": ["NOTIFICATION_EFFECTIVE"],
  "notification.dehu_envelope": ["NOTIFICATION_EFFECTIVE"],
  "assessment.allegations_and_proposal": ["ASSESSMENT_PROPOSED"],
  "assessment.final_provisional_assessment": ["ASSESSMENT_FINAL"],
  "sanction.initiation_and_hearing": ["SANCTION_INITIATED"],
  "sanction.resolution": ["SANCTION_RESOLVED"],
  "sanction.loss_of_reduction": ["SANCTION_REDUCTION_LOST"],
  "collection.deferral_request_receipt": ["DEFERRAL_REQUESTED"],
  "collection.deferral_substantiation_requirement": [
    "DEFERRAL_SUBSTANTIATION_REQUIRED",
  ],
  "collection.deferral_grant": ["DEFERRAL_GRANTED"],
  "collection.deferral_modification": ["DEFERRAL_MODIFIED"],
  "collection.deferral_denial": ["DEFERRAL_DENIED"],
  "collection.deferral_inadmissibility_or_archival": [
    "DEFERRAL_INADMISSIBLE_OR_ARCHIVED",
  ],
  "collection.deferral_breach": ["DEFERRAL_BREACHED"],
  "collection.interest_assessment": ["INTEREST_ASSESSED"],
  "collection.offset_requested": [
    "OFFSET_REQUESTED",
    "OFFSET_TOTAL",
    "OFFSET_PARTIAL",
    "OFFSET_DENIED",
    "OFFSET_RESIDUAL",
    "EXTINCTION_CONFIRMED",
  ],
  "collection.offset_ex_officio": [
    "OFFSET_EX_OFFICIO",
    "OFFSET_TOTAL",
    "OFFSET_PARTIAL",
    "OFFSET_RESIDUAL",
    "EXTINCTION_CONFIRMED",
  ],
  "collection.offset_resolution": [
    "OFFSET_TOTAL",
    "OFFSET_PARTIAL",
    "OFFSET_DENIED",
    "OFFSET_RESIDUAL",
    "EXTINCTION_CONFIRMED",
  ],
  "collection.extinction_or_balance_notice": [
    "OFFSET_TOTAL",
    "OFFSET_PARTIAL",
    "OFFSET_RESIDUAL",
    "EXTINCTION_CONFIRMED",
  ],
  "refund.request_or_recognition": ["REFUND_RECOGNIZED"],
  "refund.payment_communication": ["REFUND_PAYMENT_CONFIRMED"],
  "refund.undue_payment": [
    "REFUND_RECOGNIZED",
    "REFUND_PAYMENT_CONFIRMED",
  ],
  "refund.withholding_or_offset": ["REFUND_WITHHELD_OR_OFFSET"],
  "irpf.spouse_refund_suspension": [
    "OFFSET_TOTAL",
    "OFFSET_PARTIAL",
    "EXTINCTION_CONFIRMED",
  ],
  "review.guarantee_cost_reimbursement": [
    "REFUND_RECOGNIZED",
    "REFUND_PAYMENT_CONFIRMED",
  ],
  "payment.payment_form": ["PAYMENT_FORM_ISSUED"],
  "payment.receipt": ["PAYMENT_CONFIRMED"],
  "payment.failed_or_reversed": ["PAYMENT_FAILED_OR_REVERSED"],
  "collection.enforcement_order": ["ENFORCEMENT_INITIATED"],
  "seizure.bank_account": ["SEIZURE_ORDERED"],
  "seizure.movable_asset": ["SEIZURE_ORDERED"],
  "seizure.real_estate": ["SEIZURE_ORDERED"],
  "seizure.commercial_credits": ["SEIZURE_ORDERED"],
  "seizure.compliance_reiteration": ["SEIZURE_OBLIGATION_REITERATED"],
  "seizure.release": ["SEIZURE_RELEASED"],
  "seizure.wages_or_pensions": ["SEIZURE_ORDERED"],
  "seizure.securities_or_financial_assets": ["SEIZURE_ORDERED"],
  "seizure.cash_or_refund": ["SEIZURE_ORDERED"],
  "seizure.tpv_receipts": ["SEIZURE_ORDERED"],
  "seizure.business_income_or_rents": ["SEIZURE_ORDERED"],
  "seizure.third_party_response": ["THIRD_PARTY_RESPONSE_RECORDED"],
  "seizure.third_party_payment": ["SEIZED_FUNDS_TRANSFERRED"],
  "review.recurso_reposicion": ["APPEAL_FILED"],
  "review.economic_administrative_claim": ["APPEAL_FILED"],
  "review.suspension_request": ["SUSPENSION_REQUESTED"],
  "review.suspension_decision": ["SUSPENSION_GRANTED", "SUSPENSION_DENIED"],
  "review.resolution": ["REVIEW_RESOLVED", "ACT_CANCELLED"],
  "review.material_error": [
    "REVIEW_REQUESTED",
    "REVIEW_RESOLVED",
    "ACT_CORRECTED",
  ],
  "review.revocation": ["REVIEW_REQUESTED", "ACT_CANCELLED"],
  "review.nullity": ["REVIEW_REQUESTED", "ACT_CANCELLED"],
  "review.lesivity": ["LESIVITY_DECLARED"],
  "review.third_party_claim": ["APPEAL_FILED", "REVIEW_RESOLVED"],
  "liability.proposal": ["LIABILITY_PROPOSED"],
  "liability.final_resolution": ["LIABILITY_DECLARED"],
  "liability.solidary": ["LIABILITY_PROPOSED", "LIABILITY_DECLARED"],
  "liability.subsidiary": ["LIABILITY_PROPOSED", "LIABILITY_DECLARED"],
  "liability.successors": ["SUCCESSOR_COLLECTION_CONTINUED"],
  "inspection.procedure": ["INSPECTION_INITIATED"],
  "inspection.communication": ["INSPECTION_INITIATED"],
  "inspection.diligence": ["INSPECTION_ACTION_RECORDED"],
  "inspection.act_agreement": ["INSPECTION_RESULT_PROPOSED"],
  "inspection.act_conformity": ["INSPECTION_RESULT_PROPOSED"],
  "inspection.act_disagreement": ["INSPECTION_RESULT_PROPOSED"],
  "inspection.assessment": ["INSPECTION_ASSESSED"],
  "registry.tax_registration_resolution": ["CENSUS_CHANGE_RESOLVED"],
  "registry.census_requirement": [],
  "registry.census_proposal": ["CENSUS_CHANGE_PROPOSED"],
  "registry.tax_domicile_resolution": ["TAX_DOMICILE_DECIDED"],
  "registry.nif_revocation": ["NIF_REVOKED"],
  "registry.nif_rehabilitation": ["NIF_REHABILITATED"],
} as const satisfies Partial<
  Readonly<
    Record<
      FiscalNotificationDocumentFamilyIdV2,
      readonly FiscalNotificationPrintedEffectCodeV2[]
    >
  >
>);

/**
 * Returns the single effect that is intrinsic to an exact document-family
 * title. Families whose result can vary deliberately return null until an
 * explicit printed outcome is extracted.
 */
export function resolveIntrinsicPrintedEffectCodeV2(
  familyId: FiscalNotificationDocumentFamilyIdV2,
): FiscalNotificationPrintedEffectCodeV2 | null {
  const effects = resolveAllowedPrintedEffectCodesV2(familyId);
  return effects.length === 1 ? effects[0]! : null;
}

/**
 * Closed allowlist used by deterministic readers before they expose a printed
 * effect to the explanation engine. Returning a defensive frozen copy keeps
 * the source-controlled family contract immutable at runtime.
 */
export function resolveAllowedPrintedEffectCodesV2(
  familyId: FiscalNotificationDocumentFamilyIdV2,
): readonly FiscalNotificationPrintedEffectCodeV2[] {
  const effects = (
    EFFECTS_BY_FAMILY as Partial<
      Readonly<
        Record<
          FiscalNotificationDocumentFamilyIdV2,
          readonly FiscalNotificationPrintedEffectCodeV2[]
        >
      >
    >
  )[familyId] ?? Object.freeze([]);
  return Object.freeze([...effects]);
}

const SPECIALIZATION_BY_FAMILY = Object.freeze({
  "assessment.allegations_and_proposal": "ASSESSMENT_PROPOSAL",
  "assessment.final_provisional_assessment": "ASSESSMENT_FINAL",
  "assessment.no_adjustment_resolution": "ASSESSMENT_NO_ADJUSTMENT",
  "sanction.initiation_and_hearing": "SANCTION_INITIATION",
  "sanction.resolution": "SANCTION_RESOLUTION",
  "sanction.loss_of_reduction": "SANCTION_REDUCTION_LOSS",
  "collection.deferral_request_receipt": "DEFERRAL_REQUEST",
  "collection.deferral_substantiation_requirement": "DEFERRAL_SUBSTANTIATION",
  "collection.deferral_grant": "DEFERRAL_GRANT",
  "collection.deferral_modification": "DEFERRAL_MODIFICATION",
  "collection.deferral_denial": "DEFERRAL_DENIAL",
  "collection.deferral_inadmissibility_or_archival": "DEFERRAL_CLOSED",
  "collection.deferral_breach": "DEFERRAL_BREACH",
  "collection.interest_assessment": "DEFERRAL_OR_DEBT_INTEREST",
  "collection.offset_requested": "OFFSET_REQUESTED",
  "collection.offset_ex_officio": "OFFSET_EX_OFFICIO",
  "collection.offset_resolution": "OFFSET_RESOLUTION",
  "collection.extinction_or_balance_notice": "OFFSET_BALANCE",
  "refund.request_or_recognition": "REFUND_RECOGNITION",
  "refund.payment_communication": "REFUND_PAYMENT",
  "refund.undue_payment": "REFUND_UNDUE_PAYMENT",
  "refund.withholding_or_offset": "REFUND_WITHHOLDING",
  "payment.payment_form": "PAYMENT_FORM",
  "payment.receipt": "PAYMENT_RECEIPT",
  "payment.failed_or_reversed": "PAYMENT_FAILED",
  "collection.enforcement_order": "ENFORCEMENT_ORDER",
  "seizure.bank_account": "SEIZURE_BANK_ACCOUNT",
  "seizure.movable_asset": "SEIZURE_MOVABLE_ASSET",
  "seizure.real_estate": "SEIZURE_REAL_ESTATE",
  "seizure.commercial_credits": "SEIZURE_COMMERCIAL_CREDITS",
  "seizure.compliance_reiteration": "SEIZURE_REITERATION",
  "seizure.release": "SEIZURE_RELEASE",
  "seizure.wages_or_pensions": "SEIZURE_WAGES",
  "seizure.securities_or_financial_assets": "SEIZURE_SECURITIES",
  "seizure.cash_or_refund": "SEIZURE_CASH_OR_REFUND",
  "seizure.tpv_receipts": "SEIZURE_TPV",
  "seizure.business_income_or_rents": "SEIZURE_BUSINESS_INCOME",
  "seizure.third_party_response": "SEIZURE_THIRD_PARTY_RESPONSE",
  "seizure.third_party_payment": "SEIZURE_THIRD_PARTY_PAYMENT",
  "review.recurso_reposicion": "REVIEW_RECONSIDERATION",
  "review.economic_administrative_claim": "REVIEW_ECONOMIC_ADMINISTRATIVE",
  "review.suspension_request": "REVIEW_SUSPENSION_REQUEST",
  "review.suspension_decision": "REVIEW_SUSPENSION_DECISION",
  "review.resolution": "REVIEW_RESOLUTION",
  "liability.proposal": "LIABILITY_PROPOSAL",
  "liability.final_resolution": "LIABILITY_FINAL",
  "liability.solidary": "LIABILITY_SOLIDARY",
  "liability.subsidiary": "LIABILITY_SUBSIDIARY",
  "liability.successors": "LIABILITY_SUCCESSOR",
  "inspection.procedure": "INSPECTION_PROCEDURE",
  "inspection.communication": "INSPECTION_COMMUNICATION",
  "inspection.diligence": "INSPECTION_RECORD",
  "inspection.act_agreement": "INSPECTION_ACT_AGREEMENT",
  "inspection.act_conformity": "INSPECTION_ACT_CONFORMITY",
  "inspection.act_disagreement": "INSPECTION_ACT_DISAGREEMENT",
  "inspection.assessment": "INSPECTION_ASSESSMENT",
  "registry.tax_registration_resolution": "CENSUS_RESOLUTION",
  "registry.census_requirement": "CENSUS_REQUIREMENT",
  "registry.census_proposal": "CENSUS_PROPOSAL",
  "registry.tax_domicile_resolution": "CENSUS_TAX_DOMICILE",
  "registry.nif_revocation": "CENSUS_NIF_REVOCATION",
  "registry.nif_rehabilitation": "CENSUS_NIF_REHABILITATION",
} as const satisfies Partial<
  Readonly<Record<FiscalNotificationDocumentFamilyIdV2, string>>
>);

const CONFLICT_GROUPS = Object.freeze([
  Object.freeze(["OFFSET_TOTAL", "OFFSET_PARTIAL", "OFFSET_DENIED"]),
  Object.freeze(["SUSPENSION_GRANTED", "SUSPENSION_DENIED"]),
  Object.freeze(["PAYMENT_CONFIRMED", "PAYMENT_FAILED_OR_REVERSED"]),
  Object.freeze(["ASSESSMENT_PROPOSED", "ASSESSMENT_FINAL"]),
] as const satisfies readonly (readonly FiscalNotificationPrintedEffectCodeV2[])[]);

function invalid(path: string): never {
  throw new FiscalNotificationDocumentExplanationErrorV2(path);
}

function expectRecord(value: unknown, path: string): Record<string, unknown> {
  try {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype ||
      Object.getOwnPropertySymbols(value).length > 0
    ) {
      return invalid(path);
    }
    const snapshot: Record<string, unknown> = {};
    for (const key of Object.keys(Object.getOwnPropertyDescriptors(value))) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        !descriptor ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        return invalid(`${path}.$shape`);
      }
      snapshot[key] = descriptor.value;
    }
    return snapshot;
  } catch (error) {
    if (error instanceof FiscalNotificationDocumentExplanationErrorV2) throw error;
    return invalid(path);
  }
}

function expectKeys(
  value: Record<string, unknown>,
  path: string,
  allowed: readonly string[],
  required: readonly string[],
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) invalid(`${path}.${key}`);
  }
  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      invalid(`${path}.${key}`);
    }
  }
}

function expectArray(value: unknown, path: string): readonly unknown[] {
  try {
    if (
      !Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Array.prototype ||
      Object.getOwnPropertySymbols(value).length > 0
    ) {
      return invalid(path);
    }
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
    const length = lengthDescriptor?.value;
    if (!Number.isSafeInteger(length) || length < 0 || length > MAX_ITEMS) {
      return invalid(path);
    }
    const snapshot: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (
        !descriptor ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        return invalid(`${path}[${index}]`);
      }
      snapshot.push(descriptor.value);
    }
    if (Reflect.ownKeys(value).length !== length + 1) {
      return invalid(`${path}.$shape`);
    }
    return snapshot;
  } catch (error) {
    if (error instanceof FiscalNotificationDocumentExplanationErrorV2) throw error;
    return invalid(path);
  }
}

function expectBoundedString(value: unknown, path: string): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_REFERENCE_LENGTH ||
    value !== value.trim() ||
    CONTROL_CHARACTER_PATTERN.test(value)
  ) {
    return invalid(path);
  }
  return value;
}

function expectCode<T extends string>(
  value: unknown,
  allowed: ReadonlySet<string>,
  path: string,
): T {
  if (typeof value !== "string" || !allowed.has(value)) return invalid(path);
  return value as T;
}

function expectCents(value: unknown, path: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) return invalid(path);
  return Number(value);
}

function isIsoCalendarDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function expectIsoDate(value: unknown, path: string): string {
  const date = expectBoundedString(value, path);
  if (!isIsoCalendarDate(date)) return invalid(path);
  return date;
}

function visibleSimpleReferenceValue(
  reference: FiscalNotificationExplanationReferenceInputV2,
): string | null {
  if (!SIMPLE_VISIBLE_REFERENCE_TYPES.has(reference.referenceType)) return null;
  try {
    if (
      TAX_ID_LIKE_REFERENCE.test(reference.value) ||
      IBAN_LIKE_REFERENCE.test(reference.value) ||
      PHONE_LIKE_REFERENCE.test(reference.value)
    ) {
      return null;
    }
    const normalized = normalizeFiscalNotificationReferenceV2(reference.value);
    if (
      !/\d/u.test(normalized)
    ) {
      return null;
    }
    return normalized;
  } catch {
    return null;
  }
}

function optionalArray(
  value: Record<string, unknown>,
  key: string,
): readonly unknown[] {
  return value[key] === undefined ? Object.freeze([]) : expectArray(value[key], key);
}

function normalizeInput(input: unknown): NormalizedInput {
  const root = expectRecord(input, "input");
  const inputKeys = [
    "familyId",
    "documentEvidence",
    "references",
    "dates",
    "money",
    "factCodes",
    "roleCodes",
    "relations",
    "printedEffects",
    "calculatedFromPrintedValues",
  ] as const;
  expectKeys(root, "input", inputKeys, ["familyId"]);
  const explicitUnknown = root.familyId === null || root.familyId === "UNKNOWN";
  let familyId: FiscalNotificationDocumentFamilyIdV2 | null = null;
  if (!explicitUnknown) {
    if (typeof root.familyId !== "string" || !PROFILE_ID_SET.has(root.familyId)) {
      return invalid("input.familyId");
    }
    familyId = root.familyId as FiscalNotificationDocumentFamilyIdV2;
  }

  const documentEvidence = optionalArray(root, "documentEvidence").map(
    (item, index) => {
      const record = expectRecord(item, `input.documentEvidence[${index}]`);
      const keys = [
        "evidenceId",
        "pageNumber",
        "extractionMethod",
        "confidence",
        "assertionType",
        "ruleId",
        "ruleVersion",
      ] as const;
      expectKeys(record, `input.documentEvidence[${index}]`, keys, keys);
      if (
        !Number.isSafeInteger(record.pageNumber) ||
        Number(record.pageNumber) < 1 ||
        Number(record.pageNumber) > 10_000
      ) {
        invalid(`input.documentEvidence[${index}].pageNumber`);
      }
      if (
        typeof record.confidence !== "number" ||
        !Number.isFinite(record.confidence) ||
        record.confidence < 0 ||
        record.confidence > 1
      ) {
        invalid(`input.documentEvidence[${index}].confidence`);
      }
      if (
        !["TEXT_LAYER", "OCR", "RULE", "USER_CONFIRMED"].includes(
          String(record.extractionMethod),
        )
      ) {
        invalid(`input.documentEvidence[${index}].extractionMethod`);
      }
      if (record.assertionType !== "EXPLICIT_IN_DOCUMENT") {
        invalid(`input.documentEvidence[${index}].assertionType`);
      }
      return Object.freeze({
        evidenceId: expectBoundedString(
          record.evidenceId,
          `input.documentEvidence[${index}].evidenceId`,
        ),
        pageNumber: Number(record.pageNumber),
        extractionMethod: record.extractionMethod as FiscalNotificationDocumentEvidenceInputV2["extractionMethod"],
        confidence: record.confidence,
        assertionType: "EXPLICIT_IN_DOCUMENT" as const,
        ruleId: expectBoundedString(
          record.ruleId,
          `input.documentEvidence[${index}].ruleId`,
        ),
        ruleVersion: expectBoundedString(
          record.ruleVersion,
          `input.documentEvidence[${index}].ruleVersion`,
        ),
      });
    },
  );
  if (documentEvidence.length > MAX_EVIDENCE) {
    invalid("input.documentEvidence");
  }
  const evidenceIds = new Set(documentEvidence.map((item) => item.evidenceId));
  if (evidenceIds.size !== documentEvidence.length) {
    invalid("input.documentEvidence.evidenceId");
  }
  const requireEvidenceId = (value: unknown, path: string): string => {
    const evidenceId = expectBoundedString(value, path);
    if (!evidenceIds.has(evidenceId)) invalid(path);
    return evidenceId;
  };

  const references = optionalArray(root, "references").map((item, index) => {
    const record = expectRecord(item, `input.references[${index}]`);
    expectKeys(record, `input.references[${index}]`, ["referenceType", "value", "evidenceId"], [
      "referenceType",
      "value",
      "evidenceId",
    ]);
    return Object.freeze({
      referenceType: expectCode<FiscalNotificationReferenceCodeV2>(
        record.referenceType,
        REFERENCE_CODE_SET,
        `input.references[${index}].referenceType`,
      ),
      value: expectBoundedString(record.value, `input.references[${index}].value`),
      evidenceId: requireEvidenceId(
        record.evidenceId,
        `input.references[${index}].evidenceId`,
      ),
    });
  });

  const dates = optionalArray(root, "dates").map((item, index) => {
    const record = expectRecord(item, `input.dates[${index}]`);
    expectKeys(record, `input.dates[${index}]`, ["dateType", "value", "evidenceId"], [
      "dateType",
      "value",
      "evidenceId",
    ]);
    return Object.freeze({
      dateType: expectCode<FiscalNotificationDateCodeV2>(
        record.dateType,
        DATE_CODE_SET,
        `input.dates[${index}].dateType`,
      ),
      value: expectIsoDate(record.value, `input.dates[${index}].value`),
      evidenceId: requireEvidenceId(
        record.evidenceId,
        `input.dates[${index}].evidenceId`,
      ),
    });
  });

  const money = optionalArray(root, "money").map((item, index) => {
    const record = expectRecord(item, `input.money[${index}]`);
    expectKeys(record, `input.money[${index}]`, ["moneyType", "amountCents", "currency", "evidenceId"], [
      "moneyType",
      "amountCents",
      "currency",
      "evidenceId",
    ]);
    if (record.currency !== "EUR") invalid(`input.money[${index}].currency`);
    return Object.freeze({
      moneyType: expectCode<FiscalNotificationMoneyCodeV2>(
        record.moneyType,
        MONEY_CODE_SET,
        `input.money[${index}].moneyType`,
      ),
      amountCents: expectCents(record.amountCents, `input.money[${index}].amountCents`),
      currency: "EUR" as const,
      evidenceId: requireEvidenceId(
        record.evidenceId,
        `input.money[${index}].evidenceId`,
      ),
    });
  });

  const factCodes = optionalArray(root, "factCodes").map((item, index) => {
    const record = expectRecord(item, `input.factCodes[${index}]`);
    expectKeys(record, `input.factCodes[${index}]`, ["factCode", "evidenceId"], ["factCode", "evidenceId"]);
    return Object.freeze({
      factCode: expectCode<FiscalNotificationFactCodeV2>(record.factCode, FACT_CODE_SET, `input.factCodes[${index}].factCode`),
      evidenceId: requireEvidenceId(record.evidenceId, `input.factCodes[${index}].evidenceId`),
    });
  });
  if (new Set(factCodes.map((item) => item.factCode)).size !== factCodes.length) {
    invalid("input.factCodes");
  }
  const roleCodes = optionalArray(root, "roleCodes").map((item, index) => {
    const record = expectRecord(item, `input.roleCodes[${index}]`);
    expectKeys(record, `input.roleCodes[${index}]`, ["roleCode", "evidenceId"], ["roleCode", "evidenceId"]);
    return Object.freeze({
      roleCode: expectCode<FiscalNotificationRoleCodeV2>(record.roleCode, ROLE_CODE_SET, `input.roleCodes[${index}].roleCode`),
      evidenceId: requireEvidenceId(record.evidenceId, `input.roleCodes[${index}].evidenceId`),
    });
  });
  if (new Set(roleCodes.map((item) => item.roleCode)).size !== roleCodes.length) {
    invalid("input.roleCodes");
  }
  const printedEffects = optionalArray(root, "printedEffects").map(
    (item, index) => {
      const record = expectRecord(item, `input.printedEffects[${index}]`);
      expectKeys(
        record,
        `input.printedEffects[${index}]`,
        ["effectCode", "evidenceId"],
        ["effectCode", "evidenceId"],
      );
      return Object.freeze({
        effectCode: expectCode<FiscalNotificationPrintedEffectCodeV2>(
          record.effectCode,
          PRINTED_EFFECT_CODE_SET,
          `input.printedEffects[${index}].effectCode`,
        ),
        evidenceId: requireEvidenceId(
          record.evidenceId,
          `input.printedEffects[${index}].evidenceId`,
        ),
      });
    },
  );
  if (new Set(printedEffects.map((item) => item.evidenceId)).size !== printedEffects.length) {
    invalid("input.printedEffects.evidenceId");
  }

  const relations = optionalArray(root, "relations").map((item, index) => {
    const record = expectRecord(item, `input.relations[${index}]`);
    const keys = [
      "relationType",
      "status",
      "exactReferenceConfirmed",
      "userConfirmed",
      "printedEffectProven",
    ] as const;
    expectKeys(record, `input.relations[${index}]`, keys, keys);
    if (
      typeof record.exactReferenceConfirmed !== "boolean" ||
      typeof record.userConfirmed !== "boolean" ||
      typeof record.printedEffectProven !== "boolean"
    ) {
      invalid(`input.relations[${index}]`);
    }
    return Object.freeze({
      relationType: record.relationType,
      status: record.status,
      exactReferenceConfirmed: record.exactReferenceConfirmed,
      userConfirmed: record.userConfirmed,
      printedEffectProven: record.printedEffectProven,
    });
  });

  const calculatedFromPrintedValues = optionalArray(
    root,
    "calculatedFromPrintedValues",
  ).map((item, index) => {
    const record = expectRecord(item, `input.calculatedFromPrintedValues[${index}]`);
    const keys = [
      "calculationId",
      "resultMoneyType",
      "amountCents",
      "currency",
      "operandMoneyTypes",
    ] as const;
    expectKeys(record, `input.calculatedFromPrintedValues[${index}]`, keys, keys);
    if (record.currency !== "EUR") {
      invalid(`input.calculatedFromPrintedValues[${index}].currency`);
    }
    const operands = normalizeCodeArray<FiscalNotificationMoneyCodeV2>(
      expectArray(
        record.operandMoneyTypes,
        `input.calculatedFromPrintedValues[${index}].operandMoneyTypes`,
      ),
      MONEY_CODE_SET,
      `input.calculatedFromPrintedValues[${index}].operandMoneyTypes`,
    );
    if (operands.length === 0) {
      invalid(`input.calculatedFromPrintedValues[${index}].operandMoneyTypes`);
    }
    return Object.freeze({
      calculationId: expectCode<FiscalNotificationCalculationIdV2>(
        record.calculationId,
        CALCULATION_ID_SET,
        `input.calculatedFromPrintedValues[${index}].calculationId`,
      ),
      resultMoneyType: expectCode<FiscalNotificationMoneyCodeV2>(
        record.resultMoneyType,
        MONEY_CODE_SET,
        `input.calculatedFromPrintedValues[${index}].resultMoneyType`,
      ),
      amountCents: expectCents(
        record.amountCents,
        `input.calculatedFromPrintedValues[${index}].amountCents`,
      ),
      currency: "EUR" as const,
      operandMoneyTypes: operands,
    });
  });

  return Object.freeze({
    familyId,
    explicitUnknown,
    references: Object.freeze(references),
    dates: Object.freeze(dates),
    money: Object.freeze(money),
    factCodes,
    roleCodes,
    relations: Object.freeze(relations),
    printedEffects: Object.freeze(printedEffects),
    documentEvidence: Object.freeze(documentEvidence),
    calculatedFromPrintedValues: Object.freeze(calculatedFromPrintedValues),
  });
}

function normalizeCodeArray<T extends string>(
  values: readonly unknown[],
  allowed: ReadonlySet<string>,
  path: string,
): readonly T[] {
  const result: T[] = [];
  const seen = new Set<string>();
  values.forEach((value, index) => {
    const code = expectCode<T>(value, allowed, `${path}[${index}]`);
    if (seen.has(code)) invalid(`${path}[${index}]`);
    seen.add(code);
    result.push(code);
  });
  return Object.freeze(result);
}

function assertion(
  code: string,
  level: FiscalNotificationExplanationAssertionLevelV2,
  text: string,
): FiscalNotificationExplanationAssertionV2 {
  if (
    text.length === 0 ||
    text.length > 1_024 ||
    CONTROL_CHARACTER_PATTERN.test(text)
  ) {
    return invalid(`assertion.${code}`);
  }
  return Object.freeze({ code, level, text });
}

function section(
  id: FiscalNotificationExplanationSectionIdV2,
  assertions: readonly FiscalNotificationExplanationAssertionV2[],
): FiscalNotificationExplanationSectionV2 {
  if (assertions.length === 0) invalid(`sections.${id}`);
  return Object.freeze({
    id,
    title: SECTION_TITLES[id],
    assertions: Object.freeze([...assertions]),
  });
}

function formatEuros(cents: number): string {
  const euros = Math.floor(cents / 100);
  const decimals = String(cents % 100).padStart(2, "0");
  return `${String(euros).replace(/\B(?=(\d{3})+(?!\d))/gu, ".")},${decimals} €`;
}

function humanProfileFieldLabel(
  kind: ProfileFieldKindV2,
  fieldCode: string,
): string {
  return resolveProfileFieldLabelV2(kind, fieldCode)?.labelEs ??
    "Dato observado";
}

function formatExplanationDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function v1KeyFactLabel(
  item: FiscalNotificationExplanationAssertionV2,
): string {
  const candidates = [
    ["REFERENCE_", "REFERENCE", REFERENCE_CODE_SET],
    ["DATE_", "DATE", DATE_CODE_SET],
    ["MONEY_", "MONEY", MONEY_CODE_SET],
    ["FACT_", "FACT", FACT_CODE_SET],
    ["ROLE_", "PARTICIPANT_ROLE", ROLE_CODE_SET],
  ] as const;
  for (const [prefix, kind, codes] of candidates) {
    if (!item.code.startsWith(prefix)) continue;
    const fieldCode = item.code.slice(prefix.length);
    if (codes.has(fieldCode)) return humanProfileFieldLabel(kind, fieldCode);
  }
  return item.level === "CALCULATED_FROM_PRINTED_VALUES"
    ? "Cálculo a partir de importes impresos"
    : "Dato observado";
}

function detectEffectAmbiguities(
  familyId: FiscalNotificationDocumentFamilyIdV2,
  effects: readonly FiscalNotificationPrintedEffectCodeV2[],
): {
  readonly compatible: readonly FiscalNotificationPrintedEffectCodeV2[];
  readonly ambiguities: readonly (
    | "CONFLICTING_EFFECT_CODES"
    | "INCOMPATIBLE_EFFECT_CODE"
  )[];
} {
  const allowed = (EFFECTS_BY_FAMILY[familyId as keyof typeof EFFECTS_BY_FAMILY] ??
    []) as readonly FiscalNotificationPrintedEffectCodeV2[];
  const incompatible = effects.filter((effect) => !allowed.includes(effect));
  const compatible = effects.filter((effect) => allowed.includes(effect));
  const conflict = CONFLICT_GROUPS.some(
    (group) => group.filter((effect) => compatible.includes(effect)).length > 1,
  );
  const ambiguities: Array<
    "CONFLICTING_EFFECT_CODES" | "INCOMPATIBLE_EFFECT_CODE"
  > = [];
  if (conflict) ambiguities.push("CONFLICTING_EFFECT_CODES");
  if (incompatible.length > 0) ambiguities.push("INCOMPATIBLE_EFFECT_CODE");
  return Object.freeze({
    compatible: conflict ? Object.freeze([]) : Object.freeze(compatible),
    ambiguities: Object.freeze(ambiguities),
  });
}

function resolveSources(
  profile: AeatDocumentProfileV1,
): readonly FiscalNotificationExplanationOfficialSourceV2[] {
  const sourceIds = [...profile.officialSourceIds].sort((left, right) =>
    left === "DOC_PRIMARY" ? -1 : right === "DOC_PRIMARY" ? 1 : 0,
  );
  return Object.freeze(
    sourceIds.map((sourceId) => {
      const source = AEAT_DOCUMENT_KNOWLEDGE_V1.officialSources[sourceId];
      return Object.freeze({
        id: sourceId,
        title: source.title,
        authority: source.authority,
        canonicalUrl:
          sourceId === "AEAT_NOTIFICATIONS"
            ? AEAT_NOTIFICATIONS_CANONICAL_URL_V1
            : source.url,
        assertionLevel:
          sourceId === "DOC_PRIMARY"
            ? ("EXPLICIT_IN_DOCUMENT" as const)
            : ("OFFICIAL_CONTEXT" as const),
      });
    }),
  );
}

function deadlineAvailable(
  trigger: AeatDocumentProfileV1["plainLanguage"]["deadlineRule"]["trigger"],
  input: NormalizedInput,
): boolean {
  switch (trigger) {
    case null:
      return false;
    case "EFFECTIVE_NOTIFICATION_DATE":
    case "EFFECTIVE_NOTIFICATION_DATE_OR_RECEIPT":
      return input.dates.some(
        (date) => date.dateType === "EFFECTIVE_NOTIFICATION_DATE",
      );
    case "EXPLICIT_DUE_DATE":
      return input.dates.some((date) =>
        [
          "EXPIRATION_DATE",
          "VOLUNTARY_PAYMENT_DEADLINE",
          "APPEAL_DEADLINE",
          "RESPONSE_DEADLINE",
        ].includes(date.dateType),
      );
    case "INSTALLMENT_DUE_DATE":
      return input.dates.some((date) => date.dateType === "INSTALLMENT_DUE_DATE");
    case "FUTURE_EVENT":
      return false;
  }
}

function specializationId(profile: AeatDocumentProfileV1): string {
  return (
    SPECIALIZATION_BY_FAMILY[
      profile.id as keyof typeof SPECIALIZATION_BY_FAMILY
    ] ?? `PROFILE_${profile.id.toUpperCase().replace(/[^A-Z0-9]+/gu, "_")}`
  );
}

function structuredItemCount(input: NormalizedInput): number {
  return (
    input.references.length +
    input.dates.length +
    input.money.length +
    input.factCodes.length +
    input.roleCodes.length +
    input.relations.length +
    input.printedEffects.length +
    input.calculatedFromPrintedValues.length
  );
}

function missingProfileFields(
  input: NormalizedInput,
  profile: AeatDocumentProfileV1,
): FiscalNotificationDocumentExplanationV2["missingProfileFields"] {
  const references = new Set(input.references.map((item) => item.referenceType));
  const dates = new Set(input.dates.map((item) => item.dateType));
  const money = new Set(input.money.map((item) => item.moneyType));
  const facts = new Set(input.factCodes.map((item) => item.factCode));
  const roles = new Set(input.roleCodes.map((item) => item.roleCode));
  return Object.freeze({
    references: Object.freeze(
      profile.mustExtract.references.filter((code) => !references.has(code)),
    ),
    dates: Object.freeze(profile.mustExtract.dates.filter((code) => !dates.has(code))),
    money: Object.freeze(profile.mustExtract.money.filter((code) => !money.has(code))),
    facts: Object.freeze(profile.mustExtract.facts.filter((code) => !facts.has(code))),
    participantRoles: Object.freeze(
      profile.mustExtract.participantRoles.filter((code) => !roles.has(code)),
    ),
  });
}

function hasMissingProfileFields(
  value: FiscalNotificationDocumentExplanationV2["missingProfileFields"],
): boolean {
  return (
    value.references.length > 0 ||
    value.dates.length > 0 ||
    value.money.length > 0 ||
    value.facts.length > 0 ||
    value.participantRoles.length > 0
  );
}

function validateProfileStructuredContract(
  input: NormalizedInput,
  profile: AeatDocumentProfileV1,
): void {
  const allowedReferences = new Set<string>(profile.mustExtract.references);
  const allowedDates = new Set<string>(profile.mustExtract.dates);
  const allowedMoney = new Set<string>(profile.mustExtract.money);
  const allowedFacts = new Set<string>(profile.mustExtract.facts);
  const allowedRoles = new Set<string>(profile.mustExtract.participantRoles);

  input.references.forEach((item, index) => {
    if (!allowedReferences.has(item.referenceType)) {
      invalid(`input.references[${index}].referenceType`);
    }
  });
  input.dates.forEach((item, index) => {
    if (!allowedDates.has(item.dateType)) {
      invalid(`input.dates[${index}].dateType`);
    }
  });
  input.money.forEach((item, index) => {
    if (!allowedMoney.has(item.moneyType)) {
      invalid(`input.money[${index}].moneyType`);
    }
  });
  input.factCodes.forEach((item, index) => {
    if (!allowedFacts.has(item.factCode)) invalid(`input.factCodes[${index}].factCode`);
  });
  input.roleCodes.forEach((item, index) => {
    if (!allowedRoles.has(item.roleCode)) invalid(`input.roleCodes[${index}].roleCode`);
  });

  input.calculatedFromPrintedValues.forEach((calculation, index) => {
    if (!allowedMoney.has(calculation.resultMoneyType)) {
      invalid(
        `input.calculatedFromPrintedValues[${index}].resultMoneyType`,
      );
    }
    const operandValues = calculation.operandMoneyTypes.map(
      (operandType, operandIndex) => {
        if (!allowedMoney.has(operandType)) {
          return invalid(
            `input.calculatedFromPrintedValues[${index}].operandMoneyTypes[${operandIndex}]`,
          );
        }
        const matches = input.money.filter(
          (moneyItem) => moneyItem.moneyType === operandType,
        );
        if (matches.length !== 1) {
          return invalid(
            `input.calculatedFromPrintedValues[${index}].operandMoneyTypes[${operandIndex}]`,
          );
        }
        return matches[0].amountCents;
      },
    );
    const expectedAmount =
      calculation.calculationId === "SUM_OF_PRINTED_AMOUNTS"
        ? operandValues.reduce((total, amount) => total + amount, 0)
        : operandValues.slice(1).reduce(
            (remaining, amount) => remaining - amount,
            operandValues[0],
          );
    if (
      !Number.isSafeInteger(expectedAmount) ||
      expectedAmount < 0 ||
      expectedAmount !== calculation.amountCents
    ) {
      invalid(`input.calculatedFromPrintedValues[${index}].amountCents`);
    }
  });
}

export function explainFiscalNotificationDocumentV2(
  value: FiscalNotificationDocumentExplanationInputV2,
): FiscalNotificationDocumentExplanationV2 {
  const input = normalizeInput(value);
  if (input.explicitUnknown || input.familyId === null) {
    return unknownExplanation();
  }
  const profile = resolveAeatDocumentProfileV1(input.familyId);
  if (!profile) return invalid("input.familyId");
  validateProfileStructuredContract(input, profile);
  const effectEvaluation = detectEffectAmbiguities(
    input.familyId,
    input.printedEffects.map((item) => item.effectCode),
  );
  const hasEffectEvidence = effectEvaluation.compatible.length > 0;
  const relationships = Object.freeze(
    input.relations.map((relation) =>
      explainFiscalNotificationRelationV2({
        ...relation,
        printedEffectProven:
          relation.printedEffectProven &&
          hasEffectEvidence &&
          effectEvaluation.ambiguities.length === 0,
      }),
    ),
  );
  const officialSources = resolveSources(profile);
  const triggerAvailable = deadlineAvailable(
    profile.plainLanguage.deadlineRule.trigger,
    input,
  );
  const missingData: Array<
    "STRUCTURED_FACTS" | "REQUIRED_PROFILE_FIELDS" | "PRINTED_EFFECT" | "DEADLINE_TRIGGER"
  > = [];
  if (structuredItemCount(input) === 0) missingData.push("STRUCTURED_FACTS");
  const missingRequiredFields = missingProfileFields(input, profile);
  if (hasMissingProfileFields(missingRequiredFields)) {
    missingData.push("REQUIRED_PROFILE_FIELDS");
  }
  const allowedEffects = (EFFECTS_BY_FAMILY[
    input.familyId as keyof typeof EFFECTS_BY_FAMILY
  ] ?? []) as readonly FiscalNotificationPrintedEffectCodeV2[];
  if (allowedEffects.length > 0 && !hasEffectEvidence) {
    missingData.push("PRINTED_EFFECT");
  }
  if (
    profile.plainLanguage.deadlineRule.trigger !== null &&
    !triggerAvailable
  ) {
    missingData.push("DEADLINE_TRIGGER");
  }

  const keyDataAssertions: FiscalNotificationExplanationAssertionV2[] = [];
  input.references.forEach((reference) => {
    const visibleValue = visibleSimpleReferenceValue(reference);
    const label = humanProfileFieldLabel(
      "REFERENCE",
      reference.referenceType,
    );
    keyDataAssertions.push(
      assertion(
        `REFERENCE_${reference.referenceType}`,
        "EXPLICIT_IN_DOCUMENT",
        visibleValue
          ? `${label}: ${visibleValue}.`
          : `Se ha detectado ${label.toLocaleLowerCase("es-ES")}; su valor no se muestra por privacidad.`,
      ),
    );
  });
  input.dates.forEach((date) => {
    const label = humanProfileFieldLabel("DATE", date.dateType);
    keyDataAssertions.push(
      assertion(
        `DATE_${date.dateType}`,
        "EXPLICIT_IN_DOCUMENT",
        `${label}: ${formatExplanationDate(date.value)}.`,
      ),
    );
  });
  input.money.forEach((money) => {
    const label = humanProfileFieldLabel("MONEY", money.moneyType);
    keyDataAssertions.push(
      assertion(
        `MONEY_${money.moneyType}`,
        "EXPLICIT_IN_DOCUMENT",
        `${label}: ${formatEuros(money.amountCents)}.`,
      ),
    );
  });
  input.factCodes.forEach(({ factCode }) => {
    const label = humanProfileFieldLabel("FACT", factCode);
    keyDataAssertions.push(
      assertion(
        `FACT_${factCode}`,
        "EXPLICIT_IN_DOCUMENT",
        `${label} consta en el documento.`,
      ),
    );
  });
  input.roleCodes.forEach(({ roleCode }) => {
    const label = humanProfileFieldLabel("PARTICIPANT_ROLE", roleCode);
    keyDataAssertions.push(
      assertion(
        `ROLE_${roleCode}`,
        "EXPLICIT_IN_DOCUMENT",
        `${label} figura en el documento.`,
      ),
    );
  });
  input.calculatedFromPrintedValues.forEach((calculation) => {
    const label = humanProfileFieldLabel(
      "MONEY",
      calculation.resultMoneyType,
    );
    keyDataAssertions.push(
      assertion(
        `CALCULATION_${calculation.calculationId}_${calculation.resultMoneyType}`,
        "CALCULATED_FROM_PRINTED_VALUES",
        `${label} calculado a partir de importes impresos: ${formatEuros(calculation.amountCents)}.`,
      ),
    );
  });
  if (keyDataAssertions.length === 0) {
    keyDataAssertions.push(
      assertion(
        "KEY_DATA_PENDING",
        "NOT_PROVEN_BY_DOCUMENT",
        "Faltan datos estructurados confirmados para mostrar referencias, fechas, importes, hechos o roles.",
      ),
    );
  }

  const resultAssertions: FiscalNotificationExplanationAssertionV2[] = [
    assertion(
      "PROFILE_RESULT_RULE",
      "OFFICIAL_CONTEXT",
      profile.plainLanguage.resultRule,
    ),
  ];
  if (effectEvaluation.ambiguities.length === 0) {
    effectEvaluation.compatible.forEach((effectCode) => {
      resultAssertions.push(
        assertion(
          `PRINTED_EFFECT_${effectCode}`,
          "EXPLICIT_IN_DOCUMENT",
          EFFECT_PHRASES[effectCode],
        ),
      );
    });
  } else {
    resultAssertions.push(
      assertion(
        "EFFECT_REVIEW_REQUIRED",
        "NOT_PROVEN_BY_DOCUMENT",
        "Los códigos de efecto recibidos son incompatibles o no corresponden a esta familia; no se afirma ningún efecto.",
      ),
    );
  }

  const deadlineAssertions: FiscalNotificationExplanationAssertionV2[] = [
    assertion(
      "PROFILE_DEADLINE_RULE",
      "OFFICIAL_CONTEXT",
      profile.plainLanguage.deadlineRule.text,
    ),
  ];
  if (profile.plainLanguage.deadlineRule.trigger === null) {
    deadlineAssertions.push(
      assertion(
        "DEADLINE_TRIGGER_NOT_APPLICABLE",
        "NOT_PROVEN_BY_DOCUMENT",
        profile.plainLanguage.deadlineRule.fallback,
      ),
    );
  } else if (triggerAvailable) {
    deadlineAssertions.push(
      assertion(
        "DEADLINE_TRIGGER_AVAILABLE",
        "EXPLICIT_IN_DOCUMENT",
        `El disparador ${profile.plainLanguage.deadlineRule.trigger} está disponible como dato estructurado.`,
      ),
    );
  } else {
    deadlineAssertions.push(
      assertion(
        "DEADLINE_TRIGGER_PENDING",
        "NOT_PROVEN_BY_DOCUMENT",
        profile.plainLanguage.deadlineRule.fallback,
      ),
    );
  }
  deadlineAssertions.push(
    assertion(
      "NO_AUTOMATIC_LAST_DAY",
      "NOT_PROVEN_BY_DOCUMENT",
      "No se calcula el último día ni se usa la fecha de firma, escaneo o subida como sustituto del disparador jurídico.",
    ),
  );

  const consequenceAssertions: FiscalNotificationExplanationAssertionV2[] = [];
  if (input.factCodes.some((item) => item.factCode === "EXPLICIT_CONSEQUENCE")) {
    consequenceAssertions.push(
      assertion(
        "EXPLICIT_CONSEQUENCE_PRESENT",
        "EXPLICIT_IN_DOCUMENT",
        "El documento contiene una consecuencia expresa; su texto bruto no se reproduce en la explicación sencilla.",
      ),
    );
  }
  profile.plainLanguage.nonComplianceContext.forEach((text, index) => {
    consequenceAssertions.push(
      assertion(`OFFICIAL_CONSEQUENCE_CONTEXT_${index + 1}`, "OFFICIAL_CONTEXT", text),
    );
  });
  if (consequenceAssertions.length === 0) {
    consequenceAssertions.push(
      assertion(
        "CONSEQUENCE_NOT_PROVEN",
        "NOT_PROVEN_BY_DOCUMENT",
        "Este documento no permite afirmar una consecuencia concreta por no atenderlo.",
      ),
    );
  }

  const relationshipAssertions = relationships.length
    ? relationships.map((relationship, index) =>
        assertion(
          `RELATION_${index + 1}_${relationship.relationType}`,
          relationship.effectAssertion === "EXPLICIT_IN_DOCUMENT"
            ? "EXPLICIT_IN_DOCUMENT"
            : "NOT_PROVEN_BY_DOCUMENT",
          relationship.phrase,
        ),
      )
    : [
        assertion(
          "RELATION_PENDING",
          "NOT_PROVEN_BY_DOCUMENT",
          "No hay una relación documental confirmada para mostrar.",
        ),
      ];

  const sections = Object.freeze([
    section("WHAT_DOCUMENT_SAYS", [
      assertion("PROFILE_WHAT_IT_IS", "OFFICIAL_CONTEXT", profile.plainLanguage.whatItIs),
    ]),
    section("WHY_RECEIVED", [
      assertion("PROFILE_WHY_RECEIVED", "OFFICIAL_CONTEXT", profile.plainLanguage.whyReceived),
    ]),
    section("RESULT", resultAssertions),
    section("KEY_DATA", keyDataAssertions),
    section("NEXT_STEP", [
      assertion("PROFILE_NEXT_STEP", "OFFICIAL_CONTEXT", profile.plainLanguage.nextStepRule),
    ]),
    section("DEADLINE", deadlineAssertions),
    section("CONSEQUENCE", consequenceAssertions),
    section(
      "NOT_PROVEN",
      profile.plainLanguage.notProvenByThisDocument.map((text, index) =>
        assertion(`PROFILE_NOT_PROVEN_${index + 1}`, "NOT_PROVEN_BY_DOCUMENT", text),
      ),
    ),
    section("RELATIONSHIPS", relationshipAssertions),
    section(
      "OFFICIAL_SOURCES",
      officialSources.map((source) =>
        assertion(
          `SOURCE_${source.id}`,
          source.assertionLevel,
          source.id === "DOC_PRIMARY"
            ? `Fuente primaria: ${source.title}.`
            : `Contexto oficial: ${source.title}.`,
        ),
      ),
    ),
  ]);

  const status =
    effectEvaluation.ambiguities.length > 0
      ? ("REVIEW_REQUIRED" as const)
      : missingData.length > 0
        ? ("INFORMATION_PENDING" as const)
        : ("EXPLAINED" as const);

  return Object.freeze({
    schemaVersion: FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_SCHEMA_VERSION_V2,
    engineId: FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_ENGINE_ID_V2,
    engineVersion: FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_ENGINE_VERSION_V2,
    knowledgeReleaseId: AEAT_DOCUMENT_KNOWLEDGE_RELEASE_ID_V1,
    status,
    familyId: input.familyId,
    familyName: profile.nameEs,
    specializationId: specializationId(profile),
    fallbackUsed: false,
    sections,
    relationships,
    officialSources,
    deadlineTrigger: profile.plainLanguage.deadlineRule.trigger,
    deadlineTriggerAvailable: triggerAvailable,
    missingData: Object.freeze(missingData),
    missingProfileFields: missingRequiredFields,
    ambiguities: effectEvaluation.ambiguities,
    documentFactsPolicy: "DOCUMENT_IS_PRIMARY",
    legalContextPolicy: "OFFICIAL_CONTEXT_SEPARATE",
    privacyPolicy: "NO_FREE_TEXT_PII_OR_SENSITIVE_REFERENCE_VALUES",
    networkPolicy: "NO_NETWORK",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
  });
}

function unknownExplanation(): FiscalNotificationDocumentExplanationV2 {
  const assertionsBySection: Readonly<
    Record<FiscalNotificationExplanationSectionIdV2, string>
  > = Object.freeze({
    WHAT_DOCUMENT_SAYS:
      "El tipo exacto del documento todavía no se ha identificado.",
    WHY_RECEIVED:
      "No hay una familia confirmada para explicar por qué se emitió.",
    RESULT:
      "No se afirma ningún resultado, obligación o efecto mientras la familia sea desconocida.",
    KEY_DATA:
      "Faltan datos estructurados asociados a una familia confirmada.",
    NEXT_STEP:
      "Revisa la clasificación y confirma el documento antes de actuar.",
    DEADLINE:
      "No se calcula ningún plazo sin familia y disparador jurídico confirmados.",
    CONSEQUENCE:
      "No se afirma ninguna consecuencia para un documento desconocido.",
    NOT_PROVEN:
      "El documento desconocido no demuestra pago, presentación, suspensión ni cambio de estado.",
    RELATIONSHIPS:
      "No se propone ni confirma una relación documental sin familia exacta.",
    OFFICIAL_SOURCES:
      "No se asignan fuentes oficiales de otra familia a un documento desconocido.",
  });
  const sections = Object.freeze(
    FISCAL_NOTIFICATION_EXPLANATION_SECTION_IDS_V2.map((id) =>
      section(id, [
        assertion(
          `UNKNOWN_${id}`,
          "NOT_PROVEN_BY_DOCUMENT",
          assertionsBySection[id],
        ),
      ]),
    ),
  );
  return Object.freeze({
    schemaVersion: FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_SCHEMA_VERSION_V2,
    engineId: FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_ENGINE_ID_V2,
    engineVersion: FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_ENGINE_VERSION_V2,
    knowledgeReleaseId: AEAT_DOCUMENT_KNOWLEDGE_RELEASE_ID_V1,
    status: "INFORMATION_PENDING",
    familyId: null,
    familyName: null,
    specializationId: "UNKNOWN_EXPLICIT",
    fallbackUsed: true,
    sections,
    relationships: Object.freeze([]),
    officialSources: Object.freeze([]),
    deadlineTrigger: null,
    deadlineTriggerAvailable: false,
    missingData: Object.freeze([
      "STRUCTURED_FACTS",
      "REQUIRED_PROFILE_FIELDS",
      "PRINTED_EFFECT",
    ] as const),
    missingProfileFields: Object.freeze({
      references: Object.freeze([]),
      dates: Object.freeze([]),
      money: Object.freeze([]),
      facts: Object.freeze([]),
      participantRoles: Object.freeze([]),
    }),
    ambiguities: Object.freeze([]),
    documentFactsPolicy: "DOCUMENT_IS_PRIMARY",
    legalContextPolicy: "OFFICIAL_CONTEXT_SEPARATE",
    privacyPolicy: "NO_FREE_TEXT_PII_OR_SENSITIVE_REFERENCE_VALUES",
    networkPolicy: "NO_NETWORK",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
  });
}

export function resolveFiscalNotificationExplanationSectionV2(
  explanation: FiscalNotificationDocumentExplanationV2,
  sectionId: FiscalNotificationExplanationSectionIdV2,
): FiscalNotificationExplanationSectionV2 {
  const result = explanation.sections.find((candidate) => candidate.id === sectionId);
  return result ?? invalid(`sections.${sectionId}`);
}

const LEGACY_FAMILY_BY_DOCUMENT_TYPE: Readonly<
  Record<AdministrativeDocumentType, FiscalNotificationDocumentFamilyIdV2 | null>
> = Object.freeze({
  AEAT_ENFORCEMENT_ORDER: "collection.enforcement_order",
  AEAT_INSTALLMENT_OR_DEFERRAL_GRANT: "collection.deferral_grant",
  AEAT_INSTALLMENT_OR_DEFERRAL_DENIAL: "collection.deferral_denial",
  AEAT_OFFSET_AGREEMENT: "collection.offset_resolution",
  AEAT_PAYMENT_FORM: "payment.payment_form",
  AEAT_INFORMATION_REQUEST: "compliance.individual_information_requirement",
  AEAT_ASSESSMENT_PROPOSAL: "assessment.allegations_and_proposal",
  AEAT_ASSESSMENT: "assessment.final_provisional_assessment",
  AEAT_SANCTION_PROPOSAL: "sanction.initiation_and_hearing",
  AEAT_SANCTION_DECISION: "sanction.resolution",
  AEAT_SEIZURE_ORDER: null,
  TGSS_DEBT_NOTICE: null,
  TGSS_ENFORCEMENT_NOTICE: null,
  MUNICIPAL_FINE: null,
  MUNICIPAL_TAX_NOTICE: null,
  REGIONAL_AUTHORITY_NOTICE: null,
  GENERIC_ADMINISTRATIVE_NOTICE: null,
  UNKNOWN: null,
});

export function adaptFiscalNotificationDocumentExplanationInputV1ToV2(
  legacy: FiscalNotificationDocumentExplanationInputV1,
  options: Readonly<{
    familyId?: FiscalNotificationDocumentFamilyIdV2 | "UNKNOWN" | null;
  }> = Object.freeze({}),
): FiscalNotificationDocumentExplanationInputV2 {
  let familyId =
    options.familyId === undefined
      ? LEGACY_FAMILY_BY_DOCUMENT_TYPE[legacy.documentType]
      : options.familyId;
  if (legacy.documentType === "AEAT_OFFSET_AGREEMENT" && options.familyId === undefined) {
    familyId =
      legacy.documentSubtype === "REQUESTED"
        ? "collection.offset_requested"
        : legacy.documentSubtype === "EX_OFFICIO"
          ? "collection.offset_ex_officio"
          : "collection.offset_resolution";
  }
  return Object.freeze({
    familyId: familyId ?? "UNKNOWN",
    documentEvidence: Object.freeze([]),
    references: Object.freeze([]),
    dates: Object.freeze([]),
    money: Object.freeze([]),
    factCodes: Object.freeze([]),
    roleCodes: Object.freeze([]),
    relations: Object.freeze([]),
    printedEffects: Object.freeze([]),
    calculatedFromPrintedValues: Object.freeze([]),
  });
}

export function explainFiscalNotificationDocumentV2FromV1(
  legacy: FiscalNotificationDocumentExplanationInputV1,
  options?: Readonly<{
    familyId?: FiscalNotificationDocumentFamilyIdV2 | "UNKNOWN" | null;
  }>,
): FiscalNotificationDocumentExplanationV2 {
  return explainFiscalNotificationDocumentV2(
    adaptFiscalNotificationDocumentExplanationInputV1ToV2(legacy, options),
  );
}

export function adaptFiscalNotificationDocumentExplanationV2ToV1(
  explanation: FiscalNotificationDocumentExplanationV2,
): FiscalNotificationDocumentExplanationV1 {
  const what = resolveFiscalNotificationExplanationSectionV2(
    explanation,
    "WHAT_DOCUMENT_SAYS",
  );
  const why = resolveFiscalNotificationExplanationSectionV2(
    explanation,
    "WHY_RECEIVED",
  );
  const result = resolveFiscalNotificationExplanationSectionV2(
    explanation,
    "RESULT",
  );
  const next = resolveFiscalNotificationExplanationSectionV2(
    explanation,
    "NEXT_STEP",
  );
  const deadline = resolveFiscalNotificationExplanationSectionV2(
    explanation,
    "DEADLINE",
  );
  const keyData = resolveFiscalNotificationExplanationSectionV2(
    explanation,
    "KEY_DATA",
  );
  const officialSources = explanation.officialSources.flatMap((source) =>
    (source.authority === "AEAT" || source.authority === "BOE") &&
    source.canonicalUrl
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
    engineId: FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_ENGINE_ID_V1,
    engineVersion: FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_ENGINE_VERSION_V1,
    knowledgeSnapshotId: FISCAL_NOTIFICATION_DOCUMENT_KNOWLEDGE_SNAPSHOT_V1,
    ruleId: `v2-adapter.${explanation.specializationId.toLowerCase()}`,
    ruleVersion: FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_ENGINE_VERSION_V2,
    status: explanation.status === "EXPLAINED" ? "EXPLAINED" : "PARTIAL",
    whatItIs: what.assertions.map((item) => item.text).join(" "),
    whyReceived: why.assertions.map((item) => item.text).join(" "),
    result: result.assertions.map((item) => item.text).join(" "),
    nextStep: Object.freeze({
      status: "REVIEW_DOCUMENT_ACTION",
      title: "Revisa la acción indicada",
      detail: next.assertions.map((item) => item.text).join(" "),
    }),
    deadline: Object.freeze({
      status:
        explanation.deadlineTrigger === null
          ? "NOT_IDENTIFIED"
          : explanation.deadlineTriggerAvailable
            ? "DOCUMENT_STATED"
            : "MISSING_RECEIPT_DATE",
      title: "Revisa el disparador del plazo",
      detail: deadline.assertions.map((item) => item.text).join(" "),
    }),
    keyFacts: Object.freeze(
      keyData.assertions.flatMap((item) =>
        item.level === "EXPLICIT_IN_DOCUMENT" ||
        item.level === "CALCULATED_FROM_PRINTED_VALUES"
          ? [
              Object.freeze({
                label: v1KeyFactLabel(item),
                value: item.text,
                basis:
                  item.level === "EXPLICIT_IN_DOCUMENT"
                    ? ("PRINTED" as const)
                    : ("CALCULATED_FROM_PRINTED_VALUES" as const),
              }),
            ]
          : [],
      ),
    ),
    officialSources: Object.freeze(officialSources),
    documentFactsPolicy: "DOCUMENT_IS_PRIMARY",
    legalContextPolicy: "OFFICIAL_CONTEXT_DOES_NOT_OVERRIDE_DOCUMENT",
    networkPolicy: "NO_NETWORK",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
  });
}
