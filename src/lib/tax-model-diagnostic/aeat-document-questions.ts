import {
  AEAT_TAX_FORM_STRUCTURES,
  type AeatSupportedTaxFormCode,
  type AeatTaxFormCandidate,
} from "@/lib/fiscal-profile/aeat-tax-form";
import {
  SUPPORTING_DOCUMENT_STRUCTURES,
  type SupportingDocumentCandidate,
  type SupportingDocumentType,
} from "@/lib/fiscal-profile/supporting-document";
import type { TaxModelNumber, TaxpayerProfile } from "./contracts";

export const FISCAL_DOCUMENT_QUESTION_CATALOG_VERSION =
  "fiscal-document-question-catalog.2026-07.v1" as const;

type BaseKnownAeatDocumentType =
  | "AEAT_CENSUS_CERTIFICATE"
  | "MODEL_036"
  | "MODEL_037_HISTORICAL"
  | "AEAT_ACTIVITIES_SCREEN"
  | "AEAT_TAX_STATUS_SCREEN"
  | "AEAT_OBLIGATIONS_SCREEN";

export type KnownAeatDocumentType =
  | BaseKnownAeatDocumentType
  | `MODEL_${AeatSupportedTaxFormCode}`
  | SupportingDocumentType;

export interface AeatDocumentQuestionCapability {
  label: string;
  questionIds: readonly string[];
  extractableFacts: readonly string[];
  officialInformationUrl?: string;
}

const MODEL_QUESTION_IDS = {
  "035": ["J_OSS"],
  "100": [],
  "111": ["F_EMPLOYEES", "F_PROFESSIONALS", "F_OTHER_WITHHOLDING"],
  "115": ["G_RENTS_PREMISES", "G_RENT_WITHHOLDING"],
  "123": ["H_CAPITAL"],
  "130": [],
  "131": ["D_INCOME_TAX_REGIME"],
  "151": [],
  "180": ["G_RENTS_PREMISES", "G_RENT_WITHHOLDING"],
  "184": ["L_ATTRIBUTION_THRESHOLD"],
  "190": ["F_EMPLOYEES", "F_PROFESSIONALS", "F_OTHER_WITHHOLDING"],
  "193": ["H_CAPITAL"],
  "200": [],
  "202": ["L_COMPANY_INSTALLMENTS"],
  "216": ["H_NON_RESIDENT", "H_NON_RESIDENT_CONFIRMED"],
  "296": ["H_NON_RESIDENT", "H_NON_RESIDENT_CONFIRMED"],
  "303": ["E_VAT_REGIMES", "E_REVERSE_CHARGE"],
  "308": ["E_SPECIAL_REFUND"],
  "309": ["E_REVERSE_CHARGE"],
  "341": ["E_SPECIAL_REFUND"],
  "347": ["K_THRESHOLD", "K_ALL_EXCLUDED"],
  "349": [
    "I_EU_GOODS_SALES",
    "I_EU_GOODS_PURCHASES",
    "I_EU_SERVICES_SALES",
    "I_EU_SERVICES_PURCHASES",
  ],
  "369": ["J_EU_CONSUMERS"],
  "390": ["E_VAT_REGIMES", "E_390_EXEMPT"],
  "714": ["M_WEALTH"],
  "720": ["M_FOREIGN_ASSETS"],
  "721": ["M_FOREIGN_CRYPTO"],
  "840": ["C_ACTIVITY_KINDS", "N_CHANGES"],
} as const satisfies Record<AeatSupportedTaxFormCode, readonly string[]>;

