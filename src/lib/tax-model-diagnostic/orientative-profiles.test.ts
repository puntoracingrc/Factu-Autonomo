import { describe, expect, it } from "vitest";

import { buildFiscalModelPersonalizationV1 } from "@/lib/fiscal-advisory-models";
import {
  buildTaxModelRecommendationsV1,
  buildTaxObligationsAssessment,
  TAX_OBLIGATION_MODEL_CODES,
  type TaxModelRecommendationStatus,
} from "@/lib/tax-obligations";

import type {
  TaxModelDiagnosticSession,
  TaxModelNumber,
  TaxpayerProfile,
} from "./contracts";
import { evaluateTaxModelDiagnostic } from "./engine";
import { completeCommonTerritoryProfile } from "./test-fixtures";

const GENERATED_AT = "2026-07-15T22:30:00.000Z";
const CATALOG_WITH_MANUAL = [...TAX_OBLIGATION_MODEL_CODES, "A22"];

type ExpectedRecommendation = readonly [
  TaxModelNumber,
  Exclude<TaxModelRecommendationStatus, "MANUALLY_SELECTED">,
];

interface OrientativeProfileCase {
  name: string;
  profile: TaxpayerProfile;
  expected: readonly ExpectedRecommendation[];
}

function profile(
  name: string,
  overrides: Partial<TaxpayerProfile>,
  expected: readonly ExpectedRecommendation[],
): OrientativeProfileCase {
  return {
    name,
    profile: completeCommonTerritoryProfile(overrides),
    expected,
  };
}

const ORIENTATIVE_PROFILES: readonly OrientativeProfileCase[] = [
  profile(
    "1. Profesional con IVA y retención suficiente",
    { activityKinds: ["PROFESSIONAL"], withheldIncomePercent: 80 },
    [
      ["303", "LIKELY_REQUIRED"],
      ["130", "UNLIKELY_REQUIRED"],
    ],
  ),
  profile(
    "2. Profesional sin suficiente retención",
    { activityKinds: ["PROFESSIONAL"], withheldIncomePercent: 30 },
    [
      ["303", "LIKELY_REQUIRED"],
      ["130", "LIKELY_REQUIRED"],
    ],
  ),
  profile("3. Empresario que factura a particulares", {}, [
    ["130", "LIKELY_REQUIRED"],
    ["303", "LIKELY_REQUIRED"],
  ]),
  profile(
    "4. Autónomo en módulos",
    { incomeTaxRegime: "OBJECTIVE_ESTIMATION" },
    [
      ["131", "LIKELY_REQUIRED"],
      ["130", "UNLIKELY_REQUIRED"],
    ],
  ),
  profile(
    "5. Comercio en recargo de equivalencia",
    { vatRegimes: ["EQUIVALENCE_SURCHARGE"] },
    [
      ["303", "UNLIKELY_REQUIRED"],
      ["390", "UNLIKELY_REQUIRED"],
    ],
  ),
  profile("6. Actividad exenta de IVA", { vatRegimes: ["EXEMPT"] }, [
    ["303", "UNLIKELY_REQUIRED"],
    ["390", "UNLIKELY_REQUIRED"],
  ]),
  profile("7. Autónomo con empleados", { employees: "YES" }, [
    ["111", "LIKELY_REQUIRED"],
    ["190", "LIKELY_REQUIRED"],
  ]),
  profile(
    "8. Autónomo que paga profesionales",
    { paidProfessionalsWithWithholding: "YES" },
    [
      ["111", "LIKELY_REQUIRED"],
      ["190", "LIKELY_REQUIRED"],
    ],
  ),
  profile(
    "9. Autónomo con local alquilado",
    {
      rentsBusinessPremises: "YES",
      rentSubjectToWithholding: "YES",
      landlordWithholdingExemption: "NO",
    },
    [
      ["115", "LIKELY_REQUIRED"],
      ["180", "LIKELY_REQUIRED"],
    ],
  ),
  profile(
    "10. Autónomo con operaciones UE",
    { euServicesSales: "YES", roiRegistered: "YES" },
    [["349", "LIKELY_REQUIRED"]],
  ),
  profile(
    "11. Comercio electrónico OSS",
    { euConsumerSales: "YES", ossRegistered: "YES" },
    [
      ["369", "LIKELY_REQUIRED"],
      ["035", "NEEDS_INFORMATION"],
    ],
  ),
  profile(
    "12. Autónomo societario",
    {
      invoicingSubject: "COMPANY",
      taxpayerRole: "CORPORATE_SELF_EMPLOYED",
      hasPersonalActivity: "NO",
      companyInstallmentPayments: "UNKNOWN",
    },
    [
      ["200", "LIKELY_REQUIRED"],
      ["202", "NEEDS_INFORMATION"],
      ["130", "UNLIKELY_REQUIRED"],
    ],
  ),
  profile(
    "13. Comunidad de bienes",
    {
      invoicingSubject: "COMMUNITY_OF_PROPERTY",
      taxpayerRole: "PARTNER_OR_COMMUNITY_MEMBER",
      incomeTaxRegime: "ENTITY_ATTRIBUTION",
      attributionEntityIncomeAboveThreshold: "YES",
    },
    [
      ["184", "LIKELY_REQUIRED"],
      ["130", "NEEDS_INFORMATION"],
    ],
  ),
  profile(
    "14. Varias actividades",
    { activityKinds: ["PROFESSIONAL", "BUSINESS"], withheldIncomePercent: 90 },
    [["130", "LIKELY_REQUIRED"]],
  ),
  profile("15. Datos incompletos", { employees: "UNKNOWN" }, [
    ["111", "NEEDS_INFORMATION"],
    ["190", "NEEDS_INFORMATION"],
  ]),
  profile(
    "16. Datos contradictorios",
    { censusReviewed: "YES", censusObligations: ["303"] },
    [["130", "POSSIBLY_REQUIRED"]],
  ),
  profile(
    "17. Cambio a mitad del ejercicio",
    { changesDuringYear: "YES", activityStartDate: "2026-07-01" },
    [["036", "LIKELY_REQUIRED"]],
  ),
  profile(
    "18. Documento histórico que no confirma la situación actual",
    { changesDuringYear: "UNKNOWN", censusReviewed: "NO" },
    [["036", "NEEDS_INFORMATION"]],
  ),
  profile(
    "19. Documento censal actual confirmado",
    { censusReviewed: "YES", censusObligations: ["130", "303"] },
    [
      ["130", "LIKELY_REQUIRED"],
      ["303", "LIKELY_REQUIRED"],
    ],
  ),
  profile("20. Usuario que no sube documentos", { censusReviewed: "NO" }, [
    ["130", "LIKELY_REQUIRED"],
    ["303", "LIKELY_REQUIRED"],
  ]),
] as const;

