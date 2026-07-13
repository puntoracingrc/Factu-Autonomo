import {
  FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V1,
  type FiscalNotificationDocumentFamilyCategoryV1,
  type FiscalNotificationDocumentFamilyIdV1,
  type FiscalNotificationDocumentFamilyV1,
  type FiscalNotificationFamilyRecognitionV1,
} from "./document-families.v1";
import type { FiscalNotificationOfficialSourceIdV2 } from "./official-sources.v2";

export const FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_SCHEMA_VERSION_V2 =
  2 as const;
export const FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_RELEASE_ID_V2 =
  "fiscal-notification-document-families.2026-07-13.v2" as const;

const TAX_PROCEDURE_SOURCES = [
  "boe.tax.general.law",
  "boe.tax.management_inspection.regulation",
] as const satisfies readonly FiscalNotificationOfficialSourceIdV2[];
const COLLECTION_SOURCES = [
  "boe.tax.general.law",
  "boe.tax.collection.regulation",
] as const satisfies readonly FiscalNotificationOfficialSourceIdV2[];
const REVIEW_SOURCES = [
  "boe.tax.general.law",
  "boe.tax.review.regulation",
] as const satisfies readonly FiscalNotificationOfficialSourceIdV2[];
const SEIZURE_SOURCES = [
  "aeat.collection.seizure_types",
  "boe.tax.general.law",
  "boe.tax.collection.regulation",
] as const satisfies readonly FiscalNotificationOfficialSourceIdV2[];
const INSPECTION_SOURCES = [
  "aeat.inspection.general",
  "boe.tax.general.law",
  "boe.tax.management_inspection.regulation",
] as const satisfies readonly FiscalNotificationOfficialSourceIdV2[];
const LIABILITY_SOURCES = [
  "aeat.liability.solidary",
  "aeat.liability.subsidiary",
  "aeat.liability.successors",
  "boe.tax.general.law",
  "boe.tax.collection.regulation",
] as const satisfies readonly FiscalNotificationOfficialSourceIdV2[];