const BASE_CAPABILITIES = {
  AEAT_CENSUS_CERTIFICATE: {
    label: "Certificado de situación censal actualizado",
    questionIds: [
      "A_INVOICING_SUBJECT",
      "B_TERRITORY",
      "D_INCOME_TAX_REGIME",
      "E_VAT_REGIMES",
      "N_CENSUS_REVIEWED",
    ],
    extractableFacts: ["taxpayerType", "territory", "incomeTaxRegime", "vatRegime", "activeTaxModels"],
    officialInformationUrl:
      "https://sede.agenciatributaria.gob.es/Sede/certificaciones/censales/certificados-tributarios-situacion-censal.html",
  },
  MODEL_036: {
    label: "Modelo 036",
    questionIds: [
      "A_INVOICING_SUBJECT",
      "B_TERRITORY",
      "C_ACTIVITY_KINDS",
      "D_INCOME_TAX_REGIME",
      "E_VAT_REGIMES",
      "I_ROI",
      "N_CHANGES",
    ],
    extractableFacts: ["taxpayerType", "territory", "activities", "incomeTaxRegime", "vatRegimes", "withholdingRegistrations", "roiRegistration", "effectiveDates"],
    officialInformationUrl:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G322.shtml",
  },
  MODEL_037_HISTORICAL: {
    label: "Modelo 037 histórico",
    questionIds: [
      "A_INVOICING_SUBJECT",
      "B_TERRITORY",
      "C_ACTIVITY_KINDS",
      "D_INCOME_TAX_REGIME",
      "E_VAT_REGIMES",
      "N_CHANGES",
    ],
    extractableFacts: ["taxpayerType", "territory", "activities", "incomeTaxRegime", "vatRegimes", "effectiveDates"],
    officialInformationUrl:
      "https://www.boe.es/boe/dias/2007/05/10/pdfs/A20106-20124.pdf",
  },
  AEAT_ACTIVITIES_SCREEN: {
    label: "Mis actividades económicas",
    questionIds: ["B_START_DATE", "C_ACTIVITY_KINDS"],
    extractableFacts: ["activeActivities", "historicalActivities", "activityStartDate", "iaeHeadings"],
  },
  AEAT_TAX_STATUS_SCREEN: {
    label: "Mi situación tributaria",
    questionIds: ["D_INCOME_TAX_REGIME", "E_VAT_REGIMES", "I_ROI"],
    extractableFacts: ["incomeTaxRegime", "vatRegimes", "withholdingRegistrations", "roiRegistration"],
  },
  AEAT_OBLIGATIONS_SCREEN: {
    label: "Mis obligaciones tributarias",
    questionIds: [
      "D_INCOME_TAX_REGIME",
      "G_RENTS_PREMISES",
      "G_RENT_WITHHOLDING",
      "N_CENSUS_OBLIGATIONS",
      "N_CENSUS_REVIEWED",
    ],
    extractableFacts: ["activeTaxModels", "periodicities", "effectiveDates", "isComplete"],
  },
} as const satisfies Record<
  BaseKnownAeatDocumentType,
  AeatDocumentQuestionCapability
>;

const MODEL_CAPABILITIES = Object.fromEntries(
  AEAT_TAX_FORM_STRUCTURES.map((structure) => [
    `MODEL_${structure.code}`,
    {
      label: `Modelo ${structure.code} · ${structure.label}`,
      questionIds: MODEL_QUESTION_IDS[structure.code],
      extractableFacts: structure.extractableFacts,
      officialInformationUrl: structure.officialProcedureUrl,
    },
  ]),
) as unknown as Record<
  `MODEL_${AeatSupportedTaxFormCode}`,
  AeatDocumentQuestionCapability
>;

const SUPPORTING_CAPABILITIES = Object.fromEntries(
  SUPPORTING_DOCUMENT_STRUCTURES.map((structure) => [
    structure.documentType,
    {
      label: structure.label,
      questionIds:
        structure.documentType === "INTRACOMMUNITY_OPERATOR_CERTIFICATE"
          ? ["I_ROI"]
          : structure.documentType ===
              "LANDLORD_WITHHOLDING_EXEMPTION_CERTIFICATE"
            ? ["G_LANDLORD_EXEMPTION"]
            : structure.documentType === "SELF_EMPLOYED_ACTIVITY_REPORT"
              ? ["B_RETA", "C_ACTIVITY_KINDS"]
              : ["B_RETA"],
      extractableFacts: structure.extractableFacts,
      officialInformationUrl: structure.officialInformationUrl,
    },
  ]),
) as unknown as Record<
  SupportingDocumentType,
  AeatDocumentQuestionCapability
>;

/**
 * Contrato cerrado entre cada documento reconocido y las preguntas que su
 * interior podría contestar. Estar en esta lista no autoriza una respuesta:
 * el extractor debe demostrar el dato y el usuario debe confirmarlo.
 */
export const AEAT_DOCUMENT_QUESTION_CAPABILITIES: Readonly<
  Record<KnownAeatDocumentType, AeatDocumentQuestionCapability>
> = {
  ...BASE_CAPABILITIES,
  ...MODEL_CAPABILITIES,
  ...SUPPORTING_CAPABILITIES,
};

export interface AeatMappedQuestionAnswer {
  field: keyof TaxpayerProfile;
  questionId: string;
  label: string;
  displayValue: string;
  value: TaxpayerProfile[keyof TaxpayerProfile];
}

function yes(
  field: keyof TaxpayerProfile,
  questionId: string,
  label: string,
): AeatMappedQuestionAnswer {
  return { field, questionId, label, displayValue: "Sí", value: "YES" };
}

