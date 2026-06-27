// PHASE2C59_PRIVATE_STAGING_SECRET_BOUNDARY_CONTRACT_V1
assertServerOnlyModule();

export type PrivateStagingCredentialValueKind =
  | "absent"
  | "placeholder_only"
  | "runtime_reference_only"
  | "material_value";

export type PrivateStagingSecretBoundaryStatus =
  | "empty"
  | "ready_for_review"
  | "rejected";

export type PrivateStagingSecretBoundaryReason =
  | "no_variables_declared"
  | "placeholder_contract_only"
  | "material_value_rejected"
  | "public_variable_rejected"
  | "privileged_role_rejected"
  | "unsafe_name_rejected";

export interface PrivateStagingSecretBoundaryVariable {
  name: string;
  valueKind: PrivateStagingCredentialValueKind;
  required?: boolean;
  valuePreview?: string;
}

export interface PrivateStagingSecretBoundaryEvaluation {
  status: PrivateStagingSecretBoundaryStatus;
  reason: PrivateStagingSecretBoundaryReason;
  variableCount: number;
  acceptedNames: string[];
  rejectedNames: string[];
  valueMaterialPresent: boolean;
}

export interface PrivateStagingSecretBoundarySafeSummary {
  status: PrivateStagingSecretBoundaryStatus;
  reason: PrivateStagingSecretBoundaryReason;
  variableCount: number;
  acceptedNames: string[];
  rejectedNames: string[];
  valueMaterialPresent: boolean;
}

const privilegedRoleName = ["service", "role"].join("_");

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error("Document sync private staging credential boundary is server-only.");
  }
}

function isPublicName(name: string): boolean {
  return name.startsWith("NEXT_PUBLIC_");
}

function isPrivilegedName(name: string): boolean {
  return name.toLowerCase().includes(privilegedRoleName);
}

function unsafeName(name: string): boolean {
  return /authorization|cookie|session|refresh|jwt/i.test(name);
}

function hasMaterialValue(variable: PrivateStagingSecretBoundaryVariable): boolean {
  if (variable.valueKind === "material_value") return true;
  if (!variable.valuePreview) return false;
  return !/^(?:PLACEHOLDER_ONLY|RUNTIME_REFERENCE_ONLY|ABSENT)$/i.test(
    variable.valuePreview,
  );
}

function buildEvaluation(
  variables: PrivateStagingSecretBoundaryVariable[],
  reason: PrivateStagingSecretBoundaryReason,
  rejectedNames: string[] = [],
): PrivateStagingSecretBoundaryEvaluation {
  const rejected = new Set(rejectedNames);
  return {
    status: rejected.size > 0 ? "rejected" :
      variables.length === 0 ? "empty" : "ready_for_review",
    reason,
    variableCount: variables.length,
    acceptedNames: variables
      .map((variable) => variable.name)
      .filter((name) => !rejected.has(name))
      .sort(),
    rejectedNames: [...rejected].sort(),
    valueMaterialPresent: variables.some(hasMaterialValue),
  };
}

export function evaluatePrivateStagingSecretBoundary(
  variables: PrivateStagingSecretBoundaryVariable[] = [],
): PrivateStagingSecretBoundaryEvaluation {
  if (variables.length === 0) {
    return buildEvaluation(variables, "no_variables_declared");
  }

  const publicRejected = variables
    .filter((variable) => isPublicName(variable.name))
    .map((variable) => variable.name);
  if (publicRejected.length > 0) {
    return buildEvaluation(variables, "public_variable_rejected", publicRejected);
  }

  const privilegedRejected = variables
    .filter((variable) => isPrivilegedName(variable.name))
    .map((variable) => variable.name);
  if (privilegedRejected.length > 0) {
    return buildEvaluation(
      variables,
      "privileged_role_rejected",
      privilegedRejected,
    );
  }

  const unsafeRejected = variables
    .filter((variable) => unsafeName(variable.name))
    .map((variable) => variable.name);
  if (unsafeRejected.length > 0) {
    return buildEvaluation(variables, "unsafe_name_rejected", unsafeRejected);
  }

  const materialRejected = variables
    .filter(hasMaterialValue)
    .map((variable) => variable.name);
  if (materialRejected.length > 0) {
    return buildEvaluation(variables, "material_value_rejected", materialRejected);
  }

  return buildEvaluation(variables, "placeholder_contract_only");
}

export function redactPrivateStagingSecretSummary(
  evaluation: PrivateStagingSecretBoundaryEvaluation,
): PrivateStagingSecretBoundarySafeSummary {
  return {
    status: evaluation.status,
    reason: evaluation.reason,
    variableCount: evaluation.variableCount,
    acceptedNames: [...evaluation.acceptedNames],
    rejectedNames: [...evaluation.rejectedNames],
    valueMaterialPresent: evaluation.valueMaterialPresent,
  };
}
