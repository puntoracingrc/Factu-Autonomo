import type { TaxpayerProfile } from "../contracts";
import { createEmptyTaxpayerProfile } from "../profile";

export type FiscalProfileFactoryName =
  | "NATURAL_PERSON"
  | "PROFESSIONAL"
  | "BUSINESS"
  | "MODULES"
  | "CORPORATE_SELF_EMPLOYED"
  | "COLLABORATING_SELF_EMPLOYED"
  | "DIRECT_NORMAL"
  | "DIRECT_SIMPLIFIED"
  | "VAT_GENERAL"
  | "VAT_SIMPLIFIED"
  | "EXEMPT_ACTIVITY"
  | "EQUIVALENCE_SURCHARGE"
  | "AGRICULTURE_LIVESTOCK_FISHING"
  | "WORKERS"
  | "PAID_PROFESSIONALS"
  | "RENT"
  | "RENT_EXEMPT"
  | "EU_OPERATIONS"
  | "ROI"
  | "OSS_IOSS"
  | "NON_RESIDENT_PAYMENTS"
  | "MULTI_ACTIVITY"
  | "COMPANY"
  | "ATTRIBUTION_ENTITY"
  | "UNKNOWN_FACTS"
  | "CONTRADICTORY_FACTS"
  | "MID_YEAR_CHANGE";

export type FiscalProfileOverrides = Partial<TaxpayerProfile>;

function completeBase(fiscalYear: 2025 | 2026): TaxpayerProfile {
  return {
    ...createEmptyTaxpayerProfile(fiscalYear),
    territory: "ES_COMMON",
    invoicingSubject: "NATURAL_PERSON",
    taxpayerRole: "INDIVIDUAL_SELF_EMPLOYED",
    hasPersonalActivity: "YES",
    retaDuringYear: "YES",
    activityStillActive: "YES",
    activityKinds: ["BUSINESS"],
    incomeTaxRegime: "DIRECT_SIMPLIFIED",
    withheldIncomePercent: 0,
    vatRegimes: ["GENERAL"],
    redeme: "NO",
    sii: "NO",
    largeCompany: "NO",
    vatAnnualSummaryExempt: "NO",
    reverseChargeTransactions: "NO",
    specialVatRefundSituation: "NO",
    employees: "NO",
    paidProfessionalsWithWithholding: "NO",
    otherIrpfWithholdingPayments: "NO",
    rentsBusinessPremises: "NO",
    rentSubjectToWithholding: "NOT_APPLICABLE",
    landlordWithholdingExemption: "NOT_APPLICABLE",
    paidCapitalIncome: "NO",
    paidNonResidentIncome: "NO",
    nonResidentWithholdingConfirmed: "NOT_APPLICABLE",
    euGoodsSales: "NO",
    euGoodsPurchases: "NO",
    euServicesSales: "NO",
    euServicesPurchases: "NO",
    roiRegistered: "NO",
    euConsumerSales: "NO",
    ossRegistered: "NO",
    thirdPartyThresholdExceeded: "NO",
    thirdPartyOperationsAllExcluded: "NO",
    companyInstallmentPayments: "NOT_APPLICABLE",
    attributionEntityIncomeAboveThreshold: "NOT_APPLICABLE",
    foreignAssetsPotentiallyReportable: "NO",
    foreignCryptoPotentiallyReportable: "NO",
    wealthTaxPotentiallyApplicable: "NO",
    changesDuringYear: "NO",
    censusReviewed: "NO",
    censusObligations: [],
  };
}

const FACTORIES: Record<
  FiscalProfileFactoryName,
  (fiscalYear: 2025 | 2026) => TaxpayerProfile