describe("20 practical orientative profiles", () => {
  it.each(ORIENTATIVE_PROFILES)("$name", ({ profile: input, expected }) => {
    const diagnostic = evaluateTaxModelDiagnostic(input, GENERATED_AT);
    const assessment = buildTaxObligationsAssessment(diagnostic);
    const snapshot = buildTaxModelRecommendationsV1({ assessment });
    const byCode = new Map(
      snapshot.recommendations.map((recommendation) => [
        recommendation.modelCode,
        recommendation,
      ]),
    );

    expect(snapshot.ruleReviewState).toBe("PENDING_FISCAL_REVIEW");
    expect(snapshot.authorizedFiscalExclusion).toBe(false);
    expect(snapshot.recommendations).toHaveLength(27);
    expect(
      snapshot.recommendations.every(
        (recommendation) =>
          recommendation.reason.trim().length > 0 &&
          recommendation.engineRecommendationStatus !== undefined,
      ),
    ).toBe(true);
    for (const [modelCode, status] of expected) {
      expect(byCode.get(modelCode)?.engineRecommendationStatus).toBe(status);
    }

    const session = {
      schemaVersion: 1,
      profile: input,
      evidence: [],
      completedQuestionIds: [],
      currentSection: "A",
      updatedAt: GENERATED_AT,
      lastResult: diagnostic,
      publishedAssessment: assessment,
    } satisfies TaxModelDiagnosticSession;
    const personalization = buildFiscalModelPersonalizationV1({
      session,
      preferences: { schemaVersion: 1, manualModelCodes: ["A22"] },
      availableModelCodes: CATALOG_WITH_MANUAL,
    });

    expect(personalization.status).toBe("ORIENTATIVE");
    expect(personalization.allModelCodes).toEqual(CATALOG_WITH_MANUAL);
    expect(personalization.manualModelCodes).toContain("A22");
    expect(personalization.visibleModelCodes).toContain("A22");
  });

  it("covers the critical mistakes without turning uncertainty into No", () => {
    const recommendations = (overrides: Partial<TaxpayerProfile>) => {
      const result = evaluateTaxModelDiagnostic(
        completeCommonTerritoryProfile(overrides),
        GENERATED_AT,
      );
      return new Map(
        buildTaxModelRecommendationsV1({
          assessment: buildTaxObligationsAssessment(result),
        }).recommendations.map((item) => [
          item.modelCode,
          item.engineRecommendationStatus,
        ]),
      );
    };

    const individual = recommendations({});
    const company = recommendations({
      invoicingSubject: "COMPANY",
      hasPersonalActivity: "NO",
      taxpayerRole: "CORPORATE_SELF_EMPLOYED",
    });
    expect(individual.get("130")).toBe("LIKELY_REQUIRED");
    expect(individual.get("200")).toBe("UNLIKELY_REQUIRED");
    expect(company.get("130")).toBe("UNLIKELY_REQUIRED");
    expect(company.get("200")).toBe("LIKELY_REQUIRED");

    expect(recommendations({ employees: "UNKNOWN" }).get("111")).toBe(
      "NEEDS_INFORMATION",
    );
    expect(recommendations({}).get("111")).toBe("UNLIKELY_REQUIRED");
    expect(recommendations({ roiRegistered: "YES" }).get("349")).toBe(
      "UNLIKELY_REQUIRED",
    );
    expect(
      recommendations({ sii: "YES", vatAnnualSummaryExempt: "YES" }).get(
        "390",
      ),
    ).toBe("UNLIKELY_REQUIRED");
    expect(
      recommendations({
        rentsBusinessPremises: "YES",
        rentSubjectToWithholding: "NO",
        landlordWithholdingExemption: "YES",
      }).get("115"),
    ).toBe("UNLIKELY_REQUIRED");
  });
});
