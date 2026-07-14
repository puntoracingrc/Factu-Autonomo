import type { AeatTaxFormCandidate } from "@/lib/fiscal-profile/aeat-tax-form";
import type { TaxModelNumber, TaxpayerProfile } from "./contracts";

export type KnownAeatDocumentType =
  | "AEAT_CENSUS_CERTIFICATE"
  | "MODEL_036"
  | "MODEL_037_HISTORICAL"
  | "AEAT_ACTIVITIES_SCREEN"
  | "AEAT_TAX_STATUS_SCREEN"
  | "AEAT_OBLIGATIONS_SCREEN"
  | "MODEL_115"
  | "MODEL_130"
  | "MODEL_131"
  | "MODEL_303";

export interface AeatDocumentQuestionCapability {
  label: string;
  questionIds: readonly string[];
  extractableFacts: readonly string[];
}

/**
 * Lista cerrada de documentos conocidos y de las preguntas que su contenido
 * puede llegar a responder. Reconocer un documento no basta: cada extractor
 * debe demostrar además el valor concreto antes de proponerlo al usuario.
 */
export const AEAT_DOCUMENT_QUESTION_CAPABILITIES = {
  AEAT_CENSUS_CERTIFICATE: {
    label: "Certificado de situación censal",
    questionIds: [
      "A_INVOICING_SUBJECT",
      "B_TERRITORY",
      "D_INCOME_TAX_REGIME",
      "E_VAT_REGIMES",
      "N_CENSUS_REVIEWED",
    ],
    extractableFacts: [
      "taxpayerType",
      "territory",
      "incomeTaxRegime",
      "vatRegime",
    ],
  },
  MODEL_036: {
    label: "Modelo 036",
    questionIds: [
      "A_INVOICING_SUBJECT",
      "B_TERRITORY",
      "D_INCOME_TAX_REGIME",
      "E_VAT_REGIMES",
    ],
    extractableFacts: [
      "taxpayerType",
      "territory",
      "incomeTaxRegime",
      "vatRegime",
    ],
  },
  MODEL_037_HISTORICAL: {
    label: "Modelo 037 histórico",
    questionIds: [
      "A_INVOICING_SUBJECT",
      "B_TERRITORY",
      "D_INCOME_TAX_REGIME",
      "E_VAT_REGIMES",
    ],
    extractableFacts: [
      "taxpayerType",
      "territory",
      "incomeTaxRegime",
      "vatRegime",
    ],
  },
  AEAT_ACTIVITIES_SCREEN: {
    label: "Mis actividades económicas",
    questionIds: ["B_START_DATE", "C_ACTIVITY_KINDS"],
    extractableFacts: ["activeActivities", "activityStartDate"],
  },
  AEAT_TAX_STATUS_SCREEN: {
    label: "Mi situación tributaria",
    questionIds: ["D_INCOME_TAX_REGIME", "E_VAT_REGIMES"],
    extractableFacts: ["incomeTaxRegime", "vatRegimes"],
  },
  AEAT_OBLIGATIONS_SCREEN: {
    label: "Mis obligaciones",
    questionIds: [
      "D_INCOME_TAX_REGIME",
      "G_RENTS_PREMISES",
      "G_RENT_WITHHOLDING",
      "N_CENSUS_OBLIGATIONS",
      "N_CENSUS_REVIEWED",
    ],
    extractableFacts: ["activeTaxModels", "isComplete"],
  },
  MODEL_115: {
    label: "Modelo 115",
    questionIds: ["G_RENTS_PREMISES", "G_RENT_WITHHOLDING"],
    extractableFacts: [
      "taxYear",
      "period",
      "receiptNumber",
      "urbanRentWithholding",
    ],
  },
  MODEL_130: {
    label: "Modelo 130",
    questionIds: [],
    extractableFacts: [
      "taxYear",
      "period",
      "receiptNumber",
      "directEstimationPayment",
    ],
  },
  MODEL_131: {
    label: "Modelo 131",
    questionIds: ["D_INCOME_TAX_REGIME"],
    extractableFacts: [
      "taxYear",
      "period",
      "receiptNumber",
      "objectiveEstimationPayment",
    ],
  },
  MODEL_303: {
    label: "Modelo 303",
    questionIds: [],
    extractableFacts: ["taxYear", "period", "receiptNumber", "vatReturn"],
  },
} as const satisfies Record<
  KnownAeatDocumentType,
  AeatDocumentQuestionCapability
>;

export interface AeatMappedQuestionAnswer {
  field: keyof TaxpayerProfile;
  questionId: string;
  label: string;
  displayValue: string;
  value: TaxpayerProfile[keyof TaxpayerProfile];
}

function answersForModel(
  modelCode: TaxModelNumber,
): AeatMappedQuestionAnswer[] {
  if (modelCode === "115") {
    return [
      {
        field: "rentsBusinessPremises",
        questionId: "G_RENTS_PREMISES",
        label: "Alquiler de inmueble urbano para la actividad",
        displayValue: "Sí",
        value: "YES",
      },
      {
        field: "rentSubjectToWithholding",
        questionId: "G_RENT_WITHHOLDING",
        label: "Alquiler sujeto a retención",
        displayValue: "Sí",
        value: "YES",
      },
    ];
  }
  if (modelCode === "131") {
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

export function mapSubmittedTaxFormToQuestions(
  candidate: AeatTaxFormCandidate,
): AeatMappedQuestionAnswer[] {
  if (!candidate.isSubmitted || candidate.modelCode === "UNKNOWN") return [];
  return answersForModel(candidate.modelCode);
}

export function mapCensusObligationsToQuestions(
  modelCodes: readonly TaxModelNumber[],
): AeatMappedQuestionAnswer[] {
  return [...new Set(modelCodes)].flatMap(answersForModel);
}