const NEW_FAMILY_SEEDS_V2 = [
  [
    "payment.receipt",
    "Justificante o recibo de pago",
    "PAYMENT_EVIDENCE",
    "P0",
    [
      "aeat.payment.nrc_receipt",
      "aeat.collection.payment_and_receipts",
      ...COLLECTION_SOURCES,
    ],
  ],
  [
    "payment.failed_or_reversed",
    "Pago fallido, rechazado, anulado o devuelto",
    "PAYMENT_EVIDENCE",
    "P0",
    ["aeat.collection.payment_and_receipts", ...COLLECTION_SOURCES],
  ],
  [
    "collection.deferral_request_receipt",
    "Solicitud o justificante de aplazamiento o fraccionamiento",
    "COLLECTION",
    "P0",
    [
      "aeat.collection.deferral",
      "aeat.collection.deferral_management",
      ...COLLECTION_SOURCES,
    ],
  ],
  [
    "collection.deferral_substantiation_requirement",
    "Requerimiento de subsanación o garantía de aplazamiento",
    "COLLECTION",
    "P0",
    ["aeat.collection.deferral", ...COLLECTION_SOURCES],
  ],
  [
    "collection.deferral_inadmissibility_or_archival",
    "Inadmisión, desistimiento o archivo de aplazamiento",
    "COLLECTION",
    "P0",
    [
      "aeat.collection.deferral",
      "aeat.collection.deferral_management",
      ...COLLECTION_SOURCES,
    ],
  ],
  [
    "collection.deferral_breach",
    "Incumplimiento de aplazamiento o fraccionamiento",
    "COLLECTION",
    "P0",
    [
      "aeat.collection.deferral",
      "aeat.collection.deferral_management",
      ...COLLECTION_SOURCES,
    ],
  ],
  [
    "collection.offset_resolution",
    "Resolución total, parcial o denegatoria de compensación",
    "SETTLEMENT",
    "P0",
    [
      "aeat.collection.offset.requested",
      "aeat.collection.offset.exofficio",
      ...COLLECTION_SOURCES,
    ],
  ],
  [
    "collection.extinction_or_balance_notice",
    "Comunicación de extinción, aplicación o saldo pendiente",
    "SETTLEMENT",
    "P0",
    ["aeat.collection.payment_and_receipts", ...COLLECTION_SOURCES],
  ],
  [
    "assessment.procedure_start",
    "Inicio de verificación, comprobación o regularización",
    "ASSESSMENT",
    "P0",
    ["aeat.assessment.irpf", "aeat.assessment.vat", ...TAX_PROCEDURE_SOURCES],
  ],
  [
    "assessment.no_adjustment_resolution",
    "Terminación sin regularización o sin liquidación",
    "ASSESSMENT",
    "P0",
    ["aeat.assessment.irpf", "aeat.assessment.vat", ...TAX_PROCEDURE_SOURCES],
  ],
  [
    "compliance.individual_information_requirement",
    "Requerimiento individual de información con trascendencia tributaria",
    "COMPLIANCE",
    "P0",
    ["aeat.compliance.individual_information", ...TAX_PROCEDURE_SOURCES],
  ],
  [
    "collection.late_filing_surcharge",
    "Liquidación de recargo por presentación fuera de plazo",
    "COLLECTION",
    "P0",
    ["aeat.collection.late_filing_surcharge", ...COLLECTION_SOURCES],
  ],
  [
    "review.suspension_request",
    "Solicitud o justificante de suspensión",
    "REVIEW",
    "P0",
    ["aeat.collection.suspension", ...REVIEW_SOURCES],
  ],
  [
    "review.suspension_decision",
    "Acuerdo sobre la suspensión solicitada",
    "REVIEW",
    "P0",
    ["aeat.collection.suspension", ...REVIEW_SOURCES],
  ],
  [
    "review.resolution",
    "Resolución de recurso o reclamación",
    "REVIEW",
    "P0",
    [
      "aeat.review.reconsideration",
      "aeat.review.economic_administrative",
      ...REVIEW_SOURCES,
    ],
  ],
  [
    "seizure.wages_or_pensions",
    "Embargo de sueldos, salarios o pensiones",
    "SEIZURE",
    "P0",
    ["aeat.seizure.wages", ...SEIZURE_SOURCES],
  ],
  [
    "seizure.securities_or_financial_assets",
    "Embargo de valores u otros activos financieros",
    "SEIZURE",
    "P0",
    ["aeat.seizure.securities", ...SEIZURE_SOURCES],
  ],
  [
    "seizure.cash_or_refund",
    "Embargo de efectivo, devolución o crédito frente a la Administración",
    "SEIZURE",
    "P0",
    SEIZURE_SOURCES,
  ],
  [
    "seizure.tpv_receipts",
    "Embargo de cobros mediante terminal de punto de venta",
    "SEIZURE",
    "P0",
    ["aeat.seizure.credits", ...SEIZURE_SOURCES],
  ],
  [
    "seizure.business_income_or_rents",
    "Embargo de ingresos de actividad o rentas",
    "SEIZURE",
    "P0",
    ["aeat.seizure.credits", ...SEIZURE_SOURCES],
  ],
  [
    "seizure.third_party_response",
    "Contestación de tercero a una diligencia de embargo",
    "SEIZURE",
    "P0",
    ["aeat.seizure.credits", ...SEIZURE_SOURCES],
  ],
  [
    "seizure.third_party_payment",
    "Ingreso efectuado por receptor o tercero retenedor",
    "SEIZURE",
    "P0",
    [
      "aeat.collection.seizure_types",
      "aeat.seizure.credits",
      "aeat.collection.payment_and_receipts",
      ...COLLECTION_SOURCES,
    ],
  ],
  [
    "refund.request_or_recognition",
    "Solicitud, propuesta o reconocimiento de devolución",
    "REFUND",
    "P0",
    [
      "aeat.refund.undue",
      "aeat.refund.corporate_tax",
      "boe.tax.general.law",
    ],
  ],
  [
    "refund.withholding_or_offset",
    "Retención, compensación o aplicación de una devolución",
    "REFUND",
    "P0",
    ["aeat.collection.offset.exofficio", ...COLLECTION_SOURCES],
  ],
  [
    "inspection.communication",
    "Comunicación de inicio, alcance o ampliación inspectora",
    "INSPECTION",
    "P0",
    INSPECTION_SOURCES,
  ],
  [
    "inspection.diligence",
    "Diligencia de actuaciones inspectoras",
    "INSPECTION",
    "P0",
    INSPECTION_SOURCES,
  ],
  [
    "inspection.act_agreement",
    "Acta con acuerdo",
    "INSPECTION",
    "P0",
    INSPECTION_SOURCES,
  ],
  [
    "inspection.act_conformity",
    "Acta de conformidad",
    "INSPECTION",
    "P0",
    INSPECTION_SOURCES,
  ],
  [
    "inspection.act_disagreement",
    "Acta de disconformidad",
    "INSPECTION",
    "P0",
    INSPECTION_SOURCES,
  ],
  [
    "inspection.assessment",
    "Acuerdo o liquidación derivada de inspección",
    "INSPECTION",
    "P0",
    INSPECTION_SOURCES,
  ],
  [
    "liability.proposal",
    "Propuesta y audiencia de declaración de responsabilidad",
    "LIABILITY",
    "P0",
    LIABILITY_SOURCES,
  ],
  [
    "liability.final_resolution",
    "Acuerdo final de declaración de responsabilidad",
    "LIABILITY",
    "P0",
    LIABILITY_SOURCES,
  ],
  [
    "collection.external_debt",
    "Deuda de otro organismo recaudada por la AEAT",
    "COLLECTION",
    "P0",
    ["aeat.collection.external_debt", ...COLLECTION_SOURCES],
  ],
  [
    "irpf.spouse_refund_suspension",
    "Suspensión de deuda IRPF mediante devolución del cónyuge",
    "REFUND",
    "P0",
    [
      "aeat.irpf.spouse_refund_suspension",
      "boe.irpf.law",
      "boe.irpf.regulation",
    ],
  ],
  [
    "registry.census_requirement",
    "Requerimiento de comprobación o rectificación censal",
    "TAX_PROFILE",
    "P1",
    ["aeat.census.rectification", ...TAX_PROCEDURE_SOURCES],
  ],
  [
    "registry.census_proposal",
    "Propuesta de rectificación censal y alegaciones",
    "TAX_PROFILE",
    "P1",
    ["aeat.census.rectification", ...TAX_PROCEDURE_SOURCES],
  ],
  [
    "registry.tax_domicile_resolution",
    "Acuerdo o resolución sobre domicilio fiscal",
    "TAX_PROFILE",
    "P1",
    ["aeat.census.tax_domicile", ...TAX_PROCEDURE_SOURCES],
  ],
  [
    "registry.nif_revocation",
    "Acuerdo de revocación del NIF",
    "TAX_PROFILE",
    "P1",
    ["aeat.census.nif_revocation", ...TAX_PROCEDURE_SOURCES],
  ],
  [
    "registry.nif_rehabilitation",
    "Acuerdo de rehabilitación del NIF",
    "TAX_PROFILE",
    "P1",
    ["aeat.census.nif_rehabilitation", ...TAX_PROCEDURE_SOURCES],
  ],
  [
    "assessment.value_check",
    "Comprobación administrativa de valores",
    "ASSESSMENT",
    "P1",
    ["aeat.assessment.value_check", ...TAX_PROCEDURE_SOURCES],
  ],
  [
    "review.material_error",
    "Rectificación de error material, de hecho o aritmético",
    "REVIEW",
    "P1",
    ["aeat.review.material_error.collection", ...REVIEW_SOURCES],
  ],
  [
    "review.revocation",
    "Procedimiento especial de revocación",
    "REVIEW",
    "P1",
    ["aeat.review.special_procedures", ...REVIEW_SOURCES],
  ],
  [
    "review.nullity",
    "Revisión de acto nulo de pleno derecho",
    "REVIEW",
    "P1",
    ["aeat.review.special_procedures", ...REVIEW_SOURCES],
  ],
  [
    "review.lesivity",
    "Declaración de lesividad de acto anulable",
    "REVIEW",
    "P1",
    ["aeat.review.special_procedures", ...REVIEW_SOURCES],
  ],
  [
    "review.third_party_claim",
    "Tercería de dominio o de mejor derecho",
    "REVIEW",
    "P1",
    ["aeat.collection.third_party_claim", ...COLLECTION_SOURCES],
  ],
  [
    "review.guarantee_cost_reimbursement",
    "Reembolso del coste de garantías",
    "REFUND",
    "P1",
    ["aeat.review.guarantee_cost", ...REVIEW_SOURCES],
  ],
] as const;

