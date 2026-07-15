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
  "TEMPORAL",
  "TERRITORY",
  "MULTI_ACTIVITY",
  "INFERENCE_FORBIDDEN",
  "BOUNDARY",
] as const;

export type FiscalExecutableCategory =
  (typeof FISCAL_EXECUTABLE_CATEGORIES)[number];

export const FISCAL_MUTATION_OPERATORS = [
  "CONDITION_INVERTED",
  "EXCEPTION_REMOVED",
  "AND_TO_OR",
  "OR_TO_AND",
  "FISCAL_YEAR_CHANGED",
  "TERRITORY_CHANGED",
  "UNKNOWN_TO_FALSE",
  "UNKNOWN_TO_TRUE",
  "CONTRADICTION_IGNORED",
  "REQUIRED_CONDITION_REMOVED",
  "THRESHOLD_CHANGED",
  "HISTORICAL_TO_CURRENT",
  "SUBJECT_SWAPPED",
  "CROSS_MODEL_RULE",
] as const;

export type FiscalMutationOperator =
  (typeof FISCAL_MUTATION_OPERATORS)[number];

export const FISCAL_SAFETY_CRITICAL_MUTATIONS = [
  "FISCAL_YEAR_CHANGED",
  "TERRITORY_CHANGED",
  "UNKNOWN_TO_FALSE",
  "UNKNOWN_TO_TRUE",
  "CONTRADICTION_IGNORED",
  "HISTORICAL_TO_CURRENT",
  "SUBJECT_SWAPPED",
  "CROSS_MODEL_RULE",
] as const satisfies readonly FiscalMutationOperator[];

export type FiscalPredicateConditionMode = "ALL" | "ANY";
export type FiscalPredicateSubject = "PERSON" | "ENTITY" | "ANY";

export const FISCAL_ANY_CONDITION_MODELS = ["036"] as const satisfies readonly TaxModelNumber[];
export const FISCAL_PERSON_SUBJECT_MODELS = [
  "100",
  "130",
  "131",
  "714",
  "720",
  "721",
] as const satisfies readonly TaxModelNumber[];
export const FISCAL_ENTITY_SUBJECT_MODELS = [
  "184",
  "200",
  "202",
] as const satisfies readonly TaxModelNumber[];

export function conditionModeForModel(
  modelNumber: TaxModelNumber,
): FiscalPredicateConditionMode {
  return FISCAL_ANY_CONDITION_MODELS.includes(
    modelNumber as (typeof FISCAL_ANY_CONDITION_MODELS)[number],
  )
    ? "ANY"
    : "ALL";
}

