import {
  AEAT_TAX_FORM_STRUCTURES,
  type AeatSupportedTaxFormCode,
  type AeatTaxFormStructure,
} from "@/lib/fiscal-profile/aeat-tax-form";
import { SUPPORTING_DOCUMENT_STRUCTURES } from "@/lib/fiscal-profile/supporting-document";
import {
  FISCAL_DOCUMENT_EXTRACTOR_CATALOG_VERSION,
  type DocumentAuthority,
  type DocumentTerritory,
  type FiscalDocumentType,
  type TaxDocumentModelCode,
  TAX_DOCUMENT_MODEL_CODES,
  UNNUMBERED_FISCAL_DOCUMENT_TYPES,
} from "./contracts";

export type ExtractorImplementationStatus =
  | "DEEP_SUPPORTED"
  | "CLASSIFICATION_ONLY";

export interface ExtractorFieldDefinition {
  fieldId: string;
  semanticType: string;
  officialBoxNumber: string | null;
  possibleLabels: readonly string[];
  anchorLabels: readonly string[];
  dataType: "TEXT" | "DATE" | "NUMBER" | "BOOLEAN" | "CODE" | "TABLE";
  requiredForClassification: boolean;
  questionMappings: readonly string[];
  temporalScope:
    | "CURRENT_AS_OF_DATE"
    | "TARGET_FISCAL_YEAR"
    | "SPECIFIC_PERIOD"
    | "HISTORICAL";
  sensitive: boolean;
  retentionPolicy: "EPHEMERAL" | "CONFIRMED_FACT_ONLY";
}

export interface ExtractorDefinition {
  extractorId: string;
  catalogVersion: typeof FISCAL_DOCUMENT_EXTRACTOR_CATALOG_VERSION;
  authority: DocumentAuthority;
  territory: DocumentTerritory;
  model: TaxDocumentModelCode | null;
  documentTypes: readonly FiscalDocumentType[];
  validFrom: string | null;
  validTo: string | null;
  fiscalYears: readonly number[];
  supportedFormats: readonly ("PDF" | "IMAGE" | "TXT" | "XML" | "JSON")[];
  detectors: readonly string[];
  pageDefinitions: readonly string[];
  fieldDefinitions: readonly ExtractorFieldDefinition[];
  tableDefinitions: readonly string[];
  codebooks: readonly string[];
  normalizers: readonly string[];
  validators: readonly string[];
  crossValidators: readonly string[];
  questionMappings: readonly string[];
  confidencePolicy: "STRICT_EXPLICIT_FIELD";
  recencyPolicy: "CURRENT_SNAPSHOT" | "CENSUS_EVENT" | "PERIOD_ONLY";
  privacyPolicy: "LOCAL_EPHEMERAL_CONFIRMED_FACTS_ONLY";
  officialSources: readonly string[];
  lastReviewedAt: string;
  sourceHash: string;
  implementationStatus: ExtractorImplementationStatus;
}

const QUESTION_MAPPINGS: Readonly<
  Partial<Record<TaxDocumentModelCode, readonly string[]>>
