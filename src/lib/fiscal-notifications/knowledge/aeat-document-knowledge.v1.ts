import rawKnowledgePackage from "./aeat-document-knowledge.v1.json";
import {
  FISCAL_NOTIFICATION_DOCUMENT_FAMILY_IDS_V3,
  type FiscalNotificationDocumentFamilyIdV3,
} from "./document-families.v3";

export const AEAT_DOCUMENT_KNOWLEDGE_SCHEMA_VERSION_V1 = "1.0.0" as const;
export const AEAT_DOCUMENT_KNOWLEDGE_RELEASE_ID_V1 =
  "aeat-document-knowledge.2026-07-16.v1" as const;
export const AEAT_NOTIFICATIONS_CANONICAL_URL_V1 =
  "https://sede.agenciatributaria.gob.es/Sede/procedimientos/ZN01.shtml" as const;

export const AEAT_DOCUMENT_OFFICIAL_SOURCE_IDS_V1 = [
  "DOC_PRIMARY",
  "LGT",
  "RGR",
  "RGAT",
  "RGREV",
  "SANCTION_REG",
  "LPAC",
  "IRPF_LAW",
  "IRPF_REG",
  "AEAT_NOTIFICATIONS",
  "AEAT_RENTA",
  "CLAVE_REGISTRATION",
  "AEAT_CERTIFICATE_COMPLIANCE",
  "AEAT_CENSUS_RECTIFICATION",
  "AEAT_TAX_DOMICILE",
  "AEAT_NIF_REVOCATION",
  "AEAT_NIF_REHABILITATION",
  "AEAT_OMITTED_RETURNS",
  "AEAT_INFORMATION_REQUEST",
  "AEAT_IRPF_CHECK",
  "AEAT_VAT_CHECK",
  "AEAT_VALUE_CHECK",
  "AEAT_SANCTION",
  "AEAT_DEFERRAL",
  "AEAT_OFFSET_REQUESTED",
  "AEAT_OFFSET_EX_OFFICIO",
  "AEAT_INTEREST_ASSESSMENT",
  "AEAT_ENFORCEMENT",
  "AEAT_PRECAUTIONARY",
  "AEAT_AUCTION",
  "AEAT_PAYMENT",
  "AEAT_NRC",
  "AEAT_REFUND_UNDUE",
  "AEAT_REFUND_TAX",
  "AEAT_GUARANTEE_COST",
  "AEAT_SPOUSE_SUSPENSION",
  "AEAT_RECONSIDERATION",
  "AEAT_ECON_ADMIN",
  "AEAT_SUSPENSION",
  "AEAT_MATERIAL_ERROR",
  "AEAT_SPECIAL_REVIEW",
  "AEAT_THIRD_PARTY_CLAIM",
  "AEAT_LIABILITY_SOLIDARY",
  "AEAT_LIABILITY_SUBSIDIARY",
  "AEAT_SUCCESSORS",
  "AEAT_INSPECTION",
  "AEAT_SEIZURE_TYPES",
  "AEAT_SEIZURE_RESOURCES",
  "AEAT_EXTERNAL_DEBT",
  "AEAT_LATE_SURCHARGE",
] as const;

export type AeatDocumentOfficialSourceIdV1 =
  (typeof AEAT_DOCUMENT_OFFICIAL_SOURCE_IDS_V1)[number];

export const AEAT_DOCUMENT_RELATION_TYPE_IDS_V1 = [
  "ANNEX_OF",
  "NOTIFICATION_EVIDENCE_FOR",
  "PUBLICATION_NOTIFIES",
  "CONTINUES",
  "RESPONSE_TO",
  "RESOLVES",
  "REPLACES",
  "CORRECTS",
  "CANCELS",
  "REFERS_TO_DEBT",
  "PAYMENT_FORM_FOR",
  "PAYMENT_EVIDENCE_FOR",
  "PAYMENT_FAILED_FOR",
  "REQUESTS_DEFERRAL_FOR",
  "CREATES_PAYMENT_PLAN_FOR",
  "MODIFIES_PAYMENT_PLAN",
  "DENIES_DEFERRAL_FOR",
  "CLAIMS_UNPAID_INSTALLMENT",
  "LIQUIDATES_INTEREST_FOR",
  "INITIATES_ENFORCEMENT",
  "COMPENSATES",
  "LEAVES_PENDING_BALANCE",
  "RECOGNIZES_REFUND",
  "WITHHOLDS_REFUND",
  "PAYS_REFUND",
  "ENFORCES",
  "ORDERS_SEIZURE",
  "RESPONDS_TO_SEIZURE",
  "TRANSFERS_SEIZED_FUNDS",
  "RELEASES_SEIZURE",
  "APPEALS",
  "REQUESTS_SUSPENSION",
  "DECIDES_SUSPENSION",
  "DECIDES_REVIEW",
  "PROPOSES_LIABILITY",
  "DECLARES_LIABILITY",
  "CONTINUES_AGAINST_SUCCESSOR",
  "INITIATES_INSPECTION",
  "RECORDS_INSPECTION",
  "PROPOSES_INSPECTION_RESULT",
  "ASSESSES_FROM_INSPECTION",
  "RECTIFIES_CENSUS",
  "DECIDES_TAX_DOMICILE",
  "REVOKES_NIF",
  "REHABILITATES_NIF",
  "INFORMATIONAL_CONTEXT_FOR",
  "CERTIFIES_STATUS",
  "REIMBURSES_GUARANTEE_COST_FOR",
] as const;

export type AeatDocumentRelationTypeIdV1 =
  (typeof AEAT_DOCUMENT_RELATION_TYPE_IDS_V1)[number];

export const AEAT_DOCUMENT_CHAIN_WILDCARDS_V1 = [
  "ANY_ADMINISTRATIVE_ACT",
  "ANY_APPEALABLE_ACT",
  "ANY_ASSET_SEIZURE",
  "ANY_FAVORABLE_ACT",
  "ANY_SEIZURE",
  "ANY_THIRD_PARTY_SEIZURE",
] as const;

export type AeatDocumentChainWildcardV1 =
  (typeof AEAT_DOCUMENT_CHAIN_WILDCARDS_V1)[number];
export type AeatDocumentChainNodeV1 =
  FiscalNotificationDocumentFamilyIdV3 | AeatDocumentChainWildcardV1;

export const AEAT_DOCUMENT_CHAIN_IDS_V1 = [
  "notification_to_act",
  "missing_return_to_sanction",
  "assessment_chain",
  "assessment_to_collection",
  "deferral_chain",
  "offset_refund_chain",
  "enforcement_seizure_chain",
  "review_suspension_chain",
  "liability_chain",
  "inspection_chain",
  "census_chain",
  "nif_chain",
  "special_review_chain",
  "third_party_claim_chain",
  "guarantee_reimbursement_chain",
] as const;

export type AeatDocumentChainIdV1 = (typeof AEAT_DOCUMENT_CHAIN_IDS_V1)[number];