export type FiscalNotificationDocumentFamilyIdV2 =
  | FiscalNotificationDocumentFamilyIdV1
  | (typeof NEW_FAMILY_SEEDS_V2)[number][0];

export type FiscalNotificationDocumentFamilyCategoryV2 =
  | FiscalNotificationDocumentFamilyCategoryV1
  | "PAYMENT_EVIDENCE";
export type FiscalNotificationKnowledgePriorityV2 =
  | "V1_BASELINE"
  | "P0"
  | "P1";

export interface FiscalNotificationDocumentFamilyV2 {
  readonly schemaVersion: 2;
  readonly releaseId: typeof FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_RELEASE_ID_V2;
  readonly id: FiscalNotificationDocumentFamilyIdV2;
  readonly nameEs: string;
  readonly category: FiscalNotificationDocumentFamilyCategoryV2;
  readonly knowledgePriority: FiscalNotificationKnowledgePriorityV2;
  readonly evidenceOrigin: FiscalNotificationDocumentFamilyV1["evidenceOrigin"];
  readonly recognitionStatus:
    | FiscalNotificationDocumentFamilyV1["recognitionStatus"]
    | "OFFICIAL_ONLY_PENDING_FIXTURE";
  readonly fixtureStatus: FiscalNotificationDocumentFamilyV1["fixtureStatus"];
  readonly templateVariantStatus: "NOT_REGISTERED";
  readonly sourceIds: readonly FiscalNotificationOfficialSourceIdV2[];
  readonly recognition: FiscalNotificationFamilyRecognitionV1 | null;
  readonly knowledgeUsage: "CONTEXT_ONLY";
  readonly printedDocumentPolicy: "EXTRACT_EXACTLY_THEN_REQUIRE_REVIEW";
  readonly officialContextPolicy: "INTERPRET_ONLY_NEVER_OVERRIDE_DOCUMENT";
  readonly legalReviewStatus: "LEGAL_REVIEW_PENDING";
  readonly operationalPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW";
  readonly requiresHumanReview: true;
  readonly permitsDebtCreation: false;
  readonly permitsDeadlineCreation: false;
  readonly permitsPaymentAction: false;
  readonly permitsAccountingAction: false;
  readonly permitsAutomaticRelationConfirmation: false;
}

