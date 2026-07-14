import type { TaxModelNumber, TaxpayerProfile } from "./contracts";
import { createEmptyTaxpayerProfile } from "./profile";

export function completeCommonTerritoryProfile(
  overrides: Partial<TaxpayerProfile> = {},
): TaxpayerProfile {
  return {
    ...createEmptyTaxpayerProfile(2026),
    territory: "ES_COMMON",
    invoicingSubject: "NATURAL_PERSON",
    taxpayerRole: "INDIVIDUAL_SELF_EMPLOYED",
    hasPersonalActivity: "YES",
    retaDuringYear: "YES",
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
    censusObligations: [],
    ...overrides,
  };
}

export interface ReferenceProfile {
  name: string;
  targetModel: TaxModelNumber;
  expectedStatus: string;
  profile: TaxpayerProfile;
}

function reference(
  targetModel: TaxModelNumber,
  expectedStatus: string,
  overrides: Partial<TaxpayerProfile>,
  name = `Perfil de referencia para ${targetModel}`,
): ReferenceProfile {
  return {
    name,
    targetModel,
    expectedStatus,
    profile: completeCommonTerritoryProfile(overrides),
  };
}

export const REFERENCE_PROFILES: readonly ReferenceProfile[] = [
  reference("035", "CONDITIONAL", { euConsumerSales: "YES", ossRegistered: "YES" }),
  reference("036", "DERIVED", { changesDuringYear: "YES" }),
  reference("100", "DERIVED", { retaDuringYear: "YES" }),
  reference("111", "DERIVED", { employees: "YES" }),
  reference("115", "DERIVED", { rentsBusinessPremises: "YES", rentSubjectToWithholding: "YES", landlordWithholdingExemption: "NO" }),
  reference("123", "NEEDS_PROFESSIONAL_REVIEW", { paidCapitalIncome: "YES" }),
  reference("130", "DERIVED", { activityKinds: ["BUSINESS"], incomeTaxRegime: "DIRECT_SIMPLIFIED" }),
  reference("131", "DERIVED", { activityKinds: ["BUSINESS"], incomeTaxRegime: "OBJECTIVE_ESTIMATION" }),
  reference("180", "DERIVED", { rentsBusinessPremises: "YES", rentSubjectToWithholding: "YES", landlordWithholdingExemption: "NO" }),
  reference("184", "DERIVED", { invoicingSubject: "COMMUNITY_OF_PROPERTY", taxpayerRole: "PARTNER_OR_COMMUNITY_MEMBER", incomeTaxRegime: "ENTITY_ATTRIBUTION", attributionEntityIncomeAboveThreshold: "YES" }),
  reference("190", "DERIVED", { paidProfessionalsWithWithholding: "YES" }),
  reference("193", "NEEDS_PROFESSIONAL_REVIEW", { paidCapitalIncome: "YES" }),
  reference("200", "DERIVED", { invoicingSubject: "COMPANY", taxpayerRole: "CORPORATE_SELF_EMPLOYED", hasPersonalActivity: "NO" }),
  reference("202", "DERIVED", { invoicingSubject: "COMPANY", taxpayerRole: "CORPORATE_SELF_EMPLOYED", hasPersonalActivity: "NO", companyInstallmentPayments: "YES" }),
  reference("216", "NEEDS_PROFESSIONAL_REVIEW", { paidNonResidentIncome: "YES", nonResidentWithholdingConfirmed: "YES" }),
  reference("296", "NEEDS_PROFESSIONAL_REVIEW", { paidNonResidentIncome: "YES", nonResidentWithholdingConfirmed: "YES" }),
  reference("303", "DERIVED", { vatRegimes: ["GENERAL"] }),
  reference("308", "NEEDS_PROFESSIONAL_REVIEW", { specialVatRefundSituation: "YES" }),
  reference("309", "DERIVED", { vatRegimes: ["EXEMPT"], euGoodsPurchases: "YES", roiRegistered: "YES" }),
  reference("341", "NEEDS_PROFESSIONAL_REVIEW", { specialVatRefundSituation: "YES" }),
  reference("347", "DERIVED", { thirdPartyThresholdExceeded: "YES", thirdPartyOperationsAllExcluded: "NO" }),
  reference("349", "DERIVED", { euServicesSales: "YES", roiRegistered: "YES" }),
  reference("369", "DERIVED", { euConsumerSales: "YES", ossRegistered: "YES" }),
  reference("390", "DERIVED", { vatRegimes: ["GENERAL"], vatAnnualSummaryExempt: "NO", sii: "NO" }),
  reference("714", "NEEDS_PROFESSIONAL_REVIEW", { wealthTaxPotentiallyApplicable: "YES" }),
  reference("720", "NEEDS_PROFESSIONAL_REVIEW", { foreignAssetsPotentiallyReportable: "YES" }),
  reference("721", "NEEDS_PROFESSIONAL_REVIEW", { foreignCryptoPotentiallyReportable: "YES" }),
] as const;