const CATEGORY_VALUES = [
  "ASSESSMENT",
  "CENSUS",
  "CERTIFICATE",
  "COLLECTION",
  "COMPLIANCE",
  "IDENTITY",
  "INFORMATION",
  "INSPECTION",
  "LIABILITY",
  "NOTIFICATION",
  "OFFSET",
  "PAYMENT",
  "REFUND",
  "REVIEW",
  "SANCTION",
  "SEIZURE",
] as const;
const PHASE_VALUES = [
  "F1",
  "F2",
  "F3",
  "F4",
  "F5",
  "F6",
  "F7",
  "F8",
  "F9",
] as const;
const DOCUMENT_NATURE_VALUES = [
  "APPEAL",
  "APPLICATION_OR_RESOLUTION",
  "APPLICATION_RECEIPT",
  "ASSESSMENT",
  "CERTIFICATE",
  "COLLECTION_ACT",
  "ENFORCEMENT_ACT",
  "FORMAL_REQUEST",
  "INFORMATIONAL",
  "INFORMATIONAL_WARNING",
  "INSPECTION_ACT",
  "NOTIFICATION_EVIDENCE",
  "PAYMENT_EVIDENCE",
  "PAYMENT_INSTRUMENT",
  "PAYMENT_NOTICE",
  "PRECAUTIONARY_ACT",
  "PROCEDURAL_RECORD",
  "PROCEDURE_CONTAINER",
  "PROCEDURE_START",
  "PROCEDURE_START_OR_PROPOSAL",
  "PROPOSAL",
  "PROPOSAL_OR_RESOLUTION",
  "REGISTRATION_EVIDENCE",
  "RESOLUTION",
  "RESOLUTION_OR_COLLECTION_ACT",
  "RESPONSE_EVIDENCE",
  "SPECIAL_REVIEW",
  "STATUS_NOTICE",
  "STATUS_NOTICE_OR_RESOLUTION",
  "THIRD_PARTY_ENFORCEMENT_ACT",
  "THIRD_PARTY_FOLLOWUP",
  "THIRD_PARTY_REVIEW",
] as const;
const DEBT_EFFECT_VALUES = [
  "CONDITIONAL_AFTER_LEGAL_EFFECT",
  "CONDITIONAL_FINAL_RESOLUTION_ONLY",
  "CONDITIONAL_PRINTED_RESULT",
  "NO",
  "YES_DERIVED_SCOPE_ONLY",
  "YES_LINKED_ADDITIONAL_AMOUNT",
  "YES_SUCCESSOR_SCOPE_ONLY",
] as const;
const DEADLINE_TRIGGER_VALUES = [
  "EFFECTIVE_NOTIFICATION_DATE",
  "EFFECTIVE_NOTIFICATION_DATE_OR_RECEIPT",
  "EXPLICIT_DUE_DATE",
  "FUTURE_EVENT",
  "INSTALLMENT_DUE_DATE",
] as const;
const REFERENCE_FIELD_VALUES = [
  "ACT_ID",
  "AGREEMENT_ID",
  "BANK_REFERENCE",
  "CSV",
  "DEBT_KEY",
  "EXPEDIENTE_ID",
  "FILING_RECEIPT_ID",
  "FISCAL_YEAR",
  "LIQUIDATION_KEY",
  "MODEL",
  "NOTIFICATION_ID",
  "NRC",
  "OTHER_OFFICIAL_REFERENCE",
  "PAYMENT_RECEIPT_ID",
  "PROCEDURE_ID",
  "REGISTRY_ID",
  "REQUEST_NUMBER",
  "SEIZURE_ORDER_ID",
  "TAX_PERIOD",
  "THIRD_PARTY_RESPONSE_ID",
] as const;
const DATE_FIELD_VALUES = [
  "ACCESS_DATE",
  "ACTION_DATE",
  "APPEAL_DEADLINE",
  "AVAILABILITY_DATE",
  "EFFECTIVE_NOTIFICATION_DATE",
  "END_DATE",
  "EXPIRATION_DATE",
  "FILING_DATE",
  "INSTALLMENT_DUE_DATE",
  "INTEREST_END_DATE",
  "INTEREST_START_DATE",
  "ISSUE_DATE",
  "PAYMENT_DATE",
  "REJECTION_DATE",
  "RELEASE_DATE",
  "RESPONSE_DEADLINE",
  "SEIZURE_DATE",
  "SIGNING_DATE",
  "START_DATE",
  "VOLUNTARY_PAYMENT_DEADLINE",
] as const;
const MONEY_FIELD_VALUES = [
  "CHARGES",
  "COSTS",
  "CREDIT_TOTAL",
  "DEFERRAL_INTEREST",
  "DOCUMENT_TOTAL",
  "EXECUTIVE_SURCHARGE_10",
  "EXECUTIVE_SURCHARGE_20",
  "EXECUTIVE_SURCHARGE_5",
  "EXECUTIVE_SURCHARGE_PRINTED",
  "FINAL_QUOTA",
  "LATE_PAYMENT_INTEREST",
  "NET_REFUND_PAYMENT",
  "OFFSET_APPLIED",
  "ORIGINAL_TAX_PRINCIPAL",
  "OUTSTANDING_PRINCIPAL",
  "PAYMENT_CONFIRMED",
  "PAYMENT_ON_ACCOUNT",
  "PROPOSED_QUOTA",
  "REFUND_CREDIT",
  "RELEASED_AMOUNT",
  "REMAINING_AFTER_OFFSET",
  "REMITTED_AMOUNT",
  "RETAINED_AMOUNT",
  "SANCTION_INITIAL",
  "SANCTION_REDUCED",
  "SANCTION_REDUCTION",
  "SEIZED_AMOUNT",
  "TOTAL_BEFORE_OFFSET",
  "VALUATION",
] as const;
const FACT_FIELD_VALUES = [
  "ACCOUNT_OR_DEPOSIT",
  "APPEAL_INFORMATION",
  "BARCODE_REFERENCE",
  "CADASTRAL_REFERENCE",
  "CHARGES",
  "CONTRACT_OR_INVOICE",
  "CREDIT_DEBTOR",
  "DOCUMENTATION_REQUIRED",
  "DOCUMENT_STATUS",
  "EXPLICIT_CONSEQUENCE",
  "EXPLICIT_RELEASE_REASON",
  "FACT_OR_GROUND",
  "FINANCIAL_ENTITY",
  "ISSUING_AUTHORITY",
  "LAND_REGISTRY",
  "NOTIFICATION_CHANNEL",
  "NOTIFICATION_SUBJECT",
  "OBLIGATION",
  "OFFSET_EFFECT_MEANING",
  "OWNERSHIP_SHARE",
  "PAYMENT_MEDIUM",
  "PAYMENT_RESULT",
  "PAYMENT_SCOPE",
  "PAYMENT_SERVICE_PROVIDER",
  "PAYMENT_TIME",
  "PRINTED_NOTIFICATION_STATE",
  "PRINTED_WITHHOLDING_LIMIT",
  "PROHIBITION_TO_PAY_DEBTOR",
  "PROPERTY_ADDRESS",
  "PROPERTY_HOLDER",
  "PROPERTY_NUMBER",
  "REASON",
  "REJECTION_REASON",
  "RELEASED_ASSET_OR_RIGHT",
  "RELEASE_EXTENT",
  "REMUNERATION_TYPE",
  "RESPONSE_CHANNEL",
  "SEIZED_RIGHT",
  "SEIZURE_INSTRUCTIONS",
  "SEIZURE_RECIPIENT_ROLE",
  "TERMINAL_OR_MERCHANT",
  "THIRD_PARTY_RESPONSE",
  "TRANSFER_RECEIPT",
  "VALUATION",
] as const;
const PARTICIPANT_ROLE_VALUES = [
  "ACCOUNT_HOLDER",
  "EMPLOYER_OR_PAYER",
  "FINANCIAL_ENTITY",
  "ISSUING_AUTHORITY",
  "LIABLE_PARTY",
  "ORIGINATING_AUTHORITY",
  "PAYMENT_SERVICE_PROVIDER",
  "PRIMARY_DEBTOR",
  "REPRESENTATIVE",
  "SUCCESSOR",
  "TAX_DEBTOR",
  "THIRD_PARTY",
  "THIRD_PARTY_DEBTOR",
  "THIRD_PARTY_PAYER",
  "THIRD_PARTY_SPOUSE",
] as const;
const HIGH_SENSITIVITY_FIELD_VALUES = [
  "ACCOUNT_OR_DEPOSIT",
  "ACTIVATION_CODE",
  "ADDRESS",
  "BANK_REFERENCE",
  "CADASTRAL_REFERENCE",
  "EMAIL",
  "NRC",
  "PHONE",
  "PROPERTY_ADDRESS",
  "PROPERTY_NUMBER",
  "SECRET",
  "VEHICLE_PLATE",
  "VIN",
] as const;
const CHAIN_ROLE_PREFIX_VALUES = [
  "PRECEDES",
  "PREDECESSOR_OF",
  "RELATION",
  "SPECIALIZATION_OF",
  "SUCCESSOR_OF",
] as const;