> = {
  "035": ["J_OSS"],
  "036": [
    "A_INVOICING_SUBJECT",
    "B_TERRITORY",
    "C_ACTIVITY_KINDS",
    "D_INCOME_TAX_REGIME",
    "E_VAT_REGIMES",
    "I_ROI",
    "N_CHANGES",
  ],
  "037": [
    "A_INVOICING_SUBJECT",
    "B_TERRITORY",
    "C_ACTIVITY_KINDS",
    "D_INCOME_TAX_REGIME",
    "E_VAT_REGIMES",
  ],
  "111": ["F_EMPLOYEES", "F_PROFESSIONALS", "F_OTHER_WITHHOLDING"],
  "115": ["G_RENTS_PREMISES", "G_RENT_WITHHOLDING"],
  "123": ["H_CAPITAL"],
  "131": ["D_INCOME_TAX_REGIME"],
  "151": [],
  "180": ["G_RENTS_PREMISES", "G_RENT_WITHHOLDING"],
  "184": ["L_ATTRIBUTION_THRESHOLD"],
  "190": ["F_EMPLOYEES", "F_PROFESSIONALS", "F_OTHER_WITHHOLDING"],
  "193": ["H_CAPITAL"],
  "202": ["L_COMPANY_INSTALLMENTS"],
  "216": ["H_NON_RESIDENT", "H_NON_RESIDENT_CONFIRMED"],
  "296": ["H_NON_RESIDENT", "H_NON_RESIDENT_CONFIRMED"],
  "303": ["E_VAT_REGIMES", "E_REVERSE_CHARGE"],
  "308": ["E_SPECIAL_REFUND"],
  "309": ["E_REVERSE_CHARGE"],
  "341": ["E_SPECIAL_REFUND"],
  "347": ["K_THRESHOLD", "K_ALL_EXCLUDED"],
  // Un 349 acredita operaciones del periodo, nunca el alta ROI actual.
  "349": [
    "I_EU_GOODS_SALES",
    "I_EU_GOODS_PURCHASES",
    "I_EU_SERVICES_SALES",
    "I_EU_SERVICES_PURCHASES",
  ],
  // Un 369 acredita operaciones OSS/IOSS, no la vigencia del registro.
  "369": ["J_EU_CONSUMERS"],
  "390": ["E_VAT_REGIMES", "E_390_EXEMPT"],
  "714": ["M_WEALTH"],
  "720": ["M_FOREIGN_ASSETS"],
  "721": ["M_FOREIGN_CRYPTO"],
  "840": ["C_ACTIVITY_KINDS", "N_CHANGES"],
};

const AEAT_PROCEDURE_036 =
  "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G322.shtml";

const MODEL_METADATA = new Map(
  AEAT_TAX_FORM_STRUCTURES.map((definition) => [definition.code, definition]),
);

function genericFieldDefinitions(
  extractableFacts: readonly string[],
  questionMappings: readonly string[],
): readonly ExtractorFieldDefinition[] {
  return extractableFacts.map((fieldId) => ({
    fieldId,
    semanticType: fieldId,
    officialBoxNumber: null,
    possibleLabels: [],
    anchorLabels: [],
    dataType: "TEXT" as const,
    requiredForClassification: false,
    questionMappings,
    temporalScope: "SPECIFIC_PERIOD" as const,
    sensitive: /nif|name|address|account|recipient/i.test(fieldId),
    retentionPolicy: "CONFIRMED_FACT_ONLY" as const,
  }));
}

function modelDefinition(code: TaxDocumentModelCode): ExtractorDefinition {
  const metadata = MODEL_METADATA.get(
    code as AeatSupportedTaxFormCode,
  ) as AeatTaxFormStructure | undefined;
  const isCensusModel = code === "036" || code === "037";
  const extractableFacts = metadata?.extractableFacts ?? [
    "identity",
    "censusCause",
    "activities",
    "incomeTaxRegime",
    "vatRegimes",
    "withholdingRegistrations",
    "effectiveDates",
  ];
  const questionMappings = QUESTION_MAPPINGS[code] ?? [];
  return {
    extractorId: `aeat.model.${code}.v1`,
    catalogVersion: FISCAL_DOCUMENT_EXTRACTOR_CATALOG_VERSION,
    authority: "AEAT",
    territory: "ES_COMMON",
    model: code,
    documentTypes: [`MODEL_${code}`],
    validFrom: code === "037" ? "2007-01-01" : null,
    validTo: code === "037" ? "2025-02-02" : null,
    fiscalYears: code === "037" ? [2007, 2025] : [2025, 2026],
    supportedFormats: ["PDF", "IMAGE", "TXT"],
    detectors: metadata
      ? [
          `MODELO ${code}`,
          ...metadata.requiredPhrases,
          ...(metadata.requiredAnyPhraseGroups?.flat() ?? []),
        ]
      : [`MODELO ${code}`, "DECLARACION CENSAL"],
    pageDefinitions: isCensusModel
      ? ["cause", "identity", "activities", "vat", "direct-tax", "withholdings"]
      : [],
    fieldDefinitions: genericFieldDefinitions(
      extractableFacts,
      questionMappings,
    ),
    tableDefinitions: isCensusModel ? ["activities", "members"] : [],
    codebooks: ["model-version-by-fiscal-year"],
    normalizers: ["spanish-date", "spanish-number", "model-code"],
    validators: [
      "authority",
      "model",
      "period",
      "page-completeness",
      "filing-status",
    ],
    crossValidators: [],
    questionMappings,
    confidencePolicy: "STRICT_EXPLICIT_FIELD",
    recencyPolicy: isCensusModel ? "CENSUS_EVENT" : "PERIOD_ONLY",
    privacyPolicy: "LOCAL_EPHEMERAL_CONFIRMED_FACTS_ONLY",
    officialSources: [metadata?.officialProcedureUrl ?? AEAT_PROCEDURE_036],
    lastReviewedAt: "2026-07-14",
    sourceHash: `aeat-model-${code}-2026-07-v1`,
    implementationStatus: isCensusModel
      ? "DEEP_SUPPORTED"
      : "CLASSIFICATION_ONLY",
  };
}

