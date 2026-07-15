import type {
  ModelResultStatus,
  TaxModelNumber,
  TaxpayerProfile,
} from "../contracts";
import type { FiscalProfileFactoryName } from "./profile-factories";

export const FISCAL_EXECUTABLE_CATEGORIES = [
  "POSITIVE",
  "NEGATIVE",
  "EXCEPTION",
  "UNKNOWN",
  "CONTRADICTION",
  "TEMPORALITY",
  "TERRITORY",
  "PROHIBITED_INFERENCE",
] as const;

export type FiscalExecutableCategory =
  (typeof FISCAL_EXECUTABLE_CATEGORIES)[number];

export const FISCAL_MUTATION_OPERATORS = [
  "AND_TO_OR",
  "CONDITION_INVERTED",
  "EXCEPTION_REMOVED",
  "FISCAL_YEAR_CHANGED",
  "TERRITORY_CHANGED",
  "UNKNOWN_TO_FALSE",
  "CONTRADICTION_IGNORED",
  "THRESHOLD_CHANGED",
] as const;

export type FiscalMutationOperator =
  (typeof FISCAL_MUTATION_OPERATORS)[number];

export interface FiscalScenarioTemplate {
  factory: FiscalProfileFactoryName;
  overrides?: Partial<TaxpayerProfile>;
  expectedStatus: ModelResultStatus;
  reasonIncludes: string;
}

export interface FiscalModelExecutableSpec {
  modelNumber: TaxModelNumber;
  positive: FiscalScenarioTemplate;
  negative: FiscalScenarioTemplate;
  unknown: FiscalScenarioTemplate;
  thresholdMutationRelevant: boolean;
}

const scenario = (
  factory: FiscalProfileFactoryName,
  expectedStatus: ModelResultStatus,
  reasonIncludes: string,
  overrides?: Partial<TaxpayerProfile>,
): FiscalScenarioTemplate => ({
  factory,
  expectedStatus,
  reasonIncludes,
  ...(overrides ? { overrides } : {}),
});