const EXISTING_SOURCE_OVERRIDES_V2: Partial<
  Record<
    FiscalNotificationDocumentFamilyIdV1,
    readonly FiscalNotificationOfficialSourceIdV2[]
  >
> = {
  "notification.delivery_attempt": [
    "boe.tax.general.law",
    "boe.common.administrative_procedure.law",
  ],
  "notification.publication_or_appearance": [
    "boe.tax.general.law",
    "boe.common.administrative_procedure.law",
  ],
  "notification.dehu_envelope": [
    "boe.tax.general.law",
    "boe.common.administrative_procedure.law",
  ],
  "registry.tax_registration_resolution": [
    "aeat.census.rectification",
    ...TAX_PROCEDURE_SOURCES,
  ],
  "compliance.informal_missing_return_notice": [
    "aeat.compliance.omitted_return",
    ...TAX_PROCEDURE_SOURCES,
  ],
  "compliance.formal_filing_requirement": [
    "aeat.compliance.omitted_return",
    ...TAX_PROCEDURE_SOURCES,
  ],
  "compliance.document_request": TAX_PROCEDURE_SOURCES,
  "assessment.allegations_and_proposal": TAX_PROCEDURE_SOURCES,
  "assessment.final_provisional_assessment": TAX_PROCEDURE_SOURCES,
  "sanction.initiation_and_hearing": [
    "boe.tax.general.law",
    "boe.tax.sanction.regulation",
  ],
  "sanction.resolution": [
    "boe.tax.general.law",
    "boe.tax.sanction.regulation",
  ],
  "sanction.loss_of_reduction": [
    "aeat.sanction.general",
    "boe.tax.general.law",
    "boe.tax.sanction.regulation",
  ],
  "collection.deferral_grant": COLLECTION_SOURCES,
  "collection.deferral_modification": COLLECTION_SOURCES,
  "collection.deferral_denial": COLLECTION_SOURCES,
  "collection.interest_assessment": [
    "aeat.assessment.interest",
    ...COLLECTION_SOURCES,
  ],
  "collection.enforcement_order": COLLECTION_SOURCES,
  "collection.offset_requested": COLLECTION_SOURCES,
  "collection.offset_ex_officio": COLLECTION_SOURCES,
  "refund.payment_communication": [
    "aeat.refund.corporate_tax",
    "boe.tax.general.law",
  ],
  "seizure.bank_account": ["aeat.seizure.bank_accounts", ...SEIZURE_SOURCES],
  "seizure.movable_asset": SEIZURE_SOURCES,
  "seizure.real_estate": SEIZURE_SOURCES,
  "seizure.commercial_credits": ["aeat.seizure.credits", ...SEIZURE_SOURCES],
  "seizure.compliance_reiteration": [
    "aeat.seizure.credits",
    ...SEIZURE_SOURCES,
  ],
  "seizure.release": SEIZURE_SOURCES,
  "payment.payment_form": [
    "aeat.collection.payment_and_receipts",
    ...COLLECTION_SOURCES,
  ],
  "review.recurso_reposicion": REVIEW_SOURCES,
  "review.economic_administrative_claim": REVIEW_SOURCES,
  "liability.solidary": LIABILITY_SOURCES,
  "liability.subsidiary": LIABILITY_SOURCES,
  "liability.successors": LIABILITY_SOURCES,
  "inspection.procedure": INSPECTION_SOURCES,
  "refund.undue_payment": ["aeat.refund.undue", ...REVIEW_SOURCES],
  "collection.precautionary_measure": COLLECTION_SOURCES,
  "collection.asset_sale": COLLECTION_SOURCES,
};

