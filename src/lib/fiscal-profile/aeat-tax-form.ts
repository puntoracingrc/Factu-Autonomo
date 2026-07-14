export const AEAT_TAX_FORM_CATALOG_VERSION =
  "aeat-tax-form-catalog.2026-07.v1" as const;

export const AEAT_SUPPORTED_TAX_FORM_CODES = [
  "035",
  "100",
  "111",
  "115",
  "123",
  "130",
  "131",
  "151",
  "180",
  "184",
  "190",
  "193",
  "200",
  "202",
  "216",
  "296",
  "303",
  "308",
  "309",
  "341",
  "347",
  "349",
  "369",
  "390",
  "714",
  "720",
  "721",
  "840",
] as const;

export type AeatSupportedTaxFormCode =
  (typeof AEAT_SUPPORTED_TAX_FORM_CODES)[number];
export type AeatDocumentPriority = "MAXIMUM" | "SECONDARY" | "SPECIAL";
export type AeatTaxFormPeriodicity =
  | "PERIODIC"
  | "ANNUAL"
  | "EVENT_DRIVEN";

export interface AeatTaxFormStructure {
  code: AeatSupportedTaxFormCode;
  label: string;
  priority: AeatDocumentPriority;
  periodicity: AeatTaxFormPeriodicity;
  officialProcedureUrl: string;
  requiredPhrases: readonly string[];
  requiredAnyPhraseGroups?: readonly (readonly string[])[];
  extractableFacts: readonly string[];
}

const AEAT_PROCEDURE = "https://sede.agenciatributaria.gob.es/Sede/procedimientoini";

/**
 * Registro cerrado de formularios. Las frases están normalizadas y proceden
 * de los títulos o apartados estructurales oficiales; una simple mención al
 * número de modelo nunca basta para reconocer un documento.
 */
