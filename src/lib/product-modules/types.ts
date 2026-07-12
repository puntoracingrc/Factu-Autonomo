import type { PlanId } from "@/lib/billing/plans";

export type ProductModuleId = "consultor_fiscal";

export type ProductModuleLifecycleStatus = "beta" | "available" | "retired";

export type ProductModuleCommercialAssignment =
  | "unassigned"
  | "standalone_purchase"
  | "plan_inclusion"
  | "standalone_or_plan";

export type ProductModuleCommercialOption =
  "standalone_purchase" | "plan_inclusion";

export interface ProductModuleDefinition {
  id: ProductModuleId;
  slug: string;
  name: string;
  shortDescription: string;
  route: `/${string}`;
  lifecycleStatus: ProductModuleLifecycleStatus;
  commercialAssignment: ProductModuleCommercialAssignment;
  supportedCommercialOptions: readonly ProductModuleCommercialOption[];
  includedPlanIds: readonly PlanId[];
}

export type ProductModuleEntitlementSource =
  "beta_access" | "standalone_purchase" | "plan_inclusion" | "none";

export type ProductModuleAccessReason =
  "AVAILABLE" | "RELEASE_DISABLED" | "ENTITLEMENT_REQUIRED" | "MODULE_INACTIVE";

export interface ProductModuleAccessInput {
  releaseEnabled: boolean;
  activated: boolean;
  entitlementSource: ProductModuleEntitlementSource;
}

export interface ProductModuleAccessDecision {
  discoverable: boolean;
  usable: boolean;
  reason: ProductModuleAccessReason;
  entitlementSource: ProductModuleEntitlementSource;
}