const SUPPORTING_SOURCE_BY_TYPE = new Map(
  SUPPORTING_DOCUMENT_STRUCTURES.map((definition) => [
    definition.documentType,
    definition.officialInformationUrl,
  ]),
);

const UNNUMBERED_METADATA: Readonly<
  Record<
    (typeof UNNUMBERED_FISCAL_DOCUMENT_TYPES)[number],
    {
      authority: DocumentAuthority;
      detectors: readonly string[];
      questionMappings: readonly string[];
      recencyPolicy: ExtractorDefinition["recencyPolicy"];
      officialSource: string;
      implementationStatus: ExtractorImplementationStatus;
    }
  >
> = {
  CURRENT_CENSUS_CERTIFICATE: {
    authority: "AEAT",
    detectors: ["CERTIFICADO DE SITUACION CENSAL"],
    questionMappings: [
      "A_INVOICING_SUBJECT",
      "B_TERRITORY",
      "C_ACTIVITY_KINDS",
      "D_INCOME_TAX_REGIME",
      "E_VAT_REGIMES",
      "N_CENSUS_OBLIGATIONS",
      "N_CENSUS_REVIEWED",
    ],
    recencyPolicy: "CURRENT_SNAPSHOT",
    officialSource:
      "https://sede.agenciatributaria.gob.es/Sede/certificaciones/censales/certificados-tributarios-situacion-censal.html",
    implementationStatus: "DEEP_SUPPORTED",
  },
  AEAT_ECONOMIC_ACTIVITIES_VIEW: {
    authority: "AEAT",
    detectors: [
      "RELACION DE ACTIVIDADES",
      "CENSO DE ACTIVIDADES Y LOCALES",
      "DETALLE DE UN NUMERO DE REFERENCIA",
    ],
    questionMappings: ["B_START_DATE", "C_ACTIVITY_KINDS"],
    recencyPolicy: "CURRENT_SNAPSHOT",
    officialSource:
      "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/otros-servicios-ayuda-tecnica/datos-censales.html",
    implementationStatus: "DEEP_SUPPORTED",
  },
  AEAT_TAX_STATUS_VIEW: {
    authority: "AEAT",
    detectors: ["SITUACION TRIBUTARIA", "REGIMENES APLICABLES"],
    questionMappings: ["D_INCOME_TAX_REGIME", "E_VAT_REGIMES", "I_ROI"],
    recencyPolicy: "CURRENT_SNAPSHOT",
    officialSource:
      "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/otros-servicios-ayuda-tecnica/datos-censales.html",
    implementationStatus: "DEEP_SUPPORTED",
  },
  AEAT_OBLIGATIONS_VIEW: {
    authority: "AEAT",
    detectors: ["OBLIGACIONES TRIBUTARIAS", "DESCRIPCION DE LA OBLIGACION"],
    questionMappings: ["N_CENSUS_OBLIGATIONS", "N_CENSUS_REVIEWED"],
    recencyPolicy: "CURRENT_SNAPSHOT",
    officialSource:
      "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/otros-servicios-ayuda-tecnica/datos-censales.html",
    implementationStatus: "DEEP_SUPPORTED",
  },
  TGSS_CURRENT_STATUS_REPORT: {
    authority: "TGSS",
    detectors: ["INFORME DE SITUACION ACTUAL DEL TRABAJADOR"],
    questionMappings: ["B_RETA"],
    recencyPolicy: "CURRENT_SNAPSHOT",
    officialSource:
      SUPPORTING_SOURCE_BY_TYPE.get("RETA_CURRENT_STATUS_REPORT") ?? "",
    implementationStatus: "DEEP_SUPPORTED",
  },
  TGSS_EMPLOYMENT_HISTORY: {
    authority: "TGSS",
    detectors: ["INFORME DE VIDA LABORAL", "VIDA LABORAL"],
    questionMappings: ["B_RETA"],
    recencyPolicy: "PERIOD_ONLY",
    officialSource: SUPPORTING_SOURCE_BY_TYPE.get("WORK_LIFE_REPORT") ?? "",
    implementationStatus: "DEEP_SUPPORTED",
  },
  TGSS_SELF_EMPLOYED_ACTIVITIES: {
    authority: "TGSS",
    detectors: ["INFORME DE ACTIVIDADES DE TRABAJO AUTONOMO"],
    questionMappings: ["B_RETA", "C_ACTIVITY_KINDS"],
    recencyPolicy: "CURRENT_SNAPSHOT",
    officialSource:
      SUPPORTING_SOURCE_BY_TYPE.get("SELF_EMPLOYED_ACTIVITY_REPORT") ?? "",
    implementationStatus: "DEEP_SUPPORTED",
  },
  ROI_CERTIFICATE: {
    authority: "AEAT",
    detectors: ["CERTIFICADO TRIBUTARIO", "OPERADORES INTRACOMUNITARIOS"],
    questionMappings: ["I_ROI"],
    recencyPolicy: "CURRENT_SNAPSHOT",
    officialSource:
      SUPPORTING_SOURCE_BY_TYPE.get("INTRACOMMUNITY_OPERATOR_CERTIFICATE") ?? "",
    implementationStatus: "CLASSIFICATION_ONLY",
  },
  LANDLORD_WITHHOLDING_EXEMPTION_CERTIFICATE: {
    authority: "AEAT",
    detectors: ["CERTIFICADO TRIBUTARIO", "EXONERACION DE RETENCION"],
    questionMappings: ["G_LANDLORD_EXEMPTION"],
    recencyPolicy: "CURRENT_SNAPSHOT",
    officialSource:
      SUPPORTING_SOURCE_BY_TYPE.get(
        "LANDLORD_WITHHOLDING_EXEMPTION_CERTIFICATE",
      ) ?? "",
    implementationStatus: "CLASSIFICATION_ONLY",
  },
};