> = {
  NATURAL_PERSON: completeBase,
  PROFESSIONAL: (fiscalYear) => ({
    ...completeBase(fiscalYear),
    activityKinds: ["PROFESSIONAL"],
  }),
  BUSINESS: completeBase,
  MODULES: (fiscalYear) => ({
    ...completeBase(fiscalYear),
    incomeTaxRegime: "OBJECTIVE_ESTIMATION",
  }),
  CORPORATE_SELF_EMPLOYED: (fiscalYear) => ({
    ...completeBase(fiscalYear),
    taxpayerRole: "CORPORATE_SELF_EMPLOYED",
  }),
  COLLABORATING_SELF_EMPLOYED: (fiscalYear) => ({
    ...completeBase(fiscalYear),
    taxpayerRole: "COLLABORATING_SELF_EMPLOYED",
  }),
  DIRECT_NORMAL: (fiscalYear) => ({
    ...completeBase(fiscalYear),
    incomeTaxRegime: "DIRECT_NORMAL",
  }),
  DIRECT_SIMPLIFIED: completeBase,
  VAT_GENERAL: completeBase,
  VAT_SIMPLIFIED: (fiscalYear) => ({
    ...completeBase(fiscalYear),
    vatRegimes: ["SIMPLIFIED"],
  }),
  EXEMPT_ACTIVITY: (fiscalYear) => ({
    ...completeBase(fiscalYear),
    vatRegimes: ["EXEMPT"],
  }),
  EQUIVALENCE_SURCHARGE: (fiscalYear) => ({
    ...completeBase(fiscalYear),
    vatRegimes: ["EQUIVALENCE_SURCHARGE"],
  }),
  AGRICULTURE_LIVESTOCK_FISHING: (fiscalYear) => ({
    ...completeBase(fiscalYear),
    activityKinds: ["AGRICULTURE", "LIVESTOCK"],
    vatRegimes: ["AGRICULTURE_LIVESTOCK_FISHING"],
  }),
  WORKERS: (fiscalYear) => ({
    ...completeBase(fiscalYear),
    employees: "YES",
  }),
  PAID_PROFESSIONALS: (fiscalYear) => ({
    ...completeBase(fiscalYear),
    paidProfessionalsWithWithholding: "YES",
  }),
  RENT: (fiscalYear) => ({
    ...completeBase(fiscalYear),
    rentsBusinessPremises: "YES",
    rentSubjectToWithholding: "YES",
    landlordWithholdingExemption: "NO",
  }),
  RENT_EXEMPT: (fiscalYear) => ({
    ...completeBase(fiscalYear),
    rentsBusinessPremises: "YES",
    rentSubjectToWithholding: "YES",
    landlordWithholdingExemption: "YES",
  }),
  EU_OPERATIONS: (fiscalYear) => ({
    ...completeBase(fiscalYear),
    euServicesSales: "YES",
    roiRegistered: "YES",
  }),
  ROI: (fiscalYear) => ({
    ...completeBase(fiscalYear),
    roiRegistered: "YES",
  }),
  OSS_IOSS: (fiscalYear) => ({
    ...completeBase(fiscalYear),
    euConsumerSales: "YES",
    ossRegistered: "YES",
  }),
  NON_RESIDENT_PAYMENTS: (fiscalYear) => ({
    ...completeBase(fiscalYear),
    paidNonResidentIncome: "YES",
    nonResidentWithholdingConfirmed: "YES",
  }),
  MULTI_ACTIVITY: (fiscalYear) => ({
    ...completeBase(fiscalYear),
    activityKinds: ["PROFESSIONAL", "BUSINESS"],
  }),
  COMPANY: (fiscalYear) => ({
    ...completeBase(fiscalYear),
    invoicingSubject: "COMPANY",
    taxpayerRole: "CORPORATE_SELF_EMPLOYED",
    hasPersonalActivity: "NO",
    retaDuringYear: "NO",
    companyInstallmentPayments: "UNKNOWN",
  }),
  ATTRIBUTION_ENTITY: (fiscalYear) => ({
    ...completeBase(fiscalYear),
    invoicingSubject: "COMMUNITY_OF_PROPERTY",
    taxpayerRole: "PARTNER_OR_COMMUNITY_MEMBER",
    hasPersonalActivity: "NO",
    retaDuringYear: "NO",
    incomeTaxRegime: "ENTITY_ATTRIBUTION",
    attributionEntityIncomeAboveThreshold: "UNKNOWN",
  }),
  UNKNOWN_FACTS: (fiscalYear) => ({
    ...createEmptyTaxpayerProfile(fiscalYear),
    territory: "ES_COMMON",
    invoicingSubject: "NATURAL_PERSON",
    taxpayerRole: "INDIVIDUAL_SELF_EMPLOYED",
    hasPersonalActivity: "YES",
    activityStillActive: "YES",
    activityKinds: ["BUSINESS"],
  }),
  CONTRADICTORY_FACTS: (fiscalYear) => ({
    ...completeBase(fiscalYear),
    activityStillActive: "YES",
    activityEndDate: `${fiscalYear}-06-30`,
    censusReviewed: "YES",
    censusObligations: ["303"],
  }),
  MID_YEAR_CHANGE: (fiscalYear) => ({
    ...completeBase(fiscalYear),
    activityStartDate: `${fiscalYear}-04-01`,
    activityStillActive: "NO",
    activityEndDate: `${fiscalYear}-09-30`,
    changesDuringYear: "YES",
  }),
};

export function buildFiscalTestProfile(
  factoryName: FiscalProfileFactoryName,
  fiscalYear: 2025 | 2026,
  overrides: FiscalProfileOverrides = {},
): TaxpayerProfile {
  return {
    ...FACTORIES[factoryName](fiscalYear),
    ...overrides,
  };
}

export const FISCAL_PROFILE_FACTORY_NAMES = Object.freeze(
  Object.keys(FACTORIES) as FiscalProfileFactoryName[],
);
