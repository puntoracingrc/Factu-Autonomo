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
import { MAXIMUM_PRIORITY_DEEP_MODEL_CODES } from "./priority-models";
import {
  REMAINING_DEEP_DOCUMENT_TYPES,
  REMAINING_DEEP_MODEL_CODES,
} from "./remaining-models";

export type ExtractorImplementationStatus =
  "DEEP_SUPPORTED" | "CLASSIFICATION_ONLY";

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
  "100": ["D_INCOME_TAX_REGIME"],
  "111": ["F_PROFESSIONALS", "F_OTHER_WITHHOLDING"],
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
  "303": [
    "E_VAT_REGIMES",
    "E_REVERSE_CHARGE",
    "I_EU_GOODS_SALES",
    "I_EU_GOODS_PURCHASES",
    "I_EU_SERVICES_SALES",
    "I_EU_SERVICES_PURCHASES",
  ],
  "308": ["E_SPECIAL_REFUND"],
  "309": ["E_REVERSE_CHARGE", "I_EU_GOODS_PURCHASES"],
  "341": ["E_SPECIAL_REFUND"],
  "347": ["K_THRESHOLD"],
  // Un 349 acredita operaciones del periodo, nunca el alta ROI actual.
  "349": [
    "I_EU_GOODS_SALES",
    "I_EU_GOODS_PURCHASES",
    "I_EU_SERVICES_SALES",
    "I_EU_SERVICES_PURCHASES",
  ],
  // Un 369 acredita operaciones OSS/IOSS, no la vigencia del registro.
  "369": ["J_EU_CONSUMERS"],
  "390": [
    "E_VAT_REGIMES",
    "I_EU_GOODS_SALES",
    "I_EU_GOODS_PURCHASES",
    "I_EU_SERVICES_SALES",
    "I_EU_SERVICES_PURCHASES",
  ],
  "714": ["M_WEALTH"],
  "720": ["M_FOREIGN_ASSETS"],
  "721": ["M_FOREIGN_CRYPTO"],
  "840": ["N_CHANGES"],
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

function priorityField(
  fieldId: string,
  semanticType: string,
  officialBoxNumber: string | null,
  possibleLabels: readonly string[],
  questionMappings: readonly string[],
  temporalScope: ExtractorFieldDefinition["temporalScope"] = "SPECIFIC_PERIOD",
  dataType: ExtractorFieldDefinition["dataType"] = "TEXT",
): ExtractorFieldDefinition {
  return {
    fieldId,
    semanticType,
    officialBoxNumber,
    possibleLabels,
    anchorLabels: possibleLabels,
    dataType,
    requiredForClassification: false,
    questionMappings,
    temporalScope,
    sensitive: false,
    retentionPolicy: "CONFIRMED_FACT_ONLY",
  };
}

const PRIORITY_FIELD_DEFINITIONS: Readonly<
  Partial<Record<TaxDocumentModelCode, readonly ExtractorFieldDefinition[]>>