export type AeatDocumentChainRoleV1 =
  | `RELATION:${AeatDocumentRelationTypeIdV1}`
  | `${Exclude<ValueOf<typeof CHAIN_ROLE_PREFIX_VALUES>, "RELATION">}:${AeatDocumentChainNodeV1}`;

type ValueOf<T extends readonly string[]> = T[number];

export interface AeatDocumentOfficialSourceV1 {
  readonly title: string;
  readonly authority: "DOCUMENT" | "BOE" | "AEAT" | "Gobierno de España";
  readonly url: string | null;
  readonly purpose?: string;
  readonly contextPolicy: "DOCUMENT_PRIMARY" | "OFFICIAL_CONTEXT";
}

export interface AeatDocumentRelationTypeV1 {
  readonly exactPhrase: string;
  readonly suggestedPhrase: string;
}

export interface AeatDocumentChainEdgeV1 {
  readonly from: AeatDocumentChainNodeV1;
  readonly to: AeatDocumentChainNodeV1;
  readonly relationType: AeatDocumentRelationTypeIdV1;
}

export interface AeatDocumentChainV1 {
  readonly id: AeatDocumentChainIdV1;
  readonly description: string;
  readonly nodes: readonly AeatDocumentChainNodeV1[];
  readonly edges: readonly AeatDocumentChainEdgeV1[];
}

export interface AeatDocumentProfileV1 {
  readonly id: FiscalNotificationDocumentFamilyIdV3;
  readonly nameEs: string;
  readonly category: ValueOf<typeof CATEGORY_VALUES>;
  readonly phase: ValueOf<typeof PHASE_VALUES>;
  readonly documentNature: ValueOf<typeof DOCUMENT_NATURE_VALUES>;
  readonly createsOrUpdatesDebt: ValueOf<typeof DEBT_EFFECT_VALUES>;
  readonly plainLanguage: {
    readonly whatItIs: string;
    readonly whyReceived: string;
    readonly resultRule: string;
    readonly nextStepRule: string;
    readonly deadlineRule: {
      readonly trigger: ValueOf<typeof DEADLINE_TRIGGER_VALUES> | null;
      readonly text: string;
      readonly fallback: string;
    };
    readonly nonComplianceContext: readonly string[];
    readonly notProvenByThisDocument: readonly string[];
  };
  readonly mustExtract: {
    readonly references: readonly ValueOf<typeof REFERENCE_FIELD_VALUES>[];
    readonly dates: readonly ValueOf<typeof DATE_FIELD_VALUES>[];
    readonly money: readonly ValueOf<typeof MONEY_FIELD_VALUES>[];
    readonly facts: readonly ValueOf<typeof FACT_FIELD_VALUES>[];
    readonly participantRoles: readonly ValueOf<
      typeof PARTICIPANT_ROLE_VALUES
    >[];
  };
  readonly officialSourceIds: readonly AeatDocumentOfficialSourceIdV1[];
  readonly chainRole: readonly AeatDocumentChainRoleV1[];
  readonly observedRealDocumentPatternsSanitized: readonly string[];
  readonly acceptanceTests: {
    readonly positive: readonly string[];
    readonly negative: readonly string[];
  };
  readonly highSensitivityFields: readonly ValueOf<
    typeof HIGH_SENSITIVITY_FIELD_VALUES
  >[];
  readonly assertionPolicy: {
    readonly printed: "EXPLICIT_IN_DOCUMENT";
    readonly calculated: "CALCULATED_FROM_PRINTED_VALUES";
    readonly context: "OFFICIAL_CONTEXT";
    readonly unproven: "NOT_PROVEN_BY_DOCUMENT";
  };
  readonly researchCoverage: "OFFICIAL_ONLY" | "REAL_EXAMPLE_AND_OFFICIAL";
  readonly implementationPriority: "P0" | "P1" | "P2";
  readonly relationPolicy:
    "DECLARED_CHAIN_ROLES_ONLY" | "NO_AUTOMATIC_RELATION";
  readonly consequencePolicy:
    "DOCUMENTED_CONTEXT_ONLY" | "NOT_PROVEN_BY_DOCUMENT";
  readonly extractorStatus: "NOT_IMPLEMENTED";
}

export interface AeatDocumentKnowledgeV1 {
  readonly meta: {
    readonly title: string;
    readonly version: typeof AEAT_DOCUMENT_KNOWLEDGE_SCHEMA_VERSION_V1;
    readonly createdAt: string;
    readonly language: "es-ES";
    readonly profileCount: 87;
    readonly sourceCount: 50;
    readonly relationTypeCount: 48;
    readonly chainCount: 15;
    readonly containsRealPersonalData: false;
    readonly realDocumentsPolicy: string;
    readonly purpose: string;
  };
  readonly globalPolicy: {
    readonly schemaVersion: typeof AEAT_DOCUMENT_KNOWLEDGE_SCHEMA_VERSION_V1;
    readonly releaseId: typeof AEAT_DOCUMENT_KNOWLEDGE_RELEASE_ID_V1;
    readonly scope: string;
    readonly language: "es-ES";
    readonly documentIsPrimary: true;
    readonly networkAtScanTime: "PROHIBITED";
    readonly runtimeAIAtScanTime: "PROHIBITED";
    readonly humanReviewRequired: true;
    readonly materialization: string;
    readonly assertionLevels: Readonly<
      Record<
        | "EXPLICIT_IN_DOCUMENT"
        | "CALCULATED_FROM_PRINTED_VALUES"
        | "OFFICIAL_CONTEXT"
        | "NOT_PROVEN_BY_DOCUMENT",
        string
      >
    >;
    readonly chronology: {
      readonly chronologyDatePriority: readonly [
        "ISSUE_DATE",
        "SIGNING_DATE",
        "ACTION_DATE",
        "EFFECTIVE_NOTIFICATION_DATE",
      ];
      readonly libraryOrder: "DESCENDING";
      readonly caseTimelineOrder: "ASCENDING";
      readonly neverUseAsDocumentDate: readonly [
        "UPLOADED_AT",
        "SCANNED_AT",
        "CREATED_AT",
        "FILE_METADATA_DATE",
      ];
      readonly legalDeadlineRule: string;
    };
    readonly persistencePrivacy: {
      readonly accountHolder: {
        readonly persist: readonly string[];
        readonly doNotPersistFromDocument: readonly string[];
      };
      readonly thirdParties: {
        readonly persist: readonly string[];
        readonly doNotPersist: readonly string[];
      };
      readonly highSensitivityReferences: readonly [
        "CSV",
        "NRC",
        "BANK_REFERENCE",
      ];
      readonly highSensitivityRule: string;
    };
    readonly explanationUi: {
      readonly sectionOrder: readonly string[];
      readonly relationStatusLabels: Readonly<
        Record<
          "SYSTEM_CONFIRMED_EXACT" | "USER_CONFIRMED" | "SUGGESTED",
          string
        >
      >;
      readonly suggestedRelationOnlyPhrase: string;
      readonly forbiddenDefinitiveVerbsForSuggestedRelations: readonly string[];
    };
    readonly relationshipExactness: {
      readonly indexKey: string;
      readonly normalization: readonly string[];
      readonly exactRelationRequirements: readonly string[];
      readonly supportingOnly: readonly string[];
      readonly neverEnoughAlone: readonly string[];
      readonly exactStatus: "SYSTEM_CONFIRMED_EXACT";
      readonly fallbackStatus: "SUGGESTED";
      readonly conflictRule: string;
    };
  };
  readonly realCorpusLearningsSanitized: readonly {
    readonly code: string;
    readonly learning: string;
  }[];
  readonly officialSources: Readonly<
    Record<AeatDocumentOfficialSourceIdV1, AeatDocumentOfficialSourceV1>
  >;
  readonly relationTypes: Readonly<
    Record<AeatDocumentRelationTypeIdV1, AeatDocumentRelationTypeV1>
  >;
  readonly documentChains: readonly AeatDocumentChainV1[];
  readonly profiles: readonly AeatDocumentProfileV1[];
}

export class AeatDocumentKnowledgeValidationError extends Error {
  readonly code = "INVALID_AEAT_DOCUMENT_KNOWLEDGE" as const;

