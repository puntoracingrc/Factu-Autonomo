import type { TaxContext } from "@/lib/tax-engine";
import type { BusinessProfile } from "@/lib/types";
import { normalizeSpanishTaxId } from "./profile";

export interface BusinessTaxContextResult {
  context: TaxContext;
  warnings: string[];
  source: "FISCAL_PROFILE" | "LEGACY_PROFILE" | "UNKNOWN";
  selectedActivityIndex: number | null;
}

export function buildTaxContextFromBusinessProfile(
  profile: BusinessProfile,
  fiscalYear: number,
  requestedActivityIndex?: number,
): BusinessTaxContextResult {
  const fiscalProfile = profile.fiscalProfile;
  const warnings: string[] = [];
  const unknownContext: TaxContext = {
    jurisdiction: "UNKNOWN",
    taxpayerType: "UNKNOWN",
    directTaxRegime: "UNKNOWN",
    vatRegime: profile.vatExempt ? "EXEMPT" : "UNKNOWN",
    hasFullVatDeductionRight: false,
    activityDescription: "",
    fiscalYear,
  };

  if (!fiscalProfile || fiscalProfile.setupStatus === "SKIPPED") {
    return {
      context: unknownContext,
      warnings,
      source: profile.vatExempt ? "LEGACY_PROFILE" : "UNKNOWN",
      selectedActivityIndex: null,
    };
  }

  if (fiscalProfile.source.kind === "AEAT_CENSUS_CERTIFICATE") {
    const currentNif = normalizeSpanishTaxId(profile.nif);
    const matchedNif = normalizeSpanishTaxId(fiscalProfile.source.matchedTaxId);
    if (!currentNif || !matchedNif || currentNif !== matchedNif) {
      warnings.push(
        "El NIF actual no coincide con el documento censal confirmado. Revisa el perfil fiscal antes de usarlo.",
      );
      return {
        context: unknownContext,
        warnings,
        source: "UNKNOWN",
        selectedActivityIndex: null,
      };
    }
  }

  const preferredActivityIndex = fiscalProfile.activities.findIndex(
    (activity) => activity.isPrimary,
  );
  const selectedActivityIndex =
    requestedActivityIndex !== undefined &&
    requestedActivityIndex >= 0 &&
    requestedActivityIndex < fiscalProfile.activities.length
      ? requestedActivityIndex
      : preferredActivityIndex >= 0
        ? preferredActivityIndex
        : fiscalProfile.activities.length > 0
          ? 0
          : null;
  const activity =
    selectedActivityIndex === null
      ? undefined
      : fiscalProfile.activities[selectedActivityIndex];

  let vatRegime = fiscalProfile.vatRegime;
  let hasFullVatDeductionRight = fiscalProfile.vatDeductionRight === "FULL";
  if (profile.vatExempt && fiscalProfile.vatRegime !== "EXEMPT") {
    vatRegime = "UNKNOWN";
    hasFullVatDeductionRight = false;
    warnings.push(
      "La exención de IVA configurada en la empresa contradice el perfil fiscal. Debes confirmar cuál es correcto.",
    );
  } else if (profile.vatExempt) {
    vatRegime = "EXEMPT";
    hasFullVatDeductionRight = false;
  } else if (
    fiscalProfile.vatRegime === "GENERAL" &&
    fiscalProfile.vatDeductionRight === "UNKNOWN"
  ) {
    vatRegime = "UNKNOWN";
    warnings.push(
      "El perfil indica régimen general, pero no confirma el derecho general a deducir IVA.",
    );
  } else if (
    fiscalProfile.vatRegime === "GENERAL" &&
    fiscalProfile.vatDeductionRight !== "FULL"
  ) {
    vatRegime = "PRORATA";
    hasFullVatDeductionRight = false;
  }

  return {
    context: {
      jurisdiction: fiscalProfile.jurisdiction,
      taxpayerType: fiscalProfile.taxpayerType,
      directTaxRegime: fiscalProfile.directTaxRegime,
      vatRegime,
      hasFullVatDeductionRight,
      activityDescription: activity?.description ?? "",
      ...(activity?.code ? { activityCode: activity.code } : {}),
      fiscalYear,
    },
    warnings,
    source: "FISCAL_PROFILE",
    selectedActivityIndex,
  };
}