function answersForSubmittedModel(
  candidate: AeatTaxFormCandidate,
  targetFiscalYear: number,
): AeatMappedQuestionAnswer[] {
  const code = candidate.modelCode;
  if (code === "UNKNOWN") return [];
  // Una declaración solo acredita el ejercicio/periodo que contiene. Si el
  // objetivo es otro ejercicio, no se proyecta al perfil actual.
  if (candidate.taxYear !== targetFiscalYear) return [];
  if (code === "115" || code === "180") {
    return [
      yes("rentsBusinessPremises", "G_RENTS_PREMISES", "Alquiler de inmueble urbano para la actividad"),
      yes("rentSubjectToWithholding", "G_RENT_WITHHOLDING", "Alquiler sujeto a retención"),
    ];
  }
  if (code === "131") {
    return [
      {
        field: "incomeTaxRegime",
        questionId: "D_INCOME_TAX_REGIME",
        label: "Régimen de IRPF",
        displayValue: "Estimación objetiva (módulos)",
        value: "OBJECTIVE_ESTIMATION",
      },
    ];
  }
  if (code === "123" || code === "193") {
    return [yes("paidCapitalIncome", "H_CAPITAL", "Pagos de rendimientos de capital sujetos a retención")];
  }
  if (code === "216" || code === "296") {
    return [
      yes("paidNonResidentIncome", "H_NON_RESIDENT", "Pagos de rentas a no residentes"),
      yes("nonResidentWithholdingConfirmed", "H_NON_RESIDENT_CONFIRMED", "Obligación como retenedor de no residentes"),
    ];
  }
  if (code === "202") {
    return [yes("companyInstallmentPayments", "L_COMPANY_INSTALLMENTS", "Pagos fraccionados de la sociedad")];
  }
  if (code === "184") {
    return [yes("attributionEntityIncomeAboveThreshold", "L_ATTRIBUTION_THRESHOLD", "Actividad o rentas declarables de la entidad en atribución")];
  }
  if (code === "308" || code === "341") {
    return [yes("specialVatRefundSituation", "E_SPECIAL_REFUND", "Devolución o compensación especial de IVA")];
  }
  if (code === "720") {
    return [yes("foreignAssetsPotentiallyReportable", "M_FOREIGN_ASSETS", "Bienes o derechos en el extranjero declarados")];
  }
  if (code === "721") {
    return [yes("foreignCryptoPotentiallyReportable", "M_FOREIGN_CRYPTO", "Monedas virtuales en el extranjero declaradas")];
  }
  if (code === "714") {
    return [yes("wealthTaxPotentiallyApplicable", "M_WEALTH", "Impuesto sobre el Patrimonio presentado")];
  }
  if (code === "369") {
    return [
      yes(
        "euConsumerSales",
        "J_EU_CONSUMERS",
        "Operaciones con consumidores europeos declaradas",
      ),
    ];
  }
  if (code === "349" && candidate.euOperationKeys.length > 0) {
    const keyAnswers: Record<
      (typeof candidate.euOperationKeys)[number],
      AeatMappedQuestionAnswer
    > = {
      E: yes("euGoodsSales", "I_EU_GOODS_SALES", "Entregas intracomunitarias de bienes"),
      A: yes("euGoodsPurchases", "I_EU_GOODS_PURCHASES", "Adquisiciones intracomunitarias de bienes"),
      S: yes("euServicesSales", "I_EU_SERVICES_SALES", "Servicios prestados a empresas de la UE"),
      I: yes("euServicesPurchases", "I_EU_SERVICES_PURCHASES", "Servicios recibidos de empresas de la UE"),
    };
    return [
      ...candidate.euOperationKeys.map((key) => keyAnswers[key]),
    ];
  }
  return [];
}

export function mapSubmittedTaxFormToQuestions(
  candidate: AeatTaxFormCandidate,
  targetFiscalYear: number,
): AeatMappedQuestionAnswer[] {
  if (!candidate.isSubmitted || candidate.modelCode === "UNKNOWN") return [];
  return answersForSubmittedModel(candidate, targetFiscalYear);
}

export function mapSupportingDocumentToQuestions(
  candidate: SupportingDocumentCandidate,
): AeatMappedQuestionAnswer[] {
  const answers: AeatMappedQuestionAnswer[] = [];
  if (candidate.retaDuringYear === "YES") {
    answers.push(yes("retaDuringYear", "B_RETA", "Alta en trabajo autónomo durante el ejercicio"));
  }
  if (candidate.roiRegistered === "YES") {
    answers.push(yes("roiRegistered", "I_ROI", "Alta efectiva en ROI"));
  }
  if (candidate.landlordWithholdingExemption === "YES") {
    answers.push(yes("landlordWithholdingExemption", "G_LANDLORD_EXEMPTION", "Exoneración de retención acreditada por el arrendador"));
  }
  return answers;
}

function answersForCensusObligation(code: TaxModelNumber): AeatMappedQuestionAnswer[] {
  if (code === "115") {
    return [
      yes("rentsBusinessPremises", "G_RENTS_PREMISES", "Alquiler de inmueble urbano para la actividad"),
      yes("rentSubjectToWithholding", "G_RENT_WITHHOLDING", "Alquiler sujeto a retención"),
    ];
  }
  if (code === "131") {
    return [
      {
        field: "incomeTaxRegime",
        questionId: "D_INCOME_TAX_REGIME",
        label: "Régimen de IRPF",
        displayValue: "Estimación objetiva (módulos)",
        value: "OBJECTIVE_ESTIMATION",
      },
    ];
  }
  return [];
}

export function mapCensusObligationsToQuestions(
  modelCodes: readonly TaxModelNumber[],
): AeatMappedQuestionAnswer[] {
  return [...new Set(modelCodes)].flatMap(answersForCensusObligation);
}