  constructor(path: string) {
    super(`Invalid AEAT document knowledge package at ${path}`);
    this.name = "AeatDocumentKnowledgeValidationError";
  }
}

type UnknownRecord = Record<string, unknown>;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;
const PROFILE_ID_PATTERN = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/u;
const UPPER_ID_PATTERN = /^[A-Z][A-Z0-9_]*$/u;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const MAX_TEXT_LENGTH = 512;
const MAX_URL_LENGTH = 2_048;
const PERSONAL_TAX_ID_PATTERN = /(?:^|[^A-Z0-9])(?:\d{8}[\s._-]?[A-Z]|[XYZ][\s._-]?\d{7}[\s._-]?[A-Z]|[ABCDEFGHJNPQRSUVW][\s._-]?\d{7}[\s._-]?[0-9A-J])(?=$|[^A-Z0-9])/iu;
const PERSONAL_IBAN_PATTERN = /(?:^|[^A-Z0-9])ES(?:[\s._-]?\d){22}(?=$|[^A-Z0-9])/iu;
const PERSONAL_EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu;
const PERSONAL_PHONE_PATTERN = /(?:^|\D)(?:\+?34[\s._-]?)?[6789](?:[\s._-]?\d){8}(?:$|\D)/u;
const SOURCE_HOST_BY_AUTHORITY = Object.freeze({
  BOE: "www.boe.es",
  AEAT: "sede.agenciatributaria.gob.es",
  "Gobierno de España": "clave.gob.es",
} as const);

function invalid(path: string): never {
  throw new AeatDocumentKnowledgeValidationError(path);
}

function snapshotJsonValue(
  value: unknown,
  path: string,
  state: { nodes: number },
  depth = 0,
): unknown {
  if (depth > 32 || (state.nodes += 1) > 100_000) invalid(path);
  if (value === null || typeof value !== "object") return value;
  try {
    if (Object.getOwnPropertySymbols(value).length > 0) invalid(`${path}.$shape`);
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype) invalid(path);
      const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
      const length = lengthDescriptor?.value;
      if (!Number.isSafeInteger(length) || length < 0 || length > 20_000) {
        invalid(path);
      }
      const result: unknown[] = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (
          !descriptor ||
          !("value" in descriptor) ||
          descriptor.enumerable !== true
        ) {
          invalid(`${path}[${index}]`);
        }
        result.push(
          snapshotJsonValue(
            descriptor.value,
            `${path}[${index}]`,
            state,
            depth + 1,
          ),
        );
      }
      if (Reflect.ownKeys(value).length !== length + 1) invalid(`${path}.$shape`);
      return result;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) invalid(path);
    const result: UnknownRecord = {};
    const descriptors = Object.getOwnPropertyDescriptors(value);
    for (const key of Reflect.ownKeys(descriptors)) {
      if (typeof key !== "string") invalid(`${path}.$shape`);
      const descriptor = descriptors[key];
      if (
        !descriptor ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        invalid(`${path}.${key}`);
      }
      result[key] = snapshotJsonValue(
        descriptor.value,
        `${path}.${key}`,
        state,
        depth + 1,
      );
    }
    return result;
  } catch (error) {
    if (error instanceof AeatDocumentKnowledgeValidationError) throw error;
    invalid(path);
  }
}

function validateNoPersonalData(value: unknown, path = "root"): void {
  if (typeof value === "string") {
    if (
      PERSONAL_TAX_ID_PATTERN.test(value) ||
      PERSONAL_IBAN_PATTERN.test(value) ||
      PERSONAL_EMAIL_PATTERN.test(value) ||
      PERSONAL_PHONE_PATTERN.test(value)
    ) {
      invalid(path);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateNoPersonalData(item, `${path}[${index}]`));
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, nested] of Object.entries(value as UnknownRecord)) {
      validateNoPersonalData(nested, `${path}.${key}`);
    }
  }
}

function expectRecord(value: unknown, path: string): UnknownRecord {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  ) {
    invalid(path);
  }
  return value as UnknownRecord;
}

function expectKeys(
  value: UnknownRecord,
  path: string,
  required: readonly string[],
  optional: readonly string[] = [],
): void {
  const allowed = new Set([...required, ...optional]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) invalid(`${path}.${key}`);
  }
  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      invalid(`${path}.${key}`);
    }
  }
}

function expectArray(
  value: unknown,
  path: string,
  minimum: number,
  maximum: number,
): readonly unknown[] {
  if (
    !Array.isArray(value) ||
    value.length < minimum ||
    value.length > maximum
  ) {
    invalid(path);
  }
  return value;
}

function expectString(
  value: unknown,
  path: string,
  maximum = MAX_TEXT_LENGTH,
): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maximum ||
    value !== value.trim() ||
    CONTROL_CHARACTER_PATTERN.test(value)
  ) {
    invalid(path);
  }
  return value;
}

function expectLiteral<T extends string | number | boolean | null>(
  value: unknown,
  expected: T,
  path: string,
): T {
  if (value !== expected) invalid(path);
  return expected;
}

function expectEnum<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  path: string,
): T[number] {
  if (typeof value !== "string" || !allowed.includes(value)) invalid(path);
  return value as T[number];
}

function expectStringArray<T extends readonly string[]>(
  value: unknown,
  path: string,
  options: {
    readonly minimum: number;
    readonly maximum: number;
    readonly allowed?: T;
  },
): readonly string[] {
  const items = expectArray(value, path, options.minimum, options.maximum);
  const seen = new Set<string>();
  for (let index = 0; index < items.length; index += 1) {
    const itemPath = `${path}[${index}]`;
    const item = expectString(items[index], itemPath);
    if (options.allowed && !options.allowed.includes(item)) invalid(itemPath);
    if (seen.has(item)) invalid(itemPath);
    seen.add(item);
  }
  return items as readonly string[];
}

function expectExactStringArray(
  value: unknown,
  path: string,
  expected: readonly string[],
): void {
  const items = expectArray(value, path, expected.length, expected.length);
  for (let index = 0; index < expected.length; index += 1) {
    if (items[index] !== expected[index]) invalid(`${path}[${index}]`);
  }
}

function expectIdentifier(
  value: unknown,
  path: string,
  pattern: RegExp,
): string {
  const identifier = expectString(value, path, 160);
  if (!pattern.test(identifier)) invalid(path);
  return identifier;
}

function validateMeta(value: unknown): void {
  const meta = expectRecord(value, "meta");
  expectKeys(meta, "meta", [
    "title",
    "version",
    "createdAt",
    "language",
    "profileCount",
    "sourceCount",
    "relationTypeCount",
    "chainCount",
    "containsRealPersonalData",
    "realDocumentsPolicy",
    "purpose",
  ]);
  expectString(meta.title, "meta.title");
  expectLiteral(
    meta.version,
    AEAT_DOCUMENT_KNOWLEDGE_SCHEMA_VERSION_V1,
    "meta.version",
  );
  const createdAt = expectString(meta.createdAt, "meta.createdAt", 10);
  const parsedCreatedAt = new Date(`${createdAt}T00:00:00.000Z`);
  if (
    !ISO_DATE_PATTERN.test(createdAt) ||
    Number.isNaN(parsedCreatedAt.valueOf()) ||
    parsedCreatedAt.toISOString().slice(0, 10) !== createdAt
  ) {
    invalid("meta.createdAt");
  }
  expectLiteral(meta.language, "es-ES", "meta.language");
  expectLiteral(meta.profileCount, 87, "meta.profileCount");
  expectLiteral(meta.sourceCount, 50, "meta.sourceCount");
  expectLiteral(meta.relationTypeCount, 48, "meta.relationTypeCount");
  expectLiteral(meta.chainCount, 15, "meta.chainCount");
  expectLiteral(
    meta.containsRealPersonalData,
    false,
    "meta.containsRealPersonalData",
  );
  expectString(meta.realDocumentsPolicy, "meta.realDocumentsPolicy");
  expectString(meta.purpose, "meta.purpose");
}