function freezeFamily(
  family: Omit<
    FiscalNotificationDocumentFamilyV2,
    "schemaVersion" | "releaseId"
  >,
): FiscalNotificationDocumentFamilyV2 {
  return Object.freeze({
    schemaVersion: FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_SCHEMA_VERSION_V2,
    releaseId: FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_RELEASE_ID_V2,
    ...family,
    sourceIds: Object.freeze([...family.sourceIds]),
  });
}

const existingFamilies = FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V1.map(
  (entry) =>
    freezeFamily({
      id: entry.id,
      nameEs: entry.nameEs,
      category: entry.category,
      knowledgePriority: "V1_BASELINE",
      evidenceOrigin: entry.evidenceOrigin,
      recognitionStatus: entry.recognitionStatus,
      fixtureStatus: entry.fixtureStatus,
      templateVariantStatus: "NOT_REGISTERED",
      sourceIds: Array.from(
        new Set<FiscalNotificationOfficialSourceIdV2>([
          ...(entry.sourceIds as readonly FiscalNotificationOfficialSourceIdV2[]),
          ...(EXISTING_SOURCE_OVERRIDES_V2[entry.id] ?? []),
        ]),
      ),
      recognition: entry.recognition,
      knowledgeUsage: "CONTEXT_ONLY",
      printedDocumentPolicy: "EXTRACT_EXACTLY_THEN_REQUIRE_REVIEW",
      officialContextPolicy: "INTERPRET_ONLY_NEVER_OVERRIDE_DOCUMENT",
      legalReviewStatus: "LEGAL_REVIEW_PENDING",
      operationalPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
      requiresHumanReview: true,
      permitsDebtCreation: false,
      permitsDeadlineCreation: false,
      permitsPaymentAction: false,
      permitsAccountingAction: false,
      permitsAutomaticRelationConfirmation: false,
    }),
);