export function expectedSubjectForModel(
  modelNumber: TaxModelNumber,
): FiscalPredicateSubject {
  if (
    FISCAL_PERSON_SUBJECT_MODELS.includes(
      modelNumber as (typeof FISCAL_PERSON_SUBJECT_MODELS)[number],
    )
  ) {
    return "PERSON";
  }
  if (
    FISCAL_ENTITY_SUBJECT_MODELS.includes(
      modelNumber as (typeof FISCAL_ENTITY_SUBJECT_MODELS)[number],
    )
  ) {
    return "ENTITY";
  }
  return "ANY";
}

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
  exception: FiscalScenarioTemplate;
  unknown: FiscalScenarioTemplate;
  prohibitedInference: FiscalScenarioTemplate;
  thresholdExceptionAt: number | null;
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
    exception: scenario("BUSINESS", "NOT_APPLICABLE", "No hubo ventas B2C", {
      changesDuringYear: "YES",
    }),
    unknown: scenario("UNKNOWN_FACTS", "NEEDS_INFORMATION", "alta OSS/IOSS"),
    prohibitedInference: scenario("EU_OPERATIONS", "NOT_APPLICABLE", "No hubo ventas B2C"),
    thresholdExceptionAt: null,
  },
  {
    modelNumber: "036",
    positive: scenario("BUSINESS", "DERIVED", "alta, baja o cambio", {
      changesDuringYear: "YES",
    }),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "cambios censales"),
    exception: scenario("EU_OPERATIONS", "NOT_APPLICABLE", "cambios censales", {
      changesDuringYear: "NO",
    }),
    unknown: scenario("UNKNOWN_FACTS", "NEEDS_INFORMATION", "cambios censales"),
    prohibitedInference: scenario("WORKERS", "NOT_APPLICABLE", "cambios censales"),
    thresholdExceptionAt: null,
  },
  {
    modelNumber: "100",
    positive: scenario("PROFESSIONAL", "DERIVED", "alta en RETA"),
    negative: scenario("PROFESSIONAL", "CONDITIONAL", "actividad personal", {
      retaDuringYear: "NO",
    }),
    exception: scenario("COMPANY", "NEEDS_INFORMATION", "actividad personal"),
    unknown: scenario("UNKNOWN_FACTS", "NEEDS_INFORMATION", "alta en RETA"),
    prohibitedInference: scenario("COMPANY", "NEEDS_INFORMATION", "actividad personal", {
      employees: "YES",
    }),
    thresholdExceptionAt: null,
  },
  {
    modelNumber: "111",
    positive: scenario("WORKERS", "DERIVED", "pagos de trabajo o profesionales"),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "No se han declarado rentas"),
    exception: scenario("BUSINESS", "NOT_APPLICABLE", "No se han declarado rentas", {
      employees: "NO",
      paidProfessionalsWithWithholding: "NO",
      otherIrpfWithholdingPayments: "NO",
    }),
    unknown: scenario("UNKNOWN_FACTS", "NEEDS_INFORMATION", "No se sabe si se pagaron"),
    prohibitedInference: scenario("RENT", "NOT_APPLICABLE", "No se han declarado rentas"),
    thresholdExceptionAt: null,
  },
  {
    modelNumber: "115",
    positive: scenario("RENT", "DERIVED", "alquiler urbano sujeto a retención"),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "No se han declarado rentas"),
    exception: scenario("RENT", "NOT_APPLICABLE", "No se han declarado rentas", {
      landlordWithholdingExemption: "YES",
    }),
    unknown: scenario("UNKNOWN_FACTS", "NEEDS_INFORMATION", "No se sabe si se pagaron"),
    prohibitedInference: scenario("WORKERS", "NOT_APPLICABLE", "No se han declarado rentas"),
    thresholdExceptionAt: null,
  },
  {
    modelNumber: "123",
    positive: scenario("BUSINESS", "NEEDS_PROFESSIONAL_REVIEW", "rendimientos de capital", {
      paidCapitalIncome: "YES",
    }),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "No se declararon pagos"),
    exception: scenario("BUSINESS", "NOT_APPLICABLE", "No se declararon pagos", {
      paidCapitalIncome: "NO",
    }),
    unknown: scenario("UNKNOWN_FACTS", "NEEDS_INFORMATION", "No se sabe si se pagaron"),
    prohibitedInference: scenario("WORKERS", "NOT_APPLICABLE", "No se declararon pagos"),
    thresholdExceptionAt: null,
  },
  {
    modelNumber: "130",
    positive: scenario("BUSINESS", "DERIVED", "estimación directa"),
    negative: scenario("COMPANY", "NOT_APPLICABLE", "actividad facturada personalmente"),
    exception: scenario("PROFESSIONAL", "NOT_APPLICABLE", "70%", {
      withheldIncomePercent: 70,
    }),
    unknown: scenario("UNKNOWN_FACTS", "NEEDS_INFORMATION", "método de determinación"),
    prohibitedInference: scenario("COMPANY", "NOT_APPLICABLE", "actividad facturada personalmente", {
      employees: "YES",
    }),
    thresholdExceptionAt: 70,
  },
  {
    modelNumber: "131",
    positive: scenario("MODULES", "DERIVED", "estimación objetiva"),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "estimación objetiva"),
    exception: scenario("MODULES", "NOT_APPLICABLE", "porcentaje de retención", {
      activityKinds: ["AGRICULTURE"],
      withheldIncomePercent: 70,
    }),
    unknown: scenario("ATTRIBUTION_ENTITY", "NEEDS_INFORMATION", "atribución de rentas"),
    prohibitedInference: scenario("WORKERS", "NOT_APPLICABLE", "estimación objetiva"),
    thresholdExceptionAt: 70,
  },
  {
    modelNumber: "180",
    positive: scenario("RENT", "DERIVED", "alquiler urbano sujeto a retención"),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "retenciones periódicas"),
    exception: scenario("RENT", "NOT_APPLICABLE", "retenciones periódicas", {
      landlordWithholdingExemption: "YES",
    }),
    unknown: scenario("UNKNOWN_FACTS", "NEEDS_INFORMATION", "resumen anual depende"),
    prohibitedInference: scenario("WORKERS", "NOT_APPLICABLE", "retenciones periódicas"),
    thresholdExceptionAt: null,
  },
  {
    modelNumber: "184",
    positive: scenario("ATTRIBUTION_ENTITY", "DERIVED", "entidad en atribución", {
      attributionEntityIncomeAboveThreshold: "YES",
    }),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "entidad en régimen de atribución"),
    exception: scenario("ATTRIBUTION_ENTITY", "NOT_APPLICABLE", "no ejerce actividad económica", {
      attributionEntityIncomeAboveThreshold: "NO",
    }),
    unknown: scenario("ATTRIBUTION_ENTITY", "NEEDS_INFORMATION", "Falta confirmar actividad"),
    prohibitedInference: scenario("COMPANY", "NOT_APPLICABLE", "entidad en régimen de atribución"),
    thresholdExceptionAt: null,
  },
  {
    modelNumber: "190",
    positive: scenario("PAID_PROFESSIONALS", "DERIVED", "pagos de trabajo o profesionales"),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "retenciones periódicas"),
    exception: scenario("BUSINESS", "NOT_APPLICABLE", "retenciones periódicas", {
      employees: "NO",
      paidProfessionalsWithWithholding: "NO",
      otherIrpfWithholdingPayments: "NO",
    }),
    unknown: scenario("UNKNOWN_FACTS", "NEEDS_INFORMATION", "resumen anual depende"),
    prohibitedInference: scenario("RENT", "NOT_APPLICABLE", "retenciones periódicas"),
    thresholdExceptionAt: null,
  },
  {
    modelNumber: "193",
    positive: scenario("BUSINESS", "NEEDS_PROFESSIONAL_REVIEW", "resumen anual depende", {
      paidCapitalIncome: "YES",
    }),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "No existen rentas de capital"),
    exception: scenario("BUSINESS", "NOT_APPLICABLE", "No existen rentas de capital", {
      paidCapitalIncome: "NO",
    }),
    unknown: scenario("UNKNOWN_FACTS", "NEEDS_INFORMATION", "Falta confirmar la existencia"),
    prohibitedInference: scenario("WORKERS", "NOT_APPLICABLE", "No existen rentas de capital"),
    thresholdExceptionAt: null,
  },
  {
    modelNumber: "200",
    positive: scenario("COMPANY", "DERIVED", "sociedad"),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "no se ha identificado como sociedad"),
    exception: scenario("ATTRIBUTION_ENTITY", "NOT_APPLICABLE", "no se ha identificado como sociedad"),
    unknown: scenario("UNKNOWN_FACTS", "NOT_APPLICABLE", "no se ha identificado como sociedad"),
    prohibitedInference: scenario("WORKERS", "NOT_APPLICABLE", "no se ha identificado como sociedad"),
    thresholdExceptionAt: null,
  },
  {
    modelNumber: "202",
    positive: scenario("COMPANY", "DERIVED", "pagos fraccionados", {
      companyInstallmentPayments: "YES",
    }),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "No se analiza una sociedad"),
    exception: scenario("COMPANY", "NOT_APPLICABLE", "ausencia de obligación", {
      companyInstallmentPayments: "NO",
    }),
    unknown: scenario("COMPANY", "NEEDS_INFORMATION", "No basta ser sociedad"),
    prohibitedInference: scenario("ATTRIBUTION_ENTITY", "NOT_APPLICABLE", "No se analiza una sociedad"),
    thresholdExceptionAt: null,
  },
  {
    modelNumber: "216",
    positive: scenario("BUSINESS", "NEEDS_PROFESSIONAL_REVIEW", "no residentes", {
      paidNonResidentIncome: "YES",
      nonResidentWithholdingConfirmed: "YES",
    }),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "No se declararon pagos"),
    exception: scenario("BUSINESS", "NEEDS_INFORMATION", "factura extranjera no basta", {
      paidNonResidentIncome: "YES",
      nonResidentWithholdingConfirmed: "NO",
    }),
    unknown: scenario("UNKNOWN_FACTS", "NEEDS_INFORMATION", "No se sabe si hubo pagos"),
    prohibitedInference: scenario("EU_OPERATIONS", "NOT_APPLICABLE", "No se declararon pagos"),
    thresholdExceptionAt: null,
  },
  {
    modelNumber: "296",
    positive: scenario("BUSINESS", "NEEDS_PROFESSIONAL_REVIEW", "resumen anual", {
      paidNonResidentIncome: "YES",
      nonResidentWithholdingConfirmed: "YES",
    }),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "No se declararon pagos"),
    exception: scenario("BUSINESS", "NEEDS_INFORMATION", "No se ha confirmado", {
      paidNonResidentIncome: "YES",
      nonResidentWithholdingConfirmed: "NO",
    }),
    unknown: scenario("UNKNOWN_FACTS", "NEEDS_INFORMATION", "No se sabe si hubo pagos"),
    prohibitedInference: scenario("EU_OPERATIONS", "NOT_APPLICABLE", "No se declararon pagos"),
    thresholdExceptionAt: null,
  },
  {
    modelNumber: "303",
    positive: scenario("BUSINESS", "DERIVED", "autoliquidación periódica"),
    negative: scenario("EXEMPT_ACTIVITY", "NOT_APPLICABLE", "no acreditan autoliquidación"),
    exception: scenario("EQUIVALENCE_SURCHARGE", "NOT_APPLICABLE", "no acreditan autoliquidación"),
    unknown: scenario("UNKNOWN_FACTS", "NEEDS_INFORMATION", "tratamiento de IVA"),
    prohibitedInference: scenario("EXEMPT_ACTIVITY", "NOT_APPLICABLE", "no acreditan autoliquidación", {
      employees: "YES",
    }),
    thresholdExceptionAt: null,
  },
  {
    modelNumber: "308",
    positive: scenario("BUSINESS", "NEEDS_PROFESSIONAL_REVIEW", "devolución o compensación especial", {
      specialVatRefundSituation: "YES",
    }),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "No se declaró ningún supuesto especial"),
    exception: scenario("EQUIVALENCE_SURCHARGE", "NOT_APPLICABLE", "No se declaró ningún supuesto especial"),
    unknown: scenario("UNKNOWN_FACTS", "NEEDS_INFORMATION", "supuesto especial"),
    prohibitedInference: scenario("BUSINESS", "NOT_APPLICABLE", "No se declaró ningún supuesto especial", {
      reverseChargeTransactions: "YES",
    }),
    thresholdExceptionAt: null,
  },
  {
    modelNumber: "309",
    positive: scenario("EXEMPT_ACTIVITY", "DERIVED", "autoliquidación no periódica", {
      euGoodsPurchases: "YES",
      roiRegistered: "YES",
    }),
    negative: scenario("EXEMPT_ACTIVITY", "NOT_APPLICABLE", "No se han identificado operaciones"),
    exception: scenario("BUSINESS", "NOT_APPLICABLE", "autoliquidación periódica 303"),
    unknown: scenario("EXEMPT_ACTIVITY", "NEEDS_INFORMATION", "Falta confirmar", {
      euGoodsPurchases: "UNKNOWN",
      euServicesPurchases: "NO",
      reverseChargeTransactions: "NO",
    }),
    prohibitedInference: scenario("EXEMPT_ACTIVITY", "NOT_APPLICABLE", "No se han identificado operaciones", {
      euGoodsSales: "YES",
      roiRegistered: "YES",
    }),
    thresholdExceptionAt: null,
  },
  {
    modelNumber: "341",
    positive: scenario("BUSINESS", "NEEDS_PROFESSIONAL_REVIEW", "devolución o compensación especial", {
      specialVatRefundSituation: "YES",
    }),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "No se declaró ningún supuesto especial"),
    exception: scenario("EQUIVALENCE_SURCHARGE", "NOT_APPLICABLE", "No se declaró ningún supuesto especial"),
    unknown: scenario("UNKNOWN_FACTS", "NEEDS_INFORMATION", "supuesto especial"),
    prohibitedInference: scenario("EU_OPERATIONS", "NOT_APPLICABLE", "No se declaró ningún supuesto especial"),
    thresholdExceptionAt: null,
  },
  {
    modelNumber: "347",
    positive: scenario("BUSINESS", "DERIVED", "umbral por tercero", {
      thirdPartyThresholdExceeded: "YES",
    }),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "No se alcanzó el umbral"),
    exception: scenario("BUSINESS", "NOT_APPLICABLE", "todas las operaciones", {
      thirdPartyThresholdExceeded: "YES",
      thirdPartyOperationsAllExcluded: "YES",
    }),
    unknown: scenario("UNKNOWN_FACTS", "NEEDS_INFORMATION", "cálculo por tercero"),
    prohibitedInference: scenario("WORKERS", "NOT_APPLICABLE", "No se alcanzó el umbral"),
    thresholdExceptionAt: null,
  },
  {
    modelNumber: "349",
    positive: scenario("EU_OPERATIONS", "DERIVED", "operaciones intracomunitarias"),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "No se declararon operaciones"),
    exception: scenario("BUSINESS", "NOT_APPLICABLE", "alta en ROI", {
      roiRegistered: "YES",
    }),
    unknown: scenario("UNKNOWN_FACTS", "NEEDS_INFORMATION", "operaciones intracomunitarias"),
    prohibitedInference: scenario("OSS_IOSS", "NOT_APPLICABLE", "No se declararon operaciones"),
    thresholdExceptionAt: null,
  },
  {
    modelNumber: "369",
    positive: scenario("OSS_IOSS", "DERIVED", "alta en un régimen OSS/IOSS"),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "No hubo ventas B2C"),
    exception: scenario("BUSINESS", "NOT_APPLICABLE", "No hubo ventas B2C", {
      changesDuringYear: "YES",
    }),
    unknown: scenario("UNKNOWN_FACTS", "NEEDS_INFORMATION", "alta OSS/IOSS"),
    prohibitedInference: scenario("EU_OPERATIONS", "NOT_APPLICABLE", "No hubo ventas B2C"),
    thresholdExceptionAt: null,
  },
  {
    modelNumber: "390",
    positive: scenario("BUSINESS", "DERIVED", "autoliquidación periódica de IVA"),
    negative: scenario("EXEMPT_ACTIVITY", "NOT_APPLICABLE", "obligación periódica de IVA"),
    exception: scenario("BUSINESS", "NOT_APPLICABLE", "exoneración del resumen anual", {
      vatAnnualSummaryExempt: "YES",
    }),
    unknown: scenario("BUSINESS", "NEEDS_INFORMATION", "exoneración del resumen anual", {
      vatAnnualSummaryExempt: "UNKNOWN",
    }),
    prohibitedInference: scenario("EXEMPT_ACTIVITY", "NOT_APPLICABLE", "obligación periódica de IVA", {
      employees: "YES",
    }),
    thresholdExceptionAt: null,
  },
  {
    modelNumber: "714",
    positive: scenario("BUSINESS", "NEEDS_PROFESSIONAL_REVIEW", "posible obligación por patrimonio", {
      wealthTaxPotentiallyApplicable: "YES",
    }),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "No se ha declarado"),
    exception: scenario("BUSINESS", "NOT_APPLICABLE", "No se ha declarado", {
      foreignAssetsPotentiallyReportable: "YES",
    }),
    unknown: scenario("UNKNOWN_FACTS", "NEEDS_INFORMATION", "No está confirmado"),
    prohibitedInference: scenario("BUSINESS", "NOT_APPLICABLE", "No se ha declarado", {
      foreignCryptoPotentiallyReportable: "YES",
    }),
    thresholdExceptionAt: null,
  },
  {
    modelNumber: "720",
    positive: scenario("BUSINESS", "NEEDS_PROFESSIONAL_REVIEW", "bienes o derechos", {
      foreignAssetsPotentiallyReportable: "YES",
    }),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "No se ha declarado"),
    exception: scenario("BUSINESS", "NOT_APPLICABLE", "No se ha declarado", {
      foreignCryptoPotentiallyReportable: "YES",
    }),
    unknown: scenario("UNKNOWN_FACTS", "NEEDS_INFORMATION", "No está confirmado"),
    prohibitedInference: scenario("BUSINESS", "NOT_APPLICABLE", "No se ha declarado", {
      wealthTaxPotentiallyApplicable: "YES",
    }),
    thresholdExceptionAt: null,
  },
  {
    modelNumber: "721",
    positive: scenario("BUSINESS", "NEEDS_PROFESSIONAL_REVIEW", "monedas virtuales", {
      foreignCryptoPotentiallyReportable: "YES",
    }),
    negative: scenario("BUSINESS", "NOT_APPLICABLE", "No se ha declarado"),
    exception: scenario("BUSINESS", "NOT_APPLICABLE", "No se ha declarado", {
      foreignAssetsPotentiallyReportable: "YES",
    }),
    unknown: scenario("UNKNOWN_FACTS", "NEEDS_INFORMATION", "No está confirmado"),
    prohibitedInference: scenario("BUSINESS", "NOT_APPLICABLE", "No se ha declarado", {
      wealthTaxPotentiallyApplicable: "YES",
    }),
    thresholdExceptionAt: null,
  },
] as const satisfies readonly FiscalModelExecutableSpec[];

export function mutationOperatorsForSpec(
  spec: FiscalModelExecutableSpec,
  conditionCount: number,
): readonly FiscalMutationOperator[] {
  const conditionMode = conditionModeForModel(spec.modelNumber);
  const expectedSubject = expectedSubjectForModel(spec.modelNumber);
  return FISCAL_MUTATION_OPERATORS.filter(
    (operator) =>
      (operator !== "THRESHOLD_CHANGED" ||
        spec.thresholdExceptionAt !== null) &&
      (operator !== "AND_TO_OR" ||
        (conditionMode === "ALL" && conditionCount > 1)) &&
      (operator !== "OR_TO_AND" ||
        (conditionMode === "ANY" && conditionCount > 1)) &&
      (operator !== "REQUIRED_CONDITION_REMOVED" ||
        conditionMode === "ALL") &&
      (operator !== "SUBJECT_SWAPPED" || expectedSubject !== "ANY"),
  );
}