const EXPECTED_ASSERTION_LEVELS = {
  EXPLICIT_IN_DOCUMENT: "El documento lo imprime expresamente.",
  CALCULATED_FROM_PRINTED_VALUES:
    "Cálculo determinista usando exclusivamente cifras impresas.",
  OFFICIAL_CONTEXT: "Contexto general AEAT/BOE, nunca sustituto del documento.",
  NOT_PROVEN_BY_DOCUMENT:
    "La ficha debe decir que el documento no permite afirmarlo.",
} as const;
const EXPECTED_ACCOUNT_HOLDER_PERSIST = [
  "ownerScope",
  "subjectKind=ACCOUNT_HOLDER",
  "identityMatchStatus",
  "identityMatchMethod",
] as const;
const EXPECTED_PERSONAL_FIELDS = [
  "name",
  "taxId",
  "address",
  "email",
  "phone",
  "signature",
  "IBAN",
  "bankAccountDigits",
] as const;
const EXPECTED_THIRD_PARTY_PERSIST = [
  "partyKind",
  "canonicalRole",
  "ordinal",
  "directionOfObligation",
  "amount",
  "dates",
  "state",
  "consequence",
  "optionalLinkedMasterEntityId",
] as const;
const EXPECTED_SECTION_ORDER = [
  "Qué te está diciendo este documento",
  "Por qué lo has recibido",
  "Resultado",
  "Datos clave",
  "Qué tienes que hacer",
  "Plazo",
  "Qué puede pasar si no se atiende",
  "Qué no demuestra este documento",
  "Cómo encaja con tus otros documentos",
  "Fuentes oficiales",
] as const;
const EXPECTED_FORBIDDEN_SUGGESTED_VERBS = [
  "paga",
  "resuelve",
  "cancela",
  "sustituye",
  "levanta",
  "extingue",
  "suspende",
  "anula",
  "confirma",
] as const;
const EXPECTED_NORMALIZATION_POLICY = [
  "Unicode NFKC y mayúsculas.",
  "Eliminar solo espacios y separadores tipográficos no significativos.",
  "Conservar ceros iniciales, dígitos de control, letras, sufijos, secuencias y números de vencimiento.",
  "No convertir coincidencias de prefijo en coincidencias exactas.",
] as const;
const EXPECTED_EXACT_RELATION_REQUIREMENTS = [
  "Mismo ownerScope.",
  "Referencia oficial exacta normalizada o cita origen→destino exacta.",
  "Emisor compatible.",
  "Tipo y alcance de referencia compatibles.",
] as const;
const EXPECTED_SUPPORTING_ONLY = [
  "dates",
  "amounts",
  "model",
  "fiscalYear",
  "taxPeriod",
  "documentFamily",
  "chronology",
] as const;
const EXPECTED_NEVER_ENOUGH_ALONE = [
  "name",
  "taxId",
  "title",
  "sameAmount",
  "approximateDate",
  "modelAndPeriod",
  "textSimilarity",
] as const;

function validateGlobalPolicy(value: unknown): void {
  const policy = expectRecord(value, "globalPolicy");
  expectKeys(policy, "globalPolicy", [
    "schemaVersion",
    "releaseId",
    "scope",
    "language",
    "documentIsPrimary",
    "networkAtScanTime",
    "runtimeAIAtScanTime",
    "humanReviewRequired",
    "materialization",
    "assertionLevels",
    "chronology",
    "persistencePrivacy",
    "explanationUi",
    "relationshipExactness",
  ]);
  expectLiteral(
    policy.schemaVersion,
    AEAT_DOCUMENT_KNOWLEDGE_SCHEMA_VERSION_V1,
    "globalPolicy.schemaVersion",
  );
  expectLiteral(
    policy.releaseId,
    AEAT_DOCUMENT_KNOWLEDGE_RELEASE_ID_V1,
    "globalPolicy.releaseId",
  );
  expectString(policy.scope, "globalPolicy.scope");
  expectLiteral(policy.language, "es-ES", "globalPolicy.language");
  expectLiteral(
    policy.documentIsPrimary,
    true,
    "globalPolicy.documentIsPrimary",
  );
  expectLiteral(
    policy.networkAtScanTime,
    "PROHIBITED",
    "globalPolicy.networkAtScanTime",
  );
  expectLiteral(
    policy.runtimeAIAtScanTime,
    "PROHIBITED",
    "globalPolicy.runtimeAIAtScanTime",
  );
  expectLiteral(
    policy.humanReviewRequired,
    true,
    "globalPolicy.humanReviewRequired",
  );
  expectLiteral(
    policy.materialization,
    "No crear automáticamente pagos, deudas, gastos, asientos, recursos, suspensiones o trámites.",
    "globalPolicy.materialization",
  );

  const assertionLevels = expectRecord(
    policy.assertionLevels,
    "globalPolicy.assertionLevels",
  );
  expectKeys(
    assertionLevels,
    "globalPolicy.assertionLevels",
    Object.keys(EXPECTED_ASSERTION_LEVELS),
  );
  for (const [key, expected] of Object.entries(EXPECTED_ASSERTION_LEVELS)) {
    expectLiteral(
      assertionLevels[key],
      expected,
      `globalPolicy.assertionLevels.${key}`,
    );
  }

  const chronology = expectRecord(policy.chronology, "globalPolicy.chronology");
  expectKeys(chronology, "globalPolicy.chronology", [
    "chronologyDatePriority",
    "libraryOrder",
    "caseTimelineOrder",
    "neverUseAsDocumentDate",
    "legalDeadlineRule",
  ]);
  expectExactStringArray(
    chronology.chronologyDatePriority,
    "globalPolicy.chronology.chronologyDatePriority",
    [
      "ISSUE_DATE",
      "SIGNING_DATE",
      "ACTION_DATE",
      "EFFECTIVE_NOTIFICATION_DATE",
    ],
  );
  expectLiteral(
    chronology.libraryOrder,
    "DESCENDING",
    "globalPolicy.chronology.libraryOrder",
  );
  expectLiteral(
    chronology.caseTimelineOrder,
    "ASCENDING",
    "globalPolicy.chronology.caseTimelineOrder",
  );
  expectExactStringArray(
    chronology.neverUseAsDocumentDate,
    "globalPolicy.chronology.neverUseAsDocumentDate",
    ["UPLOADED_AT", "SCANNED_AT", "CREATED_AT", "FILE_METADATA_DATE"],
  );
  expectString(
    chronology.legalDeadlineRule,
    "globalPolicy.chronology.legalDeadlineRule",
  );

  const privacy = expectRecord(
    policy.persistencePrivacy,
    "globalPolicy.persistencePrivacy",
  );
  expectKeys(privacy, "globalPolicy.persistencePrivacy", [
    "accountHolder",
    "thirdParties",
    "highSensitivityReferences",
    "highSensitivityRule",
  ]);
  const accountHolder = expectRecord(
    privacy.accountHolder,
    "globalPolicy.persistencePrivacy.accountHolder",
  );
  expectKeys(accountHolder, "globalPolicy.persistencePrivacy.accountHolder", [
    "persist",
    "doNotPersistFromDocument",
  ]);
  expectExactStringArray(
    accountHolder.persist,
    "globalPolicy.persistencePrivacy.accountHolder.persist",
    EXPECTED_ACCOUNT_HOLDER_PERSIST,
  );
  expectExactStringArray(
    accountHolder.doNotPersistFromDocument,
    "globalPolicy.persistencePrivacy.accountHolder.doNotPersistFromDocument",
    EXPECTED_PERSONAL_FIELDS,
  );
  const thirdParties = expectRecord(
    privacy.thirdParties,
    "globalPolicy.persistencePrivacy.thirdParties",
  );
  expectKeys(thirdParties, "globalPolicy.persistencePrivacy.thirdParties", [
    "persist",
    "doNotPersist",
  ]);
  expectExactStringArray(
    thirdParties.persist,
    "globalPolicy.persistencePrivacy.thirdParties.persist",
    EXPECTED_THIRD_PARTY_PERSIST,
  );
  expectExactStringArray(
    thirdParties.doNotPersist,
    "globalPolicy.persistencePrivacy.thirdParties.doNotPersist",
    EXPECTED_PERSONAL_FIELDS,
  );
  expectExactStringArray(
    privacy.highSensitivityReferences,
    "globalPolicy.persistencePrivacy.highSensitivityReferences",
    ["CSV", "NRC", "BANK_REFERENCE"],
  );
  expectString(
    privacy.highSensitivityRule,
    "globalPolicy.persistencePrivacy.highSensitivityRule",
  );

  const explanationUi = expectRecord(
    policy.explanationUi,
    "globalPolicy.explanationUi",
  );
  expectKeys(explanationUi, "globalPolicy.explanationUi", [
    "sectionOrder",
    "relationStatusLabels",
    "suggestedRelationOnlyPhrase",
    "forbiddenDefinitiveVerbsForSuggestedRelations",
  ]);
  expectExactStringArray(
    explanationUi.sectionOrder,
    "globalPolicy.explanationUi.sectionOrder",
    EXPECTED_SECTION_ORDER,
  );
  const relationStatusLabels = expectRecord(
    explanationUi.relationStatusLabels,
    "globalPolicy.explanationUi.relationStatusLabels",
  );
  expectKeys(
    relationStatusLabels,
    "globalPolicy.explanationUi.relationStatusLabels",
    ["SYSTEM_CONFIRMED_EXACT", "USER_CONFIRMED", "SUGGESTED"],
  );
  expectLiteral(
    relationStatusLabels.SYSTEM_CONFIRMED_EXACT,
    "Confirmada por referencia",
    "globalPolicy.explanationUi.relationStatusLabels.SYSTEM_CONFIRMED_EXACT",
  );
  expectLiteral(
    relationStatusLabels.USER_CONFIRMED,
    "Confirmada por el usuario",
    "globalPolicy.explanationUi.relationStatusLabels.USER_CONFIRMED",
  );
  expectLiteral(
    relationStatusLabels.SUGGESTED,
    "Posible relación",
    "globalPolicy.explanationUi.relationStatusLabels.SUGGESTED",
  );
  expectLiteral(
    explanationUi.suggestedRelationOnlyPhrase,
    "Puede estar relacionado con otro documento por una referencia parcial compatible, fecha o importe coincidente. Revísalo antes de confirmarlo.",
    "globalPolicy.explanationUi.suggestedRelationOnlyPhrase",
  );
  expectExactStringArray(
    explanationUi.forbiddenDefinitiveVerbsForSuggestedRelations,
    "globalPolicy.explanationUi.forbiddenDefinitiveVerbsForSuggestedRelations",
    EXPECTED_FORBIDDEN_SUGGESTED_VERBS,
  );

  const exactness = expectRecord(
    policy.relationshipExactness,
    "globalPolicy.relationshipExactness",
  );
  expectKeys(exactness, "globalPolicy.relationshipExactness", [
    "indexKey",
    "normalization",
    "exactRelationRequirements",
    "supportingOnly",
    "neverEnoughAlone",
    "exactStatus",
    "fallbackStatus",
    "conflictRule",
  ]);
  expectLiteral(
    exactness.indexKey,
    "ownerScope|issuerNormalized|referenceType|normalizedReference",
    "globalPolicy.relationshipExactness.indexKey",
  );
  expectExactStringArray(
    exactness.normalization,
    "globalPolicy.relationshipExactness.normalization",
    EXPECTED_NORMALIZATION_POLICY,
  );
  expectExactStringArray(
    exactness.exactRelationRequirements,
    "globalPolicy.relationshipExactness.exactRelationRequirements",
    EXPECTED_EXACT_RELATION_REQUIREMENTS,
  );
  expectExactStringArray(
    exactness.supportingOnly,
    "globalPolicy.relationshipExactness.supportingOnly",
    EXPECTED_SUPPORTING_ONLY,
  );
  expectExactStringArray(
    exactness.neverEnoughAlone,
    "globalPolicy.relationshipExactness.neverEnoughAlone",
    EXPECTED_NEVER_ENOUGH_ALONE,
  );
  expectLiteral(
    exactness.exactStatus,
    "SYSTEM_CONFIRMED_EXACT",
    "globalPolicy.relationshipExactness.exactStatus",
  );
  expectLiteral(
    exactness.fallbackStatus,
    "SUGGESTED",
    "globalPolicy.relationshipExactness.fallbackStatus",
  );
  expectString(
    exactness.conflictRule,
    "globalPolicy.relationshipExactness.conflictRule",
  );
}