export const FISCAL_MODEL_EXECUTABLE_SPECS = [
  {
    modelNumber: "035",
    positive: scenario("OSS_IOSS", "CONDITIONAL", "OSS/IOSS"),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "No hubo ventas B2C"),
    unknown: scenario("UNKNOWN_FACTS", "NEEDS_INFORMATION", "alta OSS/IOSS"),
    thresholdMutationRelevant: false,
  },
  {
    modelNumber: "036",
    positive: scenario("BUSINESS", "DERIVED", "alta, baja o cambio", {
      changesDuringYear: "YES",
    }),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "cambios censales"),
    unknown: scenario("UNKNOWN_FACTS", "NEEDS_INFORMATION", "cambios censales"),
    thresholdMutationRelevant: false,
  },
  {
    modelNumber: "100",
    positive: scenario("PROFESSIONAL", "DERIVED", "alta en RETA"),
    negative: scenario("COMPANY", "NEEDS_INFORMATION", "actividad personal"),
    unknown: scenario("UNKNOWN_FACTS", "NEEDS_INFORMATION", "alta en RETA"),
    thresholdMutationRelevant: false,
  },
  {
    modelNumber: "111",
    positive: scenario("WORKERS", "DERIVED", "pagos de trabajo o profesionales"),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "No se han declarado rentas"),
    unknown: scenario("UNKNOWN_FACTS", "NEEDS_INFORMATION", "No se sabe si se pagaron"),
    thresholdMutationRelevant: false,
  },
  {
    modelNumber: "115",
    positive: scenario("RENT", "DERIVED", "alquiler urbano sujeto a retención"),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "No se han declarado rentas"),
    unknown: scenario("UNKNOWN_FACTS", "NEEDS_INFORMATION", "No se sabe si se pagaron"),
    thresholdMutationRelevant: false,
  },
  {
    modelNumber: "123",
    positive: scenario("BUSINESS", "NEEDS_PROFESSIONAL_REVIEW", "rendimientos de capital", {
      paidCapitalIncome: "YES",
    }),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "No se declararon pagos"),
    unknown: scenario("UNKNOWN_FACTS", "NEEDS_INFORMATION", "No se sabe si se pagaron"),
    thresholdMutationRelevant: false,
  },
  {
    modelNumber: "130",
    positive: scenario("BUSINESS", "DERIVED", "estimación directa"),
    negative: scenario("COMPANY", "NOT_APPLICABLE", "actividad facturada personalmente"),
    unknown: scenario("UNKNOWN_FACTS", "NEEDS_INFORMATION", "método de determinación"),
    thresholdMutationRelevant: true,
  },
  {
    modelNumber: "131",
    positive: scenario("MODULES", "DERIVED", "estimación objetiva"),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "estimación objetiva"),
    unknown: scenario("ATTRIBUTION_ENTITY", "NEEDS_INFORMATION", "atribución de rentas"),
    thresholdMutationRelevant: true,
  },
  {
    modelNumber: "180",
    positive: scenario("RENT", "DERIVED", "alquiler urbano sujeto a retención"),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "retenciones periódicas"),
    unknown: scenario("UNKNOWN_FACTS", "NEEDS_INFORMATION", "resumen anual depende"),
    thresholdMutationRelevant: false,
  },
  {
    modelNumber: "184",
    positive: scenario("ATTRIBUTION_ENTITY", "DERIVED", "entidad en atribución", {
      attributionEntityIncomeAboveThreshold: "YES",
    }),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "entidad en régimen de atribución"),
    unknown: scenario("ATTRIBUTION_ENTITY", "NEEDS_INFORMATION", "Falta confirmar actividad"),
    thresholdMutationRelevant: true,
  },
  {
    modelNumber: "190",
    positive: scenario("PAID_PROFESSIONALS", "DERIVED", "pagos de trabajo o profesionales"),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "retenciones periódicas"),
    unknown: scenario("UNKNOWN_FACTS", "NEEDS_INFORMATION", "resumen anual depende"),
    thresholdMutationRelevant: false,
  },
  {
    modelNumber: "193",
    positive: scenario("BUSINESS", "NEEDS_PROFESSIONAL_REVIEW", "resumen anual depende", {
      paidCapitalIncome: "YES",
    }),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "No existen rentas de capital"),
    unknown: scenario("UNKNOWN_FACTS", "NEEDS_INFORMATION", "Falta confirmar la existencia"),
    thresholdMutationRelevant: false,
  },
  {
    modelNumber: "200",
    positive: scenario("COMPANY", "DERIVED", "sociedad"),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "no se ha identificado como sociedad"),
    unknown: scenario("UNKNOWN_FACTS", "NOT_APPLICABLE", "no se ha identificado como sociedad"),
    thresholdMutationRelevant: false,
  },
  {
    modelNumber: "202",
    positive: scenario("COMPANY", "DERIVED", "pagos fraccionados", {
      companyInstallmentPayments: "YES",
    }),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "No se analiza una sociedad"),
    unknown: scenario("COMPANY", "NEEDS_INFORMATION", "No basta ser sociedad"),
    thresholdMutationRelevant: false,
  },
  {
    modelNumber: "216",
    positive: scenario("BUSINESS", "NEEDS_PROFESSIONAL_REVIEW", "no residentes", {
      paidNonResidentIncome: "YES",
      nonResidentWithholdingConfirmed: "YES",
    }),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "No se declararon pagos"),
    unknown: scenario("UNKNOWN_FACTS", "NEEDS_INFORMATION", "No se sabe si hubo pagos"),
    thresholdMutationRelevant: false,
  },
  {
    modelNumber: "296",
    positive: scenario("BUSINESS", "NEEDS_PROFESSIONAL_REVIEW", "resumen anual", {
      paidNonResidentIncome: "YES",
      nonResidentWithholdingConfirmed: "YES",
    }),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "No se declararon pagos"),
    unknown: scenario("UNKNOWN_FACTS", "NEEDS_INFORMATION", "No se sabe si hubo pagos"),
    thresholdMutationRelevant: false,
  },
  {
    modelNumber: "303",
    positive: scenario("BUSINESS", "DERIVED", "autoliquidación periódica"),
    negative: scenario("EXEMPT_ACTIVITY", "NOT_APPLICABLE", "no acreditan autoliquidación"),
    unknown: scenario("UNKNOWN_FACTS", "NEEDS_INFORMATION", "tratamiento de IVA"),
    thresholdMutationRelevant: false,
  },
  {
    modelNumber: "308",
    positive: scenario("BUSINESS", "NEEDS_PROFESSIONAL_REVIEW", "devolución o compensación especial", {
      specialVatRefundSituation: "YES",
    }),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "No se declaró ningún supuesto especial"),
    unknown: scenario("UNKNOWN_FACTS", "NEEDS_INFORMATION", "supuesto especial"),
    thresholdMutationRelevant: false,
  },
  {
    modelNumber: "309",
    positive: scenario("EXEMPT_ACTIVITY", "DERIVED", "autoliquidación no periódica", {
      euGoodsPurchases: "YES",
      roiRegistered: "YES",
    }),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "autoliquidación periódica 303"),
    unknown: scenario("EXEMPT_ACTIVITY", "NEEDS_INFORMATION", "Falta confirmar", {
      euGoodsPurchases: "UNKNOWN",
      euServicesPurchases: "NO",
      reverseChargeTransactions: "NO",
    }),
    thresholdMutationRelevant: false,
  },
  {
    modelNumber: "341",
    positive: scenario("BUSINESS", "NEEDS_PROFESSIONAL_REVIEW", "devolución o compensación especial", {
      specialVatRefundSituation: "YES",
    }),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "No se declaró ningún supuesto especial"),
    unknown: scenario("UNKNOWN_FACTS", "NEEDS_INFORMATION", "supuesto especial"),
    thresholdMutationRelevant: false,
  },
  {
    modelNumber: "347",
    positive: scenario("BUSINESS", "DERIVED", "umbral por tercero", {
      thirdPartyThresholdExceeded: "YES",
    }),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "No se alcanzó el umbral"),
    unknown: scenario("UNKNOWN_FACTS", "NEEDS_INFORMATION", "cálculo por tercero"),
    thresholdMutationRelevant: true,
  },
  {
    modelNumber: "349",
    positive: scenario("EU_OPERATIONS", "DERIVED", "operaciones intracomunitarias"),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "No se declararon operaciones"),
    unknown: scenario("UNKNOWN_FACTS", "NEEDS_INFORMATION", "operaciones intracomunitarias"),
    thresholdMutationRelevant: false,
  },
  {
    modelNumber: "369",
    positive: scenario("OSS_IOSS", "DERIVED", "alta en un régimen OSS/IOSS"),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "No hubo ventas B2C"),
    unknown: scenario("UNKNOWN_FACTS", "NEEDS_INFORMATION", "alta OSS/IOSS"),
    thresholdMutationRelevant: false,
  },
  {
    modelNumber: "390",
    positive: scenario("BUSINESS", "DERIVED", "autoliquidación periódica de IVA"),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "exoneración del resumen anual", {
      vatAnnualSummaryExempt: "YES",
    }),
    unknown: scenario("BUSINESS", "NEEDS_INFORMATION", "exoneración del resumen anual", {
      vatAnnualSummaryExempt: "UNKNOWN",
    }),
    thresholdMutationRelevant: false,
  },
  {
    modelNumber: "714",
    positive: scenario("BUSINESS", "NEEDS_PROFESSIONAL_REVIEW", "posible obligación por patrimonio", {
      wealthTaxPotentiallyApplicable: "YES",
    }),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "No se ha declarado"),
    unknown: scenario("UNKNOWN_FACTS", "NEEDS_INFORMATION", "No está confirmado"),
    thresholdMutationRelevant: true,
  },
  {
    modelNumber: "720",
    positive: scenario("BUSINESS", "NEEDS_PROFESSIONAL_REVIEW", "bienes o derechos", {
      foreignAssetsPotentiallyReportable: "YES",
    }),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "No se ha declarado"),
    unknown: scenario("UNKNOWN_FACTS", "NEEDS_INFORMATION", "No está confirmado"),
    thresholdMutationRelevant: true,
  },
  {
    modelNumber: "721",
    positive: scenario("BUSINESS", "NEEDS_PROFESSIONAL_REVIEW", "monedas virtuales", {
      foreignCryptoPotentiallyReportable: "YES",
    }),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "No se ha declarado"),
    unknown: scenario("UNKNOWN_FACTS", "NEEDS_INFORMATION", "No está confirmado"),
    thresholdMutationRelevant: true,
  },
] as const satisfies readonly FiscalModelExecutableSpec[];

export function mutationOperatorsForSpec(
  spec: FiscalModelExecutableSpec,
): readonly FiscalMutationOperator[] {
  return spec.thresholdMutationRelevant
    ? FISCAL_MUTATION_OPERATORS
    : FISCAL_MUTATION_OPERATORS.filter(
        (operator) => operator !== "THRESHOLD_CHANGED",
      );
}