> = {
  "100": [
    priorityField(
      "economicActivityMethod",
      "IRPF.METHOD",
      null,
      [
        "Estimación directa simplificada",
        "Estimación directa normal",
        "Estimación objetiva",
      ],
      ["D_INCOME_TAX_REGIME"],
      "TARGET_FISCAL_YEAR",
      "CODE",
    ),
  ],
  "035": [
    priorityField(
      "ossAction",
      "ECOMMERCE.OSS_IOSS_REGISTRATION.action",
      null,
      ["Causa de presentación", "Alta", "Modificación", "Baja"],
      ["J_OSS"],
    ),
    priorityField(
      "ossScheme",
      "ECOMMERCE.OSS_IOSS_REGISTRATION.scheme",
      null,
      [
        "Régimen de la Unión",
        "Régimen exterior de la Unión",
        "Régimen de importación",
      ],
      ["J_OSS"],
      "SPECIFIC_PERIOD",
      "CODE",
    ),
    priorityField(
      "effectiveDate",
      "ECOMMERCE.OSS_IOSS_REGISTRATION.effectiveDate",
      null,
      ["Fecha de efecto", "Fecha de inicio", "Fecha de baja"],
      ["J_OSS"],
      "SPECIFIC_PERIOD",
      "DATE",
    ),
  ],
  "111": [
    priorityField(
      "workRecipients",
      "WITHHOLDING.WORK_RECIPIENTS",
      "01/04",
      ["Rendimientos del trabajo", "N.º perceptores"],
      [],
      "SPECIFIC_PERIOD",
      "NUMBER",
    ),
    priorityField(
      "professionalRecipients",
      "WITHHOLDING.PROFESSIONAL_RECIPIENTS",
      "07/10",
      ["Actividades profesionales", "N.º perceptores"],
      ["F_PROFESSIONALS"],
      "SPECIFIC_PERIOD",
      "NUMBER",
    ),
    priorityField(
      "otherRecipients",
      "WITHHOLDING.OTHER_IRPF_RECIPIENTS",
      "13/16/19/22/25/28",
      ["Premios", "Ganancias patrimoniales", "Cesión de derechos de imagen"],
      ["F_OTHER_WITHHOLDING"],
      "SPECIFIC_PERIOD",
      "NUMBER",
    ),
  ],
  "115": [
    priorityField(
      "urbanRentWithholding",
      "WITHHOLDING.RENT",
      "01/02/03",
      ["Arrendamiento o subarrendamiento de inmuebles urbanos"],
      ["G_RENTS_PREMISES", "G_RENT_WITHHOLDING"],
    ),
  ],
  "123": [
    priorityField(
      "capitalIncomeWithholding",
      "WITHHOLDING.CAPITAL",
      "01/02/03",
      [
        "Número de perceptores",
        "Base de retenciones e ingresos a cuenta",
        "Retenciones e ingresos a cuenta",
      ],
      ["H_CAPITAL"],
      "SPECIFIC_PERIOD",
      "NUMBER",
    ),
  ],
  "130": [
    priorityField(
      "directEstimationPayment",
      "IRPF.PAYMENT_130",
      "01-19",
      ["Actividades económicas en estimación directa", "Pago fraccionado"],
      [],
    ),
  ],
  "131": [
    priorityField(
      "objectiveEstimationPayment",
      "IRPF.PAYMENT_131",
      null,
      ["Actividades económicas en estimación objetiva", "Pago fraccionado"],
      ["D_INCOME_TAX_REGIME"],
    ),
    priorityField(
      "objectiveEstimationMethod",
      "IRPF.METHOD",
      null,
      ["Estimación objetiva"],
      ["D_INCOME_TAX_REGIME"],
      "SPECIFIC_PERIOD",
      "CODE",
    ),
  ],
  "151": [
    priorityField(
      "specialExpatriateRegime",
      "PERSONAL.SPECIAL_ARTICLE_93",
      null,
      ["Régimen especial de personas desplazadas a España"],
      [],
      "TARGET_FISCAL_YEAR",
      "BOOLEAN",
    ),
  ],
  "180": [
    priorityField(
      "urbanRentWithholdingAnnual",
      "WITHHOLDING.RENT",
      "01/02/03",
      [
        "Número total de perceptores",
        "Base retenciones",
        "Retenciones e ingresos a cuenta",
      ],
      ["G_RENTS_PREMISES", "G_RENT_WITHHOLDING"],
      "TARGET_FISCAL_YEAR",
    ),
  ],
  "184": [
    priorityField(
      "entityActivity",
      "ENTITY.ATTRIBUTION_REQUIREMENT.economicActivity",
      null,
      ["Actividad económica", "Actividad desarrollada"],
      ["L_ATTRIBUTION_THRESHOLD"],
      "TARGET_FISCAL_YEAR",
      "BOOLEAN",
    ),
    priorityField(
      "attributedIncome",
      "ENTITY.ATTRIBUTION_REQUIREMENT.thresholdEvidence",
      null,
      [
        "Rentas obtenidas por la entidad",
        "Importe neto de la cifra de negocios",
      ],
      ["L_ATTRIBUTION_THRESHOLD"],
      "TARGET_FISCAL_YEAR",
      "NUMBER",
    ),
  ],
  "190": [
    priorityField(
      "recipientKeys",
      "WITHHOLDING.PERCEPTION_KEYS",
      null,
      ["Clave de percepción", "Subclave"],
      ["F_EMPLOYEES", "F_PROFESSIONALS", "F_OTHER_WITHHOLDING"],
      "TARGET_FISCAL_YEAR",
      "CODE",
    ),
  ],
  "193": [
    priorityField(
      "capitalIncomeRecords",
      "WITHHOLDING.CAPITAL",
      null,
      ["Clave de percepción", "Número total de perceptores"],
      ["H_CAPITAL"],
      "TARGET_FISCAL_YEAR",
      "TABLE",
    ),
  ],
  "200": [
    priorityField(
      "corporateTaxReturn",
      "COMPANY.CORPORATE_TAX",
      null,
      ["Impuesto sobre Sociedades", "Declaración"],
      [],
      "TARGET_FISCAL_YEAR",
      "BOOLEAN",
    ),
  ],
  "202": [
    priorityField(
      "companyInstallmentPayment",
      "COMPANY.INSTALLMENT_PAYMENT",
      null,
      ["Pago fraccionado", "Impuesto sobre Sociedades"],
      ["L_COMPANY_INSTALLMENTS"],
      "SPECIFIC_PERIOD",
      "BOOLEAN",
    ),
  ],
  "216": [
    priorityField(
      "nonResidentIncomeWithholding",
      "WITHHOLDING.NON_RESIDENTS",
      "05-21",
      [
        "Número de rentas",
        "Base de retenciones e ingresos a cuenta",
        "Retenciones e ingresos a cuenta",
      ],
      ["H_NON_RESIDENT", "H_NON_RESIDENT_CONFIRMED"],
      "SPECIFIC_PERIOD",
      "NUMBER",
    ),
  ],
  "296": [
    priorityField(
      "nonResidentRecipientRecords",
      "WITHHOLDING.NON_RESIDENTS",
      null,
      ["Clave de renta", "Número total de perceptores"],
      ["H_NON_RESIDENT", "H_NON_RESIDENT_CONFIRMED"],
      "TARGET_FISCAL_YEAR",
      "TABLE",
    ),
  ],
  "303": [
    priorityField(
      "vatRegimes",
      "VAT.REGIMES",
      null,
      ["Régimen general", "Régimen simplificado", "Recargo de equivalencia"],
      ["E_VAT_REGIMES"],
      "SPECIFIC_PERIOD",
      "CODE",
    ),
    priorityField(
      "reverseCharge",
      "VAT.REVERSE_CHARGE",
      "12/13/125",
      ["Operaciones con inversión del sujeto pasivo"],
      ["E_REVERSE_CHARGE"],
      "SPECIFIC_PERIOD",
      "NUMBER",
    ),
    priorityField(
      "euOperations",
      "EU.OPERATIONS",
      "10/11",
      [
        "Adquisiciones intracomunitarias de bienes",
        "Entregas intracomunitarias de bienes",
        "Prestaciones intracomunitarias de servicios",
        "Adquisiciones intracomunitarias de servicios",
      ],
      [
        "I_EU_GOODS_SALES",
        "I_EU_GOODS_PURCHASES",
        "I_EU_SERVICES_SALES",
        "I_EU_SERVICES_PURCHASES",
      ],
      "SPECIFIC_PERIOD",
      "NUMBER",
    ),
  ],
  "308": [
    priorityField(
      "specialVatRefund",
      "VAT.SPECIAL_REFUND",
      null,
      [
        "Importe de la devolución solicitada",
        "Cantidad cuya devolución se solicita",
      ],
      ["E_SPECIAL_REFUND"],
      "SPECIFIC_PERIOD",
      "NUMBER",
    ),
  ],
  "309": [
    priorityField(
      "specialVatOperation",
      "VAT.REVERSE_CHARGE",
      null,
      [
        "Operaciones con inversión del sujeto pasivo",
        "Adquisiciones intracomunitarias de bienes",
      ],
      ["E_REVERSE_CHARGE", "I_EU_GOODS_PURCHASES"],
      "SPECIFIC_PERIOD",
      "NUMBER",
    ),
  ],
  "341": [
    priorityField(
      "agricultureCompensationRefund",
      "VAT.SPECIAL_REFUND",
      "01-10",
      ["Importe de las compensaciones", "Importe a reintegrar"],
      ["E_SPECIAL_REFUND"],
      "SPECIFIC_PERIOD",
      "NUMBER",
    ),
  ],
  "347": [
    priorityField(
      "thirdPartyAnnualRecord",
      "THIRD_PARTIES.MODEL_347_CANDIDATE",
      null,
      [
        "Clave de operación",
        "Importe anual de las operaciones",
        "Número de declarados",
      ],
      ["K_THRESHOLD"],
      "TARGET_FISCAL_YEAR",
      "TABLE",
    ),
  ],
  "349": [
    priorityField(
      "euOperationKeys",
      "EU.OPERATIONS.keys",
      null,
      ["Clave de operación", "Tipo de operación"],
      [
        "I_EU_GOODS_SALES",
        "I_EU_GOODS_PURCHASES",
        "I_EU_SERVICES_SALES",
        "I_EU_SERVICES_PURCHASES",
      ],
      "SPECIFIC_PERIOD",
      "CODE",
    ),
  ],
  "369": [
    priorityField(
      "ossOperations",
      "ECOMMERCE.OSS_IOSS_OPERATIONS",
      null,
      [
        "Estado miembro de consumo",
        "Régimen de la Unión",
        "Régimen de importación",
      ],
      ["J_EU_CONSUMERS"],
    ),
  ],
  "390": [
    priorityField(
      "vatRegimesAnnual",
      "VAT.REGIMES",
      null,
      ["Régimen general", "Régimen simplificado", "Recargo de equivalencia"],
      ["E_VAT_REGIMES"],
      "TARGET_FISCAL_YEAR",
      "CODE",
    ),
    priorityField(
      "annualVatFactors",
      "VAT.MODEL_390_FACTORS",
      null,
      [
        "Volumen de operaciones",
        "Operaciones intracomunitarias",
        "Operaciones exentas",
        "Operaciones no sujetas",
      ],
      [],
      "TARGET_FISCAL_YEAR",
      "TABLE",
    ),
  ],
  "714": [
    priorityField(
      "wealthTaxReturn",
      "PERSONAL.WEALTH_TAX",
      null,
      ["Impuesto sobre el Patrimonio"],
      ["M_WEALTH"],
      "TARGET_FISCAL_YEAR",
      "BOOLEAN",
    ),
  ],
  "720": [
    priorityField(
      "foreignAssetCategories",
      "PERSONAL.FOREIGN_ASSETS",
      null,
      ["Clave tipo de bien", "Número de bienes o derechos"],
      ["M_FOREIGN_ASSETS"],
      "TARGET_FISCAL_YEAR",
      "CODE",
    ),
  ],
  "721": [
    priorityField(
      "foreignVirtualCurrencyRecords",
      "PERSONAL.FOREIGN_CRYPTO",
      null,
      ["Denominación de la moneda virtual", "Número de registros"],
      ["M_FOREIGN_CRYPTO"],
      "TARGET_FISCAL_YEAR",
      "TABLE",
    ),
  ],
  "840": [
    priorityField(
      "iaeEvent",
      "IAE.EVENT",
      null,
      ["Alta", "Variación", "Baja", "Epígrafe", "Fecha de efecto"],
      ["N_CHANGES"],
      "SPECIFIC_PERIOD",
      "TABLE",
    ),
  ],
};