function validateCorpusLearnings(value: unknown): void {
  const entries = expectArray(value, "realCorpusLearningsSanitized", 1, 100);
  const ids = new Set<string>();
  entries.forEach((entry, index) => {
    const path = `realCorpusLearningsSanitized[${index}]`;
    const record = expectRecord(entry, path);
    expectKeys(record, path, ["code", "learning"]);
    const code = expectIdentifier(
      record.code,
      `${path}.code`,
      UPPER_ID_PATTERN,
    );
    if (ids.has(code)) invalid(`${path}.code`);
    ids.add(code);
    expectString(record.learning, `${path}.learning`);
  });
}

function validateOfficialSources(value: unknown): void {
  const sources = expectRecord(value, "officialSources");
  expectKeys(sources, "officialSources", AEAT_DOCUMENT_OFFICIAL_SOURCE_IDS_V1);
  for (const sourceId of AEAT_DOCUMENT_OFFICIAL_SOURCE_IDS_V1) {
    const path = `officialSources.${sourceId}`;
    const source = expectRecord(sources[sourceId], path);
    expectKeys(source, path, ["title", "authority", "url"], ["purpose"]);
    expectString(source.title, `${path}.title`);
    expectEnum(
      source.authority,
      ["DOCUMENT", "BOE", "AEAT", "Gobierno de España"] as const,
      `${path}.authority`,
    );
    if (sourceId === "DOC_PRIMARY") {
      expectLiteral(source.authority, "DOCUMENT", `${path}.authority`);
      expectLiteral(source.url, null, `${path}.url`);
      if (!Object.prototype.hasOwnProperty.call(source, "purpose")) {
        invalid(`${path}.purpose`);
      }
      expectString(source.purpose, `${path}.purpose`);
    } else {
      const url = expectString(source.url, `${path}.url`, MAX_URL_LENGTH);
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch {
        invalid(`${path}.url`);
      }
      if (parsedUrl.protocol !== "https:" || parsedUrl.username || parsedUrl.password) {
        invalid(`${path}.url`);
      }
      if (source.authority === "DOCUMENT") invalid(`${path}.authority`);
      const expectedHost =
        SOURCE_HOST_BY_AUTHORITY[
          source.authority as keyof typeof SOURCE_HOST_BY_AUTHORITY
        ];
      if (!expectedHost || parsedUrl.hostname !== expectedHost) {
        invalid(`${path}.url`);
      }
      if (Object.prototype.hasOwnProperty.call(source, "purpose")) {
        expectString(source.purpose, `${path}.purpose`);
      }
    }
  }
}

function validateRelationTypes(value: unknown): void {
  const relationTypes = expectRecord(value, "relationTypes");
  expectKeys(
    relationTypes,
    "relationTypes",
    AEAT_DOCUMENT_RELATION_TYPE_IDS_V1,
  );
  for (const relationType of AEAT_DOCUMENT_RELATION_TYPE_IDS_V1) {
    const path = `relationTypes.${relationType}`;
    const relation = expectRecord(relationTypes[relationType], path);
    expectKeys(relation, path, ["exactPhrase", "suggestedPhrase"]);
    expectString(relation.exactPhrase, `${path}.exactPhrase`);
    expectString(relation.suggestedPhrase, `${path}.suggestedPhrase`);
  }
}

const familyIdSet = new Set<string>(FISCAL_NOTIFICATION_DOCUMENT_FAMILY_IDS_V3);
const wildcardSet = new Set<string>(AEAT_DOCUMENT_CHAIN_WILDCARDS_V1);
const relationTypeSet = new Set<string>(AEAT_DOCUMENT_RELATION_TYPE_IDS_V1);
const sourceIdSet = new Set<string>(AEAT_DOCUMENT_OFFICIAL_SOURCE_IDS_V1);