const newFamilies = NEW_FAMILY_SEEDS_V2.map(
  ([id, nameEs, category, knowledgePriority, sourceIds]) =>
    freezeFamily({
      id,
      nameEs,
      category,
      knowledgePriority,
      evidenceOrigin: "OFFICIAL_SOURCE_ONLY_VERIFIED_URL",
      recognitionStatus: "OFFICIAL_ONLY_PENDING_FIXTURE",
      fixtureStatus: "PENDING_SYNTHETIC_FIXTURE",
      templateVariantStatus: "NOT_REGISTERED",
      sourceIds,
      recognition: null,
      knowledgeUsage: "CONTEXT_ONLY",
      printedDocumentPolicy: "EXTRACT_EXACTLY_THEN_REQUIRE_REVIEW",
      officialContextPolicy: "INTERPRET_ONLY_NEVER_OVERRIDE_DOCUMENT",
      legalReviewStatus: "LEGAL_REVIEW_PENDING",
      operationalPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
      requiresHumanReview: true,
      permitsDebtCreation: false,
      permitsDeadlineCreation: false,
      permitsPaymentAction: false,
      permitsAccountingAction: false,
      permitsAutomaticRelationConfirmation: false,
    }),
);

export const FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V2 = Object.freeze([
  ...existingFamilies,
  ...newFamilies,
]) satisfies readonly FiscalNotificationDocumentFamilyV2[];

export const FISCAL_NOTIFICATION_DOCUMENT_FAMILY_IDS_V2 = Object.freeze(
  FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V2.map((family) => family.id),
);

export const FISCAL_NOTIFICATION_CAUSAL_RELATION_IDS_V2 = Object.freeze([
  "PAYMENT_INSTRUMENT_MAY_PRECEDE_RECEIPT",
  "RECEIPT_MAY_EVIDENCE_OBLIGATION_SATISFACTION",
  "FAILED_PAYMENT_MAY_LEAVE_OBLIGATION_OPEN",
  "DEFERRAL_REQUEST_MAY_PRECEDE_DECISION",
  "DEFERRAL_BREACH_MAY_PRECEDE_ENFORCEMENT",
  "ASSESSMENT_MAY_PRECEDE_COLLECTION",
  "ENFORCEMENT_MAY_PRECEDE_SEIZURE",
  "SEIZURE_MAY_PRECEDE_RELEASE",
  "SUSPENSION_REQUEST_MAY_PRECEDE_DECISION",
  "REVIEW_MAY_PRECEDE_REVIEW_RESOLUTION",
  "INSPECTION_COMMUNICATION_MAY_PRECEDE_DILIGENCE_OR_ACT",
  "SPOUSE_REFUND_MAY_BE_APPLIED_TO_SPOUSE_DEBT",
] as const);
export type FiscalNotificationCausalRelationIdV2 =
  (typeof FISCAL_NOTIFICATION_CAUSAL_RELATION_IDS_V2)[number];

export interface FiscalNotificationCausalRelationV2 {
  readonly id: FiscalNotificationCausalRelationIdV2;
  readonly fromFamilyIds: readonly FiscalNotificationDocumentFamilyIdV2[];
  readonly toFamilyIds: readonly FiscalNotificationDocumentFamilyIdV2[];
  readonly status: "SUGGESTED_ONLY";
  readonly matchPolicy: "EXPLICIT_REFERENCE_OR_HUMAN_CONFIRMATION_REQUIRED";
  readonly autoConfirm: false;
}

function causalRelation(
  id: FiscalNotificationCausalRelationIdV2,
  fromFamilyIds: readonly FiscalNotificationDocumentFamilyIdV2[],
  toFamilyIds: readonly FiscalNotificationDocumentFamilyIdV2[],
): FiscalNotificationCausalRelationV2 {
  return Object.freeze({
    id,
    fromFamilyIds: Object.freeze([...fromFamilyIds]),
    toFamilyIds: Object.freeze([...toFamilyIds]),
    status: "SUGGESTED_ONLY",
    matchPolicy: "EXPLICIT_REFERENCE_OR_HUMAN_CONFIRMATION_REQUIRED",
    autoConfirm: false,
  });
}