export const AEAT_TAX_FORM_STRUCTURES = [
  {
    code: "035",
    label: "Alta, modificación o baja en OSS/IOSS",
    priority: "MAXIMUM",
    periodicity: "EVENT_DRIVEN",
    officialProcedureUrl: `${AEAT_PROCEDURE}/G333.shtml`,
    requiredPhrases: ["REGISTRO CENSAL", "REGIMENES ESPECIALES"],
    requiredAnyPhraseGroups: [["OSS", "VENTANILLA UNICA", "ONE STOP SHOP"]],
    extractableFacts: ["ossAction", "ossScheme", "effectiveDate"],
  },
  {
    code: "100",
    label: "Declaración anual del IRPF",
    priority: "SECONDARY",
    periodicity: "ANNUAL",
    officialProcedureUrl: `${AEAT_PROCEDURE}/G229.shtml`,
    requiredPhrases: ["IMPUESTO SOBRE LA RENTA DE LAS PERSONAS FISICAS"],
    requiredAnyPhraseGroups: [["DECLARACION", "RENTA WEB"]],
    extractableFacts: ["taxYear", "filingStatus", "economicActivitySections"],
  },
  {
    code: "111",
    label: "Retenciones de trabajadores y profesionales",
    priority: "MAXIMUM",
    periodicity: "PERIODIC",
    officialProcedureUrl: `${AEAT_PROCEDURE}/GH01.shtml`,
    requiredPhrases: ["RETENCIONES E INGRESOS A CUENTA"],
    requiredAnyPhraseGroups: [["RENDIMIENTOS DEL TRABAJO", "ACTIVIDADES ECONOMICAS"]],
    extractableFacts: ["taxYear", "period", "workRecipients", "professionalRecipients", "otherRecipients"],
  },
  {
    code: "115",
    label: "Retenciones por alquiler de inmuebles urbanos",
    priority: "MAXIMUM",
    periodicity: "PERIODIC",
    officialProcedureUrl: `${AEAT_PROCEDURE}/GH02.shtml`,
    requiredPhrases: ["RETENCIONES E INGRESOS A CUENTA"],
    requiredAnyPhraseGroups: [["ARRENDAMIENTO", "INMUEBLES URBANOS"]],
    extractableFacts: ["taxYear", "period", "receiptNumber", "urbanRentWithholding"],
  },
  {
    code: "123",
    label: "Retenciones sobre determinadas rentas de capital",
    priority: "SECONDARY",
    periodicity: "PERIODIC",
    officialProcedureUrl: `${AEAT_PROCEDURE}/GH04.shtml`,
    requiredPhrases: ["RETENCIONES E INGRESOS A CUENTA", "CAPITAL MOBILIARIO"],
    extractableFacts: ["taxYear", "period", "capitalIncomeWithholding"],
  },
  {
    code: "130",
    label: "Pagos fraccionados en estimación directa",
    priority: "MAXIMUM",
    periodicity: "PERIODIC",
    officialProcedureUrl: `${AEAT_PROCEDURE}/G601.shtml`,
    requiredPhrases: ["PAGO FRACCIONADO", "ESTIMACION DIRECTA"],
    extractableFacts: ["taxYear", "period", "directEstimationPayment"],
  },
  {
    code: "131",
    label: "Pagos fraccionados en estimación objetiva",
    priority: "MAXIMUM",
    periodicity: "PERIODIC",
    officialProcedureUrl: `${AEAT_PROCEDURE}/G602.shtml`,
    requiredPhrases: ["PAGO FRACCIONADO", "ESTIMACION OBJETIVA"],
    extractableFacts: ["taxYear", "period", "objectiveEstimationPayment"],
  },
  {
    code: "151",
    label: "Régimen especial de personas desplazadas a España",
    priority: "SPECIAL",
    periodicity: "ANNUAL",
    officialProcedureUrl: `${AEAT_PROCEDURE}/G615.shtml`,
    requiredPhrases: ["REGIMEN ESPECIAL"],
    requiredAnyPhraseGroups: [["TRABAJADORES DESPLAZADOS", "PERSONAS DESPLAZADAS"]],
    extractableFacts: ["taxYear", "specialExpatriateRegime", "filingStatus"],
  },
  {
    code: "180",
    label: "Resumen anual de alquileres",
    priority: "MAXIMUM",
    periodicity: "ANNUAL",
    officialProcedureUrl: `${AEAT_PROCEDURE}/GI00.shtml`,
    requiredPhrases: ["RESUMEN ANUAL"],
    requiredAnyPhraseGroups: [["ARRENDAMIENTO", "INMUEBLES URBANOS"]],
    extractableFacts: ["taxYear", "landlordRecords", "urbanRentWithholding"],
  },
  {
    code: "184",
    label: "Entidades en régimen de atribución de rentas",
    priority: "MAXIMUM",
    periodicity: "ANNUAL",
    officialProcedureUrl: `${AEAT_PROCEDURE}/GI04.shtml`,
    requiredPhrases: ["ENTIDADES EN REGIMEN DE ATRIBUCION DE RENTAS"],
    requiredAnyPhraseGroups: [["DECLARACION ANUAL", "DECLARACION INFORMATIVA"]],
    extractableFacts: ["taxYear", "entityActivity", "attributedIncome", "memberRecords"],
  },
  {
    code: "190",
    label: "Resumen anual de trabajadores y profesionales",
    priority: "MAXIMUM",
    periodicity: "ANNUAL",
    officialProcedureUrl: `${AEAT_PROCEDURE}/GI10.shtml`,
    requiredPhrases: ["RESUMEN ANUAL"],
    requiredAnyPhraseGroups: [["RENDIMIENTOS DEL TRABAJO", "ACTIVIDADES ECONOMICAS"]],
    extractableFacts: ["taxYear", "recipientKeys", "workRecipients", "professionalRecipients"],
  },
  {
    code: "193",
    label: "Resumen anual de determinadas rentas de capital",
    priority: "SECONDARY",
    periodicity: "ANNUAL",
    officialProcedureUrl: `${AEAT_PROCEDURE}/GI12.shtml`,
    requiredPhrases: ["RESUMEN ANUAL", "CAPITAL MOBILIARIO"],
    extractableFacts: ["taxYear", "capitalIncomeRecords", "recipientKeys"],
  },
  {
    code: "200",
    label: "Impuesto sobre Sociedades",
    priority: "SECONDARY",
    periodicity: "ANNUAL",
    officialProcedureUrl: `${AEAT_PROCEDURE}/GE04.shtml`,
    requiredPhrases: ["IMPUESTO SOBRE SOCIEDADES"],
    requiredAnyPhraseGroups: [["DECLARACION", "DOCUMENTO DE INGRESO"]],
    extractableFacts: ["taxYear", "entityIdentity", "taxRegime", "filingStatus"],
  },
  {
    code: "202",
    label: "Pagos fraccionados del Impuesto sobre Sociedades",
    priority: "SECONDARY",
    periodicity: "PERIODIC",
    officialProcedureUrl: `${AEAT_PROCEDURE}/GE00.shtml`,
    requiredPhrases: ["IMPUESTO SOBRE SOCIEDADES", "PAGO FRACCIONADO"],
    extractableFacts: ["taxYear", "period", "companyInstallmentPayment"],
  },
  {
    code: "216",
    label: "Retenciones a no residentes",
    priority: "SECONDARY",
    periodicity: "PERIODIC",
    officialProcedureUrl: `${AEAT_PROCEDURE}/GF05.shtml`,
    requiredPhrases: ["IMPUESTO SOBRE LA RENTA DE NO RESIDENTES", "RETENCIONES E INGRESOS A CUENTA"],
    extractableFacts: ["taxYear", "period", "nonResidentIncomeWithholding"],
  },
  {
    code: "296",
    label: "Resumen anual de retenciones a no residentes",
    priority: "SECONDARY",
    periodicity: "ANNUAL",
    officialProcedureUrl: `${AEAT_PROCEDURE}/GI22.shtml`,
    requiredPhrases: ["IMPUESTO SOBRE LA RENTA DE NO RESIDENTES", "RESUMEN ANUAL"],
    extractableFacts: ["taxYear", "nonResidentRecipientRecords", "incomeKeys"],
  },
  {
    code: "303",
    label: "Autoliquidación periódica de IVA",
    priority: "MAXIMUM",
    periodicity: "PERIODIC",
    officialProcedureUrl: `${AEAT_PROCEDURE}/G414.shtml`,
    requiredPhrases: ["IMPUESTO SOBRE EL VALOR ANADIDO", "AUTOLIQUIDACION"],
    extractableFacts: ["taxYear", "period", "vatSections", "filingStatus"],
  },
  {
    code: "308",
    label: "Determinadas devoluciones de IVA",
    priority: "SPECIAL",
    periodicity: "EVENT_DRIVEN",
    officialProcedureUrl: `${AEAT_PROCEDURE}/G403.shtml`,
    requiredPhrases: ["IMPUESTO SOBRE EL VALOR ANADIDO", "SOLICITUD DE DEVOLUCION"],
    requiredAnyPhraseGroups: [["RECARGO DE EQUIVALENCIA", "MEDIOS DE TRANSPORTE"]],
    extractableFacts: ["taxYear", "specialVatRefundType", "refundAmount"],
  },
  {
    code: "309",
    label: "IVA no periódico y operaciones especiales",
    priority: "SECONDARY",
    periodicity: "EVENT_DRIVEN",
    officialProcedureUrl: `${AEAT_PROCEDURE}/G404.shtml`,
    requiredPhrases: ["IMPUESTO SOBRE EL VALOR ANADIDO", "LIQUIDACION NO PERIODICA"],
    extractableFacts: ["taxYear", "period", "specialVatOperationType"],
  },
  {
    code: "341",
    label: "Compensaciones de agricultura, ganadería y pesca",
    priority: "SPECIAL",
    periodicity: "EVENT_DRIVEN",
    officialProcedureUrl: `${AEAT_PROCEDURE}/GZ10.shtml`,
    requiredPhrases: ["REINTEGRO DE COMPENSACIONES"],
    requiredAnyPhraseGroups: [["AGRICULTURA", "GANADERIA", "PESCA"]],
    extractableFacts: ["taxYear", "compensationType", "refundAmount"],
  },
  {
    code: "347",
    label: "Operaciones anuales con clientes y proveedores",
    priority: "SECONDARY",
    periodicity: "ANNUAL",
    officialProcedureUrl: `${AEAT_PROCEDURE}/GI27.shtml`,
    requiredPhrases: ["OPERACIONES CON TERCERAS PERSONAS"],
    requiredAnyPhraseGroups: [["DECLARACION ANUAL", "DECLARACION INFORMATIVA"]],
    extractableFacts: ["taxYear", "thirdPartyRecords", "annualAmounts", "excludedOperations"],
  },
  {
    code: "349",
    label: "Operaciones intracomunitarias",
    priority: "MAXIMUM",
    periodicity: "PERIODIC",
    officialProcedureUrl: `${AEAT_PROCEDURE}/GI28.shtml`,
    requiredPhrases: ["OPERACIONES INTRACOMUNITARIAS"],
    requiredAnyPhraseGroups: [["DECLARACION RECAPITULATIVA", "DECLARACION INFORMATIVA"]],
    extractableFacts: ["taxYear", "period", "euOperationKeys", "euCounterparties"],
  },
  {
    code: "369",
    label: "Declaración OSS/IOSS",
    priority: "MAXIMUM",
    periodicity: "PERIODIC",
    officialProcedureUrl: `${AEAT_PROCEDURE}/G420.shtml`,
    requiredPhrases: ["IMPUESTO SOBRE EL VALOR ANADIDO"],
    requiredAnyPhraseGroups: [["OSS", "VENTANILLA UNICA", "ONE STOP SHOP"]],
    extractableFacts: ["taxYear", "period", "ossScheme", "memberStatesOfConsumption"],
  },
  {
    code: "390",
    label: "Resumen anual de IVA",
    priority: "MAXIMUM",
    periodicity: "ANNUAL",
    officialProcedureUrl: `${AEAT_PROCEDURE}/G412.shtml`,
    requiredPhrases: ["IMPUESTO SOBRE EL VALOR ANADIDO", "RESUMEN ANUAL"],
    extractableFacts: ["taxYear", "vatRegimes", "annualVatTotals", "activityKeys"],
  },
  {
    code: "714",
    label: "Impuesto sobre el Patrimonio",
    priority: "SPECIAL",
    periodicity: "ANNUAL",
    officialProcedureUrl: `${AEAT_PROCEDURE}/G611.shtml`,
    requiredPhrases: ["IMPUESTO SOBRE EL PATRIMONIO"],
    extractableFacts: ["taxYear", "filingStatus", "taxableWealth"],
  },
  {
    code: "720",
    label: "Bienes y derechos en el extranjero",
    priority: "SPECIAL",
    periodicity: "ANNUAL",
    officialProcedureUrl: `${AEAT_PROCEDURE}/GI34.shtml`,
    requiredPhrases: ["BIENES Y DERECHOS SITUADOS EN EL EXTRANJERO"],
    extractableFacts: ["taxYear", "foreignAssetCategories", "foreignAssetRecords"],
  },
  {
    code: "721",
    label: "Monedas virtuales en el extranjero",
    priority: "SPECIAL",
    periodicity: "ANNUAL",
    officialProcedureUrl: `${AEAT_PROCEDURE}/GI55.shtml`,
    requiredPhrases: ["MONEDAS VIRTUALES SITUADAS EN EL EXTRANJERO"],
    extractableFacts: ["taxYear", "foreignCustodians", "virtualCurrencyRecords"],
  },
  {
    code: "840",
    label: "Impuesto sobre Actividades Económicas",
    priority: "SPECIAL",
    periodicity: "EVENT_DRIVEN",
    officialProcedureUrl: `${AEAT_PROCEDURE}/G323.shtml`,
    requiredPhrases: ["IMPUESTO SOBRE ACTIVIDADES ECONOMICAS"],
    requiredAnyPhraseGroups: [["ALTA", "VARIACION", "BAJA"]],
    extractableFacts: ["iaeAction", "iaeHeading", "effectiveDate", "premises"],
  },
] as const satisfies readonly AeatTaxFormStructure[];