function validateChainNode(value: unknown, path: string): string {
  const node = expectString(value, path, 160);
  if (!familyIdSet.has(node) && !wildcardSet.has(node)) invalid(path);
  return node;
}

function validateDocumentChains(value: unknown): void {
  const chains = expectArray(value, "documentChains", 15, 15);
  const chainIds = new Set<string>();
  chains.forEach((chainValue, chainIndex) => {
    const path = `documentChains[${chainIndex}]`;
    const chain = expectRecord(chainValue, path);
    expectKeys(chain, path, ["id", "description", "nodes", "edges"]);
    const chainId = expectEnum(
      chain.id,
      AEAT_DOCUMENT_CHAIN_IDS_V1,
      `${path}.id`,
    );
    if (chainIds.has(chainId)) invalid(`${path}.id`);
    chainIds.add(chainId);
    expectString(chain.description, `${path}.description`);
    const nodes = expectArray(chain.nodes, `${path}.nodes`, 2, 100);
    const nodeIds = new Set<string>();
    nodes.forEach((node, nodeIndex) => {
      const nodePath = `${path}.nodes[${nodeIndex}]`;
      const nodeId = validateChainNode(node, nodePath);
      if (nodeIds.has(nodeId)) invalid(nodePath);
      nodeIds.add(nodeId);
    });
    const edges = expectArray(chain.edges, `${path}.edges`, 1, 200);
    const edgeIds = new Set<string>();
    edges.forEach((edgeValue, edgeIndex) => {
      const edgePath = `${path}.edges[${edgeIndex}]`;
      const edge = expectRecord(edgeValue, edgePath);
      expectKeys(edge, edgePath, ["from", "to", "relationType"]);
      const from = validateChainNode(edge.from, `${edgePath}.from`);
      const to = validateChainNode(edge.to, `${edgePath}.to`);
      const relationType = expectEnum(
        edge.relationType,
        AEAT_DOCUMENT_RELATION_TYPE_IDS_V1,
        `${edgePath}.relationType`,
      );
      if (!wildcardSet.has(from) && !nodeIds.has(from)) {
        invalid(`${edgePath}.from`);
      }
      if (!wildcardSet.has(to) && !nodeIds.has(to)) {
        invalid(`${edgePath}.to`);
      }
      if (from === to) invalid(`${edgePath}.to`);
      const edgeId = `${from}\u0000${relationType}\u0000${to}`;
      if (edgeIds.has(edgeId)) invalid(edgePath);
      edgeIds.add(edgeId);
    });
  });
}

function validateChainRole(value: unknown, path: string): void {
  const role = expectString(value, path, 321);
  const separator = role.indexOf(":");
  if (separator <= 0 || separator === role.length - 1) invalid(path);
  const prefix = role.slice(0, separator);
  const target = role.slice(separator + 1);
  if (!(CHAIN_ROLE_PREFIX_VALUES as readonly string[]).includes(prefix)) {
    invalid(path);
  }
  if (prefix === "RELATION") {
    if (!relationTypeSet.has(target)) invalid(path);
    return;
  }
  if (!familyIdSet.has(target) && !wildcardSet.has(target)) invalid(path);
}

function validateProfiles(value: unknown): void {
  const profiles = expectArray(value, "profiles", 87, 87);
  const profileIds = new Set<string>();
  profiles.forEach((profileValue, profileIndex) => {
    const path = `profiles[${profileIndex}]`;
    const profile = expectRecord(profileValue, path);
    expectKeys(profile, path, [
      "id",
      "nameEs",
      "category",
      "phase",
      "documentNature",
      "createsOrUpdatesDebt",
      "plainLanguage",
      "mustExtract",
      "officialSourceIds",
      "chainRole",
      "observedRealDocumentPatternsSanitized",
      "acceptanceTests",
      "highSensitivityFields",
      "assertionPolicy",
      "researchCoverage",
      "implementationPriority",
    ]);
    const id = expectIdentifier(profile.id, `${path}.id`, PROFILE_ID_PATTERN);
    if (!familyIdSet.has(id) || profileIds.has(id)) invalid(`${path}.id`);
    profileIds.add(id);
    expectString(profile.nameEs, `${path}.nameEs`);
    expectEnum(profile.category, CATEGORY_VALUES, `${path}.category`);
    expectEnum(profile.phase, PHASE_VALUES, `${path}.phase`);
    expectEnum(
      profile.documentNature,
      DOCUMENT_NATURE_VALUES,
      `${path}.documentNature`,
    );
    expectEnum(
      profile.createsOrUpdatesDebt,
      DEBT_EFFECT_VALUES,
      `${path}.createsOrUpdatesDebt`,
    );

    const plainLanguage = expectRecord(
      profile.plainLanguage,
      `${path}.plainLanguage`,
    );
    expectKeys(plainLanguage, `${path}.plainLanguage`, [
      "whatItIs",
      "whyReceived",
      "resultRule",
      "nextStepRule",
      "deadlineRule",
      "nonComplianceContext",
      "notProvenByThisDocument",
    ]);
    expectString(plainLanguage.whatItIs, `${path}.plainLanguage.whatItIs`);
    expectString(
      plainLanguage.whyReceived,
      `${path}.plainLanguage.whyReceived`,
    );
    expectString(plainLanguage.resultRule, `${path}.plainLanguage.resultRule`);
    expectString(
      plainLanguage.nextStepRule,
      `${path}.plainLanguage.nextStepRule`,
    );
    const deadlineRule = expectRecord(
      plainLanguage.deadlineRule,
      `${path}.plainLanguage.deadlineRule`,
    );
    expectKeys(deadlineRule, `${path}.plainLanguage.deadlineRule`, [
      "trigger",
      "text",
      "fallback",
    ]);
    if (deadlineRule.trigger !== null) {
      expectEnum(
        deadlineRule.trigger,
        DEADLINE_TRIGGER_VALUES,
        `${path}.plainLanguage.deadlineRule.trigger`,
      );
    }
    expectString(deadlineRule.text, `${path}.plainLanguage.deadlineRule.text`);
    expectString(
      deadlineRule.fallback,
      `${path}.plainLanguage.deadlineRule.fallback`,
    );
    expectStringArray(
      plainLanguage.nonComplianceContext,
      `${path}.plainLanguage.nonComplianceContext`,
      { minimum: 0, maximum: 20 },
    );
    expectStringArray(
      plainLanguage.notProvenByThisDocument,
      `${path}.plainLanguage.notProvenByThisDocument`,
      { minimum: 1, maximum: 20 },
    );

    const mustExtract = expectRecord(
      profile.mustExtract,
      `${path}.mustExtract`,
    );
    expectKeys(mustExtract, `${path}.mustExtract`, [
      "references",
      "dates",
      "money",
      "facts",
      "participantRoles",
    ]);
    expectStringArray(
      mustExtract.references,
      `${path}.mustExtract.references`,
      {
        minimum: 1,
        maximum: 50,
        allowed: REFERENCE_FIELD_VALUES,
      },
    );
    expectStringArray(mustExtract.dates, `${path}.mustExtract.dates`, {
      minimum: 1,
      maximum: 50,
      allowed: DATE_FIELD_VALUES,
    });
    expectStringArray(mustExtract.money, `${path}.mustExtract.money`, {
      minimum: 0,
      maximum: 50,
      allowed: MONEY_FIELD_VALUES,
    });
    expectStringArray(mustExtract.facts, `${path}.mustExtract.facts`, {
      minimum: 1,
      maximum: 60,
      allowed: FACT_FIELD_VALUES,
    });
    expectStringArray(
      mustExtract.participantRoles,
      `${path}.mustExtract.participantRoles`,
      { minimum: 1, maximum: 30, allowed: PARTICIPANT_ROLE_VALUES },
    );

    const sourceIds = expectStringArray(
      profile.officialSourceIds,
      `${path}.officialSourceIds`,
      {
        minimum: 1,
        maximum: 50,
        allowed: AEAT_DOCUMENT_OFFICIAL_SOURCE_IDS_V1,
      },
    );
    sourceIds.forEach((sourceId, sourceIndex) => {
      if (!sourceIdSet.has(sourceId)) {
        invalid(`${path}.officialSourceIds[${sourceIndex}]`);
      }
    });
    if (!sourceIds.includes("DOC_PRIMARY")) {
      invalid(`${path}.officialSourceIds`);
    }
    const chainRoles = expectStringArray(
      profile.chainRole,
      `${path}.chainRole`,
      {
        minimum: 0,
        maximum: 100,
      },
    );
    chainRoles.forEach((role, roleIndex) =>
      validateChainRole(role, `${path}.chainRole[${roleIndex}]`),
    );
    expectStringArray(
      profile.observedRealDocumentPatternsSanitized,
      `${path}.observedRealDocumentPatternsSanitized`,
      { minimum: 0, maximum: 30 },
    );

    const acceptance = expectRecord(
      profile.acceptanceTests,
      `${path}.acceptanceTests`,
    );
    expectKeys(acceptance, `${path}.acceptanceTests`, ["positive", "negative"]);
    expectStringArray(acceptance.positive, `${path}.acceptanceTests.positive`, {
      minimum: 1,
      maximum: 30,
    });
    expectStringArray(acceptance.negative, `${path}.acceptanceTests.negative`, {
      minimum: 1,
      maximum: 30,
    });
    expectStringArray(
      profile.highSensitivityFields,
      `${path}.highSensitivityFields`,
      { minimum: 0, maximum: 30, allowed: HIGH_SENSITIVITY_FIELD_VALUES },
    );

    const assertionPolicy = expectRecord(
      profile.assertionPolicy,
      `${path}.assertionPolicy`,
    );
    expectKeys(assertionPolicy, `${path}.assertionPolicy`, [
      "printed",
      "calculated",
      "context",
      "unproven",
    ]);
    expectLiteral(
      assertionPolicy.printed,
      "EXPLICIT_IN_DOCUMENT",
      `${path}.assertionPolicy.printed`,
    );
    expectLiteral(
      assertionPolicy.calculated,
      "CALCULATED_FROM_PRINTED_VALUES",
      `${path}.assertionPolicy.calculated`,
    );
    expectLiteral(
      assertionPolicy.context,
      "OFFICIAL_CONTEXT",
      `${path}.assertionPolicy.context`,
    );
    expectLiteral(
      assertionPolicy.unproven,
      "NOT_PROVEN_BY_DOCUMENT",
      `${path}.assertionPolicy.unproven`,
    );
    expectEnum(
      profile.researchCoverage,
      ["OFFICIAL_ONLY", "REAL_EXAMPLE_AND_OFFICIAL"] as const,
      `${path}.researchCoverage`,
    );
    expectEnum(
      profile.implementationPriority,
      ["P0", "P1", "P2"] as const,
      `${path}.implementationPriority`,
    );
  });

  for (const familyId of FISCAL_NOTIFICATION_DOCUMENT_FAMILY_IDS_V3) {
    if (!profileIds.has(familyId)) invalid("profiles");
  }
}