function unnumberedDefinition(
  type: (typeof UNNUMBERED_FISCAL_DOCUMENT_TYPES)[number],
): ExtractorDefinition {
  const metadata = UNNUMBERED_METADATA[type];
  return {
    extractorId: `${metadata.authority.toLowerCase()}.${type.toLowerCase()}.v1`,
    catalogVersion: FISCAL_DOCUMENT_EXTRACTOR_CATALOG_VERSION,
    authority: metadata.authority,
    territory: "ES_COMMON",
    model: null,
    documentTypes: [type],
    validFrom: null,
    validTo: null,
    fiscalYears: [2025, 2026],
    supportedFormats: ["PDF", "IMAGE", "TXT"],
    detectors: metadata.detectors,
    pageDefinitions: [],
    fieldDefinitions: [],
    tableDefinitions: [],
    codebooks: [],
    normalizers: ["spanish-date", "model-code"],
    validators: ["authority", "page-completeness", "temporal-scope"],
    crossValidators: [],
    questionMappings: metadata.questionMappings,
    confidencePolicy: "STRICT_EXPLICIT_FIELD",
    recencyPolicy: metadata.recencyPolicy,
    privacyPolicy: "LOCAL_EPHEMERAL_CONFIRMED_FACTS_ONLY",
    officialSources: [metadata.officialSource].filter(Boolean),
    lastReviewedAt: "2026-07-14",
    sourceHash: `${type.toLowerCase()}-2026-07-v1`,
    implementationStatus: metadata.implementationStatus,
  };
}

export const FISCAL_DOCUMENT_EXTRACTOR_REGISTRY: readonly ExtractorDefinition[] = [
  ...TAX_DOCUMENT_MODEL_CODES.map(modelDefinition),
  ...UNNUMBERED_FISCAL_DOCUMENT_TYPES.map(unnumberedDefinition),
];

export function getExtractorDefinition(
  documentType: FiscalDocumentType,
): ExtractorDefinition | undefined {
  return FISCAL_DOCUMENT_EXTRACTOR_REGISTRY.find((definition) =>
    definition.documentTypes.includes(documentType),
  );
}
