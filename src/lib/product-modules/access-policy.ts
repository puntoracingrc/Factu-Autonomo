import type {
  ProductModuleAccessDecision,
  ProductModuleAccessInput,
} from "./types";

export function resolveProductModuleAccess({
  releaseEnabled,
  activated,
  entitlementSource,
}: ProductModuleAccessInput): ProductModuleAccessDecision {
  if (!releaseEnabled) {
    return {
      discoverable: false,
      usable: false,
      reason: "RELEASE_DISABLED",
      entitlementSource,
    };
  }

  if (entitlementSource === "none") {
    return {
      discoverable: true,
      usable: false,
      reason: "ENTITLEMENT_REQUIRED",
      entitlementSource,
    };
  }

  if (!activated) {
    return {
      discoverable: true,
      usable: false,
      reason: "MODULE_INACTIVE",
      entitlementSource,
    };
  }

  return {
    discoverable: true,
    usable: true,
    reason: "AVAILABLE",
    entitlementSource,
  };
}