function cloneDefensively(
  value: unknown,
  seen = new Map<object, unknown>(),
): unknown {
  if (Array.isArray(value)) {
    const known = seen.get(value);
    if (known) return known;
    const clone: unknown[] = [];
    seen.set(value, clone);
    value.forEach((item) => clone.push(cloneDefensively(item, seen)));
    return clone;
  }
  if (value !== null && typeof value === "object") {
    const object = value as UnknownRecord;
    const known = seen.get(object);
    if (known) return known;
    const clone: UnknownRecord = {};
    seen.set(object, clone);
    Object.keys(object).forEach((key) => {
      clone[key] = cloneDefensively(object[key], seen);
    });
    return clone;
  }
  return value;
}

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (value !== null && typeof value === "object") {
    const object = value as object;
    if (seen.has(object)) return value;
    seen.add(object);
    Object.values(value as UnknownRecord).forEach((nested) =>
      deepFreeze(nested, seen),
    );
    Object.freeze(object);
  }
  return value;
}

export function parseAeatDocumentKnowledgeV1(
  input: unknown,
): AeatDocumentKnowledgeV1 {
  const root = expectRecord(
    snapshotJsonValue(input, "root", { nodes: 0 }),
    "root",
  );
  validateNoPersonalData(root);
  expectKeys(root, "root", [
    "meta",
    "globalPolicy",
    "realCorpusLearningsSanitized",
    "officialSources",
    "relationTypes",
    "documentChains",
    "profiles",
  ]);
  validateMeta(root.meta);
  validateGlobalPolicy(root.globalPolicy);
  validateCorpusLearnings(root.realCorpusLearningsSanitized);
  validateOfficialSources(root.officialSources);
  validateRelationTypes(root.relationTypes);
  validateDocumentChains(root.documentChains);
  validateProfiles(root.profiles);

  const clone = cloneDefensively(root) as UnknownRecord;
  const sources = clone.officialSources as UnknownRecord;
  for (const sourceId of AEAT_DOCUMENT_OFFICIAL_SOURCE_IDS_V1) {
    const source = sources[sourceId] as UnknownRecord;
    if (sourceId === "AEAT_NOTIFICATIONS") {
      // Preserve the supplied JSON byte-for-byte as research provenance while
      // exposing the current verified AEAT endpoint to runtime consumers.
      source.url = AEAT_NOTIFICATIONS_CANONICAL_URL_V1;
    }
    source.contextPolicy =
      sourceId === "DOC_PRIMARY" ? "DOCUMENT_PRIMARY" : "OFFICIAL_CONTEXT";
  }
  const profiles = clone.profiles as UnknownRecord[];
  profiles.forEach((profile) => {
    const chainRole = profile.chainRole as unknown[];
    const plainLanguage = profile.plainLanguage as UnknownRecord;
    const nonComplianceContext =
      plainLanguage.nonComplianceContext as unknown[];
    profile.relationPolicy =
      chainRole.length === 0
        ? "NO_AUTOMATIC_RELATION"
        : "DECLARED_CHAIN_ROLES_ONLY";
    profile.consequencePolicy =
      nonComplianceContext.length === 0
        ? "NOT_PROVEN_BY_DOCUMENT"
        : "DOCUMENTED_CONTEXT_ONLY";
    profile.extractorStatus = "NOT_IMPLEMENTED";
  });
  return deepFreeze(clone) as unknown as AeatDocumentKnowledgeV1;
}

export const AEAT_DOCUMENT_KNOWLEDGE_V1 = parseAeatDocumentKnowledgeV1(
  rawKnowledgePackage as unknown,
);
export const AEAT_DOCUMENT_PROFILES_V1 = AEAT_DOCUMENT_KNOWLEDGE_V1.profiles;
export const AEAT_DOCUMENT_PROFILE_IDS_V1 = Object.freeze(
  AEAT_DOCUMENT_PROFILES_V1.map((profile) => profile.id),
);
export const AEAT_DOCUMENT_OFFICIAL_SOURCES_V1 =
  AEAT_DOCUMENT_KNOWLEDGE_V1.officialSources;
export const AEAT_DOCUMENT_RELATION_TYPES_V1 =
  AEAT_DOCUMENT_KNOWLEDGE_V1.relationTypes;
export const AEAT_DOCUMENT_CHAINS_V1 =
  AEAT_DOCUMENT_KNOWLEDGE_V1.documentChains;

const profileById = new Map(
  AEAT_DOCUMENT_PROFILES_V1.map((profile) => [profile.id, profile] as const),
);

export function resolveAeatDocumentProfileV1(
  id: unknown,
): AeatDocumentProfileV1 | null {
  if (
    typeof id !== "string" ||
    id.length === 0 ||
    id.length > 160 ||
    CONTROL_CHARACTER_PATTERN.test(id)
  ) {
    return null;
  }
  return profileById.get(id as FiscalNotificationDocumentFamilyIdV3) ?? null;
}