const PRIORITY_TABLE_DEFINITIONS: Readonly<
  Partial<Record<TaxDocumentModelCode, readonly string[]>>
> = {
  "111": ["withholding-sections-by-income-kind"],
  "131": ["objective-estimation-activities"],
  "180": ["landlords-and-properties"],
  "184": ["entity-income-and-members"],
  "190": ["recipients-by-key-and-subkey"],
  "193": ["capital-income-recipients-by-key"],
  "296": ["non-resident-recipients-by-income-key"],
  "303": ["general-and-simplified-vat-sections"],
  "347": ["third-parties-by-operation-key-and-annual-amount"],
  "349": ["eu-counterparties-by-operation-key"],
  "369": ["member-states-of-consumption"],
  "390": ["annual-vat-sections-and-activities"],
  "720": ["foreign-assets-by-category"],
  "721": ["foreign-virtual-currency-records"],
};

function modelDefinition(code: TaxDocumentModelCode): ExtractorDefinition {
  const metadata = MODEL_METADATA.get(code as AeatSupportedTaxFormCode) as
    AeatTaxFormStructure | undefined;
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
    extractorId: `aeat.model.${code}.v2`,
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
    fieldDefinitions:
      PRIORITY_FIELD_DEFINITIONS[code] ??
      genericFieldDefinitions(extractableFacts, questionMappings),
    tableDefinitions: isCensusModel
      ? ["activities", "members"]
      : (PRIORITY_TABLE_DEFINITIONS[code] ?? []),
    codebooks: [
      "model-version-by-fiscal-year",
      ...(code === "190" ? ["aeat-model-190-keys.2025.v1"] : []),
      ...(code === "349" ? ["aeat-model-349-operation-keys.2025-2026.v1"] : []),
    ],
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
    sourceHash: `aeat-model-${code}-2026-07-v2`,
    implementationStatus:
      isCensusModel ||
      (MAXIMUM_PRIORITY_DEEP_MODEL_CODES as readonly string[]).includes(code) ||
      (REMAINING_DEEP_MODEL_CODES as readonly string[]).includes(code)
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
      SUPPORTING_SOURCE_BY_TYPE.get("INTRACOMMUNITY_OPERATOR_CERTIFICATE") ??
      "",
    implementationStatus: (
      REMAINING_DEEP_DOCUMENT_TYPES as readonly string[]
    ).includes("ROI_CERTIFICATE")
      ? "DEEP_SUPPORTED"
      : "CLASSIFICATION_ONLY",
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
    implementationStatus: (
      REMAINING_DEEP_DOCUMENT_TYPES as readonly string[]
    ).includes("LANDLORD_WITHHOLDING_EXEMPTION_CERTIFICATE")
      ? "DEEP_SUPPORTED"
      : "CLASSIFICATION_ONLY",
  },
};