export const FISCAL_NOTIFICATION_CAUSAL_RELATIONS_V2 = Object.freeze([
  causalRelation(
    "PAYMENT_INSTRUMENT_MAY_PRECEDE_RECEIPT",
    ["payment.payment_form"],
    ["payment.receipt", "payment.failed_or_reversed"],
  ),
  causalRelation(
    "RECEIPT_MAY_EVIDENCE_OBLIGATION_SATISFACTION",
    ["payment.receipt", "seizure.third_party_payment"],
    ["collection.extinction_or_balance_notice"],
  ),
  causalRelation(
    "FAILED_PAYMENT_MAY_LEAVE_OBLIGATION_OPEN",
    ["payment.failed_or_reversed"],
    ["collection.extinction_or_balance_notice", "collection.enforcement_order"],
  ),
  causalRelation(
    "DEFERRAL_REQUEST_MAY_PRECEDE_DECISION",
    ["collection.deferral_request_receipt"],
    [
      "collection.deferral_grant",
      "collection.deferral_denial",
      "collection.deferral_inadmissibility_or_archival",
    ],
  ),
  causalRelation(
    "DEFERRAL_BREACH_MAY_PRECEDE_ENFORCEMENT",
    ["collection.deferral_breach"],
    ["collection.enforcement_order"],
  ),
  causalRelation(
    "ASSESSMENT_MAY_PRECEDE_COLLECTION",
    ["assessment.final_provisional_assessment", "inspection.assessment"],
    ["collection.enforcement_order"],
  ),
  causalRelation(
    "ENFORCEMENT_MAY_PRECEDE_SEIZURE",
    ["collection.enforcement_order"],
    [
      "seizure.bank_account",
      "seizure.movable_asset",
      "seizure.real_estate",
      "seizure.commercial_credits",
      "seizure.wages_or_pensions",
      "seizure.securities_or_financial_assets",
      "seizure.cash_or_refund",
      "seizure.tpv_receipts",
      "seizure.business_income_or_rents",
    ],
  ),
  causalRelation(
    "SEIZURE_MAY_PRECEDE_RELEASE",
    [
      "seizure.bank_account",
      "seizure.movable_asset",
      "seizure.real_estate",
      "seizure.commercial_credits",
    ],
    ["seizure.release"],
  ),
  causalRelation(
    "SUSPENSION_REQUEST_MAY_PRECEDE_DECISION",
    ["review.suspension_request"],
    ["review.suspension_decision"],
  ),
  causalRelation(
    "REVIEW_MAY_PRECEDE_REVIEW_RESOLUTION",
    ["review.recurso_reposicion", "review.economic_administrative_claim"],
    ["review.resolution"],
  ),
  causalRelation(
    "INSPECTION_COMMUNICATION_MAY_PRECEDE_DILIGENCE_OR_ACT",
    ["inspection.communication"],
    [
      "inspection.diligence",
      "inspection.act_agreement",
      "inspection.act_conformity",
      "inspection.act_disagreement",
    ],
  ),
  causalRelation(
    "SPOUSE_REFUND_MAY_BE_APPLIED_TO_SPOUSE_DEBT",
    ["irpf.spouse_refund_suspension"],
    ["refund.withholding_or_offset", "collection.extinction_or_balance_notice"],
  ),
]) satisfies readonly FiscalNotificationCausalRelationV2[];

export const FISCAL_NOTIFICATION_PROHIBITED_INFERENCE_IDS_V2 = Object.freeze([
  "PAYMENT_FORM_IS_PAYMENT_RECEIPT",
  "SAME_AMOUNT_CONFIRMS_PAYMENT",
  "SAME_TAXPAYER_CONFIRMS_RELATION",
  "SAME_LIQUIDATION_KEY_MEANS_SAME_DOCUMENT",
  "SEIZURE_PROVES_DEBT_VALID",
  "REVIEW_PROVES_SUSPENSION",
  "FAILED_PAYMENT_PROVES_REOPENED_DEBT",
  "LATER_DOCUMENT_AUTHORIZES_SILENT_MUTATION",
  "OFFICIAL_CONTEXT_OVERRIDES_PRINTED_DOCUMENT",
  "PRIVATE_CORPUS_ACTIVATES_RULE",
] as const);
export type FiscalNotificationProhibitedInferenceIdV2 =
  (typeof FISCAL_NOTIFICATION_PROHIBITED_INFERENCE_IDS_V2)[number];

const familyById = new Map(
  FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V2.map((family) => [
    family.id,
    family,
  ] as const),
);
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;

export function resolveFiscalNotificationDocumentFamilyV2(
  id: unknown,
): FiscalNotificationDocumentFamilyV2 | null {
  return typeof id === "string" &&
    id.length > 0 &&
    id.length <= 160 &&
    !CONTROL_CHARACTER_PATTERN.test(id)
    ? (familyById.get(id as FiscalNotificationDocumentFamilyIdV2) ?? null)
    : null;
}