export type AeatEuOperationKey = "E" | "A" | "S" | "I";
export type AeatOssAction = "REGISTRATION" | "MODIFICATION" | "DEREGISTRATION";

export interface AeatTaxFormCandidate {
  catalogVersion: typeof AEAT_TAX_FORM_CATALOG_VERSION;
  modelCode: AeatSupportedTaxFormCode | "UNKNOWN";
  status: "RESOLVED" | "REVIEW_REQUIRED" | "BLOCKED";
  isSubmitted: boolean;
  taxYear?: number;
  period?: string;
  receiptNumber?: string;
  euOperationKeys: AeatEuOperationKey[];
  ossAction?: AeatOssAction;
  warnings: string[];
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function containsModelCode(value: string, code: AeatSupportedTaxFormCode): boolean {
  return new RegExp(`\\b(?:MODELO|FORMULARIO)\\s*${code}\\b`).test(value);
}

function matchesStructure(value: string, structure: AeatTaxFormStructure): boolean {
  if (!containsModelCode(value, structure.code)) return false;
  if (!value.includes("NIF")) return false;
  if (!structure.requiredPhrases.every((phrase) => value.includes(phrase))) {
    return false;
  }
  return (structure.requiredAnyPhraseGroups ?? []).every((group) =>
    group.some((phrase) => value.includes(phrase)),
  );
}

function detectModel(value: string): AeatTaxFormStructure | undefined {
  return AEAT_TAX_FORM_STRUCTURES.find((structure) =>
    matchesStructure(value, structure),
  );
}

function extractEuOperationKeys(value: string): AeatEuOperationKey[] {
  const keys = new Set<AeatEuOperationKey>();
  const patterns = [
    /\bCLAVE(?:\s+DE)?\s+OPERACION\s*[:.\-]?\s*([EASI])\b/g,
    /\bTIPO(?:\s+DE)?\s+OPERACION\s*[:.\-]?\s*([EASI])\b/g,
  ];
  for (const pattern of patterns) {
    for (const match of value.matchAll(pattern)) {
      keys.add(match[1] as AeatEuOperationKey);
    }
  }
  return [...keys];
}

function extractOssAction(value: string): AeatOssAction | undefined {
  const checked = (label: string) =>
    new RegExp(`(?:\\bX\\b.{0,35}${label}|${label}.{0,35}\\bX\\b)`).test(value);
  if (checked("BAJA EN (?:EL )?REGIMEN")) return "DEREGISTRATION";
  if (checked("MODIFICACION")) return "MODIFICATION";
  if (checked("ALTA EN (?:EL )?REGIMEN")) return "REGISTRATION";
  return undefined;
}

export function parseAeatTaxFormText(text: string): AeatTaxFormCandidate {
  const value = normalize(text.slice(0, 250_000));
  const structure = detectModel(value);
  if (!structure) {
    return {
      catalogVersion: AEAT_TAX_FORM_CATALOG_VERSION,
      modelCode: "UNKNOWN",
      status: "BLOCKED",
      isSubmitted: false,
      euOperationKeys: [],
      warnings: [
        "El archivo no coincide con ninguna estructura del catálogo cerrado de modelos compatibles.",
      ],
    };
  }

  const yearMatch = value.match(/\bEJERCICIO\s*[:.\-]?\s*(20\d{2})\b/);
  const periodMatch = value.match(
    /\bPERIODO\s*[:.\-]?\s*(0A|ANUAL|[1-4]T|0[1-9]|1[0-2])\b/,
  );
  const receiptMatch = value.match(
    /\b(?:N(?:UMERO|O)?\.?\s+DE\s+)?JUSTIFICANTE\s*[:.\-]?\s*(\d{10,16})\b/,
  );
  const isSubmitted =
    Boolean(receiptMatch) ||
    /\bFECHA\s+DE\s+PRESENTACION\s*[:.\-]?\s*\d{2}[\/-]\d{2}[\/-]20\d{2}\b/.test(
      value,
    ) ||
    /\bCODIGO\s+SEGURO\s+DE\s+VERIFICACION\b/.test(value) ||
    /\bCSV\s*[:.\-]\s*[A-Z0-9]{8,}\b/.test(value);
  const needsYear = structure.periodicity !== "EVENT_DRIVEN";
  const needsPeriod = structure.periodicity === "PERIODIC";
  const metadataComplete =
    (!needsYear || Boolean(yearMatch)) && (!needsPeriod || Boolean(periodMatch));
  const warnings = [
    isSubmitted
      ? `Los datos leídos del modelo ${structure.code} corresponden al período indicado o, si es anual, al ejercicio de una presentación; confirma cada propuesta antes de aplicarla.`
      : `Se reconoce la estructura del modelo ${structure.code}, pero no una presentación cumplimentada; no se propondrán respuestas a partir de una plantilla vacía.`,
  ];
  if (!metadataComplete) {
    warnings.push(
      "No se han podido leer con seguridad todos los datos temporales esperados; revisa el documento antes de usarlo como evidencia.",
    );
  }

  return {
    catalogVersion: AEAT_TAX_FORM_CATALOG_VERSION,
    modelCode: structure.code,
    status: isSubmitted && metadataComplete ? "RESOLVED" : "REVIEW_REQUIRED",
    isSubmitted,
    ...(yearMatch ? { taxYear: Number(yearMatch[1]) } : {}),
    ...(periodMatch ? { period: periodMatch[1] } : {}),
    ...(receiptMatch ? { receiptNumber: receiptMatch[1] } : {}),
    euOperationKeys:
      structure.code === "349" ? extractEuOperationKeys(value) : [],
    ...(structure.code === "035"
      ? { ossAction: extractOssAction(value) }
      : {}),
    warnings,
  };
}