const UNNUMBERED_FIELD_DEFINITIONS: Readonly<
  Partial<
    Record<
      (typeof UNNUMBERED_FISCAL_DOCUMENT_TYPES)[number],
      readonly ExtractorFieldDefinition[]
    >
  >
> = {
  ROI_CERTIFICATE: [
    priorityField(
      "roiRegistration",
      "EU.ROI",
      null,
      [
        "Registro de Operadores Intracomunitarios",
        "Consta inscrito",
        "Figura incluido",
      ],
      ["I_ROI"],
      "CURRENT_AS_OF_DATE",
      "BOOLEAN",
    ),
  ],
  LANDLORD_WITHHOLDING_EXEMPTION_CERTIFICATE: [
    priorityField(
      "landlordWithholdingExemption",
      "WITHHOLDING.RENT_EXEMPTION",
      null,
      ["Exoneración de retención", "Exoneración de la obligación de retener"],
      ["G_LANDLORD_EXEMPTION"],
      "CURRENT_AS_OF_DATE",
      "BOOLEAN",
    ),
  ],
};

function unnumberedDefinition(
  type: (typeof UNNUMBERED_FISCAL_DOCUMENT_TYPES)[number],
): ExtractorDefinition {
  const metadata = UNNUMBERED_METADATA[type];
  return {
    extractorId: `${metadata.authority.toLowerCase()}.${type.toLowerCase()}.v2`,
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
    fieldDefinitions: UNNUMBERED_FIELD_DEFINITIONS[type] ?? [],
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
    sourceHash: `${type.toLowerCase()}-2026-07-v2`,
    implementationStatus: metadata.implementationStatus,
  };
}

export const FISCAL_DOCUMENT_EXTRACTOR_REGISTRY: readonly ExtractorDefinition[] =
  [
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
